import { GameEngine } from "../src/game/engine"
import { createDeck } from "../src/game/cards"
import { writeFileSync } from "node:fs"
import type { GameEvent, GameState } from "../src/game/types"
const personalCards = Number(process.argv[2] ?? 0)
const output = process.argv[3] ?? "docs/legacy-152/passive-stress.json"
class PassiveExperiment extends GameEngine {
  constructor(
    s: GameState,
    e: GameEvent[],
    readonly size: number,
  ) {
    super(s, e)
  }
  protected override legacyPersonalOpeningCount() {
    return personalCards === 56
      ? this.state.handNumber % 2
        ? 5
        : 6
      : personalCards || super.legacyPersonalOpeningCount()
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
for (const players of [4, 5, 6])
  for (const size of [14, 18, 20]) {
    const g = GameEngine.create(
      Array.from({ length: players }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        controller: "human" as const,
      })),
      { mode: "legacy", seed: "passive-stress", tournamentGames: 4 },
      (s, e) => new PassiveExperiment(s, e, size),
    )
    while (g.state.phase !== "finished") {
      if (g.state.phase === "charleston")
        for (const p of g.state.players.filter((candidate) => !candidate.folded))
          g.passCharleston(
            p.id,
            p.privateCards.slice(0, 2).map((c) => c.id),
          )
      else if (g.state.phase === "betting") g.act(g.state.actingPlayerId!, { type: "fold" })
      else if (g.state.phase === "between-hands") g.startNextHand()
      else throw Error(g.state.phase)
    }
    results.push({
      players,
      size,
      personalCards: personalCards || (players === 6 ? 6 : 5),
      hands: g.state.handResults.length,
      expectedHands: players * 4,
      finishReason: g.state.finishReason ?? "complete",
      centralRemaining: g.state.deck.length,
    })
  }
writeFileSync(output, JSON.stringify(results, null, 2) + "\n")
console.log(results)
