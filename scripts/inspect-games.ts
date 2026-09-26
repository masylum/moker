import { LOAN_PENALTY } from "../src/game/rules"
import { simulateGame } from "../src/game/simulation"
import type { BettingRecord, HandResult, SimulationResult } from "../src/game/types"

const count = positiveInteger(process.argv[2] ?? "20")
const seedPrefix = process.argv[3] ?? "inspect"
const samples = positiveInteger(argument("--samples") ?? "24")
const results = Array.from({ length: count }, (_, index) =>
  simulateGame({
    seed: `${seedPrefix}-${index}`,
    heuristicSamples: samples,
  }),
)

const profiles = results.map(profile)
const aggressivePotMultiples = results
  .flatMap((result) => result.state.handResults)
  .flatMap((hand) => hand.bettingHistory)
  .filter(
    (record) =>
      record.type === "bet" && record.cost !== undefined && record.potBefore !== undefined,
  )
  .map((record) => record.cost! / Math.max(5, record.potBefore!))
const selected = unique([
  select(profiles, (entry) => entry.maximumPot),
  select(profiles, (entry) => entry.allIns),
  select(profiles, (entry) => -entry.eliminationHand),
  select(profiles, (entry) => entry.hand8TrailerWon * 100_000 + entry.hand8Deficit),
  select(profiles, (entry) => -entry.finalSpread),
])

process.stdout.write(
  `# Inspected canonical games\n\n${count} games; ${samples} samples. Across ${aggressivePotMultiples.length} aggressive actions: ${percentage(aggressivePotMultiples.filter((multiple) => multiple <= 1 / 3).length / Math.max(1, aggressivePotMultiples.length))} at most one-third pot; ${percentage(aggressivePotMultiples.filter((multiple) => multiple > 2).length / Math.max(1, aggressivePotMultiples.length))} above two-pot; maximum ${Math.max(0, ...aggressivePotMultiples).toFixed(2)}x pot.\n\nSelected mechanically: largest pot, most all-ins, earliest elimination, largest successful Hand-8 comeback, and closest finish.\n\n`,
)
for (const entry of selected) render(entry)

interface GameProfile {
  result: SimulationResult
  maximumPot: number
  allIns: number
  eliminationHand: number
  hand8Deficit: number
  hand8TrailerWon: number
  finalSpread: number
}

function profile(result: SimulationResult): GameProfile {
  const finalScores = result.state.finalScores ?? {}
  const orderedFinal = Object.values(finalScores).sort((left, right) => right - left)
  const hand8 = result.state.handResults[7]
  const hand8Ordered = hand8
    ? [...hand8.players].sort(
        (left, right) =>
          right.chips - right.loans * LOAN_PENALTY - (left.chips - left.loans * LOAN_PENALTY),
      )
    : []
  const trailer = hand8Ordered.at(-1)
  const finalMaximum = Math.max(...Object.values(finalScores))
  const elimination = result.events.find((event) => event.type === "player-eliminated")
  return {
    result,
    maximumPot: Math.max(...result.state.handResults.map((hand) => hand.pot)),
    allIns: result.events.filter(
      (event) =>
        event.type === "player-all-in" &&
        (event.payload as { reason?: string }).reason !== "opening-charge",
    ).length,
    eliminationHand: elimination?.handNumber ?? Number.POSITIVE_INFINITY,
    hand8Deficit:
      hand8Ordered.length > 0 ? score(hand8Ordered[0]!) - score(hand8Ordered.at(-1)!) : 0,
    hand8TrailerWon: trailer && finalScores[trailer.playerId] === finalMaximum ? 1 : 0,
    finalSpread: (orderedFinal[0] ?? 0) - (orderedFinal.at(-1) ?? 0),
  }
}

function render(entry: GameProfile): void {
  const result = entry.result
  process.stdout.write(`## ${result.seed}\n\n`)
  process.stdout.write(
    `Maximum pot ${entry.maximumPot}; ${entry.allIns} all-ins; ${Number.isFinite(entry.eliminationHand) ? `elimination on Hand ${entry.eliminationHand}` : "no elimination"}; Hand-8 deficit ${entry.hand8Deficit}; final spread ${entry.finalSpread}.\n\n`,
  )
  process.stdout.write(
    `Final: ${Object.entries(result.state.finalScores ?? {})
      .sort((left, right) => right[1] - left[1])
      .map(([id, chips]) => `${id} ${chips}`)
      .join(" · ")}\n\n`,
  )
  for (const hand of result.state.handResults) renderHand(hand)
  process.stdout.write("\n")
}

function renderHand(hand: HandResult): void {
  const winningHands = hand.players
    .filter((player) => hand.winnerIds.includes(player.playerId))
    .map((player) => `${player.playerId} ${player.score.combinations[0]?.label ?? "High Card"}`)
    .join(", ")
  const actions = ([1, 2, 3, 4] as const)
    .map((street) => {
      const records = hand.bettingHistory.filter((record) => record.street === street)
      return records.length > 0 ? `S${street} ${records.map(formatAction).join(" ")}` : ""
    })
    .filter(Boolean)
    .join("; ")
  const stacks = hand.players
    .map((player) => `${player.playerId}:${player.chips}/${player.riichiSticks}R/${player.curses}C`)
    .join(" ")
  const riichiReward = hand.riichiSettlement.declaredPlayerId
    ? `; Riichi ${hand.riichiSettlement.declaredPlayerId} ${hand.riichiSettlement.won ? `won ${hand.riichiSettlement.sticksAwarded} sticks` : "lost"}`
    : ""
  const curseSettlement = [
    ...hand.cursePayments.map(
      (payment) =>
        `${payment.playerId} paid ${payment.amount} (${payment.curseCount}C, ${payment.burned} burned)`,
    ),
    ...hand.curseRemovals.map(
      (removal) =>
        `${removal.playerId} spent ${removal.sticksSpent}R to remove ${removal.cursesRemoved}C`,
    ),
  ]
  const curseSummary = curseSettlement.length ? `; Curses ${curseSettlement.join(", ")}` : ""
  process.stdout.write(
    `- H${hand.handNumber}: ${hand.openingPot}→${hand.pot}; ${hand.reason}; ${winningHands}; ${actions}${riichiReward}${curseSummary}; end ${stacks}\n`,
  )
}

function formatAction(action: BettingRecord): string {
  const id = action.playerId
  if (action.type === "fold") return `${id}:F`
  if (action.type === "call") {
    return `${id}:C${action.cost ?? "?"}${action.curseTargetId ? `-X>${action.curseTargetId}` : ""}${action.removeCurse ? "-CLEAN" : ""}${isAllIn(action) ? "!" : ""}`
  }
  const multiple = (action.cost ?? 0) / Math.max(5, action.potBefore ?? 0)
  return `${id}:B${action.amount ?? "?"}[${multiple.toFixed(2)}P]${action.riichi ? "-RII" : ""}${action.curseTargetId ? `-X>${action.curseTargetId}` : ""}${action.removeCurse ? "-CLEAN" : ""}${isAllIn(action) ? "!" : ""}`
}

function isAllIn(action: BettingRecord): boolean {
  return (
    action.cost !== undefined &&
    action.actorChipsBefore !== undefined &&
    action.cost === action.actorChipsBefore
  )
}

function score(player: HandResult["players"][number]): number {
  return player.chips - player.loans * LOAN_PENALTY
}

function select(
  entries: readonly GameProfile[],
  value: (entry: GameProfile) => number,
): GameProfile {
  return [...entries].sort((left, right) => value(right) - value(left))[0]!
}

function unique(entries: readonly GameProfile[]): GameProfile[] {
  return entries.filter(
    (entry, index) =>
      entries.findIndex((candidate) => candidate.result.seed === entry.result.seed) === index,
  )
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function positiveInteger(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) throw new RangeError("Expected a positive integer")
  return parsed
}

function percentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}
