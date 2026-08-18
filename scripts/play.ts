import { createInterface } from "node:readline/promises"
import { stdin, stdout } from "node:process"
import { coloredTile as tile } from "../src/cli/tiles"
import { stepHeuristic, type AutomatedStep } from "../src/game/automation"
import { cardLabel, compareCards } from "../src/game/cards"
import { GameEngine, type PlayerSetup } from "../src/game/engine"
import { analyzePokerMath } from "../src/game/heuristic"
import { publicKnownPrivateCards } from "../src/game/information"
import { CHIP_UNIT } from "../src/game/rules"
import type {
  BettingAction,
  BlankExchange,
  CardSource,
  DiscardPile,
  HandResult,
  LegalAction,
} from "../src/game/types"

interface DrawChoice {
  drawSource: CardSource
  blankExchange?: BlankExchange
}

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
      stdout.write(`\n${actor}: ${formatAutomatedStep(step)}\n`)
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
  if (game.state.phase === "seeding") {
    const player = game.state.players.find((candidate) => candidate.id === "p1")!
    const cardIndex = await choose(
      "Seed the discard lanes with which tile?",
      player.privateCards.map((card) => `${tile(card)} ${cardLabel(card)}`),
    )
    const pile = await chooseDiscardPile(game)
    game.seedDiscard("p1", {
      discardCardId: player.privateCards[cardIndex]!.id,
      discardPile: pile,
    })

    return
  }

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
    const draw = player.riichi ? { drawSource: "deck" as const } : await chooseDraw(game)
    game.act("p1", { type: action.type, ...draw })

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

async function chooseDraw(game: GameEngine): Promise<DrawChoice> {
  const choices: Array<{ label: string; draw: DrawChoice }> = [
    { label: "Deck (hidden)", draw: { drawSource: "deck" } },
  ]

  if (game.state.discardA.length > 0) {
    const card = game.state.discardA.at(-1)!
    choices.push({
      label: `Fish A: ${tile(card)} ${cardLabel(card)}`,
      draw: { drawSource: "discard-a" },
    })
  }

  if (game.state.discardB.length > 0) {
    const card = game.state.discardB.at(-1)!
    choices.push({
      label: `Fish B: ${tile(card)} ${cardLabel(card)}`,
      draw: { drawSource: "discard-b" },
    })
  }

  const player = game.state.players.find((candidate) => candidate.id === "p1")!
  const blank = player.privateCards.find((card) => card.kind === "blank")

  if (blank) {
    for (const [pile, cards] of [
      ["a", game.state.discardA],
      ["b", game.state.discardB],
    ] as const) {
      cards.forEach((card, cardIndex) => {
        choices.push({
          label: `Blank swap ${pile.toUpperCase()}${cardIndex + 1}: ${tile(card)} ${cardLabel(card)}`,
          draw: {
            drawSource: "deck",
            blankExchange: { blankCardId: blank.id, pile, cardIndex },
          },
        })
      })
    }
  }

  const index = await choose(
    "Draw & Discard",
    choices.map((choice) => choice.label),
  )

  return choices[index]!.draw
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
  const knownPrivateCards = publicKnownPrivateCards(state)
  stdout.write("\n────────────────────────────────────────────────────────\n")
  stdout.write(
    `Hand ${state.handNumber}/${state.maxHands} · orbit ${state.orbit} (${state.orbitValue}) · street ${state.street} · ${state.phase} · pot ${state.pot} · wager ${state.currentWager} · min raise ${state.minimumRaise}\n`,
  )
  stdout.write(`Community  ${[...state.community].sort(compareCards).map(tile).join(" ") || "—"}\n`)
  stdout.write(`Discard A  ${state.discardA.map(tile).join(" ") || "—"}\n`)
  stdout.write(`Discard B  ${state.discardB.map(tile).join(" ") || "—"}\n`)

  const headers = ["Player", "Chips", "Bet", "Total", "Blue", "Loans", "Hand"]

  if (debug) {
    headers.push("Equity", "Odds", "EV", "Best", "Next", "Draw")
  }

  headers.push("Status")
  const rows = state.players.map((player) => {
    const visible = player.id === human.id || debug
    const row = [
      player.name,
      String(player.chips),
      String(player.roundCommitted),
      String(player.handCommitted),
      String(player.blueSticks),
      String(player.loans),
      visible
        ? player.privateCards.map(tile).join(" ")
        : [
            ...(knownPrivateCards[player.id] ?? []).map(tile),
            ...Array.from(
              { length: player.privateCards.length - (knownPrivateCards[player.id]?.length ?? 0) },
              () => "🀫",
            ),
          ].join(" "),
    ]

    if (debug) {
      const math = analyzePokerMath(state, player.id, Math.min(32, samples))
      const draw = state.drawDiscardHistory.filter((record) => record.playerId === player.id).at(-1)
      row.push(
        percent(math.showdownEquity),
        percent(math.potOdds),
        signed(math.callExpectedValue),
        `${math.currentBest.label} (${math.currentBest.rank})`,
        math.nextClosest ? `${math.nextClosest.label} ${math.nextClosest.missing} away` : "top",
        draw
          ? `${tile(draw.drawnCard)} → ${tile(draw.discardedCard)} ${draw.discardPile.toUpperCase()}`
          : "—",
      )
    }

    row.push(
      [
        player.id === state.actingPlayerId ? "acting" : "",
        player.folded ? "folded" : "",
        player.riichi ? "RIICHI" : "",
      ]
        .filter(Boolean)
        .join(", ") || "—",
    )

    return row
  })
  renderTextTable(headers, rows)

  const result = state.handResults.at(-1)

  if (result && result.handNumber > lastResultRendered) {
    renderHandResult(result)
    lastResultRendered = result.handNumber
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
  stdout.write(`Board      ${[...result.community].sort(compareCards).map(tile).join(" ")}\n`)

  if (result.flowerBonus) {
    stdout.write(
      `Flower     ${result.flowerBonus.total} bonus (${result.flowerBonus.perOpponent} from each opponent)\n`,
    )
  }

  if (result.boardResets > 0) {
    stdout.write(`Resets     ${result.boardResets} Flower board reset(s)\n`)
  }

  for (const player of result.players) {
    const scored = player.score.combinations[0]
    const combination = scored?.description ?? scored?.label ?? "High Card"
    stdout.write(
      `${player.name.padEnd(10)} ${player.cards.map(tile).join(" ")} · rank ${player.score.total} (${combination}) · committed ${player.committed} · payout ${player.payout}${player.folded ? " · folded" : ""}${player.flowerDisqualified ? " · single Flower: ineligible" : ""}\n`,
    )
  }
}

function isHumanDecision(game: GameEngine): boolean {
  const state = game.state

  return (
    !autoPlay &&
    ((state.phase === "seeding" && state.actingPlayerId === "p1") ||
      (state.phase === "betting" && state.actingPlayerId === "p1") ||
      (state.phase === "discarding" && state.pendingDiscard?.playerId === "p1"))
  )
}

function currentPlayerName(game: GameEngine): string {
  const state = game.state
  const playerId =
    state.phase === "discarding" ? state.pendingDiscard?.playerId : state.actingPlayerId

  return state.players.find((player) => player.id === playerId)?.name ?? "Table"
}

function actionLabel(action: LegalAction): string {
  if (action.type === "call") {
    return `Call ${action.callAmount} + Draw & Discard`
  }

  if (action.type === "check") {
    return "Check + Draw & Discard"
  }

  if (action.type === "bet" || action.type === "raise") {
    return `${action.type === "bet" ? "Bet" : "Raise"} (${action.minimum}-${action.maximum})${action.canRiichi ? " · Riichi available" : ""}`
  }

  return "Fold + take 2 blue sticks"
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

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`
}

function formatAutomatedStep(step: AutomatedStep): string {
  const action = step.decision?.rationale ?? step.rationale

  if (!step.drawDiscard || !step.discard) {
    return action
  }

  const draw = step.drawDiscard

  return `${action} Drew ${tile(draw.drawnCard)}; discarded ${tile(draw.discardedCard)} to ${draw.discardPile.toUpperCase()}. Expected final rank ${step.discard.expectedScore.toFixed(1)} (${step.decision?.evaluations[0]?.samples ?? samples} rollouts).`
}

function renderTextTable(headers: readonly string[], rows: readonly string[][]): void {
  const numericHeaders = new Set(["Chips", "Bet", "Total", "Blue", "Loans", "Equity", "Odds", "EV"])
  const widths = headers.map((header, column) =>
    Math.max(visibleWidth(header), ...rows.map((row) => visibleWidth(row[column] ?? ""))),
  )
  const renderRow = (row: readonly string[]) =>
    row
      .map((cell, column) =>
        padVisible(cell, widths[column]!, numericHeaders.has(headers[column]!)),
      )
      .join(" │ ")

  stdout.write(`${renderRow(headers)}\n`)
  stdout.write(`${widths.map((width) => "─".repeat(width)).join("─┼─")}\n`)

  for (const row of rows) {
    stdout.write(`${renderRow(row)}\n`)
  }
}

function padVisible(value: string, width: number, alignRight: boolean): string {
  const padding = " ".repeat(Math.max(0, width - visibleWidth(value)))

  return alignRight ? padding + value : value + padding
}

function visibleWidth(value: string): number {
  const escape = String.fromCharCode(27)
  const plain = value.replace(new RegExp(`${escape}\\[[0-9;]*m`, "g"), "")

  return [...plain].length
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
