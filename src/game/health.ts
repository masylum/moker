import { cardLabel, faceKey } from "./cards"
import type { Card, GameEvent, HandKind, HandResult, SimulationResult } from "./types"

export interface TileHealth {
  label: string
  openingHoldings: number
  openingWinCredit: number
  everHoldings: number
  everWinCredit: number
  holdings: number
  winCredit: number
  showdownHoldings: number
  showdownWinCredit: number
  selectedInWinningHand: number
}

export interface HealthAccumulator {
  games: number
  scheduledHands: number
  hands: number
  gamesEndingEarly: number
  gamesWithElimination: number
  eliminations: number
  eliminationHands: Record<string, number>
  gameLengths: number[]
  openingPots: number[]
  finalPots: number[]
  openingBlueCharges: number[]
  openingLoanCharges: number[]
  showdowns: number
  uncontested: number
  boardResets: number
  flowerBluffs: number
  flowerBluffChips: number
  flowerDisqualifications: number
  riichiDeclarations: number
  riichiWins: number
  distinctHandWinners: number[]
  finalScoreSpreads: number[]
  gameWinsBySeat: Record<string, number>
  finishByCommunityCount: Record<string, number>
  winningHands: Record<string, number>
  showdownHands: Record<string, number>
  allFinalHands: Record<string, number>
  actionCounts: Record<string, number>
  drawSourceCounts: Record<string, number>
  blankExchanges: number
  loansTaken: number
  loansRepaid: number
  maximumLoansByPlayer: Record<string, number>
  endLoans: number[]
  openingCenterBlue: number[]
  endCenterBlue: number[]
  playerBlue: number[]
  playerLoans: number[]
  participantHands: number
  winnerCredit: number
  tiles: Record<string, TileHealth>
}

export function createHealthAccumulator(): HealthAccumulator {
  return {
    games: 0,
    scheduledHands: 0,
    hands: 0,
    gamesEndingEarly: 0,
    gamesWithElimination: 0,
    eliminations: 0,
    eliminationHands: {},
    gameLengths: [],
    openingPots: [],
    finalPots: [],
    openingBlueCharges: [],
    openingLoanCharges: [],
    showdowns: 0,
    uncontested: 0,
    boardResets: 0,
    flowerBluffs: 0,
    flowerBluffChips: 0,
    flowerDisqualifications: 0,
    riichiDeclarations: 0,
    riichiWins: 0,
    distinctHandWinners: [],
    finalScoreSpreads: [],
    gameWinsBySeat: {},
    finishByCommunityCount: {},
    winningHands: {},
    showdownHands: {},
    allFinalHands: {},
    actionCounts: {},
    drawSourceCounts: {},
    blankExchanges: 0,
    loansTaken: 0,
    loansRepaid: 0,
    maximumLoansByPlayer: {},
    endLoans: [],
    openingCenterBlue: [],
    endCenterBlue: [],
    playerBlue: [],
    playerLoans: [],
    participantHands: 0,
    winnerCredit: 0,
    tiles: {},
  }
}

export function addSimulationHealth(
  accumulator: HealthAccumulator,
  result: SimulationResult,
): void {
  const { state } = result
  accumulator.games += 1
  accumulator.scheduledHands += state.maxHands
  accumulator.hands += state.handResults.length
  accumulator.gameLengths.push(state.handResults.length)

  if (state.handResults.length < state.maxHands) {
    accumulator.gamesEndingEarly += 1
  }

  const eliminated = state.players.filter((player) => player.eliminated)

  if (eliminated.length > 0) {
    accumulator.gamesWithElimination += 1
  }

  accumulator.eliminations += eliminated.length

  for (const player of eliminated) {
    increment(accumulator.eliminationHands, String(player.eliminatedAtHand ?? "unknown"))
  }

  const scores = Object.entries(state.finalScores ?? {})
  const sortedScores = scores.sort((left, right) => right[1] - left[1])
  const topScore = sortedScores[0]?.[1]

  for (const [playerId, score] of sortedScores) {
    if (score === topScore) {
      increment(accumulator.gameWinsBySeat, playerId)
    }
  }

  if (sortedScores.length > 1) {
    accumulator.finalScoreSpreads.push(
      sortedScores[0]![1] - sortedScores[sortedScores.length - 1]![1],
    )
  }

  accumulator.distinctHandWinners.push(
    new Set(state.handResults.flatMap((hand) => hand.winnerIds)).size,
  )
  accumulator.endLoans.push(...state.players.map((player) => player.loans))

  for (const hand of state.handResults) {
    addHandHealth(accumulator, hand)
  }

  const maximumLoans = new Map(state.players.map((player) => [player.id, player.loans]))

  for (const event of result.events) {
    addEventHealth(accumulator, event, maximumLoans)
  }

  for (const maximum of maximumLoans.values()) {
    increment(accumulator.maximumLoansByPlayer, String(maximum))
  }

  for (const decision of result.decisions) {
    const action = decision.action
    increment(accumulator.actionCounts, action.type)

    if ("drawSource" in action) {
      increment(
        accumulator.drawSourceCounts,
        action.blankExchange ? "blank-exchange" : action.drawSource,
      )
    }

    if ("riichi" in action && action.riichi) {
      accumulator.riichiDeclarations += 1
    }
  }
}

export function mergeHealth(
  target: HealthAccumulator,
  source: HealthAccumulator,
): HealthAccumulator {
  for (const key of [
    "games",
    "scheduledHands",
    "hands",
    "gamesEndingEarly",
    "gamesWithElimination",
    "eliminations",
    "showdowns",
    "uncontested",
    "boardResets",
    "flowerBluffs",
    "flowerBluffChips",
    "flowerDisqualifications",
    "riichiDeclarations",
    "riichiWins",
    "blankExchanges",
    "loansTaken",
    "loansRepaid",
    "participantHands",
    "winnerCredit",
  ] as const) {
    target[key] += source[key]
  }

  for (const key of [
    "gameLengths",
    "openingPots",
    "finalPots",
    "openingBlueCharges",
    "openingLoanCharges",
    "distinctHandWinners",
    "finalScoreSpreads",
    "endLoans",
    "openingCenterBlue",
    "endCenterBlue",
    "playerBlue",
    "playerLoans",
  ] as const) {
    target[key].push(...source[key])
  }

  for (const key of [
    "eliminationHands",
    "gameWinsBySeat",
    "finishByCommunityCount",
    "winningHands",
    "showdownHands",
    "allFinalHands",
    "actionCounts",
    "drawSourceCounts",
    "maximumLoansByPlayer",
  ] as const) {
    mergeCounts(target[key], source[key])
  }

  for (const [key, tile] of Object.entries(source.tiles)) {
    const current = target.tiles[key] ?? {
      label: tile.label,
      openingHoldings: 0,
      openingWinCredit: 0,
      everHoldings: 0,
      everWinCredit: 0,
      holdings: 0,
      winCredit: 0,
      showdownHoldings: 0,
      showdownWinCredit: 0,
      selectedInWinningHand: 0,
    }
    current.openingHoldings += tile.openingHoldings
    current.openingWinCredit += tile.openingWinCredit
    current.everHoldings += tile.everHoldings
    current.everWinCredit += tile.everWinCredit
    current.holdings += tile.holdings
    current.winCredit += tile.winCredit
    current.showdownHoldings += tile.showdownHoldings
    current.showdownWinCredit += tile.showdownWinCredit
    current.selectedInWinningHand += tile.selectedInWinningHand
    target.tiles[key] = current
  }

  return target
}

function addHandHealth(accumulator: HealthAccumulator, hand: HandResult): void {
  accumulator.openingPots.push(hand.openingPot)
  accumulator.finalPots.push(hand.pot)
  accumulator.openingBlueCharges.push(hand.openingBlueCharge)
  accumulator.openingLoanCharges.push(hand.openingLoanCharge)
  accumulator.openingCenterBlue.push(hand.openingCenterBlueSticks)
  accumulator.endCenterBlue.push(hand.centerBlueSticks)
  accumulator.boardResets += hand.boardResets
  accumulator.flowerDisqualifications += hand.players.filter(
    (player) => player.flowerDisqualified,
  ).length
  increment(accumulator.finishByCommunityCount, String(hand.community.length))

  if (hand.reason === "showdown") {
    accumulator.showdowns += 1
  } else {
    accumulator.uncontested += 1
  }

  if (hand.flowerBonus) {
    accumulator.flowerBluffs += 1
    accumulator.flowerBluffChips += hand.flowerBonus.total
  }

  if (hand.riichiSettlement) {
    accumulator.riichiWins += 1
  }

  const winCredit = hand.winnerIds.length > 0 ? 1 / hand.winnerIds.length : 0

  for (const player of hand.players.filter((candidate) => candidate.participated)) {
    const won = hand.winnerIds.includes(player.playerId)
    const credit = won ? winCredit : 0
    const kind = handKind(player.score.combinations[0]?.kind)
    accumulator.participantHands += 1
    accumulator.winnerCredit += credit
    accumulator.playerBlue.push(player.blueSticks)
    accumulator.playerLoans.push(player.loans)
    increment(accumulator.allFinalHands, kind)

    if (hand.reason === "showdown" && !player.folded) {
      increment(accumulator.showdownHands, kind)
    }

    if (won) {
      increment(accumulator.winningHands, kind, credit)
    }

    addTileHoldings(
      accumulator,
      hand,
      player.openingCards,
      player.acquiredCards,
      player.cards,
      player.score.selectedCardIds,
      credit,
      won,
    )
  }
}

function addTileHoldings(
  accumulator: HealthAccumulator,
  hand: HandResult,
  openingCards: Card[],
  acquiredCards: Card[],
  cards: Card[],
  selectedCardIds: string[],
  credit: number,
  won: boolean,
): void {
  const opening = tileCategories(openingCards)
  const acquired = tileCategories(acquiredCards)
  const final = tileCategories(cards)
  const keys = new Set([...opening.keys(), ...acquired.keys(), ...final.keys()])
  const selected = new Set(selectedCardIds)

  for (const key of keys) {
    const openingCategory = opening.get(key)
    const acquiredCategory = acquired.get(key)
    const finalCategory = final.get(key)
    const category = finalCategory ?? acquiredCategory ?? openingCategory!
    const tile = accumulator.tiles[key] ?? {
      label: category.label,
      openingHoldings: 0,
      openingWinCredit: 0,
      everHoldings: 0,
      everWinCredit: 0,
      holdings: 0,
      winCredit: 0,
      showdownHoldings: 0,
      showdownWinCredit: 0,
      selectedInWinningHand: 0,
    }

    if (openingCategory) {
      tile.openingHoldings += 1
      tile.openingWinCredit += credit
    }

    if (acquiredCategory) {
      tile.everHoldings += 1
      tile.everWinCredit += credit
    }

    if (finalCategory) {
      tile.holdings += 1
      tile.winCredit += credit

      if (hand.reason === "showdown") {
        tile.showdownHoldings += 1
        tile.showdownWinCredit += credit
      }

      if (won && finalCategory.cards.some((card) => selected.has(card.id))) {
        tile.selectedInWinningHand += credit
      }
    }

    accumulator.tiles[key] = tile
  }
}

function tileCategories(cards: Card[]): Map<string, { label: string; cards: Card[] }> {
  const categories = new Map<string, { label: string; cards: Card[] }>()

  for (const card of cards) {
    const key = `face:${faceKey(card)}`
    const face = categories.get(key) ?? { label: cardLabel(card), cards: [] }
    face.cards.push(card)
    categories.set(key, face)

    if (card.kind === "joker" || card.kind === "blank" || card.kind === "flower") {
      const categoryKey = `kind:${card.kind}`
      const category = categories.get(categoryKey) ?? {
        label: `Any ${card.kind[0]!.toUpperCase()}${card.kind.slice(1)}`,
        cards: [],
      }
      category.cards.push(card)
      categories.set(categoryKey, category)
    }
  }

  return categories
}

function addEventHealth(
  accumulator: HealthAccumulator,
  event: GameEvent,
  maximumLoans: Map<string, number>,
): void {
  if (event.type === "loan-taken") {
    accumulator.loansTaken += 1
    const loans = (event.payload as { loans?: number }).loans ?? 0

    if (event.actorId) {
      maximumLoans.set(event.actorId, Math.max(maximumLoans.get(event.actorId) ?? 0, loans))
    }
  } else if (event.type === "loan-repaid") {
    accumulator.loansRepaid += 1
  } else if (event.type === "blank-exchanged") {
    accumulator.blankExchanges += 1
  }
}

function handKind(kind: HandKind | undefined): HandKind {
  return kind ?? "high-card"
}

function increment(record: Record<string, number>, key: string, amount = 1): void {
  record[key] = (record[key] ?? 0) + amount
}

function mergeCounts(target: Record<string, number>, source: Record<string, number>): void {
  for (const [key, count] of Object.entries(source)) {
    increment(target, key, count)
  }
}
