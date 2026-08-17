import { faceKey, jokerCanRepresent } from "./cards"
import {
  DRAGONS,
  SUITS,
  WINDS,
  type Card,
  type CardFace,
  type NumberedRank,
  type ScoredCombination,
} from "./types"

export interface MeldCandidate extends ScoredCombination {
  mask: number
}

const BASIC_SCORES = {
  eye: 2,
  chow: 3,
  pung: 6,
  "three-dragons": 10,
  "four-winds": 15,
  kong: 20,
} as const

export function generateMeldCandidates(cards: readonly Card[]): MeldCandidate[] {
  const candidates: MeldCandidate[] = []

  forEachSubset(cards.length, 2, (indexes, mask) => {
    const subset = indexes.map((index) => cards[index]!)

    if (isNaturalPair(subset)) {
      candidates.push(createCandidate("eye", BASIC_SCORES.eye, subset, mask, "Eye"))
    }
  })

  forEachSubset(cards.length, 3, (indexes, mask) => {
    const subset = indexes.map((index) => cards[index]!)

    if (matchesAnyChow(subset)) {
      candidates.push(createCandidate("chow", BASIC_SCORES.chow, subset, mask, "Chow"))
    }

    if (matchesAnyIdentical(subset)) {
      candidates.push(createCandidate("pung", BASIC_SCORES.pung, subset, mask, "Pung"))
    }

    const dragons = DRAGONS.map((dragon) => ({
      kind: "dragon" as const,
      dragon,
      color:
        dragon === "green"
          ? ("green" as const)
          : dragon === "white"
            ? ("blue" as const)
            : ("red" as const),
    }))

    if (matchesTargets(subset, dragons)) {
      candidates.push(
        createCandidate(
          "three-dragons",
          BASIC_SCORES["three-dragons"],
          subset,
          mask,
          "Three Dragons",
        ),
      )
    }
  })

  forEachSubset(cards.length, 4, (indexes, mask) => {
    const subset = indexes.map((index) => cards[index]!)
    const winds = WINDS.map((wind) => ({ kind: "wind" as const, wind, color: "black" as const }))

    if (matchesTargets(subset, winds)) {
      candidates.push(
        createCandidate("four-winds", BASIC_SCORES["four-winds"], subset, mask, "Four Winds"),
      )
    }

    if (matchesAnyIdentical(subset) && subset.some((card) => card.kind === "joker")) {
      candidates.push(createCandidate("kong", BASIC_SCORES.kong, subset, mask, "Kong"))
    }
  })

  return deduplicate(candidates)
}

export function jokersParticipate(cards: readonly Card[]): boolean {
  const jokerMask = cards.reduce(
    (mask, card, index) => mask | (card.kind === "joker" ? 1 << index : 0),
    0,
  )

  if (jokerMask === 0) {
    return true
  }

  const candidates = generateMeldCandidates(cards).filter((meld) => (meld.mask & jokerMask) !== 0)

  const visit = (index: number, usedMask: number, coveredMask: number): boolean => {
    if ((coveredMask & jokerMask) === jokerMask) {
      return true
    }

    for (let cursor = index; cursor < candidates.length; cursor += 1) {
      const next = candidates[cursor]!

      if (
        (usedMask & next.mask) === 0 &&
        visit(cursor + 1, usedMask | next.mask, coveredMask | (next.mask & jokerMask))
      ) {
        return true
      }
    }

    return false
  }

  return visit(0, 0, 0)
}

function matchesAnyChow(cards: readonly Card[]): boolean {
  return SUITS.some((suit) =>
    Array.from({ length: 7 }, (_, index) => index + 1).some((start) =>
      matchesTargets(cards, [
        numberedTarget(suit, start),
        numberedTarget(suit, start + 1),
        numberedTarget(suit, start + 2),
      ]),
    ),
  )
}

function matchesAnyIdentical(cards: readonly Card[]): boolean {
  const natural = cards.find((card) => card.kind !== "joker" && card.kind !== "blank")

  if (!natural) {
    return false
  }

  const target = stripId(natural)

  return matchesTargets(
    cards,
    Array.from({ length: cards.length }, () => target),
  )
}

function isNaturalPair(cards: readonly Card[]): boolean {
  return (
    cards.length === 2 &&
    cards.every((card) => card.kind !== "joker" && card.kind !== "blank") &&
    faceKey(cards[0]!) === faceKey(cards[1]!)
  )
}

function matchesTargets(cards: readonly Card[], targets: readonly CardFace[]): boolean {
  if (cards.length !== targets.length || cards.some((card) => card.kind === "blank")) {
    return false
  }

  const usedTargets = new Set<number>()
  const jokers: Card[] = []

  for (const card of cards) {
    if (card.kind === "joker") {
      jokers.push(card)
      continue
    }

    const targetIndex = targets.findIndex(
      (target, index) => !usedTargets.has(index) && faceKey(target) === faceKey(card),
    )

    if (targetIndex < 0) {
      return false
    }

    usedTargets.add(targetIndex)
  }

  return assignJokers(jokers, targets, usedTargets, 0)
}

function assignJokers(
  jokers: readonly Card[],
  targets: readonly CardFace[],
  usedTargets: Set<number>,
  jokerIndex: number,
): boolean {
  if (jokerIndex === jokers.length) {
    return usedTargets.size === targets.length
  }

  const joker = jokers[jokerIndex]!

  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    if (usedTargets.has(targetIndex) || !jokerCanRepresent(joker, targets[targetIndex]!)) {
      continue
    }

    usedTargets.add(targetIndex)

    if (assignJokers(jokers, targets, usedTargets, jokerIndex + 1)) {
      return true
    }

    usedTargets.delete(targetIndex)
  }

  return false
}

function numberedTarget(suit: (typeof SUITS)[number], rank: number): CardFace {
  const color = suit === "bamboo" ? "green" : suit === "dots" ? "blue" : "red"

  return { kind: "numbered", suit, rank: rank as NumberedRank, color }
}

function stripId(card: Card): CardFace {
  const { id: _id, ...face } = card

  return face
}

function createCandidate(
  kind: MeldCandidate["kind"],
  score: number,
  cards: readonly Card[],
  mask: number,
  label: string,
): MeldCandidate {
  return { kind, score, cardIds: cards.map((card) => card.id), mask, label }
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

function deduplicate(candidates: readonly MeldCandidate[]): MeldCandidate[] {
  const seen = new Set<string>()

  return candidates.filter((meld) => {
    const key = `${meld.kind}:${meld.mask}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}
