import { GameEngine, type PlayerSetup } from "./engine"
import { stepHeuristic } from "./automation"
import type { BotPolicy } from "./heuristic"
import type { GameConfig, HeuristicDecision, SimulationResult } from "./types"

export interface SimulationOptions extends Partial<Omit<GameConfig, "playerCount">> {
  seed: string
  players?: PlayerSetup[]
  heuristicPolicies?: Readonly<Record<string, Readonly<BotPolicy>>>
  /** Disable retaining decision alternatives for aggregate batch runs. */
  collectDecisions?: boolean
  /** Capture settlement before tournament stacks reset. */
  collectGameSummaries?: boolean
  maxSteps?: number
}

export function simulateGame(options: SimulationOptions): SimulationResult {
  const players =
    options.players ??
    Array.from({ length: 4 }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Bot ${index + 1}`,
      controller: "heuristic" as const,
    }))
  const engine = GameEngine.create(players, {
    seed: options.seed,
    mode: options.mode,
    tournamentGames: options.tournamentGames,
    orbits: options.orbits,
    heuristicSamples: options.heuristicSamples ?? 24,
    startingChips: options.startingChips,
  })
  const decisions: HeuristicDecision[] = []
  const gameSummaries: NonNullable<SimulationResult["gameSummaries"]> = []
  let safety = 0

  while (engine.state.phase !== "finished") {
    safety += 1

    if (safety > (options.maxSteps ?? 20_000)) {
      throw new Error("Simulation exceeded the action safety limit")
    }

    const step = stepHeuristic(engine, options.heuristicPolicies)

    if (options.collectGameSummaries && engine.state.gameScores.length > gameSummaries.length) {
      gameSummaries.push({
        gameNumber: engine.state.gameNumber,
        scores: { ...engine.state.gameScores.at(-1)! },
        players: engine.state.players.map(({ id, chips, loans, riichiSticks, eliminated }) => ({
          id,
          chips,
          loans,
          riichiSticks,
          eliminated,
        })),
      })
    }
    if (step.decision && options.collectDecisions !== false) {
      decisions.push(step.decision)
    }
  }
  return {
    seed: options.seed,
    state: engine.state,
    events: engine.events,
    decisions,
    ...(options.collectGameSummaries ? { gameSummaries } : {}),
  }
}

export function simulateMany(
  count: number,
  options: Omit<SimulationOptions, "seed"> & { seedPrefix: string },
): SimulationResult[] {
  if (!Number.isInteger(count) || count < 1)
    throw new RangeError("Simulation count must be positive")
  return Array.from({ length: count }, (_, index) =>
    simulateGame({ ...options, seed: `${options.seedPrefix}-${index}` }),
  )
}
