import { expect, it } from "vitest"
import { createDeck } from "../src/game/cards"
import { sortHand } from "../src/client/sort-hand"
const deck = createDeck("riichi")
const pick = (id: string) => deck.find((c) => c.id === id)!
it("places a Joker after the pair it completes, preserving the suit order", () => {
  const cards = [
    "bamboo-8-1",
    "dots-4-1",
    "dots-6-1",
    "dots-6-2",
    "dots-8-1",
    "characters-3-1",
    "joker-blue",
  ].map(pick)
  expect(sortHand(cards).map((c) => c.id)).toEqual([
    "bamboo-8-1",
    "dots-4-1",
    "dots-6-1",
    "dots-6-2",
    "joker-blue",
    "dots-8-1",
    "characters-3-1",
  ])
})
it("keeps public cards separate and an unmatched Joker alongside its family", () => {
  const cards = ["dots-4-1", "characters-3-1", "joker-blue", "bamboo-8-1"].map(pick)
  expect(sortHand(cards, [cards[1]!]).map((c) => c.id)).toEqual([
    "characters-3-1",
    "bamboo-8-1",
    "dots-4-1",
    "joker-blue",
  ])
})
