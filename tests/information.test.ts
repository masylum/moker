import { describe, expect, it } from "vitest"
import { blankFace, dragonFace, numberedFace, windFace } from "../src/game/cards"
import { GameEngine } from "../src/game/engine"
import { analyzePokerMath } from "../src/game/heuristic"
import { publicKnownPrivateCards } from "../src/game/information"

const players = [
  { id: "p1", name: "A", controller: "human" as const },
  { id: "p2", name: "B", controller: "heuristic" as const },
]

describe("public opponent information", () => {
  it("tracks publicly acquired tiles until they are visibly discarded", () => {
    const engine = readyEngine()
    const east = { id: "wind-east-1", ...windFace("east") }
    const south = { id: "wind-south-1", ...windFace("south") }
    engine.state.drawDiscardHistory = [
      {
        playerId: "p1",
        source: "discard-a",
        drawnCard: east,
        discardedCard: { id: "bamboo-1-1", ...numberedFace("bamboo", 1) },
        discardPile: "a",
        discardIndex: 0,
      },
      {
        playerId: "p1",
        source: "blank-exchange",
        drawnCard: south,
        discardedCard: { id: "blank-1", ...blankFace() },
        discardPile: "b",
        discardIndex: 0,
      },
      {
        playerId: "p1",
        source: "deck",
        drawnCard: { id: "wind-west-1", ...windFace("west") },
        discardedCard: east,
        discardPile: "a",
        discardIndex: 1,
      },
    ]

    expect(publicKnownPrivateCards(engine.state).p1?.map((card) => card.id)).toEqual([
      "wind-south-1",
    ])
    const publicPlayer = engine.publicView("p2").players.find((player) => player.id === "p1")!
    expect(publicPlayer.knownPrivateCards.map((card) => card.id)).toEqual(["wind-south-1"])
    expect(publicPlayer.privateCards).toEqual({ count: 3 })
  })

  it("discounts confidence when public Winds and repeated raises narrow an opponent's range", () => {
    const engine = readyEngine()
    engine.state.street = 4
    engine.state.phase = "betting"
    engine.state.actingPlayerId = "p2"
    engine.state.pendingPlayerIds = ["p2"]
    engine.state.community = [
      { id: "wind-north-1", ...windFace("north") },
      { id: "dragon-green-1", ...dragonFace("green") },
      { id: "dragon-green-2", ...dragonFace("green") },
      { id: "bamboo-7-1", ...numberedFace("bamboo", 7) },
      { id: "characters-9-1", ...numberedFace("characters", 9) },
    ]
    engine.state.players[1]!.privateCards = [
      { id: "dots-2-1", ...numberedFace("dots", 2) },
      { id: "dots-3-1", ...numberedFace("dots", 3) },
      { id: "dots-4-1", ...numberedFace("dots", 4) },
    ]
    engine.state.drawDiscardHistory = [
      {
        playerId: "p1",
        source: "discard-a",
        drawnCard: { id: "wind-east-1", ...windFace("east") },
        discardedCard: { id: "bamboo-1-1", ...numberedFace("bamboo", 1) },
        discardPile: "a",
        discardIndex: 0,
      },
      {
        playerId: "p1",
        source: "blank-exchange",
        drawnCard: { id: "wind-south-1", ...windFace("south") },
        discardedCard: { id: "blank-1", ...blankFace() },
        discardPile: "b",
        discardIndex: 0,
      },
    ]
    const unweighted = analyzePokerMath(engine.state, "p2", 128).showdownEquity
    engine.state.bettingHistory = [
      { playerId: "p1", street: 4, type: "raise", amount: 50 },
      { playerId: "p1", street: 4, type: "raise", amount: 200 },
      { playerId: "p1", street: 4, type: "raise", amount: 430 },
    ]
    const rangeAnalysis = analyzePokerMath(engine.state, "p2", 128)

    expect(rangeAnalysis.knownOpponentTiles).toBe(2)
    expect(rangeAnalysis.opponentAggressiveActions).toBe(3)
    expect(rangeAnalysis.showdownEquity).toBeLessThan(unweighted - 0.05)
  })
})

function readyEngine(): GameEngine {
  const engine = GameEngine.create(players, { seed: "public-information", heuristicSamples: 8 })

  while (engine.state.phase === "seeding") {
    const playerId = engine.state.actingPlayerId!
    const player = engine.state.players.find((candidate) => candidate.id === playerId)!
    engine.seedDiscard(playerId, {
      discardCardId: player.privateCards[0]!.id,
      discardPile: engine.state.discardA.length === 0 ? "a" : "b",
    })
  }

  return engine
}
