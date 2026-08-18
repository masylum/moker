import { simulateManyStud7 } from "../src/stud7/simulation"

const count = Number.parseInt(process.argv[2] ?? "10", 10)
const seedPrefix = process.argv[3] ?? "stud7-balance"
const heuristicSamples = Number.parseInt(process.argv[4] ?? "4", 10)
const results = simulateManyStud7(count, {
  seedPrefix,
  playerCount: 4,
  heuristicSamples,
})
const wins: Record<string, number> = {}

for (const result of results) {
  const winner = Object.entries(result.state.finalScores ?? {}).sort(
    (left, right) => right[1] - left[1],
  )[0]?.[0]

  if (winner) {
    wins[winner] = (wins[winner] ?? 0) + 1
  }
}

console.log(
  JSON.stringify({ variant: "stud7", games: count, seedPrefix, heuristicSamples, wins }, null, 2),
)
