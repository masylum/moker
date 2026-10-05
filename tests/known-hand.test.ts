import { describe, expect, it } from "vitest"
import { knownHand } from "../src/client/known-hand"
import { GameEngine } from "../src/game/engine"
import { windFace, numberedFace } from "../src/game/cards"

function player() {
  return GameEngine.create(
    [
      { id: "p1", name: "You", controller: "human" },
      { id: "p2", name: "Opponent", controller: "human" },
    ],
    { seed: "known-hand", mode: "basic" },
  ).publicView("p1").players[1]!
}

describe("known hand summaries", () => {
  it("does not infer a rank from hidden cards, even when a full hand is supplied", () => {
    const opponent = player()
    opponent.privateCards = [1, 2, 3].map((n) => ({
      id: `hidden-${n}`,
      ...numberedFace("bamboo", 5),
    }))
    opponent.knownPrivateCards = [{ id: "remembered", ...windFace("east") }]
    expect(knownHand(opponent, "basic")).toEqual({ label: "", rank: undefined })
  })
  it("ranks revealed cards with mode-specific ranks", () => {
    const opponent = player()
    opponent.publicCards = [
      { id: "east", ...windFace("east") },
      { id: "south", ...windFace("south") },
      { id: "west", ...windFace("west") },
    ]
    expect(knownHand(opponent, "basic")).toEqual({ label: "Three Winds", rank: 6 })
    expect(knownHand(opponent, "riichi").rank).toBe(7)
  })
  it("never counts the same physical card twice", () => {
    const opponent = player()
    const card = { id: "one-card", ...numberedFace("bamboo", 5) }
    opponent.publicCards = [card]
    opponent.knownPrivateCards = [card]
    expect(knownHand(opponent, "basic")).toEqual({ label: "High Card", rank: 1 })
  })
})
