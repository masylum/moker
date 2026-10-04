import type { HandKind } from "./types"

/** Six-card deal frequencies calibrate the order; see docs/streamlined-2026-10-04. */
export const HAND_RANKS = {
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
} as const satisfies Record<HandKind, number>

export function handRank(kind: HandKind, mode: "basic" | "riichi"): number {
  if (mode === "basic") {
    if (kind === "long-chow") return 6
    if (kind === "pung") return 7
  }
  return HAND_RANKS[kind]
}

export function isHandEnabled(kind: HandKind, mode: "basic" | "riichi"): boolean {
  return mode === "riichi" || kind !== "kong"
}
