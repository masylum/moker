import { createDeck } from "../game/cards"
import { SeededRandom } from "../game/random"
import {
  CHIP_UNIT,
  LOAN_VALUE,
  MAX_LOANS,
  ORBIT_VALUES,
  maxHandsFor,
  orbitFor,
} from "../game/rules"
import { compareHandScores, scoreHand } from "../game/scoring"
import type { Card, DiscardPile, GameEvent, PlayerController } from "../game/types"
import { STUD7_FINAL_STREET, STUD7_STREET_DEALS, createStud7Config } from "./rules"
import type {
  BettingAction,
  BlankExchange,
  GameConfig,
  LegalAction,
  PublicStudGameState,
  StudCardVisibility,
  StudGameState,
  StudPlayerState,
  StudStreet,
} from "./types"

export interface StudPlayerSetup {
  id?: string
  name: string
  controller: PlayerController
}

export class Stud7Engine {
  readonly events: GameEvent[]
  state: StudGameState
  private random: SeededRandom

  private constructor(state: StudGameState, events: GameEvent[]) {
    this.state = state
    this.events = events
    this.random = new SeededRandom(state.config.seed, state.rngState)
  }

  static create(
    players: StudPlayerSetup[],
    partial: Partial<GameConfig> & Pick<GameConfig, "seed">,
  ): Stud7Engine {
    const config = createStud7Config({ ...partial, playerCount: players.length })
    const random = new SeededRandom(config.seed)
    const state: StudGameState = {
      id: `stud7-${config.seed}`,
      variant: "stud7",
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
        cards: [],
        folded: false,
        riichi: false,
        roundCommitted: 0,
        handCommitted: 0,
      })),
      deck: [],
      discardA: [],
      discardB: [],
      removedCards: [],
      pot: 0,
      centerBlueSticks: config.playerCount,
      currentWager: 0,
      minimumRaise: CHIP_UNIT,
      pendingPlayerIds: [],
      actingPlayerId: null,
      pendingDiscard: null,
      drawDiscardHistory: [],
      handWinners: [],
      handResults: [],
      finalScores: null,
      version: 0,
    }
    const engine = new Stud7Engine(state, [])
    engine.emit("game-created", { config, variant: "stud7", players: players.map((p) => p.name) })
    engine.startNextHand()

    return engine
  }

  static restore(state: StudGameState, events: GameEvent[] = []): Stud7Engine {
    return new Stud7Engine(structuredClone(state), structuredClone(events))
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
    this.state.discardA = []
    this.state.discardB = []
    this.state.removedCards = []
    this.state.drawDiscardHistory = []
    this.state.handWinners = []
    this.state.pendingDiscard = null
    this.state.currentWager = 0
    this.state.minimumRaise = CHIP_UNIT
    this.state.deck = this.random.shuffle(createDeck())

    for (const player of this.state.players) {
      player.cards = []
      player.folded = false
      player.riichi = false
      player.roundCommitted = 0
      player.handCommitted = 0
      player.score = undefined
      player.loansCharged = player.loansCharged.map((charges) => charges + 1)
      this.payToPot(player, this.state.orbitValue * (player.blueSticks + player.loans))
    }

    this.emit("hand-started", {
      dealerId: this.playerAt(this.state.dealerIndex).id,
      orbit: this.state.orbit,
      charge: this.state.orbitValue,
    })
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
            this.emit("betting-action", { action }, playerId)
            this.completeTurn(playerId, false)

            return
          }

          this.beginDraw(player, action.drawSource)
          this.emit("betting-action", { action }, playerId)

          return
        }
        break
      case "call":
        this.payToPot(player, this.state.currentWager - player.roundCommitted, true)

        if (!player.riichi) {
          if (action.blankExchange) {
            this.exchangeBlank(player, action.blankExchange)
            this.emit("betting-action", { action }, playerId)
            this.completeTurn(playerId, false)

            return
          }

          this.beginDraw(player, action.drawSource)
          this.emit("betting-action", { action }, playerId)

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
        this.state.removedCards.push(...player.cards.map(({ card }) => card))
        this.gainBlueStick(player)
        break
    }

    this.emit("betting-action", { action }, playerId)

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
    const ownedIndex = player.cards.findIndex(({ card }) => card.id === decision.discardCardId)
    const discardingDrawn = pending.drawnCard.id === decision.discardCardId

    if (ownedIndex < 0 && !discardingDrawn) {
      throw new Error("Discard card is not in the manufactured hand")
    }

    const target = decision.discardPile === "a" ? this.state.discardA : this.state.discardB
    const other = decision.discardPile === "a" ? this.state.discardB : this.state.discardA

    if (other.length === 0 && target.length > 0) {
      throw new Error("An empty discard pile must be filled first")
    }

    let discarded: Card
    let replacementVisibility: StudCardVisibility | null = null

    if (discardingDrawn) {
      discarded = pending.drawnCard
    } else {
      const owned = player.cards[ownedIndex]!
      discarded = owned.card
      replacementVisibility = pending.source === "deck" ? owned.visibility : "public"
      player.cards.splice(ownedIndex, 1, {
        card: pending.drawnCard,
        visibility: replacementVisibility,
      })
    }

    const discardIndex = target.length
    target.push(discarded)
    this.state.pendingDiscard = null
    this.state.phase = "betting"
    this.state.drawDiscardHistory.push({
      playerId,
      source: pending.source,
      drawnCard: structuredClone(pending.drawnCard),
      discardedCard: structuredClone(discarded),
      discardPile: decision.discardPile,
      discardIndex,
      replacementVisibility,
    })
    this.emit(
      "draw-discard",
      {
        source: pending.source,
        drawnCardId: pending.drawnCard.id,
        discardedCardId: discarded.id,
        pile: decision.discardPile,
        replacementVisibility,
      },
      playerId,
    )
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

  publicView(viewerId?: string, revealAll = false): PublicStudGameState {
    const {
      players: _players,
      deck: _deck,
      drawDiscardHistory: _drawDiscardHistory,
      removedCards: _removedCards,
      ...publicState
    } = structuredClone(this.state)
    const showAllPrivate =
      revealAll ||
      this.state.phase === "showdown" ||
      this.state.phase === "between-hands" ||
      this.state.phase === "finished"

    return {
      ...publicState,
      deck: { count: this.state.deck.length },
      removedCards: { count: this.state.removedCards.length },
      pendingDiscard: this.publicPendingDiscard(viewerId, revealAll),
      players: this.state.players.map((player) => {
        const publicCards = player.cards
          .filter(({ visibility }) => visibility === "public")
          .map(({ card }) => structuredClone(card))
        const privateCards = player.cards
          .filter(({ visibility }) => visibility === "private")
          .map(({ card }) => structuredClone(card))
        const { cards: _cards, ...rest } = structuredClone(player)

        return {
          ...rest,
          publicCards,
          privateCards:
            showAllPrivate || player.id === viewerId
              ? privateCards
              : { count: privateCards.length },
        }
      }),
    }
  }

  private openStreet(street: Exclude<StudStreet, 0>): void {
    this.state.street = street

    for (const visibility of STUD7_STREET_DEALS[street]) {
      for (const player of this.orderedActiveAfter(this.state.dealerIndex)) {
        player.cards.push({ card: this.drawDeck(), visibility })
      }
    }

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
      dealt: STUD7_STREET_DEALS[street],
      cardCounts: Object.fromEntries(active.map((player) => [player.id, player.cards.length])),
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

    if (this.state.street < STUD7_FINAL_STREET) {
      this.openStreet((this.state.street + 1) as Exclude<StudStreet, 0>)
    } else {
      this.resolveShowdown()
    }
  }

  private beginDraw(player: StudPlayerState, source: "deck" | "discard-a" | "discard-b"): void {
    let drawn: Card | undefined

    if (source === "deck") {
      drawn = this.state.deck.pop()
    } else if (source === "discard-a") {
      drawn = this.state.discardA.pop()
    } else {
      drawn = this.state.discardB.pop()
    }

    if (!drawn) {
      throw new Error(`Cannot draw from empty ${source}`)
    }

    this.state.pendingDiscard = { playerId: player.id, drawnCard: drawn, source }
    this.state.phase = "discarding"
    this.state.actingPlayerId = player.id
    this.emit("card-drawn", { source, cardId: drawn.id }, player.id)
  }

  private exchangeBlank(player: StudPlayerState, exchange: BlankExchange): void {
    const blankIndex = player.cards.findIndex(({ card }) => card.id === exchange.blankCardId)
    const blank = player.cards[blankIndex]

    if (!blank || blank.card.kind !== "blank") {
      throw new Error("Blank exchange requires an owned Blank")
    }

    const lane = exchange.pile === "a" ? this.state.discardA : this.state.discardB
    const claimed = lane[exchange.cardIndex]

    if (!claimed) {
      throw new Error("Blank exchange target is not in that discard lane")
    }

    lane[exchange.cardIndex] = blank.card
    player.cards[blankIndex] = { card: claimed, visibility: "public" }
    this.state.drawDiscardHistory.push({
      playerId: player.id,
      source: "blank-exchange",
      drawnCard: structuredClone(claimed),
      discardedCard: structuredClone(blank.card),
      discardPile: exchange.pile,
      discardIndex: exchange.cardIndex,
      replacementVisibility: "public",
    })
    this.emit(
      "blank-exchanged",
      {
        blankCardId: blank.card.id,
        claimedCardId: claimed.id,
        pile: exchange.pile,
        cardIndex: exchange.cardIndex,
        replacementVisibility: "public",
      },
      player.id,
    )
  }

  private resolveShowdown(): void {
    this.state.phase = "showdown"
    const contenders = this.activePlayers()

    for (const player of contenders) {
      player.score = scoreHand(player.cards.map(({ card }) => card))
    }

    const bestScore = contenders
      .map((player) => player.score!)
      .sort((left, right) => compareHandScores(right, left))[0]!
    const winners = contenders.filter((player) => compareHandScores(player.score!, bestScore) === 0)
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
      scores: Object.fromEntries(contenders.map((player) => [player.id, player.score?.total ?? 0])),
    })
    this.recordHandResult("showdown", pot, payouts)
    this.endHand()
  }

  private awardUncontested(winner: StudPlayerState): void {
    const pot = this.state.pot
    winner.chips += pot
    this.state.handWinners = [winner.id]
    this.emit("uncontested-win", { winnerId: winner.id, pot })
    this.state.pot = 0
    this.recordHandResult("uncontested", pot, { [winner.id]: pot })
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
      player.chips -= 15 * (player.blueSticks + player.loans)
    }

    this.state.finalScores = Object.fromEntries(
      this.state.players.map((player) => [player.id, player.chips - LOAN_VALUE * player.loans]),
    )
    this.state.phase = "finished"
    this.emit("game-finished", { finalScores: this.state.finalScores })
  }

  private splitPot(winners: StudPlayerState[]): Record<string, number> {
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
  ): void {
    this.state.handResults.push({
      handNumber: this.state.handNumber,
      pot,
      winnerIds: [...this.state.handWinners],
      reason,
      players: this.state.players.map((player) => ({
        playerId: player.id,
        name: player.name,
        folded: player.folded,
        riichi: player.riichi,
        publicCards: player.cards
          .filter(({ visibility }) => visibility === "public")
          .map(({ card }) => structuredClone(card)),
        privateCards: player.cards
          .filter(({ visibility }) => visibility === "private")
          .map(({ card }) => structuredClone(card)),
        score: player.score ?? scoreHand(player.cards.map(({ card }) => card)),
        committed: player.handCommitted,
        payout: payouts[player.id] ?? 0,
      })),
    })
  }

  private resolveRiichiWin(winner: StudPlayerState, contenders: StudPlayerState[]): void {
    this.state.centerBlueSticks += winner.blueSticks
    winner.blueSticks = 0
    const winnerIndex = this.state.players.findIndex((player) => player.id === winner.id)

    for (const opponent of this.orderedAfter(winnerIndex)) {
      if (
        opponent.id === winner.id ||
        !contenders.includes(opponent) ||
        this.state.centerBlueSticks === 0
      ) {
        continue
      }

      opponent.blueSticks += 1
      this.state.centerBlueSticks -= 1
    }
  }

  private returnBlueStick(player: StudPlayerState): void {
    if (player.blueSticks > 0) {
      player.blueSticks -= 1
      this.state.centerBlueSticks += 1
    }
  }

  private gainBlueStick(player: StudPlayerState): void {
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

  private payToPot(player: StudPlayerState, amount: number, round = false): void {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new RangeError("Chip payment must be a non-negative integer")
    }

    if (player.chips < amount) {
      throw new Error(`${player.name} needs a Loan before paying ${amount}`)
    }

    player.chips -= amount
    player.handCommitted += amount

    if (round) {
      player.roundCommitted += amount
    }

    this.state.pot += amount
  }

  private canDeclareRiichi(player: StudPlayerState): boolean {
    return !player.riichi && this.state.street < STUD7_FINAL_STREET
  }

  private publicPendingDiscard(
    viewerId: string | undefined,
    revealAll: boolean,
  ): PublicStudGameState["pendingDiscard"] {
    const pending = this.state.pendingDiscard

    if (!pending) {
      return null
    }

    if (revealAll || pending.playerId === viewerId || pending.source !== "deck") {
      return structuredClone(pending)
    }

    return { playerId: pending.playerId, source: pending.source, drawnCard: null }
  }

  private activePlayers(): StudPlayerState[] {
    return this.state.players.filter((player) => !player.folded)
  }

  private orderedActiveAfter(index: number): StudPlayerState[] {
    return this.orderedAfter(index).filter((player) => !player.folded)
  }

  private orderedAfter(index: number): StudPlayerState[] {
    return Array.from({ length: this.state.players.length }, (_, offset) =>
      this.playerAt(index + offset + 1),
    )
  }

  private playerAt(index: number): StudPlayerState {
    return this.state.players[
      ((index % this.state.players.length) + this.state.players.length) % this.state.players.length
    ]!
  }

  private getPlayer(playerId: string): StudPlayerState {
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

  private assertPhase(phase: StudGameState["phase"]): void {
    if (this.state.phase !== phase) {
      throw new Error(`Expected ${phase}, got ${this.state.phase}`)
    }
  }
}
