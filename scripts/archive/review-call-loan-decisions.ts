import { readFileSync, writeFileSync } from "node:fs"
import { GameEngine } from "../../docs/call-loan-update-2026-09-25/previous/src/game/engine"
import * as previous from "../../docs/call-loan-update-2026-09-25/previous/src/game/heuristic"
import { chooseHeuristicAction } from "../../src/game/heuristic"
import type { GameState } from "../../src/game/types"

const reviews = []
for (const gameIndex of [0, 1, 4]) {
  const log = JSON.parse(
    readFileSync(
      `docs/tournament-bots-2026-09-25/logs/selected-riichi.json.logs/${gameIndex}.json`,
      "utf8",
    ),
  )
  const engine = GameEngine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    { mode: "riichi", seed: log.seed, orbits: 4, heuristicSamples: 24 },
  )
  let index = 0
  while (engine.state.phase !== "finished") {
    const s = engine.state,
      id = s.actingPlayerId!
    if (s.phase === "between-hands") {
      engine.startNextHand()
      continue
    }
    if (s.phase === "charleston")
      engine.passCharleston(id, previous.chooseHeuristicCharleston(s, id).cardIds)
    else if (s.phase === "exposing")
      engine.exposeCards(id, previous.chooseHeuristicExposure(s, id).cardIds)
    else if (s.phase === "discarding")
      engine.discard(id, previous.chooseHeuristicDiscard(s, id, 24))
    else {
      const old = log.decisions[index++]
      const p = s.players.find((player) => player.id === id)!
      if (
        old.id !== id ||
        old.hand !== s.handNumber ||
        old.pot !== s.pot ||
        old.chips !== p.chips ||
        JSON.stringify(old.cards.map((c: { id: string }) => c.id).sort()) !==
          JSON.stringify([...p.privateCards, ...p.publicCards].map((c) => c.id).sort())
      )
        throw Error(`Replay mismatch ${gameIndex}/${s.handNumber}/${id}`)
      if (
        (gameIndex === 0 && s.handNumber === 7 && id === "p4") ||
        (gameIndex === 0 && s.handNumber === 9 && id === "p4" && s.street === 2) ||
        (gameIndex === 1 && s.handNumber === 8 && id === "p1") ||
        (gameIndex === 4 && s.handNumber === 12 && id === "p4")
      ) {
        const reachable = s.players.every((player) => player.loans <= 1 && !player.eliminated)
        const state = { ...structuredClone(s), rulesVersion: 6 } as GameState
        if (gameIndex === 4 && s.handNumber === 12 && id === "p4" && p.chips === 140)
          writeFileSync("/tmp/call-loan-snapshot.json", JSON.stringify(state))
        const revised = reachable ? chooseHeuristicAction(state, id, 24) : undefined
        reviews.push({
          game: gameIndex,
          hand: s.handNumber,
          street: s.street,
          player: id,
          chips: p.chips,
          pot: s.pot,
          old: { action: old.action, rationale: old.rationale, evaluations: old.evaluations },
          revised,
          reachableUnderLoanCap: reachable,
        })
      }
      engine.act(id, old.action)
    }
  }
  if (index !== log.decisions.length) throw Error("Missing decisions")
}
writeFileSync(
  "docs/call-loan-update-2026-09-25/decision-reviews.json",
  JSON.stringify(reviews, null, 2),
)
console.log(
  reviews.map((x) => ({
    game: x.game,
    hand: x.hand,
    street: x.street,
    player: x.player,
    chips: x.chips,
    old: x.old.rationale,
    new: x.revised?.rationale,
    action: x.revised?.action,
    reachable: x.reachableUnderLoanCap,
  })),
)
