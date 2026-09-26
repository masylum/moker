import { hasFreeFishing } from "./rules"
import { GameEngine } from "./engine"
import { createDeck } from "./cards"
import { summarizeHandProgress } from "./hand-progress"
import { publicKnownPrivateCards } from "./information"
import { SeededRandom } from "./random"
import { CHIP_UNIT, LOAN_PENALTY, STREET_REVEAL_COUNTS, toChipUnit } from "./rules"
import { compareHandStrengths, scoreHand, scoreHandStrength } from "./scoring"
import { clearStrengthCache, summarizeHandPotential } from "./strength"
import type {
  BettingAction,
  BlankExchange,
  Card,
  CardSource,
  DecisionEvaluation,
  DiscardPile,
  GameState,
  HeuristicDecision,
  PokerMathAnalysis,
  PlayerState,
} from "./types"

export interface BotPolicy {
  betEquityFloor: number
  raiseEquityFloor: number
  riichiEquityFloor: number
  riichiRewardDiscount: number
  potWagerFraction: number
  maxStackRisk: number
  allInEquityFloor: number
  bluffFrequency: number
  lotusBluffFrequency: number
  foldPressure: number
  reserveChips: number
  standingAwareness: number
  survivalRiskPenalty: number
  equityCalibration: number
  aggressionGateShrinkage: number
  callDevelopmentWeight: number
}

const TRAINED_POLICY: BotPolicy = {
  betEquityFloor: 0.34,
  raiseEquityFloor: 0.46,
  riichiEquityFloor: 0.42,
  riichiRewardDiscount: 0.04,
  potWagerFraction: 0.9,
  maxStackRisk: 0.7,
  allInEquityFloor: 0.95,
  bluffFrequency: 0.06,
  lotusBluffFrequency: 0.42,
  foldPressure: 0.76,
  reserveChips: 30,
  standingAwareness: 0.45,
  survivalRiskPenalty: 1,
  equityCalibration: 0.75,
  aggressionGateShrinkage: 0.5,
  callDevelopmentWeight: 1,
}

export const DEFAULT_BOT_POLICY: Readonly<BotPolicy> = Object.freeze(TRAINED_POLICY)
const RIICHI_BOT_POLICY: Readonly<BotPolicy> = Object.freeze({
  ...TRAINED_POLICY,
  allInEquityFloor: 0.95,
  equityCalibration: 0.65,
})

export function defaultBotPolicy(mode: "basic" | "riichi"): Readonly<BotPolicy> {
  return mode === "riichi" ? RIICHI_BOT_POLICY : DEFAULT_BOT_POLICY
}

export interface DiscardChoice {
  discardCardId: string
  discardPile: DiscardPile
  expectedScore: number
  rationale: string
}

export interface ExposureChoice {
  cardIds: string[]
  expectedScore: number
  rationale: string
}

export interface CharlestonChoice {
  cardIds: string[]
  expectedScore: number
  rationale: string
}

interface DrawPlan {
  source: CardSource
  blankExchange?: BlankExchange
  value: number
  tie: number
  second?: DrawPlan
}

const potentialCache = new Map<string, number>()
const POTENTIAL_CACHE_LIMIT = 100_000

export function clearHeuristicCaches(): void {
  potentialCache.clear()
  clearStrengthCache()
}

export function chooseHeuristicCharleston(state: GameState, playerId: string): CharlestonChoice {
  if (state.phase !== "charleston" || state.actingPlayerId !== playerId) {
    throw new Error("Player is not choosing a Charleston pass")
  }
  const player = getPlayer(state, playerId)
  const random = decisionRandom(state, playerId, "charleston")
  const choices: { cardIds: string[]; value: number; tie: number }[] = []
  for (let left = 0; left < player.privateCards.length; left += 1) {
    for (let right = left + 1; right < player.privateCards.length; right += 1) {
      const kept = player.privateCards.filter((_, index) => index !== left && index !== right)
      choices.push({
        cardIds: [player.privateCards[left]!.id, player.privateCards[right]!.id],
        value: handPotential(kept, state.config.mode),
        tie: random.next(),
      })
    }
  }
  choices.sort((a, b) => b.value - a.value || b.tie - a.tie)
  const best = choices[0]!
  return {
    cardIds: best.cardIds,
    expectedScore: best.value / 100,
    rationale: "Chooses the two-card pass jointly to preserve the strongest five-card core",
  }
}

export function chooseHeuristicExposure(state: GameState, playerId: string): ExposureChoice {
  if (state.phase !== "exposing" || state.actingPlayerId !== playerId) {
    throw new Error("Player is not choosing a Street exposure")
  }
  const player = getPlayer(state, playerId)
  const revealCount = STREET_REVEAL_COUNTS[state.street - 1] ?? 0
  const all = [...player.publicCards, ...player.privateCards]
  const fullValue = handPotential(all, state.config.mode)
  const madeIds = new Set(scoreHand(all, state.config.mode).selectedCardIds)
  const ranked = player.privateCards
    .map((card) => {
      const essential = madeIds.has(card.id) ? 100 : 0
      const safety =
        card.kind === "blank" ? -30 : card.kind === "flower" && !hasTwinLotus(all) ? -80 : 0
      const honor = card.kind === "wind" || card.kind === "dragon" ? 3 : 0
      return {
        card,
        value: essential + safety + honor + cardTieValue(card) / 100,
        tie: decisionTie(state, playerId, "expose", card.id),
      }
    })
    .sort((a, b) => b.value - a.value || b.tie - a.tie)
  const best = ranked.slice(0, revealCount)
  return {
    cardIds: best.map((entry) => entry.card.id),
    expectedScore: fullValue / 100,
    rationale:
      "Locks made-hand anchors while keeping weak, flexible, Blank, and lone-Lotus tiles concealed for later discards",
  }
}

export function chooseHeuristicDiscard(
  state: GameState,
  playerId: string,
  samples = state.config.heuristicSamples,
  _policy: Readonly<BotPolicy> = DEFAULT_BOT_POLICY,
): DiscardChoice {
  if (state.phase !== "discarding" || state.pendingDiscard?.playerId !== playerId) {
    throw new Error("Player is not discarding")
  }
  const player = getPlayer(state, playerId)
  const best = player.privateCards
    .map((card) => {
      const remaining = player.privateCards.filter((candidate) => candidate.id !== card.id)
      return {
        card,
        value: discardPotential(state, player, remaining),
        tie: decisionTie(state, playerId, "discard", card.id),
      }
    })
    .sort((a, b) => b.value - a.value || b.tie - a.tie)[0]!
  return {
    discardCardId: best.card.id,
    discardPile: chooseDiscardPile(state, best.card),
    expectedScore: best.value / 100,
    rationale: `Discards the lowest-value concealed tile after ${samples} draw-equity samples`,
  }
}

export function analyzePokerMath(
  state: GameState,
  playerId: string,
  samples = state.config.heuristicSamples,
): PokerMathAnalysis {
  const player = getPlayer(state, playerId)
  const future = analyzeCurrentEquity(
    state,
    player,
    decisionRandom(state, playerId, "math"),
    samples,
  )
  const toCall = Math.min(player.chips, Math.max(0, state.currentWager - player.roundCommitted))
  const cap = player.chips === toCall ? player.roundCommitted + toCall : Infinity
  const refunds = state.players.reduce(
    (sum, candidate) => sum + Math.max(0, candidate.roundCommitted - cap),
    0,
  )
  const potBeforeCall = state.pot - refunds
  const potAfterCall = potBeforeCall + toCall
  const progress = summarizeHandProgress(
    [...player.privateCards, ...player.publicCards],
    state.config.mode,
  )
  const known = publicKnownPrivateCards(state, player.id)
  const opponents = activeOpponents(state, playerId)
  return {
    playerId,
    samples: Math.max(1, samples),
    effectiveSamples: future.effectiveSamples,
    certainLoss: future.certainLoss,
    opponents: opponents.length,
    knownOpponentTiles: opponents.reduce(
      (total, opponent) => total + (known[opponent.id]?.length ?? 0) + opponent.publicCards.length,
      0,
    ),
    opponentAggressiveActions: state.bettingHistory.filter(
      (record) => record.playerId !== playerId && record.type === "bet",
    ).length,
    toCall,
    potBeforeCall,
    potAfterCall,
    potOdds: toCall === 0 ? 0 : toCall / Math.max(1, potAfterCall),
    showdownEquity: future.showdownEquity,
    equityEdge: future.showdownEquity - (toCall === 0 ? 0 : toCall / Math.max(1, potAfterCall)),
    callExpectedValue: future.showdownEquity * potAfterCall - toCall,
    expectedScore: future.expectedScore,
    improveRate: future.improveRate,
    currentBest: progress.currentBest,
    nextClosest: progress.nextClosest,
  }
}

export function chooseHeuristicAction(
  state: GameState,
  playerId: string,
  samples = state.config.heuristicSamples,
  policy: Readonly<BotPolicy> = defaultBotPolicy(state.config.mode),
): HeuristicDecision {
  if (state.phase !== "betting" || state.actingPlayerId !== playerId) {
    throw new Error("Heuristic player is not acting")
  }
  const player = getPlayer(state, playerId)
  const random = decisionRandom(state, playerId, "action")
  const math = analyzePokerMath(state, playerId, samples)
  const plan = chooseDrawPlan(state, player, random.fork("draw"), samples)
  const currentPotential = handPotential(
    [...player.privateCards, ...player.publicCards],
    state.config.mode,
  )
  const drawGain = Math.max(0, plan.value - currentPotential)
  const opponents = activeOpponents(state, playerId)
  const legal = legalActions(state, player)
  const fairShare = 1 / Math.max(1, opponents.length + 1)
  const certain = hasTwinLotus([...player.privateCards, ...player.publicCards])
  const sampledEquity = math.certainLoss
    ? 0
    : uncertaintyAdjustedEquity(math.showdownEquity, math.effectiveSamples ?? samples, fairShare)
  // A player who has bet is a stronger range than an unselected random hand.
  const equity = certain
    ? 1
    : state.currentWager > player.roundCommitted
      ? sampledEquity * (policy.equityCalibration + (1 - policy.equityCalibration) * sampledEquity)
      : sampledEquity
  const doublePlan =
    player.riichiSticks > 0 && !player.riichi && player.chips > math.toCall
      ? chooseDoubleDrawPlan(state, player, plan)
      : plan
  const fishingEquity = (drawPlan: DrawPlan) => {
    const projected = projectVisibleDraws(state, player, drawPlan)
    const deckFish =
      !projected && drawPlan.source === "deck" && !drawPlan.blankExchange && !drawPlan.second
    if (!projected && !deckFish) return undefined
    const forecastState = projected ?? state
    const own = getPlayer(forecastState, player.id)
    if (hasTwinLotus([...own.privateCards, ...own.publicCards])) return 1
    const estimate = analyzeCurrentEquity(
      forecastState,
      own,
      decisionRandom(state, player.id, "math"),
      samples,
      deckFish,
    )
    const adjusted = estimate.certainLoss
      ? 0
      : uncertaintyAdjustedEquity(estimate.showdownEquity, estimate.effectiveSamples, fairShare)
    return state.currentWager > player.roundCommitted
      ? adjusted * (policy.equityCalibration + (1 - policy.equityCalibration) * adjusted)
      : adjusted
  }
  const canForecastFishing =
    !player.riichi && state.allInPlayerIds.length === 0 && player.chips > math.toCall
  const singleFishingEquity = canForecastFishing && drawGain > 0 ? fishingEquity(plan) : undefined
  const doubleFishingEquity =
    canForecastFishing && doublePlan.second ? fishingEquity(doublePlan) : undefined
  const evaluations: DecisionEvaluation[] = []
  const singleConcealedLotus =
    player.privateCards.filter((card) => card.kind === "flower").length === 1 &&
    player.publicCards.every((card) => card.kind !== "flower")
  const lotusBluff =
    singleConcealedLotus && random.fork("lotus-bluff").next() < policy.lotusBluffFrequency
  const standing = standingAdjustment(state, player, policy)
  const tournamentRisk = tournamentRiskMultiplier(state, player)
  const finalHand = isFinalTournamentHand(state)

  const evaluate = (action: BettingAction): DecisionEvaluation => {
    const cost = actionCost(state, player, action)
    const aggressive = action.type === "bet"
    const wager = aggressive ? action.amount : player.roundCommitted + cost
    const canFish =
      action.type !== "fold" &&
      !player.riichi &&
      state.allInPlayerIds.length === 0 &&
      cost < player.chips &&
      !(action.type === "bet" && action.riichi)
    const freeFish = hasFreeFishing(state.config.mode, action.type)
    const usesFish = canFish && (freeFish || action.useRiichiStick)
    const visibleEquity = usesFish
      ? freeFish && action.useRiichiStick
        ? doubleFishingEquity
        : singleFishingEquity
      : undefined
    const developedEquity = visibleEquity ?? equity
    const callerEquity =
      aggressive && developedEquity > 0 && developedEquity < 1
        ? callerRangeAdjustedEquity(state, player, wager, developedEquity)
        : developedEquity
    const foldRates = opponents.map((opponent) =>
      foldProbability(state, opponent, wager, callerEquity, policy),
    )
    const allFold = aggressive ? foldRates.reduce((value, rate) => value * rate, 1) : 0
    const bluffBonus = singleConcealedLotus
      ? opponents.reduce((sum, opponent) => sum + Math.min(opponent.chips, state.orbitValue * 3), 0)
      : 0
    const expectedChipDelta =
      action.type === "fold"
        ? 0
        : aggressive
          ? expectedBetValue(state, player, wager, callerEquity, opponents, foldRates, bluffBonus)
          : developedEquity * math.potAfterCall - cost
    const fishingGain =
      freeFish && action.type !== "fold" && action.useRiichiStick
        ? Math.max(0, doublePlan.value - currentPotential)
        : drawGain
    const drawUtility = usesFish
      ? (state.config.mode === "riichi" ? 0.25 : 1) *
        developmentValue(fishingGain) *
        (visibleEquity === undefined ? 1 : Math.max(0, 4 - state.street) / 3)
      : 0
    const stickUtility =
      action.type !== "fold" && action.removeCurse
        ? -stickShadowValue(state)
        : action.type !== "fold" && action.useRiichiStick
          ? -stickShadowValue(state, player)
          : 0
    const riichiUtility =
      action.type === "bet" && action.riichi
        ? (allFold + (1 - allFold) * callerEquity) * 2 * stickShadowValue(state, player) -
          futureDevelopmentCost(state, drawGain)
        : 0
    const riskPenalty =
      action.type === "fold"
        ? 0
        : policy.survivalRiskPenalty *
          tournamentRisk *
          cost *
          ((player.handCommitted + cost) /
            Math.max(CHIP_UNIT, player.chips + player.handCommitted)) **
            2 *
          (1 - developedEquity)
    return {
      action,
      expectedScore: math.expectedScore,
      estimatedWinRate: callerEquity,
      estimatedFoldout: allFold,
      expectedChipDelta,
      utility: finalHand
        ? 1000 * finalHandWinCredit(state, player, action, callerEquity, opponents, foldRates) +
          expectedChipDelta * 0.0001
        : expectedChipDelta +
          (drawUtility + stickUtility) * (aggressive ? 1 - allFold : 1) +
          riichiUtility +
          standing * cost -
          riskPenalty,
      samples,
      rationale: `${percent(callerEquity)} estimated equity${visibleEquity === undefined ? "" : " after fishing"}, ${percent(math.potOdds)} pot odds, ${percent(allFold)} estimated foldout; tournament risk ×${tournamentRisk.toFixed(2)}${finalHand ? "; prioritizes final tournament win" : ""}`,
    }
  }

  const call = legal.find((entry) => entry.type === "call" || entry.type === "check")
  if (call) {
    const base: Extract<BettingAction, { type: "call" | "check" }> = {
      ...drawAction("call", plan, false),
      type: call.type === "check" ? "check" : "call",
    }
    evaluations.push(evaluate(base))
    const useStick = (call.canUseRiichiStick ?? false) && Boolean(doublePlan.second)
    if (useStick)
      evaluations.push(
        evaluate({
          ...drawAction("call", doublePlan, true),
          type: call.type === "check" ? "check" : "call",
        }),
      )
    if (call.canRemoveCurse) {
      const cleanupValue = curseCleanupValue(state, player)
      if (cleanupValue > stickShadowValue(state)) {
        const cleanup = evaluate({ ...base, removeCurse: true })
        cleanup.utility += cleanupValue
        cleanup.expectedChipDelta += cleanupValue
        cleanup.rationale += "; spends a stick to shed future Curse liability"
        evaluations.push(cleanup)
      }
    }
  }
  if (state.currentWager > player.roundCommitted) evaluations.push(evaluate({ type: "fold" }))

  const bet = legal.find((entry) => entry.type === "bet")
  if (bet?.minimum !== undefined && bet.maximum !== undefined) {
    const bluff = random.fork("bluff").next() < policy.bluffFrequency
    const threshold = state.currentWager === 0 ? policy.betEquityFloor : policy.raiseEquityFloor
    if (
      finalHand ||
      Math.max(
        equity,
        hasFreeFishing(state.config.mode, "bet") || bet.canUseRiichiStick
          ? (singleFishingEquity ?? equity)
          : equity,
      ) +
        standing >=
        Math.max(fairShare, threshold) ||
      bluff ||
      lotusBluff
    ) {
      for (const amount of wagerCandidates(
        state,
        player,
        bet.minimum,
        bet.maximum,
        equity,
        policy,
      )) {
        const base: Extract<BettingAction, { type: "bet" }> = {
          type: "bet",
          amount,
          ...(hasFreeFishing(state.config.mode, "bet") ? drawFields(plan) : {}),
        }
        evaluations.push(evaluate(base))
        const curse = bet.curseTargetIds?.length
          ? chooseCurse(state, player, base, equity, opponents, policy)
          : undefined
        if (curse) {
          const cursed = evaluate({ ...base, curseTargetId: curse.targetId })
          cursed.utility += curse.utility
          cursed.expectedChipDelta += curse.expectedChipValue
          cursed.rationale += `; curse pressure on ${curse.targetId}`
          evaluations.push(cursed)
        }
        if (bet.canUseRiichiStick && amount - player.roundCommitted < player.chips) {
          evaluations.push(evaluate({ ...base, useRiichiStick: true, ...drawFields(plan) }))
        }
        if (bet.canRiichi && shouldRiichi(state, player, equity, drawGain, policy)) {
          evaluations.push(evaluate({ ...base, riichi: true }))
        }
        if (bet.canRemoveCurse) {
          const cleanupValue = curseCleanupValue(state, player)
          if (cleanupValue > stickShadowValue(state)) {
            const cleanup = evaluate({ ...base, removeCurse: true })
            cleanup.utility += cleanupValue
            cleanup.expectedChipDelta += cleanupValue
            cleanup.rationale += "; spends a stick to shed future Curse liability"
            evaluations.push(cleanup)
          }
        }
      }
    }
  }

  if (evaluations.length === 0) evaluations.push(evaluate({ type: "fold" }))
  evaluations.sort((a, b) => b.utility - a.utility || actionOrder(a.action) - actionOrder(b.action))
  // Protect a mathematically secured lead. Basic has a fixed chip supply,
  // so reserve every possible remaining ante and secure it before the last hand.
  // Riichi loans can expand the chip supply, so its guarantee is final-hand only.
  // All other stacks and the pot form a conservative upper bound: folded
  // opponents cannot actually transfer their entire stacks, but counting them
  // keeps this decision independent of assumptions about their future play.
  if (
    !certain &&
    state.gameNumber === state.config.tournamentGames &&
    (state.config.mode === "basic" || finalHand)
  ) {
    const prior = (id: string) =>
      state.gameScores.reduce((sum, scores) => sum + (scores[id] ?? 0), 0)
    const others = state.players.filter((candidate) => candidate.id !== player.id)
    const remainingAntes =
      state.config.mode === "basic"
        ? Math.max(0, state.maxHands - state.dealerSteps - 1) * state.orbitValue
        : 0
    const available =
      state.pot + others.reduce((sum, candidate) => sum + candidate.chips, 0) + remainingAntes
    const ownScore = prior(player.id) + player.chips - player.loans * LOAN_PENALTY - remainingAntes
    const opposingMaximum = Math.max(
      ...others.map(
        (candidate) => prior(candidate.id) + available - candidate.loans * LOAN_PENALTY,
      ),
    )
    if (ownScore > opposingMaximum) {
      const fold = evaluate({ type: "fold" })
      fold.utility = evaluations[0]!.utility + 1
      fold.rationale = "Folding guarantees the tournament lead, including remaining antes"
      evaluations.unshift(fold)
    }
  }
  const best = evaluations[0]!
  return {
    playerId,
    street: state.street,
    action: best.action,
    evaluations,
    ...(lotusBluff && best.action.type === "bet" ? { strategy: "lotus-bluff" as const } : {}),
    rationale: best.rationale,
  }
}

export function strategicLoanCount(
  state: GameState,
  playerId: string,
  samples = state.config.heuristicSamples,
  policy: Readonly<BotPolicy> = DEFAULT_BOT_POLICY,
): number {
  void state
  void playerId
  void samples
  void policy
  return 0
}

function legalActions(state: GameState, player: PlayerState) {
  return GameEngine.restore(state).legalActions(player.id)
}

function curseCleanupValue(state: GameState, player: PlayerState): number {
  const remainingHands = Math.max(1, state.maxHands - state.handNumber + 1)
  const expectedFolds = remainingHands * 0.3
  return state.orbitValue * Math.min(player.curses, expectedFolds) * 1.15
}

function chooseCurse(
  state: GameState,
  player: PlayerState,
  action: Extract<BettingAction, { type: "bet" }>,
  equity: number,
  opponents: readonly PlayerState[],
  policy: Readonly<BotPolicy>,
): { targetId: string; utility: number; expectedChipValue: number } | null {
  if (player.riichi || player.riichiSticks <= (state.handNumber < 9 ? 1 : 0)) return null
  const scores = state.players.map((candidate) => ({
    id: candidate.id,
    score: candidate.chips - candidate.loans * LOAN_PENALTY,
  }))
  const leaderScore = Math.max(...scores.map((entry) => entry.score))
  const ownScore = scores.find((entry) => entry.id === player.id)!.score
  const candidates = opponents.map((target) => {
    const targetScore = scores.find((entry) => entry.id === target.id)!.score
    const foldChance = foldProbability(state, target, action.amount, equity, policy)
    const futureBurden = state.orbitValue * (target.curses + 1)
    const expectedChipValue = foldChance * equity * futureBurden
    const leaderPressure =
      targetScore === leaderScore && targetScore > ownScore
        ? Math.min(40, (targetScore - ownScore) / 15)
        : 0
    const cleanupDiscount =
      target.riichiSticks > 0 ? Math.min(futureBurden, stickShadowValue(state, target)) * 0.35 : 0
    return {
      targetId: target.id,
      expectedChipValue,
      utility:
        expectedChipValue +
        leaderPressure +
        foldChance * futureBurden * 0.35 -
        cleanupDiscount -
        stickShadowValue(state, player),
    }
  })
  const best = candidates.sort((left, right) => right.utility - left.utility)[0]
  return best && best.utility > 0 ? best : null
}

function shouldRiichi(
  state: GameState,
  player: PlayerState,
  equity: number,
  drawGain: number,
  policy: Readonly<BotPolicy>,
): boolean {
  const cards = [...player.privateCards, ...player.publicCards]
  const rank = hasTwinLotus(cards) ? 13 : scoreHandStrength(cards, state.config.mode).total
  return (
    equity >= policy.riichiEquityFloor &&
    (rank >= 8 || state.street >= 3) &&
    (drawGain < 120 || state.street === 3) &&
    futureDevelopmentCost(state, drawGain) <= equity * 3 * stickShadowValue(state, player)
  )
}

function futureDevelopmentCost(state: GameState, drawGain: number): number {
  return Math.max(0, 4 - state.street) * developmentValue(drawGain) * 0.45
}

function developmentValue(drawGain: number): number {
  return Math.min(90, drawGain / 4)
}

function stickShadowValue(state: GameState, player?: PlayerState): number {
  const cleanupPremium = player ? Math.min(20, player.curses * state.orbitValue * 0.25) : 0
  return (
    (player ? 12 / Math.max(1, player.riichiSticks) : 12) +
    Math.min(8, Math.max(0, state.maxHands - state.handNumber)) +
    cleanupPremium
  )
}

function standingAdjustment(
  state: GameState,
  player: PlayerState,
  policy: Readonly<BotPolicy>,
): number {
  const scores = tournamentScores(state)
  const own = scores[player.id]!
  const leader = Math.max(...Object.values(scores))
  const late = tournamentProgress(state)
  return clamp(
    ((leader - own) / Math.max(300, Math.abs(leader))) * policy.standingAwareness * late,
    0,
    0.15,
  )
}

function tournamentScores(state: GameState): Record<string, number> {
  return Object.fromEntries(
    state.players.map((player) => [
      player.id,
      state.gameScores.reduce((sum, scores) => sum + (scores[player.id] ?? 0), 0) +
        player.chips -
        player.loans * LOAN_PENALTY,
    ]),
  )
}

function isFinalTournamentHand(state: GameState): boolean {
  if (state.gameNumber !== state.config.tournamentGames) return false
  let steps = state.dealerSteps
  let dealer = state.dealerIndex
  do {
    steps++
    dealer = (dealer + 1) % state.players.length
  } while (steps < state.maxHands && state.players[dealer]!.eliminated)
  return steps >= state.maxHands || state.handNumber >= state.maxHands
}

function tournamentProgress(state: GameState): number {
  return clamp(
    (state.gameNumber - 1 + Math.max(state.handNumber, state.dealerSteps + 1) / state.maxHands) /
      state.config.tournamentGames,
    0,
    1,
  )
}

/** Survival matters early; a late leader protects the lead, a trailer can take risk.
 * This is a finite-horizon heuristic, not a solved tournament win probability. */
export function tournamentRiskMultiplier(state: GameState, player: PlayerState): number {
  const scores = tournamentScores(state)
  const own = scores[player.id]!
  const others = state.players.filter((p) => p.id !== player.id && !p.eliminated)
  const highest = Math.max(...others.map((p) => scores[p.id]!))
  const scale = Math.max(state.config.startingChips, ...state.players.map((p) => p.chips))
  const lead = clamp((own - highest) / scale, -1, 1)
  const late = tournamentProgress(state)
  return clamp(1.5 + 2 * late * lead, 0.5, 3.5)
}

/** Final-hand goal is the final ranking, not raw pot profit. Each caller subset
 * settles capped contributions. On a loss, average over possible opposing
 * winners; this is an approximation, not an opponent-specific showdown model. */
function finalHandWinCredit(
  state: GameState,
  player: PlayerState,
  action: BettingAction,
  equity: number,
  opponents: readonly PlayerState[],
  folds: readonly number[],
): number {
  const aggressive = action.type === "bet"
  const wager = aggressive ? action.amount : state.currentWager
  const ownCost = action.type === "fold" ? 0 : actionCost(state, player, action)
  let value = 0
  for (let mask = 0; mask < (aggressive ? 2 ** opponents.length : 1); mask++) {
    const callers = aggressive ? opponents.filter((_, i) => mask & (1 << i)) : opponents
    const probability = aggressive
      ? opponents.reduce((p, _, i) => p * (mask & (1 << i) ? 1 - folds[i]! : folds[i]!), 1)
      : 1
    const scores = tournamentScores(state)
    let pot = state.pot
    const cap = Math.min(
      wager,
      player.roundCommitted + ownCost,
      ...callers.map((p) => p.roundCommitted + p.chips),
    )
    for (const p of state.players) {
      // A fold does not trigger a new cap; only an actual short payment does.
      const refund = action.type === "fold" ? 0 : Math.max(0, p.roundCommitted - cap)
      const cost =
        p.id === player.id
          ? Math.min(ownCost, Math.max(0, cap - p.roundCommitted))
          : callers.some((q) => q.id === p.id)
            ? Math.max(0, (action.type === "fold" ? wager : cap) - p.roundCommitted)
            : 0
      const paid = Math.min(p.chips, cost)
      scores[p.id] = scores[p.id]! + refund - paid
      pot += paid - refund
    }
    const credit = (winner: string) => {
      const settled = Object.entries(scores).map(([id, score]) => ({
        id,
        score: score + (id === winner ? pot : 0),
      }))
      const best = Math.max(...settled.map((p) => p.score))
      return settled.find((p) => p.id === player.id)!.score === best
        ? 1 / settled.filter((p) => p.score === best).length
        : 0
    }
    if (!callers.length) value += probability * credit(player.id)
    else {
      const win = action.type === "fold" ? 0 : equity
      value +=
        probability *
        (win * credit(player.id) +
          ((1 - win) * callers.reduce((sum, p) => sum + credit(p.id), 0)) / callers.length)
    }
  }
  return value
}

function wagerCandidates(
  state: GameState,
  player: PlayerState,
  minimum: number,
  maximum: number,
  equity: number,
  policy: Readonly<BotPolicy>,
): number[] {
  const spendable = Math.max(0, player.chips - policy.reserveChips)
  // Budget the whole hand: a re-raise must not reset the risk allowance.
  const handBudget = Math.max(
    0,
    (player.chips + player.handCommitted) * policy.maxStackRisk - player.handCommitted,
  )
  const riskCap = player.roundCommitted + toChipUnit(Math.min(spendable, handBudget))
  const potTargets = [0.25, 0.5, policy.potWagerFraction, 1.25].map((fraction) =>
    toChipUnit(player.roundCommitted + Math.max(CHIP_UNIT, state.pot * fraction)),
  )
  const normal = [minimum, ...potTargets].filter(
    (amount) => amount >= minimum && amount <= Math.min(maximum, riskCap),
  )
  const allIn = equity >= policy.allInEquityFloor || isFinalTournamentHand(state) ? [maximum] : []
  return [...new Set([...normal, ...allIn])].sort((a, b) => a - b)
}

function callerRangeAdjustedEquity(
  state: GameState,
  player: PlayerState,
  wager: number,
  equity: number,
): number {
  const multiple = Math.max(0, wager - player.roundCommitted) / Math.max(CHIP_UNIT, state.pot)
  return clamp(equity - clamp(Math.log2(Math.max(1, multiple)) * 0.06, 0, 0.2), 0.01, 0.99)
}

function foldProbability(
  state: GameState,
  opponent: PlayerState,
  wager: number,
  representedEquity: number,
  policy: Readonly<BotPolicy>,
): number {
  const toCall = Math.max(0, wager - opponent.roundCommitted)
  const stackPressure = toCall / Math.max(CHIP_UNIT, opponent.chips + toCall)
  const potPressure = toCall / Math.max(CHIP_UNIT, state.pot + toCall)
  const priorBets = state.bettingHistory.filter(
    (record) => record.playerId === opponent.id && record.type === "bet",
  ).length
  const priceFactor = Math.min(1, potPressure / 0.2)
  const rangeFactor = 1 / (1 + Math.min(2, priorBets) * 0.35)
  return clamp(
    (0.07 +
      (stackPressure * 0.5 + potPressure * 0.5) * policy.foldPressure +
      representedEquity * 0.08) *
      (0.88 + state.street * 0.07) *
      priceFactor *
      rangeFactor,
    0,
    0.82,
  )
}

function actionCost(state: GameState, player: PlayerState, action: BettingAction): number {
  if (action.type === "call")
    return Math.min(player.chips, state.currentWager - player.roundCommitted)
  if (action.type === "bet") return action.amount - player.roundCommitted
  return 0
}

function drawAction(
  type: "call",
  plan: DrawPlan,
  useStick: boolean,
): Extract<BettingAction, { type: "call" }> {
  return {
    type,
    ...drawFields(plan),
    ...(useStick
      ? {
          useRiichiStick: true,
          riichiDrawSource: plan.second?.source ?? plan.source,
          ...(plan.second?.blankExchange ? { riichiBlankExchange: plan.second.blankExchange } : {}),
        }
      : {}),
  }
}

function drawFields(plan: DrawPlan) {
  return {
    drawSource: plan.source,
    ...(plan.blankExchange ? { blankExchange: plan.blankExchange } : {}),
  }
}

function chooseDrawPlan(
  state: GameState,
  player: PlayerState,
  random: SeededRandom,
  samples: number,
): DrawPlan {
  const sources: CardSource[] = state.deck.length > 0 ? ["deck"] : []
  if (state.discardA.length > 0) sources.push("discard-a")
  if (state.discardB.length > 0) sources.push("discard-b")
  const plans: DrawPlan[] = sources.map((source) => ({
    source,
    value: expectedDrawPotential(state, player, source, random.fork(source), samples),
    tie: random.next(),
  }))
  const blank = player.privateCards.find((card) => card.kind === "blank")
  if (blank) {
    for (const [pile, cards] of [
      ["a", state.discardA],
      ["b", state.discardB],
    ] as const) {
      cards.forEach((card, cardIndex) => {
        const hand = player.privateCards.map((candidate) =>
          candidate.id === blank.id ? card : candidate,
        )
        plans.push({
          source: "deck",
          blankExchange: { blankCardId: blank.id, pile, cardIndex },
          value: handPotential([...hand, ...player.publicCards], state.config.mode),
          tie: random.next(),
        })
      })
    }
  }
  return plans.sort(
    (a, b) =>
      b.value - a.value ||
      Number(Boolean(b.blankExchange)) - Number(Boolean(a.blankExchange)) ||
      b.tie - a.tie,
  )[0]!
}

function expectedDrawPotential(
  state: GameState,
  player: PlayerState,
  source: CardSource,
  random: SeededRandom,
  samples: number,
): number {
  const visible =
    source === "discard-a"
      ? state.discardA.at(-1)
      : source === "discard-b"
        ? state.discardB.at(-1)
        : undefined
  const unknown = visible ? [] : unknownCards(state, player)
  const count = visible ? 1 : Math.max(1, samples)
  let total = 0
  for (let index = 0; index < count; index += 1) {
    const drawn = visible ?? random.pick(unknown)
    let best = Number.NEGATIVE_INFINITY
    for (const discard of [...player.privateCards, drawn]) {
      const remaining = [...player.privateCards, drawn].filter((card) => card.id !== discard.id)
      best = Math.max(best, handPotential([...remaining, ...player.publicCards], state.config.mode))
    }
    total += best
  }
  return total / count
}

function analyzeCurrentEquity(
  state: GameState,
  player: PlayerState,
  random: SeededRandom,
  samples: number,
  fishDeck = false,
) {
  const ownCards = [...player.publicCards, ...player.privateCards]
  const baseOwn = projectedHand(ownCards, state.config.mode)
  const opponents = activeOpponents(state, player.id)
  const knownPrivate = publicKnownPrivateCards(state, player.id)
  const unknown = unknownCards(state, player)
  // Sampling uncertainty must never invent outs against a publicly unbeatable
  // hand. In Riichi, an ordinary exposed meld can still be disqualified by a
  // hidden single Lotus, so only known Twin Lotus is sufficient here.
  const certainLoss =
    !fishDeck &&
    !hasTwinLotus(ownCards) &&
    opponents.some((opponent) => {
      const visible = [...opponent.publicCards, ...(knownPrivate[opponent.id] ?? [])]
      if (hasTwinLotus(visible)) return true
      return (
        state.config.mode === "basic" &&
        compareHandStrengths(scoreHandStrength(visible, "basic"), baseOwn.score) > 0
      )
    })
  const trials = Math.max(1, samples)
  let equity = 0
  const deals: { credit: number; opponents: ReturnType<typeof projectedHand>[] }[] = []
  let improvements = 0
  for (let sample = 0; sample < trials; sample += 1) {
    const shuffled = random.shuffle(unknown)
    let cursor = 0
    let own = baseOwn
    if (fishDeck) {
      const drawn = shuffled[cursor++]!
      const candidates = [...player.privateCards, drawn]
      const discard = candidates
        .map((card) => ({
          card,
          value: handPotential(
            candidates.filter((c) => c.id !== card.id).concat(player.publicCards),
            state.config.mode,
          ),
          tie: decisionTie(state, player.id, "discard", card.id),
        }))
        .sort((a, b) => b.value - a.value || b.tie - a.tie)[0]!.card
      own = projectedHand(
        candidates.filter((c) => c.id !== discard.id).concat(player.publicCards),
        state.config.mode,
      )
    }
    const opponentScores = opponents.map((opponent) => {
      const known = knownPrivate[opponent.id] ?? []
      const missing = Math.max(0, 7 - opponent.publicCards.length - known.length)
      const cards = [...opponent.publicCards, ...known, ...shuffled.slice(cursor, cursor + missing)]
      cursor += missing
      return projectedHand(cards, state.config.mode)
    })
    const beforeEquity = equity
    const eligibleScores = [
      ...(own.eligible ? [own.score] : []),
      ...opponentScores.filter((entry) => entry.eligible).map((entry) => entry.score),
    ]
    if (eligibleScores.length === 0) {
      equity += fairSplit(opponents.length + 1)
    } else {
      const best = eligibleScores.sort((a, b) => compareHandStrengths(b, a))[0]!
      if (own.eligible && compareHandStrengths(own.score, best) === 0) {
        equity +=
          1 /
          (1 +
            opponentScores.filter(
              (entry) => entry.eligible && compareHandStrengths(entry.score, own.score) === 0,
            ).length)
      }
    }
    deals.push({ credit: equity - beforeEquity, opponents: opponentScores })
    const drawn = shuffled[cursor]
    if (drawn && !fishDeck) {
      const bestAfterDraw = [...player.privateCards, drawn].reduce((best, discard) => {
        const cards = [...player.publicCards, ...player.privateCards, drawn].filter(
          (card) => card.id !== discard.id,
        )
        return Math.max(best, scoreHandStrength(cards, state.config.mode).total)
      }, own.score.total)
      if (bestAfterDraw > own.score.total) improvements += 1
    }
  }
  // A bettor is selected for strength. Reweight complete deals rather than
  // giving every opponent a fresh uniform random range after each raise.
  const aggression = opponents.map((opponent) =>
    Math.min(
      2,
      state.bettingHistory.filter(
        (record) => record.playerId === opponent.id && record.type === "bet",
      ).length,
    ),
  )
  let weightedEquity = 0,
    weightTotal = 0,
    squaredWeight = 0
  for (const deal of deals) {
    let weight = 1
    for (let i = 0; i < opponents.length; i++) {
      if (!aggression[i]) continue
      const strength = deal.opponents[i]!
      const compare = (other: typeof strength) =>
        Number(strength.eligible) - Number(other.eligible) ||
        compareHandStrengths(strength.score, other.score)
      const percentile =
        deals.reduce((sum, other) => {
          const order = compare(other.opponents[i]!)
          return sum + (order > 0 ? 1 : order === 0 ? 0.5 : 0)
        }, 0) / deals.length
      weight *= 0.2 + 0.8 * percentile ** aggression[i]!
    }
    weightTotal += weight
    squaredWeight += weight * weight
    weightedEquity += weight * deal.credit
  }
  return {
    expectedScore: baseOwn.score.total,
    improveRate: (improvements / trials) * 100,
    showdownEquity: weightedEquity / weightTotal,
    effectiveSamples: weightTotal ** 2 / squaredWeight,
    certainLoss,
  }
}

function projectedHand(cards: readonly Card[], mode: "basic" | "riichi") {
  const lotusCount = cards.filter((card) => card.kind === "flower").length
  return {
    eligible: lotusCount !== 1,
    score: lotusCount === 2 ? { total: 13, tieBreak: [] } : scoreHandStrength(cards, mode),
  }
}

function handPotential(cards: readonly Card[], mode: "basic" | "riichi"): number {
  const key = mode + ":" + cards.map(cardKey).sort().join("|")
  const cached = potentialCache.get(key)
  if (cached !== undefined) return cached
  const scored = scoreHandStrength(cards, mode)
  const strength = hasTwinLotus(cards) ? 13 : scored.total
  const tieValue = scored.tieBreak.reduce((sum, value, index) => sum + value / 16 ** index, 0)
  const blankOption = cards.some((card) => card.kind === "blank") ? 12 : 0
  const jokerOption = cards.filter((card) => card.kind === "joker").length * 25
  const future = summarizeHandPotential(cards, mode)
  const value =
    strength * 100 +
    tieValue +
    blankOption +
    jokerOption -
    (cards.filter((card) => card.kind === "flower").length === 1 ? 250 : 0) +
    (future.nextMissing === null ? 0 : (10 - future.nextMissing) * 2 + (future.nextRank ?? 0) / 100)
  if (potentialCache.size >= POTENTIAL_CACHE_LIMIT) potentialCache.clear()
  potentialCache.set(key, value)
  return value
}

function unknownCards(state: GameState, player: PlayerState): Card[] {
  const knownPrivate = Object.values(publicKnownPrivateCards(state, player.id)).flat()
  const knownIds = new Set(
    [
      ...player.privateCards,
      ...state.players.flatMap((candidate) => candidate.publicCards),
      ...knownPrivate,
      ...state.discardA,
      ...state.discardB,
    ].map((card) => card.id),
  )
  return createDeck(state.config.mode).filter((card) => !knownIds.has(card.id))
}

function chooseDiscardPile(state: GameState, discarded: Card): DiscardPile {
  const diggingSource = state.drawContext?.remaining[0]?.source
  if (diggingSource === "discard-a") return "b"
  if (diggingSource === "discard-b") return "a"
  if (state.discardA.length === 0) return "a"
  if (state.discardB.length === 0) return "b"
  const danger = (card: Card) =>
    card.kind === "joker"
      ? 9
      : card.kind === "blank"
        ? 1
        : card.kind === "numbered" && card.rank >= 3 && card.rank <= 7
          ? 5
          : 3
  const aDanger = danger(state.discardA.at(-1)!)
  const bDanger = danger(state.discardB.at(-1)!)
  if (aDanger !== bDanger) return aDanger > bDanger ? "a" : "b"
  return decisionTie(
    state,
    discarded.id,
    "lane",
    `${state.discardA.at(-1)!.id}:${state.discardB.at(-1)!.id}`,
  ) < 0.5
    ? "a"
    : "b"
}

function activeOpponents(state: GameState, playerId: string): PlayerState[] {
  return state.players.filter((player) => player.id !== playerId && !player.folded)
}

function hasTwinLotus(cards: readonly Card[]): boolean {
  return cards.filter((card) => card.kind === "flower").length === 2
}

function cardTieValue(card: Card): number {
  if (card.kind === "numbered") return card.rank
  if (card.kind === "dragon") return 10
  if (card.kind === "wind") return 11
  return 0
}

function cardKey(card: Card): string {
  if (card.kind === "numbered") return `${card.suit}-${card.rank}`
  if (card.kind === "dragon") return `dragon-${card.dragon}`
  if (card.kind === "wind") return `wind-${card.wind}`
  if (card.kind === "flower") return `flower-${card.flower}`
  if (card.kind === "joker") return `joker-${card.color}`
  return "blank"
}

function getPlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) throw new Error(`Unknown player ${playerId}`)
  return player
}

function decisionRandom(state: GameState, playerId: string, purpose: string): SeededRandom {
  return new SeededRandom(
    `${state.config.seed}:h${state.handNumber}:s${state.street}:v${state.version}:${playerId}:${purpose}`,
  )
}

function decisionTie(state: GameState, playerId: string, purpose: string, choice: string): number {
  return decisionRandom(state, playerId, `${purpose}:${choice}`).next()
}

function uncertaintyAdjustedEquity(equity: number, samples: number, fairShare: number): number {
  return (equity * samples + fairShare * 8) / (samples + 8)
}

function fairSplit(players: number): number {
  return 1 / Math.max(1, players)
}

function actionOrder(action: BettingAction): number {
  return { check: 0, call: 0, bet: 1, fold: 2 }[action.type]
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

// Each caller can lower the single-pot cap. Only this street is refundable;
// earlier commitments (including folded players' money) stay in the pot.
function expectedBetValue(
  state: GameState,
  player: PlayerState,
  wager: number,
  equity: number,
  opponents: readonly PlayerState[],
  folds: readonly number[],
  bluffBonus: number,
): number {
  let value = 0
  for (let mask = 0; mask < 2 ** opponents.length; mask += 1) {
    const callers = opponents.filter((_, index) => mask & (1 << index))
    const probability = opponents.reduce(
      (p, _, index) => p * (mask & (1 << index) ? 1 - folds[index]! : folds[index]!),
      1,
    )
    if (!callers.length) {
      value += probability * (state.pot + bluffBonus)
      continue
    }
    const cap = Math.min(
      wager,
      ...callers.map((opponent) => opponent.roundCommitted + opponent.chips),
    )
    const ownCost = cap - player.roundCommitted
    const refunds = state.players
      .filter((p) => p.id !== player.id)
      .reduce((sum, p) => sum + Math.max(0, p.roundCommitted - cap), 0)
    const calls = callers.reduce((sum, p) => sum + Math.max(0, cap - p.roundCommitted), 0)
    value += probability * (equity * (state.pot + ownCost + calls - refunds) - ownCost)
  }
  return value
}

function bestDrawValue(
  hidden: readonly Card[],
  publicCards: readonly Card[],
  drawn: Card,
  mode: "basic" | "riichi",
): number {
  return Math.max(
    ...[...hidden, drawn].map((discard) =>
      handPotential(
        [...hidden, drawn].filter((card) => card.id !== discard.id).concat(publicCards),
        mode,
      ),
    ),
  )
}

// Plan two visible draws jointly, including the card underneath an unhelpful top.
// The first discard is re-evaluated against the queued second draw below.
function chooseDoubleDrawPlan(state: GameState, player: PlayerState, single: DrawPlan): DrawPlan {
  let best = single
  const lanes = [
    ["discard-a", state.discardA],
    ["discard-b", state.discardB],
  ] as const
  for (const [source, cards] of lanes) {
    const first = cards.at(-1)
    if (!first) continue
    // A visible Blank can be fished first, then spent to retrieve any buried card.
    if (first.kind === "blank") {
      for (const [targetSource, targetCards] of lanes) {
        const available = targetSource === source ? targetCards.slice(0, -1) : targetCards
        available.forEach((target, cardIndex) => {
          const value = Math.max(
            ...player.privateCards.map((discard) =>
              handPotential(
                player.privateCards
                  .filter((card) => card.id !== discard.id)
                  .concat(target, player.publicCards),
                state.config.mode,
              ),
            ),
          )
          if (value > best.value)
            best = {
              source,
              value,
              tie: 0,
              second: {
                source: "deck",
                value,
                tie: 0,
                blankExchange: {
                  blankCardId: first.id,
                  pile: targetSource === "discard-a" ? "a" : "b",
                  cardIndex,
                },
              },
            }
        })
      }
    }
    for (const [secondSource, secondCards] of lanes) {
      const second = secondCards.at(source === secondSource ? -2 : -1)
      if (!second) continue
      let value = -Infinity
      for (const discard of [...player.privateCards, first]) {
        const hidden = [...player.privateCards, first].filter((card) => card.id !== discard.id)
        value = Math.max(
          value,
          bestDrawValue(hidden, player.publicCards, second, state.config.mode),
        )
      }
      if (value > best.value)
        best = { source, value, tie: 0, second: { source: secondSource, value, tie: 0 } }
    }
  }
  return best
}

function discardPotential(state: GameState, player: PlayerState, hidden: Card[]): number {
  const next = state.drawContext?.remaining[0]
  if (next?.blankExchange) {
    const exchange = next.blankExchange
    const target = (exchange.pile === "a" ? state.discardA : state.discardB)[exchange.cardIndex]
    if (!target || !hidden.some((card) => card.id === exchange.blankCardId)) return -Infinity
    return handPotential(
      hidden
        .map((card) => (card.id === exchange.blankCardId ? target : card))
        .concat(player.publicCards),
      state.config.mode,
    )
  }
  const drawn =
    next?.source === "discard-a"
      ? state.discardA.at(-1)
      : next?.source === "discard-b"
        ? state.discardB.at(-1)
        : undefined
  return drawn && !next?.blankExchange
    ? bestDrawValue(hidden, player.publicCards, drawn, state.config.mode)
    : handPotential([...hidden, ...player.publicCards], state.config.mode)
}

// Only public lane contents and the actor's cards are used. Deck draws stay uncertain.
function projectVisibleDraws(
  state: GameState,
  player: PlayerState,
  plan: DrawPlan,
): GameState | undefined {
  const projected = {
    ...state,
    discardA: [...state.discardA],
    discardB: [...state.discardB],
    players: state.players.map((p) =>
      p.id === player.id ? { ...p, privateCards: [...p.privateCards] } : p,
    ),
  }
  const own = getPlayer(projected, player.id)
  const steps = plan.second ? [plan, plan.second] : [plan]
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]!
    if (step.blankExchange) {
      const exchange = step.blankExchange
      const lane = exchange.pile === "a" ? projected.discardA : projected.discardB
      const blank = own.privateCards.find((c) => c.id === exchange.blankCardId)
      const target = lane[exchange.cardIndex]
      if (!blank || !target) return undefined
      own.privateCards = own.privateCards.map((c) => (c.id === blank.id ? target : c))
      lane[exchange.cardIndex] = blank
    } else {
      if (step.source === "deck") return undefined
      const lane = step.source === "discard-a" ? projected.discardA : projected.discardB
      const drawn = lane.pop()
      if (!drawn) return undefined
      own.privateCards.push(drawn)
      const next = steps[index + 1]
      const nextCard =
        next?.source === "discard-a"
          ? projected.discardA.at(-1)
          : next?.source === "discard-b"
            ? projected.discardB.at(-1)
            : undefined
      const ranked = own.privateCards
        .map((discard) => {
          const hidden = own.privateCards.filter((c) => c.id !== discard.id)
          let value = handPotential(hidden.concat(own.publicCards), state.config.mode)
          if (nextCard) value = bestDrawValue(hidden, own.publicCards, nextCard, state.config.mode)
          if (next?.blankExchange) {
            const ex = next.blankExchange
            const target = (ex.pile === "a" ? projected.discardA : projected.discardB)[
              ex.cardIndex
            ]!
            value = hidden.some((c) => c.id === ex.blankCardId)
              ? handPotential(
                  hidden.map((c) => (c.id === ex.blankCardId ? target : c)).concat(own.publicCards),
                  state.config.mode,
                )
              : -Infinity
          }
          return { discard, value, tie: decisionTie(state, player.id, "discard", discard.id) }
        })
        .sort((a, b) => b.value - a.value || b.tie - a.tie)
      const discard = ranked[0]!.discard
      own.privateCards = own.privateCards.filter((c) => c.id !== discard.id)
      // Keep the queued draw accessible; when one lane is empty it must be filled.
      const destination =
        projected.discardA.length === 0
          ? projected.discardA
          : projected.discardB.length === 0
            ? projected.discardB
            : next?.source === "discard-a"
              ? projected.discardB
              : projected.discardA
      destination.push(discard)
    }
  }
  return projected
}
