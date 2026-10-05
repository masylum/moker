import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import { stepHeuristic } from "../src/game/automation"
import { chooseHeuristicAction, defaultBotPolicy } from "../src/game/heuristic"
import { createDeck } from "../src/game/cards"

function fixture(mode: "basic" | "riichi") {
  const game = GameEngine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    { seed: "fishing-proposal", mode, heuristicSamples: 24 },
  )
  while (game.state.phase === "charleston") stepHeuristic(game)
  const player = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
  return { game, player }
}
describe("shared Check/Call fishing", () => {
  for (const mode of ["basic", "riichi"] as const)
    for (const type of ["check", "call", "bet"] as const) {
      it(`${mode} ${type} has the proposed free draw entitlement`, () => {
        const { game, player } = fixture(mode)
        if (type === "call") game.state.currentWager = 5
        const before = game.state.deck.length
        game.act(player.id, type === "bet" ? { type, amount: 5 } : { type })
        const fishes = type !== "bet"
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
  it("all-in betting still stops free fishing", () => {
    {
      const { game, player } = fixture("riichi")
      game.state.allInPlayerIds = [game.state.players.find((p) => p !== player)!.id]
      const before = game.state.deck.length
      game.act(player.id, { type: "check", drawSource: "deck" })
      expect(game.state.deck.length).toBe(before)
    }
  })
  it("values a free Call followed by a paid dig for Kong", () => {
    const { game, player } = fixture("riichi")
    const cards = createDeck("riichi")
    player.privateCards = [
      "bamboo-8-1",
      "bamboo-8-2",
      "bamboo-8-3",
      "dots-1-1",
      "characters-4-1",
      "dots-6-1",
    ].map((id) => cards.find((c) => c.id === id)!)
    player.publicCards = []
    game.state.discardA = [
      cards.find((c) => c.id === "joker-green")!,
      cards.find((c) => c.kind === "wind")!,
    ]
    game.state.discardB = []
    game.state.pot = 1000
    game.state.currentWager = 5
    const decision = chooseHeuristicAction(game.state, player.id, 24, {
      ...defaultBotPolicy("riichi"),
      betEquityFloor: 2,
      raiseEquityFloor: 2,
      bluffFrequency: 0,
    })
    const paid = decision.evaluations.find(
      (e) => e.action.type === "call" && e.action.useRiichiStick,
    )
    expect(paid?.action).toMatchObject({
      type: "call",
      drawSource: "discard-a",
      riichiDrawSource: "discard-a",
    })
    expect(paid!.estimatedWinRate).toBeGreaterThan(0.5)
    expect(paid!.estimatedWinRate).toBeLessThan(1)
  })
})

import { analyzePokerMath, tournamentRiskMultiplier } from "../src/game/heuristic"

it("protects late leaders, allows late trailers risk, and includes previous games and loan debt", () => {
  const { game, player } = fixture("riichi")
  game.state.handNumber = game.state.maxHands
  player.chips = 400
  game.state.players.filter((p) => p !== player).forEach((p) => (p.chips = 100))
  const leader = tournamentRiskMultiplier(game.state, player)
  player.loans = 2
  const trailer = tournamentRiskMultiplier(game.state, player)
  expect(trailer).toBeLessThan(leader)
  game.state.gameScores = [{ [player.id]: 1000 }]
  expect(tournamentRiskMultiplier(game.state, player)).toBeGreaterThan(trailer)
})

it("does not replenish its whole-hand raise budget on a new street", () => {
  const { game, player } = fixture("basic")
  player.handCommitted = 150
  player.chips = 50
  player.roundCommitted = 0
  const choice = chooseHeuristicAction(game.state, player.id, 24, {
    ...defaultBotPolicy("basic"),
    maxStackRisk: 0.7,
    allInEquityFloor: 2,
    betEquityFloor: 0,
    raiseEquityFloor: 0,
    bluffFrequency: 1,
  })
  expect(choice.evaluations.some((e) => e.action.type === "bet")).toBe(false)
})

it("conditions uncertain equity on public aggression without reading hidden cards", () => {
  const { game, player } = fixture("basic")
  const deck = createDeck("basic")
  player.privateCards = [
    ...deck.filter((c) => c.kind === "numbered" && c.rank === 7).slice(0, 2),
    ...deck.filter((c) => c.kind === "numbered" && c.rank === 9).slice(0, 2),
    deck.find((c) => c.kind === "wind")!,
    deck.find((c) => c.kind === "numbered" && c.rank === 1)!,
    deck.find((c) => c.kind === "numbered" && c.rank === 4)!,
  ]
  const quiet = analyzePokerMath(game.state, player.id, 24)
  game.state.bettingHistory = game.state.players
    .filter((p) => p !== player)
    .map((p) => ({ playerId: p.id, street: 1, type: "bet", amount: 25 }))
  const aggressive = analyzePokerMath(game.state, player.id, 24)
  expect(aggressive.showdownEquity).toBeLessThan(quiet.showdownEquity)
  expect(aggressive.effectiveSamples).toBeLessThan(24)
  const hidden = structuredClone(game.state)
  hidden.deck.reverse()
  const others = hidden.players.filter((p) => p.id !== player.id)
  ;[others[0]!.privateCards, others[1]!.privateCards] = [
    others[1]!.privateCards,
    others[0]!.privateCards,
  ]
  expect(analyzePokerMath(hidden, player.id, 24)).toEqual(aggressive)
})

it("recognizes the last Basic hand after eliminated dealer seats were skipped", () => {
  const { game, player } = fixture("basic")
  game.state.handNumber = 2
  game.state.dealerSteps = game.state.maxHands - 1
  player.chips = 600
  game.state.players.filter((p) => p !== player).forEach((p) => (p.chips = 20))
  const decision = chooseHeuristicAction(game.state, player.id, 24)
  expect(decision.action.type).toBe("fold")
  expect(decision.rationale).toContain("guarantees")
})

it("lets a last-hand trailer consider the necessary shove even below normal aggression thresholds", () => {
  const { game, player } = fixture("basic")
  game.state.dealerSteps = game.state.maxHands - 1
  // Give the trailer a credible winning hand; zero sampled outs should no
  // longer acquire artificial equity merely because the hand is final.
  const deck = createDeck("basic")
  player.privateCards = [
    ...["east", "south", "west", "north"].map((wind) =>
      deck.find((c) => c.kind === "wind" && c.wind === wind)!,
    ),
    ...[1, 4, 8].map((rank) => deck.find((c) => c.kind === "numbered" && c.rank === rank)!),
  ]
  player.publicCards = []
  player.chips = 150
  game.state.players.filter((p) => p !== player).forEach((p, i) => (p.chips = [350, 200, 80][i]!))
  const decision = chooseHeuristicAction(game.state, player.id, 24, {
    ...defaultBotPolicy("basic"),
    betEquityFloor: 2,
    raiseEquityFloor: 2,
    allInEquityFloor: 2,
    bluffFrequency: 0,
  })
  expect(decision.evaluations.some((e) => e.action.type === "bet" && e.action.amount === 150)).toBe(
    true,
  )
  expect(decision.action.type).toBe("bet")
  expect(decision.rationale).toContain("final tournament win")
})

it("does not invent substantial fold equity for a five-chip raise into a thousand-chip pot", () => {
  const { game, player } = fixture("riichi")
  const deck = createDeck("riichi")
  player.privateCards = [
    "wind-east-1",
    "wind-south-1",
    "wind-west-1",
    "wind-north-1",
    "dots-1-1",
    "bamboo-9-1",
  ].map((id) => deck.find((c) => c.id === id)!)
  game.state.currentWager = 100
  game.state.pot = 1000
  player.roundCommitted = 100
  const others = game.state.players.filter((p) => p !== player)
  others.forEach((p, i) => {
    p.roundCommitted = 100
    p.folded = i > 0
  })
  const decision = chooseHeuristicAction(game.state, player.id, 24)
  const tinyRaise = decision.evaluations.find(
    (e) => e.action.type === "bet" && e.action.amount === 105,
  )!
  expect(tinyRaise.estimatedFoldout).toBeLessThan(0.01)
  expect(tinyRaise.estimatedWinRate).toBeGreaterThan(0.5)
  expect(tinyRaise.estimatedWinRate).toBeLessThan(1)
})

it("folds an unwinnable all-in call instead of inventing equity from uncertainty", () => {
  const { game, player } = fixture("basic")
  const deck = createDeck("basic")
  player.privateCards = [1, 2, 4, 5, 7, 8, 9].map((rank) =>
    deck.find((c) => c.kind === "numbered" && c.rank === rank)!,
  )
  player.publicCards = []
  player.chips = 5
  const other = game.state.players.find((p) => p !== player)!
  other.publicCards = ["east", "south", "west", "north"].map((wind) =>
    deck.find((c) => c.kind === "wind" && c.wind === wind)!,
  )
  game.state.currentWager = 5
  game.state.pot = 500
  game.state.allInPlayerIds = [other.id]
  const decision = chooseHeuristicAction(game.state, player.id, 24)
  expect(analyzePokerMath(game.state, player.id, 24).certainLoss).toBe(true)
  expect(decision.evaluations.find((e) => e.action.type === "call")!.estimatedWinRate).toBe(0)
  expect(decision.action.type).toBe("fold")
})

it("banks a guaranteed Basic tournament win early, reserving every remaining ante", () => {
  const { game, player } = fixture("basic")
  game.state.config.orbits = 4
  game.state.maxHands = 16
  game.state.handNumber = 1
  game.state.dealerSteps = 0
  player.chips = 600
  game.state.pot = 50
  game.state.players.filter((p) => p !== player).forEach((p) => (p.chips = 50))
  expect(chooseHeuristicAction(game.state, player.id, 24).rationale).toContain(
    "including remaining antes",
  )
  player.chips = 450
  game.state.players.filter((p) => p !== player).forEach((p) => (p.chips = 100))
  expect(chooseHeuristicAction(game.state, player.id, 24).rationale).not.toContain("guarantees")
})

it("protects a final Riichi lead without reserving a removed Lotus fee", () => {
  const { game, player } = fixture("riichi")
  game.state.dealerSteps = game.state.maxHands - 1
  player.privateCards = createDeck("riichi")
    .filter((c) => c.kind === "numbered")
    .slice(0, 6)
  player.publicCards = []
  player.chips = 410
  game.state.pot = 30
  const others = game.state.players.filter((p) => p !== player)
  others.forEach((p, i) => {
    p.chips = i === 0 ? 360 : 0
    p.folded = i > 0
  })
  expect(chooseHeuristicAction(game.state, player.id, 24).rationale).toContain("guarantees")
  player.chips = 420
  others[0]!.chips = 350
  expect(chooseHeuristicAction(game.state, player.id, 24).rationale).toContain("guarantees")
})

it("recognizes a publicly unbeatable Riichi hand without imaginary Lotus outs", () => {
  const { game, player } = fixture("riichi")
  const deck = createDeck("riichi")
  player.privateCards = [
    "dots-1-1",
    "dots-3-1",
    "dots-5-1",
    "characters-2-1",
    "characters-6-1",
    "characters-9-1",
  ].map((id) => deck.find((c) => c.id === id)!)
  player.publicCards = []
  const opponent = game.state.players.find((p) => p !== player)!
  opponent.publicCards = ["wind-east-1", "wind-east-2", "wind-east-3", "joker-black"].map((id) =>
    deck.find((c) => c.id === id)!,
  )
  expect(analyzePokerMath(game.state, player.id, 24).showdownEquity).toBe(0)
})
