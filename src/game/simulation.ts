import { GameEngine, type PlayerSetup } from "./engine"
import { stepHeuristic } from "./automation"
import type { GameConfig, HeuristicDecision, SimulationResult } from "./types"

export interface SimulationOptions extends Partial<GameConfig> {
  seed: string
  playerCount?: number
  players?: PlayerSetup[]
}

export function simulateGame(options: SimulationOptions): SimulationResult {
  const playerCount = options.players?.length ?? options.playerCount ?? 4
  const players =
    options.players ??
    Array.from({ length: playerCount }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Bot ${index + 1}`,
      controller: "heuristic" as const,
    }))
  const engine = GameEngine.create(players, {
    seed: options.seed,
    heuristicSamples: options.heuristicSamples ?? 12,
    activeSpecialHands: options.activeSpecialHands,
    startingChips: options.startingChips,
  })
  const decisions: HeuristicDecision[] = []
  let safety = 0

  while (engine.state.phase !== "finished") {
    safety += 1

    if (safety > 20_000) {
      throw new Error("Simulation exceeded the action safety limit")
    }

    const step = stepHeuristic(engine)

    if (step.decision) {
      decisions.push(step.decision)
    }
  }
  return {
    seed: options.seed,
    state: structuredClone(engine.state),
    events: structuredClone(engine.events),
    decisions,
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
