import { Stud7Engine, type StudPlayerSetup } from "./engine"
import { stepStud7Heuristic } from "./automation"
import type { Stud7Config, StudHeuristicDecision, StudSimulationResult } from "./types"

export interface StudSimulationOptions extends Partial<Stud7Config> {
  seed: string
  playerCount?: number
  players?: StudPlayerSetup[]
  collectDecisions?: boolean
  fastMode?: boolean
}

export function playStud7(options: StudSimulationOptions): {
  engine: Stud7Engine
  decisions: StudHeuristicDecision[]
} {
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
    foldBlueSticks: options.foldBlueSticks,
    riichiDrawMode: options.riichiDrawMode,
  })
  const decisions: StudHeuristicDecision[] = []
  let safety = 0

  while (engine.state.phase !== "finished") {
    safety += 1

    if (safety > 30_000) {
      throw new Error("Stud7 simulation exceeded the action safety limit")
    }

    const step = stepStud7Heuristic(engine, { fastMode: options.fastMode })

    if (options.collectDecisions !== false && step.decision) {
      decisions.push(step.decision)
    }
  }

  return { engine, decisions }
}

export function simulateStud7(options: StudSimulationOptions): StudSimulationResult {
  const { engine, decisions } = playStud7(options)

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
