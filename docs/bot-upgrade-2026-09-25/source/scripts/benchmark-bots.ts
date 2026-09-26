import { createHash } from "node:crypto"
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { GameEngine } from "../src/game/engine"
import * as current from "../src/game/heuristic"
import * as baseline from "../baseline"

const arg = (key: string, fallback: string) =>
  process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1]! : fallback
const games = Number(arg("--games", "120"))
const prefix = arg("--seed", "bot-upgrade-tuning-v1")
const mode = arg("--mode", "riichi") as "basic" | "riichi"
const generation = arg("--generation", "mixed")
const policy = { ...current.DEFAULT_BOT_POLICY, ...JSON.parse(arg("--policy", "{}")) }
const output = arg("--output", `/tmp/bot-${mode}.json`)
const pairs = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
]
const sourceHashes = Object.fromEntries(
  readdirSync("src/game")
    .filter((f) => f.endsWith(".ts"))
    .map((f) => [
      f,
      createHash("sha256")
        .update(readFileSync(`src/game/${f}`))
        .digest("hex"),
    ]),
)
if (
  !["basic", "riichi"].includes(mode) ||
  !["mixed", "new", "old"].includes(generation) ||
  !Number.isInteger(games) ||
  games < 1 ||
  (generation === "mixed" && games % 6 !== 0)
)
  throw Error("Invalid mode, generation or game count (mixed requires complete six-seat rotations)")
const rows = []
for (let index = 0; index < games; index++) {
  const seats = pairs[index % 6]!
  const engine = GameEngine.create(
    [0, 1, 2, 3].map((i) => ({ id: `p${i + 1}`, name: `p${i + 1}`, controller: "heuristic" })),
    {
      seed: `${prefix}:${generation === "mixed" ? Math.floor(index / 6) : index}`,
      mode,
      orbits: mode === "basic" ? 4 : 1,
      heuristicSamples: 24,
    },
  )
  const counts = {
    checkStick: 0,
    twoStepDig: 0,
    blankChain: 0,
    callStick: 0,
    betStick: 0,
    blanks: 0,
    riichies: 0,
    loans: 0,
    street4: 0,
    hands: 0,
    allIns: 0,
    eliminations: 0,
  }
  const reached = new Set<number>()
  let steps = 0
  while (engine.state.phase !== "finished") {
    if (++steps > 20000) throw Error("Step limit")
    const state = engine.state
    if (state.street === 4) reached.add(state.handNumber)
    if (state.phase === "between-hands") {
      engine.startNextHand()
      continue
    }
    const id = state.actingPlayerId!
    const isNew =
      generation === "new" || (generation === "mixed" && seats.includes(Number(id.slice(1)) - 1))
    const bot = isNew ? current : baseline
    if (state.phase === "charleston")
      engine.passCharleston(id, bot.chooseHeuristicCharleston(state, id).cardIds)
    else if (state.phase === "exposing")
      engine.exposeCards(id, bot.chooseHeuristicExposure(state, id).cardIds)
    else if (state.phase === "discarding")
      engine.discard(id, bot.chooseHeuristicDiscard(state, id, 24))
    else {
      const action = bot.chooseHeuristicAction(
        state,
        id,
        24,
        isNew ? policy : baseline.DEFAULT_BOT_POLICY,
      ).action
      const eventCount = engine.events.length
      engine.act(id, action)
      if (
        action.type !== "fold" &&
        action.useRiichiStick &&
        engine.events.slice(eventCount).some((event) => event.type === "riichi-stick-spent")
      ) {
        counts[`${action.type}Stick` as "checkStick"]++
        if (
          action.type === "check" &&
          action.drawSource !== "deck" &&
          action.drawSource === action.riichiDrawSource
        )
          counts.twoStepDig++
        if (action.type === "check" && action.riichiBlankExchange) counts.blankChain++
      }
    }
  }
  counts.eliminations = engine.state.players.filter((p) => p.eliminated).length
  counts.street4 = reached.size
  counts.hands = engine.state.handResults.length
  for (const event of engine.events) {
    if (event.type === "blank-exchanged") counts.blanks++
    if (event.type === "riichi-declared") counts.riichies++
    if (event.type === "loan-taken") counts.loans++
    if (event.type === "player-all-in") counts.allIns++
    if (event.type === "player-eliminated") counts.eliminations++
  }
  const totalChips = engine.state.players.reduce((sum, p) => sum + p.chips, 0)
  const totalLoans = engine.state.players.reduce((sum, p) => sum + p.loans, 0)
  if (Math.abs(totalChips - (800 + 200 * totalLoans)) > 1e-7 || engine.state.players.some((p) => p.chips < 0))
    throw Error(`Chip invariant failed in ${prefix}:${index}: total=${totalChips}, loans=${totalLoans}, chips=${engine.state.players.map(p=>p.chips).join(",")}`)
  const spent = engine.events.filter((e) => e.type === "riichi-stick-spent").length
  const awarded = engine.events
    .filter((e) => e.type === "riichi-sticks-awarded")
    .reduce((sum, e) => sum + (e.payload as { amount: number }).amount, 0)
  if (
    engine.state.players.reduce((sum, p) => sum + p.riichiSticks, 0) !==
    (mode === "riichi" ? 12 : 0) - spent + awarded
  )
    throw Error("Stick invariant failed")
  const scores = engine.state.finalScores!
  const best = Math.max(...Object.values(scores))
  const winners = Object.keys(scores).filter((id) => scores[id] === best)
  const own = (id: string) => seats.includes(Number(id.slice(1)) - 1)
  const delta =
    Object.entries(scores).reduce((sum, [id, score]) => sum + (own(id) ? score : -score), 0) / 2
  const win = winners.filter(own).length / winners.length
  rows.push({
    index,
    cluster: generation === "mixed" ? Math.floor(index / 6) : index,
    delta,
    win,
    scores,
    ...counts,
  })
  if ((index + 1) % 6 === 0) process.stderr.write(`${mode} ${generation} ${index + 1}/${games}\n`)
}
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length
const clusters = Array.from(new Set(rows.map((r) => r.cluster))).map((c) =>
  rows.filter((r) => r.cluster === c),
)
const ci = (key: "win" | "delta") => {
  const values = clusters.map((rs) => mean(rs.map((r) => r[key])))
  const avg = mean(values)
  const se = Math.sqrt(
    values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1) / values.length,
  )
  return { mean: avg, lower: avg - 1.96 * se, upper: avg + 1.96 * se }
}
const totals = Object.fromEntries(
  [
    "checkStick",
    "twoStepDig",
    "blankChain",
    "callStick",
    "betStick",
    "blanks",
    "riichies",
    "loans",
    "street4",
    "hands",
    "allIns",
    "eliminations",
  ].map((key) => [key, rows.reduce((s, r) => s + Number(r[key as keyof typeof r]), 0)]),
)
const report = {
  mode,
  generation,
  games,
  samples: 24,
  prefix,
  independentSeeds: clusters.length,
  sourceHashes,
  policy,
  win: ci("win"),
  delta: ci("delta"),
  totals,
  rows,
}
writeFileSync(output, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ ...report, rows: undefined }, null, 2))
