import { dragonFace, faceKey, jokerCanRepresent, numberedFace, windFace } from "./cards"
import { jokersParticipate } from "./melds"
import {
  SUITS,
  type Card,
  type CardColor,
  type CardFace,
  type NumberedRank,
  type SpecialHandId,
  type Suit,
} from "./types"

interface ExactRequirement {
  face: CardFace
  naturalOnly: boolean
}

interface ExactPattern {
  kind: "exact"
  notation: string
  requirements: ExactRequirement[]
}

interface CollectionPattern {
  kind: "collection"
  notation: string
  size: number
  accepts: (card: Card) => boolean
  validate?: (cards: readonly Card[]) => boolean
}

interface NaturalPairsPattern {
  kind: "natural-pairs"
  notation: string
  pairs: number
}

type HandPattern = ExactPattern | CollectionPattern | NaturalPairsPattern

export interface SpecialHandPattern {
  id: SpecialHandId
  label: string
  score: number
  patterns: readonly HandPattern[]
}

export interface SpecialHandEvaluation {
  id: SpecialHandId
  label: string
  score: number
  notation: string
  size: number
  missing: number
  matchedCardIds: string[]
  matchingMasks: number[]
}

const exact = (notation: string): ExactPattern => ({
  kind: "exact",
  notation,
  requirements: parseNotation(notation),
})

const collection = (
  notation: string,
  size: number,
  accepts: CollectionPattern["accepts"],
  validate?: CollectionPattern["validate"],
): CollectionPattern => ({ kind: "collection", notation, size, accepts, validate })

const naturalPairs = (notation: string, pairs: number): NaturalPairsPattern => ({
  kind: "natural-pairs",
  notation,
  pairs,
})

export const SPECIAL_HAND_PATTERNS: readonly SpecialHandPattern[] = [
  definition("four-winds-at-peace", "Four Winds at Peace", 70, [exact("!EE !SS !WW !NN")]),
  definition("raging-winds", "Raging Winds", 60, [exact("EEE WWW"), exact("NNN SSS")]),
  definition("dragon-dance", "Dragon Dance", 52, dragonDancePatterns()),
  definition(
    "rainbow-eyes",
    "Rainbow Eyes",
    46,
    ranks().map((rank) => exact(`!${rank}${rank}B !${rank}${rank}D !${rank}${rank}C`)),
  ),
  definition(
    "brothers",
    "Brothers",
    44,
    ranks().flatMap((rank) =>
      suitPairs().map(([left, right]) =>
        exact(`${rank}${rank}${rank}${left} ${rank}${rank}${rank}${right}`),
      ),
    ),
  ),
  definition("heavenly-honors", "Heavenly Honors", 42, [
    collection(
      "8x Honors",
      8,
      (card) => card.kind === "wind" || card.kind === "dragon" || card.kind === "joker",
      jokersParticipate,
    ),
  ]),
  definition("crossing-winds", "Crossing Winds", 32, [exact("!NN !SS"), exact("!EE !WW")]),
  definition("mirror-chows", "Mirror Chows", 32, mirrorChowPatterns()),
  definition(
    "twin-gates",
    "Twin Gates",
    28,
    suitCodes().map((suit) => exact(`123${suit} 789${suit}`)),
  ),
  definition("four-eyes", "Four Eyes", 20, [
    naturalPairs("AA BB CC DD (four distinct natural pairs)", 4),
  ]),
  definition("staircase", "Staircase", 20, staircasePatterns()),
  definition("eight-blessings", "Eight Blessings", 18, [
    collection("8x Even", 8, (card) => card.kind === "numbered" && card.rank % 2 === 0),
  ]),
  definition("four-treasures", "Four Treasures", 18, treasurePatterns()),
  definition("terminals-honors", "Terminals & Honors", 16, [
    collection(
      "8x Terminal/Honor",
      8,
      (card) =>
        card.kind === "wind" ||
        card.kind === "dragon" ||
        (card.kind === "numbered" && (card.rank === 1 || card.rank === 9)),
    ),
  ]),
  definition("sisters", "Sisters", 14, sistersPatterns()),
]

export function evaluateSpecialHands(
  cards: readonly Card[],
  active: readonly SpecialHandId[],
): SpecialHandEvaluation[] {
  const enabled = new Set(active)

  return SPECIAL_HAND_PATTERNS.filter((pattern) => enabled.has(pattern.id)).map((pattern) =>
    evaluateDefinition(cards, pattern),
  )
}

export function specialHandRulesText(active?: readonly SpecialHandId[]): string {
  const enabled = active ? new Set(active) : null

  return SPECIAL_HAND_PATTERNS.filter((pattern) => !enabled || enabled.has(pattern.id))
    .map(
      (pattern) =>
        `${pattern.label} (${pattern.score}): ${pattern.patterns.map((value) => value.notation).join(" | ")}`,
    )
    .join("\n")
}

function evaluateDefinition(
  cards: readonly Card[],
  handPattern: SpecialHandPattern,
): SpecialHandEvaluation {
  const evaluations = handPattern.patterns.map((pattern) => evaluatePattern(cards, pattern))
  evaluations.sort(
    (left, right) =>
      left.missing - right.missing ||
      right.matchedCardIds.length - left.matchedCardIds.length ||
      left.notation.localeCompare(right.notation),
  )
  const best = evaluations[0]!

  return { id: handPattern.id, label: handPattern.label, score: handPattern.score, ...best }
}

function evaluatePattern(
  cards: readonly Card[],
  pattern: HandPattern,
): Omit<SpecialHandEvaluation, "id" | "label" | "score"> {
  if (pattern.kind === "exact") {
    const best = bestExactMatch(cards, pattern.requirements)
    const matchingMasks = exactMatchingMasks(cards, pattern.requirements)

    return {
      notation: pattern.notation,
      size: pattern.requirements.length,
      missing: pattern.requirements.length - best.count,
      matchedCardIds: indexesFromMask(best.mask).map((index) => cards[index]!.id),
      matchingMasks,
    }
  }

  if (pattern.kind === "natural-pairs") {
    return evaluateNaturalPairs(cards, pattern)
  }

  const eligible = cards.flatMap((card, index) => (pattern.accepts(card) ? [index] : []))
  const matchingMasks: number[] = []

  forEachCombination(eligible, pattern.size, (indexes) => {
    const selected = indexes.map((index) => cards[index]!)

    if (!pattern.validate || pattern.validate(selected)) {
      matchingMasks.push(maskFromIndexes(indexes))
    }
  })

  const matchedCount = Math.min(pattern.size, eligible.length)
  const missing =
    matchedCount === pattern.size && matchingMasks.length === 0 ? 1 : pattern.size - matchedCount

  return {
    notation: pattern.notation,
    size: pattern.size,
    missing,
    matchedCardIds: eligible.slice(0, pattern.size - missing).map((index) => cards[index]!.id),
    matchingMasks,
  }
}

function evaluateNaturalPairs(
  cards: readonly Card[],
  pattern: NaturalPairsPattern,
): Omit<SpecialHandEvaluation, "id" | "label" | "score"> {
  const byFace = new Map<string, number[]>()

  cards.forEach((card, index) => {
    if (card.kind === "joker" || card.kind === "blank") {
      return
    }

    const indexes = byFace.get(faceKey(card)) ?? []
    indexes.push(index)
    byFace.set(faceKey(card), indexes)
  })

  const groups = [...byFace.values()]
    .map((indexes) => indexes.slice(0, 2))
    .sort((left, right) => right.length - left.length)
    .slice(0, pattern.pairs)
  const matchedIndexes = groups.flat()
  const size = pattern.pairs * 2
  const matchingMasks: number[] = []

  if (groups.length === pattern.pairs && groups.every((indexes) => indexes.length === 2)) {
    matchingMasks.push(maskFromIndexes(matchedIndexes))
  }

  return {
    notation: pattern.notation,
    size,
    missing: size - matchedIndexes.length,
    matchedCardIds: matchedIndexes.map((index) => cards[index]!.id),
    matchingMasks,
  }
}

function bestExactMatch(
  cards: readonly Card[],
  requirements: readonly ExactRequirement[],
): { count: number; mask: number } {
  const memo = new Map<string, { count: number; mask: number }>()

  const visit = (cardIndex: number, usedRequirements: number): { count: number; mask: number } => {
    if (cardIndex === cards.length) {
      return { count: 0, mask: 0 }
    }

    const key = `${cardIndex}:${usedRequirements}`
    const cached = memo.get(key)

    if (cached) {
      return cached
    }

    let best = visit(cardIndex + 1, usedRequirements)
    const card = cards[cardIndex]!

    for (let requirementIndex = 0; requirementIndex < requirements.length; requirementIndex += 1) {
      if ((usedRequirements & (1 << requirementIndex)) !== 0) {
        continue
      }

      const requirement = requirements[requirementIndex]!

      if (!matchesRequirement(card, requirement)) {
        continue
      }

      const rest = visit(cardIndex + 1, usedRequirements | (1 << requirementIndex))
      const candidate = { count: rest.count + 1, mask: rest.mask | (1 << cardIndex) }

      if (candidate.count > best.count) {
        best = candidate
      }
    }

    memo.set(key, best)

    return best
  }

  return visit(0, 0)
}

function exactMatchingMasks(
  cards: readonly Card[],
  requirements: readonly ExactRequirement[],
): number[] {
  const masks = new Set<number>()
  const ordered = requirements
    .map((requirement, index) => ({ requirement, index }))
    .sort(
      (left, right) =>
        cards.filter((card) => matchesRequirement(card, left.requirement)).length -
        cards.filter((card) => matchesRequirement(card, right.requirement)).length,
    )

  const visit = (requirementIndex: number, usedCards: number): void => {
    if (requirementIndex === ordered.length) {
      masks.add(usedCards)

      return
    }

    const requirement = ordered[requirementIndex]!.requirement

    for (let cardIndex = 0; cardIndex < cards.length; cardIndex += 1) {
      if ((usedCards & (1 << cardIndex)) !== 0) {
        continue
      }

      if (matchesRequirement(cards[cardIndex]!, requirement)) {
        visit(requirementIndex + 1, usedCards | (1 << cardIndex))
      }
    }
  }

  visit(0, 0)

  return [...masks]
}

function matchesRequirement(card: Card, requirement: ExactRequirement): boolean {
  if (card.kind === "blank") {
    return false
  }

  if (card.kind === "joker") {
    return !requirement.naturalOnly && jokerCanRepresent(card, requirement.face)
  }

  return faceKey(card) === faceKey(requirement.face)
}

function parseNotation(notation: string): ExactRequirement[] {
  return notation.split(/\s+/).flatMap((rawToken) => {
    const naturalOnly = rawToken.startsWith("!")
    const token = rawToken.replace(/^!/, "")
    const numbered = token.match(/^([1-9]+)([BDC])$/)

    if (numbered) {
      const suit = suitFromCode(numbered[2]!)

      return [...numbered[1]!].map((rank) => ({
        face: numberedFace(suit, Number(rank) as NumberedRank),
        naturalOnly,
      }))
    }

    if (/^[ESWN]+$/.test(token)) {
      return [...token].map((value) => ({ face: windFace(windFromCode(value)), naturalOnly }))
    }

    if (/^[RGH]+$/.test(token)) {
      return [...token].map((value) => ({ face: dragonFace(dragonFromCode(value)), naturalOnly }))
    }

    throw new Error(`Invalid Mahjong pattern token: ${rawToken}`)
  })
}

function definition(
  id: SpecialHandId,
  label: string,
  score: number,
  patterns: readonly HandPattern[],
): SpecialHandPattern {
  return { id, label, score, patterns }
}

function sistersPatterns(): ExactPattern[] {
  return starts().flatMap((start) =>
    suitPairs().map(([left, right]) => exact(`${run(start)}${left} ${run(start)}${right}`)),
  )
}

function staircasePatterns(): ExactPattern[] {
  return suitCodes().flatMap((suit) =>
    [1, 2, 3, 4].map((start) => exact(`${run(start)}${suit} ${run(start + 3)}${suit}`)),
  )
}

function mirrorChowPatterns(): ExactPattern[] {
  return suitCodes().flatMap((suit) =>
    starts().map((start) => exact(`${run(start)}${suit} ${run(start)}${suit}`)),
  )
}

function dragonDancePatterns(): ExactPattern[] {
  return [
    exact("!GG 123B 456B"),
    exact("!GG 456B 789B"),
    exact("!HH 123D 456D"),
    exact("!HH 456D 789D"),
    exact("!RR 123C 456C"),
    exact("!RR 456C 789C"),
  ]
}

function treasurePatterns(): CollectionPattern[] {
  const names: Record<CardColor, string> = {
    green: "Jade",
    blue: "Pearl",
    red: "Ruby",
    black: "Winds",
  }

  return (["green", "blue", "red", "black"] as const).map((color) =>
    collection(
      `8x ${names[color]} family`,
      8,
      (card) => card.kind !== "blank" && card.color === color,
      jokersParticipate,
    ),
  )
}

function ranks(): number[] {
  return Array.from({ length: 9 }, (_, index) => index + 1)
}

function starts(): number[] {
  return Array.from({ length: 7 }, (_, index) => index + 1)
}

function run(start: number): string {
  return `${start}${start + 1}${start + 2}`
}

function suitCodes(): Array<"B" | "D" | "C"> {
  return ["B", "D", "C"]
}

function suitPairs(): Array<readonly ["B" | "D" | "C", "B" | "D" | "C"]> {
  return [
    ["B", "D"],
    ["B", "C"],
    ["D", "C"],
  ]
}

function suitFromCode(code: string): Suit {
  const index = { B: 0, D: 1, C: 2 }[code as "B" | "D" | "C"]
  const suit = SUITS[index]

  if (!suit) {
    throw new Error(`Unknown suit code: ${code}`)
  }

  return suit
}

function windFromCode(code: string): "east" | "south" | "west" | "north" {
  const winds = { E: "east", S: "south", W: "west", N: "north" } as const
  const wind = winds[code as "E" | "S" | "W" | "N"]

  if (!wind) {
    throw new Error(`Unknown wind code: ${code}`)
  }

  return wind
}

function dragonFromCode(code: string): "red" | "green" | "white" {
  const dragons = { R: "red", G: "green", H: "white" } as const
  const dragon = dragons[code as "R" | "G" | "H"]

  if (!dragon) {
    throw new Error(`Unknown dragon code: ${code}`)
  }

  return dragon
}

function forEachCombination(
  values: readonly number[],
  size: number,
  visit: (values: number[]) => void,
): void {
  const selected: number[] = []

  const choose = (start: number): void => {
    if (selected.length === size) {
      visit([...selected])

      return
    }

    for (let index = start; index <= values.length - (size - selected.length); index += 1) {
      selected.push(values[index]!)
      choose(index + 1)
      selected.pop()
    }
  }

  choose(0)
}

function maskFromIndexes(indexes: readonly number[]): number {
  return indexes.reduce((mask, index) => mask | (1 << index), 0)
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
