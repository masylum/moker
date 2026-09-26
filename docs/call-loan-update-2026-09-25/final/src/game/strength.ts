import { analyzeHandProgress } from "./hand-progress"
import { clearHandStrengthCache, scoreHandStrength } from "./scoring"
import type { Card } from "./types"

export function clearStrengthCache(): void {
  clearHandStrengthCache()
}

export function summarizeHandPotential(
  cards: readonly Card[],
  mode: "basic" | "riichi" = "riichi",
): {
  currentRank: number
  nextRank: number | null
  nextMissing: number | null
} {
  const currentRank = scoreHandStrength(cards, mode).total
  const next = analyzeHandProgress(cards, mode)
    .filter((candidate) => candidate.rank > currentRank)
    .sort((left, right) => left.missing - right.missing || right.rank - left.rank)[0]
  return {
    currentRank,
    nextRank: next?.rank ?? null,
    nextMissing: next?.missing ?? null,
  }
}
