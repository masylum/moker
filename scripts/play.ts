import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { coloredTile as tile } from "../src/cli/tiles"
import { stepHeuristic } from "../src/game/automation"
import { cardLabel } from "../src/game/cards"
import { GameEngine, type PlayerSetup } from "../src/game/engine"
import { analyzePokerMath } from "../src/game/heuristic"
import { CHIP_UNIT } from "../src/game/rules"
import type {
  BettingAction,
  CardSource,
  DiscardPile,
  HandResult,
  LegalAction,
} from "../src/game/types"

const terminal = createInterface({ input: stdin, output: stdout })
const seed = argument("--seed") ?? "terminal-table"
const playerCount = boundedInteger(argument("--players") ?? "4", 2, 6)
const samples = boundedInteger(argument("--samples") ?? "48", 1, 256)
const autoPlay = process.argv.includes("--auto")
const debug = process.argv.includes("--debug")
let lastResultRendered = 0
const players: PlayerSetup[] = [
  { id: "p1", name: autoPlay ? "Bot 1" : "You", controller: autoPlay ? "heuristic" : "human" },
  ...Array.from({ length: playerCount - 1 }, (_, index) => ({
    id: `p${index + 2}`,
    name: `Bot ${index + 2}`,
    controller: "heuristic" as const,
  })),
]
const engine = GameEngine.create(players, { seed, heuristicSamples: samples })

try {
  stdout.write(`\nMahjong Poker · seed ${seed}\n`)

  while (engine.state.phase !== "finished") {
    renderTable(engine)

    if (isHumanDecision(engine)) {
      await playHumanTurn(engine)
    } else if (engine.state.phase === "between-hands") {
      if (!autoPlay) {
        await terminal.question("Press Enter for the next hand… ")
      }

      stepHeuristic(engine)
    } else {
      const actor = currentPlayerName(engine)
      const step = stepHeuristic(engine)
      stdout.write(`\n${actor}: ${step.rationale}\n`)
    }
  }

  renderTable(engine)
  stdout.write("\nFinal scores\n")

  for (const [playerId, score] of Object.entries(engine.state.finalScores ?? {}).sort(
    (left, right) => right[1] - left[1],
  )) {
    const player = engine.state.players.find((candidate) => candidate.id === playerId)!
    stdout.write(`  ${player.name}: ${score}\n`)
  }
} finally {
  terminal.close()
}

async function playHumanTurn(game: GameEngine): Promise<void> {
  if (game.state.phase === "betting") {
    await playBettingTurn(game)

    return
  }

  if (game.state.phase === "discarding") {
    const player = game.state.players.find((candidate) => candidate.id === "p1")!
    const cardIndex = await choose(
      "Discard which tile?",
      player.privateCards.map((card) => `${tile(card)} ${cardLabel(card)}`),
    )
    const pile = await chooseDiscardPile(game)
    game.discard("p1", { discardCardId: player.privateCards[cardIndex]!.id, discardPile: pile })

    return
  }

  if (game.state.phase === "blank-window") {
    const claim = await choose("Exchange your Blank for the fresh discard?", ["Yes", "No"])

    if (claim === 0) {
      game.claimBlank("p1")
    } else {
      game.passBlank("p1")
    }
  }
}

async function playBettingTurn(game: GameEngine): Promise<void> {
  const legal = game.legalActions("p1")
  const player = game.state.players.find((candidate) => candidate.id === "p1")!
  const labels = legal.map(actionLabel)

  if (player.loans < 2) {
    labels.push("Take a 200-chip Loan")
  }

  if (
    player.loans > 0 &&
    player.chips >= 200 &&
    player.loansCharged.some((charges) => charges > 0)
  ) {
    labels.push("Repay a Loan")
  }

  const selected = await choose("Your action", labels)

  if (selected >= legal.length) {
    if (labels[selected]!.startsWith("Take")) {
      game.takeLoan("p1")
    } else {
      game.repayLoan("p1")
    }

    return
  }

  const action = legal[selected]!

  if (action.type === "check" || action.type === "call") {
    const drawSource = await chooseDrawSource(game)
    game.act("p1", { type: action.type, drawSource })

    return
  }

  if (action.type === "bet" || action.type === "raise") {
    const amount = await askInteger(
      `${action.type === "bet" ? "Bet" : "Raise"} target (${action.minimum}-${action.maximum})`,
      action.minimum!,
      action.maximum!,
      CHIP_UNIT,
    )
    const riichi = action.canRiichi ? (await choose("Declare Riichi?", ["No", "Yes"])) === 1 : false
    const wager: BettingAction = { type: action.type, amount, ...(riichi ? { riichi } : {}) }
    game.act("p1", wager)

    return
  }

  game.act("p1", { type: "fold" })
}

async function chooseDrawSource(game: GameEngine): Promise<CardSource> {
  const sources: CardSource[] = ["deck"]

  if (game.state.discardA.length > 0) {
    sources.push("discard-a")
  }

  if (game.state.discardB.length > 0) {
    sources.push("discard-b")
  }

  const index = await choose(
    "Draw from",
    sources.map((source) => {
      if (source === "deck") {
        return "Deck (hidden)"
      }

      const pile = source === "discard-a" ? game.state.discardA : game.state.discardB
      const card = pile.at(-1)!

      return `${source === "discard-a" ? "Pile A" : "Pile B"}: ${tile(card)} ${cardLabel(card)}`
    }),
  )

  return sources[index]!
}

async function chooseDiscardPile(game: GameEngine): Promise<DiscardPile> {
  if (game.state.discardA.length === 0) {
    return "a"
  }

  if (game.state.discardB.length === 0) {
    return "b"
  }

  return (await choose("Cover which discard pile?", ["Pile A", "Pile B"])) === 0 ? "a" : "b"
}

function renderTable(game: GameEngine): void {
  const state = game.state
  const human = state.players.find((player) => player.id === "p1")!
  const discardA = state.discardA.at(-1)
  const discardB = state.discardB.at(-1)
  stdout.write("\n────────────────────────────────────────────────────────\n")
  stdout.write(
    `Hand ${state.handNumber}/${state.maxHands} · orbit ${state.orbit} (${state.orbitValue}) · street ${state.street} · ${state.phase} · pot ${state.pot} · wager ${state.currentWager} · min raise ${state.minimumRaise}\n`,
  )
  stdout.write(`Community  ${state.community.map(tile).join(" ") || "—"}\n`)
  stdout.write(
    `Discards   A ${discardA ? tile(discardA) : "—"}    B ${discardB ? tile(discardB) : "—"}\n`,
  )
  stdout.write(`Your hand  ${human.privateCards.map(tile).join(" ")}\n`)
  stdout.write(
    `You        ${human.chips} chips · street ${human.roundCommitted} (total ${human.handCommitted}) · ${human.blueSticks} blue · ${human.loans} loans${human.riichi ? " · RIICHI" : ""}\n`,
  )

  for (const player of state.players.slice(1)) {
    stdout.write(
      `${player.name.padEnd(10)} ${player.chips} chips · street ${player.roundCommitted} (total ${player.handCommitted}) · ${player.blueSticks} blue · ${player.loans} loans${player.folded ? " · folded" : ""}${player.riichi ? " · RIICHI" : ""}\n`,
    )
  }

  const result = state.handResults.at(-1)

  if (result && result.handNumber > lastResultRendered) {
    renderHandResult(result)
    lastResultRendered = result.handNumber
  }

  if (debug && state.phase !== "between-hands" && state.phase !== "finished") {
    renderDebug(game)
  }
}

function renderHandResult(result: HandResult): void {
  const winners = result.players
    .filter((player) => result.winnerIds.includes(player.playerId))
    .map((player) => `${player.name} (+${player.payout})`)
    .join(", ")
  stdout.write(
    `\nResult     ${winners} won ${result.pot} by ${result.reason === "showdown" ? "showdown" : "folds"}\n`,
  )
  stdout.write(`Board      ${result.community.map(tile).join(" ")}\n`)

  for (const player of result.players) {
    const combinations =
      player.score.combinations.map((combination) => combination.label).join(" + ") || "no hand"
    stdout.write(
      `${player.name.padEnd(10)} ${player.cards.map(tile).join(" ")} · ${player.score.total} points (${combinations}) · committed ${player.committed} · payout ${player.payout}${player.folded ? " · folded" : ""}\n`,
    )
  }
}

function renderDebug(game: GameEngine): void {
  stdout.write("\nDebug · all private hands\n")

  for (const player of game.state.players) {
    stdout.write(`${player.name.padEnd(10)} ${player.privateCards.map(tile).join(" ")}\n`)
  }

  stdout.write("Player     Equity  Call  Pot odds  Edge    Call EV  Avg score  Improves  Closest\n")

  for (const player of game.state.players) {
    const math = analyzePokerMath(game.state, player.id, Math.min(32, samples))
    const closest = math.closestSpecial
      ? `${math.closestSpecial.label} (${math.closestSpecial.missing} away)`
      : "—"
    stdout.write(
      `${player.name.padEnd(10)} ${percent(math.showdownEquity).padStart(6)}  ${String(math.toCall).padStart(4)}  ${percent(math.potOdds).padStart(8)}  ${signedPercent(math.equityEdge).padStart(6)}  ${signed(math.callExpectedValue).padStart(7)}  ${math.expectedScore.toFixed(1).padStart(9)}  ${(math.improveRate.toFixed(0) + "%").padStart(8)}  ${closest}\n`,
    )
  }
}

function isHumanDecision(game: GameEngine): boolean {
  const state = game.state

  return (
    !autoPlay &&
    ((state.phase === "betting" && state.actingPlayerId === "p1") ||
      (state.phase === "discarding" && state.pendingDiscard?.playerId === "p1") ||
      (state.phase === "blank-window" && state.blankWindow?.eligiblePlayerIds[0] === "p1"))
  )
}

function currentPlayerName(game: GameEngine): string {
  const state = game.state
  const playerId =
    state.phase === "discarding"
      ? state.pendingDiscard?.playerId
      : state.phase === "blank-window"
        ? state.blankWindow?.eligiblePlayerIds[0]
        : state.actingPlayerId

  return state.players.find((player) => player.id === playerId)?.name ?? "Table"
}

function actionLabel(action: LegalAction): string {
  if (action.type === "call") {
    return `Call ${action.callAmount} + draw`
  }

  if (action.type === "check") {
    return "Check + draw"
  }

  if (action.type === "bet" || action.type === "raise") {
    return `${action.type === "bet" ? "Bet" : "Raise"} (${action.minimum}-${action.maximum})${action.canRiichi ? " · Riichi available" : ""}`
  }

  return "Fold + take a blue stick"
}

async function choose(prompt: string, choices: readonly string[]): Promise<number> {
  while (true) {
    stdout.write(`\n${prompt}\n`)
    choices.forEach((choice, index) => stdout.write(`  ${index + 1}. ${choice}\n`))
    const answer = Number.parseInt(await terminal.question("> "), 10) - 1

    if (Number.isInteger(answer) && answer >= 0 && answer < choices.length) {
      return answer
    }

    stdout.write("Choose one of the listed numbers.\n")
  }
}

async function askInteger(
  prompt: string,
  minimum: number,
  maximum: number,
  step = 1,
): Promise<number> {
  while (true) {
    const answer = Number.parseInt(await terminal.question(`${prompt}: `), 10)

    if (Number.isInteger(answer) && answer >= minimum && answer <= maximum && answer % step === 0) {
      return answer
    }

    stdout.write(`Enter a multiple of ${step} from ${minimum} to ${maximum}.\n`)
  }
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function signedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)

  return index < 0 ? undefined : process.argv[index + 1]
}

function boundedInteger(value: string, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RangeError(`Expected an integer from ${minimum} to ${maximum}, received ${value}`)
  }

  return parsed
}
