import { describe, expect, it } from "vitest"
import { blankFace, dragonFace, jokerFace, numberedFace, windFace } from "../src/game/cards"
import { evaluateSpecialHands } from "../src/game/patterns"
import { scoreHand } from "../src/game/scoring"
import type { Card, Dragon, JokerColor, SpecialHandId, Suit, Wind } from "../src/game/types"

let serial = 0
const n = (suit: Suit, rank: number, count = 1): Card[] =>
  Array.from({ length: count }, () => ({ id: `c${serial++}`, ...numberedFace(suit, rank as 1) }))
const d = (dragon: Dragon, count = 1): Card[] =>
  Array.from({ length: count }, () => ({ id: `c${serial++}`, ...dragonFace(dragon) }))
const w = (wind: Wind, count = 1): Card[] =>
  Array.from({ length: count }, () => ({ id: `c${serial++}`, ...windFace(wind) }))
const j = (color: JokerColor): Card => ({ id: `c${serial++}`, ...jokerFace(color) })
const blanks = (count: number): Card[] =>
  Array.from({ length: count }, () => ({ id: `c${serial++}`, ...blankFace() }))

function has(cards: Card[], special: SpecialHandId) {
  return scoreHand(cards, [special]).combinations.some(
    (combination) => combination.kind === special,
  )
}

describe("basic scoring", () => {
  it("scores disjoint Eye, Chow, and Pung combinations", () => {
    const cards = [
      ...n("bamboo", 2, 2),
      ...n("dots", 3),
      ...n("dots", 4),
      ...n("dots", 5),
      ...d("red", 3),
      ...blanks(4),
    ]
    const score = scoreHand(cards, [])
    expect(score.total).toBe(11)
    expect(score.combinations.map((value) => value.kind)).toEqual(
      expect.arrayContaining(["eye", "chow", "pung"]),
    )
  })

  it("lets a colored Joker complete a Chow but never an Eye", () => {
    const chow = scoreHand([...n("bamboo", 3), ...n("bamboo", 4), j("green"), ...blanks(5)], [])
    expect(chow.combinations.some((value) => value.kind === "chow")).toBe(true)
    const eye = scoreHand([...n("bamboo", 3), j("green"), ...blanks(6)], [])
    expect(eye.combinations.some((value) => value.kind === "eye")).toBe(false)
  })

  it("requires a Joker for a Kong because only three natural copies exist", () => {
    const score = scoreHand([...n("characters", 9, 3), j("red"), ...blanks(4)], [])
    expect(score.combinations.some((value) => value.kind === "kong" && value.score === 20)).toBe(
      true,
    )
  })

  it("scores Three Dragons and Four Winds", () => {
    const score = scoreHand(
      [
        ...d("red"),
        ...d("green"),
        ...d("white"),
        ...w("east"),
        ...w("south"),
        ...w("west"),
        ...w("north"),
        ...blanks(1),
      ],
      [],
    )
    expect(score.total).toBe(25)
  })
})

describe("all special hand cards", () => {
  const fixtures: Array<[SpecialHandId, Card[]]> = [
    [
      "sisters",
      [
        ...n("bamboo", 3),
        ...n("bamboo", 4),
        ...n("bamboo", 5),
        ...n("dots", 3),
        ...n("dots", 4),
        ...n("dots", 5),
        ...blanks(2),
      ],
    ],
    [
      "terminals-honors",
      [
        ...n("bamboo", 1),
        ...n("dots", 9),
        ...n("characters", 1),
        ...d("red"),
        ...d("green"),
        ...w("east"),
        ...w("south"),
        ...w("north"),
      ],
    ],
    [
      "eight-blessings",
      [
        ...n("bamboo", 2),
        ...n("bamboo", 4),
        ...n("dots", 6),
        ...n("dots", 8),
        ...n("characters", 2),
        ...n("characters", 4),
        ...n("characters", 6),
        ...n("characters", 8),
      ],
    ],
    [
      "four-treasures",
      [
        ...n("bamboo", 1),
        ...n("bamboo", 2),
        ...n("bamboo", 3),
        ...n("bamboo", 4),
        ...n("bamboo", 5),
        ...n("bamboo", 6),
        ...d("green", 2),
      ],
    ],
    ["four-eyes", [...n("bamboo", 2, 2), ...n("dots", 5, 2), ...d("red", 2), ...w("east", 2)]],
    [
      "staircase",
      [
        ...n("bamboo", 1),
        ...n("bamboo", 2),
        ...n("bamboo", 3),
        ...n("bamboo", 4),
        ...n("bamboo", 5),
        ...n("bamboo", 6),
        ...blanks(2),
      ],
    ],
    [
      "twin-gates",
      [
        ...n("dots", 1),
        ...n("dots", 2),
        ...n("dots", 3),
        ...n("dots", 7),
        ...n("dots", 8),
        ...n("dots", 9),
        ...blanks(2),
      ],
    ],
    [
      "mirror-chows",
      [...n("characters", 3, 2), ...n("characters", 4, 2), ...n("characters", 5, 2), ...blanks(2)],
    ],
    ["crossing-winds", [...w("north", 2), ...w("south", 2), ...blanks(4)]],
    ["heavenly-honors", [...d("red", 2), ...d("green", 2), ...w("east", 2), ...w("west", 2)]],
    ["brothers", [...n("bamboo", 5, 3), ...n("dots", 5, 3), ...blanks(2)]],
    [
      "rainbow-eyes",
      [...n("bamboo", 5, 2), ...n("dots", 5, 2), ...n("characters", 5, 2), ...blanks(2)],
    ],
    [
      "dragon-dance",
      [
        ...d("green", 2),
        ...n("bamboo", 1),
        ...n("bamboo", 2),
        ...n("bamboo", 3),
        ...n("bamboo", 4),
        ...n("bamboo", 5),
        ...n("bamboo", 6),
      ],
    ],
    ["raging-winds", [...w("east", 3), ...w("west", 3), ...blanks(2)]],
    ["four-winds-at-peace", [...w("east", 2), ...w("south", 2), ...w("west", 2), ...w("north", 2)]],
  ]

  it.each(fixtures)("recognizes %s", (special, cards) => {
    expect(has(cards, special)).toBe(true)
  })

  it("only scores active special cards", () => {
    const cards = fixtures.find(([name]) => name === "staircase")![1]
    expect(scoreHand(cards, []).combinations.some((value) => value.kind === "staircase")).toBe(
      false,
    )
  })

  it("scores each active Special Hand Card at most once", () => {
    const cards = [...w("east", 2), ...w("west", 2), ...w("north", 2), ...w("south", 2)]
    const score = scoreHand(cards, ["crossing-winds"])
    expect(score.combinations.filter((value) => value.kind === "crossing-winds")).toHaveLength(1)
    expect(score.total).toBe(32)
  })

  it("checks completed special patterns from highest score to lowest", () => {
    const cards = [...w("east", 2), ...w("south", 2), ...w("west", 2), ...w("north", 2)]
    const score = scoreHand(cards, ["four-eyes", "crossing-winds", "four-winds-at-peace"])

    expect(score.total).toBe(70)
    expect(score.combinations.map((combination) => combination.kind)).toEqual([
      "four-winds-at-peace",
    ])
  })

  it("uses the same pattern matcher to report tiles away", () => {
    const cards = [
      ...n("bamboo", 1),
      ...n("bamboo", 2),
      ...n("bamboo", 3),
      ...n("bamboo", 4),
      ...n("bamboo", 5),
      ...blanks(3),
    ]
    const evaluation = evaluateSpecialHands(cards, ["staircase"])[0]!

    expect(evaluation.missing).toBe(1)
    expect(evaluation.matchingMasks).toHaveLength(0)

    cards[5] = n("bamboo", 6)[0]!
    const complete = evaluateSpecialHands(cards, ["staircase"])[0]!

    expect(complete.missing).toBe(0)
    expect(scoreHand(cards, ["staircase"]).total).toBe(20)
  })

  it("does not treat Jokers as loose terminals in Terminals & Honors", () => {
    const cards = [
      ...n("bamboo", 1),
      ...n("dots", 9),
      ...n("characters", 1),
      ...d("red"),
      ...d("green"),
      ...w("east"),
      ...w("south"),
      j("black"),
    ]
    expect(has(cards, "terminals-honors")).toBe(false)
  })
})
