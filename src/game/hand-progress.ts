import { createDeck, faceKey, jokerCanRepresent, numberedFace } from "./cards"
import { evaluateSpecialHands } from "./patterns"
import { HAND_RANKS } from "./rules"
import {
  DRAGONS,
  SUITS,
  WINDS,
  type Card,
  type CardFace,
  type HandKind,
  type HandProgressSummary,
  type SpecialHandId,
} from "./types"

interface BasicDefinition {
  kind: Exclude<HandKind, "high-card" | SpecialHandId>
  label: string
  targets: CardFace[][]
  naturalOnly: boolean
}

export function analyzeHandProgress(
  cards: readonly Card[],
  activeSpecialHands: readonly SpecialHandId[],
): HandProgressSummary[] {
  const highCard = cards
    .filter((card) => card.kind !== "blank" && card.kind !== "joker")
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

  for (const definition of basicDefinitions()) {
    const matches = definition.targets.map((targets) =>
      bestTargetMatch(cards, targets, definition.naturalOnly),
    )
    matches.sort(
      (left, right) =>
        right.cardIds.length - left.cardIds.length ||
        right.values.join(":").localeCompare(left.values.join(":")),
    )
    const best = matches[0]!
    evaluations.push({
      kind: definition.kind,
      label: definition.label,
      rank: HAND_RANKS[definition.kind],
      size: definition.targets[0]!.length,
      missing: definition.targets[0]!.length - best.cardIds.length,
      matchedCardIds: best.cardIds,
    })
  }

  evaluations.push(
    ...evaluateSpecialHands(cards, activeSpecialHands).map((evaluation) => ({
      kind: evaluation.id,
      label: evaluation.label,
      rank: evaluation.score,
      size: evaluation.size,
      missing: evaluation.missing,
      matchedCardIds: evaluation.matchedCardIds,
    })),
  )

  return evaluations.sort((left, right) => right.rank - left.rank)
}

export function summarizeHandProgress(
  cards: readonly Card[],
  activeSpecialHands: readonly SpecialHandId[],
): { currentBest: HandProgressSummary; nextClosest: HandProgressSummary | null } {
  const evaluations = analyzeHandProgress(cards, activeSpecialHands)
  const currentBest = evaluations.find((evaluation) => evaluation.missing === 0)!
  const nextClosest =
    evaluations
      .filter((evaluation) => evaluation.rank > currentBest.rank && evaluation.missing > 0)
      .sort(
        (left, right) =>
          left.missing - right.missing || right.rank - left.rank || left.size - right.size,
      )[0] ?? null

  return { currentBest, nextClosest }
}

function basicDefinitions(): BasicDefinition[] {
  const faces = uniqueNaturalFaces()

  return [
    {
      kind: "eye",
      label: "Eye",
      targets: faces.map((face) => [face, face]),
      naturalOnly: true,
    },
    {
      kind: "chow",
      label: "Chow",
      targets: SUITS.flatMap((suit) =>
        Array.from({ length: 7 }, (_, index) => {
          const start = index + 1

          return [
            numberedFace(suit, start as 1 | 2 | 3 | 4 | 5 | 6 | 7),
            numberedFace(suit, (start + 1) as 2 | 3 | 4 | 5 | 6 | 7 | 8),
            numberedFace(suit, (start + 2) as 3 | 4 | 5 | 6 | 7 | 8 | 9),
          ]
        }),
      ),
      naturalOnly: false,
    },
    {
      kind: "pung",
      label: "Pung",
      targets: faces.map((face) => [face, face, face]),
      naturalOnly: false,
    },
    {
      kind: "three-dragons",
      label: "Three Dragons",
      targets: [
        DRAGONS.map((dragon) => ({
          kind: "dragon" as const,
          dragon,
          color:
            dragon === "green"
              ? ("green" as const)
              : dragon === "white"
                ? ("blue" as const)
                : ("red" as const),
        })),
      ],
      naturalOnly: false,
    },
    {
      kind: "kong",
      label: "Kong",
      targets: faces.map((face) => [face, face, face, face]),
      naturalOnly: false,
    },
    {
      kind: "four-winds",
      label: "Four Winds",
      targets: [WINDS.map((wind) => ({ kind: "wind" as const, wind, color: "black" as const }))],
      naturalOnly: false,
    },
  ]
}

function uniqueNaturalFaces(): CardFace[] {
  const byFace = new Map<string, CardFace>()

  for (const card of createDeck()) {
    if (card.kind === "blank" || card.kind === "joker") {
      continue
    }

    const { id: _id, ...face } = card
    byFace.set(faceKey(face), face)
  }

  return [...byFace.values()]
}

function bestTargetMatch(
  cards: readonly Card[],
  targets: readonly CardFace[],
  naturalOnly: boolean,
): { cardIds: string[]; values: number[] } {
  let best = { cardIds: [] as string[], values: [] as number[] }

  const visit = (
    cardIndex: number,
    usedTargets: Set<number>,
    cardIds: string[],
    values: number[],
  ) => {
    if (cardIndex === cards.length) {
      if (cardIds.length > best.cardIds.length) {
        best = { cardIds: [...cardIds], values: [...values].sort((left, right) => right - left) }
      }

      return
    }

    visit(cardIndex + 1, usedTargets, cardIds, values)
    const card = cards[cardIndex]!

    for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
      if (usedTargets.has(targetIndex)) {
        continue
      }

      const target = targets[targetIndex]!
      const matches =
        card.kind !== "blank" &&
        (card.kind === "joker"
          ? !naturalOnly && jokerCanRepresent(card, target)
          : faceKey(card) === faceKey(target))

      if (!matches) {
        continue
      }

      usedTargets.add(targetIndex)
      cardIds.push(card.id)
      values.push(cardValue(target))
      visit(cardIndex + 1, usedTargets, cardIds, values)
      values.pop()
      cardIds.pop()
      usedTargets.delete(targetIndex)
    }
  }

  visit(0, new Set(), [], [])

  return best
}

function cardValue(card: CardFace | Card): number {
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
