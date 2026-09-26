import { GameEngine } from "./engine"
import {
  DEFAULT_BOT_POLICY,
  defaultBotPolicy,
  chooseHeuristicAction,
  chooseHeuristicCharleston,
  chooseHeuristicDiscard,
  chooseHeuristicExposure,
  type BotPolicy,
  type DiscardChoice,
} from "./heuristic"
import type { DrawDiscardRecord, HeuristicDecision } from "./types"

export interface AutomatedStep {
  rationale: string
  playerId?: string
  decision?: HeuristicDecision
  discard?: DiscardChoice
  drawDiscard?: DrawDiscardRecord
  exposeCardIds?: string[]
  charlestonCardIds?: string[]
}

export type BotPolicySource = Readonly<BotPolicy> | Readonly<Record<string, Readonly<BotPolicy>>>

export function stepHeuristic(
  engine: GameEngine,
  policies: BotPolicySource = DEFAULT_BOT_POLICY,
): AutomatedStep {
  const state = engine.state

  if (state.phase === "charleston") {
    const playerId = requiredActor(state.actingPlayerId, "No player is choosing a Charleston pass")
    const choice = chooseHeuristicCharleston(state, playerId)
    engine.passCharleston(playerId, choice.cardIds)
    return {
      rationale: choice.rationale,
      playerId,
      charlestonCardIds: choice.cardIds,
    }
  }

  if (state.phase === "exposing") {
    const playerId = requiredActor(state.actingPlayerId, "No player is choosing an exposure")
    const choice = chooseHeuristicExposure(state, playerId)
    engine.exposeCards(playerId, choice.cardIds)
    return { rationale: choice.rationale, playerId, exposeCardIds: choice.cardIds }
  }

  if (state.phase === "betting") {
    const playerId = requiredActor(state.actingPlayerId, "No acting player")
    const policy = policyFor(policies, playerId, state.config.mode)
    const decision = chooseHeuristicAction(
      engine.state,
      playerId,
      engine.state.config.heuristicSamples,
      policy,
    )
    engine.act(playerId, decision.action)
    if (engine.state.phase === "discarding" && engine.state.pendingDiscard?.playerId === playerId) {
      const discard = chooseHeuristicDiscard(
        engine.state,
        playerId,
        engine.state.config.heuristicSamples,
        policy,
      )
      engine.discard(playerId, discard)
      return {
        rationale: `${decision.rationale}; ${discard.rationale}`,
        playerId,
        decision,
        discard,
        drawDiscard: engine.state.drawDiscardHistory.at(-1),
      }
    }
    return {
      rationale: decision.rationale,
      playerId,
      decision,
    }
  }

  if (state.phase === "discarding") {
    const playerId = requiredActor(
      state.pendingDiscard?.playerId ?? null,
      "No player is discarding",
    )
    const discard = chooseHeuristicDiscard(
      state,
      playerId,
      state.config.heuristicSamples,
      policyFor(policies, playerId, state.config.mode),
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
    engine.startNextHand()
    return { rationale: "Started the next hand" }
  }

  throw new Error(`Cannot take a heuristic step during ${state.phase}`)
}

function policyFor(
  source: BotPolicySource,
  playerId: string,
  mode: "basic" | "riichi",
): Readonly<BotPolicy> {
  if (source === DEFAULT_BOT_POLICY) return defaultBotPolicy(mode)
  if ("betEquityFloor" in source) return source as Readonly<BotPolicy>
  return source[playerId] ?? defaultBotPolicy(mode)
}

function requiredActor(playerId: string | null, message: string): string {
  if (!playerId) throw new Error(message)
  return playerId
}
