import { describe, expect, it } from "vitest"
import { blankFace, numberedFace, windFace } from "../src/game/cards"
import { GameEngine } from "../src/game/engine"
import { stepHeuristic } from "../src/game/automation"
import { analyzePokerMath } from "../src/game/heuristic"
import { publicKnownPrivateCards } from "../src/game/information"

function engine(): GameEngine {
  return GameEngine.create(
    Array.from({ length: 4 }, (_, index) => ({
      id: `p${index + 1}`,
      name: `P${index + 1}`,
      controller: "heuristic" as const,
    })),
    { seed: "public-information", heuristicSamples: 4 },
  )
}

describe("public opponent information", () => {
  it("tracks publicly acquired tiles until visibly discarded", () => {
    const game = engine()
    const east = { id: "wind-east-1", ...windFace("east") }
    const south = { id: "wind-south-1", ...windFace("south") }
    game.state.drawDiscardHistory = [
      {
        playerId: "p1",
        source: "discard-a",
        drawnCard: east,
        discardedCard: { id: "bamboo-1-1", ...numberedFace("bamboo", 1) },
        discardPile: "a",
        discardIndex: 0,
        reason: "call",
      },
      {
        playerId: "p1",
        source: "blank-exchange",
        drawnCard: south,
        discardedCard: { id: "blank-1", ...blankFace() },
        discardPile: "b",
        discardIndex: 0,
        reason: "call",
      },
      {
        playerId: "p1",
        source: "deck",
        drawnCard: { id: "wind-west-1", ...windFace("west") },
        discardedCard: east,
        discardPile: "a",
        discardIndex: 1,
        reason: "call",
      },
    ]
    const moves = game.publicView("p2").publicDrawDiscards!
    expect(moves[0]!.drawnCard).toEqual(east)
    expect(moves[1]!.drawnCard).toEqual(south)
    expect(moves[2]).not.toHaveProperty("drawnCard")
    expect(moves[2]!.discardedCard).toEqual(east)
    expect(publicKnownPrivateCards(game.state).p1?.map((card) => card.id)).toEqual(["wind-south-1"])
    expect(game.publicView("p2").players[0]!.knownPrivateCards.map((card) => card.id)).toEqual([
      "wind-south-1",
    ])
  })

  it("reports public-range and aggression inputs without exposing concealed cards", () => {
    const game = engine()
    game.state.phase = "betting"
    game.state.street = 2
    game.state.actingPlayerId = "p2"
    game.state.pendingPlayerIds = ["p2"]
    game.state.players[0]!.publicCards = [{ id: "wind-east-1", ...windFace("east") }]
    game.state.bettingHistory = [
      { playerId: "p1", street: 1, type: "bet", amount: 20 },
      { playerId: "p1", street: 2, type: "bet", amount: 50 },
    ]
    const analysis = analyzePokerMath(game.state, "p2", 8)
    expect(analysis.knownOpponentTiles).toBeGreaterThanOrEqual(1)
    expect(analysis.opponentAggressiveActions).toBe(2)
    expect(game.publicView("p2").players[0]!.privateCards).toEqual({ count: 6 })
  })

  it("removes folded concealed tiles without leaking the face-down discard", () => {
    const game = engine()
    while (game.state.phase !== "betting") stepHeuristic(game)
    const folderId = game.state.actingPlayerId!
    game.act(folderId, { type: "fold" })
    const view = game.publicView("p1")
    expect(view).not.toHaveProperty("removedCards")
    expect(view).not.toHaveProperty("foldedPrivateCards")
    expect(game.state.players.find((player) => player.id === folderId)!.privateCards).toEqual([])
    expect(game.state.foldedPrivateCards[folderId]).toHaveLength(6)
  })
})

it("counts a lane card only once after it is exposed, including a Lotus", () => {
  const game = engine()
  const lotus = {
    id: "flower-white-lotus",
    kind: "flower" as const,
    flower: "white-lotus" as const,
    color: null,
  }
  game.state.drawDiscardHistory = [
    {
      playerId: "p1",
      source: "discard-a",
      drawnCard: lotus,
      discardedCard: { id: "bamboo-1-1", ...numberedFace("bamboo", 1) },
      discardPile: "a",
      discardIndex: 0,
      reason: "call",
    },
  ]
  expect(publicKnownPrivateCards(game.state).p1).toEqual([lotus])
  game.state.players[0]!.publicCards = [lotus]
  game.state.exposureHistory = [{ playerId: "p1", street: 1, card: lotus }]
  expect(publicKnownPrivateCards(game.state).p1).toEqual([])
  expect(game.publicView("p2").players[0]!.knownPrivateCards).toEqual([])
})

it("shows each viewer only their two received Charleston cards", () => {
  const game = GameEngine.create(
    ["p1", "p2"].map((id) => ({ id, name: id, controller: "human" as const })),
    { seed: "charleston-receipt", mode: "riichi" },
  )
  expect(game.publicView("p1").charlestonReceivedCards).toEqual([])
  while (game.state.phase === "charleston") {
    const player = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
    game.passCharleston(
      player.id,
      player.privateCards.slice(0, 2).map((card) => card.id),
    )
  }
  for (const player of game.state.players) {
    const receipt = game.publicView(player.id).charlestonReceivedCards!
    expect(receipt).toEqual(
      game.state.charlestonHistory.find((pass) => pass.toPlayerId === player.id)!.cards,
    )
    expect(receipt).toHaveLength(2)
    expect(receipt.every((card) => player.privateCards.some((held) => held.id === card.id))).toBe(
      true,
    )
  }
  expect(game.publicView().charlestonReceivedCards).toEqual([])
  expect(game.publicView("unknown").charlestonReceivedCards).toEqual([])
})
