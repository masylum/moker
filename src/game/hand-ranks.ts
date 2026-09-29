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
  "four-dragons": 13,
  kong: 14,
  quint: 15,
} as const satisfies Record<HandKind, number>

export function handRank(kind: HandKind, mode: "basic" | "riichi" | "legacy"): number {
  if (mode === "legacy") return LEGACY_HAND_ORDER.indexOf(kind) + 1
  if (mode === "basic") {
    if (kind === "three-winds") return 6
    if (kind === "pung") return 7
    if (kind === "three-dragons") return 8
    if (kind === "four-winds") return 9
  }
  return HAND_RANKS[kind]
}

export const LEGACY_HAND_ORDER: readonly HandKind[] = [
  "high-card",
  "eye",
  "chow",
  "two-eyes",
  "pung",
  "three-dragons",
  "three-winds",
  "chow-eye",
  "pung-eye",
  "twin-lotus",
  "three-dragons-eye",
  "long-chow",
  "four-dragons",
  "four-winds",
  "kong",
  "quint",
]
export const HAND_LABELS: Record<HandKind, string> = {
  "high-card": "High Card",
  eye: "Eyes",
  chow: "Chow",
  "two-eyes": "Two Eyes",
  pung: "Pung",
  "three-winds": "Three Winds",
  "chow-eye": "Chow and Eyes",
  "three-dragons": "Three Dragons",
  "pung-eye": "Pung and Eyes",
  "twin-lotus": "Twin Lotus",
  "long-chow": "Long Chow",
  "three-dragons-eye": "Three Dragons and Eyes",
  "four-winds": "Four Winds",
  "four-dragons": "Four Dragons",
  kong: "Kong",
  quint: "Quint",
}
