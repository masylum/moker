import type { GameConfig, HandKind } from "./types"
import { DEFAULT_SPECIAL_HANDS, SPECIAL_HANDS } from "./types"

// Lifecycle and economy rules only. Tile patterns live in patterns.ts; scoring lives in scoring.ts.

export const ORBIT_VALUES = [5, 10, 15] as const
export const STARTING_CHIPS = 510
export const LOAN_VALUE = 200
export const MAX_LOANS = 2
export const PRIVATE_CARD_COUNT = 4
export const COMMUNITY_REVEALS = [4, 2, 2] as const
export const CHIP_DENOMINATIONS = [5, 10, 20, 50, 100] as const
export const CHIP_UNIT = CHIP_DENOMINATIONS[0]
export const HAND_RANKS = {
  "high-card": 1,
  eye: 2,
  chow: 3,
  pung: 4,
  "three-dragons": 5,
  sisters: 6,
  "four-treasures": 7,
  "terminals-honors": 8,
  "four-eyes": 9,
  staircase: 10,
  "eight-blessings": 11,
  kong: 12,
  "four-winds": 13,
  "twin-gates": 14,
  "crossing-winds": 15,
  "mirror-chows": 16,
  brothers: 17,
  "rainbow-eyes": 18,
  "dragon-dance": 19,
  "raging-winds": 20,
  "four-winds-at-peace": 21,
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

  const activeSpecialHands = input.activeSpecialHands ?? DEFAULT_SPECIAL_HANDS

  if (activeSpecialHands.some((id) => !SPECIAL_HANDS.includes(id))) {
    throw new Error("Unknown special hand in configuration")
  }

  return {
    playerCount: input.playerCount,
    seed: input.seed,
    activeSpecialHands: [...new Set(activeSpecialHands)],
    startingChips: input.startingChips ?? STARTING_CHIPS,
    heuristicSamples: input.heuristicSamples ?? 64,
  }
}
