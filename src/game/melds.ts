import {
  cardLabel,
  dragonFace,
  faceKey,
  flowerFace,
  jokerCanRepresent,
  numberedFace,
  suitLabel,
  windFace,
} from "./cards"
import { HAND_RANKS } from "./rules"
import {
  DRAGONS,
  FLOWERS,
  SUITS,
  WINDS,
  type Card,
  type CardFace,
  type CombinationKind,
  type ScoredCombination,
  type Suit,
} from "./types"

export interface HandCandidate extends ScoredCombination {
  mask: number
  tieBreak: number[]
}

interface ChowIdentity {
  suit: Suit
  start: number
}

const dragonTargets = DRAGONS.map(dragonFace)
const windTargets = WINDS.map(windFace)
const flowerTargets = FLOWERS.map(flowerFace)

export function generateHandCandidates(cards: readonly Card[]): HandCandidate[] {
  const candidates: HandCandidate[] = []

  for (const size of [2, 3, 4, 5]) {
    forEachSubset(cards.length, size, (indexes, mask) => {
      const subset = indexes.map((index) => cards[index]!)

      if (size === 2) {
        addEye(subset, mask, candidates)
      }

      if (size === 3) {
        addChow(subset, mask, candidates)
        addIdentical("pung", "Pung", subset, mask, candidates)
        addImperialGarden(subset, mask, candidates)

        if (matchesTargets(subset, dragonTargets)) {
          candidates.push(
            candidate(
              "three-dragons",
              "Three Dragons",
              subset,
              mask,
              [10, 10, 10],
              "Three Dragons",
            ),
          )
        }
      }

      if (size === 4) {
        addTwoEyes(subset, mask, candidates)
        addFourWinds(subset, mask, candidates)
        addKong(subset, mask, candidates)
        addCrosswinds(subset, mask, candidates)
        addBouquet(subset, mask, candidates)
      }

      if (size === 5) {
        addPureSuit(subset, mask, candidates)
        addCompoundHands(subset, mask, candidates)
      }
    })
  }

  return deduplicate(candidates)
}

function addBouquet(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const flowers = cards.filter((card) => card.kind === "flower")
  const eyeCards = cards.filter((card) => card.kind !== "flower")
  const eye = naturalPairFace(eyeCards)

  if (flowers.length !== 2 || new Set(flowers.map((card) => card.flower)).size !== 2 || !eye) {
    return
  }

  candidates.push(
    candidate(
      "bouquet",
      "Bouquet",
      cards,
      mask,
      [...flowerTieBreak(flowers), faceValue(eye), faceValue(eye)],
      `Bouquet · ${flowers.map(cardLabel).join(" + ")} + Eye · ${cardLabel(eye)}`,
    ),
  )
}

function addImperialGarden(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  if (!matchesAnyDistinctFlowers(cards, 3)) {
    return
  }

  candidates.push(
    candidate(
      "imperial-garden",
      "Imperial Garden",
      cards,
      mask,
      flowerTieBreak(cards),
      `Imperial Garden · ${cards.map(cardLabel).join(" + ")}`,
    ),
  )
}

function matchesAnyDistinctFlowers(cards: Card[], count: 2 | 3): boolean {
  let matched = false

  forEachSubset(flowerTargets.length, count, (indexes) => {
    if (
      matchesTargets(
        cards,
        indexes.map((index) => flowerTargets[index]!),
      )
    ) {
      matched = true
    }
  })

  return matched
}

function flowerTieBreak(cards: Card[]): number[] {
  return cards
    .map((card) => (card.kind === "flower" ? 12 + FLOWERS.indexOf(card.flower) : 12))
    .sort((left, right) => right - left)
}

function addEye(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const face = naturalPairFace(cards)

  if (!face) {
    return
  }

  const value = faceValue(face)
  candidates.push(candidate("eye", "Eye", cards, mask, [value, value], `Eye · ${cardLabel(face)}`))
}

function addChow(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const chow = chowIdentity(cards)

  if (!chow) {
    return
  }

  candidates.push(
    candidate(
      "chow",
      "Chow",
      cards,
      mask,
      chowTieBreak(chow),
      `Chow · ${chow.start}-${chow.start + 1}-${chow.start + 2} ${suitLabel(chow.suit)}`,
    ),
  )
}

function addIdentical(
  kind: "pung",
  label: string,
  cards: Card[],
  mask: number,
  candidates: HandCandidate[],
): void {
  const face = identicalFace(cards)

  if (!face) {
    return
  }

  const value = faceValue(face)
  candidates.push(
    candidate(
      kind,
      label,
      cards,
      mask,
      Array.from({ length: cards.length }, () => value),
      `${label} · ${cardLabel(face)}`,
    ),
  )
}

function addTwoEyes(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const faces = naturalPairFaces(cards)

  if (faces.length !== 2 || faceKey(faces[0]!) === faceKey(faces[1]!)) {
    return
  }

  faces.sort((left, right) => faceValue(right) - faceValue(left))
  const values = faces.flatMap((face) => [faceValue(face), faceValue(face)])
  candidates.push(
    candidate(
      "two-eyes",
      "Two Eyes",
      cards,
      mask,
      values,
      `Two Eyes · ${faces.map(cardLabel).join(" + ")}`,
    ),
  )
}

function addFourWinds(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  if (!matchesTargets(cards, windTargets)) {
    return
  }

  candidates.push(
    candidate("four-winds", "Four Winds", cards, mask, [11, 11, 11, 11], "Four Winds"),
  )
}

function addKong(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  if (!cards.some((card) => card.kind === "joker")) {
    return
  }

  const face = identicalFace(cards)

  if (!face) {
    return
  }

  const value = faceValue(face)
  candidates.push(
    candidate(
      "kong",
      "Kong",
      cards,
      mask,
      [value, value, value, value],
      `Kong · ${cardLabel(face)}`,
    ),
  )
}

function addCrosswinds(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  if (cards.some((card) => card.kind !== "wind")) {
    return
  }

  const counts = new Map(cards.map((card) => [faceKey(card), 0]))

  for (const card of cards) {
    counts.set(faceKey(card), (counts.get(faceKey(card)) ?? 0) + 1)
  }

  const pair =
    counts.get("wind-east") === 2 && counts.get("wind-west") === 2
      ? "East + West"
      : counts.get("wind-north") === 2 && counts.get("wind-south") === 2
        ? "North + South"
        : null

  if (!pair) {
    return
  }

  candidates.push(
    candidate("crosswinds", "Crosswinds", cards, mask, [11, 11, 11, 11], `Crosswinds · ${pair}`),
  )
}

function addPureSuit(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const suit = SUITS.find((candidateSuit) =>
    cards.every(
      (card) =>
        (card.kind === "numbered" && card.suit === candidateSuit) ||
        (card.kind === "joker" && jokerCanRepresent(card, numberedFace(candidateSuit, 9))),
    ),
  )

  if (!suit) {
    return
  }

  const values = cards
    .map((card) => (card.kind === "numbered" ? card.rank : 9))
    .sort((left, right) => right - left)
  candidates.push(
    candidate(
      "pure-suit",
      "Pure Suit",
      cards,
      mask,
      values,
      `Pure Suit · ${suitLabel(suit)} ${values.join("-")}`,
    ),
  )
}

function addCompoundHands(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  forEachSubset(cards.length, 3, (mainIndexes) => {
    const main = mainIndexes.map((index) => cards[index]!)
    const mainSet = new Set(mainIndexes)
    const secondary = cards.filter((_, index) => !mainSet.has(index))
    const eye = naturalPairFace(secondary)
    const chow = chowIdentity(main)
    const pung = identicalFace(main)

    if (chow && eye) {
      const values = [...chowTieBreak(chow), faceValue(eye), faceValue(eye)]
      candidates.push(
        candidate(
          "chow-eye",
          "Chow + Eye",
          [...main, ...secondary],
          mask,
          values,
          `Chow + Eye · ${chow.start}-${chow.start + 1}-${chow.start + 2} ${suitLabel(chow.suit)} + ${cardLabel(eye)}`,
        ),
      )

      const dragon = matchingDragon(chow.suit)

      if (faceKey(eye) === faceKey(dragon)) {
        candidates.push(
          candidate(
            "dragon-dancer",
            "Dragon Dancer",
            [...main, ...secondary],
            mask,
            values,
            `Dragon Dancer · ${chow.start}-${chow.start + 1}-${chow.start + 2} ${suitLabel(chow.suit)} + ${cardLabel(eye)}`,
          ),
        )
      }
    }

    if (pung && eye && faceKey(pung) !== faceKey(eye)) {
      const pungValue = faceValue(pung)
      const eyeValue = faceValue(eye)
      candidates.push(
        candidate(
          "pung-eye",
          "Pung + Eye",
          [...main, ...secondary],
          mask,
          [pungValue, pungValue, pungValue, eyeValue, eyeValue],
          `Pung + Eye · ${cardLabel(pung)} + ${cardLabel(eye)}`,
        ),
      )
    }

    if (matchesTargets(main, dragonTargets) && eye) {
      const eyeValue = faceValue(eye)
      candidates.push(
        candidate(
          "three-dragons-eye",
          "Three Dragons + Eye",
          [...main, ...secondary],
          mask,
          [10, 10, 10, eyeValue, eyeValue],
          `Three Dragons + Eye · ${cardLabel(eye)}`,
        ),
      )
    }
  })
}

function naturalPairFace(cards: readonly Card[]): CardFace | null {
  if (
    cards.length !== 2 ||
    cards.some(
      (card) => card.kind === "joker" || card.kind === "blank" || card.kind === "flower",
    ) ||
    faceKey(cards[0]!) !== faceKey(cards[1]!)
  ) {
    return null
  }

  return stripId(cards[0]!)
}

function naturalPairFaces(cards: readonly Card[]): CardFace[] {
  if (
    cards.some((card) => card.kind === "joker" || card.kind === "blank" || card.kind === "flower")
  ) {
    return []
  }

  const byFace = new Map<string, Card[]>()

  for (const card of cards) {
    const group = byFace.get(faceKey(card)) ?? []
    group.push(card)
    byFace.set(faceKey(card), group)
  }

  return [...byFace.values()]
    .filter((group) => group.length === 2)
    .map((group) => stripId(group[0]!))
}

function chowIdentity(cards: readonly Card[]): ChowIdentity | null {
  for (const suit of SUITS) {
    for (let start = 7; start >= 1; start -= 1) {
      const targets = [
        numberedFace(suit, start as 1 | 2 | 3 | 4 | 5 | 6 | 7),
        numberedFace(suit, (start + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8),
        numberedFace(suit, (start + 2) as 3 | 4 | 5 | 6 | 7 | 8 | 9),
      ]

      if (matchesTargets(cards, targets)) {
        return { suit, start }
      }
    }
  }

  return null
}

function identicalFace(cards: readonly Card[]): CardFace | null {
  const natural = cards.find(
    (card) => card.kind !== "joker" && card.kind !== "blank" && card.kind !== "flower",
  )

  if (!natural) {
    return null
  }

  const target = stripId(natural)
  const targets = Array.from({ length: cards.length }, () => target)

  return matchesTargets(cards, targets) ? target : null
}

function matchesTargets(cards: readonly Card[], targets: readonly CardFace[]): boolean {
  if (cards.length !== targets.length || cards.some((card) => card.kind === "blank")) {
    return false
  }

  const available = [...targets]

  for (const card of cards.filter((value) => value.kind !== "joker")) {
    const index = available.findIndex((target) => faceKey(target) === faceKey(card))

    if (index < 0) {
      return false
    }

    available.splice(index, 1)
  }

  for (const joker of cards.filter((value) => value.kind === "joker")) {
    const index = available.findIndex((target) => jokerCanRepresent(joker, target))

    if (index < 0) {
      return false
    }

    available.splice(index, 1)
  }

  return available.length === 0
}

function matchingDragon(suit: Suit): CardFace {
  return dragonFace(suit === "bamboo" ? "green" : suit === "dots" ? "white" : "red")
}

function chowTieBreak(chow: ChowIdentity): number[] {
  return [chow.start + 2, chow.start + 1, chow.start]
}

function faceValue(face: CardFace): number {
  return face.kind === "numbered"
    ? face.rank
    : face.kind === "dragon"
      ? 10
      : face.kind === "wind"
        ? 11
        : face.kind === "flower"
          ? 12 + FLOWERS.indexOf(face.flower)
          : 0
}

function stripId(card: Card): CardFace {
  const { id: _id, ...face } = card

  return face
}

function candidate(
  kind: CombinationKind,
  label: string,
  cards: readonly Card[],
  mask: number,
  tieBreak: number[],
  description: string,
): HandCandidate {
  return {
    kind,
    label,
    score: HAND_RANKS[kind],
    cardIds: cards.map((card) => card.id),
    description,
    mask,
    tieBreak,
  }
}

function forEachSubset(
  length: number,
  size: number,
  visit: (indexes: number[], mask: number) => void,
): void {
  const indexes: number[] = []

  const choose = (start: number): void => {
    if (indexes.length === size) {
      visit(
        [...indexes],
        indexes.reduce((mask, index) => mask | (1 << index), 0),
      )

      return
    }

    for (let index = start; index <= length - (size - indexes.length); index += 1) {
      indexes.push(index)
      choose(index + 1)
      indexes.pop()
    }
  }

  choose(0)
}

function deduplicate(candidates: readonly HandCandidate[]): HandCandidate[] {
  const byKey = new Map<string, HandCandidate>()

  for (const hand of candidates) {
    const key = `${hand.kind}:${hand.mask}`
    const current = byKey.get(key)

    if (!current || compareTieBreak(hand.tieBreak, current.tieBreak) > 0) {
      byKey.set(key, hand)
    }
  }

  return [...byKey.values()]
}

function compareTieBreak(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)

    if (difference !== 0) {
      return difference
    }
  }

  return 0
}
