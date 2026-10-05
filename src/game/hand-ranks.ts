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
  "twin-lotus": 10,
  "long-chow": 11,
  "three-dragons-eye": 12,
  "four-winds": 13,
  kong: 14,
} as const satisfies Record<HandKind, number>

export function handRank(kind: HandKind, mode: "basic" | "riichi" | "streamlined"): number {
  if (mode === "streamlined") return STREAMLINED_RANKS[kind] ?? 0
  if (mode === "basic") {
    if (kind === "three-winds") return 6
    if (kind === "pung") return 7
    if (kind === "three-dragons") return 8
    if (kind === "four-winds") return 9
  }
  return HAND_RANKS[kind]
}

const STREAMLINED_RANKS: Partial<Record<HandKind, number>> = {
  "high-card": 1,
  eye: 2,
  chow: 3,
  "two-eyes": 4,
  "three-winds": 5,
  pung: 6,
  "long-chow": 7,
  "three-dragons": 8,
  "four-winds": 9,
  kong: 10,
}
export function isHandEnabled(kind: HandKind, mode: "basic" | "riichi" | "streamlined"): boolean {
  if (mode === "streamlined") return kind in STREAMLINED_RANKS
  return (
    mode === "riichi" ||
    !["pung-eye", "three-dragons-eye", "kong", "long-chow", "twin-lotus"].includes(kind)
  )
}
