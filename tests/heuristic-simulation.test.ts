import { describe, expect, it } from "vitest";
import { GameEngine } from "../src/game/engine";
import { chooseHeuristicAction, chooseHeuristicDiscard } from "../src/game/heuristic";
import { simulateGame } from "../src/game/simulation";

describe("heuristic player and simulations", () => {
  it("returns statistical evaluations for every considered betting option", () => {
    const engine = GameEngine.create([
      { id: "p1", name: "A", controller: "heuristic" },
      { id: "p2", name: "B", controller: "heuristic" },
    ], { seed: "heuristic", heuristicSamples: 2 });
    const decision = chooseHeuristicAction(engine.state, engine.state.actingPlayerId!, 2);
    expect(decision.evaluations.length).toBeGreaterThan(1);
    expect(decision.evaluations.every((value) => Number.isFinite(value.utility) && value.samples === 2)).toBe(true);
  });

  it("chooses a legal discard after seeing the drawn card", () => {
    const engine = GameEngine.create([
      { id: "p1", name: "A", controller: "heuristic" },
      { id: "p2", name: "B", controller: "heuristic" },
    ], { seed: "discard", heuristicSamples: 2 });
    const playerId = engine.state.actingPlayerId!;
    engine.act(playerId, { type: "check", drawSource: "deck" });
    const choice = chooseHeuristicDiscard(engine.state, playerId, 2);
    expect(engine.state.players.find((player) => player.id === playerId)?.privateCards.some((card) => card.id === choice.discardCardId)).toBe(true);
  });

  it("replays an entire game deterministically", { timeout: 60_000 }, () => {
    const first = simulateGame({ seed: "full-game", playerCount: 2, heuristicSamples: 1 });
    const second = simulateGame({ seed: "full-game", playerCount: 2, heuristicSamples: 1 });
    expect(first.state.phase).toBe("finished");
    expect(first.state.finalScores).toEqual(second.state.finalScores);
    expect(first.events.map((event) => [event.type, event.actorId, event.payload])).toEqual(second.events.map((event) => [event.type, event.actorId, event.payload]));
  });
});
