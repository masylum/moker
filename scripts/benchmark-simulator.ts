import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"
import type { simulateGame as SimulateGame } from "../src/game/simulation"

const { values } = parseArgs({
  options: {
    module: { type: "string", default: "src/game/simulation.ts" },
    output: { type: "string" },
  },
})
const { simulateGame } = (await import(pathToFileURL(resolve(values.module!)).href)) as {
  simulateGame: typeof SimulateGame
}
const started = performance.now()
const rows = []
// A fixed, small workload. Run this in fresh processes to compare revisions.
for (const mode of ["basic", "riichi"] as const) {
  for (let index = 0; index < 3; index++) {
    const seed = `cpu-benchmark-${index}`
    const begin = performance.now()
    const result = simulateGame({ seed, mode, orbits: 1, heuristicSamples: 24 })
    const seconds = (performance.now() - begin) / 1000
    rows.push({
      mode,
      seed,
      seconds,
      hands: result.state.handResults.length,
      hash: createHash("sha256").update(JSON.stringify(result)).digest("hex"),
    })
  }
}
const report = {
  node: process.version,
  samples: 24,
  orbits: 1,
  games: rows.length,
  seconds: (performance.now() - started) / 1000,
  rows,
}
if (values.output) writeFileSync(values.output, JSON.stringify(report, null, 2) + "\n")
console.log(JSON.stringify(report, null, 2))
