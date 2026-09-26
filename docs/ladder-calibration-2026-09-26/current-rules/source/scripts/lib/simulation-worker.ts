import { simulateGame, type SimulationOptions } from "../../src/game/simulation"

process.on("message", ({ index, options }: { index: number; options: SimulationOptions }) => {
  try {
    process.send!({ index, result: simulateGame(options) })
  } catch (error) {
    process.send!({ index, error: error instanceof Error ? error.stack : String(error) })
  }
})
// The parent may be interrupted while this child is computing.
process.on("disconnect", () => process.exit(0))
