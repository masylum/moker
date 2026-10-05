import { clearHeuristicCaches, DEFAULT_BOT_POLICY, type BotPolicy } from "../src/game/heuristic"
import { SeededRandom } from "../src/game/random"
import { simulateGame } from "../src/game/simulation"

type PolicyKey = keyof BotPolicy

interface ParameterSpec {
  key: PolicyKey
  minimum: number
  maximum: number
  sigma: number
}

interface MatchMetrics {
  games: number
  winShare: number
  meanScore: number
  opponentMeanScore: number
  scoreDelta: number
  allInsPerPlayerGame: number
  opponentAllInsPerPlayerGame: number
  eliminationsPerPlayerGame: number
  opponentEliminationsPerPlayerGame: number
  showdownRate: number
  loansPerGame: number
  fitness: number
}

const PARAMETERS: readonly ParameterSpec[] = [
  { key: "betEquityFloor", minimum: 0.35, maximum: 0.72, sigma: 0.045 },
  { key: "raiseEquityFloor", minimum: 0.45, maximum: 0.88, sigma: 0.05 },
  { key: "potWagerFraction", minimum: 0.3, maximum: 1, sigma: 0.11 },
  { key: "maxStackRisk", minimum: 0.35, maximum: 1, sigma: 0.1 },
  { key: "allInEquityFloor", minimum: 0.55, maximum: 0.95, sigma: 0.055 },
  { key: "bluffFrequency", minimum: 0, maximum: 0.15, sigma: 0.025 },
  { key: "foldPressure", minimum: 0.3, maximum: 1.1, sigma: 0.1 },
  { key: "reserveChips", minimum: 0, maximum: 350, sigma: 45 },
  { key: "standingAwareness", minimum: 0, maximum: 0.9, sigma: 0.11 },
  { key: "survivalRiskPenalty", minimum: 0, maximum: 9, sigma: 1.1 },
  { key: "equityCalibration", minimum: 0, maximum: 1, sigma: 0.13 },
  { key: "aggressionGateShrinkage", minimum: 0, maximum: 1, sigma: 0.13 },
  { key: "callDevelopmentWeight", minimum: 0.5, maximum: 1.5, sigma: 0.13 },
]

const generations = positiveInteger(argument("--generations") ?? "10")
const mutantCount = positiveInteger(argument("--mutants") ?? "8")
const screenGames = positiveInteger(argument("--screen-games") ?? "48")
const validationGames = positiveInteger(argument("--validation-games") ?? "96")
const screenSamples = positiveInteger(argument("--screen-samples") ?? "24")
const validationSamples = positiveInteger(argument("--validation-samples") ?? "24")
const finalGames = positiveInteger(argument("--final-games") ?? "500")
const finalSamples = positiveInteger(argument("--final-samples") ?? "24")
const seed = argument("--seed") ?? "ultimate-bot-v1"
const original = { ...DEFAULT_BOT_POLICY }
let incumbent = { ...original }
const checkpoints: BotPolicy[] = [{ ...original }]

process.stdout.write(
  `# Ultimate bot evolution\n\n${generations}-generation seed: ${seed}. Sample budgets: screening ${screenSamples}, validation ${validationSamples}, final ${finalSamples}. Initial policy:\n${JSON.stringify(incumbent)}\n\n`,
)

for (let generation = 1; generation <= generations; generation += 1) {
  const random = new SeededRandom(`${seed}:mutation:${generation}`)
  const mutants = Array.from({ length: mutantCount }, (_, index) =>
    mutatePolicy(incumbent, random.fork(`mutant:${index}`), generation),
  )
  const screened = mutants.map((policy, index) => {
    clearHeuristicCaches()
    const metrics = evaluatePolicy(
      policy,
      incumbent,
      screenGames,
      screenSamples,
      `${seed}:g${generation}:screen`,
    )
    process.stderr.write(
      `G${generation} screen ${index + 1}/${mutantCount}: ${percent(metrics.winShare)} wins, ${signed(metrics.scoreDelta)} score, fitness ${metrics.fitness.toFixed(2)}\n`,
    )
    return { index, policy, metrics }
  })
  screened.sort((left, right) => right.metrics.fitness - left.metrics.fitness)

  const finalists = screened.slice(0, Math.min(2, screened.length)).map((candidate) => {
    clearHeuristicCaches()
    return {
      ...candidate,
      validation: evaluatePolicy(
        candidate.policy,
        incumbent,
        validationGames,
        validationSamples,
        `${seed}:g${generation}:validation`,
      ),
    }
  })
  finalists.sort((left, right) => right.validation.fitness - left.validation.fitness)
  const champion =
    finalists.find(
      (candidate) => candidate.validation.winShare > 0.5 && candidate.validation.fitness > 0,
    ) ?? finalists[0]!
  const promoted = champion.validation.winShare > 0.5 && champion.validation.fitness > 0
  const changed = changedParameters(incumbent, champion.policy)
  if (promoted) {
    incumbent = { ...champion.policy }
    checkpoints.push({ ...incumbent })
  }

  process.stdout.write(
    [
      `## Generation ${generation}`,
      "",
      `Screen winner: mutant ${champion.index + 1}, ${percent(champion.metrics.winShare)} wins, ${signed(champion.metrics.scoreDelta)} score/player-game.`,
      `Unseen validation: ${percent(champion.validation.winShare)} wins, ${signed(champion.validation.scoreDelta)} score/player-game, fitness ${champion.validation.fitness.toFixed(2)}.`,
      `Behavior: all-ins ${champion.validation.allInsPerPlayerGame.toFixed(2)} vs ${champion.validation.opponentAllInsPerPlayerGame.toFixed(2)}; eliminations ${champion.validation.eliminationsPerPlayerGame.toFixed(3)} vs ${champion.validation.opponentEliminationsPerPlayerGame.toFixed(3)}; showdown ${percent(champion.validation.showdownRate)}; Loans/game ${champion.validation.loansPerGame.toFixed(2)}.`,
      `${promoted ? "Promoted" : "Rejected"}: ${changed}.`,
      `Incumbent: ${JSON.stringify(incumbent)}`,
      "",
    ].join("\n"),
  )
}

const selected = checkpoints
  .map((policy, index) => {
    clearHeuristicCaches()
    const metrics = evaluatePolicy(
      policy,
      original,
      validationGames,
      validationSamples,
      `${seed}:checkpoint-selection`,
    )
    process.stderr.write(
      `Checkpoint ${index}/${checkpoints.length - 1}: ${percent(metrics.winShare)} wins, ${signed(metrics.scoreDelta)} score, fitness ${metrics.fitness.toFixed(2)}\n`,
    )
    return { index, policy, metrics }
  })
  .sort((left, right) => right.metrics.fitness - left.metrics.fitness)[0]!
incumbent = { ...selected.policy }
process.stdout.write(
  `# Checkpoint selection\n\nSelected checkpoint ${selected.index}/${checkpoints.length - 1}: ${percent(selected.metrics.winShare)} wins, ${signed(selected.metrics.scoreDelta)} score/player-game.\n\n`,
)

clearHeuristicCaches()
const holdout = evaluatePolicy(
  incumbent,
  original,
  finalGames,
  finalSamples,
  `${seed}:final-holdout`,
)
const accepted = holdout.winShare > 0.5 && holdout.scoreDelta > 0 && holdout.fitness > 0
const ultimate = accepted ? incumbent : original
process.stdout.write(
  [
    "# Final unseen holdout",
    "",
    `Games: ${finalGames}; rollout samples: ${finalSamples}; rotating two-versus-two seats.`,
    `Evolved bot: ${percent(holdout.winShare)} game-win credit; mean score ${holdout.meanScore.toFixed(1)} vs ${holdout.opponentMeanScore.toFixed(1)} (${signed(holdout.scoreDelta)}).`,
    `All-ins/player-game: ${holdout.allInsPerPlayerGame.toFixed(2)} vs ${holdout.opponentAllInsPerPlayerGame.toFixed(2)}. Eliminations/player-game: ${holdout.eliminationsPerPlayerGame.toFixed(3)} vs ${holdout.opponentEliminationsPerPlayerGame.toFixed(3)}.`,
    `Showdown rate: ${percent(holdout.showdownRate)}. Loans/game: ${holdout.loansPerGame.toFixed(2)}. Fitness: ${holdout.fitness.toFixed(2)}.`,
    `Decision: ${accepted ? "accepted evolved checkpoint" : "retained original baseline"}.`,
    "",
    `ULTIMATE_POLICY=${JSON.stringify(ultimate)}`,
    "",
  ].join("\n"),
)

function evaluatePolicy(
  candidate: Readonly<BotPolicy>,
  opponent: Readonly<BotPolicy>,
  games: number,
  samples: number,
  seedPrefix: string,
): MatchMetrics {
  const seatPairs = [
    ["p1", "p2"],
    ["p1", "p3"],
    ["p1", "p4"],
    ["p2", "p3"],
    ["p2", "p4"],
    ["p3", "p4"],
  ] as const
  let candidateScore = 0
  let opponentScore = 0
  let candidateWinCredit = 0
  let candidateAllIns = 0
  let opponentAllIns = 0
  let candidateEliminations = 0
  let opponentEliminations = 0
  let showdowns = 0
  let hands = 0
  let loans = 0

  for (let index = 0; index < games; index += 1) {
    const candidateIds = new Set<string>(seatPairs[index % seatPairs.length])
    const policies = Object.fromEntries(
      ["p1", "p2", "p3", "p4"].map((id) => [id, candidateIds.has(id) ? candidate : opponent]),
    )
    const result = simulateGame({
      seed: `${seedPrefix}:${index}`,
      heuristicSamples: samples,
      heuristicPolicies: policies,
    })
    const scores = result.state.finalScores!
    for (const [id, score] of Object.entries(scores)) {
      if (candidateIds.has(id)) candidateScore += score
      else opponentScore += score
    }
    const maximum = Math.max(...Object.values(scores))
    const winners = Object.entries(scores)
      .filter(([, score]) => score === maximum)
      .map(([id]) => id)
    candidateWinCredit +=
      winners.filter((winner) => candidateIds.has(winner)).length / winners.length
    for (const event of result.events) {
      if (
        event.type === "player-all-in" &&
        (event.payload as { reason?: string }).reason !== "opening-charge"
      ) {
        if (event.actorId && candidateIds.has(event.actorId)) candidateAllIns += 1
        else opponentAllIns += 1
      }
      if (event.type === "player-eliminated") {
        if (event.actorId && candidateIds.has(event.actorId)) candidateEliminations += 1
        else opponentEliminations += 1
      }
      if (event.type === "loan-taken") loans += 1
    }
    hands += result.state.handResults.length
    showdowns += result.state.handResults.filter((hand) => hand.reason === "showdown").length
  }

  const playerGames = games * 2
  const winShare = candidateWinCredit / games
  const meanScore = candidateScore / playerGames
  const opponentMeanScore = opponentScore / playerGames
  const scoreDelta = meanScore - opponentMeanScore
  return {
    games,
    winShare,
    meanScore,
    opponentMeanScore,
    scoreDelta,
    allInsPerPlayerGame: candidateAllIns / playerGames,
    opponentAllInsPerPlayerGame: opponentAllIns / playerGames,
    eliminationsPerPlayerGame: candidateEliminations / playerGames,
    opponentEliminationsPerPlayerGame: opponentEliminations / playerGames,
    showdownRate: showdowns / hands,
    loansPerGame: loans / games,
    fitness: (winShare - 0.5) * 100 + scoreDelta / 100,
  }
}

function mutatePolicy(
  policy: Readonly<BotPolicy>,
  random: SeededRandom,
  generation: number,
): BotPolicy {
  const result = { ...policy }
  const mutationCount = 4 + (generation % 3)
  const scale = Math.max(0.38, 1 - (generation - 1) * 0.065)
  const available = [...PARAMETERS]
  for (let index = 0; index < mutationCount; index += 1) {
    const parameterIndex = Math.floor(random.next() * available.length)
    const [parameter] = available.splice(parameterIndex, 1)
    if (!parameter) break
    result[parameter.key] = clamp(
      policy[parameter.key] + gaussian(random) * parameter.sigma * scale,
      parameter.minimum,
      parameter.maximum,
    )
  }
  result.raiseEquityFloor = Math.max(result.raiseEquityFloor, result.betEquityFloor + 0.03)
  result.allInEquityFloor = Math.max(result.allInEquityFloor, result.raiseEquityFloor)
  result.reserveChips = Math.round(result.reserveChips / 5) * 5
  return result
}

function changedParameters(before: Readonly<BotPolicy>, after: Readonly<BotPolicy>): string {
  return PARAMETERS.filter(({ key }) => before[key] !== after[key])
    .map(({ key }) => `${key} ${format(before[key])}→${format(after[key])}`)
    .join(", ")
}

function gaussian(random: SeededRandom): number {
  const left = Math.max(Number.EPSILON, random.next())
  const right = random.next()
  return Math.sqrt(-2 * Math.log(left)) * Math.cos(2 * Math.PI * right)
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}

function positiveInteger(value: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) throw new RangeError("Expected a positive integer")
  return parsed
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3)
}
