import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import { prepareCharleston } from "../src/game/automation"

const create = () =>
  GameEngine.create(
    [
      { id: "you", name: "You", controller: "human" },
      { id: "mori", name: "Mori", controller: "heuristic" },
      { id: "kiko", name: "Kiko", controller: "heuristic" },
    ],
    { seed: "simultaneous-pass", mode: "riichi", heuristicSamples: 2 },
  )

describe("simultaneous Charleston", () => {
  it("accepts choices in any order and transfers all cards only after the final choice", () => {
    const game = create()
    const before = structuredClone(game.state.players)
    const order = [...game.state.pendingPlayerIds].reverse()
    for (const id of order.slice(0, -1)) {
      const player = before.find((p) => p.id === id)!
      game.passCharleston(
        id,
        player.privateCards.slice(0, 2).map((card) => card.id),
      )
      expect(game.state.players.map((p) => p.privateCards)).toEqual(
        before.map((p) => p.privateCards),
      )
      expect(() =>
        game.passCharleston(
          id,
          player.privateCards.slice(0, 2).map((c) => c.id),
        ),
      ).toThrow("This player is not choosing a Charleston pass")
    }
    const last = before.find((player) => player.id === order.at(-1))!
    game.passCharleston(
      last.id,
      last.privateCards.slice(0, 2).map((card) => card.id),
    )
    expect(game.state.phase).toBe("betting")
    for (const [index, player] of before.entries()) {
      const recipient = game.state.players[(index + 1) % before.length]!
      expect(recipient.privateCards.map((c) => c.id)).toEqual(
        expect.arrayContaining(player.privateCards.slice(0, 2).map((c) => c.id)),
      )
    }
  })

  it("collects all bot choices secretly and waits only for the human", () => {
    const game = create()
    prepareCharleston(game)
    expect(game.state.pendingPlayerIds).toEqual(["you"])
    expect(game.publicView("you")).not.toHaveProperty("charlestonSelections")
    expect(game.state.charlestonHistory).toHaveLength(0)
    prepareCharleston(game)
    const you = game.state.players[0]!
    game.passCharleston(
      you.id,
      you.privateCards.slice(0, 2).map((c) => c.id),
    )
    expect(game.state.phase).toBe("betting")
    expect(game.publicView("you").charlestonReceivedCards).toHaveLength(2)
  })
})
