import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import { stepHeuristic } from "../src/game/automation"

function fixture() {
  const game = GameEngine.create(
    [1, 2, 3].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "human" as const })),
    { seed: "stick-timing", mode: "riichi" },
  )
  while (game.state.phase === "charleston") stepHeuristic(game)
  const id = game.state.actingPlayerId!
  return { game, id, player: game.state.players.find((p) => p.id === id)! }
}
function discard(game: GameEngine, id: string) {
  game.discard(id, {
    discardCardId: game.state.pendingDiscard!.drawnCardId,
    discardPile: !game.state.discardB.length ? "b" : "a",
  })
}

describe("independent Riichi stick timing", () => {
  it("lets a player fish before deciding their wager without consuming their turn", () => {
    const { game, id, player } = fixture()
    const chips = player.chips
    game.spendRiichiStick(id, "deck")
    expect(player.riichiSticks).toBe(1)
    discard(game, id)
    expect(game.state.phase).toBe("betting")
    expect(game.state.actingPlayerId).toBe(id)
    expect(player.chips).toBe(chips)
    expect(() => game.spendRiichiStick(id, "deck")).toThrow(/not available/)
    const restored = GameEngine.restore(game.state)
    expect(() => restored.spendRiichiStick(id, "deck")).toThrow(/not available/)
    expect(() => game.act(id, { type: "bet", amount: 10, useRiichiStick: true })).toThrow(
      /not available/,
    )
    expect(game.state.stickSpentThisTurn).toBe(true)
    game.act(id, { type: "bet", amount: 10 }, true)
    expect(game.state.stickWindow).toBeUndefined()
    expect(game.state.actingPlayerId).not.toBe(id)
    expect(game.canSpendStick(game.state.actingPlayerId!)).toBe(true)
  })
  it("holds a bet until the player skips or spends, including after restoring state", () => {
    const { game, id, player } = fixture()
    game.act(id, { type: "bet", amount: 10 }, true)
    expect(player.roundCommitted).toBe(10)
    expect(game.state.actingPlayerId).toBe(id)
    expect(() => game.act(id, { type: "check" })).toThrow(/decision/)
    const restored = GameEngine.restore(game.state)
    restored.spendRiichiStick(id, "discard-a")
    discard(restored, id)
    expect(restored.state.stickWindow).toBeUndefined()
    expect(restored.state.actingPlayerId).not.toBe(id)
  })
  it("offers a stick only after the free check fish has been discarded", () => {
    const { game, id } = fixture()
    game.act(id, { type: "check", drawSource: "deck" }, true)
    expect(game.state.stickWindow).toBeUndefined()
    expect(() => game.spendRiichiStick(id, "deck")).toThrow(/not available/)
    discard(game, id)
    expect(game.state.stickWindow?.playerId).toBe(id)
    game.finishStickDecision(id)
    expect(game.state.actingPlayerId).not.toBe(id)
  })
  it("rejects another player and empty sources without spending inventory", () => {
    const { game, id, player } = fixture()
    expect(() =>
      game.spendRiichiStick(game.state.players.find((p) => p.id !== id)!.id, "deck"),
    ).toThrow(/not available/)
    game.state.discardA = []
    expect(() => game.spendRiichiStick(id, "discard-a")).toThrow(/empty/)
    expect(player.riichiSticks).toBe(2)
  })
  it("does not offer fishing once Riichi locks the hand", () => {
    const { game, id } = fixture()
    game.act(id, { type: "bet", amount: 10, riichi: true }, true)
    expect(game.state.stickWindow).toBeUndefined()
    expect(() => game.spendRiichiStick(id, "deck")).toThrow(/not available/)
  })
  it("offers a stick after a call and its free fish", () => {
    const { game, id } = fixture()
    game.act(id, { type: "bet", amount: 10 })
    const caller = game.state.actingPlayerId!
    game.act(caller, { type: "call", drawSource: "deck" }, true)
    expect(game.state.phase).toBe("discarding")
    discard(game, caller)
    expect(game.state.stickWindow?.playerId).toBe(caller)
    game.finishStickDecision(caller)
    expect(game.state.actingPlayerId).not.toBe(caller)
  })
  it("folds immediately without offering a stick", () => {
    const { game, id, player } = fixture()
    game.act(id, { type: "fold" }, true)
    expect(player.folded).toBe(true)
    expect(player.riichiSticks).toBe(2)
    expect(game.state.stickWindow).toBeUndefined()
    expect(game.state.actingPlayerId).not.toBe(id)
  })
  it("allows a stick again on the player's next turn", () => {
    const { game, id, player } = fixture()
    game.spendRiichiStick(id, "deck")
    discard(game, id)
    game.act(id, { type: "bet", amount: 10 }, true)
    const raiser = game.state.actingPlayerId!
    game.act(raiser, { type: "bet", amount: 20 })
    const caller = game.state.actingPlayerId!
    game.act(caller, { type: "call", drawSource: "deck" })
    discard(game, caller)
    expect(game.state.actingPlayerId).toBe(id)
    game.spendRiichiStick(id, "deck")
    expect(player.riichiSticks).toBe(0)
  })
  it("reports net round results rather than gross payouts", () => {
    const { game, id } = fixture()
    game.act(id, { type: "bet", amount: 30 })
    while (game.state.phase === "betting") game.act(game.state.actingPlayerId!, { type: "fold" })
    const result = game.state.handResults.at(-1)!
    for (const player of result.players) {
      expect(player.netChips).toBe(player.payout - player.committed)
    }
    expect(result.players.reduce((sum, player) => sum + player.netChips!, 0)).toBe(0)
  })
})

for (const chips of [5, 20, 100]) {
  for (const attached of [false, true]) {
    it(`allows a stick on an all-in call with ${chips} chips (attached: ${attached})`, () => {
      const { game, id, player } = fixture()
      player.chips = 20
      game.act(id, { type: "bet", amount: 20 }, true)
      expect(game.state.stickWindow).toBeUndefined()
      const caller = game.state.actingPlayerId!
      game.act(caller, { type: "fold" })
      const last = game.state.actingPlayerId!
      const callingPlayer = game.state.players.find((p) => p.id === last)!
      callingPlayer.chips = chips
      expect(game.legalActions(last).find((a) => a.type === "call")?.canUseRiichiStick).toBe(true)
      expect(game.legalActions(last).some((a) => a.type === "bet")).toBe(false)
      game.act(last, { type: "call", drawSource: "deck", useRiichiStick: attached }, true)
      discard(game, last)
      expect(game.state.handResults).toHaveLength(0)
      expect(game.state.stickWindow?.playerId).toBe(attached ? undefined : last)
      const restored = GameEngine.restore(game.state)
      if (!attached) {
        restored.spendRiichiStick(last, "deck")
        game.spendRiichiStick(last, "deck")
      }
      discard(restored, last)
      expect(restored.state.handResults).toHaveLength(1)
      expect(game.state.phase).toBe("discarding")
      discard(game, last)
      expect(callingPlayer.riichiSticks).toBe(1)
      expect(game.state.handResults).toHaveLength(1)
    })
  }
}

it("allows declining the stick after spending the last chips on a call", () => {
  const { game, id, player } = fixture()
  player.chips = 20
  game.act(id, { type: "bet", amount: 20 })
  game.act(game.state.actingPlayerId!, { type: "fold" })
  const caller = game.state.actingPlayerId!
  game.state.players.find((p) => p.id === caller)!.chips = 20
  game.act(caller, { type: "call" }, true)
  discard(game, caller)
  game.finishStickDecision(caller)
  expect(game.state.handResults).toHaveLength(1)
})

it("keeps declared Riichi locked when calling an all-in", () => {
  const { game, id, player } = fixture()
  player.chips = 20
  game.act(id, { type: "bet", amount: 20 })
  const caller = game.state.actingPlayerId!
  game.state.players.find((p) => p.id === caller)!.riichi = true
  expect(game.canSpendStick(caller)).toBe(false)
  expect(() => game.act(caller, { type: "call", useRiichiStick: true })).toThrow(/not available/)
  game.act(caller, { type: "call" }, true)
  expect(game.state.phase).toBe("betting")
  expect(game.state.actingPlayerId).not.toBe(caller)
  expect(game.state.stickWindow).toBeUndefined()
})
