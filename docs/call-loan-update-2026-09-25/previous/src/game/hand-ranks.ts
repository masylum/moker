import type { HandKind } from "./types"

export const HAND_RANKS = {
  "high-card": 1,
  eye: 2,
  chow: 3,
  "two-eyes": 4,
  pung: 7,
  "chow-eye": 5,
  "three-dragons": 8,
  "three-winds": 6,
  "pung-eye": 9,
  "four-winds": 10,
  "three-dragons-eye": 11,
  kong: 12,
} as const satisfies Record<HandKind, number>
