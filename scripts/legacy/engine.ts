import { GameEngine } from "../../src/game/engine"
import type {
  BettingAction,
  BlankExchange,
  Card,
  CardSource,
  DiscardPile,
  DrawContext,
  GameEvent,
  GameState,
  PlayerState,
} from "../../src/game/types"
import { legacyDeck, isBlank, isTreasure } from "./cards"
import { evaluateLegacy } from "./scoring"

export interface LegacyOptions {
  seed: string
  players: number
  orbits: number
  games?: 1 | 2 | 3 | 4
  checkdown?: boolean
  /** A matched-deck control: bots cannot use the Treasure ability. */
  treasures?: boolean
}
export type FishPlan =
  | { kind: "draw"; source: CardSource }
  | { kind: "blank"; cardId: string; lane: number; index: number }
  | { kind: "treasure"; cardId: string; target: number; discardPile: DiscardPile }
export type TreasureSelector = (offered: readonly Card[], keptHand: readonly Card[]) => string
interface SearchAudit {
  hand: number
  street: number
  actor: number
  target: number
  offered: string[]
  chosen: string
  discarded: string
  destination: number
  before: string[]
  after: string[]
}
export class DeckExhausted extends Error {}

/** Headless only. Production UI/API cannot select or restore this adapter. */
export class LegacyEngine extends GameEngine {
  readonly options: LegacyOptions
  readonly decks: Card[][]
  readonly lanes: Card[][]
  readonly reserve: Card[]
  readonly allCards = legacyDeck()
  readonly knownDecks: Set<string>[]
  /** observer -> deck owner -> remembered top cards, top first. */
  readonly knownTop: string[][][]
  readonly knownHands: Map<string, Set<string>>[]
  readonly searches: SearchAudit[] = []
  readonly fallbacks: { hand: number; actor: number; owner: number; reason: "deal" | "fish" }[] = []
  readonly deckSizes: number[][] = []
  readonly drawCounts = { deck: 0, lane: 0, blank: 0, treasure: 0 }
  private plans: FishPlan[] = []
  private selector: TreasureSelector = (offered) => offered[0]!.id
  private allocated = false

  private constructor(state: GameState, events: GameEvent[], options: LegacyOptions) {
    super(state, events)
    this.options = options
    const shuffled = this.random.shuffle(this.allCards)
    this.reserve = shuffled.splice(0, shuffled.length % options.players)
    const count = shuffled.length / options.players
    this.decks = Array.from({ length: options.players }, (_, i) =>
      shuffled.slice(i * count, (i + 1) * count),
    )
    this.lanes = Array.from({ length: options.players }, () => [])
    this.knownDecks = Array.from({ length: options.players }, () => new Set<string>())
    this.knownTop = Array.from({ length: options.players }, () =>
      Array.from({ length: options.players }, () => []),
    )
    this.knownHands = Array.from({ length: options.players }, () => new Map<string, Set<string>>())
  }

  static createLegacy(options: LegacyOptions): LegacyEngine {
    return GameEngine.create(
      Array.from({ length: options.players }, (_, i) => ({
        name: i === 0 ? "legacy" : `Bot ${i + 1}`,
        controller: "heuristic" as const,
      })),
      {
        seed: options.seed,
        mode: "riichi",
        orbits: options.orbits,
        tournamentGames: options.games ?? 1,
      },
      (state, events) => new LegacyEngine(state, events, options),
    ) as LegacyEngine
  }

  seat(playerId: string): number {
    const index = this.state.players.findIndex((p) => p.id === playerId)
    if (index < 0) throw new Error("Unknown Legacy player")
    return index
  }

  neighbor(seat: number, direction: DiscardPile): number {
    return (seat + (direction === "a" ? 1 : this.decks.length - 1)) % this.decks.length
  }

  /** Counts are public. Include folded/eliminated seats' remaining decks. */
  drawSeat(seat: number): number {
    for (let offset = 0; offset < this.decks.length; offset++) {
      const owner = (seat + offset) % this.decks.length
      if (this.decks[owner].length) return owner
    }
    return -1
  }

  override passCharleston(playerId: string, cardIds: string[]): void {
    const before = this.state.charlestonHistory.length
    super.passCharleston(playerId, cardIds)
    for (const pass of this.state.charlestonHistory.slice(before))
      this.remember(pass.fromPlayerId, pass.toPlayerId, pass.cards)
  }

  private remember(observer: string, owner: string, cards: readonly Card[]): void {
    const map = this.knownHands[this.seat(observer)]
    const ids = map.get(owner) ?? new Set<string>()
    for (const card of cards) ids.add(card.id)
    map.set(owner, ids)
  }

  private forget(cardId: string): void {
    for (const observer of this.knownHands) for (const ids of observer.values()) ids.delete(cardId)
  }

  actWithFish(
    playerId: string,
    action: BettingAction,
    plans: FishPlan[],
    selector: TreasureSelector = (offered) => offered[0]!.id,
  ): void {
    const extras = structuredClone({
      decks: this.decks,
      lanes: this.lanes,
      knownDecks: this.knownDecks,
      knownTop: this.knownTop,
      knownHands: this.knownHands,
      draws: this.drawCounts,
      searches: this.searches,
      fallbacks: this.fallbacks,
    })
    this.plans = [...plans]
    this.selector = selector
    const converted = { ...action }
    if (converted.type !== "fold")
      plans.forEach((plan, index) => {
        const source = plan.kind === "draw" ? plan.source : "deck"
        const exchange =
          plan.kind === "draw"
            ? undefined
            : { blankCardId: plan.cardId, pile: "a" as const, cardIndex: 0 }
        if (index === 0) {
          converted.drawSource = source
          converted.blankExchange = exchange
        } else if (converted.type !== "bet") {
          converted.riichiDrawSource = source
          converted.riichiBlankExchange = exchange
        }
      })
    try {
      super.act(playerId, converted)
    } catch (error) {
      this.decks.splice(0, this.decks.length, ...extras.decks)
      this.lanes.splice(0, this.lanes.length, ...extras.lanes)
      this.knownDecks.splice(0, this.knownDecks.length, ...extras.knownDecks)
      this.knownTop.splice(0, this.knownTop.length, ...extras.knownTop)
      this.knownHands.splice(0, this.knownHands.length, ...extras.knownHands)
      Object.assign(this.drawCounts, extras.draws)
      this.searches.splice(0, this.searches.length, ...extras.searches)
      this.fallbacks.splice(0, this.fallbacks.length, ...extras.fallbacks)
      throw error
    } finally {
      if (
        this.state.phase !== "discarding" ||
        this.state.drawContext?.actingPlayerId !== playerId
      ) {
        this.plans = []
        this.selector = (offered) => offered[0]!.id
      }
    }
  }

  override discard(
    playerId: string,
    decision: { discardCardId: string; discardPile: DiscardPile },
  ): void {
    const pending = this.state.pendingDiscard
    if (!pending || pending.playerId !== playerId) throw new Error("No pending discard")
    const player = this.state.players[this.seat(playerId)]
    const drawn = player.privateCards.find((c) => c.id === pending.drawnCardId)!
    if (
      !player.privateCards.some((c) => c.id === decision.discardCardId) ||
      !["a", "b"].includes(decision.discardPile)
    )
      throw new Error("Invalid Legacy discard")
    this.forget(decision.discardCardId)
    if (pending.source !== "deck" && drawn.id !== decision.discardCardId)
      for (const observer of this.state.players) this.remember(observer.id, playerId, [drawn])
    super.discard(playerId, decision)
    if (this.state.phase !== "discarding") {
      this.plans = []
      this.selector = (offered) => offered[0]!.id
    }
    this.assertCards()
  }

  override exposeCards(playerId: string, cardIds: string[]): void {
    super.exposeCards(playerId, cardIds)
    if (this.state.phase !== "exposing")
      for (const player of this.state.players)
        for (const card of player.publicCards) this.forget(card.id)
  }

  protected override prepareRound(): void {
    if (!this.allocated) {
      this.allocated = true
      this.deckSizes.push(this.decks.map((d) => d.length))
      return
    }
    for (const [i, player] of this.state.players.entries()) {
      const cards = [
        ...(this.state.foldedPrivateCards[player.id] ?? player.privateCards),
        ...player.publicCards,
        ...this.lanes[i],
      ]
      for (const card of cards) this.knownDecks[i].add(card.id)
      this.decks[i] = this.random.shuffle([...this.decks[i], ...cards])
      this.lanes[i] = []
      this.knownHands[i].clear()
      for (const observer of this.knownTop) observer[i] = []
    }
    this.deckSizes.push(this.decks.map((d) => d.length))
  }

  protected override createRoundDeck(): Card[] {
    return []
  }
  protected override seedLanes(): void {}
  protected override requiresEmptyLaneFill(): boolean {
    return false
  }

  protected override dealOpeningCards(players: PlayerState[]): void {
    for (let i = 0; i < 8; i++)
      for (const player of players)
        player.privateCards.push(this.takeDeck(this.seat(player.id), "deal"))
    const seeds = players.map((player) => {
      let best = 0,
        bestValue = -Infinity
      player.privateCards.forEach((_card, index) => {
        const kept = player.privateCards.filter((_, i) => i !== index)
        const value =
          evaluateLegacy(kept).total +
          kept.filter(isBlank).length * 0.35 +
          (this.options.treasures === false ? 0 : kept.filter(isTreasure).length * 0.75) -
          (kept.filter((c) => c.kind === "flower").length === 1 ? 5 : 0)
        if (value > bestValue) {
          bestValue = value
          best = index
        }
      })
      return { player, index: best }
    })
    for (const { player, index } of seeds)
      this.lanes[this.neighbor(this.seat(player.id), "a")].push(
        player.privateCards.splice(index, 1)[0],
      )
    this.assertCards()
  }

  protected override lane(pile: DiscardPile): Card[] {
    if (!this.state.actingPlayerId) throw new Error("Lane access requires an actor")
    return this.lanes[this.neighbor(this.seat(this.state.actingPlayerId), pile)]
  }

  protected override drawPile(player: PlayerState, source: CardSource): Card[] {
    if (source !== "deck")
      return this.lanes[this.neighbor(this.seat(player.id), source === "discard-a" ? "a" : "b")]
    const owner = this.drawSeat(this.seat(player.id))
    return owner < 0 ? [] : this.decks[owner]
  }

  protected override takeCard(player: PlayerState, source: CardSource): Card | undefined {
    // Consume one plan for each executed fishing instruction, including draws.
    if (this.plans[0]?.kind === "draw") this.plans.shift()
    if (source === "deck") {
      this.drawCounts.deck++
      return this.takeDeck(this.seat(player.id), "fish")
    }
    const card = this.drawPile(player, source).pop()
    if (card) this.drawCounts.lane++
    return card
  }

  private takeDeck(actor: number, reason: "deal" | "fish"): Card {
    const owner = this.drawSeat(actor)
    if (owner < 0) throw new DeckExhausted("All personal decks are empty")
    const card = this.decks[owner].pop()!
    if (owner !== actor) this.fallbacks.push({ hand: this.state.handNumber, actor, owner, reason })
    const ownerKnewTop = this.knownTop[owner][owner][0] === card.id
    if (owner === actor || ownerKnewTop) this.knownDecks[owner].delete(card.id)
    else this.knownDecks[owner].clear()
    for (const [observer, tops] of this.knownTop.entries()) {
      if (!tops[owner].length) continue
      if (tops[owner][0] !== card.id) throw new Error("Remembered top-card order is invalid")
      tops[owner].shift()
      this.remember(this.state.players[observer].id, this.state.players[actor].id, [card])
    }
    return card
  }

  protected override exchangeBlank(
    player: PlayerState,
    exchange: BlankExchange,
    reason: DrawContext["reason"],
  ): void {
    if (player.riichi) throw new Error("Riichi locks fishing")
    const plan = this.plans.shift()
    if (!plan || plan.kind === "draw" || plan.cardId !== exchange.blankCardId)
      throw new Error("Missing exchange plan")
    const index = player.privateCards.findIndex((c) => c.id === plan.cardId)
    if (index < 0) throw new Error("Exchange requires a concealed card")
    const card = player.privateCards[index],
      actor = this.seat(player.id)
    if (plan.kind === "blank") {
      if (!isBlank(card)) throw new Error("Not a Blank")
      const lane = this.lanes[plan.lane],
        target = lane?.[plan.index]
      if (!target) throw new Error("No lane card")
      lane[plan.index] = card
      player.privateCards[index] = target
      this.forget(card.id)
      for (const observer of this.state.players) this.remember(observer.id, player.id, [target])
      this.drawCounts.blank++
      this.emit(
        "legacy-blank",
        { actor, lane: plan.lane, index: plan.index, given: card.id, taken: target.id, reason },
        player.id,
      )
    } else {
      const targetDeck = this.decks[plan.target]
      if (!isTreasure(card) || !targetDeck?.length || !["a", "b"].includes(plan.discardPile))
        throw new Error("Invalid Treasure search")
      const before = [...player.privateCards, ...player.publicCards].map((c) => c.id)
      // Commit the Treasure BEFORE exposing the offers to the selector.
      player.privateCards.splice(index, 1)
      const destination = this.neighbor(actor, plan.discardPile)
      this.lanes[destination].push(card)
      this.forget(card.id)
      const offered = targetDeck.slice(-3).reverse()
      const kept = [...player.privateCards, ...player.publicCards]
      const choice = this.selector(structuredClone(offered), structuredClone(kept))
      const selected = offered.find((c) => c.id === choice)
      if (!selected) throw new Error("Treasure choice must be one of the offered cards")
      targetDeck.splice(
        targetDeck.findIndex((c) => c.id === choice),
        1,
      )
      player.privateCards.push(selected)
      // Other viewers know a private selection happened, not which card moved.
      for (const tops of this.knownTop) tops[plan.target] = []
      this.knownTop[actor][plan.target] = offered.filter((c) => c.id !== choice).map((c) => c.id)
      if (actor === plan.target) this.knownDecks[plan.target].delete(choice)
      else this.knownDecks[plan.target].clear()
      this.searches.push({
        hand: this.state.handNumber,
        street: this.state.street,
        actor,
        target: plan.target,
        offered: offered.map((c) => c.id),
        chosen: choice,
        discarded: card.id,
        destination,
        before,
        after: [...player.privateCards, ...player.publicCards].map((c) => c.id),
      })
      this.drawCounts.treasure++
      this.emit(
        "legacy-treasure-search",
        { actor, target: plan.target, discarded: card.id, destination, reason },
        player.id,
      )
    }
    this.assertCards()
  }

  protected override scoreCards(cards: Card[]) {
    return evaluateLegacy(cards)
  }

  assertCards(): void {
    const physical = [
      ...this.reserve,
      ...this.decks.flat(),
      ...this.lanes.flat(),
      ...this.state.players.flatMap((p) => [
        ...(this.state.foldedPrivateCards[p.id] ?? p.privateCards),
        ...p.publicCards,
      ]),
    ]
    if (
      physical.length !== this.allCards.length ||
      new Set(physical.map((c) => c.id)).size !== this.allCards.length
    )
      throw new Error("Legacy physical-card conservation failed")
  }
}
