import { cardLabel } from "./cards"
import { generateHandCandidates, type HandCandidate } from "./melds"
import { HAND_RANKS } from "./rules"
import type { Card, HandScore } from "./types"

export function scoreHand(cards: readonly Card[]): HandScore {
  const candidates = generateHandCandidates(cards)
  const highCards = cards
    .filter((card) => card.kind !== "blank" && card.kind !== "joker")
    .sort((left, right) => tieValue(right) - tieValue(left) || left.id.localeCompare(right.id))
  candidates.sort(compareCandidates)
  const best = candidates[0]

  if (!best) {
    return {
      total: HAND_RANKS["high-card"],
      selectedCardIds: highCards.map((card) => card.id),
      combinations: [],
      tieBreak: highCards.map(tieValue),
    }
  }

  return {
    total: best.score,
    selectedCardIds: [...best.cardIds],
    combinations: [
      {
        kind: best.kind,
        score: best.score,
        cardIds: [...best.cardIds],
        label: best.label,
        description: best.description,
      },
    ],
    tieBreak: [...best.tieBreak],
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
  const combination = score.combinations[0]

  if (combination) {
    return `${combination.description} (rank ${combination.score})`
  }

  const byId = new Map(cards.map((card) => [card.id, card]))
  const high = score.selectedCardIds[0]

  return high ? `High Card · ${cardLabel(byId.get(high)!)} (rank 1)` : "High Card (rank 1)"
}

function compareCandidates(left: HandCandidate, right: HandCandidate): number {
  if (left.score !== right.score) {
    return right.score - left.score
  }

  for (let index = 0; index < Math.max(left.tieBreak.length, right.tieBreak.length); index += 1) {
    const difference = (right.tieBreak[index] ?? 0) - (left.tieBreak[index] ?? 0)

    if (difference !== 0) {
      return difference
    }
  }

  return left.cardIds.join(":").localeCompare(right.cardIds.join(":"))
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

  return 0
}
