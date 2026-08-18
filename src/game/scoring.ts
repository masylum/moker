import { cardLabel, faceKey, jokerCanRepresent, numberedFace } from "./cards"
import { generateMeldCandidates, type MeldCandidate } from "./melds"
import { evaluateSpecialHands } from "./patterns"
import { HAND_RANKS } from "./rules"
import {
  SUITS,
  type Card,
  type HandScore,
  type ScoredCombination,
  type SpecialHandId,
} from "./types"

interface HandCandidate {
  rank: number
  cardIds: string[]
  tieBreak: number[]
  combination?: ScoredCombination
}

export function scoreHand(
  cards: readonly Card[],
  activeSpecialHands: readonly SpecialHandId[],
): HandScore {
  if (cards.length > 30) {
    throw new Error("Scoring mask supports no more than 30 cards")
  }

  const candidates: HandCandidate[] = generateMeldCandidates(cards).map((candidate) => ({
    rank: candidate.score,
    cardIds: [...candidate.cardIds],
    tieBreak: basicTieBreak(candidate, cards),
    combination: {
      kind: candidate.kind,
      score: candidate.score,
      cardIds: [...candidate.cardIds],
      label: candidate.label,
    },
  }))

  for (const special of evaluateSpecialHands(cards, activeSpecialHands)) {
    if (special.missing !== 0) {
      continue
    }

    for (const mask of special.matchingMasks) {
      const selected = indexesFromMask(mask).map((index) => cards[index]!)
      const cardIds = selected.map((card) => card.id)
      candidates.push({
        rank: special.score,
        cardIds,
        tieBreak: selected.map(tieValue).sort((left, right) => right - left),
        combination: {
          kind: special.id,
          score: special.score,
          cardIds,
          label: special.label,
        },
      })
    }
  }

  const naturalCards = cards
    .filter((card) => card.kind !== "blank" && card.kind !== "joker")
    .sort((left, right) => tieValue(right) - tieValue(left) || left.id.localeCompare(right.id))
  candidates.push({
    rank: HAND_RANKS["high-card"],
    cardIds: naturalCards.map((card) => card.id),
    tieBreak: naturalCards.map(tieValue),
  })
  candidates.sort(compareCandidates)
  const best = candidates[0]!

  return {
    total: best.rank,
    selectedCardIds: best.cardIds,
    combinations: best.combination ? [best.combination] : [],
    tieBreak: best.tieBreak,
  }
}

export function compareHandScores(left: HandScore, right: HandScore): number {
  if (left.total !== right.total) {
    return left.total - right.total
  }

  const length = Math.max(left.tieBreak.length, right.tieBreak.length)

  for (let index = 0; index < length; index += 1) {
    const difference = (left.tieBreak[index] ?? 0) - (right.tieBreak[index] ?? 0)

    if (difference !== 0) {
      return difference
    }
  }

  return 0
}

export function describeScore(score: HandScore, cards: readonly Card[]): string {
  const byId = new Map(cards.map((card) => [card.id, card]))
  const combination = score.combinations[0]

  if (!combination) {
    const high = score.selectedCardIds[0]

    return high ? `High Card: ${cardLabel(byId.get(high)!)}` : "High Card"
  }

  return `${combination.label} (rank ${combination.score}): ${combination.cardIds
    .map((id) => cardLabel(byId.get(id)!))
    .join(", ")}`
}

function compareCandidates(left: HandCandidate, right: HandCandidate): number {
  if (left.rank !== right.rank) {
    return right.rank - left.rank
  }

  const scoreComparison = compareHandScores(
    { total: left.rank, selectedCardIds: left.cardIds, combinations: [], tieBreak: left.tieBreak },
    {
      total: right.rank,
      selectedCardIds: right.cardIds,
      combinations: [],
      tieBreak: right.tieBreak,
    },
  )

  return -scoreComparison || left.cardIds.join(":").localeCompare(right.cardIds.join(":"))
}

function basicTieBreak(candidate: MeldCandidate, cards: readonly Card[]): number[] {
  const selected = candidate.cardIds.map((id) => cards.find((card) => card.id === id)!)

  if (candidate.kind === "three-dragons") {
    return [10, 10, 10]
  }

  if (candidate.kind === "four-winds") {
    return [11, 11, 11, 11]
  }

  if (candidate.kind === "chow") {
    const matches: number[][] = []

    for (const suit of SUITS) {
      for (let start = 1; start <= 7; start += 1) {
        const targets = [
          numberedFace(suit, start as 1 | 2 | 3 | 4 | 5 | 6 | 7),
          numberedFace(suit, (start + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8),
          numberedFace(suit, (start + 2) as 3 | 4 | 5 | 6 | 7 | 8 | 9),
        ]

        if (matchesTargets(selected, targets)) {
          matches.push([start + 2, start + 1, start])
        }
      }
    }

    return matches.sort(compareTieVectors)[0] ?? []
  }

  const natural = selected.find((card) => card.kind !== "joker" && card.kind !== "blank")
  const value = natural ? tieValue(natural) : 0

  return Array.from({ length: selected.length }, () => value)
}

function matchesTargets(
  cards: readonly Card[],
  targets: ReturnType<typeof numberedFace>[],
): boolean {
  const available = [...targets]

  for (const card of cards.filter((candidate) => candidate.kind !== "joker")) {
    const index = available.findIndex((target) => faceKey(target) === faceKey(card))

    if (index < 0) {
      return false
    }

    available.splice(index, 1)
  }

  for (const joker of cards.filter((candidate) => candidate.kind === "joker")) {
    const index = available.findIndex((target) => jokerCanRepresent(joker, target))

    if (index < 0) {
      return false
    }

    available.splice(index, 1)
  }

  return available.length === 0
}

function compareTieVectors(left: number[], right: number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (right[index] ?? 0) - (left[index] ?? 0)

    if (difference !== 0) {
      return difference
    }
  }

  return 0
}

function tieValue(card: Card): number {
  if (card.kind === "numbered") {
    return card.rank
  }

  if (card.kind === "dragon") {
    return 10
  }

  if (card.kind === "wind") {
    return 11
  }

  if (card.kind === "joker") {
    return card.color === "black" ? 11 : 10
  }

  return 0
}

function indexesFromMask(mask: number): number[] {
  const indexes: number[] = []

  for (let index = 0; index < 30; index += 1) {
    if ((mask & (1 << index)) !== 0) {
      indexes.push(index)
    }
  }

  return indexes
}
