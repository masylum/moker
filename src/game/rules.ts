import type { GameConfig, SpecialHandId } from "./types";
import { DEFAULT_SPECIAL_HANDS, SPECIAL_HANDS } from "./types";

export const ORBIT_VALUES = [5, 10, 15] as const;
export const STARTING_CHIPS = 510;
export const LOAN_VALUE = 200;
export const MAX_LOANS = 2;
export const PRIVATE_CARD_COUNT = 4;
export const COMMUNITY_REVEALS = [4, 2, 2] as const;

export const SPECIAL_SCORES: Readonly<Record<SpecialHandId, number>> = {
  sisters: 14,
  "terminals-honors": 16,
  "eight-blessings": 18,
  "four-treasures": 18,
  "four-eyes": 20,
  staircase: 20,
  "twin-gates": 28,
  "mirror-chows": 32,
  "crossing-winds": 32,
  "heavenly-honors": 42,
  brothers: 44,
  "rainbow-eyes": 46,
  "dragon-dance": 52,
  "raging-winds": 60,
  "four-winds-at-peace": 70,
};

export function maxHandsFor(playerCount: number): number {
  return playerCount === 2 ? 12 : playerCount * 3;
}

export function orbitFor(handNumber: number, playerCount: number): 1 | 2 | 3 {
  const handsPerOrbit = playerCount === 2 ? 4 : playerCount;
  return Math.min(3, Math.floor((handNumber - 1) / handsPerOrbit) + 1) as 1 | 2 | 3;
}

export function createConfig(input: Partial<GameConfig> & Pick<GameConfig, "playerCount" | "seed">): GameConfig {
  if (!Number.isInteger(input.playerCount) || input.playerCount < 2 || input.playerCount > 6) {
    throw new RangeError("Mahjong Poker requires 2 to 6 players");
  }
  const activeSpecialHands = input.activeSpecialHands ?? DEFAULT_SPECIAL_HANDS;
  if (activeSpecialHands.some((id) => !SPECIAL_HANDS.includes(id))) {
    throw new Error("Unknown special hand in configuration");
  }
  return {
    playerCount: input.playerCount,
    seed: input.seed,
    activeSpecialHands: [...new Set(activeSpecialHands)],
    startingChips: input.startingChips ?? STARTING_CHIPS,
    heuristicSamples: input.heuristicSamples ?? 64,
  };
}
