import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import { stepHeuristic } from "../src/game/automation"
import {
  analyzePokerMath,
  chooseHeuristicAction,
  chooseHeuristicDiscard,
} from "../src/game/heuristic"
import { simulateGame } from "../src/game/simulation"

describe("heuristic player and simulations", () => {
  it("checks a very low-equity hand instead of betting to shed a blue stick", () => {
    const engine = GameEngine.create(
      [
        { id: "p1", name: "You", controller: "human" },
        { id: "p2", name: "Bot 2", controller: "heuristic" },
        { id: "p3", name: "Bot 3", controller: "heuristic" },
        { id: "p4", name: "Bot 4", controller: "heuristic" },
      ],
      { seed: "jade-table", heuristicSamples: 64 },
    )
    const playerId = engine.state.actingPlayerId!
    const decision = chooseHeuristicAction(engine.state, playerId, 64)

    expect(analyzePokerMath(engine.state, playerId, 64).showdownEquity).toBeLessThan(0.2)
    expect(decision.action.type).toBe("check")
    expect(decision.evaluations.some((evaluation) => evaluation.action.type === "bet")).toBe(false)
  })

  it("makes a value bet when a strong hand can be called by worse hands", () => {
    const engine = GameEngine.create(
      [
        { id: "p1", name: "You", controller: "human" },
        { id: "p2", name: "Bot 2", controller: "heuristic" },
        { id: "p3", name: "Bot 3", controller: "heuristic" },
        { id: "p4", name: "Bot 4", controller: "heuristic" },
      ],
      { seed: "jade-table", heuristicSamples: 64 },
    )
    engine.state.actingPlayerId = "p4"
    engine.state.pendingPlayerIds = ["p4"]
    const decision = chooseHeuristicAction(engine.state, "p4", 64)

    expect(analyzePokerMath(engine.state, "p4", 64).showdownEquity).toBeGreaterThan(0.5)
    expect(decision.action.type).toBe("bet")
  })

  it("reports pot odds from the same math used by the heuristic", () => {
    const engine = GameEngine.create(
      [
        { id: "p1", name: "A", controller: "heuristic" },
        { id: "p2", name: "B", controller: "heuristic" },
      ],
      { seed: "pot-odds", heuristicSamples: 8 },
    )
    engine.act(engine.state.actingPlayerId!, { type: "bet", amount: 5 })
    const playerId = engine.state.actingPlayerId!
    const analysis = analyzePokerMath(engine.state, playerId, 8)

    expect(analysis.toCall).toBe(5)
    expect(analysis.potBeforeCall).toBe(15)
    expect(analysis.potOdds).toBeCloseTo(1 / 4)
    expect(analysis.callExpectedValue).toBeCloseTo(
      analysis.showdownEquity * analysis.potAfterCall - analysis.toCall,
    )
  })

  it("returns statistical evaluations for every considered betting option", () => {
    const engine = GameEngine.create(
      [
        { id: "p1", name: "A", controller: "heuristic" },
        { id: "p2", name: "B", controller: "heuristic" },
      ],
      { seed: "heuristic", heuristicSamples: 2 },
    )
    const decision = chooseHeuristicAction(engine.state, engine.state.actingPlayerId!, 2)
    expect(decision.evaluations.length).toBeGreaterThan(1)
    expect(
      decision.evaluations.every((value) => Number.isFinite(value.utility) && value.samples === 2),
    ).toBe(true)
  })

  it("chooses a legal discard after seeing the drawn card", () => {
    const engine = GameEngine.create(
      [
        { id: "p1", name: "A", controller: "heuristic" },
        { id: "p2", name: "B", controller: "heuristic" },
      ],
      { seed: "discard", heuristicSamples: 2 },
    )
    const playerId = engine.state.actingPlayerId!
    engine.act(playerId, { type: "check", drawSource: "deck" })
    const choice = chooseHeuristicDiscard(engine.state, playerId, 2)
    expect(
      engine.state.players
        .find((player) => player.id === playerId)
        ?.privateCards.some((card) => card.id === choice.discardCardId),
    ).toBe(true)
  })

  it("resolves a heuristic Check and Draw & Discard as one client step", () => {
    const engine = GameEngine.create(
      [
        { id: "p1", name: "You", controller: "human" },
        { id: "p2", name: "Bot", controller: "heuristic" },
        { id: "p3", name: "Bot 3", controller: "heuristic" },
        { id: "p4", name: "Bot 4", controller: "heuristic" },
      ],
      { seed: "jade-table", heuristicSamples: 2 },
    )

    const step = stepHeuristic(engine)

    expect(step.rationale).toMatch(/Drew/)
    expect(engine.state.phase).not.toBe("discarding")
    expect(engine.state.drawDiscardHistory).toHaveLength(1)
  })

  it("replays an entire game deterministically", { timeout: 60_000 }, () => {
    const first = simulateGame({ seed: "full-game", playerCount: 2, heuristicSamples: 1 })
    const second = simulateGame({ seed: "full-game", playerCount: 2, heuristicSamples: 1 })
    expect(first.state.phase).toBe("finished")
    expect(first.state.finalScores).toEqual(second.state.finalScores)
    expect(first.events.map((event) => [event.type, event.actorId, event.payload])).toEqual(
      second.events.map((event) => [event.type, event.actorId, event.payload]),
    )
  })
})
