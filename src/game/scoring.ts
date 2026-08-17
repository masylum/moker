import { cardLabel } from "./cards"
import { generateMeldCandidates, type MeldCandidate } from "./melds"
import { evaluateSpecialHands } from "./patterns"
import type { Card, HandScore, ScoredCombination, SpecialHandId } from "./types"

interface MeldArrangement {
  score: number
  mask: number
  combinations: MeldCandidate[]
}

export function scoreHand(
  cards: readonly Card[],
  activeSpecialHands: readonly SpecialHandId[],
): HandScore {
  if (cards.length < 8) {
    throw new Error("A showdown needs at least 8 available cards")
  }

  if (cards.length > 30) {
    throw new Error("Scoring mask supports no more than 30 cards")
  }

  const special = evaluateSpecialHands(cards, activeSpecialHands).find(
    (evaluation) => evaluation.missing === 0,
  )

  if (special) {
    const mask = special.matchingMasks[0]!

    return result(cards, mask, [
      {
        kind: special.id,
        score: special.score,
        cardIds: indexesFromMask(mask).map((index) => cards[index]!.id),
        label: special.label,
      },
    ])
  }

  const arrangement = bestMeldArrangement(cards)

  return result(cards, arrangement.mask, arrangement.combinations)
}

export function bestMeldArrangement(cards: readonly Card[]): MeldArrangement {
  const arrangements = new Map<number, MeldArrangement>([
    [0, { score: 0, mask: 0, combinations: [] }],
  ])

  for (const candidate of generateMeldCandidates(cards)) {
    const snapshot = [...arrangements.values()]

    for (const arrangement of snapshot) {
      if ((arrangement.mask & candidate.mask) !== 0) {
        continue
      }

      const mask = arrangement.mask | candidate.mask

      if (popCount(mask) > 8) {
        continue
      }

      const next: MeldArrangement = {
        score: arrangement.score + candidate.score,
        mask,
        combinations: [...arrangement.combinations, candidate],
      }
      const current = arrangements.get(mask)

      if (!current || next.score > current.score) {
        arrangements.set(mask, next)
      }
    }
  }

  return [...arrangements.values()].sort(
    (left, right) => right.score - left.score || popCount(right.mask) - popCount(left.mask),
  )[0]!
}

export function describeScore(score: HandScore, cards: readonly Card[]): string {
  const byId = new Map(cards.map((card) => [card.id, card]))

  if (score.combinations.length === 0) {
    return "No scoring combination"
  }

  return score.combinations
    .map(
      (combination) =>
        `${combination.label} (${combination.score}): ${combination.cardIds
          .map((id) => cardLabel(byId.get(id)!))
          .join(", ")}`,
    )
    .join("; ")
}

function result(
  cards: readonly Card[],
  scoringMask: number,
  combinations: readonly ScoredCombination[],
): HandScore {
  const selectedIndexes = indexesFromMask(scoringMask)

  for (let index = 0; selectedIndexes.length < 8 && index < cards.length; index += 1) {
    if ((scoringMask & (1 << index)) === 0) {
      selectedIndexes.push(index)
    }
  }

  return {
    total: combinations.reduce((total, combination) => total + combination.score, 0),
    selectedCardIds: selectedIndexes.slice(0, 8).map((index) => cards[index]!.id),
    combinations: combinations.map((combination) => ({
      kind: combination.kind,
      score: combination.score,
      cardIds: combination.cardIds,
      label: combination.label,
    })),
  }
}

function popCount(value: number): number {
  let count = 0

  for (let current = value >>> 0; current !== 0; current &= current - 1) {
    count += 1
  }

  return count
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
