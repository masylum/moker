import type { GameEngine } from "./engine"
import { createDeck } from "./cards"
import { scoreHand, compareHandScores } from "./scoring"
import { SeededRandom } from "./random"
import type {
  BettingAction,
  Card,
  PublicGameState,
  TreasureSearch,
  BlankExchange,
  CardSource,
} from "./types"

/** Optional research policy; omitted by the game client. No hidden state is supplied. */
export interface LegacyBotPolicy {
  adjustValue?: (cards: readonly Card[], immediateValue: number) => number
  concealCombination?: boolean
}

function value(cards: Card[], policy: LegacyBotPolicy): number {
  const lotus = cards.filter((c) => c.kind === "flower").length
  const score = scoreHand(cards, "legacy")
  const immediate =
    (lotus === 1
      ? 0
      : score.total + score.tieBreak.reduce((sum, n, i) => sum + n / 100 ** (i + 1), 0)) +
    cards.filter((c) => c.kind === "blank").length * 0.3 +
    cards.filter((c) => c.kind === "treasure").length * 0.5
  return policy.adjustValue?.(cards, immediate) ?? immediate
}
function discardChoice(hand: Card[], exposed: Card[], policy: LegacyBotPolicy): Card {
  return [...hand].sort(
    (a, b) =>
      value([...hand.filter((c) => c.id !== b.id), ...exposed], policy) -
      value([...hand.filter((c) => c.id !== a.id), ...exposed], policy),
  )[0]!
}
export function legacyPass(hand: Card[], policy: LegacyBotPolicy = {}): string[] {
  let chosen: string[] = [],
    best = -Infinity
  for (let i = 0; i < hand.length; i++)
    for (let j = i + 1; j < hand.length; j++) {
      const score = value(
        hand.filter((_, k) => k !== i && k !== j),
        policy,
      )
      if (score > best) {
        best = score
        chosen = [hand[i]!.id, hand[j]!.id]
      }
    }
  return chosen
}
function treasureChoice(
  hand: Card[],
  exposed: Card[],
  treasureId: string,
  offers: Card[],
  policy: LegacyBotPolicy,
) {
  const kept = hand.filter((c) => c.id !== treasureId)
  let best = {
    cardIds: [offers[0]!.id],
    returnCardId: undefined as string | undefined,
    value: -Infinity,
  }
  for (let i = 0; i < offers.length; i++) {
    const one = value([...kept, ...exposed, offers[i]!], policy)
    if (one > best.value) best = { cardIds: [offers[i]!.id], returnCardId: undefined, value: one }
    for (let j = i + 1; j < offers.length; j++)
      for (const returned of kept) {
        const two = value(
          [...kept.filter((c) => c.id !== returned.id), ...exposed, offers[i]!, offers[j]!],
          policy,
        )
        if (two > best.value)
          best = { cardIds: [offers[i]!.id, offers[j]!.id], returnCardId: returned.id, value: two }
      }
  }
  return best
}

type Fishing = {
  drawSource?: CardSource
  blankExchange?: BlankExchange
  treasureSearch?: TreasureSearch
}
function chooseFish(
  view: PublicGameState,
  id: string,
  policy: LegacyBotPolicy,
): { fish: Fishing; value: number } {
  const player = view.players.find((p) => p.id === id)!,
    hand = Array.isArray(player.privateCards) ? player.privateCards : [],
    legacy = view.legacy!
  const random = new SeededRandom(`${view.config.seed}:legacy-policy:${view.version}:${id}`)
  const known = new Set(
    [
      ...hand,
      ...view.players.flatMap((p) => [...p.publicCards, ...p.knownPrivateCards]),
      ...view.discardA,
      ...view.discardB,
    ].map((c) => c.id),
  )
  const unseen = createDeck("legacy").filter((c) => !known.has(c.id))
  const worlds = Array.from({ length: view.config.heuristicSamples }, () =>
    random.shuffle(unseen).slice(0, 3),
  )
  const afterDraw = (drawn: Card) => {
    const enlarged = [...hand, drawn]
    const discard = discardChoice(enlarged, player.publicCards, policy)
    return value([...enlarged.filter((c) => c.id !== discard.id), ...player.publicCards], policy)
  }
  const options: { fish: Fishing; value: number }[] = []
  if (legacy.personalDrawCount || view.deck.count)
    options.push({
      fish: { drawSource: "deck" },
      value: worlds.reduce((n, w) => n + afterDraw(w[0]!), 0) / worlds.length,
    })
  for (const [source, lane] of [
    ["discard-a", view.discardA],
    ["discard-b", view.discardB],
  ] as const)
    if (lane.length) options.push({ fish: { drawSource: source }, value: afterDraw(lane.at(-1)!) })
  const blank = hand.find((c) => c.kind === "blank")
  if (blank)
    for (const [pile, lane] of [
      ["a", view.discardA],
      ["b", view.discardB],
    ] as const)
      lane.forEach((card, cardIndex) =>
        options.push({
          fish: {
            blankExchange: {
              blankCardId: blank.id,
              pile,
              cardIndex,
            },
          },
          value: value(
            [...hand.filter((c) => c.id !== blank.id), ...player.publicCards, card],
            policy,
          ),
        }),
      )
  const treasure = hand.find((c) => c.kind === "treasure")
  if (treasure)
    for (const deck of random.shuffle(
      legacy.decks.filter((d) => d.playerId !== id).filter((d) => d.count),
    )) {
      const score =
        worlds.reduce(
          (n, w) =>
            n +
            treasureChoice(
              hand,
              player.publicCards,
              treasure.id,
              w.slice(0, Math.min(3, deck.count)),
              policy,
            ).value,
          0,
        ) / worlds.length
      options.push({
        fish: {
          treasureSearch: {
            treasureCardId: treasure.id,
            targetPlayerId: deck.playerId,
          },
        },
        value: score,
      })
    }
  if (!options.length) return { fish: { drawSource: "deck" }, value: 0 }
  return options.sort((a, b) => b.value - a.value)[0]!
}

/** Decisions use only the same redacted view a seated human receives. */
export function stepLegacyBot(engine: GameEngine, policy: LegacyBotPolicy = {}): void {
  const state = engine.state,
    id = state.actingPlayerId!
  const view = engine.publicView(id),
    player = view.players.find((p) => p.id === id)!
  const hand = Array.isArray(player.privateCards) ? player.privateCards : []
  if (state.phase === "charleston") return engine.passCharleston(id, legacyPass(hand, policy))
  if (state.phase === "treasure") {
    const offer = view.legacy!.treasureOffer!
    const choice = treasureChoice(
      hand,
      player.publicCards,
      offer.treasureCardId,
      offer.cards,
      policy,
    )
    return engine.chooseTreasure(id, choice.cardIds, choice.returnCardId)
  }

  if (state.phase === "discarding") {
    const discard = discardChoice(hand, player.publicCards, policy)
    return engine.discard(id, {
      discardCardId: discard.id,
      discardPile: view.discardA.length <= view.discardB.length ? "a" : "b",
    })
  }

  if (state.phase === "exposing") {
    const selected = new Set(scoreHand([...hand, ...player.publicCards], "legacy").selectedCardIds)
    const priority = (c: Card) =>
      (selected.has(c.id) ? (policy.concealCombination ? -100 : 100) : 0) -
      (c.kind === "blank" || c.kind === "treasure" ? 50 : 0)
    return engine.exposeCards(
      id,
      [...hand]
        .sort((a, b) => priority(b) - priority(a))
        .slice(0, state.street === 1 ? 3 : 1)
        .map((c) => c.id),
    )
  }
  if (state.phase !== "betting") throw new Error(`Cannot automate ${state.phase}`)
  if (state.stickWindow) {
    const option = chooseFish(view, id, policy)
    if (option.value <= value([...hand, ...player.publicCards], policy) + 0.3)
      return engine.finishStickDecision(id)
    return engine.spendRiichiStick(id, option.fish.drawSource ?? "deck", option.fish)
  }
  const legal = engine.legalActions(id),
    call = legal.find((a) => a.type === "call" || a.type === "check")!,
    bet = legal.find((a) => a.type === "bet")
  const current = scoreHand([...hand, ...player.publicCards], "legacy")
  const visibleBeaten = view.players.some(
    (p) =>
      p.id !== id &&
      !p.folded &&
      !p.eliminated &&
      compareHandScores(scoreHand([...p.publicCards, ...p.knownPrivateCards], "legacy"), current) >
        0,
  )
  const cost = call.callAmount ?? 0
  let action: BettingAction = { type: call.type as "check" | "call" }
  if (
    cost > 0 &&
    (visibleBeaten || current.total < 5) &&
    cost > Math.max(view.orbitValue, view.pot * 0.22)
  )
    action = { type: "fold" }
  else if (
    bet &&
    [
      "three-dragons",
      "pung-eye",
      "twin-lotus",
      "long-chow",
      "three-dragons-eye",
      "four-dragons",
      "four-winds",
      "kong",
      "quint",
    ].includes(current.combinations[0]?.kind ?? "high-card") &&
    !visibleBeaten &&
    state.bettingHistory.filter((b) => b.street === state.street && b.type === "bet").length < 2
  ) {
    const amount = Math.min(
      bet.maximum!,
      Math.max(bet.minimum!, Math.floor((state.currentWager + state.pot * 0.4) / 5) * 5),
    )
    action = {
      type: "bet",
      amount,
      riichi:
        !!bet.canRiichi &&
        ["three-dragons-eye", "four-dragons", "four-winds", "kong", "quint"].includes(
          current.combinations[0]?.kind ?? "high-card",
        ),
    }
  }
  if (
    action.type !== "fold" &&
    !player.riichi &&
    !(action.type === "bet" && action.riichi) &&
    (!view.allInPlayerIds.length || action.type === "call")
  ) {
    if (action.type !== "bet") Object.assign(action, chooseFish(view, id, policy).fish)
    else if (bet?.canUseRiichiStick)
      Object.assign(action, chooseFish(view, id, policy).fish, { useRiichiStick: true })
  }
  engine.act(id, action, true)
}
