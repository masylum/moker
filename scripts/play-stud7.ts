import { stdin, stdout } from "node:process"
import { createInterface } from "node:readline/promises"
import { coloredTile as tile } from "../src/cli/tiles"
import { cardLabel } from "../src/game/cards"
import { CHIP_UNIT } from "../src/game/rules"
import type { BlankExchange, CardSource, DiscardPile, LegalAction } from "../src/game/types"
import { stepStud7Heuristic, type StudAutomatedStep } from "../src/stud7/automation"
import { Stud7Engine, type StudPlayerSetup } from "../src/stud7/engine"
import { analyzeStud7Math } from "../src/stud7/heuristic"
import type { StudHandResult } from "../src/stud7/types"

interface DrawChoice {
  drawSource: CardSource
  blankExchange?: BlankExchange
}

const terminal = createInterface({ input: stdin, output: stdout })
const seed = argument("--seed") ?? "stud7-table"
const playerCount = boundedInteger(argument("--players") ?? "4", 2, 6)
const samples = boundedInteger(argument("--samples") ?? "32", 1, 256)
const autoPlay = process.argv.includes("--auto")
const debug = process.argv.includes("--debug")
let lastResultRendered = 0
const players: StudPlayerSetup[] = [
  { id: "p1", name: autoPlay ? "Bot 1" : "You", controller: autoPlay ? "heuristic" : "human" },
  ...Array.from({ length: playerCount - 1 }, (_, index) => ({
    id: `p${index + 2}`,
    name: `Bot ${index + 2}`,
    controller: "heuristic" as const,
  })),
]
const engine = Stud7Engine.create(players, { seed, heuristicSamples: samples })

try {
  stdout.write(`\nMahjong Poker · Stud7 prototype · seed ${seed}\n`)

  while (engine.state.phase !== "finished") {
    renderTable(engine)

    if (isHumanDecision(engine)) {
      await playHumanTurn(engine)
    } else if (engine.state.phase === "between-hands") {
      if (!autoPlay) {
        await terminal.question("Press Enter for the next hand… ")
      }

      stepStud7Heuristic(engine)
    } else {
      const actor = currentPlayerName(engine)
      const step = stepStud7Heuristic(engine)
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

async function playHumanTurn(game: Stud7Engine): Promise<void> {
  if (game.state.phase === "betting") {
    await playBettingTurn(game)

    return
  }

  const pending = game.state.pendingDiscard

  if (game.state.phase !== "discarding" || pending?.playerId !== "p1") {
    return
  }

  const player = game.state.players.find((candidate) => candidate.id === "p1")!
  const options = [
    ...player.cards.map(({ card, visibility }) => ({
      id: card.id,
      label: `${tile(card)} ${cardLabel(card)} (${visibility})`,
    })),
    {
      id: pending.drawnCard.id,
      label: `${tile(pending.drawnCard)} ${cardLabel(pending.drawnCard)} (discard the draw)`,
    },
  ]
  const selected = await choose(
    "Discard which tile? A deck replacement inherits this tile's visibility; Fishing is public.",
    options.map(({ label }) => label),
  )
  const pile = await chooseDiscardPile(game)
  game.discard("p1", { discardCardId: options[selected]!.id, discardPile: pile })
}

async function playBettingTurn(game: Stud7Engine): Promise<void> {
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
    const draw = await chooseDraw(game)
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
    game.act("p1", { type: action.type, amount, ...(riichi ? { riichi } : {}) })

    return
  }

  game.act("p1", { type: "fold" })
}

async function chooseDraw(game: Stud7Engine): Promise<DrawChoice> {
  const choices: Array<{ label: string; draw: DrawChoice }> = [
    {
      label: "Deck (replacement inherits discarded tile visibility)",
      draw: { drawSource: "deck" },
    },
  ]

  if (game.state.discardA.length > 0) {
    const card = game.state.discardA.at(-1)!
    choices.push({
      label: `Fish A: ${tile(card)} ${cardLabel(card)} (replacement is public)`,
      draw: { drawSource: "discard-a" },
    })
  }

  if (game.state.discardB.length > 0) {
    const card = game.state.discardB.at(-1)!
    choices.push({
      label: `Fish B: ${tile(card)} ${cardLabel(card)} (replacement is public)`,
      draw: { drawSource: "discard-b" },
    })
  }

  const player = game.state.players.find((candidate) => candidate.id === "p1")!

  for (const owned of player.cards.filter(({ card }) => !player.riichi && card.kind === "blank")) {
    for (const [pile, lane] of [
      ["a", game.state.discardA],
      ["b", game.state.discardB],
    ] as const) {
      lane.forEach((card, cardIndex) => {
        choices.push({
          label: `Blank swap ${pile.toUpperCase()}${cardIndex + 1}: ${tile(card)} ${cardLabel(card)} (public)`,
          draw: {
            drawSource: "deck",
            blankExchange: { blankCardId: owned.card.id, pile, cardIndex },
          },
        })
      })
    }
  }

  const selected = await choose(
    "Draw & Discard",
    choices.map(({ label }) => label),
  )

  return choices[selected]!.draw
}

async function chooseDiscardPile(game: Stud7Engine): Promise<DiscardPile> {
  if (game.state.discardA.length === 0) {
    return "a"
  }

  if (game.state.discardB.length === 0) {
    return "b"
  }

  return (await choose("Discard to which lane?", ["Lane A", "Lane B"])) === 0 ? "a" : "b"
}

function renderTable(game: Stud7Engine): void {
  const state = game.state
  stdout.write("\n────────────────────────────────────────────────────────\n")
  stdout.write(
    `Hand ${state.handNumber}/${state.maxHands} · orbit ${state.orbit} (${state.orbitValue}) · street ${state.street}/5 · ${state.phase} · pot ${state.pot} · wager ${state.currentWager} · min raise ${state.minimumRaise}\n`,
  )
  stdout.write(`Discard A  ${state.discardA.map(tile).join(" ") || "—"}\n`)
  stdout.write(`Discard B  ${state.discardB.map(tile).join(" ") || "—"}\n`)

  const headers = ["Player", "Chips", "Bet", "Total", "Blue", "Loans", "Up", "Hole"]

  if (debug) {
    headers.push("Equity", "Odds", "EV", "Rank")
  }

  headers.push("Status")
  const rows = state.players.map((player) => {
    const up = player.cards
      .filter(({ visibility }) => visibility === "public")
      .map(({ card }) => tile(card))
      .join(" ")
    const privateCards = player.cards.filter(({ visibility }) => visibility === "private")
    const hole =
      player.id === "p1" || debug
        ? privateCards.map(({ card }) => tile(card)).join(" ")
        : privateCards.map(() => "🀫").join(" ")
    const row = [
      player.name,
      String(player.chips),
      String(player.roundCommitted),
      String(player.handCommitted),
      String(player.blueSticks),
      String(player.loans),
      up || "—",
      hole || "—",
    ]

    if (debug) {
      const math = analyzeStud7Math(state, player.id, Math.min(samples, 24))
      row.push(
        percent(math.showdownEquity),
        percent(math.potOdds),
        signed(math.callExpectedValue),
        math.expectedRank.toFixed(1),
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

function renderHandResult(result: StudHandResult): void {
  const winners = result.players
    .filter((player) => result.winnerIds.includes(player.playerId))
    .map((player) => `${player.name} (+${player.payout})`)
    .join(", ")
  stdout.write(
    `\nResult     ${winners} won ${result.pot} by ${result.reason === "showdown" ? "showdown" : "folds"}\n`,
  )

  for (const player of result.players) {
    const scored = player.score.combinations[0]
    const combination = scored?.description ?? scored?.label ?? "High Card"
    stdout.write(
      `${player.name.padEnd(10)} up ${player.publicCards.map(tile).join(" ") || "—"} · hole ${player.privateCards.map(tile).join(" ") || "—"} · rank ${player.score.total} (${combination}) · committed ${player.committed} · payout ${player.payout}${player.folded ? " · folded" : ""}\n`,
    )
  }
}

function isHumanDecision(game: Stud7Engine): boolean {
  return (
    !autoPlay &&
    ((game.state.phase === "betting" && game.state.actingPlayerId === "p1") ||
      (game.state.phase === "discarding" && game.state.pendingDiscard?.playerId === "p1"))
  )
}

function currentPlayerName(game: Stud7Engine): string {
  const playerId =
    game.state.phase === "discarding"
      ? game.state.pendingDiscard?.playerId
      : game.state.actingPlayerId

  return game.state.players.find((player) => player.id === playerId)?.name ?? "Table"
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

  return "Fold + take a blue stick"
}

function formatAutomatedStep(step: StudAutomatedStep): string {
  if (!step.drawDiscard) {
    return step.rationale
  }

  const draw = step.drawDiscard

  return `${step.rationale} Drew ${tile(draw.drawnCard)}; discarded ${tile(draw.discardedCard)} to ${draw.discardPile.toUpperCase()}${draw.replacementVisibility ? `; replacement is ${draw.replacementVisibility}` : ""}.`
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
  step: number,
): Promise<number> {
  while (true) {
    const answer = Number.parseInt(await terminal.question(`${prompt}: `), 10)

    if (Number.isInteger(answer) && answer >= minimum && answer <= maximum && answer % step === 0) {
      return answer
    }

    stdout.write(`Enter a multiple of ${step} from ${minimum} to ${maximum}.\n`)
  }
}

function renderTextTable(headers: readonly string[], rows: readonly string[][]): void {
  const numericHeaders = new Set([
    "Chips",
    "Bet",
    "Total",
    "Blue",
    "Loans",
    "Equity",
    "Odds",
    "EV",
    "Rank",
  ])
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

  return [...value.replace(new RegExp(`${escape}\\[[0-9;]*m`, "g"), "")].length
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
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
