import { compareHandStrengths } from "../../src/game/scoring"
import type { Card, HandScore } from "../../src/game/types"
import { identities, identityValue } from "./cards"

export const LEGACY_LADDER = [
  "high-card",
  "eye",
  "chow",
  "two-eyes",
  "chow-eye",
  "pung",
  "three-winds",
  "pung-eye",
  "three-dragons",
  "twin-lotus",
  "long-chow",
  "three-dragons-eye",
  "four-winds",
  "kong",
  "quint",
] as const
export type LegacyKind = (typeof LEGACY_LADDER)[number]
export interface LegacyScore extends HandScore {
  kind: LegacyKind
}
interface Atom {
  mask: number
  identity: number
  tie: number[]
}
const cache = new Map<string, LegacyScore>()

function subsets(mask: number, size: number): number[] {
  const result: number[] = []
  const choose = (available: number, count: number, picked: number) => {
    if (!count) {
      result.push(picked)
      return
    }
    while (available) {
      const bit = available & -available
      available ^= bit
      choose(available, count - 1, picked | bit)
    }
  }
  choose(mask, size, 0)
  return result
}

/** Exact injective matching: every physical card fills at most one target.
 * Returning masks is essential for compound hands with competing wild uses. */
function match(targets: number[], masks: number[]): number[] {
  const sorted = targets.map((t) => masks[t]).sort((a, b) => popcount(a) - popcount(b))
  if (!sorted[0] || popcount(sorted.reduce((a, b) => a | b, 0)) < sorted.length) return []
  let used = new Set([0])
  for (const mask of sorted) {
    const next = new Set<number>()
    for (const taken of used) {
      let available = mask & ~taken
      while (available) {
        const bit = available & -available
        available ^= bit
        next.add(taken | bit)
      }
    }
    used = next
    if (!used.size) break
  }
  return [...used]
}

function popcount(n: number): number {
  let count = 0
  while (n) {
    n &= n - 1
    count++
  }
  return count
}

/** Collect every contained category for rarity analysis; best alone hides overlaps. */
export function evaluateLegacy(cards: readonly Card[], contains?: Set<LegacyKind>): LegacyScore {
  const key = cards.map((c) => c.id).join(",")
  const cached = contains ? undefined : cache.get(key)
  if (cached) return cached
  const masks = Array<number>(34).fill(0),
    naturalMasks = Array<number>(34).fill(0)
  cards.forEach((card, index) => {
    for (const target of identities(card, true)) masks[target] |= 1 << index
    for (const target of identities(card, false)) naturalMasks[target] |= 1 << index
  })
  let best: LegacyScore = {
    kind: "high-card",
    total: 1,
    tieBreak: [],
    selectedCardIds: [],
    combinations: [],
  }
  const offer = (kind: LegacyKind, mask: number, tieBreak: number[]) => {
    contains?.add(kind)
    const total = LEGACY_LADDER.indexOf(kind) + 1
    if (compareHandStrengths({ total, tieBreak }, best) > 0) {
      best = {
        kind,
        total,
        tieBreak,
        selectedCardIds: cards.filter((_, i) => mask & (1 << i)).map((c) => c.id),
        combinations: [],
      }
    }
  }
  const eyes: Atom[] = [],
    pungs: Atom[] = [],
    chows: Atom[] = [],
    dragons: Atom[] = []
  for (let target = 0; target < 34; target++) {
    const value = identityValue(target)
    if (naturalMasks[target])
      offer("high-card", naturalMasks[target] & -naturalMasks[target], [value])
    for (const mask of subsets(naturalMasks[target], 2)) {
      const tie = [value, value]
      eyes.push({ mask, identity: target, tie })
      offer("eye", mask, tie)
    }
    for (const size of [3, 4, 5]) {
      if (popcount(masks[target]) < size) continue
      for (const mask of subsets(masks[target], size)) {
        const tie = Array<number>(size).fill(value)
        if (size === 3) pungs.push({ mask, identity: target, tie })
        offer(size === 3 ? "pung" : size === 4 ? "kong" : "quint", mask, tie)
      }
    }
  }
  for (let suit = 0; suit < 3; suit++) {
    for (const length of [3, 5]) {
      for (let start = 1; start <= 10 - length; start++) {
        const targets = Array.from({ length }, (_, i) => suit * 9 + start - 1 + i)
        for (const mask of match(targets, masks)) {
          const tie = Array.from({ length }, (_, i) => start + length - i - 1)
          if (length === 3) chows.push({ mask, identity: -1, tie })
          offer(length === 3 ? "chow" : "long-chow", mask, tie)
        }
      }
    }
  }
  for (const mask of match([27, 28, 29], masks)) {
    dragons.push({ mask, identity: -1, tie: [10, 10, 10] })
    offer("three-dragons", mask, [10, 10, 10])
  }
  for (let omitted = 30; omitted < 34; omitted++)
    for (const mask of match(
      [30, 31, 32, 33].filter((t) => t !== omitted),
      masks,
    ))
      offer("three-winds", mask, [11, 11, 11])
  for (const mask of match([30, 31, 32, 33], masks)) offer("four-winds", mask, [11, 11, 11, 11])
  const lotusMask = cards.reduce((m, c, i) => (c.kind === "flower" ? m | (1 << i) : m), 0)
  for (const mask of subsets(lotusMask, 2)) offer("twin-lotus", mask, [])
  for (const eye of eyes) {
    for (const other of eyes)
      if (!(eye.mask & other.mask) && eye.identity !== other.identity)
        offer(
          "two-eyes",
          eye.mask | other.mask,
          [...eye.tie, ...other.tie].sort((a, b) => b - a),
        )
    for (const [atoms, kind] of [
      [chows, "chow-eye"],
      [pungs, "pung-eye"],
      [dragons, "three-dragons-eye"],
    ] as const)
      for (const atom of atoms)
        if (!(eye.mask & atom.mask) && (kind !== "pung-eye" || eye.identity !== atom.identity))
          offer(kind, eye.mask | atom.mask, [...atom.tie, ...eye.tie])
  }
  if (!contains) {
    if (cache.size >= 100_000) cache.clear()
    cache.set(key, best)
  }
  return best
}
