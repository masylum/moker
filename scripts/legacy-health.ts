/** Reproducible, process-isolated balance experiments. Never changes live defaults. */
import { mkdirSync, writeFileSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { GameEngine } from "../src/game/engine"
import { createDeck, cardLabel, faceKey } from "../src/game/cards"
import { legacyPass, stepLegacyBot, type LegacyBotPolicy } from "../src/game/legacy-bot"
import { evaluateLegacy } from "../src/game/legacy-scoring"
import { LEGACY_HAND_ORDER } from "../src/game/hand-ranks"
import { SeededRandom } from "../src/game/random"
import { canTakeLoan } from "../src/game/rules"
import type { Card, GameState, GameEvent, HandKind } from "../src/game/types"

const variant = process.argv[2] ?? "14-5-current"
const studyName = process.argv[6] ?? variant
const runs = Number(process.argv[3] ?? 10)
const samples = Number(process.argv[4] ?? 8)
const [sizeText, personalText, ladder, behavior = "greedy"] = variant.split("-")
const size = Number(sizeText),
  personal = Number(personalText)
if (![10, 14, 18].includes(size) || ![0, 5, 6, 56].includes(personal)) throw Error("Invalid deal")
const referenceOrder = [...LEGACY_HAND_ORDER]
// Each variant runs in its own fresh process, before any scoring/cache population.
if (ladder === "raised") {
  const order = LEGACY_HAND_ORDER as HandKind[]
  order.splice(order.indexOf("three-dragons"), 1)
  order.splice(order.indexOf("pung-eye") + 1, 0, "three-dragons")
  order.splice(order.indexOf("twin-lotus"), 1)
  order.splice(order.indexOf("kong") + 1, 0, "twin-lotus")
} else if (ladder === "balanced" || ladder === "rarity") {
  const order = LEGACY_HAND_ORDER as HandKind[]
  order.splice(
    0,
    order.length,
    "high-card",
    "eye",
    "chow",
    "two-eyes",
    "pung",
    "three-winds",
    "chow-eye",
    "pung-eye",
    "three-dragons",
    "kong",
    "long-chow",
    "four-winds",
    "three-dragons-eye",
    "twin-lotus",
    "quint",
  )
  if (ladder === "rarity") {
    order.splice(order.indexOf("three-winds"), 1)
    order.splice(order.indexOf("pung-eye") + 1, 0, "three-winds")
  }
} else if (ladder !== "current") throw Error("Invalid ladder")
const policy: LegacyBotPolicy =
  behavior === "collector" || behavior === "patient"
    ? {
        concealCombination: behavior === "collector",
        adjustValue(cards, immediate) {
          const flowers = cards.filter((c) => c.kind === "flower").length
          // Deliberately optimistic pursuit sensitivity, not a claim of optimal play.
          const score = evaluateLegacy(cards)
          const partialDragons = new Set(
            cards.filter((c) => c.kind === "dragon").map((c) => c.dragon),
          ).size
          return (
            (flowers === 1 ? Math.max(0, score.total - 3) : immediate) +
            (partialDragons === 2 ? 1 : 0)
          )
        },
      }
    : {}
function openingCount(state: GameState) {
  return personal === 0
    ? state.players.length === 6
      ? 6
      : 5
    : personal === 56
      ? state.handNumber % 2
        ? 5
        : 6
      : personal
}
class Experiment extends GameEngine {
  // The factory needs a public constructor; the engine constructor is protected.
  // eslint-disable-next-line no-useless-constructor
  constructor(state: GameState, events: GameEvent[]) {
    super(state, events)
  }
  protected override legacyPersonalOpeningCount() {
    return openingCount(this.state)
  }
  protected override prepareRound() {
    if (this.state.legacy) {
      const rotation =
        behavior === "rotate1" ? 1 : behavior === "rotate2" ? 2 : behavior === "rotate3" ? 3 : 0
      if (rotation && this.state.handNumber === 0 && this.state.gameNumber > 1) {
        for (const deck of this.state.legacy.decks) {
          if (deck.length < rotation || this.state.deck.length < rotation)
            throw Error("Insufficient cards for fixed rotation")
          const outgoing = this.random.shuffle(deck).slice(0, rotation)
          const incoming = this.random.shuffle(this.state.deck).slice(0, rotation)
          deck.splice(
            0,
            deck.length,
            ...this.random.shuffle([
              ...deck.filter((c) => !outgoing.some((o) => o.id === c.id)),
              ...incoming,
            ]),
          )
          this.state.deck = this.random.shuffle([
            ...this.state.deck.filter((c) => !incoming.some((o) => o.id === c.id)),
            ...outgoing,
          ])
        }
      }
      return
    }
    const cards = this.random.shuffle(createDeck("legacy"))
    this.state.legacy = { version: 2, decks: this.state.players.map(() => cards.splice(0, size)) }
    this.state.deck = cards
  }
}
function features(cards: readonly Card[]) {
  const contains = new Set<HandKind>()
  const score = evaluateLegacy(cards, contains)
  return {
    faces: [...new Set(cards.map(faceKey))],
    kind: score.kind,
    core: cards
      .filter((c) => score.selectedCardIds.includes(c.id))
      .map(faceKey)
      .sort()
      .join("|"),
    contains: [...contains],
    reference: Math.max(1, ...[...contains].map((k) => referenceOrder.indexOf(k) + 1)),
    lotus: cards.filter((c) => c.kind === "flower").length,
    dragons: new Set(cards.filter((c) => c.kind === "dragon").map((c) => c.dragon)).size,
    joker: cards.some((c) => c.kind === "joker"),
    blank: cards.some((c) => c.kind === "blank"),
    treasure: cards.some((c) => c.kind === "treasure"),
  }
}
const tournaments = []
for (const players of [4, 5, 6])
  for (let run = 0; run < runs; run++) {
    const seed = `health:${players}:${run + Number(process.argv[5] ?? 0)}`
    const g = GameEngine.create(
      Array.from({ length: players }, (_, i) => ({
        id: `p${i}`,
        name: `Bot ${i}`,
        controller: "heuristic" as const,
      })),
      { mode: "legacy", seed, tournamentGames: 4, heuristicSamples: samples },
      (s, e) => new Experiment(s, e),
    )
    const detailed = variant === "14-5-current" && run < (players === 4 ? 4 : 3)
    const original = g.state.players.map(
      (p, i) =>
        new Set(
          [...g.state.legacy!.decks[i]!, ...p.privateCards.slice(0, openingCount(g.state))].map(
            (c) => c.id,
          ),
        ),
    )
    const seen = g.state.players.map(() => new Set<string>())
    const previous = new Map<string, Card[]>()
    const repeats: number[] = []
    const faceRepeats: number[] = []
    const hands = []
    const openings = []
    const probes = []
    const eventCounts: Record<string, number> = {}
    const fishing: Record<string, number> = {}
    const openingKeys = new Set<string>()
    const gameKeys = new Set<number>()
    const loanOffers = new Set<string>()
    const eliminated = new Set<string>()
    let centralMinimum = 152,
      fallback = 0,
      personalDraws = 0,
      counted = 0,
      eventCount = 0
    for (let steps = 0; g.state.phase !== "finished"; steps++) {
      if (steps > 15000) throw Error(`Step limit ${variant} ${seed}`)
      const s = g.state,
        game = s.gameNumber
      centralMinimum = Math.min(centralMinimum, s.deck.length)
      s.players.forEach((p, i) => {
        for (const c of [...p.privateCards, ...p.publicCards]) seen[i]!.add(c.id)
        if (p.eliminated) eliminated.add(`${game}:${p.id}`)
      })
      const key = `${game}:${s.handNumber}`
      if (s.phase === "charleston" && !openingKeys.has(key)) {
        openingKeys.add(key)
        openings.push({
          game,
          hand: s.handNumber,
          central: s.deck.length,
          decks: s.legacy!.decks.map((d) => d.length),
        })
        for (const p of s.players)
          if (canTakeLoan(s, p)) {
            loanOffers.add(`${game}:${s.handNumber}:${p.id}`)
            if (behavior === "collector") g.takeLoan(p.id)
          }
        if (!gameKeys.has(game)) {
          gameKeys.add(game)
          const rng = new SeededRandom(`${seed}:probe:${game}`)
          probes.push({
            game,
            players: s.players.map((p, i) => {
              const collection = [
                ...s.legacy!.decks[i]!,
                ...p.privateCards.slice(0, openingCount(g.state)),
              ]
              const measured = Array.from({ length: 100 }, () =>
                features(rng.shuffle(collection).slice(0, 7)),
              )
              return {
                playerId: p.id,
                size: collection.length,
                original: collection.filter((c) => original[i]!.has(c.id)).length,
                strong: measured.filter((f) => f.reference >= 9 && f.lotus !== 1).length,
                kong: measured.filter((f) => f.contains.includes("kong")).length,
              }
            }),
          })
        }
      }
      const before = s.drawDiscardHistory.length
      if (s.phase === "charleston") {
        const choices = s.players
          .filter((p) => s.pendingPlayerIds.includes(p.id))
          .map((p) => ({ id: p.id, cards: legacyPass(p.privateCards, policy) }))
        for (const c of choices) g.passCharleston(c.id, c.cards)
      } else if (s.phase === "between-hands") g.startNextHand()
      else stepLegacyBot(g, policy)
      for (const event of g.events.slice(eventCount))
        eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1
      eventCount = g.events.length
      for (const move of g.state.drawDiscardHistory.slice(before)) {
        fishing[move.source] = (fishing[move.source] ?? 0) + 1
        if (move.source === "deck") {
          if (move.sourceDeckId === "central") fallback++
          else personalDraws++
        }
      }
      for (const result of g.state.handResults.slice(counted)) {
        const physical = [
          ...g.state.deck,
          ...g.state.discardA,
          ...g.state.discardB,
          ...g.state.legacy!.decks.flat(),
          ...g.state.players.flatMap((p) => [...p.privateCards, ...p.publicCards]),
          ...Object.values(g.state.foldedPrivateCards).flat(),
        ]
        if (physical.length !== 152 || new Set(physical.map((c) => c.id)).size !== 152)
          throw Error(`Card conservation ${seed}`)
        const participants = result.players.filter((p) => p.openingCards.length === 7)
        const strengths = participants.map((p) => features(p.openingCards).reference)
        const chips = participants.map((p) => p.openingChips)
        hands.push({
          game,
          hand: result.handNumber,
          reason: result.reason,
          pot: result.pot,
          winners: result.winnerIds,
          central: g.state.deck.length,
          decks: g.state.legacy!.decks.map((d) => d.length),
          riichi: result.riichiSettlement,
          lotusBluff: result.lotusBluff,
          seats: participants.map((p) => {
            const opening = features(p.openingCards),
              end = features(p.cards)
            const prev = previous.get(p.playerId)
            if (prev) {
              repeats.push(p.openingCards.filter((c) => prev.some((o) => o.id === c.id)).length)
              const faces = prev.map(faceKey)
              let overlap = 0
              for (const c of p.openingCards) {
                const index = faces.indexOf(faceKey(c))
                if (index >= 0) {
                  overlap++
                  faces.splice(index, 1)
                }
              }
              faceRepeats.push(overlap)
            }
            previous.set(p.playerId, p.openingCards)
            return {
              id: p.playerId,
              opening,
              end,
              won: result.winnerIds.includes(p.playerId),
              folded: p.folded,
              bottomOpening:
                strengths.filter((x) => x > opening.reference).length >=
                Math.ceil(strengths.length / 2),
              behindChips: chips.some((x) => x > p.openingChips),
              openingChips: p.openingChips,
              chips: p.chips,
              net: p.netChips,
              loan: p.loans,
              sticks: p.riichiSticks,
              disqualified: p.lotusDisqualified,
              treasurePayout: p.treasurePayout ?? 0,
              ...(detailed
                ? { openingCards: p.openingCards.map(cardLabel), endCards: p.cards.map(cardLabel) }
                : {}),
            }
          }),
        })
      }
      counted = g.state.handResults.length
    }
    const final = g.state.finalScores!
    const winners = Object.keys(final).filter(
      (id) => final[id] === Math.max(...Object.values(final)),
    )
    const first = g.state.gameScores[0]!
    const lastAfterOne = Object.keys(first).filter(
      (id) => first[id] === Math.min(...Object.values(first)),
    )
    const leadersAfterOne = Object.keys(first).filter(
      (id) => first[id] === Math.max(...Object.values(first)),
    )
    tournaments.push({
      seed,
      players,
      run,
      detailed,
      hands,
      openings,
      probes,
      eventCounts,
      fishing,
      completed: g.state.finishReason !== "central-deck-exhausted",
      centralMinimum,
      fallback,
      personalDraws,
      repeats,
      faceRepeats,
      loanOffers: loanOffers.size,
      eliminatedPlayerGames: eliminated.size,
      gameScores: g.state.gameScores,
      final,
      winners,
      lastAfterOne,
      leadersAfterOne,
      finalDecks: g.state.legacy!.decks.map((d) => d.length),
      seen: seen.map((s) => s.size),
    })
    mkdirSync("docs/legacy-152/health", { recursive: true })
    writeFileSync(
      `docs/legacy-152/health/${studyName}.json.gz`,
      gzipSync(
        JSON.stringify({
          variant: studyName,
          configVariant: variant,
          runs,
          samples,
          ladder: [...LEGACY_HAND_ORDER],
          tournaments,
        }),
      ),
    )
    console.log(JSON.stringify({ variant, players, run, hands: hands.length, centralMinimum }))
  }
