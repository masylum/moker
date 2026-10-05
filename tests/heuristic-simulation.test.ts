import { describe, expect, it } from "vitest"
import { blankFace, numberedFace, windFace } from "../src/game/cards"
import { stepHeuristic } from "../src/game/automation"
import { GameEngine } from "../src/game/engine"
import {
  DEFAULT_BOT_POLICY,
  analyzePokerMath,
  chooseHeuristicAction,
  chooseHeuristicCharleston,
  chooseHeuristicExposure,
} from "../src/game/heuristic"
import { simulateGame, simulateMany } from "../src/game/simulation"

function engine(seed = "bots-v3") {
  return GameEngine.create(
    ["p1", "p2", "p3", "p4"].map((id) => ({ id, name: id, controller: "heuristic" as const })),
    { seed, heuristicSamples: 8, mode: "riichi" },
  )
}

function finishCharleston(game: GameEngine) {
  while (game.state.phase === "charleston") stepHeuristic(game)
}

describe("rules-v5 bot intelligence", () => {
  it("makes a legal two-card Charleston choice and completes all four passes", () => {
    const game = engine("bot-charleston")
    const playerId = game.state.actingPlayerId!
    const choice = chooseHeuristicCharleston(game.state, playerId)
    expect(choice.cardIds).toHaveLength(2)
    expect(new Set(choice.cardIds).size).toBe(2)
    expect(
      choice.cardIds.every((id) =>
        game.state.players
          .find((player) => player.id === playerId)!
          .privateCards.some((card) => card.id === id),
      ),
    ).toBe(true)
    finishCharleston(game)
    expect(game.state.phase).toBe("betting")
    expect(game.state.charlestonHistory).toHaveLength(4)
  })

  it("selects exactly the scheduled reveal count and keeps a Blank available for exchange", () => {
    const game = engine("bot-reveal")
    finishCharleston(game)
    while (game.state.phase === "betting") {
      const actor = game.state.actingPlayerId!
      game.act(actor, { type: "check", drawSource: "deck" })
      const pending = game.state.pendingDiscard!
      game.discard(actor, {
        discardCardId: pending.drawnCardId,
        discardPile:
          game.state.discardA.length === 0 ? "a" : game.state.discardB.length === 0 ? "b" : "a",
      })
    }
    const player = game.state.players.find(
      (candidate) => candidate.id === game.state.actingPlayerId,
    )!
    player.privateCards[0] = { ...blankFace(), id: "forced-blank" }
    const choice = chooseHeuristicExposure(game.state, player.id)
    expect(choice.cardIds).toHaveLength(2)
    expect(choice.cardIds).not.toContain("forced-blank")
  })

  it("accounts for all six cards and only public opponent information in equity", () => {
    const game = engine("bot-equity")
    finishCharleston(game)
    const actor = game.state.actingPlayerId!
    const math = analyzePokerMath(game.state, actor, 32)
    expect(math.showdownEquity).toBeGreaterThanOrEqual(0)
    expect(math.showdownEquity).toBeLessThanOrEqual(1)
    expect(math.expectedScore).toBeGreaterThanOrEqual(1)
    expect(
      game
        .publicView(actor)
        .players.filter((player) => player.id !== actor)
        .every((player) => !Array.isArray(player.privateCards)),
    ).toBe(true)
  })

  it("keeps bot decisions unchanged when unseen hands and deck order change", () => {
    const game = GameEngine.create(
      ["p1", "p2", "p3"].map((id) => ({ id, name: id, controller: "heuristic" as const })),
      { seed: "hidden-information", mode: "basic", heuristicSamples: 8 },
    )
    const actor = game.state.actingPlayerId!
    const before = analyzePokerMath(game.state, actor, 8)
    const decision = chooseHeuristicAction(game.state, actor, 8)
    for (const opponent of game.state.players.filter((p) => p.id !== actor)) {
      opponent.privateCards = opponent.privateCards.map((card) => {
        const replacement = game.state.deck.pop()!
        game.state.deck.unshift(card)
        return replacement
      })
    }
    game.state.deck.reverse()
    expect(analyzePokerMath(game.state, actor, 8)).toEqual(before)
    expect(chooseHeuristicAction(game.state, actor, 8)).toEqual(decision)
  })

  it("chooses legal actions and supplies a fishing source for Checks", () => {
    const game = engine("bot-actions")
    finishCharleston(game)
    const callDrawsAreValid: boolean[] = []
    for (let index = 0; index < 8 && game.state.phase === "betting"; index += 1) {
      const actor = game.state.actingPlayerId!
      const decision = chooseHeuristicAction(game.state, actor, 8)
      expect(["check", "call", "bet", "fold"]).toContain(decision.action.type)
      if (decision.action.type === "check") {
        callDrawsAreValid.push(Boolean(decision.action.drawSource || decision.action.blankExchange))
      }
      stepHeuristic(game)
      if (game.state.phase === "discarding") stepHeuristic(game)
    }
    expect(callDrawsAreValid.every(Boolean)).toBe(true)
  })

  it("never declares Riichi even with a strong made hand", () => {
    const game = engine("bot-riichi")
    finishCharleston(game)
    const actor = game.state.actingPlayerId!
    const player = game.state.players.find((candidate) => candidate.id === actor)!
    player.privateCards = [
      ...(["east", "south", "west", "north"] as const).map((wind) => ({
        ...windFace(wind),
        id: wind,
      })),
      { ...numberedFace("dots", 1), id: "d1" },
      { ...numberedFace("bamboo", 9), id: "b9" },
    ]
    const policy = {
      ...DEFAULT_BOT_POLICY,
      betEquityFloor: 0,
      survivalRiskPenalty: 0,
    }
    const decision = chooseHeuristicAction(game.state, actor, 32, policy)
    expect(
      decision.evaluations.some(
        (evaluation) => evaluation.action.type === "bet" && evaluation.action.riichi,
      ),
    ).toBe(false)
  })

  it("does not borrow to face an all-in", () => {
    const game = engine("bot-all-in-loan")
    finishCharleston(game)
    const bettor = game.state.players.find((player) => player.id === game.state.actingPlayerId)!
    game.act(bettor.id, { type: "bet", amount: bettor.chips })
    const caller = game.state.actingPlayerId!
    game.state.players.find((player) => player.id === caller)!.chips = 10
    const player = game.state.players.find((p) => p.id === caller)!
    const loans = player.loans
    game.act(caller, { type: "call" })
    expect(player.loans).toBe(loans)
    expect(player.chips).toBe(0)
  })

  it("is deterministic for a seed and preserves chip accounting through complete games", () => {
    const left = simulateGame({ seed: "deterministic-v3", heuristicSamples: 4 })
    const right = simulateGame({ seed: "deterministic-v3", heuristicSamples: 4 })
    expect(right.state.finalScores).toEqual(left.state.finalScores)
    expect(right.state.handResults.map((hand) => hand.winnerIds)).toEqual(
      left.state.handResults.map((hand) => hand.winnerIds),
    )
    for (const result of [left, right]) {
      expect(result.state.handResults.length).toBeLessThanOrEqual(4)
      expect(
        result.decisions.every((decision) =>
          ["check", "call", "bet", "fold"].includes(decision.action.type),
        ),
      ).toBe(true)
      expect(
        result.decisions.every(
          (decision) =>
            decision.action.type === "fold" ||
            (Number(Boolean(decision.action.useRiichiStick)) +
              Number(Boolean(decision.action.curseTargetId)) +
              Number(Boolean(decision.action.removeCurse)) <=
              1 &&
              !(
                decision.action.type === "bet" &&
                decision.action.riichi &&
                (decision.action.curseTargetId || decision.action.removeCurse)
              ) &&
              decision.action.curseTargetId !== decision.playerId),
        ),
      ).toBe(true)
      expect(
        result.state.players.every((player) => Number.isFinite(player.chips) && player.chips >= 0),
      ).toBe(true)
    }
  })

  it("produces diverse winners and valid 4-public/2-concealed showdowns in a batch", () => {
    const results = simulateMany(6, { seedPrefix: "health-smoke-v3", heuristicSamples: 2 })
    const winners = new Set(
      results.map(
        (result) => Object.entries(result.state.finalScores!).sort((a, b) => b[1] - a[1])[0]![0],
      ),
    )
    expect(winners.size).toBeGreaterThan(1)
    for (const resultHand of results
      .flatMap((result) => result.state.handResults)
      .filter((candidateHand) => candidateHand.reason === "showdown")) {
      for (const player of resultHand.players.filter((candidate) => !candidate.folded)) {
        expect(player.cards).toHaveLength(6)
        expect(resultHand.allInPlayerIds.length > 0 || player.publicCards.length === 4).toBe(true)
      }
    }
  }, 30_000)
})
