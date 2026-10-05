import { stdin, stdout } from "node:process"
import { createInterface } from "node:readline/promises"
import { coloredTile as tile } from "../src/cli/tiles"
import { stepHeuristic, type AutomatedStep } from "../src/game/automation"
import { cardLabel } from "../src/game/cards"
import { GameEngine, type PlayerSetup } from "../src/game/engine"
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
  source: CardSource
  blankExchange?: BlankExchange
}

const terminal = createInterface({ input: stdin, output: stdout })
const seed = argument("--seed") ?? "terminal-table"
const samples = boundedInteger(argument("--samples") ?? "24", 1, 256)
const autoPlay = process.argv.includes("--auto")
let lastResultRendered = 0
const players: PlayerSetup[] = Array.from(
  { length: boundedInteger(argument("--players") ?? "4", 2, 6) },
  (_, index) => ({
    id: `p${index + 1}`,
    name: !autoPlay && index === 0 ? "You" : `Bot ${index + 1}`,
    controller: !autoPlay && index === 0 ? "human" : "heuristic",
  }),
)
const engine = GameEngine.create(players, {
  seed,
  mode: process.argv.includes("--riichi") ? "riichi" : "basic",
  tournamentGames: argument("--games") === "4" ? 4 : argument("--games") === "3" ? 3 : 1,
  heuristicSamples: samples,
})

try {
  stdout.write(`\nMahjong Poker · seed ${seed}\n`)
  while (engine.state.phase !== "finished") {
    renderTable(engine)
    if (isHumanDecision(engine)) await playHumanTurn(engine)
    else if (engine.state.phase === "between-hands" && !autoPlay) {
      await terminal.question("Press Enter for the next hand… ")
      stepHeuristic(engine)
    } else {
      const step = stepHeuristic(engine)
      stdout.write(`\n${playerName(step.playerId)}: ${formatStep(step)}\n`)
    }
  }
  renderTable(engine)
  stdout.write("\nFinal scores\n")
  for (const [id, score] of Object.entries(engine.state.finalScores ?? {}).sort(
    (left, right) => right[1] - left[1],
  ))
    stdout.write(`  ${playerName(id)}: ${score}\n`)
} finally {
  terminal.close()
}

async function playHumanTurn(game: GameEngine): Promise<void> {
  if (game.state.phase === "charleston") {
    game.passCharleston(
      "p1",
      await chooseCards("Pass which two tiles left?", human(game).privateCards, 2),
    )
    return
  }
  if (game.state.phase === "exposing") {
    const count = game.state.street === 1 ? 3 : 1
    game.exposeCards(
      "p1",
      await chooseCards(
        `Expose which ${count} tile${count === 1 ? "" : "s"}?`,
        human(game).privateCards,
        count,
      ),
    )
    return
  }
  if (game.state.phase === "betting") {
    await playBettingTurn(game)
    return
  }
  if (game.state.phase === "discarding") {
    const discardCardId = await chooseCard("Discard which tile?", human(game).privateCards)
    game.discard("p1", { discardCardId, discardPile: await chooseDiscardPile(game) })
    return
  }
}

async function playBettingTurn(game: GameEngine): Promise<void> {
  const legal = game.legalActions("p1")
  const labels = legal.map(actionLabel)
  const player = human(game)
  const selected = await choose("Your action", labels)
  const action = legal[selected]!
  if (action.type === "check" || action.type === "call") {
    const fishing = action.type === "call" || !game.state.allInPlayerIds.length
    const useRiichiStick =
      action.canUseRiichiStick &&
      (await choose("Spend one fishing stick for a second fish?", ["No", "Yes"])) === 1
    const draw = fishing || useRiichiStick ? await chooseDraw(game) : undefined
    game.act("p1", {
      type: action.type,
      ...(draw ? { drawSource: draw.source, blankExchange: draw.blankExchange } : {}),
      ...(useRiichiStick ? { useRiichiStick: true, riichiDrawSource: draw?.source ?? "deck" } : {}),
    })
    return
  }
  if (action.type === "bet") {
    const amount = await askInteger("Bet target", action.minimum!, action.maximum!, CHIP_UNIT)
    const wager: BettingAction = {
      type: "bet",
      amount,
    }
    if (
      player.riichiSticks > 0 &&
      amount < (action.maximum ?? 0) &&
      (await choose("Spend a fishing stick to Draw & Discard after Betting?", ["No", "Yes"])) === 1
    ) {
      const draw = await chooseDraw(game)
      Object.assign(wager, {
        useRiichiStick: true,
        drawSource: draw.source,
        blankExchange: draw.blankExchange,
      })
    }
    game.act("p1", wager)
    return
  }
  game.act("p1", { type: "fold" })
}

async function chooseDraw(game: GameEngine): Promise<DrawChoice> {
  const choices: Array<{ label: string; value: DrawChoice }> = [
    { label: "Deck (hidden)", value: { source: "deck" } },
  ]
  for (const [pile, cards] of [
    ["a", game.state.discardA],
    ["b", game.state.discardB],
  ] as const) {
    const top = cards.at(-1)
    if (top)
      choices.push({
        label: `Fish ${pile.toUpperCase()}: ${tile(top)} ${cardLabel(top)}`,
        value: { source: `discard-${pile}` },
      })
  }
  const blank = human(game).privateCards.find((card) => card.kind === "blank")
  if (blank) {
    for (const [pile, cards] of [
      ["a", game.state.discardA],
      ["b", game.state.discardB],
    ] as const) {
      cards.forEach((card, cardIndex) =>
        choices.push({
          label: `Blank swap ${pile.toUpperCase()}${cardIndex + 1}: ${tile(card)} ${cardLabel(card)}`,
          value: { source: "deck", blankExchange: { blankCardId: blank.id, pile, cardIndex } },
        }),
      )
    }
  }
  return choices[
    await choose(
      "Draw & Discard",
      choices.map((choice) => choice.label),
    )
  ]!.value
}

async function chooseDiscardPile(game: GameEngine): Promise<DiscardPile> {
  if (game.state.discardA.length === 0) return "a"
  if (game.state.discardB.length === 0) return "b"
  return (await choose("Cover which lane?", ["Lane A", "Lane B"])) === 0 ? "a" : "b"
}

function renderTable(game: GameEngine): void {
  const state = game.state
  stdout.write("\n────────────────────────────────────────────────────────\n")
  stdout.write(
    `Game ${state.gameNumber}/${state.config.tournamentGames} · round ${state.handNumber}/${state.maxHands} (ante ${state.orbitValue}) · street ${state.street} · ${state.phase} · pot ${state.pot} · wager ${state.currentWager}\n`,
  )
  stdout.write(`Discard A  ${state.discardA.map(tile).join(" ") || "—"}\n`)
  stdout.write(`Discard B  ${state.discardB.map(tile).join(" ") || "—"}\n`)
  const rows = state.players.map((player) => [
    player.name,
    String(player.chips),
    String(player.roundCommitted),
    String(player.handCommitted),
    String(player.riichiSticks),
    String(player.loans),
    player.publicCards.map(tile).join(" ") || "—",
    player.id === "p1" || autoPlay
      ? player.privateCards.map(tile).join(" ")
      : "🀫 ".repeat(player.privateCards.length).trim(),
    [
      player.id === state.actingPlayerId ? "acting" : "",
      player.eliminated ? "ELIMINATED" : player.folded ? "folded" : "",
      player.chips === 0 && !player.folded ? "ALL-IN" : "",
      player.riichi ? "RIICHI" : "",
    ]
      .filter(Boolean)
      .join(", ") || "—",
  ])
  renderTextTable(
    ["Player", "Chips", "Bet", "Total", "Sticks", "Loans", "Up", "Hand", "Status"],
    rows,
  )
  const result = state.handResults.at(-1)
  if (result && result.handNumber > lastResultRendered) {
    renderHandResult(result)
    lastResultRendered = result.handNumber
  }
}

function renderHandResult(result: HandResult): void {
  const winners = result.winnerIds.map(playerName).join(", ")
  stdout.write(`\nResult     ${winners} won ${result.pot} by ${result.reason}\n`)
  if (result.lotusBluff) stdout.write(`Lotus      ${result.lotusBluff.total} bluff bonus\n`)
  const riichi = result.riichiSettlement
  if (riichi.declaredPlayerId)
    stdout.write(
      `Riichi     ${playerName(riichi.declaredPlayerId)} ${riichi.won ? `won ${riichi.sticksAwarded} sticks` : "did not win"}\n`,
    )
}

function isHumanDecision(game: GameEngine): boolean {
  if (autoPlay) return false
  const state = game.state
  return state.actingPlayerId === "p1" || state.pendingDiscard?.playerId === "p1"
}

function human(game: GameEngine) {
  return game.state.players.find((player) => player.id === "p1")!
}

function playerName(playerId?: string): string {
  return engine.state.players.find((player) => player.id === playerId)?.name ?? "Table"
}

function actionLabel(action: LegalAction): string {
  if (action.type === "check") return "Check (free fish unless locked)"
  if (action.type === "call") return `Call ${action.callAmount} (free fish unless in Riichi)`
  if (action.type === "bet")
    return `Bet (${action.minimum}-${action.maximum})${action.canRiichi ? " · Riichi available" : ""}`
  return "Fold"
}

async function chooseCard(prompt: string, cards: readonly { id: string }[]): Promise<string> {
  const index = await choose(
    prompt,
    cards.map((card) => {
      const full = human(engine).privateCards.find((candidate) => candidate.id === card.id)!
      return `${tile(full)} ${cardLabel(full)}`
    }),
  )
  return cards[index]!.id
}

async function chooseCards(
  prompt: string,
  cards: readonly { id: string }[],
  count: number,
): Promise<string[]> {
  const remaining = [...cards]
  const chosen: string[] = []
  for (let index = 0; index < count; index += 1) {
    const id = await chooseCard(`${prompt} (${index + 1}/${count})`, remaining)
    chosen.push(id)
    remaining.splice(
      remaining.findIndex((card) => card.id === id),
      1,
    )
  }
  return chosen
}

async function choose(prompt: string, choices: readonly string[]): Promise<number> {
  while (true) {
    stdout.write(`\n${prompt}\n`)
    choices.forEach((choice, index) => stdout.write(`  ${index + 1}. ${choice}\n`))
    const answer = Number.parseInt(await terminal.question("> "), 10) - 1
    if (Number.isInteger(answer) && answer >= 0 && answer < choices.length) return answer
    stdout.write("Choose one of the listed numbers.\n")
  }
}

async function askInteger(
  prompt: string,
  minimum: number,
  maximum: number,
  step: number,
): Promise<number> {
  while (true) {
    const answer = Number.parseInt(
      await terminal.question(`${prompt} (${minimum}-${maximum}): `),
      10,
    )
    if (Number.isInteger(answer) && answer >= minimum && answer <= maximum && answer % step === 0)
      return answer
    stdout.write(`Enter a multiple of ${step} from ${minimum} to ${maximum}.\n`)
  }
}

function formatStep(step: AutomatedStep): string {
  const draw = step.drawDiscard
  return draw
    ? `${step.rationale} Drew ${tile(draw.drawnCard)}; discarded ${tile(draw.discardedCard)} to ${draw.discardPile.toUpperCase()}.`
    : step.rationale
}

function renderTextTable(headers: readonly string[], rows: readonly string[][]): void {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => visibleWidth(row[column] ?? ""))),
  )
  const render = (row: readonly string[]) =>
    row.map((cell, column) => cell + " ".repeat(widths[column]! - visibleWidth(cell))).join(" │ ")
  stdout.write(`${render(headers)}\n${widths.map((width) => "─".repeat(width)).join("─┼─")}\n`)
  for (const row of rows) stdout.write(`${render(row)}\n`)
}

function visibleWidth(value: string): number {
  const escape = String.fromCharCode(27)
  return [...value.replace(new RegExp(`${escape}\\[[0-9;]*m`, "g"), "")].length
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function boundedInteger(value: string, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum)
    throw new RangeError(`Expected ${minimum}-${maximum}`)
  return parsed
}
