import type { GameConfig, GameState, PlayerState } from "./types"

export const STREET_COUNT = 4
const STARTING_CHIPS = 200
export const STARTING_RIICHI_STICKS = 2
export const RIICHI_WIN_STICKS = 2
export const LOAN_VALUE = 200
export const LOAN_PENALTY = 250
export const MAX_LOANS = 1
const LOAN_OFFER_THRESHOLD = 100

export function canTakeLoan(
  state: Pick<GameState, "phase" | "config">,
  player: Pick<PlayerState, "chips" | "loans" | "eliminated" | "folded">,
): boolean {
  return (
    state.config.mode === "riichi" &&
    state.phase === "charleston" &&
    !player.eliminated &&
    !player.folded &&
    player.chips < LOAN_OFFER_THRESHOLD &&
    player.loans < MAX_LOANS
  )
}
export const OPENING_PRIVATE_CARD_COUNT = 7
export const CHARLESTON_PASS_COUNT = 2
export const STREET_REVEAL_COUNTS = [3, 1, 1, 0] as const
export const CHIP_UNIT = 5

export function toChipUnit(amount: number): number {
  return Math.floor(amount / CHIP_UNIT) * CHIP_UNIT
}

export function createConfig(input: Partial<GameConfig> & Pick<GameConfig, "seed">): GameConfig {
  const playerCount = input.playerCount ?? 4
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 6)
    throw new RangeError("Moker requires 2 to 6 players")
  if (input.mode !== undefined && !["basic", "riichi"].includes(input.mode))
    throw new RangeError("Unknown game mode")
  if (input.tournamentGames !== undefined && ![1, 2, 3, 4].includes(input.tournamentGames))
    throw new RangeError("Choose one to four games")
  if (
    input.orbits !== undefined &&
    (!Number.isInteger(input.orbits) || input.orbits < 1 || input.orbits > 4)
  )
    throw new RangeError("Choose one to four dealer orbits")
  return {
    orbits: input.orbits ?? 1,
    playerCount,
    seed: input.seed,
    mode: input.mode ?? "basic",
    tournamentGames: input.tournamentGames ?? 1,
    startingChips: input.startingChips ?? STARTING_CHIPS,
    heuristicSamples: input.heuristicSamples ?? 24,
  }
}

/** Check and Call provide a free fish in both modes; bets need a Riichi stick.
 * All-in and declared-Riichi locks are enforced by the engine. */
export function hasFreeFishing(
  _mode: "basic" | "riichi",
  action: "fold" | "check" | "call" | "bet",
): boolean {
  return action === "check" || action === "call"
}
