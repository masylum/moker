import { appendFileSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs"
import { createHash } from "node:crypto"
import { GameEngine } from "../../src/game/engine"
import * as candidate from "../../src/game/heuristic"
import * as baseline from "../../docs/tournament-bots-2026-09-25/baseline/src/game/heuristic"
import { orbitHistory } from "./fishing-orbits"
import { publicKnownPrivateCards } from "../../src/game/information"
const arg = (key: string, fallback: string) =>
  process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1]! : fallback
const games = Number(arg("--games", "6")),
  offset = Number(arg("--offset", "0")),
  mode = arg("--mode", "basic") as "basic" | "riichi",
  generation = arg("--generation", "mixed"),
  prefix = arg("--seed", "tournament-tuning-v1"),
  output = arg("--output", "/tmp/tournament-bots.json"),
  logging = process.argv.includes("--logs")
const policy = { ...candidate.defaultBotPolicy(mode), ...JSON.parse(arg("--policy", "{}")) }
const pairs = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
]
if (
  !["basic", "riichi"].includes(mode) ||
  !["mixed", "old", "new"].includes(generation) ||
  !Number.isInteger(games) ||
  games < 1 ||
  offset < 0 ||
  (generation === "mixed" && (games % 6 || offset % 6))
)
  throw Error("Invalid cohort")
const hashes = Object.fromEntries(
  readdirSync("src/game")
    .filter((f) => f.endsWith(".ts"))
    .map((f) => [
      f,
      createHash("sha256")
        .update(readFileSync(`src/game/${f}`))
        .digest("hex"),
    ]),
)
const rows = []
writeFileSync(output + ".jsonl", "")
for (let index = offset; index < offset + games; index++) {
  const seats = pairs[index % 6]!,
    seed = `${prefix}:${mode}:${generation === "mixed" ? Math.floor(index / 6) : index}`
  const engine = GameEngine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    { mode, seed, orbits: 4, heuristicSamples: 24, startingChips: 200 },
  )
  const decisions: unknown[] = []
  let steps = 0
  const reached = new Set<number>()
  const triggers: unknown[] = []
  while (engine.state.phase !== "finished") {
    if (++steps > 20000) throw Error("Step limit")
    const s = engine.state
    if (s.street === 4) reached.add(s.handNumber)
    if (s.phase === "between-hands") {
      engine.startNextHand()
      continue
    }
    const id = s.actingPlayerId!,
      p = s.players.find((q) => q.id === id)!,
      own =
        generation === "new" || (generation === "mixed" && seats.includes(Number(id.slice(1)) - 1)),
      bot = own ? candidate : baseline
    if (s.phase === "charleston")
      engine.passCharleston(id, bot.chooseHeuristicCharleston(s, id).cardIds)
    else if (s.phase === "exposing")
      engine.exposeCards(id, bot.chooseHeuristicExposure(s, id).cardIds)
    else if (s.phase === "discarding") engine.discard(id, bot.chooseHeuristicDiscard(s, id, 24))
    else {
      const decision = bot.chooseHeuristicAction(
        s,
        id,
        24,
        own ? policy : baseline.defaultBotPolicy(mode),
      )
      const context = {
        hand: s.handNumber,
        orbit: s.orbit,
        id,
        own,
        pot: s.pot,
        wager: s.currentWager,
        committed: p.roundCommitted,
        chips: p.chips,
        loans: p.loans,
        sticks: p.riichiSticks,
        allInBefore: [...s.allInPlayerIds],
        stacks: s.players.map((q) => ({
          id: q.id,
          chips: q.chips,
          loans: q.loans,
          folded: q.folded,
          committed: q.roundCommitted,
        })),
        cards: [...p.privateCards, ...p.publicCards],
        ...(logging
          ? {
              knownOpponentCards: publicKnownPrivateCards(s, id),
              publicCards: Object.fromEntries(s.players.map((q) => [q.id, q.publicCards])),
            }
          : {}),
        lanes: [s.discardA, s.discardB],
        ...decision,
      }
      if (logging) decisions.push(structuredClone(context))
      const n = engine.events.length
      engine.act(id, decision.action)
      if (engine.events.slice(n).some((e) => e.type === "player-all-in"))
        triggers.push(structuredClone(context))
    }
  }
  const s = engine.state,
    scores = s.finalScores!,
    winners = Object.keys(scores).filter((id) => scores[id] === Math.max(...Object.values(scores))),
    isNew = (id: string) => seats.includes(Number(id.slice(1)) - 1)
  const events = engine.events,
    count = (type: string) => events.filter((e) => e.type === type).length
  const loans = s.players.reduce((a, p) => a + p.loans, 0)
  if (
    Math.abs(s.players.reduce((a, p) => a + p.chips, 0) - (800 + 200 * loans)) > 1e-7 ||
    s.players.some((p) => p.chips < 0)
  )
    throw Error("Chip conservation")
  const awarded = events
    .filter((e) => e.type === "riichi-sticks-awarded")
    .reduce((a, e) => a + (e.payload as { amount: number }).amount, 0)
  if (
    s.players.reduce((a, p) => a + p.riichiSticks, 0) !==
    (mode === "riichi" ? 12 : 0) + awarded - count("riichi-stick-spent")
  )
    throw Error("Stick conservation")
  const firstAllIns = new Map<number, (typeof events)[number]>()
  for (const event of events)
    if (event.type === "player-all-in" && !firstAllIns.has(event.handNumber))
      firstAllIns.set(event.handNumber, event)
  const allInInitiators = { bet: 0, call: 0, ante: 0 }
  for (const event of firstAllIns.values()) {
    const reason = (event.payload as { reason?: string }).reason
    if (reason === "opening-charge") allInInitiators.ante++
    else {
      const trigger = triggers.find((raw) => {
        const t = raw as { hand: number; id: string }
        return t.hand === event.handNumber && t.id === event.actorId
      }) as { action: { type: "bet" | "call" } } | undefined
      if (trigger) allInInitiators[trigger.action.type]++
    }
  }
  const betting = s.handResults.flatMap((h) => h.bettingHistory)
  const row = {
    index,
    seed,
    cluster: generation === "mixed" ? Math.floor(index / 6) : index,
    seats,
    scores,
    win: winners.filter(isNew).length / winners.length,
    delta: Object.entries(scores).reduce((a, [id, v]) => a + (isNew(id) ? v : -v), 0) / 2,
    hands: s.handResults.length,
    street4: reached.size,
    allInHands: s.handResults.filter((h) => h.allInPlayerIds.length).length,
    eliminated: s.players.filter((p) => p.eliminated).length,
    loans,
    draws: count("card-drawn") + count("blank-exchanged"),
    allInInitiators,
    actions: betting.length,
    bets: betting.filter((b) => b.type === "bet").length,
    folds: betting.filter((b) => b.type === "fold").length,
    uncontested: s.handResults.filter((h) => h.reason === "uncontested").length,
    negativeFinishes: Object.values(scores).filter((v) => v < 0).length,
    blanks: count("blank-exchanged"),
    sticks: count("riichi-stick-spent"),
    riichies: count("riichi-declared"),
    orbits: orbitHistory(s.handResults, { p1: 200, p2: 200, p3: 200, p4: 200 }),
    allInTriggers: triggers,
  }
  rows.push(row)
  appendFileSync(output + ".jsonl", JSON.stringify(row) + "\n")
  if (logging) {
    mkdirSync(output + ".logs", { recursive: true })
    writeFileSync(
      `${output}.logs/${index}.json`,
      JSON.stringify(
        { seed, mode, generation, decisions, hands: s.handResults, events, scores },
        null,
        2,
      ),
    )
  }
  process.stderr.write(`${mode} ${generation} ${index + 1 - offset}/${games}\n`)
}
writeFileSync(
  output,
  JSON.stringify({
    mode,
    generation,
    games,
    offset,
    prefix,
    samples: 24,
    orbits: 4,
    policy,
    hashes,
    rows,
  }),
)
