import { HAND_RANKS } from "./rules"
import type { HealthAccumulator, TileHealth } from "./health"

export interface HealthReportOptions {
  seedPrefix: string
  heuristicSamples: number
  workers: number
  elapsedSeconds: number
}

export function formatHealthReport(
  health: HealthAccumulator,
  options: HealthReportOptions,
): string {
  const baselineWinRate = divide(health.winnerCredit, health.participantHands)
  const actionTotal = sum(Object.values(health.actionCounts))
  const lines = [
    "# Mahjong Poker health simulation",
    "",
    `- Games: ${integer(health.games)} (${integer(health.hands)} hands from ${integer(health.scheduledHands)} scheduled)`,
    `- Seeds: \`${options.seedPrefix}-0\` through \`${options.seedPrefix}-${Math.max(0, health.games - 1)}\``,
    `- Heuristic: ${options.heuristicSamples} Monte Carlo rollouts per evaluation`,
    `- Runtime: ${options.elapsedSeconds.toFixed(1)} seconds across ${options.workers} workers`,
    "",
    "## Participation and game flow",
    "",
    table(
      ["Metric", "Result"],
      [
        ["Hands reaching showdown", percent(divide(health.showdowns, health.hands))],
        ["Hands won before showdown", percent(divide(health.uncontested, health.hands))],
        ["Average hands per game", decimal(mean(health.gameLengths))],
        [
          "Games ending before the schedule",
          percent(divide(health.gamesEndingEarly, health.games)),
        ],
        ["Average different hand winners per game", decimal(mean(health.distinctHandWinners))],
        ["Average betting decisions per hand", decimal(divide(actionTotal, health.hands))],
        ["Average final pot", chips(mean(health.finalPots))],
        [
          "Median / 90th percentile pot",
          `${chips(quantile(health.finalPots, 0.5))} / ${chips(quantile(health.finalPots, 0.9))}`,
        ],
        ["Average final-score spread", chips(mean(health.finalScoreSpreads))],
      ],
    ),
    "",
    "Finish point by community-card count:",
    "",
    countTable(health.finishByCommunityCount, health.hands, (key) =>
      key === "0" ? "Preflop" : `${key} community tiles`,
    ),
    "",
    "## Economy: blue sticks, pots, and Loans",
    "",
    table(
      ["Metric", "Mean", "Median", "90th percentile"],
      [
        metricRow("Opening pot", health.openingPots, "chips"),
        metricRow("Opening charge caused by blue sticks", health.openingBlueCharges, "chips"),
        metricRow("Opening charge caused by Loans", health.openingLoanCharges, "chips"),
        metricRow("Blue sticks in center at hand start", health.openingCenterBlue),
        metricRow("Blue sticks in center at hand end", health.endCenterBlue),
        metricRow("Blue sticks held per active player", health.playerBlue),
        metricRow("Loans held per active player", health.playerLoans),
      ],
    ),
    "",
    `Loans taken: ${integer(health.loansTaken)} (${decimal(divide(health.loansTaken, health.games))} per game); repaid: ${integer(health.loansRepaid)}.`,
    "",
    "Maximum Loans reached per player-game:",
    "",
    countTable(
      health.maximumLoansByPlayer,
      sum(Object.values(health.maximumLoansByPlayer)),
      (key) => `${key} Loan${key === "1" ? "" : "s"}`,
    ),
    "",
    "## Elimination pressure",
    "",
    `Eliminations: ${integer(health.eliminations)} across ${percent(divide(health.gamesWithElimination, health.games))} of games. Early finishes occurred in ${percent(divide(health.gamesEndingEarly, health.games))} of games.`,
    "",
    countTable(health.eliminationHands, health.eliminations, (key) => `Before hand ${key}`),
    "",
    "## Player choices",
    "",
    countTable(health.actionCounts, actionTotal, title),
    "",
    "Draw choices attached to checks and calls:",
    "",
    countTable(health.drawSourceCounts, sum(Object.values(health.drawSourceCounts)), title),
    "",
    `Riichi declarations: ${integer(health.riichiDeclarations)} (${percent(divide(health.riichiDeclarations, health.hands))} per hand); Riichi wins: ${integer(health.riichiWins)} (${percent(divide(health.riichiWins, health.riichiDeclarations))} of declarations). Blank exchanges: ${integer(health.blankExchanges)}.`,
    "",
    `Flower board resets: ${integer(health.boardResets)} (${percent(divide(health.boardResets, health.hands))} per hand). Flower bluffs: ${integer(health.flowerBluffs)}, paying ${integer(health.flowerBluffChips)} chips. Flower showdown disqualifications: ${integer(health.flowerDisqualifications)}.`,
    "",
    "## Hand ladder usage",
    "",
    handTable(health, baselineWinRate),
    "",
    "## Special-piece health",
    "",
    tileTable(
      ["kind:joker", "kind:blank", "kind:flower"].flatMap((key) =>
        health.tiles[key] ? [[key, health.tiles[key]!] as const] : [],
      ),
      baselineWinRate,
    ),
    "",
    "## Win rate by tile exposure",
    "",
    `Opening measures the original four private tiles, ever-held includes later draws and exchanges, and final-held measures the three tiles at resolution. Baseline win credit across all player-hands is ${percent(baselineWinRate)}; split pots divide one win among tied winners.`,
    "",
    tileTable(
      Object.entries(health.tiles)
        .filter(([key]) => key.startsWith("face:"))
        .sort((left, right) => left[1].label.localeCompare(right[1].label)),
      baselineWinRate,
    ),
    "",
    "## Seat fairness",
    "",
    countTable(health.gameWinsBySeat, sum(Object.values(health.gameWinsBySeat)), (key) => key),
  ]

  return lines.join("\n")
}

function handTable(health: HealthAccumulator, baseline: number): string {
  const kinds = Object.entries(HAND_RANKS).sort((left, right) => left[1] - right[1])

  return table(
    ["Rank", "Hand", "All final holdings", "Showdown holdings", "Winning hands", "Win share"],
    kinds.map(([kind, rank]) => {
      const all = health.allFinalHands[kind] ?? 0
      const wins = health.winningHands[kind] ?? 0

      return [
        String(rank),
        title(kind),
        `${integer(all)} (${percent(divide(all, health.participantHands))})`,
        integer(health.showdownHands[kind] ?? 0),
        decimal(wins),
        all > 0
          ? `${percent(divide(wins, all))} (${signedPoints(divide(wins, all) - baseline)})`
          : "n/a",
      ]
    }),
  )
}

function tileTable(
  entries: ReadonlyArray<readonly [string, TileHealth]>,
  baseline: number,
): string {
  return table(
    [
      "Piece",
      "Opening win rate / holdings",
      "Ever-held win rate / holdings",
      "Final-held win rate / holdings",
      "Final lift",
      "Showdown win rate",
      "Selected in winning Hand",
    ],
    entries.map(([, tile]) => {
      const winRate = divide(tile.winCredit, tile.holdings)

      return [
        tile.label,
        rateAndCount(tile.openingWinCredit, tile.openingHoldings),
        rateAndCount(tile.everWinCredit, tile.everHoldings),
        rateAndCount(tile.winCredit, tile.holdings),
        tile.holdings > 0 ? signedPoints(winRate - baseline) : "n/a",
        tile.showdownHoldings > 0
          ? percent(divide(tile.showdownWinCredit, tile.showdownHoldings))
          : "n/a",
        decimal(tile.selectedInWinningHand),
      ]
    }),
  )
}

function rateAndCount(wins: number, holdings: number): string {
  return holdings > 0 ? `${percent(divide(wins, holdings))} / ${integer(holdings)}` : "n/a / 0"
}

function countTable(
  counts: Record<string, number>,
  total: number,
  label: (key: string) => string,
): string {
  const entries = Object.entries(counts).sort((left, right) => Number(left[0]) - Number(right[0]))

  if (entries.length === 0) {
    return "No observations."
  }

  return table(
    ["Category", "Count", "Share"],
    entries.map(([key, count]) => [label(key), decimal(count), percent(divide(count, total))]),
  )
}

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n")
}

function metricRow(label: string, values: number[], unit?: "chips"): string[] {
  const format = unit === "chips" ? chips : decimal

  return [label, format(mean(values)), format(quantile(values, 0.5)), format(quantile(values, 0.9))]
}

function mean(values: number[]): number {
  return divide(sum(values), values.length)
}

function quantile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)

  return sorted[Math.floor((sorted.length - 1) * fraction)]!
}

function divide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function integer(value: number): string {
  return Math.round(value).toLocaleString("en-US")
}

function decimal(value: number): string {
  return value.toFixed(2)
}

function chips(value: number): string {
  return `${decimal(value)} chips`
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function signedPoints(value: number): string {
  const points = value * 100

  return `${points >= 0 ? "+" : ""}${points.toFixed(1)} pp`
}

function title(value: string): string {
  return value
    .split("-")
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ")
}
