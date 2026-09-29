/** Executed by legacy-shadow-study.py in a temporary, documented engine variant. */
import { strict as assert } from "node:assert"
import { mkdirSync, writeFileSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { pathToFileURL } from "node:url"
import { GameEngine } from "../src/game/engine"
import { createDeck, faceKey, cardLabel } from "../src/game/cards"
import { legacyPass, stepLegacyBot } from "../src/game/legacy-bot"
import { evaluateLegacy } from "../src/game/legacy-scoring"
import { LEGACY_HAND_ORDER } from "../src/game/hand-ranks"
import { SeededRandom } from "../src/game/random"
import { oracleContains } from "./legacy-shadow-oracle"
import type { Card, GameState, GameEvent, HandKind } from "../src/game/types"

const variant = process.argv[2]!,
  runs = Number(process.argv[3]),
  samples = Number(process.argv[4]),
  offset = Number(process.argv[5]),
  repo = process.argv[6]!
const shadow = variant !== "control",
  deck = createDeck("legacy"),
  total = shadow ? 192 : 152
const out = `${repo}/docs/legacy-shadow`
mkdirSync(out, { recursive: true })
const strongKinds = new Set([
  "pung-eye",
  "twin-lotus",
  "long-chow",
  "three-dragons-eye",
  "four-dragons",
  "four-winds",
  "kong",
  "quint",
])
function features(cards: readonly Card[]) {
  const contains = new Set<HandKind>(),
    score = evaluateLegacy(cards, contains)
  return {
    kind: score.kind,
    contains: [...contains].map(String),
    core: cards
      .filter((c) => score.selectedCardIds.includes(c.id))
      .map(faceKey)
      .sort()
      .join("|"),
    rank: score.total,
    strong:
      [...contains].some((k) => strongKinds.has(k)) &&
      cards.filter((c) => c.kind === "flower").length !== 1,
    lotus: cards.filter((c) => c.kind === "flower").length,
    blackJoker: cards.some((c) => c.id === "joker-black"),
    joker: cards.some((c) => c.kind === "joker"),
    blank: cards.some((c) => c.kind === "blank"),
    treasure: cards.some((c) => c.kind === "treasure"),
    usedBlackJoker: score.selectedCardIds.includes("joker-black"),
    faces: [...new Set(cards.map(faceKey))],
  }
}
class CirculationEngine extends GameEngine {
  // A public factory constructor is required for the protected base constructor.
  // eslint-disable-next-line no-useless-constructor
  constructor(s: GameState, e: GameEvent[]) {
    super(s, e)
  }
  redistribution: {
    game: number
    hand: number
    before: number[]
    after: number[]
    pool: number
    received: number[]
  }[] = []
  protected override legacyPersonalOpeningCount() {
    return 7
  }
  protected override prepareRound() {
    if (this.state.legacy) return
    const cards = this.random.shuffle(createDeck("legacy"))
    this.state.deck = cards.splice(0, 2)
    const decks: Card[][] = this.state.players.map(() => [])
    cards.forEach((c, i) => decks[(this.state.dealerIndex + i) % decks.length]!.push(c))
    this.state.legacy = { version: 2, decks: decks.map((d) => this.random.shuffle(d)) }
  }
  // Called by the experiment-only cleanup hook inserted by the Python launcher.
  protected redistributeDiscardPool() {
    const s = this.state,
      decks = s.legacy!.decks,
      pool = this.random.shuffle(s.deck)
    assert(pool.length >= 2, "Two seed cards must survive every completed hand")
    s.deck = pool.splice(0, 2)
    const before = decks.map((d) => d.length),
      received = decks.map(() => 0)
    pool.forEach((card, i) => {
      const seat = (s.dealerIndex + i) % decks.length
      decks[seat]!.push(card)
      received[seat]!++
    })
    s.legacy!.decks = decks.map((d) => this.random.shuffle(d))
    this.redistribution.push({
      game: s.gameNumber,
      hand: s.handNumber,
      before,
      after: decks.map((d) => d.length),
      pool: pool.length,
      received,
    })
  }
}
function conserve(g: GameEngine) {
  const s = g.state,
    cards = [
      ...s.deck,
      ...s.discardA,
      ...s.discardB,
      ...s.legacy!.decks.flat(),
      ...s.players.flatMap((p) => [
        ...(s.foldedPrivateCards[p.id] ?? p.privateCards),
        ...p.publicCards,
      ]),
    ]
  assert.equal(cards.length, total)
  assert.equal(new Set(cards.map((c) => c.id)).size, total)
}
const card = (id: string) => {
  const c = deck.find((candidate) => candidate.id === id)
  assert(c, `Missing ${id}`)
  return c
}
function has(ids: string[], kind: string) {
  return features(ids.map(card)).contains.includes(kind)
}
async function scoringChecks() {
  assert.equal(deck.length, total)
  assert.equal(new Set(deck.map((c) => c.id)).size, total)
  const jokerFor = (c: Card) => `joker-${c.color}`
  let matchingFaces = 0
  for (const c of deck.filter(
    (candidate) =>
      ["numbered", "wind", "dragon"].includes(candidate.kind) && candidate.id.endsWith("-1"),
  )) {
    const four = [1, 2, 3, 4].map((i) => c.id.replace(/-1$/, `-${i}`))
    assert(has(four, "kong"))
    assert(!has(four, "quint"))
    matchingFaces++
    const eligible =
      variant !== "shadow-restricted" ||
      (!c.id.startsWith("shadow-") && !c.id.startsWith("dragon-black-"))
    assert.equal(has([...four, jokerFor(c)], "quint"), eligible)
    assert(!has([four[0]!, jokerFor(c)], "eye"))
  }
  let originalParity = 0
  if (!shadow) {
    const original = await import(pathToFileURL(`${repo}/src/game/legacy-scoring.ts`).href)
    const rng = new SeededRandom("shadow-control-scorer-parity")
    for (let i = 0; i < 3000; i++) {
      const hand = rng.shuffle(deck).slice(0, 7),
        a = evaluateLegacy(hand),
        b = original.evaluateLegacy(hand)
      assert.equal(a.kind, b.kind)
      assert.deepEqual(a.tieBreak, b.tieBreak)
      originalParity++
    }
  }
  let dragonFourSubsets = 0,
    windFourSubsets = 0
  const windPool = deck.filter((c) => c.kind === "wind" || c.id === "joker-black")
  const dragonPool = deck.filter((c) => c.kind === "dragon" || c.kind === "joker")
  function count(pool: Card[], kind: string) {
    let n = 0
    for (let a = 0; a < pool.length; a++)
      for (let b = a + 1; b < pool.length; b++)
        for (let c = b + 1; c < pool.length; c++)
          for (let d = c + 1; d < pool.length; d++)
            if (features([pool[a]!, pool[b]!, pool[c]!, pool[d]!]).contains.includes(kind)) n++
    return n
  }
  windFourSubsets = count(windPool, "four-winds")
  assert.equal(windFourSubsets, 512)
  if (shadow) {
    assert(has(["shadow-1-1", "shadow-2-1", "shadow-3-1"], "chow"))
    assert.equal(
      has(["shadow-1-1", "shadow-2-1", "joker-black"], "chow"),
      variant !== "shadow-restricted",
    )
    assert(!has(["shadow-1-1", "shadow-2-1", "joker-red"], "chow"))
    assert.equal(
      has(["dragon-black-1", "dragon-red-1", "dragon-green-1"], "three-dragons"),
      variant !== "shadow-original-three",
    )
    assert(!has(["dragon-black-1", "dragon-red-1", "dragon-green-1"], "four-dragons"))
    assert(
      has(["dragon-black-1", "dragon-red-1", "dragon-green-1", "dragon-white-1"], "four-dragons"),
    )
    assert(
      !has(["dragon-red-1", "dragon-red-2", "dragon-green-1", "dragon-white-1"], "four-dragons"),
    )
    assert(!has(["wind-east-1", "wind-south-1", "joker-black"], "four-winds"))
    assert(!has(["shadow-1-1", "shadow-2-1", "joker-black", "shadow-4-1"], "chow-eye"))
    dragonFourSubsets = count(dragonPool, "four-dragons")
    assert.equal(dragonFourSubsets, variant === "shadow-restricted" ? 500 : 625)
  }
  const oracleRng = new SeededRandom("shadow-independent-oracle")
  for (let i = 0; i < 3000; i++) {
    const hand = oracleRng.shuffle(deck).slice(0, 7)
    assert.deepEqual(
      features(hand).contains.sort(),
      [
        ...oracleContains(
          hand,
          shadow,
          variant === "shadow-restricted",
          variant === "shadow-original-three",
        ),
      ].sort(),
      hand.map((c) => c.id).join(","),
    )
  }
  return { matchingFaces, originalParity, dragonFourSubsets, windFourSubsets, oracleHands: 3000 }
}
function stressTests() {
  const results = []
  for (const players of [4, 5, 6])
    for (const policy of ["fold", "equal-draw", "one-thinner"]) {
      const g = GameEngine.create(
        Array.from({ length: players }, (_, i) => ({
          id: `p${i}`,
          name: `P${i}`,
          controller: "heuristic" as const,
        })),
        {
          mode: "legacy",
          seed: `shadow-stress:${players}`,
          tournamentGames: 4,
          heuristicSamples: 1,
        },
        (s, e) => new CirculationEngine(s, e),
      ) as CirculationEngine
      let empty = 0
      for (let steps = 0; g.state.phase !== "finished"; steps++) {
        assert(steps < 20000)
        conserve(g)
        const s = g.state,
          id = s.actingPlayerId!
        if (s.phase === "charleston") {
          const choices = s.players
            .filter((p) => s.pendingPlayerIds.includes(p.id))
            .map((p) => ({ id: p.id, cards: legacyPass(p.privateCards) }))
          for (const c of choices) g.passCharleston(c.id, c.cards)
        } else if (s.phase === "between-hands") g.startNextHand()
        else if (s.phase === "betting") {
          if (policy === "fold") g.act(id, { type: "fold" }, false)
          else if (s.stickWindow) g.finishStickDecision(id)
          else {
            const playerIndex = s.players.findIndex((p) => p.id === id),
              own = s.legacy!.decks[playerIndex]!.length
            const wanted = policy === "equal-draw" || id === "p0"
            if (wanted && !own) empty++
            const source = wanted && own ? "deck" : s.discardA.length ? "discard-a" : "discard-b"
            const call = g.legalActions(id).find((a) => a.type === "check" || a.type === "call")!
            g.act(id, { type: call.type as "check" | "call", drawSource: source }, false)
          }
        } else stepLegacyBot(g)
      }
      conserve(g)
      results.push({
        players,
        policy,
        hands: g.state.handResults.length,
        finish: g.state.finishReason ?? "complete",
        emptyAttempts: empty,
        initial: (total - 2) / players,
        final: g.state.legacy!.decks.map((d) => d.length),
        sizes: g.redistribution.map((r) => r.after),
      })
    }
  return results
}
if (process.env.LEGACY_SHADOW_STRESS_ONLY) {
  writeFileSync(`${out}/${variant}-stress.json`, JSON.stringify(stressTests(), null, 2) + "\n")
  process.exit(0)
}
const checks = await scoringChecks()
const randomCounts: Record<string, number> = {},
  randomBest: Record<string, number> = {}
const randomSamples = 100000,
  rarityRng = new SeededRandom("shadow-random-check")
for (let i = 0; i < randomSamples; i++) {
  const f = features(rarityRng.shuffle(deck).slice(0, 7))
  for (const k of f.contains) randomCounts[k] = (randomCounts[k] ?? 0) + 1
  randomBest[f.kind] = (randomBest[f.kind] ?? 0) + 1
}
const tournaments = []
for (const players of [4, 5, 6])
  for (let run = 0; run < runs; run++) {
    const seed = `circulation:${players}:${run + offset}`
    const g = GameEngine.create(
      Array.from({ length: players }, (_, i) => ({
        id: `p${i}`,
        name: `Bot ${i}`,
        controller: "heuristic" as const,
      })),
      { mode: "legacy", seed, tournamentGames: 4, heuristicSamples: samples },
      (s, e) => new CirculationEngine(s, e),
    ) as CirculationEngine
    const original = g.state.players.map(
      (p, i) => new Set([...p.privateCards, ...g.state.legacy!.decks[i]!].map((c) => c.id)),
    )
    const hands = []
    const probes = []
    const openingKeys = new Set<string>()
    const gameKeys = new Set<number>()
    const emptyOwn = new Set<string>()
    const eliminated = new Set<string>()
    const events: Record<string, number> = {},
      sources: Record<string, number> = {}
    const deckDraws = Array(players).fill(0) as number[]
    const repeat: number[] = []
    const previous = new Map<string, Set<string>>()
    const seen = g.state.players.map(() => new Set<string>())
    let counted = 0,
      eventCount = 0,
      minimumUndrawn = total,
      minimumCollection = total,
      maximumCollection = 0
    const openingSizes: number[][] = []
    for (let steps = 0; g.state.phase !== "finished"; steps++) {
      if (steps > 20000) throw Error("Step limit")
      const s = g.state,
        game = s.gameNumber,
        key = `${game}:${s.handNumber}`
      conserve(g)
      s.players.forEach((p, i) => {
        const own = s.legacy!.decks[i]!.length
        minimumUndrawn = Math.min(minimumUndrawn, own)
        if (!own && !p.folded && !p.eliminated) emptyOwn.add(`${key}:${p.id}`)
        if (p.eliminated) eliminated.add(`${game}:${p.id}`)
        for (const c of [...p.privateCards, ...p.publicCards]) seen[i]!.add(c.id)
      })
      if (s.phase === "charleston" && !openingKeys.has(key)) {
        openingKeys.add(key)
        const sizes = s.players.map(
          (p, i) => s.legacy!.decks[i]!.length + p.privateCards.length + p.publicCards.length,
        )
        openingSizes.push(sizes)
        minimumCollection = Math.min(minimumCollection, ...sizes)
        maximumCollection = Math.max(maximumCollection, ...sizes)
        if (!gameKeys.has(game)) {
          gameKeys.add(game)
          const rng = new SeededRandom(`${seed}:probe:${game}`)
          probes.push({
            game,
            players: s.players.map((p, i) => {
              const collection = [...s.legacy!.decks[i]!, ...p.privateCards, ...p.publicCards]
              const fs = Array.from({ length: 100 }, () =>
                features(rng.shuffle(collection).slice(0, 7)),
              )
              return {
                id: p.id,
                size: collection.length,
                strong: fs.filter((f) => f.strong).length,
                kong: fs.filter((f) => f.contains.includes("kong")).length,
                original:
                  collection.filter((c) => original[i]!.has(c.id)).length / original[i]!.size,
              }
            }),
          })
        }
      }
      const before = s.drawDiscardHistory.length
      if (s.phase === "charleston") {
        const choices = s.players
          .filter((p) => s.pendingPlayerIds.includes(p.id))
          .map((p) => ({ id: p.id, cards: legacyPass(p.privateCards) }))
        for (const c of choices) g.passCharleston(c.id, c.cards)
      } else if (s.phase === "between-hands") g.startNextHand()
      else stepLegacyBot(g)
      for (const e of g.events.slice(eventCount)) events[e.type] = (events[e.type] ?? 0) + 1
      eventCount = g.events.length
      for (const move of g.state.drawDiscardHistory.slice(before)) {
        sources[move.source] = (sources[move.source] ?? 0) + 1
        if (move.source === "deck") {
          assert.notEqual(move.sourceDeckId, "central")
          deckDraws[g.state.players.findIndex((p) => p.id === move.playerId)]!++
        }
      }
      for (const h of g.state.handResults.slice(counted)) {
        conserve(g)
        assert.equal(g.state.deck.length, 2)
        const ps = h.players.filter((p) => p.openingCards.length === 7),
          ranks = ps.map((p) => features(p.openingCards).rank)
        hands.push({
          game,
          hand: h.handNumber,
          reason: h.reason,
          winners: h.winnerIds,
          pot: h.pot,
          riichi: h.riichiSettlement,
          lotusBluff: h.lotusBluff,
          decks: g.state.legacy!.decks.map((d) => d.length),
          seats: ps.map((p) => {
            const opening = features(p.openingCards),
              end = features(p.cards),
              prev = previous.get(p.playerId)
            if (prev) repeat.push(p.openingCards.filter((c) => prev.has(c.id)).length)
            previous.set(p.playerId, new Set(p.openingCards.map((c) => c.id)))
            return {
              id: p.playerId,
              opening,
              end,
              folded: p.folded,
              won: h.winnerIds.includes(p.playerId),
              net: p.netChips,
              chips: p.chips,
              loan: p.loans,
              sticks: p.riichiSticks,
              disqualified: p.lotusDisqualified,
              treasurePayout: p.treasurePayout ?? 0,
              weak: ranks.filter((r) => r > opening.rank).length >= Math.ceil(ranks.length / 2),
              ...(run < 2
                ? { openingCards: p.openingCards.map(cardLabel), endCards: p.cards.map(cardLabel) }
                : {}),
            }
          }),
        })
      }
      counted = g.state.handResults.length
    }
    const final = g.state.finalScores!,
      first = g.state.gameScores[0]!
    const winnerIds = Object.keys(final).filter(
      (id) => final[id] === Math.max(...Object.values(final)),
    )
    const lastAfterOne = Object.keys(first).filter(
      (id) => first[id] === Math.min(...Object.values(first)),
    )
    tournaments.push({
      seed,
      players,
      run,
      hands,
      probes,
      events,
      sources,
      repeat,
      openingSizes,
      minimumUndrawn,
      minimumCollection,
      maximumCollection,
      emptyOwn: emptyOwn.size,
      eliminated: eliminated.size,
      completed: g.state.finishReason !== "central-deck-exhausted",
      finishReason: g.state.finishReason ?? "complete",
      finalDecks: g.state.legacy!.decks.map((d) => d.length),
      deckDraws,
      seen: seen.map((s) => s.size),
      redistribution: g.redistribution,
      final,
      winnerIds,
      lastAfterOne,
      gameScores: g.state.gameScores,
    })
    writeFileSync(
      `${out}/${variant}.json.gz`,
      gzipSync(
        JSON.stringify({
          variant,
          runs,
          samples,
          offset,
          total,
          ladder: [...LEGACY_HAND_ORDER],
          checks,
          randomSamples,
          randomCounts,
          randomBest,
          tournaments,
        }),
      ),
    )
    console.log(
      JSON.stringify({
        variant,
        players,
        run,
        hands: hands.length,
        min: minimumCollection,
        max: maximumCollection,
        empty: emptyOwn.size,
        finish: g.state.finishReason ?? "complete",
      }),
    )
  }
