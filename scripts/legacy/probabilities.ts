import type { Card } from "../../src/game/types"
import { identities, isWild } from "./cards"

export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let result = 1
  for (let i = 1; i <= Math.min(k, n - k); i++) result = (result * (n - i + 1)) / i
  return result
}

/** Exact union probabilities for the rare identical-card categories.
 * Distinct identity support sets intersect in at most one card in these decks.
 * A seven-card hand can satisfy at most two different Kong identities. */
export function exactIdentical(deck: readonly Card[]) {
  const supports = Array.from({ length: 34 }, (_, identity) =>
    deck.filter((c) => identities(c, true).includes(identity)),
  )
  if (supports.some((s) => s.length > 5))
    throw new Error("Exact derivation requires support sizes at most five")
  let kongHands = 0,
    quintHands = 0,
    overlappingKongs = 0
  for (const support of supports) {
    const m = support.length
    for (let k = 4; k <= Math.min(5, m); k++)
      kongHands += choose(m, k) * choose(deck.length - m, 7 - k)
    if (m === 5) quintHands += choose(deck.length - 5, 2)
  }
  for (let a = 0; a < supports.length; a++)
    for (let b = a + 1; b < supports.length; b++) {
      const overlap = supports[a].filter((c) => supports[b].some((d) => d.id === c.id)).length
      if (overlap > 1) throw new Error("Exact derivation requires at most one shared substitution")
      if (overlap === 1)
        overlappingKongs += choose(supports[a].length - 1, 3) * choose(supports[b].length - 1, 3)
    }
  // With <=1 shared card per pair, three size-four groups need at least nine
  // physical cards. Thus no higher-order intersections fit within seven.
  return {
    kong: (kongHands - overlappingKongs) / choose(deck.length, 7),
    quint: quintHands / choose(deck.length, 7),
    quintSets: supports.filter((s) => s.length === 5).length,
  }
}

/** Enumerate honor-family multiplicities, weighting each state by combinations. */
export function exactHonors(deck: readonly Card[]) {
  const winds = [0, 1, 2, 3].map(
    (i) => deck.filter((c) => c.kind === "wind" && identities(c, false)[0] === 30 + i).length,
  )
  const black = deck.filter((c) => c.kind === "joker" && c.color === "black").length
  const dragons = [0, 1, 2].map(
    (i) =>
      deck.filter((c) => c.kind === "dragon" && !isWild(c) && identities(c, false)[0] === 27 + i)
        .length,
  )
  const jokers = ["red", "green", "blue"].map(
    (color) => deck.filter((c) => c.kind === "joker" && c.color === color).length,
  )
  const wild = deck.filter((c) => isWild(c) && c.kind === "dragon").length
  const enumerate = (sizes: number[], accepts: (counts: number[]) => boolean) => {
    const rest = deck.length - sizes.reduce((a, b) => a + b, 0)
    let hands = 0
    const visit = (i: number, count: number, weight: number, picked: number[]) => {
      if (i === sizes.length) {
        if (accepts(picked)) hands += weight * choose(rest, 7 - count)
        return
      }
      for (let n = 0; n <= Math.min(sizes[i], 7 - count); n++)
        visit(i + 1, count + n, weight * choose(sizes[i], n), [...picked, n])
    }
    visit(0, 0, 1, [])
    return hands / choose(deck.length, 7)
  }
  const windProbability = (required: number) =>
    enumerate(
      [...winds, black],
      (counts) => counts.slice(0, 4).filter((n) => n > 0).length + counts[4] >= required,
    )
  return {
    "three-winds": windProbability(3),
    "four-winds": windProbability(4),
    "three-dragons": enumerate(
      [...dragons, ...jokers, wild],
      (counts) => [0, 1, 2].filter((i) => counts[i] + counts[i + 3] > 0).length + counts[6] >= 3,
    ),
    "twin-lotus":
      (choose(deck.filter((c) => c.kind === "flower").length, 2) * choose(deck.length - 2, 5)) /
      choose(deck.length, 7),
  }
}

/** Exact Dragon+Eye union. Split the deck into Dragon-capable cards and the
 * remainder. Enumerate the small former set; count pair-free remainder subsets
 * with an independence polynomial, so overlapping possible Eyes count once. */
export function exactDragonEye(deck: readonly Card[]): number {
  const dragonPool = deck.filter((c) => identities(c, true).some((id) => id >= 27 && id < 30))
  const rest = deck.filter((c) => !dragonPool.some((d) => d.id === c.id))
  let independent = [1, 0, 0, 0, 0]
  const multiply = (factor: number[]) => {
    const next = [0, 0, 0, 0, 0]
    for (let i = 0; i < 5; i++)
      for (let j = 0; j < factor.length && i + j < 5; j++) next[i + j] += independent[i] * factor[j]
    independent = next
  }
  for (let rank = 1; rank <= 9; rank++) {
    // Pick at most one natural from each suit; a wild of this rank conflicts
    // with every natural in this component and can only be chosen alone.
    let coefficients = [1]
    for (let suit = 0; suit < 3; suit++) {
      const copies = rest.filter(
        (c) => !isWild(c) && identities(c, false).includes(suit * 9 + rank - 1),
      ).length
      const next = Array<number>(coefficients.length + 1).fill(0)
      coefficients.forEach((n, i) => {
        next[i] += n
        next[i + 1] += n * copies
      })
      coefficients = next
    }
    coefficients[1] += rest.filter(
      (c) => isWild(c) && c.kind === "numbered" && c.rank === rank,
    ).length
    multiply(coefficients)
  }
  for (let wind = 30; wind < 34; wind++)
    multiply([1, rest.filter((c) => identities(c, false).includes(wind)).length])
  const isolated = rest.filter((c) => identities(c, false).length === 0).length
  for (let i = 0; i < isolated; i++) multiply([1, 1])
  const hasDragons = (cards: Card[]) => {
    const colors = new Set(
      cards
        .filter((c) => !isWild(c))
        .flatMap((c) => identities(c, true).filter((id) => id >= 27 && id < 30)),
    )
    return colors.size + cards.filter(isWild).length >= 3
  }
  const hasDragonEye = (cards: Card[]) => {
    for (let i = 0; i < cards.length; i++)
      for (let j = i + 1; j < cards.length; j++) {
        if (!identities(cards[i], false).some((id) => identities(cards[j], false).includes(id)))
          continue
        if (hasDragons(cards.filter((_, k) => k !== i && k !== j))) return true
      }
    return false
  }
  let hands = 0
  for (let mask = 0; mask < 1 << dragonPool.length; mask++) {
    const picked = dragonPool.filter((_, i) => mask & (1 << i)),
      count = picked.length
    if (count < 3 || count > 7 || !hasDragons(picked)) continue
    if (hasDragonEye(picked)) hands += choose(rest.length, 7 - count)
    else if (7 - count >= 2) hands += choose(rest.length, 7 - count) - independent[7 - count]
  }
  return hands / choose(deck.length, 7)
}
