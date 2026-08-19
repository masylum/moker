import { describe, expect, it } from "vitest"
import { ensureOpeningLiquidity } from "../src/game/automation"
import { GameEngine } from "../src/game/engine"
import { blankFace, flowerFace, jokerFace, numberedFace } from "../src/game/cards"
import { agentRulebook } from "../src/game/rulebook"

const players = [
  { id: "p1", name: "A", controller: "human" as const },
  { id: "p2", name: "B", controller: "heuristic" as const },
  { id: "p3", name: "C", controller: "heuristic" as const },
  { id: "p4", name: "D", controller: "llm" as const },
]

describe("game lifecycle", () => {
  it("gives the LLM the complete revised street and ladder rules", () => {
    const rules = agentRulebook()

    expect(rules).toContain("four betting streets")
    expect(rules).toContain("Street 1 reveals no community cards")
    expect(rules).toContain("14 Crosswinds")
    expect(rules).toContain("16 Imperial Garden")
    expect(rules).toContain("two different natural Flowers plus a separate natural Eye")
    expect(rules).toContain("fold gains two blue sticks")
    expect(rules).toContain("scrap the entire current board")
    expect(rules).toContain("20-chip Flower bluff bonus")
    expect(rules).toContain("never the final street")
    expect(rules).toContain("Bams")
    expect(rules).toContain("Dots")
    expect(rules).toContain("Cracks")
    expect(rules).toContain("Only one player may declare Riichi")
    expect(rules).toContain("Whether the win reaches showdown or everyone folds")
  })

  it("deals, charges, reveals, and preserves blue-stick conservation", () => {
    const engine = GameEngine.create(players, { seed: "setup" })
    expect(engine.state.handNumber).toBe(1)
    expect(engine.state.phase).toBe("seeding")
    expect(engine.state.street).toBe(0)
    expect(engine.state.community).toHaveLength(0)
    expect(engine.state.players.every((player) => player.privateCards.length === 4)).toBe(true)
    expect(engine.state.players.every((player) => player.chips === 505)).toBe(true)
    expect(engine.state.pot).toBe(20)
    expect(totalBlue(engine)).toBe(8)

    finishSeeding(engine)
    expect(engine.state.phase).toBe("betting")
    expect(engine.state.street).toBe(1)
    expect(engine.state.players.every((player) => player.privateCards.length === 3)).toBe(true)
    expect(engine.state.seedDiscardHistory).toHaveLength(4)
    expect(engine.state.discardA.length + engine.state.discardB.length).toBe(4)
  })

  it("models draw then discard without revealing the deck early", () => {
    const engine = GameEngine.create(players, { seed: "draw" })
    finishSeeding(engine)
    const actor = engine.state.actingPlayerId!
    engine.act(actor, { type: "check", drawSource: "deck" })
    expect(engine.state.phase).toBe("discarding")
    expect(engine.state.players.find((player) => player.id === actor)?.privateCards).toHaveLength(4)
    const discard = engine.state.players.find((player) => player.id === actor)!.privateCards[0]!
    engine.discard(actor, { discardCardId: discard.id, discardPile: "a" })
    expect(engine.state.players.find((player) => player.id === actor)?.privateCards).toHaveLength(3)
    expect(engine.state.discardA.at(-1)?.id).toBe(discard.id)
  })

  it("makes betting shed a blue stick and folding gain two", () => {
    const engine = GameEngine.create(players, { seed: "sticks" })
    finishSeeding(engine)
    const bettor = engine.state.actingPlayerId!
    engine.act(bettor, { type: "bet", amount: 5 })
    expect(engine.state.players.find((player) => player.id === bettor)?.blueSticks).toBe(0)
    const folder = engine.state.actingPlayerId!
    const before = engine.state.players.find((player) => player.id === folder)!.blueSticks
    engine.act(folder, { type: "fold" })
    expect(engine.state.players.find((player) => player.id === folder)?.blueSticks).toBe(before + 2)
    expect(totalBlue(engine)).toBe(8)
  })

  it("repays a seasoned Loan while preserving the next opening charge", () => {
    const engine = GameEngine.create(players, { seed: "loan-repayment" })
    const player = engine.state.players[0]!
    engine.takeLoan(player.id)
    player.loansCharged[0] = 1

    ensureOpeningLiquidity(engine)

    expect(player.loans).toBe(0)
    expect(player.chips).toBe(505)
    expect(engine.events.at(-1)).toMatchObject({ type: "loan-repaid", actorId: player.id })
  })

  it("enforces chip denominations and poker-style minimum raises", () => {
    const engine = GameEngine.create(players, { seed: "bet-sizing" })
    finishSeeding(engine)
    const bettor = engine.state.actingPlayerId!

    expect(engine.legalActions(bettor).find((action) => action.type === "bet")).toMatchObject({
      minimum: 5,
    })
    expect(() => engine.act(bettor, { type: "bet", amount: 1 })).toThrow(/multiple of 5/)

    engine.act(bettor, { type: "bet", amount: 5 })
    const raiser = engine.state.actingPlayerId!

    expect(engine.legalActions(raiser).find((action) => action.type === "raise")).toMatchObject({
      minimum: 10,
    })
    expect(() => engine.act(raiser, { type: "raise", amount: 7 })).toThrow(/multiple of 5/)

    engine.act(raiser, { type: "raise", amount: 15 })
    const next = engine.state.actingPlayerId!

    expect(engine.legalActions(next).find((action) => action.type === "raise")).toMatchObject({
      minimum: 25,
    })
  })

  it("allows Riichi with an early-street bet and locks the three-card hand", () => {
    const engine = GameEngine.create(players, { seed: "riichi" })
    finishSeeding(engine)
    const actor = engine.state.actingPlayerId!
    engine.act(actor, { type: "bet", amount: 5, riichi: true })
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    expect(player.riichi).toBe(true)
    expect(player.privateCards).toHaveLength(3)
  })

  it("allows only one Riichi declaration in a hand", () => {
    const engine = GameEngine.create(players, { seed: "single-riichi" })
    finishSeeding(engine)
    const declarer = engine.state.actingPlayerId!
    engine.act(declarer, { type: "bet", amount: 5, riichi: true })
    const challenger = engine.state.actingPlayerId!

    expect(engine.legalActions(challenger).find((action) => action.type === "raise")).toMatchObject(
      {
        canRiichi: false,
      },
    )
    expect(() => engine.act(challenger, { type: "raise", amount: 10, riichi: true })).toThrow(
      /Riichi is not available/,
    )
  })

  it("settles a Riichi win at showdown and records every recipient", () => {
    const engine = GameEngine.create(players, { seed: "riichi-showdown" })
    finishSeeding(engine)
    const winner = engine.state.players[0]!
    winner.privateCards = [
      { id: "flower-plum", ...flowerFace("plum") },
      { id: "flower-orchid", ...flowerFace("orchid") },
      { id: "flower-bamboo", ...flowerFace("bamboo") },
    ]
    engine.state.deck = engine.state.deck.filter(
      (card) => !winner.privateCards.some((privateCard) => privateCard.id === card.id),
    )
    winner.riichi = true
    winner.blueSticks = 3
    for (const opponent of engine.state.players.filter((player) => player.id !== winner.id)) {
      opponent.blueSticks = 1
    }
    engine.state.centerBlueSticks = 2
    engine.state.street = 4
    engine.state.phase = "betting"
    engine.state.currentWager = 0
    engine.state.pendingPlayerIds = engine.state.players.map((player) => player.id)
    engine.state.actingPlayerId = winner.id

    finishCheckingRound(engine)

    const result = engine.state.handResults.at(-1)!
    expect(result.winnerIds).toContain(winner.id)
    expect(result.riichiSettlement).toEqual({
      winnerId: winner.id,
      returnedToCenter: 3,
      recipientIds: ["p2", "p3", "p4"],
    })
    expect(winner.blueSticks).toBe(0)
    expect(engine.state.players.slice(1).every((player) => player.blueSticks === 2)).toBe(true)
    expect(engine.state.centerBlueSticks).toBe(2)
    expect(totalBlue(engine)).toBe(8)
  })

  it("returns remaining Riichi sticks after an uncontested win", () => {
    const engine = GameEngine.create(players.slice(0, 2), { seed: "riichi-foldout" })
    finishSeeding(engine)
    const winnerId = engine.state.actingPlayerId!
    const winner = engine.state.players.find((player) => player.id === winnerId)!
    const opponent = engine.state.players.find((player) => player.id !== winnerId)!
    winner.blueSticks = 3
    opponent.blueSticks = 0
    engine.state.centerBlueSticks = 1

    engine.act(winnerId, { type: "bet", amount: 5, riichi: true })
    engine.act(opponent.id, { type: "fold" })

    expect(engine.state.handResults.at(-1)?.riichiSettlement).toEqual({
      winnerId,
      returnedToCenter: 2,
      recipientIds: [],
    })
    expect(winner.blueSticks).toBe(0)
    expect(engine.state.centerBlueSticks).toBe(2)
    expect(totalBlue(engine)).toBe(4)
  })

  it("reveals 3-1-1 community cards and forbids Riichi on the final street", () => {
    const engine = GameEngine.create(players, { seed: "streets" })
    finishSeeding(engine)

    finishCheckingRound(engine)
    expect(engine.state.street).toBe(2)
    expect(engine.state.community).toHaveLength(3)

    finishCheckingRound(engine)
    expect(engine.state.street).toBe(3)
    expect(engine.state.community).toHaveLength(4)

    finishCheckingRound(engine)
    expect(engine.state.street).toBe(4)
    expect(engine.state.community).toHaveLength(5)

    const actor = engine.state.actingPlayerId!
    expect(engine.legalActions(actor).find((action) => action.type === "bet")).toMatchObject({
      canRiichi: false,
    })
    expect(() => engine.act(actor, { type: "bet", amount: 5, riichi: true })).toThrow(
      /Riichi is not available/,
    )
  })

  it("enforces Loan cap, interest, and repayment", () => {
    const engine = GameEngine.create(players, { seed: "loans" })
    engine.takeLoan("p1")
    expect(() => engine.repayLoan("p1")).toThrow(/interest/)
    engine.takeLoan("p1")
    engine.takeLoan("p1")
    expect(() => engine.takeLoan("p1")).toThrow(/at most 3/)
    engine.state.players.find((player) => player.id === "p1")!.loansCharged[0] = 1
    const chips = engine.state.players.find((player) => player.id === "p1")!.chips
    engine.repayLoan("p1")
    expect(engine.state.players.find((player) => player.id === "p1")!.chips).toBe(chips - 200)
  })

  it("eliminates a fully loaned player who cannot pay the next opening charge", () => {
    const engine = GameEngine.create(players, { seed: "mandatory-debt" })
    engine.state.phase = "between-hands"
    const player = engine.state.players[0]!
    player.chips = 0
    player.loans = 3
    player.loansCharged = [1, 1, 1]
    player.blueSticks = 3

    engine.startNextHand()

    expect(player.eliminated).toBe(true)
    expect(player.eliminatedAtHand).toBe(2)
    expect(player.blueSticks).toBe(0)
    expect(engine.state.centerBlueSticks).toBe(7)
    expect(engine.state.players.filter((candidate) => !candidate.eliminated)).toHaveLength(3)
    expect(engine.state.phase).toBe("seeding")
  })

  it("exchanges a private Blank for a buried discard without changing lane order", () => {
    const engine = GameEngine.create(players, { seed: "blank" })
    finishSeeding(engine)
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    player.privateCards[0] = { id: "forced-blank", ...blankFace() }
    engine.state.discardA = [
      { id: "lane-1", ...numberedFace("bamboo", 3) },
      { id: "buried", ...numberedFace("dots", 7) },
      { id: "lane-top", ...numberedFace("characters", 9) },
    ]

    engine.act(actor, {
      type: "check",
      drawSource: "deck",
      blankExchange: { blankCardId: "forced-blank", pile: "a", cardIndex: 1 },
    })

    expect(player.privateCards).toHaveLength(3)
    expect(player.privateCards.some((card) => card.id === "buried")).toBe(true)
    expect(engine.state.discardA.map((card) => card.id)).toEqual([
      "lane-1",
      "forced-blank",
      "lane-top",
    ])
    expect(engine.state.phase).not.toBe("discarding")
    expect(engine.state.drawDiscardHistory.at(-1)).toMatchObject({
      playerId: actor,
      source: "blank-exchange",
      discardIndex: 1,
    })
  })

  it("splits an uncontested hand and advances the dealer", () => {
    const engine = GameEngine.create(players, { seed: "foldout" })
    finishSeeding(engine)
    const originalDealer = engine.state.dealerIndex
    while (engine.state.phase === "betting")
      engine.act(engine.state.actingPlayerId!, { type: "fold" })
    expect(engine.state.phase).toBe("between-hands")
    expect(engine.state.dealerIndex).toBe((originalDealer + 1) % players.length)
    expect(engine.state.handWinners).toHaveLength(1)
    expect(engine.state.handResults).toHaveLength(1)
    expect(engine.state.handResults[0]).toMatchObject({ reason: "uncontested", pot: 20 })
    expect(engine.state.handResults[0]?.players.every((player) => player.cards.length === 3)).toBe(
      true,
    )
    expect(
      engine.state.handResults[0]?.players.reduce((sum, player) => sum + player.payout, 0),
    ).toBe(20)
    expect(engine.state.players.every((player) => player.chips % 5 === 0)).toBe(true)
  })

  it("pays the single-Flower fold bonus from every opponent", () => {
    const engine = GameEngine.create(players, { seed: "flower-bluff" })
    finishSeeding(engine)
    const winnerId = engine.state.actingPlayerId!
    const winner = engine.state.players.find((player) => player.id === winnerId)!
    winner.privateCards[0] = { id: "forced-flower", ...flowerFace("plum") }
    const before = Object.fromEntries(
      engine.state.players.map((player) => [player.id, player.chips]),
    )

    while (engine.state.phase === "betting") {
      const actor = engine.state.actingPlayerId!
      if (actor === winnerId) {
        engine.act(actor, { type: "bet", amount: 5 })
      } else {
        engine.act(actor, { type: "fold" })
      }
    }

    const result = engine.state.handResults.at(-1)!
    expect(result.flowerBonus).toEqual({ winnerId, perOpponent: 20, total: 60 })
    expect(winner.chips).toBe(before[winnerId]! - 5 + 25 + 60)
    for (const opponent of engine.state.players.filter((player) => player.id !== winnerId)) {
      expect(opponent.chips).toBe(before[opponent.id]! - 20)
    }
  })

  it("scraps a Flower board and resumes from a fresh flop without resetting the pot", () => {
    const engine = GameEngine.create(players, { seed: "flower-board" })
    finishSeeding(engine)
    for (const player of engine.state.players) player.riichi = true
    const flower = engine.state.deck.find((card) => card.kind === "flower")!
    const normals = engine.state.deck.filter((card) => card.kind !== "flower").slice(0, 5)
    const chosen = new Set([flower.id, ...normals.map((card) => card.id)])
    const remaining = engine.state.deck.filter((card) => !chosen.has(card.id))
    const replacement = normals.slice(0, 3)
    const failedFlop = [normals[3]!, flower, normals[4]!]
    engine.state.deck = [...remaining, ...replacement.toReversed(), ...failedFlop.toReversed()]
    const potBefore = engine.state.pot

    finishCheckingRound(engine)

    expect(engine.state.phase).toBe("betting")
    expect(engine.state.street).toBe(2)
    expect(engine.state.community.map((card) => card.id)).toEqual(
      replacement.map((card) => card.id),
    )
    expect(engine.state.community.every((card) => card.kind !== "flower")).toBe(true)
    expect(engine.state.scrappedCommunity.map((card) => card.id)).toEqual(
      failedFlop.map((card) => card.id),
    )
    expect(engine.state.boardResetCount).toBe(1)
    expect(engine.state.pot).toBe(potBefore)
  })

  it("disqualifies exactly one private Flower at showdown", () => {
    const engine = GameEngine.create(players, { seed: "flower-showdown" })
    finishSeeding(engine)
    engine.state.street = 4
    engine.state.phase = "betting"
    engine.state.community = [
      { id: "board-nine", ...numberedFace("characters", 9) },
      { id: "board-joker", ...jokerFace("red") },
      { id: "board-b1", ...numberedFace("bamboo", 1) },
      { id: "board-d4", ...numberedFace("dots", 4) },
      { id: "board-d7", ...numberedFace("dots", 7) },
    ]
    const disqualified = engine.state.players[0]!
    disqualified.privateCards = [
      { id: "hole-flower", ...flowerFace("plum") },
      { id: "hole-nine-1", ...numberedFace("characters", 9) },
      { id: "hole-nine-2", ...numberedFace("characters", 9) },
    ]
    for (const player of engine.state.players) player.riichi = true
    engine.state.pendingPlayerIds = engine.state.players.map((player) => player.id)
    engine.state.actingPlayerId = engine.state.pendingPlayerIds[0]!

    finishCheckingRound(engine)

    expect(disqualified.score?.total).toBe(13)
    expect(engine.state.handWinners).not.toContain(disqualified.id)
    expect(engine.state.handResults.at(-1)?.reason).toBe("showdown")
    expect(
      engine.state.handResults.at(-1)?.players.find((player) => player.playerId === disqualified.id)
        ?.flowerDisqualified,
    ).toBe(true)
  })
})

function totalBlue(engine: GameEngine) {
  return (
    engine.state.centerBlueSticks +
    engine.state.players.reduce((sum, player) => sum + player.blueSticks, 0)
  )
}

function finishCheckingRound(engine: GameEngine): void {
  const street = engine.state.street

  while (engine.state.phase === "betting" && engine.state.street === street) {
    const actor = engine.state.actingPlayerId!
    engine.act(actor, { type: "check", drawSource: "deck" })
    if (engine.state.phase === "discarding") {
      const discard = engine.state.players.find((player) => player.id === actor)!.privateCards[0]!
      const discardPile = engine.state.discardA.length === 0 ? "a" : "b"
      engine.discard(actor, { discardCardId: discard.id, discardPile })
    }
  }
}

function finishSeeding(engine: GameEngine): void {
  while (engine.state.phase === "seeding") {
    const actor = engine.state.actingPlayerId!
    const card = engine.state.players.find((player) => player.id === actor)!.privateCards[0]!
    const discardPile = engine.state.discardA.length === 0 ? "a" : "b"
    engine.seedDiscard(actor, { discardCardId: card.id, discardPile })
  }
}
