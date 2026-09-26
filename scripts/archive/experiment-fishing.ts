import { orbitHistory } from "./fishing-orbits"
import { createHash } from "node:crypto"
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { GameEngine as CurrentEngine } from "../../docs/fishing-experiment-2026-09-25/current/src/game/engine"
import { GameEngine as ProposedEngine } from "../../docs/fishing-experiment-2026-09-25/proposed/src/game/engine"
import * as currentBot from "../../docs/fishing-experiment-2026-09-25/current/src/game/heuristic"
import * as proposedBot from "../../docs/fishing-experiment-2026-09-25/proposed/src/game/heuristic"
import {
  scoreHandStrength,
  compareHandStrengths,
} from "../../docs/fishing-experiment-2026-09-25/current/src/game/scoring"
import type { Card } from "../../src/game/types"

const arg = (key: string, fallback: string) =>
  process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1]! : fallback
const mode = arg("--mode", "basic") as "basic" | "riichi"
const variant = arg("--variant", "proposed")
const orbits = Number(arg("--orbits", mode === "basic" ? "4" : "1"))
const games = Number(arg("--games", "100")),
  offset = Number(arg("--offset", "0"))
const prefix = arg("--seed", "fishing-holdout-20260925"),
  output = arg("--output", "/tmp/fishing.json")
if (
  !["basic", "riichi"].includes(mode) ||
  ![1, 2, 3, 4].includes(orbits) ||
  !["current", "proposed", "unadapted"].includes(variant) ||
  !Number.isInteger(games) ||
  games < 1 ||
  !Number.isInteger(offset) ||
  offset < 0
)
  throw Error("Invalid batch arguments")
const Engine = variant === "current" ? CurrentEngine : ProposedEngine
const bot = variant === "proposed" ? proposedBot : currentBot
const snapshot = `docs/fishing-experiment-2026-09-25/${variant === "current" ? "current" : "proposed"}/src/game`
const sourceHashes = Object.fromEntries(
  readdirSync(snapshot)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => [
      f,
      createHash("sha256")
        .update(readFileSync(`${snapshot}/${f}`))
        .digest("hex"),
    ]),
)
const strength = (cards: Card[]) => {
  const flowers = cards.filter((c) => c.kind === "flower").length
  return flowers === 2
    ? { total: 13, tieBreak: [] }
    : flowers === 1
      ? { total: -1, tieBreak: [] }
      : scoreHandStrength(cards, mode)
}
const rows = []
writeFileSync(`${output}.jsonl`, "")
for (let index = offset; index < offset + games; index++) {
  const engine = Engine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    {
      mode,
      seed: `${prefix}:${mode}:${index}`,
      orbits,
      startingChips: 200,
      heuristicSamples: 24,
    },
  )
  const counts = {
    hands: 0,
    street4: 0,
    showdowns: 0,
    street1Ends: 0,
    street0Ends: 0,
    uncontested: 0,
    allInHands: 0,
    actions: 0,
    checks: 0,
    calls: 0,
    bets: 0,
    folds: 0,
    facingWager: 0,
    foldToWager: 0,
    draws: 0,
    deckDraws: 0,
    laneDraws: 0,
    blanks: 0,
    freeCheck: 0,
    freeCall: 0,
    freeBet: 0,
    stickCheck: 0,
    stickCall: 0,
    stickBet: 0,
    sticksSpent: 0,
    sticksAwarded: 0,
    loans: 0,
    laneOccupancy: 0,
    laneObservations: 0,
    showdownPlayers: 0,
    improvedShowdownPlayers: 0,
    openingLeaderWinCredit: 0,
    showdownRankSum: 0,
    decisions: 0,
    decisionsMs: 0,
    eliminations: 0,
    negativeFinishes: 0,
    minDeck: 1000,
  }
  const reached = new Set<number>(),
    openings = new Map<
      number,
      { leaders: string[]; ranks: Record<string, ReturnType<typeof strength>> }
    >()
  const showdownRanks: Record<string, number> = {}
  let steps = 0
  while (engine.state.phase !== "finished") {
    if (++steps > 20000) throw Error(`Step limit ${variant} ${mode} ${index}`)
    const state = engine.state
    counts.minDeck = Math.min(counts.minDeck, state.deck.length)
    if (state.street === 4) reached.add(state.handNumber)
    if (state.phase === "between-hands") {
      engine.startNextHand()
      continue
    }
    const id = state.actingPlayerId!,
      beforeEvents = engine.events.length
    if (state.phase === "betting") {
      if (!openings.has(state.handNumber)) {
        const ranks = Object.fromEntries(
          state.players
            .filter((p) => !p.eliminated)
            .map((p) => [p.id, strength([...p.privateCards, ...p.publicCards])]),
        )
        const best = Object.values(ranks).sort((a, b) => compareHandStrengths(b, a))[0]!
        openings.set(state.handNumber, {
          ranks,
          leaders: Object.keys(ranks).filter(
            (candidateId) => compareHandStrengths(ranks[candidateId]!, best) === 0,
          ),
        })
      }
      const player = state.players.find((p) => p.id === id)!,
        facing = state.currentWager > player.roundCommitted
      counts.laneOccupancy += state.discardA.length + state.discardB.length
      counts.laneObservations++
      counts.facingWager += Number(facing)
      const start = performance.now(),
        decision = bot.chooseHeuristicAction(state, id, 24)
      counts.decisionsMs += performance.now() - start
      counts.decisions++
      const action = decision.action
      counts.actions++
      counts[`${action.type}s` as "checks"]++
      counts.foldToWager += Number(facing && action.type === "fold")
      engine.act(id, action)
      const events = engine.events.slice(beforeEvents)
      const paid = events.some((e) => e.type === "riichi-stick-spent")
      if (action.type !== "fold" && paid)
        counts[`stick${action.type[0]!.toUpperCase() + action.type.slice(1)}` as "stickCheck"]++
      const startsDraw = events.some((e) => e.type === "card-drawn" || e.type === "blank-exchanged")
      const free =
        variant === "current" ? action.type === "check" : mode === "basic" || action.type !== "bet"
      if (action.type !== "fold" && startsDraw && free)
        counts[`free${action.type[0]!.toUpperCase() + action.type.slice(1)}` as "freeCheck"]++
    } else if (state.phase === "charleston")
      engine.passCharleston(id, bot.chooseHeuristicCharleston(state, id).cardIds)
    else if (state.phase === "exposing")
      engine.exposeCards(id, bot.chooseHeuristicExposure(state, id).cardIds)
    else if (state.phase === "discarding")
      engine.discard(id, bot.chooseHeuristicDiscard(state, id, 24))
    for (const event of engine.events.slice(beforeEvents)) {
      if (event.type === "card-drawn") {
        counts.draws++
        if ((event.payload as { source: string }).source === "deck") counts.deckDraws++
        else counts.laneDraws++
      }
      if (event.type === "blank-exchanged") {
        counts.draws++
        counts.blanks++
        counts.laneDraws++
      }
      if (event.type === "loan-taken") counts.loans++
      if (event.type === "riichi-stick-spent") counts.sticksSpent++
      if (event.type === "riichi-sticks-awarded")
        counts.sticksAwarded += (event.payload as { amount: number }).amount
    }
  }
  for (const hand of engine.state.handResults) {
    counts.hands++
    counts.showdowns += Number(hand.reason === "showdown")
    counts.uncontested += Number(hand.reason === "uncontested")
    counts.allInHands += Number(hand.allInPlayerIds.length > 0)
    counts.street0Ends += Number(hand.bettingHistory.length === 0)
    counts.street1Ends += Number(Math.max(...hand.bettingHistory.map((b) => b.street)) === 1)
    const ranks = Object.fromEntries(
      hand.players
        .filter((p) => p.openingCards.length > 0)
        .map((p) => [p.playerId, strength(p.openingCards)]),
    )
    const best = Object.values(ranks).sort((a, b) => compareHandStrengths(b, a))[0]!
    const opening = openings.get(hand.handNumber) ?? {
      ranks,
      leaders: Object.keys(ranks).filter(
        (candidateId) => compareHandStrengths(ranks[candidateId]!, best) === 0,
      ),
    }
    counts.openingLeaderWinCredit +=
      hand.winnerIds.filter((id) => opening.leaders.includes(id)).length / hand.winnerIds.length
    if (hand.reason === "showdown")
      for (const player of hand.players.filter(
        (p) => !p.folded && Boolean(opening.ranks[p.playerId]),
      )) {
        const final = strength(player.cards),
          initial = opening.ranks[player.playerId]!
        counts.showdownPlayers++
        counts.showdownRankSum += final.total
        counts.improvedShowdownPlayers += Number(compareHandStrengths(final, initial) > 0)
        showdownRanks[String(final.total)] = (showdownRanks[String(final.total)] ?? 0) + 1
      }
  }
  counts.street4 = reached.size
  counts.eliminations = engine.state.players.filter((p) => p.eliminated).length
  counts.negativeFinishes = Object.values(engine.state.finalScores!).filter((s) => s < 0).length
  // Loans can be issued while starting a hand, outside the action event window.
  counts.loans = engine.state.players.reduce((sum, p) => sum + p.loans, 0)
  const cash = engine.state.players.reduce((sum, p) => sum + p.chips, 0)
  if (Math.abs(cash - (800 + counts.loans * 200)) > 1e-7)
    throw Error(`Cash conservation failed: ${index}`)
  const sticks = engine.state.players.reduce((sum, p) => sum + p.riichiSticks, 0)
  if (sticks !== (mode === "riichi" ? 12 : 0) + counts.sticksAwarded - counts.sticksSpent)
    throw Error(`Stick conservation failed: ${index}`)
  rows.push({
    index,
    ...counts,
    scores: engine.state.finalScores,
    showdownRanks,
    orbits: orbitHistory(
      engine.state.handResults,
      Object.fromEntries(engine.state.players.map((p) => [p.id, 200])),
    ),
  })
  appendFileSync(`${output}.jsonl`, JSON.stringify(rows.at(-1)) + "\n")
  if ((index - offset + 1) % 25 === 0)
    console.error(`${variant} ${mode} ${index - offset + 1}/${games}`)
}
writeFileSync(
  output,
  JSON.stringify(
    {
      mode,
      variant,
      games,
      offset,
      prefix,
      samples: 24,
      orbits,
      startingChips: 200,
      sourceHashes,
      rows,
    },
    null,
    2,
  ) + "\n",
)
console.log(JSON.stringify({ mode, variant, games, output }))
