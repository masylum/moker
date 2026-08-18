import { MAX_LOANS, ORBIT_VALUES } from "../game/rules"
import { Stud7Engine } from "./engine"
import { chooseStud7Action, chooseStud7Discard } from "./heuristic"
import type { StudDiscardChoice, StudDrawDiscardRecord, StudHeuristicDecision } from "./types"

export interface StudAutomatedStep {
  rationale: string
  playerId?: string
  decision?: StudHeuristicDecision
  discard?: StudDiscardChoice
  drawDiscard?: StudDrawDiscardRecord
}

export function stepStud7Heuristic(
  engine: Stud7Engine,
  options: { fastMode?: boolean } = {},
): StudAutomatedStep {
  const state = engine.state

  if (state.phase === "betting") {
    const playerId = state.actingPlayerId

    if (!playerId) {
      throw new Error("No acting Stud7 player")
    }

    const decision = chooseStud7Action(
      state,
      playerId,
      state.config.heuristicSamples,
      options.fastMode,
    )
    engine.act(playerId, decision.action)

    if (engine.state.phase === "discarding" && engine.state.pendingDiscard?.playerId === playerId) {
      const discard = chooseStud7Discard(
        engine.state,
        playerId,
        engine.state.config.heuristicSamples,
        options.fastMode,
      )
      engine.discard(playerId, discard)

      return {
        rationale: `${decision.rationale} ${discard.rationale}.`,
        playerId,
        decision,
        discard,
        drawDiscard: engine.state.drawDiscardHistory.at(-1),
      }
    }

    return { rationale: decision.rationale, playerId, decision }
  }

  if (state.phase === "discarding") {
    const playerId = state.pendingDiscard?.playerId

    if (!playerId) {
      throw new Error("No Stud7 player is discarding")
    }

    const discard = chooseStud7Discard(
      state,
      playerId,
      state.config.heuristicSamples,
      options.fastMode,
    )
    engine.discard(playerId, discard)

    return {
      rationale: discard.rationale,
      playerId,
      discard,
      drawDiscard: engine.state.drawDiscardHistory.at(-1),
    }
  }

  if (state.phase === "between-hands") {
    ensureStud7OpeningLiquidity(engine)
    engine.startNextHand()

    return { rationale: "Started the next Stud7 hand" }
  }

  throw new Error(`Cannot automate Stud7 during ${state.phase}`)
}

function ensureStud7OpeningLiquidity(engine: Stud7Engine): void {
  const nextHand = engine.state.handNumber + 1
  const handsPerOrbit = engine.state.config.playerCount === 2 ? 4 : engine.state.config.playerCount
  const orbit = Math.min(2, Math.floor((nextHand - 1) / handsPerOrbit))
  const orbitValue = ORBIT_VALUES[orbit]!

  for (const player of engine.state.players) {
    const charge = orbitValue * (player.blueSticks + player.loans)

    while (player.chips < charge && player.loans < MAX_LOANS) {
      engine.takeLoan(player.id)
    }
  }
}
