import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import { stepHeuristic } from "../src/game/automation"
import { createDeck } from "../src/game/cards"
import { handRank } from "../src/game/hand-ranks"

describe("streamlined complete games", () => {
  for (const mode of ["basic", "riichi"] as const) {
    it.each([2, 3, 4, 5, 6])(
      `${mode}: conserves every physical card at %i seats`,
      (count) => {
        const game = GameEngine.create(
          Array.from({ length: count }, (_, i) => ({
            id: `p${i}`,
            name: `P${i}`,
            controller: "heuristic" as const,
          })),
          { seed: `six-card-${mode}-${count}`, mode, heuristicSamples: 4 },
        )
        const expectedIds = createDeck(mode)
          .map((card) => card.id)
          .sort()
        let steps = 0
        while (game.state.phase !== "finished") {
          if (++steps > 3000) throw new Error("Game stalled")
          const state = game.state
          const cards = [
            ...state.deck,
            ...state.discardA,
            ...state.discardB,
            ...state.removedCards,
            ...state.players.flatMap((p) => [...p.privateCards, ...p.publicCards]),
          ]
          expect(cards.map((c) => c.id).sort()).toEqual(expectedIds)
          expect(cards.every((c) => c.kind !== "flower")).toBe(true)
          expect(state.street).toBeLessThanOrEqual(3)
          for (const p of state.players.filter(
            (candidate) => !candidate.folded && !candidate.eliminated,
          )) {
            expect(p.privateCards.length + p.publicCards.length).toBe(
              6 + Number(state.pendingDiscard?.playerId === p.id),
            )
            expect(
              state.phase !== "betting" || p.publicCards.length === (state.street - 1) * 2,
            ).toBe(true)
          }
          stepHeuristic(game)
        }
        for (const hand of game.state.handResults) {
          expect(hand.lotusBluff).toBeNull()
          for (const player of hand.players.filter((p) => !p.eliminated)) {
            expect(player.cards).toHaveLength(6)
            expect(player.score.selectedCardIds.length).toBeLessThanOrEqual(4)
            expect(
              hand.reason !== "showdown" ||
                hand.allInPlayerIds.length > 0 ||
                player.folded ||
                player.publicCards.length === 4,
            ).toBe(true)
          }
        }
      },
      30_000,
    )
  }

  it("allows Riichi on streets one and two, and rejects it atomically on the final street", () => {
    const game = GameEngine.create(
      ["a", "b"].map((id) => ({ id, name: id, controller: "human" as const })),
      { seed: "riichi-deadline", mode: "riichi" },
    )
    while (game.state.phase === "charleston") stepHeuristic(game)
    const advanceStreet = () => {
      while (game.state.phase === "betting") {
        const actor = game.state.actingPlayerId!
        game.act(actor, { type: "check" })
        game.discard(actor, {
          discardCardId: game.state.pendingDiscard!.drawnCardId,
          discardPile: "a",
        })
      }
      while (game.state.phase === "exposing") {
        const actor = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
        game.exposeCards(
          actor.id,
          actor.privateCards.slice(0, 2).map((c) => c.id),
        )
      }
    }
    for (let street = 1; street <= 2; street++) {
      expect(game.state.street).toBe(street)
      expect(
        game.legalActions(game.state.actingPlayerId!).find((a) => a.type === "bet")?.canRiichi,
      ).toBe(true)
      advanceStreet()
    }
    expect(game.state.street).toBe(3)
    const id = game.state.actingPlayerId!
    expect(game.legalActions(id).find((a) => a.type === "bet")?.canRiichi).toBe(false)
    const before = structuredClone(game.state)
    expect(() => game.act(id, { type: "bet", amount: 5, riichi: true })).toThrow(
      "Riichi is not available",
    )
    expect(game.state).toEqual(before)
    advanceStreet()
    expect(game.state.handResults).toHaveLength(1)
  })

  it("uses the measured mode-specific order for Pung and four-card Long Chow", () => {
    expect(handRank("pung", "basic")).toBeGreaterThan(handRank("long-chow", "basic"))
    expect(handRank("pung", "riichi")).toBeLessThan(handRank("long-chow", "riichi"))
  })
})
