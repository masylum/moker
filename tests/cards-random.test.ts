import { describe, expect, it } from "vitest"
import { coloredTile, tileGlyph } from "../src/cli/tiles"
import { cardLabel, createDeck, flowerFace, jokerCanRepresent } from "../src/game/cards"
import { SeededRandom } from "../src/game/random"

describe("deck and seeded randomness", () => {
  it("builds the exact 110-card deck described by its component list", () => {
    const deck = createDeck()
    expect(deck).toHaveLength(110)
    expect(new Set(deck.map((card) => card.id))).toHaveLength(110)
    expect(deck.filter((card) => card.kind === "numbered")).toHaveLength(81)
    expect(deck.filter((card) => card.kind === "dragon")).toHaveLength(9)
    expect(deck.filter((card) => card.kind === "wind")).toHaveLength(12)
    expect(deck.filter((card) => card.kind === "joker")).toHaveLength(4)
    expect(deck.filter((card) => card.kind === "blank")).toHaveLength(4)
    expect(deck.filter((card) => card.kind === "flower")).toHaveLength(0)
    expect(deck.find((card) => card.id === "bamboo-1-1")?.color).toBe("green")
    expect(deck.find((card) => card.id === "dots-1-1")?.color).toBe("blue")
    expect(deck.find((card) => card.id === "dragon-white-1")?.color).toBe("blue")
    expect(deck.find((card) => card.id === "wind-east-1")?.color).toBe("black")
    expect(deck.find((card) => card.id === "blank-1")?.color).toBeNull()
  })

  it("replays the same shuffle from the same seed", () => {
    const first = new SeededRandom("repeatable").shuffle(createDeck()).map((card) => card.id)
    const second = new SeededRandom("repeatable").shuffle(createDeck()).map((card) => card.id)
    const different = new SeededRandom("different").shuffle(createDeck()).map((card) => card.id)
    expect(first).toEqual(second)
    expect(first).not.toEqual(different)
  })

  it("gives neither Lotus a Joker equivalent", () => {
    const flower = flowerFace("white-lotus")

    expect(jokerCanRepresent({ kind: "joker", color: "black" }, flower)).toBe(false)
    expect(jokerCanRepresent({ kind: "joker", color: "red" }, flower)).toBe(false)
  })

  it("uses the table names Bams, Dots, and Craks", () => {
    const deck = createDeck()

    expect(cardLabel(deck.find((card) => card.id === "bamboo-1-1")!)).toBe("1 Bams")
    expect(cardLabel(deck.find((card) => card.id === "dots-1-1")!)).toBe("1 Dots")
    expect(cardLabel(deck.find((card) => card.id === "characters-1-1")!)).toBe("1 Craks")
  })

  it("can serialize and resume PRNG state", () => {
    const first = new SeededRandom("resume")
    first.next()
    const resumed = new SeededRandom("resume", first.state)
    expect(first.next()).toBe(resumed.next())
  })

  it("renders colored Unicode Mahjong tiles for the terminal client", () => {
    const bambooOne = createDeck().find((card) => card.id === "bamboo-1-1")!
    const blank = createDeck().find((card) => card.id === "blank-1")!
    const flowers = [flowerFace("white-lotus"), flowerFace("black-lotus")]

    expect(tileGlyph(bambooOne)).toBe("🀐")
    expect(coloredTile(bambooOne)).toContain("\u001B[32m🀐\u001B[0m")
    expect(tileGlyph(blank)).toBe("□")
    expect(flowers.map(tileGlyph)).toEqual(["🀥", "🀥"])
    expect(coloredTile(flowers[0]!)).toContain("\u001B[97m🀥\u001B[0m")
    expect(coloredTile(flowers[1]!)).toContain("\u001B[90m🀥\u001B[0m")
  })
})
