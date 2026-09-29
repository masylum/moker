import { SeededRandom } from "../../src/game/random"
import { compareHandStrengths } from "../../src/game/scoring"
import { STREET_REVEAL_COUNTS } from "../../src/game/rules"
import type { BettingAction, Card, DiscardPile } from "../../src/game/types"
import { identities, isBlank, isTreasure, isWild, lotusCount } from "./cards"
import { LegacyEngine, type FishPlan } from "./engine"
import { evaluateLegacy } from "./scoring"

interface OpponentView {
  seat: number
  id: string
  publicCards: Card[]
  hiddenCount: number
  known: Card[]
  riichi: boolean
}
interface DeckView {
  seat: number
  count: number
  known: Card[]
  top: Card[]
}
export interface BotView {
  seat: number
  id: string
  hand: Card[]
  publicCards: Card[]
  opponents: OpponentView[]
  lanes: Card[][]
  left: number
  right: number
  decks: DeckView[]
  drawSeat: number
  unknown: Card[]
  ante: number
  pot: number
  street: number
  treasures: boolean
}
interface World {
  hands: Map<number, Card[]>
  tops: Map<number, Card[]>
}
interface PlanValue {
  plan: FishPlan
  utility: number
  equity: number
}
export interface TreasureOpportunity {
  street: number
  actor: number
  chosen: string
  options: PlanValue[]
}

/** The policy sees only public state and this observer's legitimately known cards. */
export function botView(engine: LegacyEngine, seat: number): BotView {
  const state = engine.state,
    player = state.players[seat]
  const byId = new Map(engine.allCards.map((card) => [card.id, card]))
  const opponents = state.players.flatMap((p, i) =>
    i === seat || p.folded || p.eliminated
      ? []
      : [
          {
            seat: i,
            id: p.id,
            publicCards: [...p.publicCards],
            hiddenCount: p.privateCards.length,
            known: [...(engine.knownHands[seat].get(p.id) ?? [])].map((id) => byId.get(id)!),
            riichi: p.riichi,
          },
        ],
  )
  const decks = engine.decks.map((deck, owner) => ({
    seat: owner,
    count: deck.length,
    known: owner === seat ? [...engine.knownDecks[seat]].map((id) => byId.get(id)!) : [],
    top: engine.knownTop[seat][owner].map((id) => byId.get(id)!),
  }))
  const visible = new Set(
    [
      ...player.privateCards,
      ...state.players.flatMap((p) => p.publicCards),
      ...engine.lanes.flat(),
      ...opponents.flatMap((p) => p.known),
      ...decks.flatMap((d) => [...d.known, ...d.top]),
    ].map((c) => c.id),
  )
  return {
    seat,
    id: player.id,
    hand: [...player.privateCards],
    publicCards: [...player.publicCards],
    opponents,
    lanes: engine.lanes.map((lane) => [...lane]),
    left: engine.neighbor(seat, "a"),
    right: engine.neighbor(seat, "b"),
    decks,
    drawSeat: engine.drawSeat(seat),
    unknown: engine.allCards.filter((c) => !visible.has(c.id)),
    ante: state.orbitValue,
    pot: state.pot,
    street: state.street,
    treasures: engine.options.treasures !== false,
  }
}

function sampleWorlds(view: BotView, samples: number, random: SeededRandom): World[] {
  return Array.from({ length: samples }, () => {
    const unknown = random.shuffle(view.unknown)
    const hands = new Map<number, Card[]>(),
      tops = new Map<number, Card[]>()
    for (const opponent of view.opponents) {
      const missing = Math.max(0, opponent.hiddenCount - opponent.known.length)
      hands.set(opponent.seat, [...opponent.known, ...unknown.splice(0, missing)])
    }
    for (const deck of view.decks) {
      const top = [...deck.top]
      const known = deck.known.filter((c) => !top.some((t) => t.id === c.id))
      while (top.length < Math.min(3, deck.count)) {
        const fromKnown =
          known.length > 0 && random.next() < known.length / (deck.count - top.length)
        const card = fromKnown ? known.splice(random.integer(known.length), 1)[0] : unknown.pop()
        if (!card) throw new Error("Insufficient belief cards for sampled deck")
        top.push(card)
      }
      tops.set(deck.seat, top)
    }
    return { hands, tops }
  })
}

/** Small tie-breaking development term, not a learned policy or solved game. */
function shape(cards: readonly Card[]): number {
  const counts = Array<number>(34).fill(0)
  for (const card of cards) for (const identity of identities(card, false)) counts[identity]++
  let value = 0
  for (let i = 0; i < 34; i++) {
    value += Math.max(0, counts[i] - 1) * 0.3
    if (i < 27 && i % 9 < 8) value += Math.min(counts[i], counts[i + 1]) * 0.1
  }
  value += cards.filter((c) => isWild(c) || c.kind === "joker").length * 0.12
  return value
}

function handUtility(cards: readonly Card[], treasures: boolean): number {
  const lotus = lotusCount(cards)
  return (
    (lotus === 1 ? 0 : evaluateLegacy(cards).total) +
    shape(cards) +
    cards.filter(isBlank).length * 0.35 +
    (treasures ? cards.filter(isTreasure).length * 0.75 : 0)
  )
}

function keepAfterDraw(view: BotView, drawn: Card): Card[] {
  const hand = [...view.hand, drawn]
  let best = hand.slice(0, -1),
    value = -Infinity
  for (let index = 0; index < hand.length; index++) {
    const kept = hand.filter((_, i) => i !== index)
    const current = handUtility([...kept, ...view.publicCards], view.treasures)
    if (current > value) {
      best = kept
      value = current
    }
  }
  return best
}

function equity(view: BotView, own: Card[], world: World): number {
  const hands = [
    { seat: view.seat, cards: [...own, ...view.publicCards] },
    ...view.opponents.map((opponent) => ({
      seat: opponent.seat,
      cards: [...opponent.publicCards, ...world.hands.get(opponent.seat)!],
    })),
  ]
  const eligible = hands.filter((h) => lotusCount(h.cards) !== 1)
  if (!eligible.length) return 1 / hands.length
  const mine = eligible.find((h) => h.seat === view.seat)
  if (!mine) return 0
  const score = evaluateLegacy(mine.cards)
  let tied = 1
  for (const hand of eligible) {
    if (hand.seat === view.seat) continue
    const compared = compareHandStrengths(evaluateLegacy(hand.cards), score)
    if (compared > 0) return 0
    if (compared === 0) tied++
  }
  return 1 / tied
}

/** Called only after the action is committed and those offers are visible. */
function selectTreasure(
  offered: readonly Card[],
  kept: readonly Card[],
  treasures: boolean,
): string {
  let best = offered[0]!,
    value = -Infinity
  for (const card of offered) {
    const candidate = handUtility([...kept, card], treasures)
    if (candidate > value) {
      value = candidate
      best = card
    }
  }
  return best.id
}

function valuePlan(
  view: BotView,
  plan: FishPlan | undefined,
  worlds: World[],
  pot: number,
): PlanValue {
  let equitySum = 0,
    development = 0
  for (const world of worlds) {
    let hand = view.hand
    if (plan?.kind === "draw") {
      const card =
        plan.source === "deck"
          ? world.tops.get(view.drawSeat)![0]
          : view.lanes[plan.source === "discard-a" ? view.left : view.right].at(-1)!
      hand = keepAfterDraw(view, card)
    } else if (plan?.kind === "blank") {
      const card = view.lanes[plan.lane][plan.index]
      hand = view.hand.map((c) => (c.id === plan.cardId ? card : c))
    } else if (plan?.kind === "treasure") {
      const offers = world.tops.get(plan.target)!
      const kept = view.hand.filter((c) => c.id !== plan.cardId)
      const chosen = selectTreasure(offers, [...kept, ...view.publicCards], view.treasures)
      hand = [...kept, offers.find((c) => c.id === chosen)!]
    }
    equitySum += equity(view, hand, world)
    development += shape([...hand, ...view.publicCards]) * view.ante * 0.15 * (4 - view.street)
  }
  const eq = equitySum / worlds.length
  return {
    plan: plan ?? { kind: "draw", source: "deck" },
    equity: eq,
    utility: eq * pot + development / worlds.length,
  }
}

function chooseFishing(view: BotView, samples: number, seed: string, pot = view.pot) {
  const worlds = sampleWorlds(view, samples, new SeededRandom(seed))
  const plans: FishPlan[] = []
  if (view.drawSeat >= 0) plans.push({ kind: "draw", source: "deck" })
  if (view.lanes[view.left].length) plans.push({ kind: "draw", source: "discard-a" })
  if (view.right !== view.left && view.lanes[view.right].length)
    plans.push({ kind: "draw", source: "discard-b" })
  const blank = view.hand.find(isBlank),
    treasure = view.hand.find(isTreasure)
  if (blank)
    view.lanes.forEach((lane, laneIndex) =>
      lane.forEach((_, index) =>
        plans.push({ kind: "blank", cardId: blank.id, lane: laneIndex, index }),
      ),
    )
  if (treasure && view.treasures)
    for (const deck of view.decks)
      if (deck.count)
        plans.push({ kind: "treasure", cardId: treasure.id, target: deck.seat, discardPile: "a" })
  if (!plans.length) {
    const current = valuePlan(view, undefined, worlds, pot)
    return { selected: current, current, options: [], available: false }
  }
  const options = plans
    .map((plan) => valuePlan(view, plan, worlds, pot))
    .sort((a, b) => b.utility - a.utility)
  const selected = options[0]
  const current = valuePlan(view, undefined, worlds, pot)
  return { selected, current, options, available: true }
}

function choosePass(view: BotView): string[] {
  let best: string[] = [],
    bestValue = -Infinity
  for (let i = 0; i < view.hand.length; i++)
    for (let j = i + 1; j < view.hand.length; j++) {
      const kept = view.hand.filter((_, k) => k !== i && k !== j)
      const value = handUtility(kept, view.treasures)
      if (value > bestValue) {
        bestValue = value
        best = [view.hand[i].id, view.hand[j].id]
      }
    }
  return best
}

function chooseReveal(view: BotView, count: number): string[] {
  const all = [...view.hand, ...view.publicCards]
  const selected = new Set(evaluateLegacy(all).selectedCardIds)
  return [...view.hand]
    .sort((a, b) => {
      const value = (card: Card) =>
        (selected.has(card.id) ? 100 : 0) +
        (isTreasure(card) ? -12 : 0) -
        (isBlank(card) ? 20 : 0) -
        (card.kind === "flower" && lotusCount(all) === 1 ? 80 : 0)
      return value(b) - value(a)
    })
    .slice(0, count)
    .map((c) => c.id)
}

function chooseDiscard(view: BotView): { discardCardId: string; discardPile: DiscardPile } {
  let best = view.hand[0],
    bestValue = -Infinity
  for (const card of view.hand) {
    const kept = [...view.hand.filter((c) => c.id !== card.id), ...view.publicCards]
    const value = handUtility(kept, view.treasures)
    if (value > bestValue) {
      best = card
      bestValue = value
    }
  }
  const helping = (seat: number) => {
    const opponent = view.opponents.find((o) => o.seat === seat)
    if (!opponent) return -1
    return (
      handUtility([...opponent.publicCards, best], view.treasures) -
      handUtility(opponent.publicCards, view.treasures)
    )
  }
  return {
    discardCardId: best.id,
    discardPile: helping(view.left) <= helping(view.right) ? "a" : "b",
  }
}

export function stepLegacy(
  engine: LegacyEngine,
  samples: number,
  opportunities: TreasureOpportunity[],
): void {
  const state = engine.state
  if (state.phase === "between-hands") {
    engine.startNextHand()
    engine.assertCards()
    return
  }
  const id = state.actingPlayerId
  if (!id) throw new Error(`No actor in ${state.phase}`)
  const seat = engine.seat(id),
    player = state.players[seat],
    view = botView(engine, seat)
  if (state.phase === "charleston") {
    if (player.chips < 100 && player.loans === 0) engine.takeLoan(id)
    engine.passCharleston(id, choosePass(view))
    return
  }
  if (state.phase === "exposing") {
    engine.exposeCards(id, chooseReveal(view, STREET_REVEAL_COUNTS[state.street - 1] ?? 0))
    return
  }
  if (state.phase === "discarding") {
    engine.discard(id, chooseDiscard(view))
    return
  }
  if (state.phase !== "betting") throw new Error(`Unexpected ${state.phase}`)
  const legal = engine.legalActions(id)
  const call = legal.find((a) => a.type === "call" || a.type === "check")!
  const cost = call.callAmount ?? 0
  const plan = chooseFishing(
    view,
    samples,
    `${state.config.seed}:policy:${state.handNumber}:${state.version}:${seat}`,
    state.pot + cost,
  )
  const callValue = (player.riichi ? plan.current : plan.selected).utility - cost
  let action: BettingAction = { type: call.type as "call" | "check" }
  if (!engine.options.checkdown && cost > 0 && callValue < 0) action = { type: "fold" }
  const bet = legal.find((a) => a.type === "bet")
  const raises = state.bettingHistory.filter(
    (r) => r.street === state.street && r.type === "bet",
  ).length
  const showdownEquity = plan.current.equity
  const random = new SeededRandom(
    `${state.config.seed}:bet:${state.handNumber}:${state.version}:${seat}`,
  )
  if (
    !engine.options.checkdown &&
    bet &&
    raises < 2 &&
    (showdownEquity > (raises ? 0.65 : 0.5) || (showdownEquity > 0.05 && random.next() < 0.035))
  ) {
    const desired = Math.floor((state.currentWager + Math.max(5, state.pot * 0.45)) / 5) * 5
    const maximum = Math.min(
      bet.maximum!,
      player.roundCommitted + Math.floor((player.chips * 0.4) / 5) * 5,
    )
    const amount = Math.max(bet.minimum!, Math.min(desired, maximum))
    if (amount <= bet.maximum! && amount <= maximum)
      action = {
        type: "bet",
        amount,
        riichi: Boolean(
          bet.canRiichi &&
          showdownEquity > 0.8 &&
          plan.selected.utility - plan.current.utility < view.ante,
        ),
      }
  }
  const plans: FishPlan[] = []
  if (action.type !== "fold" && !player.riichi && !(action.type === "bet" && action.riichi)) {
    if (action.type !== "bet") {
      plans.push(plan.selected.plan)
      if (
        call.canUseRiichiStick &&
        view.decks.reduce((sum, d) => sum + d.count, 0) >= 2 &&
        plan.selected.utility > plan.current.utility + view.ante * 0.3
      ) {
        action.useRiichiStick = true
        plans.push({ kind: "draw", source: "deck" })
      }
    } else if (
      bet?.canUseRiichiStick &&
      plan.selected.utility > plan.current.utility + view.ante * 0.3
    ) {
      action.useRiichiStick = true
      plans.push(plan.selected.plan)
    }
  }
  if (plans.length && plan.options.some((o) => o.plan.kind === "treasure")) {
    opportunities.push({
      street: view.street,
      actor: seat,
      chosen: plan.selected.plan.kind,
      options: plan.options.slice(0, 3),
    })
  }
  engine.actWithFish(id, action, plans, (offered, kept) =>
    selectTreasure(offered, kept, view.treasures),
  )
  engine.assertCards()
}
