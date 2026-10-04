import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import { createDeck, numberedFace, windFace } from "../src/game/cards"
import { stepHeuristic } from "../src/game/automation"
import type { Card, GameConfig } from "../src/game/types"

function engine(config: Partial<GameConfig> = {}, count = 4) {
  return GameEngine.create(
    Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
      controller: "heuristic" as const,
    })),
    { seed: "moker-v5", heuristicSamples: 2, ...config },
  )
}
function actor(game: GameEngine) {
  return game.state.players.find((p) => p.id === game.state.actingPlayerId)!
}
function finishPass(game: GameEngine) {
  while (game.state.phase === "charleston") {
    const p = actor(game)
    game.passCharleston(
      p.id,
      p.privateCards.slice(0, 2).map((c) => c.id),
    )
  }
}
function checkStreet(game: GameEngine) {
  while (game.state.phase === "betting") {
    game.act(actor(game).id, { type: "check" })
    finishFishing(game)
  }
}
function reveal(game: GameEngine) {
  while (game.state.phase === "exposing") {
    const p = actor(game)
    game.exposeCards(
      p.id,
      p.privateCards.slice(0, 2).map((c) => c.id),
    )
  }
}
function discardDrawn(game: GameEngine) {
  const pending = game.state.pendingDiscard!
  game.discard(pending.playerId, {
    discardCardId: pending.drawnCardId,
    discardPile: game.state.discardB.length ? "a" : "b",
  })
}
function finishFishing(game: GameEngine) {
  while (game.state.phase === "discarding") discardDrawn(game)
}
function callStreet(game: GameEngine) {
  while (game.state.phase === "betting") {
    game.act(actor(game).id, { type: "call" })
    finishFishing(game)
  }
}
function foldToWinner(game: GameEngine) {
  while (game.state.phase === "betting") game.act(actor(game).id, { type: "fold" })
}
function playToEnd(game: GameEngine) {
  let steps = 0
  while (game.state.phase !== "finished") {
    if (++steps > 2000) throw Error("stalled")
    stepHeuristic(game)
  }
}
function highHand(prefix: string, wind: "east" | "north"): Card[] {
  return [
    { ...windFace(wind), id: `${prefix}-wind` },
    ...([1, 3, 5, 7, 9] as const).map((rank, i) => ({
      ...numberedFace(i % 2 ? "dots" : "bamboo", rank),
      id: `${prefix}-${i}`,
    })),
  ]
}

describe("Moker v7 setup and streets", () => {
  it.each([2, 3, 4, 5, 6])(
    "sets up a %i-player Basic game with 102 cards, two seeded lanes and dealer first",
    (count) => {
      const g = engine({}, count)
      expect(g.state.phase).toBe("betting")
      expect(g.state.pot).toBe(count * 5)
      expect(
        g.state.players.every(
          (p) => p.chips === 195 && p.privateCards.length === 6 && p.riichiSticks === 0,
        ),
      ).toBe(true)
      expect(
        g.state.deck.length + count * 6 + g.state.discardA.length + g.state.discardB.length,
      ).toBe(102)
      expect(g.state.discardA).toHaveLength(1)
      expect(g.state.discardB).toHaveLength(1)
      expect(actor(g).id).toBe(g.state.players[g.state.dealerIndex]!.id)
    },
  )
  it("rejects unsupported player counts and obsolete saves", () => {
    expect(() => engine({}, 1)).toThrow(/./)
    expect(() => engine({}, 7)).toThrow(/./)
    const g = engine()
    expect(() => GameEngine.restore({ ...g.state, rulesVersion: 5 } as never)).toThrow(/obsolete/)
  })
  it("passes two cards simultaneously only in Riichi", () => {
    const g = engine({ mode: "riichi" })
    expect(g.state.phase).toBe("charleston")
    expect(g.state.players.every((p) => p.riichiSticks === 2)).toBe(true)
    const before = structuredClone(g.state.players)
    const p = actor(g)
    const ids = p.privateCards.slice(0, 2).map((c) => c.id)
    g.passCharleston(p.id, ids)
    expect(g.state.players.map((candidate) => candidate.privateCards)).toEqual(
      before.map((candidate) => candidate.privateCards),
    )
    expect("charlestonSelections" in g.publicView()).toBe(false)
    finishPass(g)
    expect(g.state.charlestonHistory).toHaveLength(4)
    for (const transfer of g.state.charlestonHistory) {
      const index = g.state.players.findIndex((candidate) => candidate.id === transfer.fromPlayerId)
      expect(transfer.toPlayerId).toBe(g.state.players[(index + 1) % 4]!.id)
    }
  })
  it("reveals 2/2 simultaneously before the next betting street", () => {
    const g = engine()
    for (const count of [2, 4]) {
      checkStreet(g)
      expect(g.state.phase).toBe("exposing")
      reveal(g)
      expect(g.state.players.every((p) => p.publicCards.length === count)).toBe(true)
    }
    checkStreet(g)
    expect(g.state.handResults[0]?.reason).toBe("showdown")
    expect(g.state.handResults[0]?.players.every((p) => p.cards.length === 6)).toBe(true)
  })
  it("Check and Call fish for free, defaulting to the deck", () => {
    const g = engine()
    let p = actor(g)
    expect(g.legalActions(p.id).map((a) => a.type)).toEqual(["fold", "check", "bet"])
    const deck = g.state.deck.length
    g.act(p.id, { type: "check" })
    expect(g.state.deck).toHaveLength(deck - 1)
    finishFishing(g)
    p = actor(g)
    g.act(p.id, { type: "check", drawSource: "deck" })
    expect(p.privateCards).toHaveLength(7)
    discardDrawn(g)
    expect(p.privateCards).toHaveLength(6)
    p = actor(g)
    g.act(p.id, { type: "bet", amount: 10 })
    const caller = actor(g)
    const before = g.state.deck.length
    g.act(caller.id, { type: "call" })
    expect(g.state.deck).toHaveLength(before - 1)
    expect(caller.roundCommitted).toBe(10)
  })
  it("requires bets in five-chip increments", () => {
    const g = engine()
    const p = actor(g)
    for (const amount of [1, 3, 6, 18])
      expect(() => g.act(p.id, { type: "bet", amount })).toThrow(/multiple of 5/)
    expect(g.legalActions(p.id).find((a) => a.type === "bet")?.minimum).toBe(5)
    g.act(p.id, { type: "bet", amount: 5 })
    expect(p.roundCommitted).toBe(5)
  })
  it("reopens betting after a raise and charges only the difference", () => {
    const g = engine()
    const first = actor(g)
    g.act(first.id, { type: "check" })
    finishFishing(g)
    g.act(actor(g).id, { type: "bet", amount: 10 })
    g.act(actor(g).id, { type: "call" })
    finishFishing(g)
    g.act(actor(g).id, { type: "call" })
    finishFishing(g)
    expect(actor(g).id).toBe(first.id)
    g.act(first.id, { type: "bet", amount: 15 })
    callStreet(g)
    expect(g.state.players.every((p) => p.chips === 180)).toBe(true)
    reveal(g)
    expect(actor(g).id).toBe(first.id)
    checkStreet(g)
    reveal(g)
    expect(actor(g).id).toBe(g.state.players[g.state.dealerIndex]!.id)
  })
  it("does not allow public cards to be discarded or selected twice", () => {
    const g = engine()
    checkStreet(g)
    const p = actor(g)
    expect(() =>
      g.exposeCards(p.id, [p.privateCards[0]!.id, p.privateCards[0]!.id, p.privateCards[1]!.id]),
    ).toThrow(/./)
    reveal(g)
    const fisher = actor(g)
    g.act(fisher.id, { type: "check", drawSource: "deck" })
    expect(() =>
      g.discard(fisher.id, { discardCardId: fisher.publicCards[0]!.id, discardPile: "a" }),
    ).toThrow(/concealed/)
  })
})

describe("Riichi fishing and locks", () => {
  it("spends one stick for a second check fish, then completes both actions separately", () => {
    const g = engine({ mode: "riichi" })
    finishPass(g)
    const p = actor(g)
    g.act(p.id, {
      type: "check",
      drawSource: "discard-a",
      useRiichiStick: true,
      riichiDrawSource: "discard-a",
    })
    expect(p.riichiSticks).toBe(1)
    expect(g.state.discardA).toHaveLength(0)
    discardDrawn(g)
    expect(g.state.phase).toBe("discarding")
    discardDrawn(g)
    expect(p.privateCards).toHaveLength(6)
    expect(g.state.drawDiscardHistory).toHaveLength(2)
  })
  it("uses a Blank at the exact buried position instead of drawing and discarding", () => {
    const g = engine({ mode: "riichi" })
    finishPass(g)
    const p = actor(g)
    const blank = createDeck().find((c) => c.kind === "blank")!
    p.privateCards[0] = blank
    g.state.discardA.push(g.state.deck.pop()!)
    const target = g.state.discardA[0]!
    const deck = g.state.deck.length
    g.act(p.id, {
      type: "check",
      blankExchange: { blankCardId: blank.id, pile: "a", cardIndex: 0 },
    })
    expect(g.state.discardA[0]).toEqual(blank)
    expect(p.privateCards).toContainEqual(target)
    expect(g.state.deck).toHaveLength(deck)
    expect(g.state.phase).toBe("betting")
  })
  it("Call + stick fishes twice; a bet may declare Riichi but cannot also fish", () => {
    const g = engine({ mode: "riichi" })
    finishPass(g)
    g.act(actor(g).id, { type: "bet", amount: 10 })
    const p = actor(g)
    g.act(p.id, { type: "call", useRiichiStick: true, drawSource: "deck" })
    expect(g.state.phase).toBe("discarding")
    discardDrawn(g)
    expect(g.state.phase).toBe("discarding")
    discardDrawn(g)
    expect(p.riichiSticks).toBe(1)
    const bettor = actor(g)
    expect(() =>
      g.act(bettor.id, {
        type: "bet",
        amount: 20,
        riichi: true,
        useRiichiStick: true,
        drawSource: "deck",
      }),
    ).toThrow(/./)
    g.act(bettor.id, { type: "bet", amount: 20, riichi: true })
    expect(bettor.riichi).toBe(true)
    expect(g.legalActions(actor(g).id).find((a) => a.type === "bet")?.canRiichi).toBe(false)
    callStreet(g)
    reveal(g)
    expect(actor(g).id).toBe(bettor.id)
    expect(g.legalActions(bettor.id).find((a) => a.type === "check")?.canUseRiichiStick).toBe(false)
    g.act(bettor.id, { type: "fold" })
    expect(bettor.riichi).toBe(false)
    expect(g.legalActions(actor(g).id).find((a) => a.type === "bet")?.canRiichi).toBe(true)
  })
  it("rejects curses and voluntary loans without changing the economy", () => {
    const g = engine({ mode: "riichi" })
    finishPass(g)
    const snapshot = structuredClone(g.state)
    expect(() => g.act(actor(g).id, { type: "bet", amount: 10, curseTargetId: "p1" })).toThrow(/./)
    expect(() => g.takeLoan(actor(g).id)).toThrow(/./)
    expect(() => g.repayLoan(actor(g).id)).toThrow(/./)
    expect(g.state).toEqual(snapshot)
  })
})

describe("All-in and exact ties", () => {
  it("caps the street, refunds overpayments, lowers a short call again, and skips to showdown", () => {
    const g = engine()
    const first = actor(g)
    g.act(first.id, { type: "bet", amount: 100 })
    const second = actor(g)
    second.chips = 30
    g.act(second.id, { type: "call" })
    expect(g.state.currentWager).toBe(30)
    expect(first.roundCommitted).toBe(30)
    expect(first.chips).toBe(165)
    expect(g.state.phase).toBe("discarding")
    finishFishing(g)
    const third = actor(g)
    third.chips = 12
    g.act(third.id, { type: "call" })
    expect(g.state.currentWager).toBe(12)
    expect(second.chips).toBe(18)
    expect(first.roundCommitted).toBe(12)
    expect(g.state.phase).toBe("discarding")
    finishFishing(g)
    expect(g.legalActions(actor(g).id).map((a) => a.type)).toEqual(["fold", "call"])
    g.act(actor(g).id, { type: "call" })
    finishFishing(g)
    expect(g.state.phase).toBe("between-hands")
    expect(g.state.handResults[0]?.pots).toHaveLength(1)
    expect(g.state.handResults[0]?.pot).toBe(68)
  })
  it("ante all-in finishes setup then immediately compares six-card hands", () => {
    const g = engine({ mode: "riichi", startingChips: 5 })
    expect(g.state.handResults).toHaveLength(1)
    expect(g.state.charlestonHistory).toHaveLength(0)
    expect(g.state.discardA).toHaveLength(1)
    expect(g.state.handResults[0]?.players.every((p) => p.cards.length === 6)).toBe(true)
  })
  it("splits ties equally without unused-card kickers or dealer remainder bonuses", () => {
    const g = engine({}, 3)
    g.state.players.forEach((p, i) => {
      p.privateCards = highHand(`p${i}`, i % 2 ? "east" : "north")
    })
    for (let i = 0; i < 3; i++) {
      checkStreet(g)
      if (g.state.phase === "exposing") reveal(g)
    }
    expect(g.state.handResults[0]?.winnerIds).toHaveLength(3)
    expect(g.state.players.map((p) => p.chips)).toEqual([200, 200, 200])
  })
  it("settles an uncontested win with no bonus or extra disclosure", () => {
    const g = engine({ mode: "riichi" })
    finishPass(g)
    foldToWinner(g)
    const result = g.state.handResults[0]!
    expect(result.lotusBluff).toBeNull()
    expect(result.players.every((p) => !p.lotusDisqualified)).toBe(true)
    expect(g.state.players.reduce((sum, p) => sum + p.chips, 0)).toBe(800)
    expect(g.publicView().handResults[0]!.players.every((p) => p.cards.length === 0)).toBe(true)
  })
  it("awards two Riichi supply sticks only for a sole pot win", () => {
    const g = engine({ mode: "riichi" })
    finishPass(g)
    const p = actor(g)
    g.act(p.id, { type: "bet", amount: 10, riichi: true })
    foldToWinner(g)
    expect(p.riichiSticks).toBe(4)
    const t = engine({ mode: "riichi" }, 2)
    finishPass(t)
    t.state.players.forEach((candidate, i) => (candidate.privateCards = highHand(`t${i}`, "east")))
    const r = actor(t)
    t.act(r.id, { type: "bet", amount: 10, riichi: true })
    t.act(actor(t).id, { type: "call" })
    finishFishing(t)
    reveal(t)
    for (let i = 0; i < 3; i++) {
      checkStreet(t)
      if (t.state.phase === "exposing") reveal(t)
    }
    expect(r.riichiSticks).toBe(2)
    expect(t.state.handResults[0]?.riichiSettlement.won).toBe(false)
  })
})

describe("Game length, elimination and tournaments", () => {
  it("starts with two sticks and adds two only when a new tournament game starts", () => {
    const g = engine({ mode: "riichi", tournamentGames: 3 }, 2)
    expect(g.state.players.map((p) => p.riichiSticks)).toEqual([2, 2])
    // Represent one spent stick and a Riichi win before the next game.
    g.state.players[0]!.riichiSticks = 1
    g.state.players[1]!.riichiSticks = 4
    for (let game = 1; game <= 2; game++) {
      for (let hand = 0; hand < 2; hand++) {
        finishPass(g)
        foldToWinner(g)
        g.startNextHand()
        const additions = game - 1 + (hand === 1 ? 1 : 0)
        expect(g.state.players.map((p) => p.riichiSticks)).toEqual([
          1 + additions * 2,
          4 + additions * 2,
        ])
      }
      expect(g.state.gameNumber).toBe(game + 1)
      expect(g.publicView(g.state.players[0]!.id).players[0]!.riichiSticks).toBe(1 + game * 2)
    }
  })
  it.each([2, 3, 4])("plays %i complete dealer orbits without resetting chips", (orbits) => {
    const g = engine({ orbits }, 2)
    const initialDealer = g.state.dealerIndex
    for (let round = 1; round < orbits * 2; round += 1) {
      expect(g.state.handNumber).toBe(round)
      expect(g.state.orbit).toBe(Math.ceil(round / 2))
      foldToWinner(g)
      const balances = g.state.players.map((p) => p.chips)
      expect(g.state.phase).toBe("between-hands")
      g.startNextHand()
      expect(g.state.players.map((p) => p.chips)).toEqual(balances.map((chips) => chips - 5))
    }
    expect(g.state.handNumber).toBe(orbits * 2)
    expect(g.state.orbit).toBe(orbits)
    foldToWinner(g)
    expect(g.state.phase).toBe("finished")
    expect(g.state.dealerIndex).toBe(initialDealer)
    expect(g.state.gameScores).toHaveLength(1)
  })
  it("defaults older saved configurations to one orbit", () => {
    const g = engine()
    const saved = structuredClone(g.state)
    Reflect.deleteProperty(saved.config, "orbits")
    expect(GameEngine.restore(saved).state.config.orbits).toBe(1)
  })
  it("eliminates only at the next ante and skips a departed dealer seat", () => {
    const g = engine()
    foldToWinner(g)
    const next = g.state.players[g.state.dealerIndex]!
    next.chips = 3
    g.startNextHand()
    expect(next.eliminated).toBe(true)
    expect(next.chips).toBe(3)
    expect(next.privateCards).toHaveLength(0)
    expect(actor(g).id).not.toBe(next.id)
    playToEnd(g)
    expect(g.state.gameScores).toHaveLength(1)
    expect(g.state.handNumber).toBeLessThanOrEqual(4)
  })
  it("issues a 200 loan only for an unaffordable ante and scores a 250 penalty", () => {
    const g = engine({ mode: "riichi" })
    finishPass(g)
    foldToWinner(g)
    const borrower = g.state.players[0]!
    borrower.chips = 3
    g.startNextHand()
    expect(borrower.loans).toBe(1)
    expect(borrower.chips).toBe(198)
    playToEnd(g)
    for (const p of g.state.players)
      expect(g.state.finalScores?.[p.id]).toBe(p.chips - 250 * p.loans)
  })
  it.each([2, 3, 4] as const)(
    "resets economy and sums adjusted scores across %i tournament games",
    (count) => {
      const g = engine({ mode: "riichi", tournamentGames: count }, 2)
      playToEnd(g)
      expect(g.state.gameScores).toHaveLength(count)
      expect(g.state.gameNumber).toBe(count)
      expect(g.state.orbitValue).toBe(count * 5)
      for (const p of g.state.players)
        expect(g.state.finalScores?.[p.id]).toBe(
          g.state.gameScores.reduce((sum, s) => sum + s[p.id]!, 0),
        )
      const starts = g.events.filter((e) => e.type === "hand-started")
      expect(new Set(starts.map((e) => (e.payload as { ante: number }).ante)).size).toBe(count)
    },
    30000,
  )
})

describe("Public information and rejected actions", () => {
  it("keeps folded and uncontested opponent hands private, even in the result history", () => {
    const g = engine()
    foldToWinner(g)
    const winner = g.state.handWinners[0]!
    const viewer = g.state.players.find((p) => p.id !== winner)!.id
    const view = g.publicView(viewer)
    expect(Array.isArray(view.players.find((p) => p.id === winner)!.privateCards)).toBe(false)
    expect(view.handResults[0]!.players.find((p) => p.playerId === winner)!.cards).toHaveLength(0)
    expect(
      view.handResults[0]!.players.find((p) => p.playerId === winner)!.openingCards,
    ).toHaveLength(0)
    expect(
      g.publicView(undefined, true).handResults[0]!.players.find((p) => p.playerId === winner)!
        .cards,
    ).toHaveLength(6)
  })
  it("rejects an invalid fishing source atomically", () => {
    const g = engine()
    g.state.discardA = []
    const snapshot = structuredClone(g.state)
    const events = g.events.length
    expect(() => g.act(actor(g).id, { type: "check", drawSource: "discard-a" })).toThrow(/empty/)
    expect(g.state).toEqual(snapshot)
    expect(g.events).toHaveLength(events)
  })
  it("leaves previous streets in the pot when the next street is capped", () => {
    const g = engine()
    g.act(actor(g).id, { type: "bet", amount: 10 })
    callStreet(g)
    reveal(g)
    const p = actor(g)
    p.chips = 3
    g.act(p.id, { type: "bet", amount: 3 })
    callStreet(g)
    expect(g.state.handResults[0]!.pot).toBe(20 + 40 + 12)
  })
  it("allows an all-in with fractional chips received from an exact pot split", () => {
    const g = engine()
    const p = actor(g)
    p.chips = 10 / 3
    g.act(p.id, { type: "bet", amount: p.chips })
    expect(g.state.currentWager).toBe(10 / 3)
  })
})
