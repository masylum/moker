import { analyzeStud7Balance } from "../src/stud7/balance"
import { STUD7_EXPERIMENT_PROFILES } from "../src/stud7/rules"

const count = Number.parseInt(process.argv[2] ?? "100", 10)
const seedPrefix = process.argv[3] ?? "stud7-analysis"
const heuristicSamples = Number.parseInt(process.argv[4] ?? "1", 10)
const profileName = process.argv[5] ?? "fold-two-locked-draw"
const fastMode = process.argv[6] !== "full"
const profile = STUD7_EXPERIMENT_PROFILES[profileName as keyof typeof STUD7_EXPERIMENT_PROFILES]

if (!profile) {
  throw new Error(`Unknown profile ${profileName}`)
}

const result = analyzeStud7Balance({
  games: count,
  profile: profileName,
  seed: seedPrefix,
  seedPrefix,
  playerCount: 4,
  heuristicSamples,
  fastMode,
  ...profile,
})

console.log(JSON.stringify(result))
