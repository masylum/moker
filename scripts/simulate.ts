import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { availableParallelism } from "node:os"
import { parseArgs } from "node:util"
import { resolve } from "node:path"
import { simulateParallel } from "./lib/simulation-pool"
import { createConfig, LOAN_VALUE, MAX_LOANS, STARTING_RIICHI_STICKS } from "../src/game/rules"
import type { SimulationResult } from "../src/game/types"

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    samples: { type: "string", default: "24" },
    workers: { type: "string", default: "auto" },
    orbits: { type: "string", default: "4" },
    "tournament-games": { type: "string", default: "1" },
    chips: { type: "string", default: "200" },
    offset: { type: "string", default: "0" },
    riichi: { type: "boolean", default: false },
    output: { type: "string" },
    jsonl: { type: "string" },
    logs: { type: "string" },
    "log-count": { type: "string", default: "10" },
    help: { type: "boolean" },
  },
})
if (values.help) {
  console.log(`Usage: npm run simulate -- [count=10] [seed=moker-v6] [options]
  --workers auto|N  Concurrent CPU processes (auto: all available cores)
  --samples N       Equity trials, default 24; unchanged by parallelism
  --orbits N        Dealer orbits per game, default 4 (1–4)
  --tournament-games 1|2|3|4  Games with stack resets (default 1)
  --riichi          Riichi expansion instead of Basic
  --chips N         Initial chips, default 200
  --offset N        First seed index, default 0
  --output FILE     Markdown summary
  --jsonl FILE      Completed games with state/events, written as they finish
  --logs DIR        Detailed decisions for the first --log-count games (default 10)
Each run contains the selected games; stacks carry between orbits and reset between games.
Interrupted runs retain completed JSONL records. Outputs are replaced on a new run.`)
  process.exit(0)
}
if (positionals.length > 2) throw new Error("Expected count and seed prefix; see --help")
const integer = (value: string, minimum = 1) => {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < minimum) throw new Error(`Invalid integer: ${value}`)
  return n
}
const count = integer(positionals[0] ?? "10")
const seedPrefix = positionals[1] ?? "moker-v6"
const samples = integer(values.samples!)
const workers = Math.min(
  count,
  values.workers === "auto" ? availableParallelism() : integer(values.workers!),
)
const offset = integer(values.offset!, 0)
const logCount = values.logs ? Math.min(count, integer(values["log-count"]!)) : 0
const config = createConfig({
  seed: seedPrefix,
  mode: values.riichi ? "riichi" : "basic",
  orbits: integer(values.orbits!),
  startingChips: integer(values.chips!),
  heuristicSamples: samples,
  tournamentGames: integer(values["tournament-games"]!) as 1 | 2 | 3 | 4,
})
if (values.output && values.jsonl && resolve(values.output) === resolve(values.jsonl))
  throw new Error("Summary and JSONL paths must differ")
if (values.logs) mkdirSync(values.logs, { recursive: true })
if (values.jsonl) writeFileSync(values.jsonl, "")
const started = performance.now()
let completed = 0,
  hands = 0,
  showdowns = 0,
  allIns = 0,
  street4 = 0,
  eliminated = 0,
  loans = 0,
  riichies = 0,
  lotusBonuses = 0
let scoreMin = Infinity,
  scoreMax = -Infinity
const ranks: Record<string, { appearances: number; wins: number }> = {}
const actions: Record<string, number> = { check: 0, call: 0, bet: 0, fold: 0 }
const violations: string[] = []
process.stderr.write(
  `${count} ${config.mode} games · ${config.orbits} orbits · ${samples} samples · ${workers}/${availableParallelism()} CPU workers\n`,
)
const progress = () => {
  const seconds = (performance.now() - started) / 1000
  const eta = completed
    ? `${(((count - completed) * seconds) / completed).toFixed(0)}s ETA`
    : "first games running"
  process.stderr.write(`Progress ${completed}/${count} · ${seconds.toFixed(1)}s · ${eta}\n`)
}
const timer = setInterval(progress, 10_000)
try {
  await simulateParallel({
    count,
    workers,
    game: (index) => ({
      ...config,
      seed: `${seedPrefix}-${offset + index}`,
      collectDecisions: index < logCount,
      collectGameSummaries: true,
    }),
    onResult: (result: SimulationResult, index) => {
      const { state, events, seed } = result
      if (values.jsonl)
        appendFileSync(
          values.jsonl,
          JSON.stringify({
            index: offset + index,
            seed,
            state,
            events,
            gameSummaries: result.gameSummaries,
          }) + "\n",
        )
      if (values.logs && index < logCount)
        writeFileSync(`${values.logs}/${offset + index}.json`, JSON.stringify(result))
      if (
        state.phase !== "finished" ||
        state.handResults.length > state.players.length * config.orbits * config.tournamentGames
      )
        violations.push(`${seed}: incomplete/invalid game`)
      const total = state.players.reduce((sum, p) => sum + p.chips, 0)
      const borrowed = state.players.reduce((sum, p) => sum + p.loans, 0)
      if (
        Math.abs(
          total -
            ((state.gameNumber === 1 ? config.startingChips : 100 + state.gameNumber * 100) *
              state.players.length +
              borrowed * LOAN_VALUE),
        ) > 1e-7
      )
        violations.push(`${seed}: chip conservation`)
      if (
        state.players.some((p) => !Number.isFinite(p.chips) || p.chips < 0 || p.loans > MAX_LOANS)
      )
        violations.push(`${seed}: invalid cash/loan count`)
      const eventCount = (type: string) => events.filter((e) => e.type === type).length
      const awarded = events
        .filter((e) => e.type === "riichi-sticks-awarded")
        .reduce((sum, e) => sum + (e.payload as { amount: number }).amount, 0)
      const spent =
        eventCount("riichi-stick-spent") + eventCount("curse-placed") + eventCount("curse-removed")
      const initial =
        config.mode === "riichi"
          ? state.players.length * STARTING_RIICHI_STICKS * config.tournamentGames
          : 0
      if (
        result
          .gameSummaries!.flatMap((g) => g.players)
          .reduce((sum, p) => sum + p.riichiSticks, 0) !==
        initial - spent + awarded
      )
        violations.push(`${seed}: stick conservation`)
      loans += eventCount("loan-taken")
      riichies += eventCount("riichi-declared")
      eliminated += result
        .gameSummaries!.flatMap((g) => g.players)
        .filter((p) => p.eliminated).length
      for (const score of Object.values(state.finalScores!)) {
        scoreMin = Math.min(scoreMin, score)
        scoreMax = Math.max(scoreMax, score)
      }
      for (const hand of state.handResults) {
        hands++
        if (hand.allInPlayerIds.length) allIns++
        if (hand.bettingHistory.some((a) => a.street === 4)) street4++
        if (hand.lotusBluff) lotusBonuses++
        for (const action of hand.bettingHistory)
          actions[action.type] = (actions[action.type] ?? 0) + 1
        if (Math.abs(hand.pot - hand.players.reduce((sum, p) => sum + p.payout, 0)) > 1e-7)
          violations.push(`${seed}: payout conservation, hand ${hand.handNumber}`)
        if (hand.reason !== "showdown") continue
        showdowns++
        for (const p of hand.players.filter((player) => !player.folded && !player.eliminated)) {
          const flowers = p.cards.filter((c) => c.kind === "flower").length
          const label =
            flowers === 1
              ? "Single Lotus"
              : flowers === 2
                ? "Twin Lotus"
                : (p.score.combinations[0]?.label ?? "High Card")
          const rank = (ranks[label] ??= { appearances: 0, wins: 0 })
          rank.appearances++
          if (hand.winnerIds.includes(p.playerId)) rank.wins++
        }
      }
      completed++
    },
  })
} finally {
  clearInterval(timer)
  progress()
}
const seconds = (performance.now() - started) / 1000
const pct = (n: number) => `${n} (${hands ? ((100 * n) / hands).toFixed(1) : "0"}%)`
const report = [
  `# Moker rules-v6 simulation — ${config.mode}`,
  "",
  `${count} runs × ${config.tournamentGames} games, ${config.orbits} orbits per game, ${hands} hands, ${config.startingChips} starting chips.`,
  `Seeds ${seedPrefix}-${offset} through ${seedPrefix}-${offset + count - 1}; ${samples} joint equity trials per projection (up to four opponent completions within a trial).`,
  `${workers} CPU workers; ${seconds.toFixed(2)} seconds; ${((count * 60) / seconds).toFixed(2)} games/minute.`,
  "",
  "| Metric | Result |",
  "| --- | ---: |",
  `| Invariant violations | ${violations.length} |`,
  `| Showdowns | ${pct(showdowns)} |`,
  `| All-in hands | ${pct(allIns)} |`,
  `| Street 4 hands | ${pct(street4)} |`,
  `| Eliminated players | ${eliminated}/${count * 4 * config.tournamentGames} |`,
  `| Checks / calls / bets / folds | ${["check", "call", "bet", "fold"].map((type) => actions[type]).join(" / ")} |`,
  `| Loans taken | ${loans} |`,
  `| Riichi declarations | ${riichies} |`,
  `| Lotus bonuses | ${lotusBonuses} |`,
  `| Final score range | ${scoreMin.toFixed(2)} to ${scoreMax.toFixed(2)} |`,
  "",
  "## Showdown hands",
  "",
  "Tied winners each count as a win; these are observed frequencies, not controlled hand-strength estimates.",
  "",
  "| Hand | Appearances | Wins | Win rate |",
  "| --- | ---: | ---: | ---: |",
  ...Object.entries(ranks)
    .sort(([a, x], [b, y]) => y.appearances - x.appearances || a.localeCompare(b))
    .map(
      ([rank, n]) =>
        `| ${rank} | ${n.appearances} | ${n.wins} | ${((100 * n.wins) / n.appearances).toFixed(1)}% |`,
    ),
  ...(violations.length
    ? ["", "## Violations", "", ...violations.sort().map((v) => `- ${v}`)]
    : []),
  "",
].join("\n")
if (values.output) writeFileSync(values.output, report)
process.stdout.write(report)
if (violations.length) process.exitCode = 1
