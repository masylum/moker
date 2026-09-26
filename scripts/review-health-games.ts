import { readFileSync, writeFileSync } from "node:fs"
import { isDeepStrictEqual } from "node:util"
import { join } from "node:path"
import { GameEngine } from "../src/game/engine"
import {
  chooseHeuristicCharleston,
  chooseHeuristicDiscard,
  chooseHeuristicExposure,
} from "../src/game/heuristic"
import { scoreHand } from "../src/game/scoring"
import type { SimulationResult } from "../src/game/types"

const root = process.argv[2] ?? "docs/health-v6-2026-09-25"
const audits = []
for (const mode of ["basic", "riichi"] as const) {
  for (let index = 0; index < 5; index++) {
    const saved = JSON.parse(
      readFileSync(join(root, "logs", mode, `${index}.json`), "utf8"),
    ) as SimulationResult
    const engine = GameEngine.create(
      saved.state.players.map(({ id, name, controller }) => ({ id, name, controller })),
      saved.state.config,
    )
    let next = 0
    const decisions = []
    while (engine.state.phase !== "finished") {
      const s = engine.state,
        id = s.actingPlayerId!
      if (s.phase === "between-hands") {
        engine.startNextHand()
        continue
      }
      if (s.phase === "charleston") {
        engine.passCharleston(id, chooseHeuristicCharleston(s, id).cardIds)
        continue
      }
      if (s.phase === "exposing") {
        engine.exposeCards(id, chooseHeuristicExposure(s, id).cardIds)
        continue
      }
      if (s.phase === "discarding") {
        engine.discard(id, chooseHeuristicDiscard(s, id, 24))
        continue
      }
      const decision = saved.decisions[next++]!
      if (decision.playerId !== id || decision.street !== s.street)
        throw new Error(`Replay mismatch ${saved.seed}`)
      const p = s.players.find((x) => x.id === id)!
      const cards = [...p.privateCards, ...p.publicCards]
      const start = engine.events.length
      const context = {
        game: s.gameNumber,
        hand: s.handNumber,
        orbit: s.orbit,
        street: s.street,
        id,
        chips: p.chips,
        loans: p.loans,
        sticks: p.riichiSticks,
        pot: s.pot,
        costToCall: Math.min(p.chips, Math.max(0, s.currentWager - p.roundCommitted)),
        score: scoreHand(cards, mode),
        cards: cards.map((c) => c.id),
        standings: Object.fromEntries(s.players.map((x) => [x.id, x.chips - 250 * x.loans])),
        action: decision.action,
        rationale: decision.rationale,
        evaluations: decision.evaluations.slice(0, 3),
      }
      engine.act(id, decision.action)
      decisions.push({
        ...context,
        allIn: engine.events.slice(start).some((e) => e.type === "player-all-in"),
        paidStick: engine.events.slice(start).some((e) => e.type === "riichi-stick-spent"),
      })
    }
    if (
      next !== saved.decisions.length ||
      !isDeepStrictEqual(JSON.parse(JSON.stringify(engine.state)), saved.state) ||
      !isDeepStrictEqual(JSON.parse(JSON.stringify(engine.events)), saved.events)
    )
      throw new Error(`Final replay mismatch ${saved.seed}`)
    const audit = {
      mode,
      index,
      seed: saved.seed,
      scores: saved.state.finalScores,
      decisions,
      hands: saved.state.handResults.map((h) => ({
        number: h.handNumber,
        orbit: h.orbit,
        pot: h.pot,
        winners: h.winnerIds,
        reason: h.reason,
        allIn: h.allInPlayerIds,
        endingStreet: Math.max(0, ...h.bettingHistory.map((a) => a.street)),
        riichi: h.riichiSettlement,
        players: h.players.map((p) => ({
          id: p.playerId,
          folded: p.folded,
          cards: p.cards.map((c) => c.id),
          score: p.score.total,
          chips: p.chips,
          loans: p.loans,
          sticks: p.riichiSticks,
        })),
      })),
    }
    audits.push(audit)
    const lines = [
      `# ${saved.seed}`,
      "",
      `Exact state and event replay verified. Final scores: ${JSON.stringify(audit.scores)}`,
      "",
    ]
    for (const h of audit.hands) {
      lines.push(
        `## Hand ${h.number} · orbit ${h.orbit}`,
        "",
        `Pot ${h.pot}; ${h.reason}; winners ${h.winners.join(", ")}; all-in ${h.allIn.join(", ") || "none"}.`,
        "",
        "| Player / street | Chips / pot | Hand | Action | Rationale |",
        "|---|---|---|---|---|",
      )
      for (const d of decisions.filter((x) => x.hand === h.number))
        lines.push(
          `| ${d.id} / ${d.street} | ${d.chips} / ${d.pot} | ${d.score.combinations[0]?.label ?? "High Card"} | ${JSON.stringify(d.action)} | ${d.rationale} |`,
        )
      lines.push("")
    }
    writeFileSync(join(root, "logs", mode, `${index}.md`), lines.join("\n"))
  }
}
writeFileSync(join(root, "audits.json"), JSON.stringify(audits, null, 2) + "\n")
console.log(`Verified ${audits.length} full game replays.`)
