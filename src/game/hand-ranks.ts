import type { HandKind } from "./types"

/** Riichi ladder; Basic keeps its independently calibrated order. */
export const HAND_RANKS = {
  "high-card": 1,
  eye: 2,
  chow: 3,
  "two-eyes": 4,
  "chow-eye": 5,
  pung: 6,
  "three-winds": 7,
  "pung-eye": 8,
  "three-dragons": 9,
  "long-chow": 10,
  "three-dragons-eye": 11,
  "four-winds": 12,
  kong: 13,
} as const satisfies Record<HandKind, number>

export function handRank(kind: HandKind, mode: "basic" | "riichi"): number {
  if (mode === "basic") {
    if (kind === "three-winds") return 6
    if (kind === "pung") return 7
    if (kind === "three-dragons") return 8
    if (kind === "four-winds") return 9
  }
  return HAND_RANKS[kind]
}
