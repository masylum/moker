import { describe, expect, it } from "vitest"
import { createDeck } from "../src/game/cards"
import { GameEngine } from "../src/game/engine"
import { legacyPass } from "../src/game/legacy-bot"
import { evaluateLegacy } from "../src/game/legacy-scoring"
import type { HandKind } from "../src/game/types"

const deck = createDeck("legacy")
const cards = (...ids: string[]) => ids.map((id) => deck.find((c) => c.id === id)!)
describe("Legacy deal and rarity audit", () => {
  it.each([4, 5, 6])("distributes all but two cards at %i seats", (players) => {
    const g = GameEngine.create(
      Array.from({ length: players }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        controller: "human" as const,
      })),
      { mode: "legacy", seed: "deal-audit" },
    )
    expect(g.state.deck).toHaveLength(0)
    expect(g.state.discardA.length + g.state.discardB.length).toBe(2)
    expect(g.state.legacy!.decks.reduce((sum, d) => sum + d.length, 0)).toBe(190 - 7 * players)
  })
  it("counts a Dragon set contained inside Dragons and Eyes without calling it the best category", () => {
    const contains = new Set<HandKind>()
    const score = evaluateLegacy(
      cards(
        "dragon-red-1",
        "dragon-green-1",
        "dragon-white-1",
        "bamboo-1-1",
        "bamboo-1-2",
        "dots-8-1",
        "characters-5-1",
      ),
      contains,
    )
    expect(contains.has("three-dragons")).toBe(true)
    expect(score.kind).toBe("three-dragons-eye")
  })
  it("recognizes Twin Lotus and counts it beneath a stronger combination", () => {
    const contains = new Set<HandKind>()
    const pair = cards("flower-white-lotus", "flower-black-lotus")
    expect(evaluateLegacy(pair).kind).toBe("twin-lotus")
    expect(
      evaluateLegacy(
        [
          ...pair,
          ...cards("dragon-red-1", "dragon-green-1", "dragon-white-1", "bamboo-1-1", "bamboo-1-2"),
        ],
        contains,
      ).kind,
    ).toBe("three-dragons-eye")
    expect(contains.has("twin-lotus")).toBe(true)
  })
  it("documents the bot's immediate-value bias: pass a singleton Lotus but retain a pair", () => {
    const single = cards(
      "flower-white-lotus",
      "bamboo-1-1",
      "bamboo-2-1",
      "bamboo-3-1",
      "dots-4-1",
      "dots-4-2",
      "wind-east-1",
    )
    expect(legacyPass(single)).toContain("flower-white-lotus")
    const pair = cards(
      "flower-white-lotus",
      "flower-black-lotus",
      "bamboo-1-1",
      "dots-4-1",
      "characters-7-1",
      "wind-east-1",
      "dragon-red-1",
    )
    expect(legacyPass(pair).some((id) => id.startsWith("flower-"))).toBe(false)
  })
})
