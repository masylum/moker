import { createConfig } from "../game/rules"
import type { GameConfig, StudCardVisibility, StudStreet } from "./types"

export const STUD7_FINAL_STREET = 5

export const STUD7_STREET_DEALS = {
  1: ["private", "private", "public"],
  2: ["public"],
  3: ["public"],
  4: ["public"],
  5: ["private"],
} as const satisfies Record<Exclude<StudStreet, 0>, readonly StudCardVisibility[]>

export function createStud7Config(
  input: Partial<GameConfig> & Pick<GameConfig, "playerCount" | "seed">,
): GameConfig {
  return createConfig(input)
}
