import { readFileSync } from "node:fs"
import type { GameState } from "../src/game/types"
import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import {
  analyzePokerMath,
  chooseHeuristicAction,
  continuationRiskCost,
} from "../src/game/heuristic"
import { createDeck } from "../src/game/cards"
import { stepHeuristic } from "../src/game/automation"

function fixture(mode: "basic" | "riichi" = "riichi", tournamentGames: 1 | 4 = 1) {
  const game = GameEngine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    { seed: "call-loan-regression", mode, orbits: 4, tournamentGames, heuristicSamples: 24 },
  )
  while (game.state.phase === "charleston") stepHeuristic(game)
  const player = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
  return { game, player }
}
function finishHand(game: GameEngine) {
  while (game.state.phase === "betting") game.act(game.state.actingPlayerId!, { type: "fold" })
}

describe("one loan per game", () => {
  it("lends once, then eliminates on a later unaffordable ante without throwing or changing debt", () => {
    const { game, player } = fixture()
    finishHand(game)
    player.chips = 3
    game.startNextHand()
    expect(player.loans).toBe(1)
    expect(player.chips).toBe(198)
    while (game.state.phase === "charleston") stepHeuristic(game)
    finishHand(game)
    player.chips = 3
    game.state.dealerSteps = 4 // Crossing an orbit does not restore borrowing.
    game.startNextHand()
    expect(game.state.orbit).toBe(2)
    expect(player.loans).toBe(1)
    expect(player.eliminated).toBe(true)
    expect(player.folded).toBe(true)
    expect(player.chips).toBe(3)
    expect(player.privateCards).toHaveLength(0)
    expect(game.state.pendingPlayerIds).not.toContain(player.id)
    expect(
      game.events.filter((e) => e.type === "loan-taken" && e.actorId === player.id),
    ).toHaveLength(1)
  })
  it("keeps a borrower who can pay and restores the allowance only at a new tournament game", () => {
    const { game, player } = fixture("riichi", 4)
    finishHand(game)
    player.loans = 1
    player.chips = 6
    game.startNextHand()
    expect(player.chips).toBe(1)
    expect(player.eliminated).toBe(false)
    game.state.phase = "between-hands"
    game.state.dealerSteps = game.state.maxHands
    player.eliminated = true
    game.startNextHand()
    expect(game.state.gameNumber).toBe(2)
    expect(player.loans).toBe(0)
    expect(player.eliminated).toBe(false)
    expect(player.chips).toBe(290)
  })
  it("carries negative loan-adjusted game scores into the tournament total", () => {
    const { game } = fixture("riichi", 2)
    for (let gameNumber = 1; gameNumber <= 2; gameNumber++) {
      while (game.state.phase === "charleston") stepHeuristic(game)
      finishHand(game)
      const borrowers = game.state.players.slice(1)
      for (const player of borrowers) {
        player.chips = 3
        player.loans = 1
      }
      game.startNextHand()
      for (const player of borrowers) {
        expect(game.state.gameScores[gameNumber - 1]![player.id]).toBe(-247)
      }
      if (gameNumber === 1) game.startNextHand()
    }
    expect(game.state.phase).toBe("finished")
    for (const player of game.state.players.slice(1)) {
      expect(game.state.finalScores![player.id]).toBe(-494)
    }
  })

  it("finishes safely when exhausted borrowers leave only one player, retaining adjusted scores", () => {
    const { game } = fixture()
    finishHand(game)
    const survivors = game.state.players
    survivors.slice(1).forEach((p) => {
      p.chips = 3
      p.loans = 1
    })
    const cash = survivors[0]!.chips
    game.startNextHand()
    expect(game.state.phase).toBe("finished")
    expect(survivors[0]!.chips).toBe(cash)
    for (const p of survivors.slice(1)) {
      expect(p.eliminated).toBe(true)
      expect(game.state.finalScores![p.id]).toBe(-247)
    }
    expect(game.state.pot).toBe(0)
  })
})

describe("Call equity and continuation", () => {
  it("values the chance to discard a Single Lotus when an all-in call includes fishing", () => {
    const { game, player } = fixture()
    const deck = createDeck("riichi")
    player.privateCards = [
      deck.find((c) => c.kind === "flower")!,
      ...deck.filter((c) => c.kind === "numbered").slice(0, 6),
    ]
    player.publicCards = []
    player.chips = 5
    game.state.currentWager = 5
    game.state.pot = 1000
    game.state.allInPlayerIds = [game.state.players.find((p) => p !== player)!.id]
    expect(analyzePokerMath(game.state, player.id, 24).showdownEquity).toBe(0)
    const d = chooseHeuristicAction(game.state, player.id, 24)
    expect(d.evaluations.find((e) => e.action.type === "call")!.estimatedWinRate).toBeGreaterThan(0)
    expect(d.action.type).toBe("call")
  })
  it("conditions on raise size and Riichi signals without reading opposing hidden cards", () => {
    const { game, player } = fixture()
    const other = game.state.players.find((p) => p !== player)!
    const deck = createDeck("riichi")
    player.privateCards = [
      ...deck.filter((c) => c.kind === "numbered" && c.rank === 7).slice(0, 2),
      ...deck.filter((c) => c.kind === "numbered" && c.rank === 9).slice(0, 2),
      deck.find((c) => c.kind === "wind")!,
      deck.find((c) => c.kind === "numbered" && c.rank === 1)!,
      deck.find((c) => c.kind === "numbered" && c.rank === 4)!,
    ]
    player.publicCards = []
    const base = {
      playerId: other.id,
      street: 1 as const,
      type: "bet" as const,
      amount: 5,
      cost: 5,
      potBefore: 100,
      actorChipsBefore: 195,
    }
    game.state.bettingHistory = [base]
    const small = analyzePokerMath(game.state, player.id, 24)
    game.state.bettingHistory = [{ ...base, amount: 150, cost: 150, riichi: true }]
    const strong = analyzePokerMath(game.state, player.id, 24)
    expect(strong.showdownEquity).toBeLessThan(small.showdownEquity)
    const hidden = structuredClone(game.state)
    hidden.deck.reverse()
    const others = hidden.players.filter((p) => p.id !== player.id)
    ;[others[0]!.privateCards, others[1]!.privateCards] = [
      others[1]!.privateCards,
      others[0]!.privateCards,
    ]
    expect(analyzePokerMath(hidden, player.id, 24)).toEqual(strong)
  })
  it("charges only incremental next-ante risk and respects guaranteed wins, refunds and the last hand", () => {
    const { game, player } = fixture()
    player.chips = 20
    expect(continuationRiskCost(game.state, player, 20, 0.4)).toBeCloseTo(30)
    expect(continuationRiskCost(game.state, player, 15, 0.4)).toBe(0)
    expect(continuationRiskCost(game.state, player, 20, 1)).toBe(0)
    player.chips = 3
    expect(continuationRiskCost(game.state, player, 3, 0.4)).toBe(0)
    player.chips = 200
    const other = game.state.players.find((p) => p !== player)!
    other.chips = 20
    expect(continuationRiskCost(game.state, player, 200, 0.4, [other])).toBe(0)
    player.chips = 20
    player.loans = 1
    expect(continuationRiskCost(game.state, player, 20, 0.4)).toBeCloseTo(12)
    game.state.dealerSteps = game.state.maxHands - 1
    expect(continuationRiskCost(game.state, player, 20, 0.4)).toBe(0)
  })
})

it("includes fishing when evaluating the archived Chow + Eye all-in Call", () => {
  const state = JSON.parse(
    readFileSync(new URL("./fixtures/riichi-large-call.json", import.meta.url), "utf8"),
  ) as GameState
  state.rulesVersion = 9 // Archived classic fixture; the classic rules are unchanged.
  const decision = chooseHeuristicAction(state, "p4", 24)
  const call = decision.evaluations.find((e) => e.action.type === "call")!
  expect(call.estimatedWinRate).toBeLessThan(0.5)
  expect(call.rationale).toContain("next-ante risk cost")
  expect(decision.action.type).toBe("call")
  expect(decision.action.type === "call" && decision.action.drawSource).toBeTruthy()
})

describe("optional Charleston loans", () => {
  function lowStack() {
    return GameEngine.create(
      [1, 2].map((n) => ({ id: `p${n}`, name: `Player ${n}`, controller: "human" as const })),
      { seed: "charleston-loan", mode: "riichi", startingChips: 100 },
    )
  }
  it("offers a loan below 100 without consuming a pass, and excludes it from winnings", () => {
    const game = lowStack()
    const player = game.state.players[0]!
    const pending = [...game.state.pendingPlayerIds]
    expect(player.chips).toBe(95)
    game.takeLoan(player.id)
    expect(player.chips).toBe(295)
    expect(player.loans).toBe(1)
    expect(game.state.pendingPlayerIds).toEqual(pending)
    expect(game.events.at(-1)?.type).toBe("loan-taken")
    while (game.state.phase === "charleston") stepHeuristic(game)
    finishHand(game)
    expect(game.state.handResults[0]!.players.reduce((sum, p) => sum + p.netChips!, 0)).toBe(0)
    expect(
      game.state.handResults[0]!.players.find((p) => p.playerId === player.id)!.openingChips,
    ).toBe(100)
  })
  it("rejects 100 chips and a second loan without changing the balance", () => {
    const game = lowStack()
    const player = game.state.players[0]!
    player.chips = 100
    expect(() => game.takeLoan(player.id)).toThrow("below 100")
    player.chips = 99
    game.takeLoan(player.id)
    player.chips = 20
    expect(() => game.takeLoan(player.id)).toThrow("once per game")
    expect(player.chips).toBe(20)
    expect(player.loans).toBe(1)
  })
  it("rejects loans outside Charleston and for eliminated players", () => {
    const game = lowStack()
    const player = game.state.players[0]!
    player.eliminated = true
    expect(() => game.takeLoan(player.id)).toThrow("A loan is available")
    player.eliminated = false
    while (game.state.phase === "charleston") stepHeuristic(game)
    expect(() => game.takeLoan(player.id)).toThrow("during Charleston")
    expect(player.loans).toBe(0)
    expect(player.chips).toBe(95)
  })
})
