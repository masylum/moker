import { faceKey } from "./cards"
import { HAND_RANKS } from "./rules"
import {
  DRAGONS,
  FLOWERS,
  SUITS,
  WINDS,
  type Card,
  type CardColor,
  type CardFace,
  type HandKind,
  type HandScore,
  type Suit,
} from "./types"

export type HandStrength = Pick<HandScore, "total" | "tieBreak">

interface Target {
  faceIndex: number
  naturalOnly: boolean
}

interface Requirement {
  faceIndex: number
  colorIndex: number
  natural: number
  flexible: number
}

interface Pattern {
  kind: HandKind
  rank: number
  size: number
  tieBreak: number[]
  requirements: Requirement[]
  requiresJoker: boolean
}

interface PreparedHand {
  counts: Uint8Array
  jokers: Uint8Array
  highCards: number[]
  cacheKey: string
}

const colors = ["green", "blue", "red", "black"] as const
const naturalFaces = createNaturalFaces()
const scoringFaces = naturalFaces.filter((face) => face.kind !== "flower")
const faceIndexes = new Map(naturalFaces.map((face, index) => [faceKey(face), index]))
const patterns = createPatterns()
const strengthCache = new Map<string, HandStrength>()
const STRENGTH_CACHE_LIMIT = 200_000

export function scoreHandStrength(cards: readonly Card[]): HandStrength {
  const hand = prepareHand(cards)
  const cached = strengthCache.get(hand.cacheKey)

  if (cached) {
    return cached
  }

  const imperialGarden = imperialGardenStrength(hand)

  if (imperialGarden) {
    return cache(hand.cacheKey, imperialGarden)
  }

  const completed = completedHandStrength(hand)

  if (completed) {
    return cache(hand.cacheKey, completed)
  }

  return cache(hand.cacheKey, {
    total: HAND_RANKS["high-card"],
    tieBreak: hand.highCards,
  })
}

export function clearStrengthCache(): void {
  strengthCache.clear()
}

function completedHandStrength(hand: PreparedHand): HandStrength | null {
  const pairs = scoringFaces.map((_, index) => index).filter((index) => hand.counts[index]! >= 2)
  const flowers = FLOWERS.map((flower) => faceIndexes.get(`flower-${flower}`)!).filter(
    (index) => hand.counts[index]! > 0,
  )

  if (flowers.length >= 2 && pairs.length > 0) {
    const flowerValues = flowers
      .map((index) => faceValue(naturalFaces[index]!))
      .sort((left, right) => right - left)
    const eyeValue = Math.max(...pairs.map((index) => faceValue(naturalFaces[index]!)))

    return {
      total: HAND_RANKS.bouquet,
      tieBreak: [flowerValues[0]!, flowerValues[1]!, eyeValue, eyeValue],
    }
  }

  if (
    (naturalCount(hand, "wind-east") >= 2 && naturalCount(hand, "wind-west") >= 2) ||
    (naturalCount(hand, "wind-north") >= 2 && naturalCount(hand, "wind-south") >= 2)
  ) {
    return { total: HAND_RANKS.crosswinds, tieBreak: [11, 11, 11, 11] }
  }

  const kong = bestIdenticalStrength(hand, 4, true)

  if (kong) {
    return { total: HAND_RANKS.kong, tieBreak: kong }
  }

  const dragonDancer = bestDragonDancer(hand)

  if (dragonDancer) {
    return { total: HAND_RANKS["dragon-dancer"], tieBreak: dragonDancer }
  }

  if (
    canMatchKeys(
      hand,
      WINDS.map((wind) => `wind-${wind}`),
    )
  ) {
    return { total: HAND_RANKS["four-winds"], tieBreak: [11, 11, 11, 11] }
  }

  const threeDragonsEye = bestThreeDragonsEye(hand, pairs)

  if (threeDragonsEye) {
    return { total: HAND_RANKS["three-dragons-eye"], tieBreak: threeDragonsEye }
  }

  const pungEye = bestPungEye(hand, pairs)

  if (pungEye) {
    return { total: HAND_RANKS["pung-eye"], tieBreak: pungEye }
  }

  if (
    canMatchKeys(
      hand,
      DRAGONS.map((dragon) => `dragon-${dragon}`),
    )
  ) {
    return { total: HAND_RANKS["three-dragons"], tieBreak: [10, 10, 10] }
  }

  const pung = bestIdenticalStrength(hand, 3, false)

  if (pung) {
    return { total: HAND_RANKS.pung, tieBreak: pung }
  }

  const chowEye = bestChowEye(hand, pairs)

  if (chowEye) {
    return { total: HAND_RANKS["chow-eye"], tieBreak: chowEye }
  }

  if (pairs.length >= 2) {
    const values = pairs
      .map((index) => faceValue(naturalFaces[index]!))
      .sort((left, right) => right - left)

    return {
      total: HAND_RANKS["two-eyes"],
      tieBreak: [values[0]!, values[0]!, values[1]!, values[1]!],
    }
  }

  const pureSuit = pureSuitStrength(hand)

  if (pureSuit) {
    return pureSuit
  }

  const chow = bestChow(hand)

  if (chow) {
    return { total: HAND_RANKS.chow, tieBreak: chow }
  }

  if (pairs.length > 0) {
    const value = Math.max(...pairs.map((index) => faceValue(naturalFaces[index]!)))

    return { total: HAND_RANKS.eye, tieBreak: [value, value] }
  }

  return null
}

function bestIdenticalStrength(
  hand: PreparedHand,
  size: 3 | 4,
  requiresJoker: boolean,
): number[] | null {
  let bestValue = -1

  for (let index = 0; index < scoringFaces.length; index += 1) {
    const count = hand.counts[index]!
    const jokerCount = hand.jokers[colorIndex(scoringFaces[index]!.color!)]!
    const canMatch = requiresJoker
      ? count > 0 && jokerCount > 0 && count + jokerCount >= size
      : count > 0 && count + jokerCount >= size

    if (canMatch) {
      bestValue = Math.max(bestValue, faceValue(scoringFaces[index]!))
    }
  }

  return bestValue < 0 ? null : Array.from({ length: size }, () => bestValue)
}

function bestDragonDancer(hand: PreparedHand): number[] | null {
  let best: number[] | null = null

  for (const suit of SUITS) {
    const dragon = suit === "bamboo" ? "green" : suit === "dots" ? "white" : "red"

    if (naturalCount(hand, `dragon-${dragon}`) < 2) {
      continue
    }

    const chow = bestChow(hand, suit)

    if (chow) {
      best = strongerTie(best, [...chow, 10, 10])
    }
  }

  return best
}

function bestThreeDragonsEye(hand: PreparedHand, pairs: number[]): number[] | null {
  let best: number[] | null = null

  for (const eyeIndex of pairs) {
    const reservations = new Map([[eyeIndex, 2]])

    if (
      canMatchKeys(
        hand,
        DRAGONS.map((dragon) => `dragon-${dragon}`),
        reservations,
      )
    ) {
      const eyeValue = faceValue(scoringFaces[eyeIndex]!)
      best = strongerTie(best, [10, 10, 10, eyeValue, eyeValue])
    }
  }

  return best
}

function bestPungEye(hand: PreparedHand, pairs: number[]): number[] | null {
  let best: number[] | null = null

  for (const eyeIndex of pairs) {
    for (let pungIndex = 0; pungIndex < scoringFaces.length; pungIndex += 1) {
      if (pungIndex === eyeIndex) {
        continue
      }

      const natural = hand.counts[pungIndex]!
      const jokers = hand.jokers[colorIndex(scoringFaces[pungIndex]!.color!)]!

      if (natural === 0 || natural + jokers < 3) {
        continue
      }

      const pungValue = faceValue(scoringFaces[pungIndex]!)
      const eyeValue = faceValue(scoringFaces[eyeIndex]!)
      best = strongerTie(best, [pungValue, pungValue, pungValue, eyeValue, eyeValue])
    }
  }

  return best
}

function bestChowEye(hand: PreparedHand, pairs: number[]): number[] | null {
  let best: number[] | null = null

  for (const eyeIndex of pairs) {
    const eyeValue = faceValue(scoringFaces[eyeIndex]!)

    for (const suit of SUITS) {
      for (let start = 7; start >= 1; start -= 1) {
        if (canMatchChow(hand, suit, start, new Map([[eyeIndex, 2]]))) {
          best = strongerTie(best, [start + 2, start + 1, start, eyeValue, eyeValue])
        }
      }
    }
  }

  return best
}

function bestChow(hand: PreparedHand, onlySuit?: Suit): number[] | null {
  let best: number[] | null = null

  for (const suit of onlySuit ? [onlySuit] : SUITS) {
    for (let start = 7; start >= 1; start -= 1) {
      if (canMatchChow(hand, suit, start)) {
        best = strongerTie(best, [start + 2, start + 1, start])
      }
    }
  }

  return best
}

function canMatchChow(
  hand: PreparedHand,
  suit: Suit,
  start: number,
  reservations = new Map<number, number>(),
): boolean {
  let missing = 0

  for (let offset = 0; offset < 3; offset += 1) {
    const index = faceIndexes.get(`${suit}-${start + offset}`)!
    const available = hand.counts[index]! - (reservations.get(index) ?? 0)

    if (available < 1) {
      missing += 1
    }
  }

  return missing <= hand.jokers[colorIndex(suitColor(suit))]!
}

function canMatchKeys(
  hand: PreparedHand,
  keys: string[],
  reservations = new Map<number, number>(),
): boolean {
  const needed = [0, 0, 0, 0]

  for (const key of keys) {
    const index = faceIndexes.get(key)!
    const available = hand.counts[index]! - (reservations.get(index) ?? 0)

    if (available < 1) {
      const color = colorIndex(naturalFaces[index]!.color!)
      needed[color] = needed[color]! + 1
    }
  }

  return needed.every((count, color) => count <= hand.jokers[color]!)
}

function naturalCount(hand: PreparedHand, key: string): number {
  return hand.counts[faceIndexes.get(key)!]!
}

function strongerTie(current: number[] | null, candidate: number[]): number[] {
  return !current || compareTieBreak(candidate, current) > 0 ? candidate : current
}

export function compareHandStrengths(left: HandStrength, right: HandStrength): number {
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

export function summarizeHandPotential(cards: readonly Card[]): {
  currentRank: number
  nextRank: number | null
  nextMissing: number | null
} {
  const hand = prepareHand(cards)
  const currentRank = scoreHandStrength(cards).total
  const progress = new Map<HandKind, { rank: number; size: number; matched: number }>()

  for (const pattern of patterns) {
    const matched = matchedPatternCards(hand, pattern)
    const current = progress.get(pattern.kind)

    if (!current || matched > current.matched) {
      progress.set(pattern.kind, {
        rank: pattern.rank,
        size: pattern.size,
        matched,
      })
    }
  }

  const pureMatched = pureSuitMatchedCards(hand)
  progress.set("pure-suit", {
    rank: HAND_RANKS["pure-suit"],
    size: 5,
    matched: pureMatched,
  })
  const imperialMatched = imperialGardenMatchedCards(hand)
  progress.set("imperial-garden", {
    rank: HAND_RANKS["imperial-garden"],
    size: 3,
    matched: imperialMatched,
  })
  const next = [...progress.values()]
    .map((candidate) => ({ ...candidate, missing: candidate.size - candidate.matched }))
    .filter((candidate) => candidate.rank > currentRank && candidate.missing > 0)
    .sort(
      (left, right) =>
        left.missing - right.missing || right.rank - left.rank || left.size - right.size,
    )[0]

  return {
    currentRank,
    nextRank: next?.rank ?? null,
    nextMissing: next?.missing ?? null,
  }
}

function createPatterns(): Pattern[] {
  const result: Pattern[] = []
  const add = (
    kind: Exclude<HandKind, "high-card" | "pure-suit" | "imperial-garden">,
    targets: Target[],
    tieBreak: number[],
    requiresJoker = false,
  ): void => {
    result.push({
      kind,
      rank: HAND_RANKS[kind],
      size: targets.length,
      tieBreak,
      requirements: groupTargets(targets),
      requiresJoker,
    })
  }
  const eyeTargets = scoringFaces.map((face) => repeatTarget(face, 2, true))
  const chowTargets = SUITS.flatMap((suit) =>
    Array.from({ length: 7 }, (_, index) => chowTarget(suit, index + 1)),
  )
  const dragonTargets = DRAGONS.map((dragon) => target(`dragon-${dragon}`, false))
  const windTargets = WINDS.map((wind) => target(`wind-${wind}`, false))

  for (let left = 0; left < FLOWERS.length; left += 1) {
    for (let right = left + 1; right < FLOWERS.length; right += 1) {
      const flowerValues = [12 + right, 12 + left]

      for (let eyeIndex = 0; eyeIndex < scoringFaces.length; eyeIndex += 1) {
        const eye = scoringFaces[eyeIndex]!
        const value = faceValue(eye)
        add(
          "bouquet",
          [
            target(`flower-${FLOWERS[left]}`, true),
            target(`flower-${FLOWERS[right]}`, true),
            ...eyeTargets[eyeIndex]!,
          ],
          [...flowerValues, value, value],
        )
      }
    }
  }

  add(
    "crosswinds",
    [...repeatTargetKey("wind-east", 2, true), ...repeatTargetKey("wind-west", 2, true)],
    [11, 11, 11, 11],
  )
  add(
    "crosswinds",
    [...repeatTargetKey("wind-north", 2, true), ...repeatTargetKey("wind-south", 2, true)],
    [11, 11, 11, 11],
  )

  for (const face of scoringFaces) {
    const value = faceValue(face)
    add("kong", repeatTarget(face, 4, false), [value, value, value, value], true)
  }

  chowTargets.forEach((chow, index) => {
    const suit = SUITS[Math.floor(index / 7)]!
    const start = (index % 7) + 1
    const dragon = suit === "bamboo" ? "green" : suit === "dots" ? "white" : "red"
    add(
      "dragon-dancer",
      [...chow, ...repeatTargetKey(`dragon-${dragon}`, 2, true)],
      [start + 2, start + 1, start, 10, 10],
    )
  })

  add("four-winds", windTargets, [11, 11, 11, 11])

  scoringFaces.forEach((eye, eyeIndex) => {
    const value = faceValue(eye)
    add(
      "three-dragons-eye",
      [...dragonTargets, ...eyeTargets[eyeIndex]!],
      [10, 10, 10, value, value],
    )
  })

  scoringFaces.forEach((pung) => {
    const pungValue = faceValue(pung)

    scoringFaces.forEach((eye, eyeIndex) => {
      if (faceKey(pung) === faceKey(eye)) {
        return
      }

      const eyeValue = faceValue(eye)
      add(
        "pung-eye",
        [...repeatTarget(pung, 3, false), ...eyeTargets[eyeIndex]!],
        [pungValue, pungValue, pungValue, eyeValue, eyeValue],
      )
    })
  })

  add("three-dragons", dragonTargets, [10, 10, 10])

  for (const face of scoringFaces) {
    const value = faceValue(face)
    add("pung", repeatTarget(face, 3, false), [value, value, value])
  }

  chowTargets.forEach((chow, index) => {
    const start = (index % 7) + 1

    scoringFaces.forEach((eye, eyeIndex) => {
      const value = faceValue(eye)
      add(
        "chow-eye",
        [...chow, ...eyeTargets[eyeIndex]!],
        [start + 2, start + 1, start, value, value],
      )
    })
  })

  for (let left = 0; left < scoringFaces.length; left += 1) {
    for (let right = left + 1; right < scoringFaces.length; right += 1) {
      const values = [faceValue(scoringFaces[left]!), faceValue(scoringFaces[right]!)].sort(
        (a, b) => b - a,
      )
      add(
        "two-eyes",
        [...eyeTargets[left]!, ...eyeTargets[right]!],
        [values[0]!, values[0]!, values[1]!, values[1]!],
      )
    }
  }

  chowTargets.forEach((chow, index) => {
    const start = (index % 7) + 1
    add("chow", chow, [start + 2, start + 1, start])
  })

  scoringFaces.forEach((face, index) => {
    const value = faceValue(face)
    add("eye", eyeTargets[index]!, [value, value])
  })

  return result.sort(
    (left, right) => right.rank - left.rank || compareTieBreak(right.tieBreak, left.tieBreak),
  )
}

function prepareHand(cards: readonly Card[]): PreparedHand {
  const counts = new Uint8Array(naturalFaces.length)
  const jokers = new Uint8Array(colors.length)
  const highCards: number[] = []
  const keys: string[] = []

  for (const card of cards) {
    const key = faceKey(card)
    keys.push(key)

    if (card.kind === "joker") {
      const index = colorIndex(card.color)
      jokers[index] = jokers[index]! + 1
    } else if (card.kind !== "blank") {
      const index = faceIndexes.get(key)!
      counts[index] = counts[index]! + 1

      if (card.kind !== "flower") {
        highCards.push(faceValue(card))
      }
    }
  }

  highCards.sort((left, right) => right - left)
  keys.sort()

  return { counts, jokers, highCards, cacheKey: keys.join("|") }
}

function matchedPatternCards(hand: PreparedHand, pattern: Pattern): number {
  const jokerNeeds = [0, 0, 0, 0]
  let matched = 0
  let matchedJokers = 0

  for (const requirement of pattern.requirements) {
    const available = hand.counts[requirement.faceIndex]!
    const naturalMatched = Math.min(available, requirement.natural)
    const remaining = Math.max(0, available - naturalMatched)
    const flexibleMatched = Math.min(remaining, requirement.flexible)
    matched += naturalMatched + flexibleMatched
    jokerNeeds[requirement.colorIndex] =
      jokerNeeds[requirement.colorIndex]! + (requirement.flexible - flexibleMatched)
  }

  for (let color = 0; color < jokerNeeds.length; color += 1) {
    const used = Math.min(jokerNeeds[color]!, hand.jokers[color]!)
    matched += used
    matchedJokers += used
  }

  if (pattern.requiresJoker && matchedJokers === 0) {
    return Math.min(pattern.size - 1, matched)
  }

  return Math.min(pattern.size, matched)
}

function imperialGardenStrength(hand: PreparedHand): HandStrength | null {
  const values = FLOWERS.flatMap((flower, index) => {
    const count = hand.counts[faceIndexes.get(`flower-${flower}`)!]!

    return count > 0 ? [12 + index] : []
  }).sort((left, right) => right - left)

  if (values.length >= 3) {
    return { total: HAND_RANKS["imperial-garden"], tieBreak: values.slice(0, 3) }
  }

  if (values.length >= 2 && hand.jokers[colorIndex("black")]! > 0) {
    return { total: HAND_RANKS["imperial-garden"], tieBreak: [...values.slice(0, 2), 12] }
  }

  return null
}

function imperialGardenMatchedCards(hand: PreparedHand): number {
  const natural = FLOWERS.filter(
    (flower) => hand.counts[faceIndexes.get(`flower-${flower}`)!]! > 0,
  ).length

  return Math.min(3, natural + hand.jokers[colorIndex("black")]!)
}

function pureSuitStrength(hand: PreparedHand): HandStrength | null {
  let best: HandStrength | null = null

  for (const suit of SUITS) {
    const values: number[] = []

    for (let rank = 1; rank <= 9; rank += 1) {
      const count = hand.counts[faceIndexes.get(`${suit}-${rank}`)!]!

      for (let copy = 0; copy < count; copy += 1) {
        values.push(rank)
      }
    }

    const jokerCount = hand.jokers[colorIndex(suitColor(suit))]!

    for (let copy = 0; copy < jokerCount; copy += 1) {
      values.push(9)
    }

    if (values.length < 5) {
      continue
    }

    values.sort((left, right) => right - left)
    const candidate = { total: HAND_RANKS["pure-suit"], tieBreak: values.slice(0, 5) }

    if (!best || compareHandStrengths(candidate, best) > 0) {
      best = candidate
    }
  }

  return best
}

function pureSuitMatchedCards(hand: PreparedHand): number {
  let best = 0

  for (const suit of SUITS) {
    let matched = hand.jokers[colorIndex(suitColor(suit))]!

    for (let rank = 1; rank <= 9; rank += 1) {
      matched += hand.counts[faceIndexes.get(`${suit}-${rank}`)!]!
    }

    best = Math.max(best, matched)
  }

  return Math.min(5, best)
}

function groupTargets(targets: readonly Target[]): Requirement[] {
  const grouped = new Map<number, Requirement>()

  for (const requiredTarget of targets) {
    const current = grouped.get(requiredTarget.faceIndex) ?? {
      faceIndex: requiredTarget.faceIndex,
      colorIndex: colorIndex(naturalFaces[requiredTarget.faceIndex]!.color!),
      natural: 0,
      flexible: 0,
    }

    if (requiredTarget.naturalOnly) {
      current.natural += 1
    } else {
      current.flexible += 1
    }

    grouped.set(requiredTarget.faceIndex, current)
  }

  return [...grouped.values()]
}

function chowTarget(suit: Suit, start: number): Target[] {
  return [0, 1, 2].map((offset) => target(`${suit}-${start + offset}`, false))
}

function repeatTarget(face: CardFace, count: number, naturalOnly: boolean): Target[] {
  return repeatTargetKey(faceKey(face), count, naturalOnly)
}

function repeatTargetKey(key: string, count: number, naturalOnly: boolean): Target[] {
  return Array.from({ length: count }, () => target(key, naturalOnly))
}

function target(key: string, naturalOnly: boolean): Target {
  return { faceIndex: faceIndexes.get(key)!, naturalOnly }
}

function createNaturalFaces(): CardFace[] {
  return [
    ...SUITS.flatMap((suit) =>
      Array.from({ length: 9 }, (_, index) => ({
        kind: "numbered" as const,
        suit,
        rank: (index + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
        color: suitColor(suit),
      })),
    ),
    ...DRAGONS.map((dragon) => ({
      kind: "dragon" as const,
      dragon,
      color: (dragon === "green" ? "green" : dragon === "white" ? "blue" : "red") as CardColor,
    })),
    ...WINDS.map((wind) => ({ kind: "wind" as const, wind, color: "black" as const })),
    ...FLOWERS.map((flower) => ({ kind: "flower" as const, flower, color: "black" as const })),
  ]
}

function suitColor(suit: Suit): CardColor {
  return suit === "bamboo" ? "green" : suit === "dots" ? "blue" : "red"
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

function colorIndex(color: CardColor): number {
  return colors.indexOf(color)
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

function cache(key: string, strength: HandStrength): HandStrength {
  if (strengthCache.size >= STRENGTH_CACHE_LIMIT) {
    strengthCache.clear()
  }

  strengthCache.set(key, strength)

  return strength
}
