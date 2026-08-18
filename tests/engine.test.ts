import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import { blankFace, numberedFace } from "../src/game/cards"

const players = [
  { id: "p1", name: "A", controller: "human" as const },
  { id: "p2", name: "B", controller: "heuristic" as const },
  { id: "p3", name: "C", controller: "heuristic" as const },
  { id: "p4", name: "D", controller: "llm" as const },
]

describe("game lifecycle", () => {
  it("deals, charges, reveals, and preserves blue-stick conservation", () => {
    const engine = GameEngine.create(players, { seed: "setup" })
    expect(engine.state.handNumber).toBe(1)
    expect(engine.state.community).toHaveLength(4)
    expect(engine.state.players.every((player) => player.privateCards.length === 4)).toBe(true)
    expect(engine.state.players.every((player) => player.chips === 505)).toBe(true)
    expect(engine.state.pot).toBe(20)
    expect(totalBlue(engine)).toBe(8)
  })

  it("models draw then discard without revealing the deck early", () => {
    const engine = GameEngine.create(players, { seed: "draw" })
    const actor = engine.state.actingPlayerId!
    engine.act(actor, { type: "check", drawSource: "deck" })
    expect(engine.state.phase).toBe("discarding")
    expect(engine.state.players.find((player) => player.id === actor)?.privateCards).toHaveLength(5)
    const discard = engine.state.players.find((player) => player.id === actor)!.privateCards[0]!
    engine.discard(actor, { discardCardId: discard.id, discardPile: "a" })
    expect(engine.state.players.find((player) => player.id === actor)?.privateCards).toHaveLength(4)
    expect(engine.state.discardA.at(-1)?.id).toBe(discard.id)
  })

  it("makes betting shed a blue stick and folding gain one", () => {
    const engine = GameEngine.create(players, { seed: "sticks" })
    const bettor = engine.state.actingPlayerId!
    engine.act(bettor, { type: "bet", amount: 5 })
    expect(engine.state.players.find((player) => player.id === bettor)?.blueSticks).toBe(0)
    const folder = engine.state.actingPlayerId!
    const before = engine.state.players.find((player) => player.id === folder)!.blueSticks
    engine.act(folder, { type: "fold" })
    expect(engine.state.players.find((player) => player.id === folder)?.blueSticks).toBe(before + 1)
    expect(totalBlue(engine)).toBe(8)
  })

  it("enforces chip denominations and poker-style minimum raises", () => {
    const engine = GameEngine.create(players, { seed: "bet-sizing" })
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

  it("allows Riichi only with a first/second-street bet or raise and locks the hand", () => {
    const engine = GameEngine.create(players, { seed: "riichi" })
    const actor = engine.state.actingPlayerId!
    engine.act(actor, { type: "bet", amount: 5, riichi: true })
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    expect(player.riichi).toBe(true)
    expect(player.privateCards).toHaveLength(4)
  })

  it("enforces Loan cap, interest, and repayment", () => {
    const engine = GameEngine.create(players, { seed: "loans" })
    engine.takeLoan("p1")
    expect(() => engine.repayLoan("p1")).toThrow(/interest/)
    engine.takeLoan("p1")
    expect(() => engine.takeLoan("p1")).toThrow(/at most two/)
    engine.state.players.find((player) => player.id === "p1")!.loansCharged[0] = 1
    const chips = engine.state.players.find((player) => player.id === "p1")!.chips
    engine.repayLoan("p1")
    expect(engine.state.players.find((player) => player.id === "p1")!.chips).toBe(chips - 200)
  })

  it("exchanges a private Blank for a buried discard without changing lane order", () => {
    const engine = GameEngine.create(players, { seed: "blank" })
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

    expect(player.privateCards).toHaveLength(4)
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
    const originalDealer = engine.state.dealerIndex
    while (engine.state.phase === "betting")
      engine.act(engine.state.actingPlayerId!, { type: "fold" })
    expect(engine.state.phase).toBe("between-hands")
    expect(engine.state.dealerIndex).toBe((originalDealer + 1) % players.length)
    expect(engine.state.handWinners).toHaveLength(1)
    expect(engine.state.handResults).toHaveLength(1)
    expect(engine.state.handResults[0]).toMatchObject({ reason: "uncontested", pot: 20 })
    expect(engine.state.handResults[0]?.players.every((player) => player.cards.length === 4)).toBe(
      true,
    )
    expect(
      engine.state.handResults[0]?.players.reduce((sum, player) => sum + player.payout, 0),
    ).toBe(20)
    expect(engine.state.players.every((player) => player.chips % 5 === 0)).toBe(true)
  })
})

function totalBlue(engine: GameEngine) {
  return (
    engine.state.centerBlueSticks +
    engine.state.players.reduce((sum, player) => sum + player.blueSticks, 0)
  )
}
