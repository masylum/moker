import { expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
for (const existingAllIn of [false, true])
  it(`finishes a short all-in call's fishing before showdown (existing all-in: ${existingAllIn})`, () => {
    const game = GameEngine.create(
      [1, 2].map((i) => ({ id: `p${i}`, name: `P${i}`, controller: "human" as const })),
      { mode: "basic", seed: "short-call" },
    )
    const bettor = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
    if (existingAllIn) bettor.chips = 20
    game.act(bettor.id, { type: "bet", amount: 20 })
    const caller = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
    caller.chips = 5
    const card = game.state.discardA.at(-1)!
    game.act(caller.id, { type: "call", drawSource: "discard-a" })
    expect(game.state.phase).toBe("discarding")
    expect(caller.privateCards).toHaveLength(8)
    expect(caller.privateCards.some((c) => c.id === card.id)).toBe(true)
    expect(bettor.roundCommitted).toBe(5)
    expect(game.state.handResults).toHaveLength(0)
    game.discard(caller.id, { discardCardId: card.id, discardPile: "a" })
    expect(game.state.phase).toBe("between-hands")
    expect(game.state.handResults).toHaveLength(1)
  })
