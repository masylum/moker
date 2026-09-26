/** Ten-game diagnostic replay: inspect Dragon opportunities without changing decisions. */
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { cardLabel } from "../src/game/cards"
import { GameEngine } from "../src/game/engine"
import { stepHeuristic } from "../src/game/automation"
import { generateHandCandidates } from "../src/game/melds"
import { scoreHand } from "../src/game/scoring"
import type { Card, SimulationResult } from "../src/game/types"

const colors = ["red", "green", "blue"] as const
const hasDragons = (cards: readonly Card[]) =>
  colors.every((color) =>
    cards.some((c) => (c.kind === "dragon" || c.kind === "joker") && c.color === color),
  )
const twoNatural = (cards: readonly Card[]) =>
  new Set(cards.filter((c) => c.kind === "dragon").map((c) => c.color)).size === 2 &&
  !hasDragons(cards)
const out = "docs/dragons-audit-2026-09-25"
mkdirSync(out, { recursive: true })
const logs = []
const summaries = []
for (let index = 0; index < 10; index++) {
  const seed = `sticks-20260925-continuous-riichi-${index}`
  const engine = GameEngine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    { seed, mode: "riichi", orbits: 4, heuristicSamples: 24 },
  )
  let steps = 0
  while (engine.state.phase !== "finished") {
    if (++steps > 20_000) throw new Error("Replay safety limit")
    const state = engine.state
    const player = state.players.find((p) => p.id === state.actingPlayerId)
    const cards = player ? [...player.privateCards, ...player.publicCards] : []
    if (
      player &&
      twoNatural(cards) &&
      (state.phase === "betting" || state.phase === "charleston")
    ) {
      const missing = colors.find(
        (color) =>
          !cards.some((c) => (c.kind === "dragon" || c.kind === "joker") && c.color === color),
      )!
      const completes = (c: Card) =>
        (c.kind === "dragon" || c.kind === "joker") && c.color === missing
      const before = {
        seed,
        hand: state.handNumber,
        street: state.street,
        phase: state.phase,
        player: player.id,
        cards: cards.map(cardLabel),
        privateIds: player.privateCards.map((c) => c.id),
        beforeKind: scoreHand(cards).combinations[0]?.kind ?? "high-card",
        missing,
        chips: player.chips,
        pot: state.pot,
        toCall: Math.max(0, state.currentWager - player.roundCommitted),
        locked: player.riichi || state.allInPlayerIds.length > 0,
        sticks: player.riichiSticks,
        topSources: [state.discardA, state.discardB].flatMap((lane, i) =>
          lane.length && completes(lane.at(-1)!) ? [i === 0 ? "discard-a" : "discard-b"] : [],
        ),
        blankAvailable: player.privateCards.some((c) => c.kind === "blank"),
        laneTargets: [state.discardA, state.discardB].flatMap((lane, i) =>
          lane.flatMap((c, depth) =>
            completes(c) ? [{ pile: i === 0 ? "a" : "b", index: depth, label: cardLabel(c) }] : [],
          ),
        ),
        lanes: [state.discardA.map(cardLabel), state.discardB.map(cardLabel)],
      }
      const step = stepHeuristic(engine)
      while (engine.state.phase === "discarding") stepHeuristic(engine)
      const after = [...player.privateCards, ...player.publicCards]
      logs.push({
        ...before,
        action: step.decision?.action,
        rationale: step.rationale,
        evaluations: step.decision?.evaluations,
        passedIds: step.charlestonCardIds,
        charlestonKeptCards: step.charlestonCardIds
          ? before.cards.filter((_, i) => !step.charlestonCardIds!.includes(before.privateIds[i]!))
          : undefined,
        afterCards: after.map(cardLabel),
        completed: hasDragons(after),
        retainsTwo: twoNatural(after),
        afterKind: scoreHand(after).combinations[0]?.kind ?? "high-card",
      })
    } else stepHeuristic(engine)
  }
  const hands = engine.state.handResults
  let oracleChecks = 0
  for (const h of hands)
    for (const p of h.players) {
      for (const cards of [p.openingCards, p.cards]) {
        if (
          hasDragons(cards) !==
          generateHandCandidates(cards).some((c) => c.kind === "three-dragons")
        )
          throw new Error("Dragon oracle mismatch")
        oracleChecks++
      }
    }
  const summary = {
    seed,
    hands: hands.length,
    oracleChecks,
    handsWithDragons: hands.filter((h) => h.players.some((p) => hasDragons(p.cards))).length,
    playersWithDragons: hands.flatMap((h) => h.players).filter((p) => hasDragons(p.cards)).length,
    handsWithPung: hands.filter((h) =>
      h.players.some((p) => generateHandCandidates(p.cards).some((c) => c.kind === "pung")),
    ).length,
    scores: engine.state.finalScores,
  }
  summaries.push(summary)
  if (index === 0) {
    const result: SimulationResult = {
      seed,
      state: engine.state,
      events: engine.events,
      decisions: [],
    }
    writeFileSync(join(out, "sample-game.json"), JSON.stringify(result))
  }
  console.log(JSON.stringify(summary))
}
writeFileSync(join(out, "opportunities.json"), JSON.stringify(logs, null, 2))
writeFileSync(join(out, "replays.json"), JSON.stringify(summaries, null, 2))
