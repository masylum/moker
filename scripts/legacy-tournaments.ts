import { mkdirSync, writeFileSync } from "node:fs"
import { GameEngine } from "../src/game/engine"
import { createDeck } from "../src/game/cards"
import { prepareCharleston, stepHeuristic } from "../src/game/automation"
import { evaluateLegacy } from "../src/game/legacy-scoring"
import { LEGACY_HAND_ORDER } from "../src/game/hand-ranks"
import type { GameState, GameEvent, HandKind } from "../src/game/types"

const runs = Number(process.argv[2] ?? 10)
const sizes = (process.argv[3] ?? "14,18,20").split(",").map(Number)
const samples = Number(process.argv[4] ?? 8)
const output = process.argv[5] ?? "docs/legacy-152/tournaments.json"
const personalCards = Number(process.argv[7] ?? 0)
if (![0, 5, 6].includes(personalCards)) throw new Error("Personal deal must be 5 or 6")
const lotusCount = (cards: readonly import("../src/game/types").Card[]) =>
  cards.filter((c) => c.kind === "flower").length

class Experiment extends GameEngine {
  constructor(
    state: GameState,
    events: GameEvent[],
    readonly size: number,
  ) {
    super(state, events)
  }
  protected override legacyPersonalOpeningCount(): number {
    return personalCards || super.legacyPersonalOpeningCount()
  }
  protected override prepareRound() {
    if (this.state.legacy) return
    const cards = this.random.shuffle(createDeck("legacy"))
    this.state.legacy = {
      version: 2,
      decks: this.state.players.map(() => cards.splice(0, this.size)),
    }
    this.state.deck = cards
  }
}
const results = []
for (const players of (process.argv[6] ?? "4,5,6").split(",").map(Number))
  for (const size of sizes) {
    const group = {
      players,
      size,
      runs,
      samples,
      personalCards: personalCards || (players === 6 ? 6 : 5),
      lotus: {
        openingHands: 0,
        openingSingles: 0,
        openingPairs: 0,
        afterPassSingles: 0,
        afterPassPairs: 0,
        discardSingles: 0,
        discardSinglesWithMateVisible: 0,
        allResultPairs: 0,
        foldedPairs: 0,
        uncontestedPairs: 0,
        showdownPairs: 0,
        showdownPairKinds: {} as Record<string, number>,
      },
      exhausted: 0,
      completed: 0,
      hands: 0,
      showdowns: 0,
      showdownPlayers: 0,
      fallbacks: 0,
      personalDraws: 0,
      centralMinimum: 152,
      deckMinimum: 152,
      originalRetention: [] as number[],
      uniqueSeen: [] as number[],
      finalSizes: [] as number[],
      centralMinima: [] as number[],
      personalMinima: [] as number[],
      repeatedOpeningCards: [] as number[],
      disqualified: 0,
      rows: Object.fromEntries(
        LEGACY_HAND_ORDER.map((k) => [k, { contains: 0, best: 0, wins: 0 }]),
      ),
      steps: 0,
    }
    for (let run = 0; run < runs; run++) {
      const g = GameEngine.create(
        Array.from({ length: players }, (_, i) => ({
          id: `p${i}`,
          name: `Bot ${i}`,
          controller: "heuristic" as const,
        })),
        {
          mode: "legacy",
          seed: `equilibrium:${players}:${run}`,
          tournamentGames: 4,
          heuristicSamples: samples,
        },
        (s, e) => new Experiment(s, e, size),
      )
      const original = g.state.players.map(
        (p, i) =>
          new Set(
            [
              ...g.state.legacy!.decks[i]!,
              ...p.privateCards.slice(0, personalCards || (players === 6 ? 6 : 5)),
            ].map((c) => c.id),
          ),
      )
      const seen = g.state.players.map(() => new Set<string>())
      let counted = 0
      let centralMinimum = 152,
        personalMinimum = 152
      const previousHands = new Map<string, Set<string>>()
      const instrumentedHands = new Set<string>()
      for (let steps = 0; g.state.phase !== "finished"; steps++) {
        if (steps > 10000) throw Error("step limit")
        group.steps++
        const s = g.state
        group.centralMinimum = Math.min(group.centralMinimum, s.deck.length)
        centralMinimum = Math.min(centralMinimum, s.deck.length)
        s.players.forEach((p, i) => {
          group.deckMinimum = Math.min(group.deckMinimum, s.legacy!.decks[i]!.length)
          personalMinimum = Math.min(personalMinimum, s.legacy!.decks[i]!.length)
          for (const c of [...p.privateCards, ...p.publicCards]) seen[i]!.add(c.id)
        })
        if (s.phase === "charleston" && !instrumentedHands.has(`${s.gameNumber}:${s.handNumber}`)) {
          instrumentedHands.add(`${s.gameNumber}:${s.handNumber}`)
          for (const p of s.players.filter(
            (candidate) => !candidate.folded && !candidate.eliminated,
          )) {
            group.lotus.openingHands++
            const n = lotusCount(p.privateCards)
            if (n === 1) group.lotus.openingSingles++
            if (n === 2) group.lotus.openingPairs++
          }
        }
        const phase = s.phase
        const before = s.drawDiscardHistory.length
        const actor = s.players.find((p) => p.id === s.actingPlayerId)
        const heldLotus = actor ? lotusCount([...actor.privateCards, ...actor.publicCards]) : 0
        const mateVisible =
          actor &&
          [...s.discardA, ...s.discardB].some(
            (c) => c.kind === "flower" && !actor.privateCards.some((own) => own.id === c.id),
          )
        const own = s.actingPlayerId
          ? s.legacy!.decks[s.players.findIndex((p) => p.id === s.actingPlayerId)]?.length
          : undefined
        if (s.phase === "charleston") prepareCharleston(g)
        else stepHeuristic(g)
        if (phase === "charleston" && g.state.phase !== "charleston")
          for (const player of g.state.players.filter((p) => !p.folded && !p.eliminated)) {
            const n = lotusCount([...player.privateCards, ...player.publicCards])
            if (n === 1) group.lotus.afterPassSingles++
            if (n === 2) group.lotus.afterPassPairs++
          }
        for (const move of g.state.drawDiscardHistory.slice(before)) {
          if (move.discardedCard.kind === "flower" && heldLotus === 1) {
            group.lotus.discardSingles++
            if (mateVisible) group.lotus.discardSinglesWithMateVisible++
          }
          if (move.source === "deck") {
            if (move.sourceDeckId === "central" || (!move.sourceDeckId && own === 0))
              group.fallbacks++
            else group.personalDraws++
          }
        }
        for (const result of g.state.handResults.slice(counted)) {
          group.hands++
          for (const player of result.players) {
            if (lotusCount(player.cards) === 2) {
              group.lotus.allResultPairs++
              if (player.folded) group.lotus.foldedPairs++
              else if (result.reason === "uncontested") group.lotus.uncontestedPairs++
              else {
                group.lotus.showdownPairs++
                const kind = evaluateLegacy(player.cards).kind
                group.lotus.showdownPairKinds[kind] = (group.lotus.showdownPairKinds[kind] ?? 0) + 1
              }
            }
            if (player.openingCards.length === 7) {
              const previous = previousHands.get(player.playerId)
              if (previous)
                group.repeatedOpeningCards.push(
                  player.openingCards.filter((c) => previous.has(c.id)).length,
                )
              previousHands.set(player.playerId, new Set(player.openingCards.map((c) => c.id)))
            }
          }
          if (result.reason !== "showdown") continue
          group.showdowns++
          for (const p of result.players.filter(
            (candidate) => !candidate.folded && !candidate.eliminated,
          )) {
            group.showdownPlayers++
            if (p.lotusDisqualified) group.disqualified++
            const contains = new Set<HandKind>(),
              score = evaluateLegacy(p.cards, contains)
            group.rows[score.kind]!.best++
            if (result.winnerIds.includes(p.playerId)) group.rows[score.kind]!.wins++
            for (const k of contains) group.rows[k]!.contains++
          }
        }
        counted = g.state.handResults.length
      }
      group.centralMinima.push(centralMinimum)
      group.personalMinima.push(personalMinimum)
      if (g.state.finishReason === "central-deck-exhausted") group.exhausted++
      else group.completed++
      g.state.players.forEach((p, i) => {
        const cards = [
          ...g.state.legacy!.decks[i]!,
          ...(g.state.foldedPrivateCards[p.id] ?? p.privateCards),
          ...p.publicCards,
        ]
        group.originalRetention.push(
          cards.filter((c) => original[i]!.has(c.id)).length / original[i]!.size,
        )
        group.finalSizes.push(cards.length)
        group.uniqueSeen.push(seen[i]!.size)
      })
    }
    results.push(group)
    mkdirSync("docs/legacy-152", { recursive: true })
    writeFileSync(
      output,
      JSON.stringify({ runs, sizes, samples, personalCards, results }, null, 2) + "\n",
    )
    console.log(
      JSON.stringify({
        players,
        size,
        exhausted: group.exhausted,
        hands: group.hands,
        showdowns: group.showdowns,
        meanSeen: group.uniqueSeen.reduce((a, b) => a + b, 0) / group.uniqueSeen.length,
      }),
    )
  }
