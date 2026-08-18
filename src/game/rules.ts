import type { GameConfig, HandKind } from "./types"

// Lifecycle, economy, and fixed ladder values. Hand recognition lives in melds.ts.

export const ORBIT_VALUES = [5, 10, 15] as const
export const STARTING_CHIPS = 510
export const LOAN_VALUE = 200
export const MAX_LOANS = 2
export const PRIVATE_CARD_COUNT = 3
export const OPENING_PRIVATE_CARD_COUNT = 4
export const FLOWER_FOLD_BONUS = 20
export const FOLD_BLUE_STICKS = 2
export const COMMUNITY_REVEALS = [0, 3, 1, 1] as const
export const CHIP_DENOMINATIONS = [5, 10, 20, 50, 100] as const
export const CHIP_UNIT = CHIP_DENOMINATIONS[0]
export const HAND_RANKS = {
  "high-card": 1,
  eye: 2,
  chow: 3,
  "pure-suit": 4,
  "two-eyes": 5,
  "chow-eye": 6,
  pung: 7,
  "three-dragons": 8,
  "pung-eye": 9,
  "three-dragons-eye": 10,
  "four-winds": 11,
  "dragon-dancer": 12,
  kong: 13,
  crosswinds: 14,
  bouquet: 15,
  "imperial-garden": 16,
} as const satisfies Record<HandKind, number>

export function toChipUnit(amount: number): number {
  return Math.floor(amount / CHIP_UNIT) * CHIP_UNIT
}

export function maxHandsFor(playerCount: number): number {
  return playerCount === 2 ? 12 : playerCount * 3
}

export function orbitFor(handNumber: number, playerCount: number): 1 | 2 | 3 {
  const handsPerOrbit = playerCount === 2 ? 4 : playerCount
  return Math.min(3, Math.floor((handNumber - 1) / handsPerOrbit) + 1) as 1 | 2 | 3
}

export function createConfig(
  input: Partial<GameConfig> & Pick<GameConfig, "playerCount" | "seed">,
): GameConfig {
  if (!Number.isInteger(input.playerCount) || input.playerCount < 2 || input.playerCount > 6) {
    throw new RangeError("Mahjong Poker requires 2 to 6 players")
  }

  return {
    playerCount: input.playerCount,
    seed: input.seed,
    startingChips: input.startingChips ?? STARTING_CHIPS,
    heuristicSamples: input.heuristicSamples ?? 64,
  }
}
