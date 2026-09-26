import { createDeck, dragonFace, faceKey, numberedFace, windFace } from "./cards"
import { HAND_RANKS } from "./hand-ranks"
import { scoreHand } from "./scoring"
import {
  DRAGONS,
  SUITS,
  WINDS,
  type Card,
  type CardFace,
  type CombinationKind,
  type HandKind,
  type HandProgressSummary,
  type Suit,
} from "./types"

interface Requirement {
  face: CardFace
  key: string
  naturalOnly: boolean
}

interface PreparedCards {
  natural: Array<{ card: Card; key: string }>
  jokers: Card[]
}

interface HandDefinition {
  kind: CombinationKind
  label: string
  size: number
  alternatives?: Requirement[][]
}

const naturalFaces = uniqueNaturalFaces()
const eyeAlternatives = naturalFaces.map((face) => repeat(face, 2, true))
const chowAlternatives = SUITS.flatMap((suit) =>
  Array.from({ length: 7 }, (_, index) => chowRequirements(suit, index + 1)),
)
const definitions: HandDefinition[] = [
  exactDefinition("eye", "Eye", 2, eyeAlternatives),
  exactDefinition("chow", "Chow", 3, chowAlternatives),
  exactDefinition("two-eyes", "Two Eyes", 4, twoEyeAlternatives()),
  exactDefinition("chow-eye", "Chow + Eye", 5, [...compoundAlternatives(chowAlternatives, true)]),
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
  exactDefinition("three-winds", "Three Winds", 3, threeWindsAlternatives()),
  exactDefinition("four-winds", "Four Winds", 4, [
    WINDS.map((wind) => requirement(windFace(wind), false)),
  ]),
  exactDefinition(
    "kong",
    "Kong",
    4,
    naturalFaces.map((face) => repeat(face, 4, false)),
  ),
  exactDefinition(
    "three-dragons-eye",
    "Three Dragons + Eye",
    5,
    naturalFaces.map((face) => [
      ...DRAGONS.map((dragon) => requirement(dragonFace(dragon), false)),
      ...repeat(face, 2, true),
    ]),
  ),
]

export function analyzeHandProgress(
  cards: readonly Card[],
  mode: "basic" | "riichi" = "riichi",
): HandProgressSummary[] {
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
    if (mode === "basic" && ["pung-eye", "three-dragons-eye", "kong"].includes(definition.kind))
      continue
    const match = bestAlternativeMatch(cards, definition.alternatives!)
    evaluations.push({
      kind: definition.kind,
      label: definition.label,
      rank: mode === "basic" && definition.kind === "four-winds" ? 9 : HAND_RANKS[definition.kind],
      size: definition.size,
      missing: definition.size - match.length,
      matchedCardIds: match,
    })
  }

  return evaluations.sort((left, right) => right.rank - left.rank)
}

export function summarizeHandProgress(
  cards: readonly Card[],
  mode: "basic" | "riichi" = "riichi",
): {
  currentBest: HandProgressSummary
  nextClosest: HandProgressSummary | null
} {
  const score = scoreHand(cards, mode)
  const kind = score.combinations[0]?.kind ?? "high-card"
  const currentBest = { ...summarizeKind(cards, kind), rank: score.total }
  const nextClosest =
    analyzeHandProgress(cards, mode)
      .filter((candidate) => candidate.rank > currentBest.rank)
      .sort((left, right) => left.missing - right.missing || right.rank - left.rank)[0] ?? null

  return { currentBest, nextClosest }
}

function summarizeKind(cards: readonly Card[], kind: HandKind): HandProgressSummary {
  if (kind === "high-card") {
    const highCard = cards
      .filter((card) => card.kind !== "blank" && card.kind !== "joker" && card.kind !== "flower")
      .sort(
        (left, right) => cardValue(right) - cardValue(left) || left.id.localeCompare(right.id),
      )[0]

    return {
      kind,
      label: "High Card",
      rank: HAND_RANKS[kind],
      size: 1,
      missing: 0,
      matchedCardIds: highCard ? [highCard.id] : [],
    }
  }

  const definition = definitions.find((candidate) => candidate.kind === kind)!
  const matchedCardIds = bestAlternativeMatch(cards, definition.alternatives!)

  return {
    kind,
    label: definition.label,
    rank: HAND_RANKS[kind],
    size: definition.size,
    missing: definition.size - matchedCardIds.length,
    matchedCardIds,
  }
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
  return { face, key: faceKey(face), naturalOnly }
}

function repeat(face: CardFace, count: number, naturalOnly: boolean): Requirement[] {
  return Array.from({ length: count }, () => requirement(face, naturalOnly))
}

function chowRequirements(suit: Suit, start: number): Requirement[] {
  return runRequirements(suit, start, 3)
}

function runRequirements(suit: Suit, start: number, length: number): Requirement[] {
  return Array.from({ length }, (_, offset) =>
    requirement(numberedFace(suit, (start + offset) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9), false),
  )
}

function twoEyeAlternatives(): Requirement[][] {
  const normal = naturalFaces.flatMap((left, leftIndex) =>
    naturalFaces
      .slice(leftIndex + 1)
      .map((right) => [...repeat(left, 2, true), ...repeat(right, 2, true)]),
  )
  return normal
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

function threeWindsAlternatives(): Requirement[][] {
  return WINDS.map((omitted) =>
    WINDS.filter((wind) => wind !== omitted).map((wind) => requirement(windFace(wind), false)),
  )
}

function bestAlternativeMatch(
  cards: readonly Card[],
  alternatives: readonly Requirement[][],
): string[] {
  const prepared = prepareCards(cards)
  let bestTargets: readonly Requirement[] | null = null
  let bestCount = 0

  for (const targets of alternatives) {
    const count = targetMatchCount(prepared, targets)

    if (count > bestCount) {
      bestTargets = targets
      bestCount = count
    }
  }

  return bestTargets ? targetMatchedIds(prepared, bestTargets) : []
}

function prepareCards(cards: readonly Card[]): PreparedCards {
  return {
    natural: cards
      .filter((card) => card.kind !== "blank" && card.kind !== "joker")
      .map((card) => ({ card, key: faceKey(card) })),
    jokers: cards.filter((card) => card.kind === "joker"),
  }
}

function targetMatchCount(prepared: PreparedCards, targets: readonly Requirement[]): number {
  let usedTargets = 0
  let matched = 0

  for (const card of prepared.natural) {
    const targetIndex = findNaturalTarget(card.key, targets, usedTargets)

    if (targetIndex >= 0) {
      usedTargets |= 1 << targetIndex
      matched += 1
    }
  }

  for (const joker of prepared.jokers) {
    const targetIndex = findJokerTarget(joker, targets, usedTargets)

    if (targetIndex >= 0) {
      usedTargets |= 1 << targetIndex
      matched += 1
    }
  }

  return matched
}

function targetMatchedIds(prepared: PreparedCards, targets: readonly Requirement[]): string[] {
  let usedTargets = 0
  const matched: string[] = []

  for (const natural of prepared.natural) {
    const targetIndex = findNaturalTarget(natural.key, targets, usedTargets)

    if (targetIndex >= 0) {
      usedTargets |= 1 << targetIndex
      matched.push(natural.card.id)
    }
  }

  for (const joker of prepared.jokers) {
    const targetIndex = findJokerTarget(joker, targets, usedTargets)

    if (targetIndex >= 0) {
      usedTargets |= 1 << targetIndex
      matched.push(joker.id)
    }
  }

  return matched
}

function findNaturalTarget(
  cardKey: string,
  targets: readonly Requirement[],
  usedTargets: number,
): number {
  for (let pass = 0; pass < 2; pass += 1) {
    const naturalOnly = pass === 0

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index]!

      if (
        (usedTargets & (1 << index)) === 0 &&
        target.naturalOnly === naturalOnly &&
        target.key === cardKey
      ) {
        return index
      }
    }
  }

  return -1
}

function findJokerTarget(
  joker: Card,
  targets: readonly Requirement[],
  usedTargets: number,
): number {
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]!

    if (
      (usedTargets & (1 << index)) === 0 &&
      !target.naturalOnly &&
      target.face.color === joker.color
    ) {
      return index
    }
  }

  return -1
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
        : 0
}
