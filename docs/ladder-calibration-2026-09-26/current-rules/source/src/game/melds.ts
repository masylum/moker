import {
  cardLabel,
  dragonFace,
  faceKey,
  jokerCanRepresent,
  numberedFace,
  suitLabel,
  windFace,
} from "./cards"
import { HAND_RANKS } from "./hand-ranks"
import {
  DRAGONS,
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

interface RunIdentity {
  suit: Suit
  start: number
  length: number
}

const dragonTargets = DRAGONS.map(dragonFace)
const windTargets = WINDS.map(windFace)
const threeWindTargets = WINDS.map((omitted) =>
  WINDS.filter((wind) => wind !== omitted).map(windFace),
)

export function generateHandCandidates(cards: readonly Card[]): HandCandidate[] {
  const candidates: HandCandidate[] = []

  for (const size of [2, 3, 4, 5]) {
    forEachSubset(cards.length, size, (indexes, mask) => {
      const subset = indexes.map((index) => cards[index]!)
      if (size === 2) {
        addEye(subset, mask, candidates)
      } else if (size === 3) {
        addChow(subset, mask, candidates)
        addIdentical("pung", "Pung", subset, mask, candidates)
        addThreeDragons(subset, mask, candidates)
        addThreeWinds(subset, mask, candidates)
      } else if (size === 4) {
        addTwoEyes(subset, mask, candidates)
        addFourWinds(subset, mask, candidates)
        addKong(subset, mask, candidates)
      } else {
        addCompoundHands(subset, mask, candidates)
      }
    })
  }

  return deduplicate(candidates)
}

function addEye(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const face = naturalPairFace(cards)
  if (!face) return
  candidates.push(
    candidate("eye", "Eyes", cards, mask, valuesFor([face, face]), `Eyes · ${cardLabel(face)}`),
  )
}

function addChow(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const chow = runIdentity(cards)
  if (!chow) return
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
  if (!face) return
  candidates.push(
    candidate(
      kind,
      label,
      cards,
      mask,
      valuesFor(Array.from({ length: cards.length }, () => face)),
      `${label} · ${cardLabel(face)}`,
    ),
  )
}

function addThreeDragons(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  if (!matchesTargets(cards, dragonTargets)) return
  candidates.push(
    candidate(
      "three-dragons",
      "Three Dragons",
      cards,
      mask,
      valuesFor(dragonTargets),
      "Three Dragons · Red + Green + Blue",
    ),
  )
}

function addTwoEyes(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const faces = naturalPairFaces(cards)
  if (faces.length !== 2 || faceKey(faces[0]!) === faceKey(faces[1]!)) return
  candidates.push(
    candidate(
      "two-eyes",
      "Two Eyes",
      cards,
      mask,
      valuesFor(faces.flatMap((face) => [face, face])),
      `Two Eyes · ${faces.map(cardLabel).join(" + ")}`,
    ),
  )
}

function addFourWinds(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  if (!matchesTargets(cards, windTargets)) return
  candidates.push(
    candidate(
      "four-winds",
      "Four Winds",
      cards,
      mask,
      valuesFor(windTargets),
      "Four Winds · East + South + West + North",
    ),
  )
}

function addKong(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  const face = identicalFace(cards)
  if (!face) return
  candidates.push(
    candidate(
      "kong",
      "Kong",
      cards,
      mask,
      valuesFor(Array.from({ length: 4 }, () => face)),
      `Kong · ${cardLabel(face)}`,
    ),
  )
}

function addCompoundHands(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  forEachSubset(cards.length, 3, (mainIndexes, mainMask) => {
    const eyeCards = cards.filter((_, index) => (mainMask & (1 << index)) === 0)
    const eye = naturalPairFace(eyeCards)
    if (!eye) return
    const main = mainIndexes.map((index) => cards[index]!)

    const chow = runIdentity(main)
    if (chow) {
      candidates.push(
        candidate(
          "chow-eye",
          "Chow + Eye",
          cards,
          mask,
          [...chowTieBreak(chow), faceValue(eye), faceValue(eye)],
          `Chow + Eye · ${chow.start}-${chow.start + 1}-${chow.start + 2} ${suitLabel(chow.suit)} + ${cardLabel(eye)}`,
        ),
      )
    }

    const pung = identicalFace(main)
    if (pung && faceKey(pung) !== faceKey(eye)) {
      candidates.push(
        candidate(
          "pung-eye",
          "Pung + Eye",
          cards,
          mask,
          [...valuesFor([pung, pung, pung]), ...valuesFor([eye, eye])],
          `Pung + Eye · ${cardLabel(pung)} + ${cardLabel(eye)}`,
        ),
      )
    }

    if (matchesTargets(main, dragonTargets)) {
      candidates.push(
        candidate(
          "three-dragons-eye",
          "Three Dragons + Eye",
          cards,
          mask,
          [...valuesFor(dragonTargets), ...valuesFor([eye, eye])],
          `Three Dragons + Eye · ${cardLabel(eye)}`,
        ),
      )
    }
  })
}

function addThreeWinds(cards: Card[], mask: number, candidates: HandCandidate[]): void {
  if (cards.length !== 3) return
  const flock = cards
  const winds = threeWindTargets.find((targets) => matchesTargets(flock, targets))
  if (!winds) return
  candidates.push(
    candidate(
      "three-winds",
      "Three Winds",
      cards,
      mask,
      valuesFor(winds),
      `Three Winds · ${winds.map(cardLabel).join(" + ")}`,
    ),
  )
}

function naturalPairFace(cards: readonly Card[]): CardFace | null {
  if (
    cards.length !== 2 ||
    cards.some((card) => card.kind === "joker" || card.kind === "blank" || card.kind === "flower")
  ) {
    return null
  }
  const target = cards[0]!
  return faceKey(target) === faceKey(cards[1]!) ? target : null
}

function naturalPairFaces(cards: readonly Card[]): CardFace[] {
  if (cards.length !== 4) return []
  const pairings = [
    [
      [0, 1],
      [2, 3],
    ],
    [
      [0, 2],
      [1, 3],
    ],
    [
      [0, 3],
      [1, 2],
    ],
  ] as const
  let best: CardFace[] = []
  for (const pairing of pairings) {
    const faces = pairing.map(([left, right]) => naturalPairFace([cards[left]!, cards[right]!]))
    if (!faces[0] || !faces[1] || faceKey(faces[0]) === faceKey(faces[1])) continue
    const complete = faces as CardFace[]
    if (best.length === 0 || compareTieBreak(valuesFor(complete), valuesFor(best)) > 0) {
      best = complete
    }
  }
  return best
}

function runIdentity(cards: readonly Card[]): RunIdentity | null {
  if (cards.length < 3 || cards.length > 5) return null
  for (const suit of SUITS) {
    const naturalRanks: number[] = []
    let compatible = true
    for (const card of cards) {
      if (card.kind === "numbered" && card.suit === suit) naturalRanks.push(card.rank)
      else if (card.kind !== "joker" || !jokerCanRepresent(card, numberedFace(suit, 1))) {
        compatible = false
        break
      }
    }
    if (!compatible || new Set(naturalRanks).size !== naturalRanks.length) continue
    const maximumStart = 10 - cards.length
    for (let start = maximumStart; start >= 1; start -= 1) {
      if (naturalRanks.every((rank) => rank >= start && rank < start + cards.length)) {
        return { suit, start, length: cards.length }
      }
    }
  }
  return null
}

function identicalFace(cards: readonly Card[]): CardFace | null {
  const natural = cards.find(
    (card) => card.kind !== "joker" && card.kind !== "blank" && card.kind !== "flower",
  )
  if (!natural) return null
  const target = natural
  return matchesTargets(
    cards,
    Array.from({ length: cards.length }, () => target),
  )
    ? target
    : null
}

function matchesTargets(cards: readonly Card[], targets: readonly CardFace[]): boolean {
  if (cards.length !== targets.length || cards.some((card) => card.kind === "blank")) return false
  const available = [...targets]
  for (const card of cards.filter((value) => value.kind !== "joker")) {
    const index = available.findIndex((target) => faceKey(target) === faceKey(card))
    if (index < 0) return false
    available.splice(index, 1)
  }
  for (const joker of cards.filter((value) => value.kind === "joker")) {
    const index = available.findIndex((target) => jokerCanRepresent(joker, target))
    if (index < 0) return false
    available.splice(index, 1)
  }
  return available.length === 0
}

function chowTieBreak(chow: RunIdentity): number[] {
  return runTieBreak(chow)
}

function runTieBreak(run: RunIdentity): number[] {
  return Array.from({ length: run.length }, (_, index) => run.start + run.length - index - 1)
}

function valuesFor(faces: readonly CardFace[]): number[] {
  return faces.map(faceValue).sort((left, right) => right - left)
}

function faceValue(face: CardFace): number {
  if (face.kind === "numbered") return face.rank
  if (face.kind === "dragon") return 10
  if (face.kind === "wind") return 11
  return 0
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

// Only seven-card hands and their subsets are evaluated in normal play.
// Cache index combinations, never cards, and retain the original visit order.
const subsetCache = new Map<string, { indexes: number[]; mask: number }[]>()
function forEachSubset(
  length: number,
  size: number,
  visit: (indexes: number[], mask: number) => void,
): void {
  const key = `${length}:${size}`
  let subsets = subsetCache.get(key)
  if (!subsets) {
    subsets = []
    const indexes: number[] = []
    const choose = (start: number, mask: number): void => {
      if (indexes.length === size) {
        subsets!.push({ indexes: [...indexes], mask })
        return
      }
      for (let index = start; index <= length - (size - indexes.length); index++) {
        indexes.push(index)
        choose(index + 1, mask | (1 << index))
        indexes.pop()
      }
    }
    choose(0, 0)
    if (length <= 8) subsetCache.set(key, subsets)
  }
  for (const { indexes, mask } of subsets) visit(indexes, mask)
}

function deduplicate(candidates: readonly HandCandidate[]): HandCandidate[] {
  const byKey = new Map<string, HandCandidate>()
  for (const hand of candidates) {
    const key = `${hand.kind}:${hand.mask}`
    const current = byKey.get(key)
    if (!current || compareTieBreak(hand.tieBreak, current.tieBreak) > 0) byKey.set(key, hand)
  }
  return [...byKey.values()]
}

function compareTieBreak(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}
