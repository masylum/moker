/** Independent scoring oracle: assign each Joker a face, then enumerate card subsets. */
import type { Card } from "../src/game/types"
export function oracleContains(
  cards: readonly Card[],
  shadow: boolean,
  restricted = false,
  originalThree = false,
): Set<string> {
  const suits = shadow
    ? ["bamboo", "dots", "characters", "shadow"]
    : ["bamboo", "dots", "characters"]
  const dragons = shadow ? ["red", "green", "white", "black"] : ["red", "green", "white"]
  const winds = ["east", "south", "west", "north"]
  const face = (c: Card) =>
    c.kind === "numbered"
      ? `s:${c.suit}:${c.rank}`
      : c.kind === "dragon"
        ? `d:${c.dragon}`
        : c.kind === "wind"
          ? `w:${c.wind}`
          : ""
  const result = new Set<string>()
  if (cards.some((c) => face(c))) result.add("high-card")
  if (cards.filter((c) => c.kind === "flower").length === 2) result.add("twin-lotus")
  const eyes: { mask: number; face: string }[] = []
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      if (face(cards[i]!) && face(cards[i]!) === face(cards[j]!))
        eyes.push({ mask: (1 << i) | (1 << j), face: face(cards[i]!) })
  if (eyes.length) result.add("eye")
  for (const a of eyes)
    for (const b of eyes) if (a.face !== b.face && !(a.mask & b.mask)) result.add("two-eyes")
  const options = cards.map((c) => {
    if (c.kind !== "joker") return [face(c)]
    if (c.color === "black")
      return [
        ...winds.map((w) => `w:${w}`),
        ...(shadow && !restricted
          ? [...Array.from({ length: 9 }, (_, i) => `s:shadow:${i + 1}`), "d:black"]
          : []),
      ]
    const suit = c.color === "red" ? "characters" : c.color === "green" ? "bamboo" : "dots"
    const dragon = c.color === "red" ? "red" : c.color === "green" ? "green" : "white"
    return [...Array.from({ length: 9 }, (_, i) => `s:${suit}:${i + 1}`), `d:${dragon}`]
  })
  const choose = (a: number[], n: number): number[] => {
    const masks: number[] = []
    function visit(start: number, left: number, mask: number) {
      if (!left) {
        masks.push(mask)
        return
      }
      for (let i = start; i <= a.length - left; i++) visit(i + 1, left - 1, mask | (1 << a[i]!))
    }
    visit(0, n, 0)
    return masks
  }
  const combinations = (items: string[], n: number): string[][] => {
    const out: string[][] = []
    function visit(start: number, picked: string[]) {
      if (picked.length === n) {
        out.push(picked)
        return
      }
      for (let i = start; i < items.length; i++) visit(i + 1, [...picked, items[i]!])
    }
    visit(0, [])
    return out
  }
  const trios = originalThree ? [dragons.slice(0, 3)] : combinations(dragons, 3)
  const windTrios = combinations(winds, 3)
  const assignment: string[] = []
  function evaluate() {
    const groups = new Map<string, number[]>()
    assignment.forEach((f, i) => {
      if (f) groups.set(f, [...(groups.get(f) ?? []), i])
    })
    function product(faces: string[]): number[] {
      let masks = [0]
      for (const f of faces) {
        const indices = groups.get(f)
        if (!indices) return []
        masks = masks.flatMap((m) => indices.map((i) => m | (1 << i)))
      }
      return masks
    }
    for (const [f, indices] of groups) {
      if (indices.length >= 4) result.add("kong")
      if (indices.length >= 5) result.add("quint")
      if (indices.length >= 3) {
        result.add("pung")
        for (const m of choose(indices, 3))
          if (eyes.some((e) => e.face !== f && !(e.mask & m))) result.add("pung-eye")
      }
    }
    for (const suit of suits)
      for (const length of [3, 5])
        for (let start = 1; start <= 10 - length; start++) {
          const masks = product(Array.from({ length }, (_, i) => `s:${suit}:${start + i}`))
          if (masks.length) result.add(length === 3 ? "chow" : "long-chow")
          if (length === 3 && masks.some((m) => eyes.some((e) => !(e.mask & m))))
            result.add("chow-eye")
        }
    for (const trio of trios) {
      const masks = product(trio.map((d) => `d:${d}`))
      if (masks.length) result.add("three-dragons")
      if (masks.some((m) => eyes.some((e) => !(e.mask & m)))) result.add("three-dragons-eye")
    }
    if (shadow && product(dragons.map((d) => `d:${d}`)).length) result.add("four-dragons")
    if (windTrios.some((t) => product(t.map((w) => `w:${w}`)).length)) result.add("three-winds")
    if (product(winds.map((w) => `w:${w}`)).length) result.add("four-winds")
  }
  function assign(i: number) {
    if (i === cards.length) {
      evaluate()
      return
    }
    for (const assignedFace of options[i]!) {
      assignment[i] = assignedFace
      assign(i + 1)
    }
  }
  assign(0)
  return result
}
