import { describe, expect, it } from "vitest"
import { createDeck, faceKey } from "../src/game/cards"
import { GameEngine } from "../src/game/engine"
import { stepHeuristic } from "../src/game/automation"
import { analyzeHandProgress } from "../src/game/hand-progress"
import { chooseHeuristicAction, chooseHeuristicDiscard } from "../src/game/heuristic"
import { generateHandCandidates } from "../src/game/melds"
import { scoreHand } from "../src/game/scoring"
import type { Card } from "../src/game/types"

const colors = ["red", "green", "blue"] as const
// Independent of scoring and jokerCanRepresent: one eligible card per Dragon color.
function hasDragons(cards: readonly Card[]): boolean {
  return colors.every((color) =>
    cards.some((c) => (c.kind === "dragon" || c.kind === "joker") && c.color === color),
  )
}

describe("Three Dragons rule audit", () => {
  it("matches an independent oracle for every Dragon/Joker triple", () => {
    const pool = createDeck().filter((c) => c.kind === "dragon" || c.kind === "joker")
    let valid = 0
    for (let a = 0; a < pool.length; a++) {
      for (let b = a + 1; b < pool.length; b++) {
        for (let c = b + 1; c < pool.length; c++) {
          const cards = [pool[a]!, pool[b]!, pool[c]!]
          const expected = hasDragons(cards)
          valid += Number(expected)
          expect(generateHandCandidates(cards).some((h) => h.kind === "three-dragons")).toBe(
            expected,
          )
          expect(analyzeHandProgress(cards).find((h) => h.kind === "three-dragons")!.missing).toBe(
            colors.filter(
              (color) =>
                !cards.some(
                  (x) => (x.kind === "dragon" || x.kind === "joker") && x.color === color,
                ),
            ).length,
          )
        }
      }
    }
    expect(valid).toBe(64) // Four physical options per color, including its Joker.
  })

  it("recognizes every legal Joker count and ignores an extra pair", () => {
    const deck = createDeck()
    for (let mask = 0; mask < 8; mask++) {
      const main = colors.map((color, i) =>
        deck.find((c) => c.color === color && c.kind === (mask & (1 << i) ? "joker" : "dragon"))!,
      )
      const pair = deck
        .filter((c) => c.kind === "numbered" && c.suit === "bamboo" && c.rank === 2)
        .slice(0, 2)
      expect(scoreHand(main).combinations[0]?.kind).toBe("three-dragons")
      expect(scoreHand([...main, ...pair]).combinations[0]?.kind).toBe("three-dragons")
    }
    const natural = colors.map((color) =>
      deck.find((c) => c.kind === "dragon" && c.color === color)!,
    )
    const single = deck.find((c) => c.id === "dots-8-1")!
    const blueJoker = deck.find((c) => c.kind === "joker" && c.color === "blue")!
    expect(scoreHand([...natural, single, blueJoker]).combinations[0]?.kind).toBe("three-dragons")
  })
})

function dragonFixture(
  missing: (typeof colors)[number],
  targetJoker: boolean,
  blank: boolean,
  mode: "basic" | "riichi",
) {
  const game = GameEngine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    { seed: "dragon-opportunity", mode, heuristicSamples: 24 },
  )
  while (game.state.phase === "charleston") stepHeuristic(game)
  const player = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
  const deck = createDeck(mode)
  const pick = (id: string) => deck.find((c) => c.id === id)!
  const held = deck.filter((c) => c.kind === "dragon" && c.color !== missing && c.id.endsWith("-1"))
  player.privateCards = [
    ...held,
    pick("bamboo-2-1"),
    pick("dots-5-1"),
    pick("characters-8-1"),
    pick("wind-east-1"),
    blank ? pick("blank-1") : pick("bamboo-7-1"),
  ]
  player.publicCards = []
  const target = deck.find(
    (c) => c.color === missing && c.kind === (targetJoker ? "joker" : "dragon"),
  )!
  const cover = pick("dots-1-1")
  game.state.discardA = blank ? [target, cover] : [target]
  game.state.discardB = [pick("characters-3-1")]
  const used = new Set(
    [...player.privateCards, ...game.state.discardA, ...game.state.discardB].map((c) => c.id),
  )
  // Keep all physical cards unique; opponents' hidden cards are not bot inputs.
  const rest = deck.filter((c) => !used.has(c.id))
  for (const other of game.state.players.filter((p) => p !== player)) {
    other.privateCards = rest.splice(0, 7)
    other.publicCards = []
  }
  game.state.deck = rest
  game.state.charlestonHistory = []
  player.riichiSticks = 0 // Isolate the free fish / Blank opportunity.
  return { game, player, target }
}

describe("bots complete distinct Dragons with the normal policy", () => {
  it.each(colors)("spends a stick to reach a buried %s Dragon in two fishes", (color) => {
    const { game, player, target } = dragonFixture(color, false, false, "riichi")
    const cover = game.state.deck.find(
      (c) => c.kind === "numbered" && c.suit === "dots" && c.rank === 4,
    )!
    game.state.deck = game.state.deck.filter((c) => c.id !== cover.id)
    game.state.discardA = [target, cover]
    player.riichiSticks = 2
    const decision = chooseHeuristicAction(game.state, player.id, 24)
    expect(decision.action).toMatchObject({
      type: "check",
      useRiichiStick: true,
      drawSource: "discard-a",
      riichiDrawSource: "discard-a",
    })
    game.act(player.id, decision.action)
    while (game.state.phase === "discarding")
      game.discard(player.id, chooseHeuristicDiscard(game.state, player.id))
    expect(hasDragons(player.privateCards)).toBe(true)
    expect(player.riichiSticks).toBe(1)
  })

  it.each(colors)("calls a modest bet and uses a Blank for a buried %s Dragon", (color) => {
    const { game, player } = dragonFixture(color, false, true, "riichi")
    const bettor = game.state.players.find((p) => p !== player)!
    game.state.currentWager = 10
    bettor.roundCommitted = 10
    bettor.chips -= 10
    game.state.pot += 10
    const decision = chooseHeuristicAction(game.state, player.id, 24)
    expect(decision.action).toMatchObject({
      type: "call",
      blankExchange: { pile: "a", cardIndex: 0 },
    })
    game.act(player.id, decision.action)
    expect(hasDragons(player.privateCards)).toBe(true)
  })

  for (const mode of ["basic", "riichi"] as const) {
    for (const color of colors) {
      for (const joker of mode === "riichi" ? [false, true] : [false]) {
        for (const blank of mode === "riichi" ? [false, true] : [false]) {
          it(`${mode}: claims ${color} ${joker ? "Joker" : "Dragon"} via ${blank ? "buried Blank exchange" : "lane fish"}`, () => {
            const { game, player, target } = dragonFixture(color, joker, blank, mode)
            expect(hasDragons(player.privateCards)).toBe(false)
            const decision = chooseHeuristicAction(game.state, player.id, 24)
            expect(decision.action).toMatchObject({
              type: "check",
              ...(blank
                ? { blankExchange: { pile: "a", cardIndex: 0 } }
                : { drawSource: "discard-a" }),
            })
            game.act(player.id, decision.action)
            while (game.state.phase === "discarding")
              game.discard(player.id, chooseHeuristicDiscard(game.state, player.id))
            expect(hasDragons(player.privateCards)).toBe(true)
            expect(player.privateCards.some((c) => faceKey(c) === faceKey(target))).toBe(true)
          })
        }
      }
    }
  }
})
