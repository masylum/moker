/** Experimental rules live only in disposable simulator snapshots. */
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { BettingAction } from "../../src/game/types"

export interface LotusObservation {
  game: number
  hand: number
  street: number
  player: string
  lotuses: number
  concealed: boolean
  locked: boolean
  action: BettingAction
}

export function applyRuleVariants(
  directory: string,
  longChow: boolean,
  scaledLotus: boolean,
): void {
  const replace = (file: string, from: string, to: string) => {
    const path = join(directory, file)
    const source = readFileSync(path, "utf8")
    if (!source.includes(from))
      throw new Error(`Experimental patch no longer matches ${file}: ${from}`)
    writeFileSync(path, source.replaceAll(from, to))
  }
  if (scaledLotus) {
    replace(
      "engine.ts",
      "this.state.orbitValue * 3",
      "this.state.orbitValue * (this.state.gameNumber + 2)",
    )
    replace("heuristic.ts", "state.orbitValue * 3", "state.orbitValue * (state.gameNumber + 2)")
    replace("heuristic.ts", "3 * state.orbitValue", "state.orbitValue * (state.gameNumber + 2)")
  }
  if (longChow) {
    replace("types.ts", '  | "chow"', '  | "chow"\n  | "long-chow"')
    replace(
      "melds.ts",
      "        addCompoundHands(subset, mask, candidates)",
      `        const run = runIdentity(subset)
        if (run) candidates.push(candidate("long-chow", "Long Chow", subset, mask,
          runTieBreak(run), "Long Chow · five consecutive cards of one suit"))
        addCompoundHands(subset, mask, candidates)`,
    )
    replace(
      "hand-progress.ts",
      "const definitions: HandDefinition[] = [",
      `const definitions: HandDefinition[] = [
  exactDefinition("long-chow", "Long Chow", 5, SUITS.flatMap(suit =>
    Array.from({ length: 5 }, (_, i) => runRequirements(suit, i + 1, 5)))),`,
    )
    for (const file of ["scoring.ts", "hand-progress.ts"])
      replace(
        file,
        '["pung-eye", "three-dragons-eye", "kong"]',
        '["pung-eye", "three-dragons-eye", "kong", "long-chow"]',
      )
    replace("heuristic.ts", "? 13 :", "? 14 :")
    replace("heuristic.ts", "{ total: 13, tieBreak: [] }", "{ total: 14, tieBreak: [] }")
  }
  // Record actual pre-decision holdings; the ordinary decision log has no private-card context.
  replace(
    "simulation.ts",
    "  let safety = 0",
    "  const lotusObservations: unknown[] = []\n  let safety = 0",
  )
  replace(
    "simulation.ts",
    "    const step = stepHeuristic(engine, options.heuristicPolicies)",
    `    const actor = engine.state.players.find(p => p.id === engine.state.actingPlayerId)
    const lotusCount = actor ? [...actor.privateCards, ...actor.publicCards].filter(c => c.kind === "flower").length : 0
    const observation = engine.state.phase === "betting" && actor && lotusCount ? {
      game: engine.state.gameNumber, hand: engine.state.handNumber, street: engine.state.street,
      player: actor.id, lotuses: lotusCount,
      concealed: actor.publicCards.every(c => c.kind !== "flower"),
      locked: actor.riichi || engine.state.allInPlayerIds.length > 0,
    } : null
    const step = stepHeuristic(engine, options.heuristicPolicies)
    if (observation && step.decision) lotusObservations.push({ ...observation, action: step.decision.action })`,
  )
  replace("simulation.ts", "    decisions,", "    decisions,\n    ...{ lotusObservations },")
}
