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
  allInEquityFloor: 0.72,
  bluffFrequency: 0.06,
  lotusBluffFrequency: 0.42,
  foldPressure: 0.76,
  reserveChips: 30,
  standingAwareness: 0.45,
  survivalRiskPenalty: 1.5,
  equityCalibration: 0.75,
  aggressionGateShrinkage: 0.5,
  callDevelopmentWeight: 1,
}

export const DEFAULT_BOT_POLICY: Readonly<BotPolicy> = Object.freeze(TRAINED_POLICY)

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
  const ranked = player.privateCards
    .map((card) => {
      const kept = player.privateCards.filter((candidate) => candidate.id !== card.id)
      const lotusPenalty = card.kind === "flower" ? -12 : 0
      return {
        card,
        value: handPotential(kept, state.config.mode) + lotusPenalty,
        tie: random.next(),
      }
    })
    .sort((a, b) => b.value - a.value || b.tie - a.tie)
  const best = ranked.slice(0, 2)
  return {
    cardIds: best.map((entry) => entry.card.id),
    expectedScore: best.reduce((sum, entry) => sum + entry.value, 0) / 200,
    rationale:
      "Passes the two tiles whose removal leaves the strongest five-card core for the two unknown incoming tiles",
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
      const lotusCount = remaining
        .concat(player.publicCards)
        .filter((candidate) => candidate.kind === "flower").length
      const lotusAdjustment = lotusCount === 1 ? -250 : 0
      return {
        card,
        value:
          handPotential([...remaining, ...player.publicCards], state.config.mode) + lotusAdjustment,
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
  const toCall = Math.max(0, state.currentWager - player.roundCommitted)
  const eligibleCommitment = player.potCommitted + Math.min(toCall, player.chips)
  const potBeforeCall = state.players.reduce(
    (total, candidate) => total + Math.min(candidate.potCommitted, eligibleCommitment),
    deadMoney(state),
  )
  const potAfterCall = potBeforeCall + Math.min(toCall, player.chips)
  const progress = summarizeHandProgress(
    [...player.privateCards, ...player.publicCards],
    state.config.mode,
  )
  const known = publicKnownPrivateCards(state, player.id)
  const opponents = activeOpponents(state, playerId)
  return {
    playerId,
    samples: Math.max(1, samples),
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
  policy: Readonly<BotPolicy> = DEFAULT_BOT_POLICY,
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
  const equity = uncertaintyAdjustedEquity(math.showdownEquity, samples, fairShare)
  const evaluations: DecisionEvaluation[] = []
  const singleConcealedLotus =
    player.privateCards.filter((card) => card.kind === "flower").length === 1
  const lotusBluff =
    singleConcealedLotus && random.fork("lotus-bluff").next() < policy.lotusBluffFrequency
  const standing = standingAdjustment(state, player, policy)

  const evaluate = (action: BettingAction): DecisionEvaluation => {
    const cost = actionCost(state, player, action)
    const aggressive = action.type === "bet"
    const wager = aggressive ? action.amount : player.roundCommitted + cost
    const callerEquity = aggressive
      ? callerRangeAdjustedEquity(state, player, wager, equity)
      : equity
    const foldRates = opponents.map((opponent) =>
      foldProbability(state, opponent, wager, callerEquity, policy),
    )
    const allFold = aggressive ? foldRates.reduce((value, rate) => value * rate, 1) : 0
    const expectedCalls = aggressive
      ? opponents.reduce(
          (sum, opponent, index) =>
            sum + Math.max(0, wager - opponent.roundCommitted) * (1 - (foldRates[index] ?? 0)),
          0,
        )
      : 0
    const showdownValue = callerEquity * (math.potBeforeCall + cost + expectedCalls) - cost
    const bluffBonus = singleConcealedLotus ? state.orbitValue * 3 * opponents.length : 0
    const expectedChipDelta =
      action.type === "fold"
        ? 0
        : aggressive
          ? allFold * (state.pot + bluffBonus) + (1 - allFold) * showdownValue
          : showdownValue
    const drawUtility =
      action.type === "check" && !player.riichi
        ? developmentValue(drawGain)
        : action.type === "bet" && action.useRiichiStick
          ? developmentValue(drawGain)
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
          cost *
          (cost / Math.max(CHIP_UNIT, player.chips)) ** 2 *
          (1 - equity)
    return {
      action,
      expectedScore: math.expectedScore,
      estimatedWinRate: callerEquity,
      estimatedFoldout: allFold,
      expectedChipDelta,
      utility:
        expectedChipDelta +
        drawUtility +
        stickUtility +
        riichiUtility +
        standing * cost -
        riskPenalty,
      samples,
      rationale: `${percent(math.showdownEquity)} equity, ${percent(math.potOdds)} pot odds, ${percent(allFold)} estimated foldout`,
    }
  }

  const call = legal.find((entry) => entry.type === "call" || entry.type === "check")
  if (call) {
    const base: BettingAction =
      call.type === "check"
        ? { ...drawAction("call", plan, false), type: "check" }
        : { type: "call" }
    evaluations.push(evaluate(base))
    const useStick =
      (call.canUseRiichiStick ?? false) &&
      drawGain > 100 &&
      developmentValue(drawGain) > stickShadowValue(state, player)
    if (useStick)
      evaluations.push(
        evaluate({
          ...drawAction("call", plan, true),
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
    if (equity + standing >= Math.max(fairShare, threshold) || bluff || lotusBluff) {
      for (const amount of wagerCandidates(
        state,
        player,
        bet.minimum,
        bet.maximum,
        equity,
        policy,
      )) {
        const base: Extract<BettingAction, { type: "bet" }> = { type: "bet", amount }
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
        if (
          bet.canUseRiichiStick &&
          !singleConcealedLotus &&
          drawGain > 140 &&
          developmentValue(drawGain) > stickShadowValue(state, player)
        ) {
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
  const rank = scoreHandStrength(
    [...player.privateCards, ...player.publicCards],
    state.config.mode,
  ).total
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
  return Math.min(45, drawGain / 6)
}

function stickShadowValue(state: GameState, player?: PlayerState): number {
  const cleanupPremium = player ? Math.min(20, player.curses * state.orbitValue * 0.25) : 0
  return 24 + Math.max(0, state.maxHands - state.handNumber) + cleanupPremium
}

function standingAdjustment(
  state: GameState,
  player: PlayerState,
  policy: Readonly<BotPolicy>,
): number {
  const scores = state.players.map((candidate) => candidate.chips - candidate.loans * LOAN_PENALTY)
  const own = player.chips - player.loans * LOAN_PENALTY
  const leader = Math.max(...scores)
  const late = state.handNumber >= 9 ? 1 : 0.25
  return clamp(((leader - own) / Math.max(300, leader)) * policy.standingAwareness * late, 0, 0.15)
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
  const riskCap =
    player.roundCommitted + toChipUnit(Math.min(spendable, player.chips * policy.maxStackRisk))
  const potTargets = [0.75, policy.potWagerFraction, 1.25].map(
    (fraction) => player.roundCommitted + toChipUnit(Math.max(CHIP_UNIT, state.pot * fraction)),
  )
  const normal = [minimum, ...potTargets].filter(
    (amount) => amount >= minimum && amount <= Math.min(maximum, riskCap),
  )
  const allIn = equity >= policy.allInEquityFloor ? [maximum] : []
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
  if (toCall > opponent.chips && isFacingAllIn(state, opponent.id)) return 1
  const stackPressure = toCall / Math.max(CHIP_UNIT, opponent.chips + toCall)
  const potPressure = toCall / Math.max(CHIP_UNIT, state.pot + toCall)
  return clamp(
    (0.07 +
      (stackPressure * 0.5 + potPressure * 0.5) * policy.foldPressure +
      representedEquity * 0.08) *
      (0.88 + state.street * 0.07),
    0.03,
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
    ...(useStick ? { useRiichiStick: true, riichiDrawSource: plan.source } : {}),
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
  const sources: CardSource[] = ["deck"]
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
) {
  const ownCards = [...player.publicCards, ...player.privateCards]
  const own = projectedHand(ownCards, state.config.mode)
  const opponents = activeOpponents(state, player.id)
  const knownPrivate = publicKnownPrivateCards(state, player.id)
  const unknown = unknownCards(state, player)
  const trials = Math.max(1, samples)
  let equity = 0
  let improvements = 0
  for (let sample = 0; sample < trials; sample += 1) {
    const shuffled = random.shuffle(unknown)
    let cursor = 0
    const opponentScores = opponents.map((opponent) => {
      const known = knownPrivate[opponent.id] ?? []
      const missing = Math.max(0, 7 - opponent.publicCards.length - known.length)
      const cards = [...opponent.publicCards, ...known, ...shuffled.slice(cursor, cursor + missing)]
      cursor += missing
      return projectedHand(cards, state.config.mode)
    })
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
    const drawn = shuffled[cursor]
    if (drawn) {
      const bestAfterDraw = [...player.privateCards, drawn].reduce((best, discard) => {
        const cards = [...player.publicCards, ...player.privateCards, drawn].filter(
          (card) => card.id !== discard.id,
        )
        return Math.max(best, scoreHandStrength(cards, state.config.mode).total)
      }, own.score.total)
      if (bestAfterDraw > own.score.total) improvements += 1
    }
  }
  return {
    expectedScore: own.score.total,
    improveRate: (improvements / trials) * 100,
    showdownEquity: equity / trials,
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
  const strength = hasTwinLotus(cards) ? 13 : scoreHandStrength(cards, mode).total
  const future = summarizeHandPotential(cards, mode)
  const value =
    strength * 100 +
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
  if (state.discardA.length === 0) return "a"
  if (state.discardB.length === 0) return "b"
  const currentSource = state.pendingDiscard?.source
  const diggingSource = state.drawContext?.remaining[0]?.source
  if (diggingSource === currentSource && currentSource === "discard-a") return "b"
  if (diggingSource === currentSource && currentSource === "discard-b") return "a"
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

function isFacingAllIn(state: GameState, playerId: string): boolean {
  return state.currentAllInBettorId !== null && state.currentAllInBettorId !== playerId
}

function activeOpponents(state: GameState, playerId: string): PlayerState[] {
  return state.players.filter((player) => player.id !== playerId && !player.folded)
}

function deadMoney(state: GameState): number {
  return Math.max(
    0,
    state.pot - state.players.reduce((total, player) => total + player.potCommitted, 0),
  )
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
