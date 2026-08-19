import { describe, expect, it } from "vitest"
import {
  blankFace,
  dragonFace,
  flowerFace,
  jokerFace,
  numberedFace,
  windFace,
} from "../src/game/cards"
import { analyzeHandProgress, summarizeHandProgress } from "../src/game/hand-progress"
import { compareHandScores, describeScore, scoreHand } from "../src/game/scoring"
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
const blanks = (count: number): Card[] =>
  Array.from({ length: count }, () => ({ id: `c${serial++}`, ...blankFace() }))

function kind(cards: Card[]): HandKind {
  return scoreHand(cards).combinations[0]?.kind ?? "high-card"
}

describe("fixed five-card ladder", () => {
  const fixtures: Array<[number, HandKind, Card[]]> = [
    [1, "high-card", [...n("bamboo", 1), ...blanks(1)]],
    [2, "eye", n("bamboo", 7, 2)],
    [3, "chow", [...n("bamboo", 3), ...n("bamboo", 4), ...n("bamboo", 5)]],
    [
      4,
      "pure-suit",
      [...n("dots", 1), ...n("dots", 3), ...n("dots", 5), ...n("dots", 6), ...n("dots", 9)],
    ],
    [5, "two-eyes", [...n("bamboo", 3, 2), ...d("red", 2)]],
    [
      6,
      "chow-eye",
      [...n("characters", 2), ...n("characters", 3), ...n("characters", 4), ...d("white", 2)],
    ],
    [7, "pung", n("dots", 8, 3)],
    [8, "three-dragons", [...d("red"), ...d("green"), ...d("white")]],
    [9, "pung-eye", [...n("dots", 5, 3), ...n("bamboo", 8, 2)]],
    [10, "three-dragons-eye", [...d("red"), ...d("green"), ...d("white"), ...d("red", 2)]],
    [11, "four-winds", [...w("east"), ...w("south"), ...w("west"), ...w("north")]],
    [
      12,
      "dragon-dancer",
      [...n("bamboo", 3), ...n("bamboo", 4), ...n("bamboo", 5), ...d("green", 2)],
    ],
    [13, "kong", [...n("bamboo", 7, 3), j("green")]],
    [14, "crosswinds", [...w("east", 2), ...w("west", 2)]],
    [15, "bouquet", [f("plum"), f("orchid"), ...n("dots", 8, 2)]],
    [16, "imperial-garden", [f("plum"), f("orchid"), f("bamboo")]],
  ]

  it.each(fixtures)("scores rank %i %s", (rank, hand, cards) => {
    const score = scoreHand(cards)

    expect(score.total).toBe(rank)
    expect(kind(cards)).toBe(hand)
    expect(new Set(score.selectedCardIds).size).toBe(score.selectedCardIds.length)
  })

  it("returns only the highest available Hand", () => {
    const cards = [
      ...n("bamboo", 3),
      ...n("bamboo", 4),
      ...n("bamboo", 5),
      ...d("green", 2),
      ...n("dots", 9, 3),
    ]
    const score = scoreHand(cards)

    expect(score.total).toBe(12)
    expect(score.combinations.map((combination) => combination.kind)).toEqual(["dragon-dancer"])
  })

  it("does not reuse one physical card in a compound Hand", () => {
    const cards = [...n("bamboo", 3, 2), ...n("bamboo", 4), ...n("bamboo", 5), ...blanks(4)]

    expect(kind(cards)).toBe("chow")
  })

  it("describes the defining cards of the winning Hand", () => {
    const cards = [...n("bamboo", 3), ...n("bamboo", 4), ...n("bamboo", 5)]

    expect(describeScore(scoreHand(cards), cards)).toBe("Chow · 3-4-5 Bams (rank 3)")
  })
})

describe("Jokers", () => {
  it("completes eligible Hands of three or more cards", () => {
    expect(kind([...n("bamboo", 3), ...n("bamboo", 4), j("green")])).toBe("chow")
    expect(kind([...d("red"), ...d("green"), j("blue")])).toBe("three-dragons")
    expect(kind([...w("east"), ...w("south"), ...w("west"), j("black")])).toBe("four-winds")
  })

  it("never forms an Eye, Two Eyes, Dragon Eye, or Crosswinds", () => {
    expect(kind([...n("bamboo", 3), j("green")])).toBe("high-card")
    expect(kind([...n("bamboo", 3, 2), ...n("dots", 4), j("blue")])).toBe("eye")
    expect(
      kind([...n("bamboo", 3), ...n("bamboo", 4), ...n("bamboo", 5), ...d("green"), j("green")]),
    ).toBe("chow")
    expect(kind([...w("east", 2), ...w("west"), j("black")])).not.toBe("crosswinds")
  })

  it("requires an appropriately colored Joker for a Kong", () => {
    expect(kind([...n("characters", 9, 3), j("red")])).toBe("kong")
    expect(kind([...n("characters", 9, 3), j("green")])).toBe("pung")
  })

  it("lets only the Black Joker complete Imperial Garden", () => {
    expect(kind([f("plum"), f("orchid"), j("black")])).toBe("imperial-garden")
    expect(kind([f("plum"), f("orchid"), j("red")])).toBe("high-card")
    expect(kind([f("plum"), j("black")])).toBe("high-card")
  })

  it("gives a lone Flower no ordinary Hand value", () => {
    const numberedHigh = scoreHand([...n("dots", 9), f("chrysanthemum")])
    const onlyFlower = scoreHand([f("chrysanthemum")])

    expect(numberedHigh.total).toBe(1)
    expect(numberedHigh.selectedCardIds).toHaveLength(1)
    expect(onlyFlower.selectedCardIds).toHaveLength(0)
  })
})

describe("tie breakers", () => {
  it("compares numbered values while treating suits as equal", () => {
    const low = scoreHand(n("bamboo", 2, 2))
    const equal = scoreHand(n("dots", 2, 2))
    const high = scoreHand(n("characters", 9, 2))

    expect(compareHandScores(low, equal)).toBe(0)
    expect(compareHandScores(high, low)).toBeGreaterThan(0)
  })

  it("compares a compound Hand's main meld before its Eye", () => {
    const highMain = scoreHand([
      ...n("bamboo", 7),
      ...n("bamboo", 8),
      ...n("bamboo", 9),
      ...n("dots", 1, 2),
    ])
    const highEye = scoreHand([
      ...n("characters", 1),
      ...n("characters", 2),
      ...n("characters", 3),
      ...w("east", 2),
    ])

    expect(compareHandScores(highMain, highEye)).toBeGreaterThan(0)
  })

  it("treats all Dragons and all Winds as equal", () => {
    expect(compareHandScores(scoreHand(d("red", 2)), scoreHand(d("white", 2)))).toBe(0)
    expect(compareHandScores(scoreHand(w("east", 2)), scoreHand(w("north", 2)))).toBe(0)
  })

  it("uses Flower identities above Winds to break Flower-hand ties", () => {
    const low = scoreHand([f("plum"), f("orchid"), ...n("dots", 2, 2)])
    const high = scoreHand([f("bamboo"), f("chrysanthemum"), ...n("dots", 2, 2)])

    expect(compareHandScores(high, low)).toBeGreaterThan(0)
  })
})

describe("hand progress", () => {
  it("reports current best and the closest stronger Hand from the ladder definitions", () => {
    const cards = [...n("bamboo", 3), ...n("bamboo", 4), ...n("dots", 7)]
    const summary = summarizeHandProgress(cards)

    expect(summary.currentBest).toMatchObject({ kind: "high-card", rank: 1, missing: 0 })
    expect(summary.nextClosest).toMatchObject({ kind: "chow", rank: 3, missing: 1 })
  })

  it("uses the same Joker restrictions when measuring cards away", () => {
    const cards = [...w("east", 2), ...w("west"), j("black")]
    const crosswinds = analyzeHandProgress(cards).find((hand) => hand.kind === "crosswinds")
    const fourWinds = analyzeHandProgress(cards).find((hand) => hand.kind === "four-winds")

    expect(crosswinds).toMatchObject({ missing: 1 })
    expect(fourWinds).toMatchObject({ missing: 1 })
  })

  it("recognizes that a natural Pung is one card away from Kong", () => {
    const summary = summarizeHandProgress(n("dots", 6, 3))

    expect(summary.currentBest).toMatchObject({ kind: "pung", rank: 7 })
    expect(summary.nextClosest).toMatchObject({ kind: "kong", rank: 13, missing: 1 })
  })

  it("derives Flower-hand distance from the same pattern definitions", () => {
    const progress = analyzeHandProgress([f("plum"), f("orchid")])

    expect(progress.find((hand) => hand.kind === "bouquet")).toMatchObject({ missing: 2 })
    expect(progress.find((hand) => hand.kind === "imperial-garden")).toMatchObject({ missing: 1 })

    const completed = analyzeHandProgress([f("plum"), f("orchid"), ...n("dots", 4, 2)])
    expect(completed.find((hand) => hand.kind === "bouquet")).toMatchObject({ missing: 0 })
  })
})
