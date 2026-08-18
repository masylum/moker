import { createConfig } from "../game/rules"
import type { GameConfig, Stud7Config, StudCardVisibility, StudStreet } from "./types"

export const STUD7_FINAL_STREET = 5

export const STUD7_EXPERIMENT_PROFILES = {
  baseline: {
    foldBlueSticks: 1,
    riichiDrawMode: "skip",
  },
  "fold-two": {
    foldBlueSticks: 2,
    riichiDrawMode: "skip",
  },
  "fold-two-locked-draw": {
    foldBlueSticks: 2,
    riichiDrawMode: "discard-drawn",
  },
} as const satisfies Record<string, Pick<Stud7Config, "foldBlueSticks" | "riichiDrawMode">>

const DEFAULT_STUD7_RULES = STUD7_EXPERIMENT_PROFILES["fold-two-locked-draw"]

export const STUD7_STREET_DEALS = {
  1: ["private", "private", "public"],
  2: ["public"],
  3: ["public"],
  4: ["public"],
  5: ["private"],
} as const satisfies Record<Exclude<StudStreet, 0>, readonly StudCardVisibility[]>

export function createStud7Config(
  input: Partial<Stud7Config> & Pick<GameConfig, "playerCount" | "seed">,
): Stud7Config {
  return {
    ...createConfig(input),
    foldBlueSticks: input.foldBlueSticks ?? DEFAULT_STUD7_RULES.foldBlueSticks,
    riichiDrawMode: input.riichiDrawMode ?? DEFAULT_STUD7_RULES.riichiDrawMode,
  }
}
