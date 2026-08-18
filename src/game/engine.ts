import { createDeck } from "./cards"
import { publicKnownPrivateCards } from "./information"
import { SeededRandom } from "./random"
import {
  COMMUNITY_REVEALS,
  CHIP_UNIT,
  FOLD_BLUE_STICKS,
  FLOWER_FOLD_BONUS,
  LOAN_VALUE,
  MAX_LOANS,
  ORBIT_VALUES,
  OPENING_PRIVATE_CARD_COUNT,
  PRIVATE_CARD_COUNT,
  createConfig,
  maxHandsFor,
  orbitFor,
} from "./rules"
import { compareHandScores, scoreHand } from "./scoring"
import type {
  BettingAction,
  BlankExchange,
  Card,
  DiscardPile,
  GameConfig,
  GameEvent,
  GameState,
  HandResult,
  LegalAction,
  PlayerController,
  PlayerState,
  PublicGameState,
} from "./types"

export interface PlayerSetup {
  id?: string
  name: string
  controller: PlayerController
}

export class GameEngine {
  readonly events: GameEvent[]
  state: GameState
  private random: SeededRandom

  private constructor(state: GameState, events: GameEvent[]) {
    this.state = state
    this.state.minimumRaise ??= CHIP_UNIT
    this.state.handResults ??= []
    this.state.drawDiscardHistory ??= []
    this.state.seedDiscardHistory ??= []
    this.state.bettingHistory ??= []
    this.state.boardResetCount ??= 0
    this.state.scrappedCommunity ??= []
    this.events = events
    this.random = new SeededRandom(state.config.seed, state.rngState)
  }

  static create(
    players: PlayerSetup[],
    partial: Partial<GameConfig> & Pick<GameConfig, "seed">,
  ): GameEngine {
    const config = createConfig({ ...partial, playerCount: players.length })
    const random = new SeededRandom(config.seed)
    const state: GameState = {
      id: `game-${config.seed}`,
      config,
      rngState: random.state,
      handNumber: 0,
      maxHands: maxHandsFor(config.playerCount),
      dealerIndex: 0,
      orbit: 1,
      orbitValue: 5,
      phase: "between-hands",
      street: 0,
      players: players.map((player, index) => ({
        id: player.id ?? `p${index + 1}`,
        name: player.name,
        controller: player.controller,
        chips: config.startingChips,
        blueSticks: 1,
        loans: 0,
        loansCharged: [],
        privateCards: [],
        folded: false,
        riichi: false,
        roundCommitted: 0,
        handCommitted: 0,
      })),
      deck: [],
      community: [],
      discardA: [],
      discardB: [],
      removedCards: [],
      scrappedCommunity: [],
      pot: 0,
      centerBlueSticks: config.playerCount,
      currentWager: 0,
      minimumRaise: CHIP_UNIT,
      pendingPlayerIds: [],
      actingPlayerId: null,
      pendingDiscard: null,
      drawDiscardHistory: [],
      seedDiscardHistory: [],
      bettingHistory: [],
      boardResetCount: 0,
      handWinners: [],
      handResults: [],
      finalScores: null,
      version: 0,
    }
    const engine = new GameEngine(state, [])
    engine.emit("game-created", { config, players: players.map((player) => player.name) })
    engine.startNextHand()
    return engine
  }

  static restore(state: GameState, events: GameEvent[] = []): GameEngine {
    return new GameEngine(structuredClone(state), structuredClone(events))
  }

  startNextHand(): void {
    this.assertPhase("between-hands")
    if (this.state.handNumber >= this.state.maxHands) {
      this.finishGame()
      return
    }
    this.state.handNumber += 1
    this.state.orbit = orbitFor(this.state.handNumber, this.state.config.playerCount)
    this.state.orbitValue = ORBIT_VALUES[this.state.orbit - 1]!
    this.state.street = 0
    this.state.phase = "betting"
    this.state.pot = 0
    this.state.community = []
    this.state.discardA = []
    this.state.discardB = []
    this.state.removedCards = []
    this.state.scrappedCommunity = []
    this.state.drawDiscardHistory = []
    this.state.seedDiscardHistory = []
    this.state.bettingHistory = []
    this.state.boardResetCount = 0
    this.state.handWinners = []
    this.state.pendingDiscard = null
    this.state.currentWager = 0
    this.state.minimumRaise = CHIP_UNIT
    this.state.deck = this.random.shuffle(createDeck())

    for (const player of this.state.players) {
      player.privateCards = []
      player.folded = false
      player.riichi = false
      player.roundCommitted = 0
      player.handCommitted = 0
      player.score = undefined
      player.loansCharged = player.loansCharged.map((charges) => charges + 1)
      const charge = this.state.orbitValue * (player.blueSticks + player.loans)
      this.payOpeningCharge(player, charge)
    }

    for (let cardIndex = 0; cardIndex < OPENING_PRIVATE_CARD_COUNT; cardIndex += 1) {
      for (let offset = 1; offset <= this.state.players.length; offset += 1) {
        this.playerAt(this.state.dealerIndex + offset).privateCards.push(this.drawDeck())
      }
    }
    this.state.rngState = this.random.state
    this.emit("hand-started", {
      dealerId: this.playerAt(this.state.dealerIndex).id,
      orbit: this.state.orbit,
      charge: this.state.orbitValue,
    })
    this.beginSeedDiscards()
  }

  seedDiscard(
    playerId: string,
    decision: { discardCardId: string; discardPile: DiscardPile },
  ): void {
    if (this.state.phase !== "seeding" || this.state.actingPlayerId !== playerId) {
      throw new Error("This player is not seeding a discard lane")
    }

    const player = this.getPlayer(playerId)
    const cardIndex = player.privateCards.findIndex((card) => card.id === decision.discardCardId)

    if (cardIndex < 0) {
      throw new Error("Seed discard card is not in the private hand")
    }

    const target = decision.discardPile === "a" ? this.state.discardA : this.state.discardB
    const other = decision.discardPile === "a" ? this.state.discardB : this.state.discardA

    if (other.length === 0 && target.length > 0) {
      throw new Error("An empty discard pile must be filled first")
    }

    const [discarded] = player.privateCards.splice(cardIndex, 1)
    const discardIndex = target.length
    target.push(discarded!)
    this.state.seedDiscardHistory.push({
      playerId,
      discardedCard: structuredClone(discarded!),
      discardPile: decision.discardPile,
      discardIndex,
    })
    this.state.pendingPlayerIds = this.state.pendingPlayerIds.filter((id) => id !== playerId)
    this.emit(
      "seed-discard",
      { discardedCardId: discarded!.id, pile: decision.discardPile },
      playerId,
    )
    const nextPlayerId = this.state.pendingPlayerIds[0]

    if (nextPlayerId) {
      this.state.actingPlayerId = nextPlayerId

      return
    }

    this.state.actingPlayerId = null
    this.openStreet(1)
  }

  legalActions(playerId: string): LegalAction[] {
    if (this.state.phase !== "betting" || this.state.actingPlayerId !== playerId) {
      return []
    }

    const player = this.getPlayer(playerId)

    if (player.folded) {
      return []
    }

    const toCall = this.state.currentWager - player.roundCommitted
    const maximum = player.roundCommitted + player.chips
    const actions: LegalAction[] = [{ type: "fold" }]
    if (toCall === 0) {
      actions.push({ type: "check" })
      if (maximum >= CHIP_UNIT) {
        actions.push({
          type: "bet",
          minimum: CHIP_UNIT,
          maximum,
          canRiichi: this.canDeclareRiichi(player),
        })
      }
    } else if (player.chips >= toCall) {
      actions.push({ type: "call", callAmount: toCall })
      const minimum = this.state.currentWager + this.state.minimumRaise
      if (maximum >= minimum) {
        actions.push({
          type: "raise",
          minimum,
          maximum,
          canRiichi: this.canDeclareRiichi(player),
        })
      }
    }

    return actions
  }

  act(playerId: string, action: BettingAction): void {
    if (this.state.phase !== "betting") {
      throw new Error("Betting action is not available now")
    }

    if (this.state.actingPlayerId !== playerId) {
      throw new Error(`It is not ${playerId}'s turn`)
    }

    const player = this.getPlayer(playerId)
    const legal = this.legalActions(playerId).find((entry) => entry.type === action.type)

    if (!legal) {
      throw new Error(`Illegal ${action.type} action`)
    }

    let aggressive = false
    switch (action.type) {
      case "check":
        if (!player.riichi) {
          if (action.blankExchange) {
            this.exchangeBlank(player, action.blankExchange)
            this.recordBettingAction(playerId, action)
            this.completeTurn(playerId, false)

            return
          }

          this.beginDraw(player, action.drawSource)
          this.recordBettingAction(playerId, action)
          return
        }
        break
      case "call":
        this.payToPot(player, this.state.currentWager - player.roundCommitted, true)
        if (!player.riichi) {
          if (action.blankExchange) {
            this.exchangeBlank(player, action.blankExchange)
            this.recordBettingAction(playerId, action)
            this.completeTurn(playerId, false)

            return
          }

          this.beginDraw(player, action.drawSource)
          this.recordBettingAction(playerId, action)
          return
        }
        break
      case "bet":
      case "raise": {
        const minimum = legal.minimum ?? CHIP_UNIT
        const maximum = legal.maximum ?? player.roundCommitted + player.chips
        if (
          !Number.isInteger(action.amount) ||
          action.amount % CHIP_UNIT !== 0 ||
          action.amount < minimum ||
          action.amount > maximum
        ) {
          throw new RangeError(
            `${action.type} must be a multiple of ${CHIP_UNIT} between ${minimum} and ${maximum}`,
          )
        }
        if (action.riichi && !legal.canRiichi) {
          throw new Error("Riichi is not available")
        }

        const raiseSize = action.amount - this.state.currentWager
        this.payToPot(player, action.amount - player.roundCommitted, true)
        this.state.currentWager = action.amount
        this.state.minimumRaise = raiseSize
        this.returnBlueStick(player)
        if (action.riichi) {
          player.riichi = true
        }

        aggressive = true
        break
      }
      case "fold":
        player.folded = true
        this.state.removedCards.push(...player.privateCards)

        for (let stick = 0; stick < FOLD_BLUE_STICKS; stick += 1) {
          this.gainBlueStick(player)
        }
        break
    }

    this.recordBettingAction(playerId, action)
    if (this.activePlayers().length === 1) {
      this.awardUncontested(this.activePlayers()[0]!)

      return
    }

    this.completeTurn(playerId, aggressive)
  }

  discard(playerId: string, decision: { discardCardId: string; discardPile: DiscardPile }): void {
    const pending = this.state.pendingDiscard
    if (this.state.phase !== "discarding" || !pending || pending.playerId !== playerId) {
      throw new Error("This player is not choosing a discard")
    }
    const player = this.getPlayer(playerId)
    const discardIndex = player.privateCards.findIndex((card) => card.id === decision.discardCardId)
    if (discardIndex < 0) {
      throw new Error("Discard card is not in the private hand")
    }

    const target = decision.discardPile === "a" ? this.state.discardA : this.state.discardB
    const other = decision.discardPile === "a" ? this.state.discardB : this.state.discardA
    if (other.length === 0 && target.length > 0) {
      throw new Error("An empty discard pile must be filled first")
    }

    const drawn = player.privateCards.find((card) => card.id === pending.drawnCardId)
    const laneIndex = target.length
    const [discarded] = player.privateCards.splice(discardIndex, 1)
    target.push(discarded!)
    this.state.pendingDiscard = null
    this.state.phase = "betting"
    this.emit(
      "draw-discard",
      {
        source: pending.source,
        drawnCardId: pending.drawnCardId,
        discardedCardId: discarded!.id,
        pile: decision.discardPile,
      },
      player.id,
    )
    if (!drawn) {
      throw new Error("Drawn card is missing from the private hand")
    }

    this.state.drawDiscardHistory.push({
      playerId,
      source: pending.source,
      drawnCard: structuredClone(drawn),
      discardedCard: structuredClone(discarded!),
      discardPile: decision.discardPile,
      discardIndex: laneIndex,
    })
    this.completeTurn(playerId, false)
  }

  takeLoan(playerId: string): void {
    if (this.state.phase === "finished") {
      throw new Error("The game is over")
    }

    const player = this.getPlayer(playerId)

    if (player.loans >= MAX_LOANS) {
      throw new Error("A player may hold at most two Loans")
    }

    player.loans += 1
    player.loansCharged.push(0)
    player.chips += LOAN_VALUE
    this.emit("loan-taken", { amount: LOAN_VALUE, loans: player.loans }, playerId)
  }

  repayLoan(playerId: string): void {
    const player = this.getPlayer(playerId)
    const eligibleIndex = player.loansCharged.findIndex((charges) => charges >= 1)
    if (eligibleIndex < 0) {
      throw new Error("A Loan must pay interest at least once before repayment")
    }

    if (player.chips < LOAN_VALUE) {
      throw new Error("Not enough chips to repay a Loan")
    }

    player.chips -= LOAN_VALUE
    player.loans -= 1
    player.loansCharged.splice(eligibleIndex, 1)
    this.emit("loan-repaid", { amount: LOAN_VALUE, loans: player.loans }, playerId)
  }

  publicView(viewerId?: string, revealAll = false): PublicGameState {
    const { drawDiscardHistory: _drawDiscardHistory, ...publicState } = structuredClone(this.state)
    const knownPrivateCards = publicKnownPrivateCards(this.state)

    return {
      ...publicState,
      deck: { count: this.state.deck.length },
      pendingDiscard:
        this.state.pendingDiscard && (revealAll || this.state.pendingDiscard.playerId === viewerId)
          ? structuredClone(this.state.pendingDiscard)
          : this.state.pendingDiscard
            ? { ...structuredClone(this.state.pendingDiscard), drawnCardId: "hidden" }
            : null,
      players: this.state.players.map((player) => ({
        ...structuredClone(player),
        knownPrivateCards: structuredClone(knownPrivateCards[player.id] ?? []),
        privateCards:
          revealAll ||
          player.id === viewerId ||
          this.state.phase === "showdown" ||
          this.state.phase === "between-hands" ||
          this.state.phase === "finished"
            ? structuredClone(player.privateCards)
            : { count: player.privateCards.length },
      })),
    }
  }

  private beginSeedDiscards(): void {
    this.state.phase = "seeding"
    const ordered = this.orderedAfter(this.state.dealerIndex)
    this.state.pendingPlayerIds = ordered.map((player) => player.id)
    this.state.actingPlayerId = this.state.pendingPlayerIds[0] ?? null
    this.emit("seed-discard-started", {
      playerIds: this.state.pendingPlayerIds,
      privateCardCount: OPENING_PRIVATE_CARD_COUNT,
    })
  }

  private openStreet(street: 1 | 2 | 3 | 4): void {
    this.state.street = street
    const revealCount = COMMUNITY_REVEALS[street - 1]!
    const revealed = Array.from({ length: revealCount }, () => this.drawDeck())

    if (street !== 1 && revealed.some((card) => card.kind === "flower")) {
      this.resetCommunityBoard(revealed, street)

      return
    }

    this.state.community.push(...revealed)
    this.beginBettingRound(street, revealCount === 0 ? [] : revealed.map((card) => card.id))
  }

  private resetCommunityBoard(revealed: Card[], fromStreet: 2 | 3 | 4): void {
    const scrapped = [...this.state.community, ...revealed]
    this.state.removedCards.push(...scrapped)
    this.state.scrappedCommunity.push(...scrapped)
    this.state.community = []
    this.state.boardResetCount += 1
    this.emit("flower-board-reset", {
      fromStreet,
      flowerIds: revealed.filter((card) => card.kind === "flower").map((card) => card.id),
      scrappedCardIds: scrapped.map((card) => card.id),
      reset: this.state.boardResetCount,
    })
    const replacementFlop = Array.from({ length: 3 }, () => this.drawDeck())

    if (replacementFlop.some((card) => card.kind === "flower")) {
      this.resetCommunityBoard(replacementFlop, 2)

      return
    }

    this.state.community.push(...replacementFlop)
    this.beginBettingRound(
      2,
      replacementFlop.map((card) => card.id),
    )
  }

  private beginBettingRound(street: 1 | 2 | 3 | 4, revealed: string[]): void {
    this.state.street = street
    this.state.phase = "betting"

    this.state.currentWager = 0
    this.state.minimumRaise = CHIP_UNIT

    for (const player of this.state.players) {
      player.roundCommitted = 0
    }

    const active = this.orderedActiveAfter(this.state.dealerIndex)
    this.state.pendingPlayerIds = active.map((player) => player.id)
    this.state.actingPlayerId = this.state.pendingPlayerIds[0] ?? null
    this.emit("street-opened", {
      street,
      revealed,
      boardResetCount: this.state.boardResetCount,
    })
  }

  private completeTurn(playerId: string, aggressive: boolean): void {
    if (aggressive) {
      const actorIndex = this.state.players.findIndex((player) => player.id === playerId)
      this.state.pendingPlayerIds = this.orderedActiveAfter(actorIndex)
        .filter((player) => player.id !== playerId)
        .map((player) => player.id)
    } else {
      this.state.pendingPlayerIds = this.state.pendingPlayerIds.filter(
        (id) => id !== playerId && !this.getPlayer(id).folded,
      )
    }
    this.continueRound(this.state.pendingPlayerIds[0] ?? null)
  }

  private continueRound(nextPlayerId: string | null): void {
    if (nextPlayerId) {
      this.state.actingPlayerId = nextPlayerId
      return
    }
    this.state.actingPlayerId = null

    if (this.state.street < 4) {
      this.openStreet((this.state.street + 1) as 2 | 3 | 4)
    } else {
      this.resolveShowdown()
    }
  }

  private beginDraw(player: PlayerState, source: "deck" | "discard-a" | "discard-b"): void {
    if (player.riichi) {
      throw new Error("Riichi locks the private hand")
    }

    let drawn: Card | undefined

    if (source === "deck") {
      drawn = this.state.deck.pop()
    }

    if (source === "discard-a") {
      drawn = this.state.discardA.pop()
    }

    if (source === "discard-b") {
      drawn = this.state.discardB.pop()
    }

    if (!drawn) {
      throw new Error(`Cannot draw from empty ${source}`)
    }

    player.privateCards.push(drawn)
    this.state.pendingDiscard = { playerId: player.id, drawnCardId: drawn.id, source }
    this.state.phase = "discarding"
    this.state.actingPlayerId = player.id
    this.emit("card-drawn", { source, cardId: drawn.id }, player.id)
  }

  private exchangeBlank(player: PlayerState, exchange: BlankExchange): void {
    if (player.riichi) {
      throw new Error("Riichi locks the private hand")
    }

    const blankIndex = player.privateCards.findIndex((card) => card.id === exchange.blankCardId)
    const blank = player.privateCards[blankIndex]

    if (!blank || blank.kind !== "blank") {
      throw new Error("Blank exchange requires a private Blank")
    }

    const lane = exchange.pile === "a" ? this.state.discardA : this.state.discardB
    const claimed = lane[exchange.cardIndex]

    if (!claimed) {
      throw new Error("Blank exchange target is not in that discard lane")
    }

    lane[exchange.cardIndex] = blank
    player.privateCards[blankIndex] = claimed
    this.state.drawDiscardHistory.push({
      playerId: player.id,
      source: "blank-exchange",
      drawnCard: structuredClone(claimed),
      discardedCard: structuredClone(blank),
      discardPile: exchange.pile,
      discardIndex: exchange.cardIndex,
    })
    this.emit(
      "blank-exchanged",
      {
        blankCardId: blank.id,
        claimedCardId: claimed.id,
        pile: exchange.pile,
        cardIndex: exchange.cardIndex,
      },
      player.id,
    )
  }

  private resolveShowdown(): void {
    this.state.phase = "showdown"
    const contenders = this.activePlayers()

    for (const player of contenders) {
      player.score = scoreHand([...player.privateCards, ...this.state.community])
    }

    const eligible = contenders.filter((player) => !this.hasSingleFlower(player))
    if (eligible.length === 0) {
      this.emit("all-players-flower-disqualified", {
        playerIds: contenders.map((player) => player.id),
      })
    }

    const bestScore = eligible
      .map((player) => player.score!)
      .sort((left, right) => compareHandScores(right, left))[0]
    const winners = bestScore
      ? eligible.filter((player) => compareHandScores(player.score!, bestScore) === 0)
      : contenders
    this.state.handWinners = winners.map((player) => player.id)
    const pot = this.state.pot
    const payouts = this.splitPot(winners)

    for (const winner of winners) {
      if (winner.riichi) {
        this.resolveRiichiWin(winner, contenders)
      }
    }

    this.emit("showdown", {
      winners: this.state.handWinners,
      flowerDisqualified: contenders
        .filter((player) => this.hasSingleFlower(player))
        .map((player) => player.id),
      scores: Object.fromEntries(contenders.map((player) => [player.id, player.score?.total ?? 0])),
    })
    this.recordHandResult("showdown", pot, payouts, null)
    this.endHand()
  }

  private awardUncontested(winner: PlayerState): void {
    const pot = this.state.pot
    winner.chips += pot
    const flowerBonus = this.hasSingleFlower(winner) ? this.payFlowerFoldBonus(winner) : null
    this.state.handWinners = [winner.id]
    this.emit("uncontested-win", { winnerId: winner.id, pot, flowerBonus })
    this.state.pot = 0
    this.recordHandResult("uncontested", pot, { [winner.id]: pot }, flowerBonus)
    this.endHand()
  }

  private endHand(): void {
    this.state.phase = "between-hands"
    this.state.actingPlayerId = null
    this.state.pendingPlayerIds = []
    this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.players.length

    if (this.state.handNumber >= this.state.maxHands) {
      this.finishGame()
    }
  }

  private finishGame(): void {
    if (this.state.phase === "finished") {
      return
    }

    for (const player of this.state.players) {
      const charge = 15 * (player.blueSticks + player.loans)
      player.chips -= charge
    }
    this.state.finalScores = Object.fromEntries(
      this.state.players.map((player) => [player.id, player.chips - LOAN_VALUE * player.loans]),
    )
    this.state.phase = "finished"
    this.emit("game-finished", { finalScores: this.state.finalScores })
  }

  private splitPot(winners: PlayerState[]): Record<string, number> {
    const share = Math.floor(this.state.pot / winners.length / CHIP_UNIT) * CHIP_UNIT
    let remainder = this.state.pot - share * winners.length
    const payouts = Object.fromEntries(winners.map((winner) => [winner.id, share]))
    const ordered = this.orderedAfter(this.state.dealerIndex).filter((player) =>
      winners.includes(player),
    )
    for (const winner of winners) {
      winner.chips += share
    }

    for (const winner of ordered) {
      if (remainder <= 0) {
        break
      }

      winner.chips += CHIP_UNIT
      payouts[winner.id] = (payouts[winner.id] ?? 0) + CHIP_UNIT
      remainder -= CHIP_UNIT
    }
    this.state.pot = 0

    return payouts
  }

  private recordHandResult(
    reason: "showdown" | "uncontested",
    pot: number,
    payouts: Record<string, number>,
    flowerBonus: HandResult["flowerBonus"],
  ): void {
    this.state.handResults.push({
      handNumber: this.state.handNumber,
      pot,
      community: structuredClone(this.state.community),
      winnerIds: [...this.state.handWinners],
      reason,
      flowerBonus,
      boardResets: this.state.boardResetCount,
      players: this.state.players.map((player) => ({
        playerId: player.id,
        name: player.name,
        folded: player.folded,
        riichi: player.riichi,
        flowerDisqualified: reason === "showdown" && this.hasSingleFlower(player),
        cards: structuredClone(player.privateCards),
        score: player.score ?? scoreHand([...player.privateCards, ...this.state.community]),
        committed: player.handCommitted,
        payout: payouts[player.id] ?? 0,
      })),
    })
  }

  private hasSingleFlower(player: PlayerState): boolean {
    return player.privateCards.filter((card) => card.kind === "flower").length === 1
  }

  private recordBettingAction(playerId: string, action: BettingAction): void {
    this.state.bettingHistory.push({
      playerId,
      street: this.state.street,
      type: action.type,
      ...((action.type === "bet" || action.type === "raise") && { amount: action.amount }),
    })
    this.emit("betting-action", { action }, playerId)
  }

  private payFlowerFoldBonus(winner: PlayerState): HandResult["flowerBonus"] {
    let total = 0

    for (const opponent of this.state.players) {
      if (opponent.id === winner.id) {
        continue
      }

      opponent.chips -= FLOWER_FOLD_BONUS
      winner.chips += FLOWER_FOLD_BONUS
      total += FLOWER_FOLD_BONUS
    }

    const bonus = {
      winnerId: winner.id,
      perOpponent: FLOWER_FOLD_BONUS,
      total,
    }
    this.emit("flower-fold-bonus", bonus, winner.id)

    return bonus
  }

  private resolveRiichiWin(winner: PlayerState, contenders: PlayerState[]): void {
    this.state.centerBlueSticks += winner.blueSticks
    winner.blueSticks = 0
    const winnerIndex = this.state.players.findIndex((player) => player.id === winner.id)
    for (const opponent of this.orderedAfter(winnerIndex)) {
      if (
        opponent.id === winner.id ||
        !contenders.includes(opponent) ||
        this.state.centerBlueSticks === 0
      )
        continue
      opponent.blueSticks += 1
      this.state.centerBlueSticks -= 1
    }
  }

  private returnBlueStick(player: PlayerState): void {
    if (player.blueSticks > 0) {
      player.blueSticks -= 1
      this.state.centerBlueSticks += 1
    }
  }

  private gainBlueStick(player: PlayerState): void {
    if (this.state.centerBlueSticks > 0) {
      this.state.centerBlueSticks -= 1
      player.blueSticks += 1
      return
    }
    const playerIndex = this.state.players.findIndex((candidate) => candidate.id === player.id)
    const donor = this.orderedAfter(playerIndex).find(
      (candidate) => candidate.id !== player.id && candidate.blueSticks > 0,
    )
    if (donor) {
      donor.blueSticks -= 1
      player.blueSticks += 1
    }
  }

  private payToPot(player: PlayerState, amount: number, round = false): void {
    if (!Number.isInteger(amount) || amount < 0)
      throw new RangeError("Chip payment must be a non-negative integer")
    if (player.chips < amount)
      throw new Error(`${player.name} needs a Loan before paying ${amount}`)
    player.chips -= amount
    player.handCommitted += amount
    if (round) player.roundCommitted += amount
    this.state.pot += amount
  }

  private payOpeningCharge(player: PlayerState, amount: number): void {
    if (player.chips < amount && player.loans < MAX_LOANS) {
      throw new Error(`${player.name} needs a Loan before paying ${amount}`)
    }

    player.chips -= amount
    player.handCommitted += amount
    this.state.pot += amount
  }

  private canDeclareRiichi(player: PlayerState): boolean {
    return (
      !player.riichi && this.state.street < 4 && player.privateCards.length === PRIVATE_CARD_COUNT
    )
  }

  private activePlayers(): PlayerState[] {
    return this.state.players.filter((player) => !player.folded)
  }

  private orderedActiveAfter(index: number): PlayerState[] {
    return this.orderedAfter(index).filter((player) => !player.folded)
  }

  private orderedAfter(index: number): PlayerState[] {
    return Array.from({ length: this.state.players.length }, (_, offset) =>
      this.playerAt(index + offset + 1),
    )
  }

  private playerAt(index: number): PlayerState {
    return this.state.players[
      ((index % this.state.players.length) + this.state.players.length) % this.state.players.length
    ]!
  }

  private getPlayer(playerId: string): PlayerState {
    const player = this.state.players.find((candidate) => candidate.id === playerId)

    if (!player) {
      throw new Error(`Unknown player ${playerId}`)
    }

    return player
  }

  private drawDeck(): Card {
    const card = this.state.deck.pop()

    if (!card) {
      throw new Error("The deck is empty")
    }

    return card
  }

  private emit<T>(type: string, payload: T, actorId?: string): void {
    this.state.rngState = this.random.state
    this.state.version += 1
    this.events.push({
      sequence: this.events.length + 1,
      gameId: this.state.id,
      handNumber: this.state.handNumber,
      type,
      actorId,
      payload,
      stateVersion: this.state.version,
      createdAt: new Date(this.events.length).toISOString(),
    })
  }

  private assertPhase(phase: GameState["phase"]): void {
    if (this.state.phase !== phase) {
      throw new Error(`Expected ${phase}, got ${this.state.phase}`)
    }
  }
}
