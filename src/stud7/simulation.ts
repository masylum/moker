import { Stud7Engine, type StudPlayerSetup } from "./engine"
import { stepStud7Heuristic } from "./automation"
import type { GameConfig, StudHeuristicDecision, StudSimulationResult } from "./types"

export interface StudSimulationOptions extends Partial<GameConfig> {
  seed: string
  playerCount?: number
  players?: StudPlayerSetup[]
}

export function simulateStud7(options: StudSimulationOptions): StudSimulationResult {
  const playerCount = options.players?.length ?? options.playerCount ?? 4
  const players =
    options.players ??
    Array.from({ length: playerCount }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Stud Bot ${index + 1}`,
      controller: "heuristic" as const,
    }))
  const engine = Stud7Engine.create(players, {
    seed: options.seed,
    heuristicSamples: options.heuristicSamples ?? 6,
    startingChips: options.startingChips,
  })
  const decisions: StudHeuristicDecision[] = []
  let safety = 0

  while (engine.state.phase !== "finished") {
    safety += 1

    if (safety > 30_000) {
      throw new Error("Stud7 simulation exceeded the action safety limit")
    }

    const step = stepStud7Heuristic(engine)

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

export function simulateManyStud7(
  count: number,
  options: Omit<StudSimulationOptions, "seed"> & { seedPrefix: string },
): StudSimulationResult[] {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("Stud7 simulation count must be positive")
  }

  return Array.from({ length: count }, (_, index) =>
    simulateStud7({ ...options, seed: `${options.seedPrefix}-${index}` }),
  )
}
