import { dragonFace, jokerFace, numberedFace, windFace } from "../game/cards"
import type { Card, CardFace } from "../game/types"

const bam = numberedFace("bamboo", 3)
const dot = numberedFace("dots", 5)
const pair = [dot, dot]
const chow = [2, 3, 4].map((rank) => numberedFace("bamboo", rank as 2 | 3 | 4))
const winds = [windFace("east"), windFace("south"), windFace("west"), windFace("north")]
const dragons = [dragonFace("red"), dragonFace("green"), dragonFace("white")]
const examples: Record<string, CardFace[][]> = {
  "High Card": [[bam]],
  Eyes: [pair],
  Chow: [chow],
  "Two Eyes": [[bam, bam], pair],
  "Three Winds": [winds.slice(0, 3)],
  Pung: [[bam, bam, bam]],
  "Three Dragons": [dragons],
  "Long Chow": [[6, 7, 8, 9].map((rank) => numberedFace("dots", rank as 6 | 7 | 8 | 9))],
  "Four Winds": [winds],
  Kong: [[bam, bam, bam, jokerFace("green")]],
}

export function handExamples(label: string): Card[][] {
  return (examples[label] ?? []).map((group, groupIndex) =>
    group.map((face, index) => ({ ...face, id: `example-${label}-${groupIndex}-${index}` })),
  )
}
