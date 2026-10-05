import { generateHandCandidates, type HandCandidate } from "./melds"
import { HAND_RANKS, handRank, isHandEnabled } from "./hand-ranks"
import type { Card, CardFace, HandScore } from "./types"

export type HandStrength = Pick<HandScore, "total" | "tieBreak">

const strengthCache = new Map<string, HandStrength>()
const STRENGTH_CACHE_LIMIT = 200_000

/** Scores the best enabled combination for the selected mode. */
export function scoreHand(
  cards: readonly Card[],
  mode: "basic" | "riichi" | "streamlined" = "riichi",
): HandScore {
  return scoreCandidates(
    generateHandCandidates(cards, mode)
      .filter((c) => isHandEnabled(c.kind, mode))
      .map((c) => ({ ...c, score: handRank(c.kind, mode) })),
    highCards(playableCards(cards)),
  )
}

export function scoreHandStrength(
  cards: readonly Card[],
  mode: "basic" | "riichi" | "streamlined" = "riichi",
): HandStrength {
  const key = mode + ":" + cards.map(cardCacheKey).sort().join("|")
  const cached = strengthCache.get(key)
  if (cached) return cached
  const score = scoreHand(cards, mode)
  const strength = { total: score.total, tieBreak: score.tieBreak }
  if (strengthCache.size >= STRENGTH_CACHE_LIMIT) strengthCache.clear()
  strengthCache.set(key, strength)
  return strength
}

export function clearHandStrengthCache(): void {
  strengthCache.clear()
}

export function compareHandStrengths(left: HandStrength, right: HandStrength): number {
  if (left.total !== right.total) return left.total - right.total
  for (let index = 0; index < Math.max(left.tieBreak.length, right.tieBreak.length); index += 1) {
    const difference = (left.tieBreak[index] ?? 0) - (right.tieBreak[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

function playableCards(cards: readonly Card[]): readonly Card[] {
  return cards.filter((card) => card.kind !== "flower")
}

function highCards(cards: readonly Card[]): Card[] {
  return cards
    .filter((card) => card.kind !== "blank" && card.kind !== "joker" && card.kind !== "flower")
    .sort((left, right) => tieValue(right) - tieValue(left) || left.id.localeCompare(right.id))
}

function scoreCandidates(candidates: HandCandidate[], high: readonly Card[]): HandScore {
  candidates.sort(compareCandidates)
  const best = candidates[0]
  if (!best) {
    return {
      total: HAND_RANKS["high-card"],
      selectedCardIds: high.slice(0, 1).map((card) => card.id),
      combinations: [],
      tieBreak: high.slice(0, 1).map(tieValue),
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
  return compareHandStrengths(left, right)
}

function compareCandidates(left: HandCandidate, right: HandCandidate): number {
  if (left.score !== right.score) return right.score - left.score
  for (let index = 0; index < Math.max(left.tieBreak.length, right.tieBreak.length); index += 1) {
    const difference = (right.tieBreak[index] ?? 0) - (left.tieBreak[index] ?? 0)
    if (difference !== 0) return difference
  }
  return left.cardIds.join(":").localeCompare(right.cardIds.join(":"))
}

/** Tie order: Winds > Dragons > numbered 9..1. */
function tieValue(card: CardFace): number {
  if (card.kind === "numbered") return card.rank
  if (card.kind === "dragon") return 10
  if (card.kind === "wind") return 11
  return 0
}

function cardCacheKey(card: CardFace): string {
  if (card.kind === "numbered") return `${card.suit}-${card.rank}`
  if (card.kind === "dragon") return `dragon-${card.dragon}`
  if (card.kind === "wind") return `wind-${card.wind}`
  if (card.kind === "flower") return `flower-${card.flower}`
  if (card.kind === "joker") return `joker-${card.color}`
  return "blank"
}
