import { canTakeLoan, hasFreeFishing } from "./rules"
import { createDeck } from "./cards"
import { publicKnownPrivateCards } from "./information"
import { SeededRandom } from "./random"
import {
  CHARLESTON_PASS_COUNT,
  CHIP_UNIT,
  LOAN_PENALTY,
  LOAN_VALUE,
  MAX_LOANS,
  OPENING_PRIVATE_CARD_COUNT,
  RIICHI_WIN_STICKS,
  STARTING_RIICHI_STICKS,
  STREET_COUNT,
  STREET_REVEAL_COUNTS,
  createConfig,
} from "./rules"
import { compareHandScores, scoreHand } from "./scoring"
import type {
  BettingAction,
  BlankExchange,
  Card,
  CardSource,
  DiscardPile,
  DrawContext,
  GameConfig,
  GameEvent,
  GameState,
  HandResult,
  LegalAction,
  PlayerController,
  PlayerState,
  PotResult,
  PublicGameState,
  RiichiSettlement,
} from "./types"

export interface PlayerSetup {
  id?: string
  name: string
  controller: PlayerController
}

type DrawInstruction = DrawContext["remaining"][number]

export class GameEngine {
  readonly events: GameEvent[]
  state: GameState
  private random: SeededRandom

  private constructor(state: GameState, events: GameEvent[]) {
    this.state = state
    this.events = events
    this.random = new SeededRandom(state.config.seed, state.rngState)
  }

  static create(
    players: PlayerSetup[],
    partial: Partial<GameConfig> & Pick<GameConfig, "seed">,
  ): GameEngine {
    if (players.length < 2 || players.length > 6)
      throw new RangeError("Moker requires 2 to 6 players")
    const config = createConfig({ ...partial, playerCount: players.length })
    const random = new SeededRandom(config.seed)
    const state: GameState = {
      rulesVersion: 6,
      id: `game-${config.seed}`,
      config,
      rngState: random.state,
      handNumber: 0,
      maxHands: players.length * config.orbits,
      dealerIndex: random.integer(players.length),
      startingDealerIndex: 0,
      dealerSteps: 0,
      gameNumber: 1,
      gameScores: [],
      orbit: 1,
      orbitValue: 5,
      phase: "between-hands",
      street: 0,
      players: players.map((player, index) => ({
        id: player.id ?? `p${index + 1}`,
        name: player.name,
        controller: player.controller,
        chips: config.startingChips,
        loans: 0,
        riichiSticks: config.mode === "riichi" ? STARTING_RIICHI_STICKS : 0,
        curses: 0,
        eliminated: false,
        privateCards: [],
        publicCards: [],
        folded: false,
        riichi: false,
        roundCommitted: 0,
        handCommitted: 0,
        potCommitted: 0,
      })),
      deck: [],
      discardA: [],
      discardB: [],
      removedCards: [],
      foldedPrivateCards: {},
      openingPrivateCards: {},
      openingChips: {},
      openingLoans: {},
      charlestonSelections: {},
      charlestonHistory: [],
      exposureSelections: {},
      exposureHistory: [],
      streetOpenerId: null,
      lastAggressorId: null,
      openingPot: 0,
      pot: 0,
      currentWager: 0,
      minimumRaise: CHIP_UNIT,
      allInPlayerIds: [],
      currentAllInBettorId: null,
      raiseLockedPlayerIds: [],
      pendingPlayerIds: [],
      actingPlayerId: null,
      pendingDiscard: null,
      drawContext: null,
      drawDiscardHistory: [],
      bettingHistory: [],
      cursePayments: [],
      curseRemovals: [],
      handWinners: [],
      handResults: [],
      finalScores: null,
      version: 0,
    }
    state.startingDealerIndex = state.dealerIndex
    state.rngState = random.state
    const engine = new GameEngine(state, [])
    engine.emit("game-created", { config, players: players.map((player) => player.name) })
    engine.startNextHand()
    return engine
  }

  static restore(state: GameState, events: GameEvent[] = []): GameEngine {
    if (state.rulesVersion !== 6) {
      throw new Error("This saved game uses obsolete rules. Start a new table for Moker rules v6.")
    }
    const restored = structuredClone(state)
    restored.config = createConfig(restored.config)
    return new GameEngine(restored, structuredClone(events))
  }

  startNextHand(): void {
    this.assertPhase("between-hands")
    if (
      this.state.dealerSteps >= this.state.players.length * this.state.config.orbits ||
      this.state.players.filter((p) => !p.eliminated).length <= 1
    ) {
      if (this.state.gameNumber >= this.state.config.tournamentGames) return this.finishGame()
      this.state.gameNumber += 1
      this.state.dealerSteps = 0
      this.state.handNumber = 0
      this.state.dealerIndex = this.random.integer(this.state.players.length)
      this.state.startingDealerIndex = this.state.dealerIndex
      for (const player of this.state.players) {
        player.chips = 100 + this.state.gameNumber * 100
        player.loans = 0
        player.eliminated = false
        player.riichiSticks =
          this.state.config.mode === "riichi" ? player.riichiSticks + STARTING_RIICHI_STICKS : 0
      }
    }

    const nextHand = this.state.handNumber + 1
    const nextOrbit = Math.floor(this.state.dealerSteps / this.state.players.length) + 1
    const ante = this.state.gameNumber * 5
    Object.assign(this.state, {
      handNumber: nextHand,
      orbit: nextOrbit,
      orbitValue: ante,
      street: 0,
      phase: "charleston" as const,
      openingPot: 0,
      pot: 0,
      discardA: [],
      discardB: [],
      removedCards: [],
      foldedPrivateCards: {},
      openingPrivateCards: {},
      openingChips: {},
      openingLoans: {},
      charlestonSelections: {},
      charlestonHistory: [],
      exposureSelections: {},
      exposureHistory: [],
      streetOpenerId: null,
      lastAggressorId: null,
      drawDiscardHistory: [],
      bettingHistory: [],
      cursePayments: [],
      curseRemovals: [],
      handWinners: [],
      pendingDiscard: null,
      drawContext: null,
      stickSpentThisTurn: false,
      currentWager: 0,
      minimumRaise: CHIP_UNIT,
      allInPlayerIds: [],
      currentAllInBettorId: null,
      raiseLockedPlayerIds: [],
      deck: this.random.shuffle(createDeck(this.state.config.mode)),
    })

    for (const player of this.state.players) {
      player.privateCards = []
      player.publicCards = []
      player.folded = false
      player.riichi = false
      player.roundCommitted = 0
      player.handCommitted = 0
      player.potCommitted = 0
      player.score = undefined
      this.state.openingLoans![player.id] = player.loans
      this.state.openingChips[player.id] = player.chips
      if (player.eliminated) {
        player.folded = true
        continue
      }
      if (player.chips < ante) {
        if (this.state.config.mode === "riichi" && player.loans < MAX_LOANS) this.issueLoan(player)
        else {
          player.eliminated = true
          player.folded = true
          continue
        }
      }
      this.payToPot(player, ante, false)
      if (player.chips === 0) this.markAllIn(player, "opening-charge")
    }
    if (this.activePlayers().length <= 1) {
      // Refund antes when elimination ends the game before a round can begin.
      for (const player of this.state.players) {
        player.chips += player.handCommitted
        player.handCommitted = 0
        player.potCommitted = 0
      }
      this.state.pot = 0
      return this.finishCurrentGame()
    }
    this.state.openingPot = this.state.pot

    const dealOrder = this.orderedActiveAfter(this.state.dealerIndex)
    for (let cardIndex = 0; cardIndex < OPENING_PRIVATE_CARD_COUNT; cardIndex += 1) {
      for (const player of dealOrder) player.privateCards.push(this.drawDeck())
    }
    this.state.openingPrivateCards = Object.fromEntries(
      dealOrder.map((player) => [player.id, structuredClone(player.privateCards)]),
    )
    this.state.pendingPlayerIds = dealOrder.map((player) => player.id)
    this.state.actingPlayerId = this.state.pendingPlayerIds[0] ?? null
    this.emit("hand-started", {
      dealerId: this.playerAt(this.state.dealerIndex).id,
      orbit: nextOrbit,
      ante,
      personalAntes: Object.fromEntries(
        this.state.players.map((player) => [player.id, player.handCommitted]),
      ),
    })
    this.state.discardA.push(this.drawDeck())
    this.state.discardB.push(this.drawDeck())
    if (this.state.allInPlayerIds.length > 0) this.resolveShowdown()
    else if (this.state.config.mode === "basic") this.openBettingStreet(1)
  }

  passCharleston(playerId: string, cardIds: string[]): void {
    if (this.state.phase !== "charleston" || !this.state.pendingPlayerIds.includes(playerId)) {
      throw new Error("This player is not choosing a Charleston pass")
    }
    if (cardIds.length !== CHARLESTON_PASS_COUNT || new Set(cardIds).size !== cardIds.length) {
      throw new Error(`Charleston requires exactly ${CHARLESTON_PASS_COUNT} distinct cards`)
    }
    const player = this.getPlayer(playerId)
    if (!cardIds.every((id) => player.privateCards.some((card) => card.id === id))) {
      throw new Error("Every passed card must be in the concealed hand")
    }
    this.state.charlestonSelections[playerId] = [...cardIds]
    this.finishSecretSelection(playerId, "charleston-selected")
    if (this.state.pendingPlayerIds.length > 0) return

    const participants = this.activePlayers()
    const transfers = participants.map((from, index) => {
      const ids = this.state.charlestonSelections[from.id]
      if (!ids || ids.length !== CHARLESTON_PASS_COUNT) throw new Error("Charleston is incomplete")
      const cards = ids.map((id) => from.privateCards.find((card) => card.id === id)!)
      return { from, to: participants[(index + 1) % participants.length]!, cards }
    })
    for (const { from, cards } of transfers) {
      const ids = new Set(cards.map((card) => card.id))
      from.privateCards = from.privateCards.filter((card) => !ids.has(card.id))
    }
    for (const { from, to, cards } of transfers) {
      to.privateCards.push(...cards)
      this.state.charlestonHistory.push({
        fromPlayerId: from.id,
        toPlayerId: to.id,
        cards: structuredClone(cards),
      })
    }
    this.state.charlestonSelections = {}
    this.emit("charleston-completed", { passCount: CHARLESTON_PASS_COUNT })
    this.openBettingStreet(1)
  }

  exposeCards(playerId: string, cardIds: string[]): void {
    if (
      this.state.phase !== "exposing" ||
      this.state.actingPlayerId !== playerId ||
      !this.state.pendingPlayerIds.includes(playerId)
    ) {
      throw new Error("This player is not choosing cards to expose")
    }
    const required = STREET_REVEAL_COUNTS[this.state.street - 1] ?? 0
    if (cardIds.length !== required || new Set(cardIds).size !== cardIds.length) {
      throw new Error(`Street ${this.state.street} requires exactly ${required} distinct reveals`)
    }
    const player = this.getPlayer(playerId)
    if (!cardIds.every((id) => player.privateCards.some((card) => card.id === id))) {
      throw new Error("Every revealed card must be concealed")
    }
    this.state.exposureSelections[playerId] = [...cardIds]
    this.finishSecretSelection(playerId, "exposure-selected")
    if (this.state.pendingPlayerIds.length > 0) return

    const revealed: string[] = []
    for (const active of this.activePlayers()) {
      const selected = new Set(this.state.exposureSelections[active.id] ?? [])
      if (selected.size !== required) throw new Error("Exposure selection is incomplete")
      const cards = active.privateCards.filter((card) => selected.has(card.id))
      active.privateCards = active.privateCards.filter((card) => !selected.has(card.id))
      active.publicCards.push(...cards)
      for (const card of cards) {
        revealed.push(card.id)
        this.state.exposureHistory.push({
          playerId: active.id,
          street: this.state.street,
          card: structuredClone(card),
        })
      }
    }
    this.state.exposureSelections = {}
    this.emit("cards-revealed", { street: this.state.street, cardIds: revealed })
    this.openBettingStreet((this.state.street + 1) as 2 | 3 | 4)
  }

  legalActions(playerId: string): LegalAction[] {
    if (this.state.phase !== "betting" || this.state.actingPlayerId !== playerId) return []
    const player = this.getPlayer(playerId)
    if (player.folded || player.chips === 0) return []
    const toCall = Math.max(0, this.state.currentWager - player.roundCommitted)
    const actions: LegalAction[] = [{ type: "fold" }]
    const allIn = this.state.allInPlayerIds.length > 0
    actions.push({
      type: toCall === 0 ? "check" : "call",
      callAmount: Math.min(toCall, player.chips),
      canUseRiichiStick: this.canSpendStick(playerId),
    })
    const maximum = player.roundCommitted + player.chips
    const minimum = Math.min(
      maximum,
      Math.ceil((this.state.currentWager + CHIP_UNIT) / CHIP_UNIT) * CHIP_UNIT,
    )
    if (!allIn && maximum > this.state.currentWager && maximum >= minimum)
      actions.push({
        type: "bet",
        minimum,
        maximum,
        canRiichi: this.canDeclareRiichi(player),
        canUseRiichiStick: this.canSpendStick(playerId),
      })
    return actions
  }

  act(playerId: string, action: BettingAction, offerStick = false): void {
    const snapshot = structuredClone(this.state)
    const eventCount = this.events.length
    try {
      if (this.state.stickWindow) throw new Error("Finish the Riichi stick decision first")
      if (offerStick && action.type !== "fold" && this.canSpendStick(playerId))
        this.state.stickOfferPlayerId = playerId
      this.applyAction(playerId, action)
    } catch (error) {
      const players = this.state.players
      players.forEach((player, index) => Object.assign(player, snapshot.players[index]))
      delete this.state.stickSpentThisTurn
      delete this.state.stickOfferPlayerId
      delete this.state.stickWindow
      Object.assign(this.state, snapshot, { players })
      this.events.splice(eventCount)
      this.random = new SeededRandom(snapshot.config.seed, snapshot.rngState)
      throw error
    }
  }

  private applyAction(playerId: string, action: BettingAction): void {
    if (this.state.phase !== "betting" || this.state.actingPlayerId !== playerId) {
      throw new Error(`It is not ${playerId}'s betting turn`)
    }
    const player = this.getPlayer(playerId)
    const legal = this.legalActions(playerId).find((entry) => entry.type === action.type)
    if (!legal) throw new Error(`Illegal ${action.type} action`)
    if (action.type !== "fold" && action.useRiichiStick && !legal.canUseRiichiStick) {
      throw new Error("A Riichi stick is not available")
    }
    if (action.type !== "fold" && (action.curseTargetId || action.removeCurse)) {
      throw new Error("Curses are not supported by the current rules")
    }
    if (action.type === "bet" && action.riichi && action.useRiichiStick) {
      throw new Error("Declaring Riichi locks the hand before a stick can be spent")
    }

    const pendingBefore = [...this.state.pendingPlayerIds]
    const potBefore = this.state.pot
    const actorChipsBefore = player.chips
    const cost = this.actionCostBeforePayment(player, action)
    let aggressive = false
    let fullRaise = false

    if (action.type === "call") {
      const toCall = Math.min(this.state.currentWager - player.roundCommitted, player.chips)
      if (toCall > 0) this.payToPot(player, toCall, true, "call")
    } else if (action.type === "bet") {
      const minimum = legal.minimum ?? CHIP_UNIT
      const maximum = legal.maximum ?? player.roundCommitted + player.chips
      if (
        !Number.isFinite(action.amount) ||
        (action.amount !== maximum && action.amount % CHIP_UNIT !== 0) ||
        action.amount < minimum ||
        action.amount > maximum
      ) {
        throw new RangeError(
          `bet must be a multiple of ${CHIP_UNIT} between ${minimum} and ${maximum}`,
        )
      }
      if (action.riichi && !legal.canRiichi) throw new Error("Riichi is not available")
      const raiseSize = action.amount - this.state.currentWager
      fullRaise = this.state.currentWager === 0 || raiseSize >= this.state.minimumRaise
      this.payToPot(player, action.amount - player.roundCommitted, true, "bet")
      this.state.currentWager = action.amount
      this.state.currentAllInBettorId = player.chips === 0 ? player.id : null
      if (fullRaise) this.state.minimumRaise = raiseSize
      if (action.riichi) this.declareRiichi(player)
      aggressive = true
      this.state.lastAggressorId = playerId
    } else if (action.type === "fold") {
      this.fold(player)
    }

    if (player.chips === 0 && action.type !== "fold") {
      this.state.currentAllInBettorId = player.id
      this.state.currentWager = player.roundCommitted
      for (const paid of this.state.players) {
        const refund = Math.max(0, paid.roundCommitted - this.state.currentWager)
        paid.chips += refund
        paid.roundCommitted -= refund
        paid.handCommitted -= refund
        paid.potCommitted -= refund
        this.state.pot -= refund
      }
    }
    this.recordBettingAction(playerId, action, potBefore, actorChipsBefore, cost)
    if (this.activePlayers().length === 1) return this.awardUncontested(this.activePlayers()[0]!)

    const draws = this.drawInstructions(player, action)
    if (draws.length > 0) {
      if (action.type !== "fold" && action.useRiichiStick) {
        this.state.stickSpentThisTurn = true
        player.riichiSticks -= 1
        this.emit("riichi-stick-spent", { remaining: player.riichiSticks }, player.id)
      }
      this.startDrawSequence(player, draws, { aggressive, fullRaise, pendingBefore })
      return
    }
    this.completeTurn(playerId, aggressive, fullRaise, pendingBefore)
  }

  canSpendStick(playerId: string): boolean {
    const player = this.getPlayer(playerId)
    const finishingCall =
      this.state.stickOfferPlayerId === playerId || this.state.stickWindow?.playerId === playerId
    return (
      this.state.config.mode === "riichi" &&
      !this.state.stickSpentThisTurn &&
      !player.riichi &&
      !player.folded &&
      !player.eliminated &&
      player.riichiSticks > 0 &&
      (player.chips > 0 || finishingCall) &&
      (this.state.allInPlayerIds.length === 0 ||
        player.roundCommitted < this.state.currentWager ||
        finishingCall)
    )
  }

  spendRiichiStick(playerId: string, source: CardSource): void {
    if (
      this.state.phase !== "betting" ||
      this.state.actingPlayerId !== playerId ||
      !this.canSpendStick(playerId)
    )
      throw new Error("A Riichi stick is not available now")
    if (this.state.stickWindow && this.state.stickWindow.playerId !== playerId)
      throw new Error("Not your stick decision")
    const pile =
      source === "deck"
        ? this.state.deck
        : source === "discard-a"
          ? this.state.discardA
          : this.state.discardB
    if (!pile.length) throw new Error(`Cannot draw from empty ${source}`)
    const continuation = this.state.stickWindow?.continuation ?? {
      resumeBetting: true,
      aggressive: false,
      fullRaise: false,
      pendingBefore: [...this.state.pendingPlayerIds],
    }
    delete this.state.stickWindow
    const player = this.getPlayer(playerId)
    this.state.stickSpentThisTurn = true
    player.riichiSticks -= 1
    this.emit("riichi-stick-spent", { remaining: player.riichiSticks }, playerId)
    this.startDrawSequence(player, [{ source, reason: "riichi-stick" }], continuation)
  }

  finishStickDecision(playerId: string): void {
    const window = this.state.stickWindow
    if (!window || window.playerId !== playerId || this.state.phase !== "betting")
      throw new Error("No Riichi stick decision for this player")
    delete this.state.stickWindow
    this.completeTurn(
      playerId,
      window.continuation.aggressive,
      window.continuation.fullRaise,
      window.continuation.pendingBefore,
    )
  }

  discard(playerId: string, decision: { discardCardId: string; discardPile: DiscardPile }): void {
    const pending = this.state.pendingDiscard
    const context = this.state.drawContext
    if (
      this.state.phase !== "discarding" ||
      !pending ||
      !context ||
      pending.playerId !== playerId
    ) {
      throw new Error("This player is not choosing a discard")
    }
    const player = this.getPlayer(playerId)
    const index = player.privateCards.findIndex((card) => card.id === decision.discardCardId)
    if (index < 0) throw new Error("Discard card is not in the concealed hand")
    const target = this.lane(decision.discardPile)
    const other = this.lane(decision.discardPile === "a" ? "b" : "a")
    if (other.length === 0 && target.length > 0)
      throw new Error("The empty discard lane must be filled")
    const drawn = player.privateCards.find((card) => card.id === pending.drawnCardId)
    if (!drawn) throw new Error("Drawn card is missing")
    const [discarded] = player.privateCards.splice(index, 1)
    const discardIndex = target.length
    target.push(discarded!)
    this.state.pendingDiscard = null
    this.state.drawDiscardHistory.push({
      playerId,
      source: pending.source,
      drawnCard: structuredClone(drawn),
      discardedCard: structuredClone(discarded!),
      discardPile: decision.discardPile,
      discardIndex,
      reason: context.reason,
    })
    this.emit(
      "draw-discard",
      {
        source: pending.source,
        drawnCardId: drawn.id,
        discardedCardId: discarded!.id,
        pile: decision.discardPile,
        reason: context.reason,
      },
      playerId,
    )
    this.continueDrawSequence(player)
  }

  takeLoan(playerId: string): void {
    const player = this.getPlayer(playerId)
    if (!canTakeLoan(this.state, player))
      throw new Error("A loan is available during Charleston below 100 chips, once per game")
    // Older saved hands did not record their starting loan count.
    this.state.openingLoans ??= Object.fromEntries(
      this.state.players.map((seat) => [
        seat.id,
        seat.loans -
          (!seat.eliminated && (this.state.openingChips[seat.id] ?? 0) < this.state.orbitValue
            ? 1
            : 0),
      ]),
    )
    this.issueLoan(player)
  }
  repayLoan(_playerId: string): void {
    throw new Error("Loan sticks remain until final scoring")
  }

  publicView(viewerId?: string, revealAll = false): PublicGameState {
    const {
      drawDiscardHistory: _drawDiscardHistory,
      removedCards: _removedCards,
      foldedPrivateCards: _foldedPrivateCards,
      drawContext: _drawContext,
      openingPrivateCards: _openingPrivateCards,
      charlestonSelections: _charlestonSelections,
      charlestonHistory: _charlestonHistory,
      exposureSelections: _exposureSelections,
      ...publicState
    } = structuredClone(this.state)
    const knownPrivateCards = publicKnownPrivateCards(this.state, viewerId)
    return {
      ...publicState,
      publicDrawDiscards: _drawDiscardHistory.map(({ drawnCard, ...record }) => ({
        ...record,
        ...(record.source !== "deck" ? { drawnCard } : {}),
      })),
      charlestonReceivedCards: _charlestonHistory
        .filter((pass) => pass.toPlayerId === viewerId)
        .flatMap((pass) => pass.cards),
      handResults: publicState.handResults.map((result) => ({
        ...result,
        players: result.players.map((player) => {
          if (
            revealAll ||
            player.playerId === viewerId ||
            (result.reason === "showdown" && !player.folded && !player.eliminated)
          )
            return player
          const lotuses = result.winnerIds.includes(player.playerId)
            ? player.cards.filter((card) => card.kind === "flower")
            : []
          return {
            ...player,
            openingCards: [],
            acquiredCards: [],
            cards: [
              ...player.publicCards,
              ...lotuses.filter((c) => !player.publicCards.some((p) => p.id === c.id)),
            ],
            score: { total: 0, selectedCardIds: [], combinations: [], tieBreak: [] },
          }
        }),
      })),
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
          (!player.folded &&
            !player.eliminated &&
            ["between-hands", "finished"].includes(this.state.phase) &&
            this.state.handResults.at(-1)?.reason === "showdown")
            ? structuredClone(player.privateCards)
            : { count: player.privateCards.length },
      })),
    }
  }

  private openBettingStreet(street: 1 | 2 | 3 | 4): void {
    this.state.street = street
    if (street === 1 && !this.state.streetOpenerId) {
      this.state.streetOpenerId = this.playerAt(this.state.dealerIndex).id
    }
    this.state.phase = "betting"
    this.state.currentWager = 0
    this.state.currentAllInBettorId = null
    this.state.minimumRaise = CHIP_UNIT
    this.state.raiseLockedPlayerIds = []
    for (const player of this.state.players) player.roundCommitted = 0
    this.state.pendingPlayerIds = this.orderedActiveFromOpener()
      .filter((player) => player.chips > 0)
      .map((player) => player.id)
    this.state.actingPlayerId = this.state.pendingPlayerIds[0] ?? null
    this.emit("street-opened", {
      street,
      publicCounts: Object.fromEntries(
        this.activePlayers().map((player) => [player.id, player.publicCards.length]),
      ),
    })
    if (this.actionablePlayers().length < 2) this.finishBettingStreet()
  }

  private finishBettingStreet(): void {
    this.state.actingPlayerId = null
    this.state.streetOpenerId =
      this.state.lastAggressorId ?? this.playerAt(this.state.dealerIndex).id
    this.state.lastAggressorId = null
    if (this.state.street >= STREET_COUNT || this.state.allInPlayerIds.length > 0)
      return this.resolveShowdown()
    const required = STREET_REVEAL_COUNTS[this.state.street - 1]!
    this.state.phase = "exposing"
    this.state.exposureSelections = {}
    this.state.pendingPlayerIds = this.orderedActiveFromOpener().map((player) => player.id)
    this.state.actingPlayerId = this.state.pendingPlayerIds[0] ?? null
    this.emit("reveal-requested", { street: this.state.street, count: required })
  }

  private finishSecretSelection(playerId: string, event: string): void {
    this.state.pendingPlayerIds = this.state.pendingPlayerIds.filter((id) => id !== playerId)
    this.state.actingPlayerId = this.state.pendingPlayerIds[0] ?? null
    this.emit(event, {}, playerId)
  }

  private drawInstructions(player: PlayerState, action: BettingAction): DrawInstruction[] {
    if (action.type === "fold" || player.riichi) return []
    if (this.state.allInPlayerIds.length > 0 && action.type !== "call") return []
    const instructions: DrawInstruction[] = []
    const free = hasFreeFishing(this.state.config.mode, action.type)
    if (free)
      instructions.push({
        source: action.drawSource ?? "deck",
        blankExchange: action.blankExchange,
        reason: "call",
      })
    if (action.useRiichiStick)
      instructions.push({
        source:
          action.type !== "bet" && free
            ? (action.riichiDrawSource ?? action.drawSource ?? "deck")
            : (action.drawSource ?? "deck"),
        blankExchange:
          action.type !== "bet" && free ? action.riichiBlankExchange : action.blankExchange,
        reason: "riichi-stick",
      })
    return instructions
  }

  private startDrawSequence(
    player: PlayerState,
    instructions: DrawInstruction[],
    continuation: DrawContext["continuation"],
  ): void {
    this.state.drawContext = {
      reason: instructions[0]!.reason,
      actingPlayerId: player.id,
      remaining: [...instructions],
      continuation,
    }
    this.continueDrawSequence(player)
  }

  private continueDrawSequence(player: PlayerState): void {
    const context = this.state.drawContext
    if (!context || context.actingPlayerId !== player.id) throw new Error("Draw context is missing")
    const instruction = context.remaining.shift()
    if (!instruction) {
      const continuation = context.continuation
      this.state.drawContext = null
      this.state.phase = "betting"
      if (continuation.resumeBetting) return
      return this.completeTurn(
        player.id,
        continuation.aggressive,
        continuation.fullRaise,
        continuation.pendingBefore,
      )
    }
    context.reason = instruction.reason
    if (instruction.blankExchange) {
      this.exchangeBlank(player, instruction.blankExchange, instruction.reason)
      return this.continueDrawSequence(player)
    }
    this.beginDraw(player, instruction.source)
  }

  private beginDraw(player: PlayerState, source: CardSource): void {
    if (player.riichi) throw new Error("Riichi locks Draw & Discard")
    const drawn =
      source === "deck"
        ? this.state.deck.pop()
        : source === "discard-a"
          ? this.state.discardA.pop()
          : this.state.discardB.pop()
    if (!drawn) throw new Error(`Cannot draw from empty ${source}`)
    player.privateCards.push(drawn)
    this.state.pendingDiscard = { playerId: player.id, drawnCardId: drawn.id, source }
    this.state.phase = "discarding"
    this.state.actingPlayerId = player.id
    this.emit("card-drawn", { source, cardId: drawn.id }, player.id)
  }

  private exchangeBlank(
    player: PlayerState,
    exchange: BlankExchange,
    reason: DrawContext["reason"],
  ): void {
    if (player.riichi) throw new Error("Riichi locks Blank use")
    const blankIndex = player.privateCards.findIndex((card) => card.id === exchange.blankCardId)
    const blank = player.privateCards[blankIndex]
    if (!blank || blank.kind !== "blank")
      throw new Error("Blank exchange requires a concealed Blank")
    const lane = this.lane(exchange.pile)
    const claimed = lane[exchange.cardIndex]
    if (!claimed) throw new Error("Blank exchange target is not in that discard lane")
    lane[exchange.cardIndex] = blank
    player.privateCards[blankIndex] = claimed
    this.state.drawDiscardHistory.push({
      playerId: player.id,
      source: "blank-exchange",
      drawnCard: structuredClone(claimed),
      discardedCard: structuredClone(blank),
      discardPile: exchange.pile,
      discardIndex: exchange.cardIndex,
      reason,
    })
    this.emit(
      "blank-exchanged",
      { claimedCardId: claimed.id, pile: exchange.pile, reason },
      player.id,
    )
  }

  private completeTurn(
    playerId: string,
    aggressive: boolean,
    fullRaise = false,
    pendingBefore = this.state.pendingPlayerIds,
  ): void {
    if (this.state.stickOfferPlayerId === playerId) {
      const canSpend =
        this.canSpendStick(playerId) && (this.state.allInPlayerIds.length === 0 || !aggressive)
      delete this.state.stickOfferPlayerId
      if (canSpend) {
        this.state.phase = "betting"
        this.state.actingPlayerId = playerId
        this.state.stickWindow = {
          playerId,
          continuation: { aggressive, fullRaise, pendingBefore },
        }
        return
      }
    }
    if (this.state.allInPlayerIds.length > 0) {
      const index = this.state.players.findIndex((p) => p.id === playerId)
      this.state.pendingPlayerIds = this.orderedActiveAfter(index)
        .filter(
          (p) => p.id !== playerId && p.roundCommitted < this.state.currentWager && p.chips > 0,
        )
        .map((p) => p.id)
    } else if (aggressive) this.reopenAfterBet(playerId, fullRaise, pendingBefore)
    else {
      this.state.pendingPlayerIds = this.state.pendingPlayerIds.filter(
        (id) => id !== playerId && !this.getPlayer(id).folded && this.getPlayer(id).chips > 0,
      )
    }
    this.state.stickSpentThisTurn = false
    if (this.state.pendingPlayerIds[0]) this.state.actingPlayerId = this.state.pendingPlayerIds[0]!
    else this.finishBettingStreet()
  }

  private reopenAfterBet(
    playerId: string,
    fullRaise: boolean,
    pendingBefore: readonly string[],
  ): void {
    const actorIndex = this.state.players.findIndex((player) => player.id === playerId)
    if (fullRaise) this.state.raiseLockedPlayerIds = []
    else {
      const hadNotActed = new Set(pendingBefore)
      for (const player of this.actionablePlayers()) {
        if (
          player.id !== playerId &&
          !hadNotActed.has(player.id) &&
          !this.state.raiseLockedPlayerIds.includes(player.id)
        ) {
          this.state.raiseLockedPlayerIds.push(player.id)
        }
      }
    }
    this.state.pendingPlayerIds = this.orderedActiveAfter(actorIndex)
      .filter(
        (player) =>
          player.id !== playerId &&
          player.chips > 0 &&
          player.roundCommitted < this.state.currentWager,
      )
      .map((player) => player.id)
  }

  private declareRiichi(player: PlayerState): void {
    player.riichi = true
    this.emit("riichi-declared", { street: this.state.street }, player.id)
  }

  private fold(player: PlayerState): void {
    const wasRiichi = player.riichi
    player.folded = true
    if (wasRiichi) {
      player.riichi = false
      this.emit("riichi-withdrawn", {}, player.id)
    }
    this.state.foldedPrivateCards[player.id] = structuredClone(player.privateCards)
    this.state.removedCards.push(...player.privateCards)
    player.privateCards = []
  }

  private resolveShowdown(): void {
    this.state.phase = "showdown"
    const contenders = this.activePlayers()
    for (const player of contenders) player.score = this.scoreShowdownHand(player)
    const pot = this.state.pot
    const { payouts, pots } = this.splitPots(contenders)
    const winnerIds = new Set(pots.flatMap((layer) => layer.winnerIds))
    this.state.handWinners = contenders
      .filter((player) => winnerIds.has(player.id))
      .map((player) => player.id)
    const settlement = this.resolveRiichi(this.state.handWinners)
    this.emit("showdown", { winners: this.state.handWinners })
    this.recordHandResult("showdown", pot, payouts, pots, null, settlement)
    this.endHand()
  }

  private awardUncontested(winner: PlayerState): void {
    const pot = this.state.pot
    winner.chips += pot
    this.state.pot = 0
    const lotusBluff = this.hasSingleLotus(winner) ? this.payLotusBluff(winner) : null
    this.state.handWinners = [winner.id]
    const settlement = this.resolveRiichi([winner.id])
    const pots: PotResult[] = [
      {
        amount: pot,
        eligiblePlayerIds: [winner.id],
        winnerIds: [winner.id],
        payouts: { [winner.id]: pot },
      },
    ]
    this.emit("uncontested-win", { winnerId: winner.id, pot, lotusBluff })
    this.recordHandResult("uncontested", pot, { [winner.id]: pot }, pots, lotusBluff, settlement)
    this.endHand()
  }

  private resolveRiichi(winnerIds: readonly string[]): RiichiSettlement {
    const declared = this.state.players.find(
      (player) => player.riichi && !player.folded && !player.eliminated,
    )
    const won = Boolean(declared && winnerIds.length === 1 && winnerIds.includes(declared.id))
    if (declared && won) {
      declared.riichiSticks += RIICHI_WIN_STICKS
      this.emit(
        "riichi-sticks-awarded",
        { amount: RIICHI_WIN_STICKS, total: declared.riichiSticks },
        declared.id,
      )
    }
    return {
      declaredPlayerId: declared?.id ?? null,
      won,
      sticksAwarded: won ? RIICHI_WIN_STICKS : 0,
    }
  }

  private splitPots(contenders: PlayerState[]): {
    payouts: Record<string, number>
    pots: PotResult[]
  } {
    const amount = this.state.pot
    const winners = this.showdownWinners(contenders)
    const payouts = this.awardPot(amount, winners)
    this.state.pot = 0
    return {
      payouts,
      pots: [
        {
          amount,
          eligiblePlayerIds: contenders.map((p) => p.id),
          winnerIds: winners.map((p) => p.id),
          payouts,
        },
      ],
    }
  }

  private showdownWinners(contenders: PlayerState[]): PlayerState[] {
    const eligible = contenders.filter((player) => !this.hasSingleLotus(player))
    if (eligible.length === 0) return contenders
    const pool = eligible.length > 0 ? eligible : contenders
    const best = pool.map((player) => player.score!).sort((a, b) => compareHandScores(b, a))[0]
    return best ? pool.filter((player) => compareHandScores(player.score!, best) === 0) : pool
  }

  private awardPot(amount: number, winners: PlayerState[]): Record<string, number> {
    if (winners.length === 0) throw new Error("A pot must have a winner")
    const share = amount / winners.length
    const payouts = Object.fromEntries(winners.map((winner) => [winner.id, share]))
    for (const winner of winners) winner.chips += share
    return payouts
  }

  private payLotusBluff(winner: PlayerState): HandResult["lotusBluff"] {
    let total = 0
    for (const opponent of this.state.players) {
      if (opponent.id === winner.id || opponent.eliminated) continue
      const paid = Math.min(this.state.orbitValue * 3, opponent.chips)
      opponent.chips -= paid
      winner.chips += paid
      total += paid
    }
    return { winnerId: winner.id, perOpponent: this.state.orbitValue * 3, total }
  }

  private recordHandResult(
    reason: HandResult["reason"],
    pot: number,
    payouts: Record<string, number>,
    pots: PotResult[],
    lotusBluff: HandResult["lotusBluff"],
    riichiSettlement: RiichiSettlement,
  ): void {
    this.state.handResults.push({
      handNumber: this.state.handNumber,
      openingPot: this.state.openingPot,
      pot,
      allInPlayerIds: [...this.state.allInPlayerIds],
      pots,
      winnerIds: [...this.state.handWinners],
      reason,
      lotusBluff,
      riichiSettlement,
      cursePayments: structuredClone(this.state.cursePayments),
      curseRemovals: structuredClone(this.state.curseRemovals),
      orbit: this.state.orbit,
      orbitValue: this.state.orbitValue,
      bettingHistory: structuredClone(this.state.bettingHistory),
      players: this.state.players.map((player) => {
        const concealed = this.state.foldedPrivateCards[player.id] ?? player.privateCards
        const cards = structuredClone([...concealed, ...player.publicCards])
        const charlestonCards = this.state.charlestonHistory
          .filter((record) => record.toPlayerId === player.id)
          .flatMap((record) => record.cards)
        return {
          playerId: player.id,
          name: player.name,
          folded: player.folded,
          eliminated: player.eliminated,
          riichi: player.riichi,
          lotusDisqualified: reason === "showdown" && this.hasSingleLotus(player),
          openingCards: structuredClone(this.state.openingPrivateCards[player.id] ?? []),
          acquiredCards: uniqueCards([
            ...charlestonCards,
            ...this.state.drawDiscardHistory
              .filter((record) => record.playerId === player.id)
              .map((record) => record.drawnCard),
          ]),
          cards,
          publicCards: structuredClone(player.publicCards),
          score: player.score ?? scoreHand(cards, this.state.config.mode),
          chips: player.chips,
          loans: player.loans,
          riichiSticks: player.riichiSticks,
          curses: player.curses,
          netChips:
            player.chips -
            (this.state.openingChips[player.id] ?? player.chips) -
            (this.state.openingLoans?.[player.id] !== undefined
              ? (player.loans - this.state.openingLoans[player.id]!) * LOAN_VALUE
              : this.state.config.mode === "riichi" &&
                  !player.eliminated &&
                  (this.state.openingChips[player.id] ?? 0) < this.state.orbitValue
                ? LOAN_VALUE
                : 0),
          committed: player.handCommitted,
          potCommitted: player.potCommitted,
          payout: payouts[player.id] ?? 0,
          openingChips: this.state.openingChips[player.id] ?? player.chips,
        }
      }),
    })
  }

  private endHand(): void {
    this.state.phase = "between-hands"
    this.state.actingPlayerId = null
    this.state.pendingPlayerIds = []
    do {
      this.state.dealerIndex = (this.state.dealerIndex + 1) % this.state.players.length
      this.state.dealerSteps += 1
    } while (
      this.state.dealerSteps < this.state.players.length * this.state.config.orbits &&
      this.playerAt(this.state.dealerIndex).eliminated
    )
    if (
      this.state.dealerSteps >= this.state.players.length * this.state.config.orbits ||
      this.state.players.filter((p) => !p.eliminated).length <= 1
    )
      this.finishCurrentGame()
  }

  private finishCurrentGame(): void {
    this.state.gameScores.push(
      Object.fromEntries(this.state.players.map((p) => [p.id, p.chips - LOAN_PENALTY * p.loans])),
    )
    this.state.dealerSteps = this.state.players.length * this.state.config.orbits
    this.state.phase = "between-hands"
    this.state.actingPlayerId = null
    this.state.pendingPlayerIds = []
    if (this.state.gameNumber >= this.state.config.tournamentGames) this.finishGame()
  }

  private finishGame(): void {
    if (this.state.phase === "finished") return
    this.state.finalScores = Object.fromEntries(
      this.state.players.map((p) => [
        p.id,
        this.state.gameScores.reduce((sum, scores) => sum + (scores[p.id] ?? 0), 0),
      ]),
    )
    this.state.phase = "finished"
    this.emit("game-finished", { finalScores: this.state.finalScores })
  }

  private canDeclareRiichi(player: PlayerState): boolean {
    return (
      this.state.config.mode === "riichi" &&
      this.state.street <= 3 &&
      !player.riichi &&
      !this.state.players.some((candidate) => candidate.riichi && !candidate.folded)
    )
  }

  private payToPot(
    player: PlayerState,
    amount: number,
    round = false,
    allInReason?: "bet" | "call",
  ): void {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError("Invalid chip payment")
    if (player.chips < amount)
      throw new Error(`${player.name} needs a Loan before paying ${amount}`)
    player.chips -= amount
    player.handCommitted += amount
    player.potCommitted += amount
    if (round) player.roundCommitted += amount
    this.state.pot += amount
    if (round && player.chips === 0) this.markAllIn(player, allInReason)
  }

  private markAllIn(player: PlayerState, reason?: "bet" | "call" | "opening-charge"): void {
    if (this.state.allInPlayerIds.includes(player.id)) return
    this.state.allInPlayerIds.push(player.id)
    this.emit("player-all-in", { committed: player.handCommitted, reason }, player.id)
  }

  private issueLoan(player: PlayerState): void {
    if (player.loans >= MAX_LOANS) throw new Error(`A player may have at most ${MAX_LOANS} Loans`)
    player.loans += 1
    player.chips += LOAN_VALUE
    this.emit("loan-taken", { amount: LOAN_VALUE, loans: player.loans }, player.id)
  }

  private recordBettingAction(
    playerId: string,
    action: BettingAction,
    potBefore: number,
    actorChipsBefore: number,
    cost: number,
  ): void {
    this.state.bettingHistory.push({
      playerId,
      street: this.state.street,
      type: action.type,
      potBefore,
      actorChipsBefore,
      cost,
      ...(action.type === "bet" ? { amount: action.amount } : {}),
      ...(action.type === "bet" && action.riichi ? { riichi: true } : {}),
    })
    this.emit("betting-action", { action }, playerId)
  }

  private actionCostBeforePayment(player: PlayerState, action: BettingAction): number {
    if (action.type === "call") return this.state.currentWager - player.roundCommitted
    if (action.type === "bet") return action.amount - player.roundCommitted
    return 0
  }

  private hasSingleLotus(player: PlayerState): boolean {
    return (
      [...player.privateCards, ...player.publicCards].filter((card) => card.kind === "flower")
        .length === 1
    )
  }

  private scoreShowdownHand(player: PlayerState) {
    const cards = [...player.publicCards, ...player.privateCards]
    return scoreHand(cards, this.state.config.mode)
  }

  private activePlayers(): PlayerState[] {
    return this.state.players.filter((player) => !player.folded && !player.eliminated)
  }

  private actionablePlayers(): PlayerState[] {
    return this.activePlayers().filter((player) => player.chips > 0)
  }

  private orderedActiveAfter(index: number): PlayerState[] {
    return this.orderedAfter(index).filter((player) => !player.folded && !player.eliminated)
  }

  private orderedActiveFromOpener(): PlayerState[] {
    const openerIndex = this.state.players.findIndex(
      (player) => player.id === this.state.streetOpenerId,
    )
    const start = openerIndex >= 0 ? openerIndex : this.state.dealerIndex + 1
    return Array.from({ length: this.state.players.length }, (_, offset) =>
      this.playerAt(start + offset),
    ).filter((player) => !player.folded && !player.eliminated)
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
    if (!player) throw new Error(`Unknown player ${playerId}`)
    return player
  }

  private lane(pile: DiscardPile): Card[] {
    return pile === "a" ? this.state.discardA : this.state.discardB
  }

  private drawDeck(): Card {
    const card = this.state.deck.pop()
    if (!card) throw new Error("The deck is empty")
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
      ...(actorId ? { actorId } : {}),
      payload,
      stateVersion: this.state.version,
      createdAt: new Date(this.events.length).toISOString(),
    })
  }

  private assertPhase(phase: GameState["phase"]): void {
    if (this.state.phase !== phase) throw new Error(`Expected ${phase}, got ${this.state.phase}`)
  }
}

function uniqueCards(cards: readonly Card[]): Card[] {
  return [...new Map(cards.map((card) => [card.id, structuredClone(card)])).values()]
}
