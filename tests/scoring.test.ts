import { describe, expect, it } from "vitest"
import {
  createDeck,
  dragonFace,
  flowerFace,
  jokerFace,
  numberedFace,
  windFace,
} from "../src/game/cards"
import { HAND_RANKS } from "../src/game/hand-ranks"
import { SeededRandom } from "../src/game/random"
import { compareHandScores, scoreHand, scoreHandStrength } from "../src/game/scoring"
import type {
  Card,
  Dragon,
  Flower,
  HandKind,
  JokerColor,
  NumberedRank,
  Suit,
  Wind,
} from "../src/game/types"

let serial = 0
const n = (suit: Suit, rank: NumberedRank, count = 1): Card[] =>
  Array.from({ length: count }, () => ({ id: `c${serial++}`, ...numberedFace(suit, rank) }))
const d = (dragon: Dragon, count = 1): Card[] =>
  Array.from({ length: count }, () => ({ id: `c${serial++}`, ...dragonFace(dragon) }))
const w = (wind: Wind, count = 1): Card[] =>
  Array.from({ length: count }, () => ({ id: `c${serial++}`, ...windFace(wind) }))
const j = (color: JokerColor): Card => ({ id: `c${serial++}`, ...jokerFace(color) })
const f = (flower: Flower): Card => ({ id: `c${serial++}`, ...flowerFace(flower) })

function kind(cards: Card[]): HandKind {
  return scoreHand(cards).combinations[0]?.kind ?? "high-card"
}

const fixtures: Array<[number, HandKind, Card[]]> = [
  [1, "high-card", n("bamboo", 1)],
  [2, "eye", n("dots", 2, 2)],
  [3, "chow", [...n("bamboo", 3), ...n("bamboo", 4), ...n("bamboo", 5)]],
  [4, "two-eyes", [...n("dots", 2, 2), ...n("bamboo", 8, 2)]],
  [5, "chow-eye", [...n("bamboo", 3), ...n("bamboo", 4), ...n("bamboo", 5), ...d("red", 2)]],
  [6, "pung", n("dots", 8, 3)],
  [7, "three-winds", [...w("east"), ...w("west"), ...w("north")]],
  [8, "pung-eye", [...n("dots", 5, 3), ...n("bamboo", 8, 2)]],
  [9, "three-dragons", [...d("red"), ...d("green"), ...d("white")]],
  [10, "long-chow", [5, 6, 7, 8, 9].flatMap((rank) => n("dots", rank as NumberedRank))],
  [11, "three-dragons-eye", [...d("red"), ...d("green"), ...d("white"), ...n("dots", 9, 2)]],
  [12, "four-winds", [...w("east"), ...w("west"), ...w("south"), ...w("north")]],
  [13, "kong", [...n("bamboo", 7, 3), j("green")]],
]

describe("canonical 13-rank Advanced ladder", () => {
  it.each(fixtures)("scores rank %i %s", (rank, hand, cards) => {
    expect(HAND_RANKS[hand]).toBe(rank)
    expect(scoreHand(cards).total).toBe(rank)
    expect(kind(cards)).toBe(hand)
  })

  it("orders every rank above every lower rank", () => {
    const scores = fixtures.map(([, , cards]) => scoreHand(cards))
    for (let high = 1; high < scores.length; high += 1) {
      for (let low = 0; low < high; low += 1) {
        expect(compareHandScores(scores[high]!, scores[low]!)).toBeGreaterThan(0)
      }
    }
  })

  it("keeps the optimized scorer identical on random seven-card hands", () => {
    const random = new SeededRandom("canonical-strength-equivalence")
    const deck = createDeck()
    for (let sample = 0; sample < 5_000; sample += 1) {
      const cards = random.shuffle(deck).slice(0, 7)
      const full = scoreHand(cards)
      expect(scoreHandStrength(cards)).toEqual({ total: full.total, tieBreak: full.tieBreak })
    }
  })
})

describe("special-tile and natural-tile restrictions", () => {
  it("uses Jokers only in combinations of at least three cards", () => {
    expect(kind([...n("bamboo", 3), ...n("bamboo", 4), j("green")])).toBe("chow")
    expect(kind([...n("bamboo", 3), ...n("bamboo", 4), ...n("bamboo", 5), j("green")])).toBe("chow")
    expect(
      kind([
        ...n("characters", 3),
        ...n("characters", 4),
        ...n("characters", 5),
        ...n("characters", 6),
        j("red"),
      ]),
    ).toBe("long-chow")
    expect(kind([...n("bamboo", 3), j("green")])).toBe("high-card")
    expect(kind([...n("characters", 9, 3), j("red")])).toBe("kong")
    expect(kind([...n("characters", 9, 3), j("green")])).toBe("pung")
  })

  it("requires three distinct Winds, with no bird requirement", () => {
    expect(kind([...n("bamboo", 7), j("green")])).toBe("high-card")
    expect(kind([...w("east"), ...w("south"), ...w("west"), ...n("bamboo", 1)])).toBe("three-winds")
    expect(kind([...w("east"), ...w("south"), j("black"), ...n("bamboo", 1)])).toBe("three-winds")
    expect(kind([...w("north", 2), ...w("south"), ...n("bamboo", 1)])).not.toBe("three-winds")
    expect(kind([...w("east"), ...w("south"), ...w("west"), j("green")])).toBe("three-winds")
    expect(kind([...w("east"), ...w("south"), j("red"), ...n("bamboo", 1)])).not.toBe("three-winds")
  })

  it("allows the deck's black Joker in Four Winds", () => {
    expect(kind([...w("east"), ...w("south"), ...w("west"), j("black")])).toBe("four-winds")
    expect(kind([...w("east"), ...w("south"), ...w("west"), j("red")])).not.toBe("four-winds")
  })

  it("excludes Lotuses from the hand ladder (automatic wins are resolved by the engine)", () => {
    expect(kind([f("white-lotus"), j("black")])).toBe("high-card")
    expect(kind([f("white-lotus"), f("black-lotus")])).toBe("high-card")
    expect(kind([...n("dots", 2), f("white-lotus"), f("black-lotus"), ...n("bamboo", 9)])).toBe(
      "high-card",
    )
  })
})

describe("tie breakers", () => {
  it("orders Winds above Dragons above numbered 9 through 1", () => {
    expect(compareHandScores(scoreHand(w("east", 2)), scoreHand(d("red", 2)))).toBeGreaterThan(0)
    expect(
      compareHandScores(scoreHand(d("red", 2)), scoreHand(n("characters", 9, 2))),
    ).toBeGreaterThan(0)
    expect(
      compareHandScores(scoreHand(n("bamboo", 9, 2)), scoreHand(n("dots", 8, 2))),
    ).toBeGreaterThan(0)
  })

  it("compares all defining cards high to low", () => {
    expect(
      compareHandScores(
        scoreHand([...n("bamboo", 7, 3), ...n("dots", 9, 2)]),
        scoreHand([...n("bamboo", 7, 3), ...n("dots", 8, 2)]),
      ),
    ).toBeGreaterThan(0)
  })

  it("treats suits and honors within a tier equally", () => {
    expect(compareHandScores(scoreHand(n("bamboo", 2, 2)), scoreHand(n("dots", 2, 2)))).toBe(0)
    expect(compareHandScores(scoreHand(w("east", 2)), scoreHand(w("north", 2)))).toBe(0)
    expect(compareHandScores(scoreHand(d("red", 2)), scoreHand(d("white", 2)))).toBe(0)
  })
})

describe("Basic ladder and combination-first tie breaks", () => {
  it("omits expansion-only combinations and ranks Four Winds ninth", () => {
    expect(
      scoreHand([...w("east"), ...w("west"), ...w("south"), ...w("north")], "basic").total,
    ).toBe(9)
    expect(scoreHand([...n("dots", 5, 3), ...n("bamboo", 8, 2)], "basic").total).toBe(7)
  })
  it("compares the Chow before the pair, even when a lower Chow has Wind eyes", () => {
    const higher = scoreHand([
      ...n("bamboo", 6),
      ...n("bamboo", 7),
      ...n("bamboo", 8),
      ...n("dots", 1, 2),
    ])
    const lower = scoreHand([...n("dots", 2), ...n("dots", 3), ...n("dots", 4), ...w("east", 2)])
    expect(compareHandScores(higher, lower)).toBeGreaterThan(0)
  })
  it("ignores all unused high cards", () => {
    expect(
      compareHandScores(
        scoreHand([...w("east"), ...n("dots", 9)]),
        scoreHand([...w("north"), ...n("bamboo", 1)]),
      ),
    ).toBe(0)
  })
})

describe("calibrated mode-specific ladder", () => {
  it.each(["basic", "riichi"] as const)("uses Wind > Dragon > 9 > 1 for %s Pungs", (mode) => {
    const pungs = [w("east", 3), d("red", 3), n("dots", 9, 3), n("dots", 1, 3)]
    for (let i = 1; i < pungs.length; i++) {
      expect(
        compareHandScores(scoreHand(pungs[i - 1]!, mode), scoreHand(pungs[i]!, mode)),
      ).toBeGreaterThan(0)
    }
    expect(compareHandScores(scoreHand(w("east", 3), mode), scoreHand(w("north", 3), mode))).toBe(0)
  })

  it("keeps Basic Pung above Three Winds but reverses them in Riichi", () => {
    const pung = n("dots", 8, 3),
      winds = [...w("east"), ...w("south"), ...w("west")]
    expect(compareHandScores(scoreHand(pung, "basic"), scoreHand(winds, "basic"))).toBeGreaterThan(
      0,
    )
    expect(compareHandScores(scoreHand(pung, "riichi"), scoreHand(winds, "riichi"))).toBeLessThan(0)
  })
})
