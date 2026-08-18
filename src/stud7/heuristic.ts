import { createDeck } from "../game/cards"
import { SeededRandom } from "../game/random"
import { CHIP_UNIT, ORBIT_VALUES, toChipUnit } from "../game/rules"
import { compareHandScores, scoreHand } from "../game/scoring"
import type { BettingAction, BlankExchange, Card, CardSource, DiscardPile } from "../game/types"
import { STUD7_FINAL_STREET } from "./rules"
import type {
  StudCard,
  StudDecisionEvaluation,
  StudDiscardChoice,
  StudGameState,
  StudHeuristicDecision,
  StudPlayerState,
  StudPokerMathAnalysis,
} from "./types"

interface DrawPlan {
  source: CardSource
  blankExchange?: BlankExchange
  value: number
}

interface FutureAnalysis {
  expectedRank: number
  improveRate: number
  showdownEquity: number
  opponents: number
}

export function chooseStud7Action(
  state: StudGameState,
  playerId: string,
  samples = state.config.heuristicSamples,
  fastMode = false,
): StudHeuristicDecision {
  if (state.phase !== "betting" || state.actingPlayerId !== playerId) {
    throw new Error("Stud7 heuristic player is not acting")
  }

  const player = getPlayer(state, playerId)
  const random = new SeededRandom(
    `${state.config.seed}:stud7:h${state.handNumber}:s${state.street}:v${state.version}:${playerId}`,
  )
  const drawPlan =
    player.riichi && state.config.riichiDrawMode === "discard-drawn"
      ? { source: "deck" as const, value: currentRank(player.cards) }
      : fastMode && !player.cards.some(({ card }) => card.kind === "blank")
        ? { source: "deck" as const, value: currentRank(player.cards) }
        : chooseDrawPlan(state, player, random.fork("draw"), samples)
  const math = analyzeStud7Math(state, playerId, samples)
  const toCall = state.currentWager - player.roundCommitted
  const evaluations: StudDecisionEvaluation[] = []

  const evaluate = (
    action: BettingAction,
    chipCost: number,
    aggressive = false,
  ): StudDecisionEvaluation => {
    const responseRate = aggressive ? 0.4 : 0
    const expectedCalls = aggressive
      ? state.players.filter((candidate) => candidate.id !== playerId && !candidate.folded).length *
        responseRate
      : 0
    const expectedPot = state.pot + chipCost + chipCost * expectedCalls
    const expectedChipDelta = math.showdownEquity * expectedPot - chipCost
    const blueBenefit = aggressive && player.blueSticks > 0 ? nextChargesValue(state) * 0.03 : 0

    return {
      action,
      showdownEquity: math.showdownEquity,
      expectedRank: math.expectedRank,
      utility: expectedChipDelta + blueBenefit + math.expectedRank * 0.02,
    }
  }

  evaluations.push({
    action: { type: "fold" },
    showdownEquity: 0,
    expectedRank: 0,
    utility: -(player.blueSticks + state.config.foldBlueSticks) * nextChargesValue(state) * 0.03,
  })

  if (toCall === 0) {
    evaluations.push(
      evaluate(
        {
          type: "check",
          drawSource: drawPlan.source,
          ...(drawPlan.blankExchange ? { blankExchange: drawPlan.blankExchange } : {}),
        },
        0,
      ),
    )

    if (math.showdownEquity >= Math.max(0.4, 1 / (math.opponents + 1) + 0.1)) {
      for (const amount of sensibleWagers(state, player, CHIP_UNIT)) {
        const riichi = shouldDeclareRiichi(state, player, math)
        evaluations.push(
          evaluate(
            { type: "bet", amount, ...(riichi ? { riichi: true } : {}) },
            amount - player.roundCommitted,
            true,
          ),
        )
      }
    }
  } else if (player.chips - toCall >= wagerReserve(state, player)) {
    evaluations.push(
      evaluate(
        {
          type: "call",
          drawSource: drawPlan.source,
          ...(drawPlan.blankExchange ? { blankExchange: drawPlan.blankExchange } : {}),
        },
        toCall,
      ),
    )

    if (math.showdownEquity >= Math.max(0.52, math.potOdds + 0.15)) {
      for (const amount of sensibleWagers(state, player, state.currentWager + state.minimumRaise)) {
        const riichi = shouldDeclareRiichi(state, player, math)
        evaluations.push(
          evaluate(
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
  const best = evaluations[0]!

  return {
    playerId,
    action: best.action,
    evaluations,
    rationale: `Selected ${best.action.type}; ${Math.round(math.showdownEquity * 100)}% equity, ${Math.round(math.potOdds * 100)}% pot odds, call EV ${formatSigned(math.callExpectedValue)}, expected rank ${math.expectedRank.toFixed(1)}.`,
  }
}

export function chooseStud7Discard(
  state: StudGameState,
  playerId: string,
  samples = state.config.heuristicSamples,
  fastMode = false,
): StudDiscardChoice {
  const pending = state.pendingDiscard

  if (state.phase !== "discarding" || !pending || pending.playerId !== playerId) {
    throw new Error("Stud7 player is not discarding")
  }

  const player = getPlayer(state, playerId)
  const random = new SeededRandom(`${state.config.seed}:stud7:discard:${state.version}:${playerId}`)

  if (player.riichi && state.config.riichiDrawMode === "discard-drawn") {
    return {
      discardCardId: pending.drawnCard.id,
      discardPile: chooseDiscardPile(state, pending.drawnCard),
      expectedRank: currentRank(player.cards),
      rationale: "Riichi hand remains locked by discarding the draw",
    }
  }

  if (fastMode) {
    const candidates = [...player.cards.map(({ card }) => card.id), pending.drawnCard.id].map(
      (discardCardId) => {
        const resulting = manufacturedCards(
          player.cards,
          pending.drawnCard,
          pending.source,
          discardCardId,
        )

        return { discardCardId, expectedRank: currentRank(resulting), tieBreaker: random.next() }
      },
    )
    candidates.sort(
      (left, right) =>
        right.expectedRank - left.expectedRank ||
        right.tieBreaker - left.tieBreaker ||
        left.discardCardId.localeCompare(right.discardCardId),
    )
    const best = candidates[0]!
    const discarded =
      best.discardCardId === pending.drawnCard.id
        ? pending.drawnCard
        : player.cards.find(({ card }) => card.id === best.discardCardId)!.card

    return {
      discardCardId: best.discardCardId,
      discardPile: chooseDiscardPile(state, discarded),
      expectedRank: best.expectedRank,
      rationale: `Fast balance evaluation keeps rank ${best.expectedRank}`,
    }
  }

  const candidates = [...player.cards.map(({ card }) => card.id), pending.drawnCard.id].map(
    (discardCardId) => {
      const resulting = manufacturedCards(
        player.cards,
        pending.drawnCard,
        pending.source,
        discardCardId,
      )
      const future = analyzeFuture(state, playerId, resulting, random.fork(discardCardId), samples)

      return { discardCardId, resulting, ...future }
    },
  )
  candidates.sort(
    (left, right) =>
      right.expectedRank - left.expectedRank ||
      right.showdownEquity - left.showdownEquity ||
      left.discardCardId.localeCompare(right.discardCardId),
  )
  const best = candidates[0]!
  const discard =
    best.discardCardId === pending.drawnCard.id
      ? pending.drawnCard
      : player.cards.find(({ card }) => card.id === best.discardCardId)!.card
  const replacement = best.resulting.find(({ card }) => card.id === pending.drawnCard.id)

  return {
    discardCardId: best.discardCardId,
    discardPile: chooseDiscardPile(state, discard),
    expectedRank: best.expectedRank,
    rationale: `Expected final rank ${best.expectedRank.toFixed(1)}; ${replacement ? `replacement becomes ${replacement.visibility}` : "discarded the draw"}`,
  }
}

export function analyzeStud7Math(
  state: StudGameState,
  playerId: string,
  samples = state.config.heuristicSamples,
): StudPokerMathAnalysis {
  const player = getPlayer(state, playerId)
  const future = analyzeFuture(
    state,
    playerId,
    player.cards,
    new SeededRandom(
      `${state.config.seed}:stud7:math:h${state.handNumber}:s${state.street}:v${state.version}:${playerId}`,
    ),
    samples,
  )
  const toCall = Math.max(0, state.currentWager - player.roundCommitted)
  const potAfterCall = state.pot + toCall
  const potOdds = toCall === 0 ? 0 : toCall / potAfterCall

  return {
    playerId,
    samples: Math.max(1, samples),
    opponents: future.opponents,
    toCall,
    potOdds,
    showdownEquity: future.showdownEquity,
    callExpectedValue: future.showdownEquity * potAfterCall - toCall,
    expectedRank: future.expectedRank,
    improveRate: future.improveRate,
  }
}

function chooseDrawPlan(
  state: StudGameState,
  player: StudPlayerState,
  random: SeededRandom,
  samples: number,
): DrawPlan {
  const plans: DrawPlan[] = []
  const unknown = unknownCards(state, player.id, player.cards)
  const deckSamples = Math.max(1, Math.min(samples, 24))
  let deckValue = 0

  for (let sample = 0; sample < deckSamples; sample += 1) {
    deckValue += bestImmediateRank(player.cards, random.pick(unknown), "deck")
  }

  plans.push({ source: "deck", value: deckValue / deckSamples })

  for (const [source, lane] of [
    ["discard-a", state.discardA],
    ["discard-b", state.discardB],
  ] as const) {
    const visible = lane.at(-1)

    if (visible) {
      plans.push({ source, value: bestImmediateRank(player.cards, visible, source) })
    }
  }

  const blanks = player.cards.filter(({ card }) => card.kind === "blank")

  for (const blank of blanks) {
    for (const [pile, lane] of [
      ["a", state.discardA],
      ["b", state.discardB],
    ] as const) {
      lane.forEach((card, cardIndex) => {
        const replaced = player.cards.map((owned) =>
          owned.card.id === blank.card.id ? { card, visibility: "public" as const } : owned,
        )
        plans.push({
          source: "deck",
          blankExchange: { blankCardId: blank.card.id, pile, cardIndex },
          value: currentRank(replaced),
        })
      })
    }
  }

  return plans.sort(
    (left, right) =>
      right.value - left.value ||
      Number(Boolean(right.blankExchange)) - Number(Boolean(left.blankExchange)) ||
      left.source.localeCompare(right.source),
  )[0]!
}

function bestImmediateRank(cards: readonly StudCard[], drawn: Card, source: CardSource): number {
  return Math.max(
    ...[...cards.map(({ card }) => card.id), drawn.id].map((discardCardId) =>
      currentRank(manufacturedCards(cards, drawn, source, discardCardId)),
    ),
  )
}

function manufacturedCards(
  cards: readonly StudCard[],
  drawn: Card,
  source: CardSource,
  discardCardId: string,
): StudCard[] {
  if (discardCardId === drawn.id) {
    return cards.map((owned) => structuredClone(owned))
  }

  return cards.map((owned) =>
    owned.card.id === discardCardId
      ? {
          card: structuredClone(drawn),
          visibility: source === "deck" ? owned.visibility : "public",
        }
      : structuredClone(owned),
  )
}

function analyzeFuture(
  state: StudGameState,
  playerId: string,
  cards: readonly StudCard[],
  random: SeededRandom,
  samples: number,
): FutureAnalysis {
  const trials = Math.max(1, samples)
  const futureDeals = Math.max(0, STUD7_FINAL_STREET - state.street)
  const unknown = unknownCards(state, playerId, cards)
  const opponents = state.players.filter(
    (candidate) => candidate.id !== playerId && !candidate.folded,
  )
  const current = currentRank(cards)
  let rankTotal = 0
  let improvements = 0
  let equity = 0

  for (let sample = 0; sample < trials; sample += 1) {
    const shuffled = random.shuffle(unknown)
    let cursor = 0
    const ownCompletion = shuffled.slice(cursor, cursor + futureDeals)
    cursor += futureDeals
    const ownScore = scoreHand([...cards.map(({ card }) => card), ...ownCompletion])
    rankTotal += ownScore.total

    if (ownScore.total > current) {
      improvements += 1
    }

    const opponentScores = opponents.map((opponent) => {
      const visible = opponent.cards
        .filter(({ visibility }) => visibility === "public")
        .map(({ card }) => card)
      const hiddenCount = opponent.cards.filter(({ visibility }) => visibility === "private").length
      const dealt = shuffled.slice(cursor, cursor + hiddenCount + futureDeals)
      cursor += hiddenCount + futureDeals

      return scoreHand([...visible, ...dealt])
    })
    const best = [ownScore, ...opponentScores].sort((left, right) =>
      compareHandScores(right, left),
    )[0]!

    if (compareHandScores(ownScore, best) === 0) {
      const ties = opponentScores.filter(
        (opponentScore) => compareHandScores(opponentScore, ownScore) === 0,
      ).length
      equity += 1 / (ties + 1)
    }
  }

  return {
    expectedRank: rankTotal / trials,
    improveRate: (improvements / trials) * 100,
    showdownEquity: equity / trials,
    opponents: opponents.length,
  }
}

function unknownCards(
  state: StudGameState,
  playerId: string,
  ownCards: readonly StudCard[],
): Card[] {
  const visible = state.players.flatMap((player) =>
    player.id === playerId
      ? []
      : player.cards.filter(({ visibility }) => visibility === "public").map(({ card }) => card),
  )
  const known = new Set(
    [
      ...ownCards.map(({ card }) => card),
      ...visible,
      ...state.discardA,
      ...state.discardB,
      ...(state.pendingDiscard?.playerId === playerId ? [state.pendingDiscard.drawnCard] : []),
    ].map((card) => card.id),
  )

  return createDeck().filter((card) => !known.has(card.id))
}

function currentRank(cards: readonly StudCard[]): number {
  return scoreHand(cards.map(({ card }) => card)).total
}

function chooseDiscardPile(state: StudGameState, discarded: Card): DiscardPile {
  if (state.discardA.length === 0) {
    return "a"
  }

  if (state.discardB.length === 0) {
    return "b"
  }

  return discarded.id.localeCompare(state.discardA.at(-1)!.id) <= 0 ? "a" : "b"
}

function sensibleWagers(state: StudGameState, player: StudPlayerState, minimum: number): number[] {
  const reserve = wagerReserve(state, player)
  const maximum = toChipUnit(player.roundCommitted + Math.max(0, player.chips - reserve))

  if (maximum < minimum) {
    return []
  }

  const halfPot = Math.ceil((state.pot * 0.5) / CHIP_UNIT) * CHIP_UNIT
  const targets = [
    minimum,
    Math.max(minimum, state.currentWager + Math.max(state.minimumRaise, halfPot)),
  ]

  return [
    ...new Set(
      targets.map((amount) => Math.min(maximum, amount)).filter((amount) => amount >= minimum),
    ),
  ]
}

function wagerReserve(state: StudGameState, player: StudPlayerState): number {
  const futureLiabilities = Math.max(1, player.blueSticks + player.loans + 1)

  return Math.min(player.chips, toChipUnit(nextChargesValue(state) * futureLiabilities + 20))
}

function shouldDeclareRiichi(
  state: StudGameState,
  player: StudPlayerState,
  math: StudPokerMathAnalysis,
): boolean {
  return (
    state.street < STUD7_FINAL_STREET &&
    !player.riichi &&
    player.blueSticks > 0 &&
    math.expectedRank >= 7 &&
    math.showdownEquity >= 0.45
  )
}

function nextChargesValue(state: StudGameState): number {
  let total = 15

  for (let hand = state.handNumber + 1; hand <= state.maxHands; hand += 1) {
    const handsPerOrbit = state.config.playerCount === 2 ? 4 : state.config.playerCount
    const orbit = Math.min(3, Math.floor((hand - 1) / handsPerOrbit))
    total += ORBIT_VALUES[orbit]!
  }

  return total
}

function getPlayer(state: StudGameState, playerId: string): StudPlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId)

  if (!player) {
    throw new Error(`Unknown player ${playerId}`)
  }

  return player
}

function actionOrder(action: BettingAction): number {
  return ["check", "call", "bet", "raise", "fold"].indexOf(action.type)
}

function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`
}
