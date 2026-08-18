import {
  createDeck,
  dragonFace,
  faceKey,
  flowerFace,
  jokerCanRepresent,
  numberedFace,
  windFace,
} from "./cards"
import { HAND_RANKS } from "./rules"
import { scoreHand } from "./scoring"
import {
  DRAGONS,
  FLOWERS,
  SUITS,
  WINDS,
  type Card,
  type CardFace,
  type CombinationKind,
  type HandProgressSummary,
  type Suit,
} from "./types"

interface Requirement {
  face: CardFace
  naturalOnly: boolean
}

interface HandDefinition {
  kind: CombinationKind
  label: string
  size: number
  alternatives?: Requirement[][]
}

const naturalFaces = uniqueNaturalFaces()
const chowAlternatives = SUITS.flatMap((suit) =>
  Array.from({ length: 7 }, (_, index) => chowRequirements(suit, index + 1)),
)
const definitions: HandDefinition[] = [
  exactDefinition(
    "eye",
    "Eye",
    2,
    naturalFaces.map((face) => repeat(face, 2, true)),
  ),
  exactDefinition("chow", "Chow", 3, chowAlternatives),
  { kind: "pure-suit", label: "Pure Suit", size: 5 },
  exactDefinition("two-eyes", "Two Eyes", 4, twoEyeAlternatives()),
  exactDefinition("chow-eye", "Chow + Eye", 5, compoundAlternatives(chowAlternatives, true)),
  exactDefinition(
    "pung",
    "Pung",
    3,
    naturalFaces.map((face) => repeat(face, 3, false)),
  ),
  exactDefinition("three-dragons", "Three Dragons", 3, [
    DRAGONS.map((dragon) => requirement(dragonFace(dragon), false)),
  ]),
  exactDefinition("pung-eye", "Pung + Eye", 5, pungEyeAlternatives()),
  exactDefinition(
    "three-dragons-eye",
    "Three Dragons + Eye",
    5,
    naturalFaces.map((face) => [
      ...DRAGONS.map((dragon) => requirement(dragonFace(dragon), false)),
      ...repeat(face, 2, true),
    ]),
  ),
  exactDefinition("four-winds", "Four Winds", 4, [
    WINDS.map((wind) => requirement(windFace(wind), false)),
  ]),
  exactDefinition("dragon-dancer", "Dragon Dancer", 5, dragonDancerAlternatives()),
  exactDefinition(
    "kong",
    "Kong",
    4,
    naturalFaces.map((face) => repeat(face, 4, false)),
  ),
  exactDefinition("crosswinds", "Crosswinds", 4, [
    [...repeat(windFace("east"), 2, true), ...repeat(windFace("west"), 2, true)],
    [...repeat(windFace("north"), 2, true), ...repeat(windFace("south"), 2, true)],
  ]),
  exactDefinition("bouquet", "Bouquet", 2, distinctFlowerAlternatives(2)),
  exactDefinition("imperial-garden", "Imperial Garden", 3, distinctFlowerAlternatives(3)),
]

export function analyzeHandProgress(cards: readonly Card[]): HandProgressSummary[] {
  const highCard = cards
    .filter((card) => card.kind !== "blank" && card.kind !== "joker" && card.kind !== "flower")
    .sort((left, right) => cardValue(right) - cardValue(left) || left.id.localeCompare(right.id))[0]
  const evaluations: HandProgressSummary[] = [
    {
      kind: "high-card",
      label: "High Card",
      rank: HAND_RANKS["high-card"],
      size: 1,
      missing: 0,
      matchedCardIds: highCard ? [highCard.id] : [],
    },
  ]

  for (const definition of definitions) {
    const match =
      definition.kind === "pure-suit"
        ? bestPureSuitMatch(cards)
        : bestAlternativeMatch(cards, definition.alternatives!)
    evaluations.push({
      kind: definition.kind,
      label: definition.label,
      rank: HAND_RANKS[definition.kind],
      size: definition.size,
      missing: definition.size - match.length,
      matchedCardIds: match,
    })
  }

  return evaluations.sort((left, right) => right.rank - left.rank)
}

export function summarizeHandProgress(cards: readonly Card[]): {
  currentBest: HandProgressSummary
  nextClosest: HandProgressSummary | null
} {
  const evaluations = analyzeHandProgress(cards)
  const score = scoreHand(cards)
  const kind = score.combinations[0]?.kind ?? "high-card"
  const currentBest = evaluations.find((evaluation) => evaluation.kind === kind)!
  const nextClosest =
    evaluations
      .filter((evaluation) => evaluation.rank > currentBest.rank && evaluation.missing > 0)
      .sort(
        (left, right) =>
          left.missing - right.missing || right.rank - left.rank || left.size - right.size,
      )[0] ?? null

  return { currentBest, nextClosest }
}

function exactDefinition(
  kind: CombinationKind,
  label: string,
  size: number,
  alternatives: Requirement[][],
): HandDefinition {
  return { kind, label, size, alternatives }
}

function requirement(face: CardFace, naturalOnly: boolean): Requirement {
  return { face, naturalOnly }
}

function repeat(face: CardFace, count: number, naturalOnly: boolean): Requirement[] {
  return Array.from({ length: count }, () => requirement(face, naturalOnly))
}

function chowRequirements(suit: Suit, start: number): Requirement[] {
  return [
    requirement(numberedFace(suit, start as 1 | 2 | 3 | 4 | 5 | 6 | 7), false),
    requirement(numberedFace(suit, (start + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8), false),
    requirement(numberedFace(suit, (start + 2) as 3 | 4 | 5 | 6 | 7 | 8 | 9), false),
  ]
}

function twoEyeAlternatives(): Requirement[][] {
  return naturalFaces.flatMap((left, leftIndex) =>
    naturalFaces
      .slice(leftIndex + 1)
      .map((right) => [...repeat(left, 2, true), ...repeat(right, 2, true)]),
  )
}

function compoundAlternatives(
  mainAlternatives: readonly Requirement[][],
  allowSameFace: boolean,
): Requirement[][] {
  return mainAlternatives.flatMap((main) =>
    naturalFaces
      .filter(
        (face) => allowSameFace || !main.some((target) => faceKey(target.face) === faceKey(face)),
      )
      .map((face) => [...main, ...repeat(face, 2, true)]),
  )
}

function pungEyeAlternatives(): Requirement[][] {
  return naturalFaces.flatMap((pung) =>
    naturalFaces
      .filter((eye) => faceKey(eye) !== faceKey(pung))
      .map((eye) => [...repeat(pung, 3, false), ...repeat(eye, 2, true)]),
  )
}

function dragonDancerAlternatives(): Requirement[][] {
  return SUITS.flatMap((suit) => {
    const dragon = dragonFace(suit === "bamboo" ? "green" : suit === "dots" ? "white" : "red")

    return Array.from({ length: 7 }, (_, index) => [
      ...chowRequirements(suit, index + 1),
      ...repeat(dragon, 2, true),
    ])
  })
}

function distinctFlowerAlternatives(count: 2 | 3): Requirement[][] {
  const alternatives: Requirement[][] = []
  const choose = (start: number, selected: number[]): void => {
    if (selected.length === count) {
      alternatives.push(
        selected.map((index) => requirement(flowerFace(FLOWERS[index]!), count === 2)),
      )

      return
    }

    for (let index = start; index <= FLOWERS.length - (count - selected.length); index += 1) {
      selected.push(index)
      choose(index + 1, selected)
      selected.pop()
    }
  }

  choose(0, [])

  return alternatives
}

function bestAlternativeMatch(
  cards: readonly Card[],
  alternatives: readonly Requirement[][],
): string[] {
  let best: string[] = []

  for (const targets of alternatives) {
    const matched = bestTargetMatch(cards, targets)

    if (matched.length > best.length) {
      best = matched
    }
  }

  return best
}

function bestTargetMatch(cards: readonly Card[], targets: readonly Requirement[]): string[] {
  const available = targets.map((target, index) => ({ ...target, index }))
  const matched: string[] = []
  const naturalCards = cards.filter((card) => card.kind !== "blank" && card.kind !== "joker")

  for (const card of naturalCards) {
    const matching = available
      .filter((target) => faceKey(card) === faceKey(target.face))
      .sort((left, right) => Number(right.naturalOnly) - Number(left.naturalOnly))[0]

    if (!matching) {
      continue
    }

    available.splice(
      available.findIndex((target) => target.index === matching.index),
      1,
    )
    matched.push(card.id)
  }

  for (const joker of cards.filter((card) => card.kind === "joker")) {
    const targetIndex = available.findIndex(
      (target) => !target.naturalOnly && jokerCanRepresent(joker, target.face),
    )

    if (targetIndex < 0) {
      continue
    }

    available.splice(targetIndex, 1)
    matched.push(joker.id)
  }

  return matched
}

function bestPureSuitMatch(cards: readonly Card[]): string[] {
  return SUITS.map((suit) =>
    cards
      .filter(
        (card) =>
          (card.kind === "numbered" && card.suit === suit) ||
          (card.kind === "joker" && jokerCanRepresent(card, numberedFace(suit, 9))),
      )
      .slice(0, 5)
      .map((card) => card.id),
  ).sort((left, right) => right.length - left.length)[0]!
}

function uniqueNaturalFaces(): CardFace[] {
  const byFace = new Map<string, CardFace>()

  for (const card of createDeck()) {
    if (card.kind === "blank" || card.kind === "joker" || card.kind === "flower") {
      continue
    }

    const { id: _id, ...face } = card
    byFace.set(faceKey(face), face)
  }

  return [...byFace.values()]
}

function cardValue(card: CardFace | Card): number {
  return card.kind === "numbered"
    ? card.rank
    : card.kind === "dragon"
      ? 10
      : card.kind === "wind"
        ? 11
        : card.kind === "flower"
          ? 12 + FLOWERS.indexOf(card.flower)
          : 0
}
