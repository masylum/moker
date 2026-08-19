import { GameEngine } from "./engine"
import {
  chooseHeuristicAction,
  chooseHeuristicDiscard,
  chooseHeuristicSeedDiscard,
} from "./heuristic"
import { LOAN_VALUE, MAX_LOANS, ORBIT_VALUES } from "./rules"
import type { DiscardChoice, SeedDiscardChoice } from "./heuristic"
import type { DrawDiscardRecord, HeuristicDecision } from "./types"

export interface AutomatedStep {
  rationale: string
  playerId?: string
  decision?: HeuristicDecision
  discard?: DiscardChoice
  drawDiscard?: DrawDiscardRecord
  seedDiscard?: SeedDiscardChoice
}

export function stepHeuristic(engine: GameEngine): AutomatedStep {
  const state = engine.state

  if (state.phase === "seeding") {
    const playerId = state.actingPlayerId

    if (!playerId) {
      throw new Error("No player is seeding a discard lane")
    }

    const seedDiscard = chooseHeuristicSeedDiscard(state, playerId)
    engine.seedDiscard(playerId, seedDiscard)

    return {
      rationale: seedDiscard.rationale,
      playerId,
      seedDiscard,
    }
  }

  if (state.phase === "betting") {
    const playerId = state.actingPlayerId

    if (!playerId) {
      throw new Error("No acting player")
    }

    const decision = chooseHeuristicAction(state, playerId)
    engine.act(playerId, decision.action)

    if (engine.state.phase === "discarding" && engine.state.pendingDiscard?.playerId === playerId) {
      const discard = chooseHeuristicDiscard(engine.state, playerId)
      engine.discard(playerId, discard)
      const drawDiscard = engine.state.drawDiscardHistory.at(-1)!

      return {
        rationale: `${decision.rationale} ${discard.rationale}.`,
        playerId,
        decision,
        discard,
        drawDiscard,
      }
    }

    return { rationale: decision.rationale, playerId, decision }
  }

  if (state.phase === "discarding") {
    const playerId = state.pendingDiscard?.playerId

    if (!playerId) {
      throw new Error("No player is discarding")
    }

    const decision = chooseHeuristicDiscard(state, playerId)
    engine.discard(playerId, decision)
    const drawDiscard = engine.state.drawDiscardHistory.at(-1)!

    return { rationale: decision.rationale, playerId, discard: decision, drawDiscard }
  }

  if (state.phase === "between-hands") {
    ensureOpeningLiquidity(engine)
    engine.startNextHand()

    return { rationale: "Started the next hand" }
  }

  throw new Error(`Cannot take a heuristic step during ${state.phase}`)
}

export function ensureOpeningLiquidity(engine: GameEngine): void {
  const nextHand = engine.state.handNumber + 1
  const handsPerOrbit = engine.state.config.playerCount === 2 ? 4 : engine.state.config.playerCount
  const orbit = Math.min(2, Math.floor((nextHand - 1) / handsPerOrbit))
  const orbitValue = ORBIT_VALUES[orbit]!

  for (const player of engine.state.players.filter((candidate) => !candidate.eliminated)) {
    while (
      player.loansCharged.some((charges) => charges >= 1) &&
      player.chips >= LOAN_VALUE + orbitValue * (player.blueSticks + player.loans - 1)
    ) {
      engine.repayLoan(player.id)
    }

    const charge = orbitValue * (player.blueSticks + player.loans)

    while (player.chips < charge && player.loans < MAX_LOANS) {
      engine.takeLoan(player.id)
    }
  }
}
