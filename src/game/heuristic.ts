import { createDeck } from "./cards"
import { bestMeldArrangement, scoreHand } from "./scoring"
import { evaluateSpecialHands } from "./patterns"
import { SeededRandom } from "./random"
import { CHIP_UNIT, ORBIT_VALUES, toChipUnit } from "./rules"
import type {
  BettingAction,
  Card,
  CardSource,
  DecisionEvaluation,
  DiscardPile,
  GameState,
  HeuristicDecision,
  PokerMathAnalysis,
  PlayerState,
} from "./types"

export interface DiscardChoice {
  discardCardId: string
  discardPile: DiscardPile
  expectedScore: number
  rationale: string
}

export interface BlankChoice {
  claim: boolean
  improvement: number
  rationale: string
}

export function chooseHeuristicAction(
  state: GameState,
  playerId: string,
  samples = state.config.heuristicSamples,
): HeuristicDecision {
  if (state.phase !== "betting" || state.actingPlayerId !== playerId)
    throw new Error("Heuristic player is not acting")
  const player = getPlayer(state, playerId)
  const random = new SeededRandom(
    `${state.config.seed}:h${state.handNumber}:s${state.street}:v${state.version}:${playerId}`,
  )
  const drawSource = chooseDrawSource(state, player, random.fork("draw"), samples)
  const math = analyzePokerMath(state, playerId, samples)
  const toCall = state.currentWager - player.roundCommitted
  const evaluations: DecisionEvaluation[] = []
  const liability = futureBlueLiability(state, player.blueSticks)

  const makeEvaluation = (
    action: BettingAction,
    chipCost: number,
    aggressive = false,
  ): DecisionEvaluation => {
    const responseRate = Math.max(
      0.2,
      Math.min(0.55, 0.55 - (chipCost / Math.max(CHIP_UNIT, state.pot + chipCost)) * 0.35),
    )
    const expectedOpponentContribution =
      aggressive && (action.type === "bet" || action.type === "raise")
        ? state.players
            .filter((candidate) => !candidate.folded && candidate.id !== playerId)
            .reduce(
              (total, candidate) =>
                total + Math.max(0, action.amount - candidate.roundCommitted) * responseRate,
              0,
            )
        : 0
    const expectedPot = state.pot + chipCost + expectedOpponentContribution
    const expectedChipDelta = math.showdownEquity * expectedPot - chipCost
    const blueBenefit =
      aggressive && player.blueSticks > 0 ? Math.min(3, nextChargesValue(state) * 0.03) : 0
    const riichiBonus =
      "riichi" in action && action.riichi
        ? math.showdownEquity * nextChargesValue(state) * player.blueSticks * 0.12
        : 0
    const utility =
      expectedChipDelta + blueBenefit + riichiBonus + math.expectedScore * 0.02 - liability * 0.01

    return {
      action,
      expectedScore: math.expectedScore,
      estimatedWinRate: math.showdownEquity,
      expectedChipDelta,
      utility,
      samples,
      rationale: `${Math.round(math.showdownEquity * 100)}% showdown equity; ${formatPercent(math.potOdds)} pot odds; call EV ${formatSigned(math.callExpectedValue)}; ${math.improveRate.toFixed(0)}% improve; closest special is ${formatClosest(math.closestSpecial)}`,
    }
  }

  const foldUtility = -liability * 0.03
  evaluations.push({
    action: { type: "fold" },
    expectedScore: 0,
    estimatedWinRate: 0,
    expectedChipDelta: 0,
    utility: foldUtility,
    samples,
    rationale: `Preserves chips but adds a blue stick worth about ${liability} in future charges`,
  })

  if (toCall === 0) {
    evaluations.push(makeEvaluation({ type: "check", drawSource }, 0))
    const aggressionThreshold = Math.max(0.38, 1 / (math.opponents + 1) + 0.1)

    if (math.showdownEquity >= aggressionThreshold) {
      for (const amount of sensibleWagers(state, player, CHIP_UNIT)) {
        const riichi = shouldDeclareRiichi(state, player, math.expectedScore, math.showdownEquity)
        evaluations.push(
          makeEvaluation(
            { type: "bet", amount, ...(riichi ? { riichi: true } : {}) },
            amount - player.roundCommitted,
            true,
          ),
        )
      }
    }
  } else if (player.chips >= toCall) {
    evaluations.push(makeEvaluation({ type: "call", drawSource }, toCall))
    const aggressionThreshold = Math.max(0.5, math.potOdds + 0.15, 1 / (math.opponents + 1) + 0.15)

    if (math.showdownEquity >= aggressionThreshold) {
      for (const amount of sensibleWagers(state, player, state.currentWager + state.minimumRaise)) {
        const riichi = shouldDeclareRiichi(state, player, math.expectedScore, math.showdownEquity)
        evaluations.push(
          makeEvaluation(
            { type: "raise", amount, ...(riichi ? { riichi: true } : {}) },
            amount - player.roundCommitted,
            true,
          ),
        )
      }
    }
  }

  evaluations.sort(
    (left, right) =>
      right.utility - left.utility || actionOrder(left.action) - actionOrder(right.action),
  )
  const best = evaluations[0]

  if (!best) {
    throw new Error("No heuristic action available")
  }

  return {
    playerId,
    action: best.action,
    evaluations,
    rationale: `Selected ${best.action.type} at utility ${best.utility.toFixed(1)}. ${best.rationale}.`,
  }
}

export function analyzePokerMath(
  state: GameState,
  playerId: string,
  samples = state.config.heuristicSamples,
): PokerMathAnalysis {
  const player = getPlayer(state, playerId)
  const random = new SeededRandom(
    `${state.config.seed}:math:h${state.handNumber}:s${state.street}:v${state.version}:${playerId}`,
  )
  const future = analyzePrivateFuture(state, playerId, player.privateCards, random, samples)
  const toCall = Math.max(0, state.currentWager - player.roundCommitted)
  const potAfterCall = state.pot + toCall
  const potOdds = toCall === 0 ? 0 : toCall / potAfterCall

  return {
    playerId,
    samples: Math.max(1, samples),
    opponents: future.opponents,
    toCall,
    potBeforeCall: state.pot,
    potAfterCall,
    potOdds,
    showdownEquity: future.showdownEquity,
    equityEdge: future.showdownEquity - potOdds,
    callExpectedValue: future.showdownEquity * potAfterCall - toCall,
    expectedScore: future.expectedScore,
    improveRate: future.improveRate,
    closestSpecial: future.closestSpecial,
  }
}

export function chooseHeuristicDiscard(
  state: GameState,
  playerId: string,
  samples = state.config.heuristicSamples,
): DiscardChoice {
  if (state.phase !== "discarding" || state.pendingDiscard?.playerId !== playerId) {
    throw new Error("Player is not discarding")
  }

  const player = getPlayer(state, playerId)
  const random = new SeededRandom(`${state.config.seed}:discard:${state.version}:${playerId}`)
  const evaluations = player.privateCards.map((card, index) => {
    const hand = player.privateCards.filter((_, candidateIndex) => candidateIndex !== index)
    return {
      card,
      ...analyzePrivateFuture(state, playerId, hand, random.fork(card.id), samples),
    }
  })
  evaluations.sort(
    (left, right) =>
      right.expectedScore - left.expectedScore || left.card.id.localeCompare(right.card.id),
  )
  const best = evaluations[0]!
  const pile = chooseDiscardPile(state, best.card)
  return {
    discardCardId: best.card.id,
    discardPile: pile,
    expectedScore: best.expectedScore,
    rationale: `Discarding ${best.card.id} leaves an expected final hand score of ${best.expectedScore.toFixed(1)} across ${samples} rollouts; closest special is ${formatClosest(best.closestSpecial)}`,
  }
}

export function chooseBlankClaim(
  state: GameState,
  playerId: string,
  samples = state.config.heuristicSamples,
): BlankChoice {
  const window = state.blankWindow
  if (state.phase !== "blank-window" || !window || window.eligiblePlayerIds[0] !== playerId) {
    throw new Error("Player does not have Blank priority")
  }

  const player = getPlayer(state, playerId)
  const pile = window.pile === "a" ? state.discardA : state.discardB
  const offered = pile.at(-1)
  if (!offered) {
    return { claim: false, improvement: 0, rationale: "The discard is no longer available" }
  }

  const blankIndex = player.privateCards.findIndex((card) => card.kind === "blank")

  if (blankIndex < 0) {
    return { claim: false, improvement: 0, rationale: "No private Blank" }
  }

  const random = new SeededRandom(`${state.config.seed}:blank:${state.version}:${playerId}`)
  const current = analyzePrivateFuture(
    state,
    playerId,
    player.privateCards,
    random.fork("keep"),
    samples,
  ).expectedScore
  const replaced = [...player.privateCards]
  replaced.splice(blankIndex, 1, offered)
  const next = analyzePrivateFuture(
    state,
    playerId,
    replaced,
    random.fork("claim"),
    samples,
  ).expectedScore
  const improvement = next - current
  return {
    claim: improvement >= 1.5,
    improvement,
    rationale:
      improvement >= 1.5
        ? `Claim improves expected score by ${improvement.toFixed(1)}`
        : `Claim improves expected score by only ${improvement.toFixed(1)}`,
  }
}

function chooseDrawSource(
  state: GameState,
  player: PlayerState,
  random: SeededRandom,
  samples: number,
): CardSource {
  const sources: CardSource[] = ["deck"]
  if (state.discardA.length > 0) sources.push("discard-a")
  if (state.discardB.length > 0) sources.push("discard-b")
  const unknown = unknownCards(state, player.privateCards)
  const sourceValue = (source: CardSource): number => {
    const visible =
      source === "discard-a"
        ? state.discardA.at(-1)
        : source === "discard-b"
          ? state.discardB.at(-1)
          : undefined
    let total = 0
    const count = source === "deck" ? Math.max(1, samples) : 1
    for (let index = 0; index < count; index += 1) {
      const drawn = visible ?? random.pick(unknown)
      total += bestImmediatePrivateScore([...player.privateCards, drawn], state)
    }
    return total / count
  }
  return sources
    .map((source) => ({ source, value: sourceValue(source) }))
    .sort((left, right) => right.value - left.value || left.source.localeCompare(right.source))[0]!
    .source
}

function bestImmediatePrivateScore(fiveCards: Card[], state: GameState): number {
  let best = 0
  for (let discardIndex = 0; discardIndex < fiveCards.length; discardIndex += 1) {
    const privateCards = fiveCards.filter((_, index) => index !== discardIndex)
    best = Math.max(best, currentStrength(privateCards, state))
  }
  return best
}

function analyzePrivateFuture(
  state: GameState,
  playerId: string,
  privateCards: Card[],
  random: SeededRandom,
  samples: number,
) {
  const neededCommunity = 8 - state.community.length
  const unknown = unknownCards(state, privateCards)
  const current = currentStrength(privateCards, state)
  let total = 0
  let improvements = 0
  let equity = 0
  const trials = Math.max(1, samples)
  const opponents = state.players.filter(
    (candidate) => !candidate.folded && candidate.id !== playerId,
  )

  for (let sample = 0; sample < trials; sample += 1) {
    const shuffled = random.shuffle(unknown)
    const completion = shuffled.slice(0, neededCommunity)
    const completed = [...privateCards, ...state.community, ...completion]
    const score = scoreHand(completed, state.config.activeSpecialHands).total
    total += score

    if (score > current) {
      improvements += 1
    }

    const opponentScores = opponents.map((_, index) => {
      const start = neededCommunity + index * 4
      const cards = shuffled.slice(start, start + 4)

      return scoreHand(
        [...cards, ...state.community, ...completion],
        state.config.activeSpecialHands,
      ).total
    })
    const bestScore = Math.max(score, ...opponentScores)

    if (score === bestScore) {
      equity += 1 / (1 + opponentScores.filter((opponentScore) => opponentScore === score).length)
    }
  }
  const closest = evaluateSpecialHands(
    [...privateCards, ...state.community],
    state.config.activeSpecialHands,
  ).sort((left, right) => left.missing - right.missing || right.score - left.score)[0]

  return {
    expectedScore: total / trials,
    improveRate: (improvements / trials) * 100,
    showdownEquity: equity / trials,
    opponents: opponents.length,
    closestSpecial: closest
      ? {
          label: closest.label,
          missing: closest.missing,
          size: closest.size,
          score: closest.score,
        }
      : null,
  }
}

function unknownCards(state: GameState, privateCards: Card[]): Card[] {
  const known = new Set(
    [...privateCards, ...state.community, ...state.discardA, ...state.discardB].map(
      (card) => card.id,
    ),
  )
  return createDeck().filter((card) => !known.has(card.id))
}

function currentStrength(privateCards: Card[], state: GameState): number {
  const cards = [...privateCards, ...state.community]
  const meldScore = bestMeldArrangement(cards).score
  const specialPotential = evaluateSpecialHands(cards, state.config.activeSpecialHands).reduce(
    (best, pattern) => {
      const progress = (pattern.size - pattern.missing) / pattern.size

      return Math.max(best, pattern.score * progress * progress)
    },
    0,
  )

  return Math.max(meldScore, specialPotential)
}

function chooseDiscardPile(state: GameState, discarded: Card): DiscardPile {
  if (state.discardA.length === 0) {
    return "a"
  }

  if (state.discardB.length === 0) {
    return "b"
  }

  const a = state.discardA.at(-1)!
  const b = state.discardB.at(-1)!
  const danger = (card: Card) =>
    card.kind === "joker"
      ? 8
      : card.kind === "blank"
        ? 0
        : card.kind === "wind" || card.kind === "dragon"
          ? 3
          : card.rank >= 3 && card.rank <= 7
            ? 4
            : 2
  return danger(a) >= danger(b) || danger(discarded) > 5 ? "a" : "b"
}

function sensibleWagers(state: GameState, player: PlayerState, minimum: number): number[] {
  const reserve = Math.min(player.chips, toChipUnit(nextChargesValue(state) + 20))
  const maximum = toChipUnit(player.roundCommitted + Math.max(0, player.chips - reserve))
  if (maximum < minimum) {
    return []
  }

  const targets = [
    minimum,
    Math.max(
      minimum,
      state.currentWager +
        Math.max(state.minimumRaise, Math.ceil((state.pot * 0.5) / CHIP_UNIT) * CHIP_UNIT),
    ),
  ]
  return [
    ...new Set(
      targets.map((amount) => Math.min(maximum, amount)).filter((amount) => amount >= minimum),
    ),
  ]
}

function shouldDeclareRiichi(
  state: GameState,
  player: PlayerState,
  expectedScore: number,
  winRate: number,
): boolean {
  return (
    state.street < 3 &&
    !player.riichi &&
    player.blueSticks > 0 &&
    expectedScore >= 13 &&
    winRate >= 0.42
  )
}

function futureBlueLiability(state: GameState, blueSticks: number): number {
  return blueSticks * nextChargesValue(state)
}

function nextChargesValue(state: GameState): number {
  let total = 15
  for (let hand = state.handNumber + 1; hand <= state.maxHands; hand += 1) {
    const handsPerOrbit = state.config.playerCount === 2 ? 4 : state.config.playerCount
    const orbit = Math.min(3, Math.floor((hand - 1) / handsPerOrbit))
    total += ORBIT_VALUES[orbit]!
  }

  return total
}

function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId)

  if (!player) {
    throw new Error(`Unknown player ${playerId}`)
  }

  return player
}

function actionOrder(action: BettingAction): number {
  return ["check", "call", "bet", "raise", "fold"].indexOf(action.type)
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`
}

function formatClosest(closest: PokerMathAnalysis["closestSpecial"]): string {
  return closest ? `${closest.label} (${closest.missing} away)` : "none active"
}
