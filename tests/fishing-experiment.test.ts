import { describe, expect, it } from "vitest"
import { GameEngine } from "../docs/fishing-experiment-2026-09-25/proposed/src/game/engine"
import { stepHeuristic } from "../docs/fishing-experiment-2026-09-25/proposed/src/game/automation"
import {
  chooseHeuristicAction,
  defaultBotPolicy,
} from "../docs/fishing-experiment-2026-09-25/proposed/src/game/heuristic"
import { createDeck } from "../docs/fishing-experiment-2026-09-25/proposed/src/game/cards"

function fixture(mode: "basic" | "riichi") {
  const game = GameEngine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    { seed: "fishing-proposal", mode, heuristicSamples: 24 },
  )
  while (game.state.phase === "charleston") stepHeuristic(game)
  const player = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
  return { game, player }
}
describe("experimental action-based fishing", () => {
  for (const mode of ["basic", "riichi"] as const)
    for (const type of ["check", "call", "bet"] as const) {
      it(`${mode} ${type} has the proposed free draw entitlement`, () => {
        const { game, player } = fixture(mode)
        if (type === "call") game.state.currentWager = 5
        const before = game.state.deck.length
        game.act(player.id, type === "bet" ? { type, amount: 5 } : { type })
        const fishes = mode === "basic" || type !== "bet"
        expect(game.state.deck.length).toBe(before - Number(fishes))
        expect(game.state.phase === "discarding").toBe(fishes)
      })
    }
  it("a Riichi call gets two sequential draws for one stick", () => {
    const { game, player } = fixture("riichi")
    game.state.currentWager = 5
    const before = game.state.deck.length,
      sticks = player.riichiSticks
    game.act(player.id, {
      type: "call",
      useRiichiStick: true,
      drawSource: "deck",
      riichiDrawSource: "deck",
    })
    expect(game.state.phase).toBe("discarding")
    game.discard(player.id, {
      discardCardId: game.state.pendingDiscard!.drawnCardId,
      discardPile: "a",
    })
    expect(game.state.phase).toBe("discarding")
    expect(game.state.deck.length).toBe(before - 2)
    expect(player.riichiSticks).toBe(sticks - 1)
    expect(game.state.drawContext?.reason).toBe("riichi-stick")
  })
  it("a Riichi bet still requires a stick to fish", () => {
    const { game, player } = fixture("riichi")
    const before = game.state.deck.length
    game.act(player.id, { type: "bet", amount: 5, useRiichiStick: true, drawSource: "deck" })
    expect(game.state.deck.length).toBe(before - 1)
    expect(game.state.drawContext?.remaining).toHaveLength(0)
  })
  it("all-in and declared-Riichi locks remain in force", () => {
    for (const lock of ["all-in", "riichi"]) {
      const { game, player } = fixture("riichi")
      if (lock === "all-in")
        game.state.allInPlayerIds = [game.state.players.find((p) => p !== player)!.id]
      else player.riichi = true
      const before = game.state.deck.length
      game.act(player.id, { type: "check", drawSource: "deck" })
      expect(game.state.deck.length).toBe(before)
    }
  })
  it("values a free Call followed by a paid dig for Twin Lotus", () => {
    const { game, player } = fixture("riichi")
    const cards = createDeck("riichi"),
      flowers = cards.filter((c) => c.kind === "flower")
    player.privateCards = [flowers[0]!, ...cards.filter((c) => c.kind === "numbered").slice(0, 6)]
    player.publicCards = []
    game.state.discardA = [flowers[1]!, cards.find((c) => c.kind === "wind")!]
    game.state.discardB = []
    game.state.currentWager = 5
    const action = chooseHeuristicAction(game.state, player.id, 24, {
      ...defaultBotPolicy("riichi"),
      betEquityFloor: 2,
      raiseEquityFloor: 2,
      bluffFrequency: 0,
      lotusBluffFrequency: 0,
    }).action
    expect(action.type).toBe("call")
    expect(action.type !== "fold" && action.useRiichiStick).toBe(true)
    expect(action.type !== "fold" && action.drawSource).toBe("discard-a")
    expect(action.type === "call" && action.riichiDrawSource).toBe("discard-a")
  })
})

import { orbitHistory } from "../scripts/lib/orbit-history"
it("measures orbit catch-up before the next ante and includes loan penalties", () => {
  const history = orbitHistory(
    [
      {
        orbit: 1,
        handNumber: 4,
        players: [
          { playerId: "a", chips: 500, loans: 0 },
          { playerId: "b", chips: 300, loans: 0 },
        ],
      },
      {
        orbit: 2,
        handNumber: 8,
        players: [
          { playerId: "a", chips: 250, loans: 1 },
          { playerId: "b", chips: 750, loans: 0 },
        ],
      },
    ],
    { a: 400, b: 400 },
  )
  expect(history[1]!.startScores).toEqual({ a: 500, b: 300 })
  expect(history[1]!.endScores).toEqual({ a: 0, b: 750 })
  expect(history[1]!.endChips).toEqual({ a: 250, b: 750 })
  expect(history).toHaveLength(2)
})

it("new Basic fishing forecasts do not inspect hidden hands or deck order", () => {
  const { game, player } = fixture("basic")
  const original = chooseHeuristicAction(game.state, player.id, 24)
  const hidden = structuredClone(game.state)
  hidden.deck.reverse()
  const opponents = hidden.players.filter((p) => p.id !== player.id)
  const first = opponents[0]!.privateCards
  opponents[0]!.privateCards = opponents[1]!.privateCards
  opponents[1]!.privateCards = first
  expect(chooseHeuristicAction(hidden, player.id, 24)).toEqual(original)
})
