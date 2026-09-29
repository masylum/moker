import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { parseArgs } from "node:util"
import { compareHandStrengths } from "../src/game/scoring"
import { lotusCount, legacyDeck } from "./legacy/cards"
import { evaluateLegacy, LEGACY_LADDER, type LegacyKind } from "./legacy/scoring"
import { DeckExhausted, LegacyEngine } from "./legacy/engine"
import { stepLegacy, type TreasureOpportunity } from "./legacy/bots"

const { values } = parseArgs({
  options: {
    games: { type: "string", default: "100" },
    players: { type: "string", default: "4" },
    orbits: { type: "string", default: "2" },
    samples: { type: "string", default: "24" },
    checkdown: { type: "boolean", default: false },
    "disable-treasures": { type: "boolean", default: false },
    seed: { type: "string", default: "legacy-v2" },
    offset: { type: "string", default: "0" },
    output: { type: "string" },
    "tournament-games": { type: "string", default: "1" },
  },
})
const games = Number(values.games),
  players = Number(values.players),
  orbits = Number(values.orbits),
  samples = Number(values.samples),
  offset = Number(values.offset)
const tournamentGames = Number(values["tournament-games"]) as 1 | 2 | 3 | 4
if (
  ![games, players, orbits, samples, offset, tournamentGames].every(Number.isInteger) ||
  games < 1 ||
  players < 2 ||
  players > 6 ||
  orbits < 1 ||
  orbits > 4 ||
  samples < 1 ||
  offset < 0 ||
  ![1, 2, 3, 4].includes(tournamentGames)
)
  throw new Error("Invalid simulation options")
const started = performance.now(),
  results = []
const byId = new Map(legacyDeck().map((c) => [c.id, c]))
const emptyRows = () =>
  Object.fromEntries(LEGACY_LADDER.map((kind) => [kind, { contains: 0, best: 0, wins: 0 }]))

for (let i = offset; i < offset + games; i++) {
  const engine = LegacyEngine.createLegacy({
    seed: `${values.seed}:${i}`,
    players,
    orbits,
    games: tournamentGames,
    checkdown: values.checkdown,
    treasures: !values["disable-treasures"],
  })
  const opportunities: TreasureOpportunity[] = []
  const charleston = { hands: 0, loneLotus: 0, rows: emptyRows() }
  let steps = 0,
    failure: string | null = null
  try {
    while (engine.state.phase !== "finished") {
      if (++steps > 10_000) throw new Error("Step limit exceeded")
      const phase = engine.state.phase
      stepLegacy(engine, samples, opportunities)
      if (phase === "charleston" && engine.state.phase === "betting") {
        for (const player of engine.state.players.filter((p) => !p.folded && !p.eliminated)) {
          const hand = [...player.privateCards, ...player.publicCards],
            contains = new Set<LegacyKind>()
          const score = evaluateLegacy(hand, contains)
          charleston.hands++
          if (lotusCount(hand) === 1) charleston.loneLotus++
          charleston.rows[score.kind].best++
          for (const kind of contains) charleston.rows[kind].contains++
        }
      }
    }
  } catch (error) {
    if (!(error instanceof DeckExhausted)) throw error
    failure = error.message
  }
  const rows = emptyRows(),
    rounds = engine.state.handResults
  let showdownHands = 0,
    loneLotus = 0
  for (const round of rounds.filter((r) => r.reason === "showdown")) {
    for (const player of round.players.filter((p) => !p.folded && !p.eliminated)) {
      const contains = new Set<LegacyKind>(),
        score = evaluateLegacy(player.cards, contains)
      rows[score.kind].best++
      showdownHands++
      if (lotusCount(player.cards) === 1) loneLotus++
      for (const kind of contains) rows[kind].contains++
      if (round.winnerIds.includes(player.playerId))
        rows[score.kind].wins += 1 / round.winnerIds.length
    }
  }
  const searches = engine.searches.map((search) => ({
    street: search.street,
    actor: search.actor,
    target: search.target,
    offers: search.offered.length,
    self: search.actor === search.target,
    improved:
      compareHandStrengths(
        evaluateLegacy(search.after.map((id) => byId.get(id)!)),
        evaluateLegacy(search.before.map((id) => byId.get(id)!)),
      ) > 0,
    before: evaluateLegacy(search.before.map((id) => byId.get(id)!)).kind,
    after: evaluateLegacy(search.after.map((id) => byId.get(id)!)).kind,
  }))
  results.push({
    index: i,
    seed: engine.state.config.seed,
    finished: engine.state.phase === "finished",
    failure,
    steps,
    rounds: rounds.length,
    showdown: rounds.filter((r) => r.reason === "showdown").length,
    showdownHands,
    loneLotus,
    allInRounds: rounds.filter((r) => r.allInPlayerIds.length).length,
    street4Rounds: rounds.filter((r) => r.bettingHistory.some((b) => b.street === 4)).length,
    drawCounts: engine.drawCounts,
    scores: engine.state.finalScores,
    ranks: rows,
    charleston,
    deckSizes: engine.deckSizes,
    fallbacks: engine.fallbacks,
    searches,
    opportunities: opportunities.length,
    byStreet: [1, 2, 3, 4].map((street) => ({
      street,
      opportunities: opportunities.filter((o) => o.street === street).length,
      chosen: opportunities.filter((o) => o.street === street && o.chosen === "treasure").length,
    })),
    examples: engine.searches.slice(0, 3),
    riichi: rounds.filter((r) => r.riichiSettlement.declaredPlayerId).length,
    finalCollectionSizes: engine.state.players.map(
      (p, seat) =>
        engine.decks[seat].length +
        engine.lanes[seat].length +
        (engine.state.foldedPrivateCards[p.id] ?? p.privateCards).length +
        p.publicCards.length,
    ),
  })
  if ((i - offset + 1) % 10 === 0 || i === offset + games - 1)
    console.log(
      `${players} players, search=${!values["disable-treasures"]}: ${i - offset + 1}/${games}; ${((performance.now() - started) / 1000).toFixed(1)}s`,
    )
}
const output = {
  version: 2,
  options: values,
  results,
  seconds: (performance.now() - started) / 1000,
}
if (values.output) {
  mkdirSync(dirname(values.output), { recursive: true })
  writeFileSync(values.output, JSON.stringify(output, null, 2) + "\n")
} else console.log(JSON.stringify(output, null, 2))
