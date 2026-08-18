import { describe, expect, it } from "vitest"
import { blankFace } from "../src/game/cards"
import { analyzeStud7Balance } from "../src/stud7/balance"
import { Stud7Engine } from "../src/stud7/engine"
import { chooseStud7Action } from "../src/stud7/heuristic"
import { simulateStud7 } from "../src/stud7/simulation"

const players = [
  { id: "p1", name: "A", controller: "human" as const },
  { id: "p2", name: "B", controller: "heuristic" as const },
  { id: "p3", name: "C", controller: "heuristic" as const },
  { id: "p4", name: "D", controller: "heuristic" as const },
]

describe("Stud7 prototype", () => {
  it("starts with two hole cards and one public card", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-deal" })

    expect(engine.state.variant).toBe("stud7")
    expect(engine.state.street).toBe(1)
    expect(
      engine.state.players.every(
        (player) =>
          player.cards.filter(({ visibility }) => visibility === "private").length === 2 &&
          player.cards.filter(({ visibility }) => visibility === "public").length === 1,
      ),
    ).toBe(true)
  })

  it("reveals public cards on streets two through four and deals the last card private", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-streets" })

    finishCheckingRound(engine)
    expectCardCounts(engine, 2, 2, 2)
    finishCheckingRound(engine)
    expectCardCounts(engine, 3, 3, 2)
    finishCheckingRound(engine)
    expectCardCounts(engine, 4, 4, 2)
    finishCheckingRound(engine)
    expectCardCounts(engine, 5, 4, 3)
    expect(engine.state.players.every((player) => player.cards.length === 7)).toBe(true)
  })

  it("scores each contender's seven owned cards with no community board", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-showdown" })

    for (let street = 1; street <= 5; street += 1) {
      finishCheckingRound(engine)
    }

    const result = engine.state.handResults.at(-1)!
    expect(engine.state.phase).toBe("between-hands")
    expect(result.reason).toBe("showdown")
    expect(
      result.players.every(
        (player) => player.publicCards.length === 4 && player.privateCards.length === 3,
      ),
    ).toBe(true)
  })

  it("hides opponents' hole cards but always exposes their upcards", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-view" })
    const view = engine.publicView("p1")
    const own = view.players.find((player) => player.id === "p1")!
    const opponent = view.players.find((player) => player.id === "p2")!

    expect(own.publicCards).toHaveLength(1)
    expect(own.privateCards).toHaveLength(2)
    expect(opponent.publicCards).toHaveLength(1)
    expect(opponent.privateCards).toEqual({ count: 2 })
    const opponentHoleId = engine.state.players
      .find((player) => player.id === "p2")!
      .cards.find(({ visibility }) => visibility === "private")!.card.id
    expect(JSON.stringify(view)).not.toContain(opponentHoleId)
  })

  it("makes a deck replacement inherit the discarded card's visibility", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-inherit" })
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    const publicCard = player.cards.find(({ visibility }) => visibility === "public")!
    engine.act(actor, { type: "check", drawSource: "deck" })
    const drawnId = engine.state.pendingDiscard!.drawnCard.id
    engine.discard(actor, { discardCardId: publicCard.card.id, discardPile: "a" })

    expect(player.cards.find(({ card }) => card.id === drawnId)?.visibility).toBe("public")
    expect(engine.state.drawDiscardHistory.at(-1)?.replacementVisibility).toBe("public")
  })

  it("keeps a deck replacement private when a hole card is discarded", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-private" })
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    const privateCard = player.cards.find(({ visibility }) => visibility === "private")!
    engine.act(actor, { type: "check", drawSource: "deck" })
    const drawnId = engine.state.pendingDiscard!.drawnCard.id
    engine.discard(actor, { discardCardId: privateCard.card.id, discardPile: "a" })

    expect(player.cards.find(({ card }) => card.id === drawnId)?.visibility).toBe("private")
  })

  it("makes every Fished replacement public, even when it replaces a hole card", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-fishing" })
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    const privateCard = player.cards.find(({ visibility }) => visibility === "private")!
    const fished = engine.state.deck.pop()!
    engine.state.discardA.push(fished)
    engine.act(actor, { type: "check", drawSource: "discard-a" })

    const opponentView = engine.publicView("p2")
    expect(opponentView.pendingDiscard).toMatchObject({ drawnCard: { id: fished.id } })

    engine.discard(actor, { discardCardId: privateCard.card.id, discardPile: "a" })
    expect(player.cards.find(({ card }) => card.id === fished.id)?.visibility).toBe("public")
    expect(player.cards.filter(({ visibility }) => visibility === "private")).toHaveLength(1)
    expect(player.cards.filter(({ visibility }) => visibility === "public")).toHaveLength(2)
  })

  it("keeps deck draws private while the actor is choosing a discard", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-pending" })
    const actor = engine.state.actingPlayerId!
    engine.act(actor, { type: "check", drawSource: "deck" })
    const observer = engine.state.players.find((player) => player.id !== actor)!.id

    expect(engine.publicView(observer).pendingDiscard).toMatchObject({ drawnCard: null })
    expect(engine.publicView(actor).pendingDiscard).toMatchObject({
      drawnCard: { id: engine.state.pendingDiscard!.drawnCard.id },
    })
  })

  it("turns a private Blank exchange into a public card", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-blank" })
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    const privateIndex = player.cards.findIndex(({ visibility }) => visibility === "private")
    player.cards[privateIndex] = {
      card: { id: "forced-stud7-blank", ...blankFace() },
      visibility: "private",
    }
    const claimed = engine.state.deck.pop()!
    engine.state.discardA.push(claimed)
    engine.act(actor, {
      type: "check",
      drawSource: "deck",
      blankExchange: { blankCardId: "forced-stud7-blank", pile: "a", cardIndex: 0 },
    })

    expect(player.cards.find(({ card }) => card.id === claimed.id)?.visibility).toBe("public")
    expect(engine.state.discardA[0]?.id).toBe("forced-stud7-blank")
  })

  it("allows Riichi before, but not on, the final street", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-riichi" })
    const firstActor = engine.state.actingPlayerId!
    expect(engine.legalActions(firstActor).find((action) => action.type === "bet")).toMatchObject({
      canRiichi: true,
    })

    const final = Stud7Engine.create(players, { seed: "stud7-final-riichi" })
    finishCheckingRound(final)
    finishCheckingRound(final)
    finishCheckingRound(final)
    finishCheckingRound(final)
    const actor = final.state.actingPlayerId!

    expect(final.legalActions(actor).find((action) => action.type === "bet")).toMatchObject({
      canRiichi: false,
    })
    expect(() => final.act(actor, { type: "bet", amount: 5, riichi: true })).toThrow(
      /Riichi is not available/,
    )
  })

  it("awards two blue sticks for folding under the default Stud7 rules", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-fold-sticks" })
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    const totalBefore = totalBlueSticks(engine)
    const playerBefore = player.blueSticks
    engine.act(actor, { type: "fold" })

    expect(player.blueSticks).toBe(playerBefore + 2)
    expect(totalBlueSticks(engine)).toBe(totalBefore)
  })

  it("draws after Riichi but forces the drawn card to be discarded", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-locked-riichi" })
    const riichiPlayerId = engine.state.actingPlayerId!
    engine.act(riichiPlayerId, { type: "bet", amount: 5, riichi: true })
    finishCallingRound(engine)
    expect(engine.state.street).toBe(2)
    expect(engine.state.actingPlayerId).toBe(riichiPlayerId)
    const player = engine.state.players.find(({ id }) => id === riichiPlayerId)!
    const lockedCardIds = player.cards.map(({ card }) => card.id)
    engine.act(riichiPlayerId, { type: "check", drawSource: "deck" })
    const drawnId = engine.state.pendingDiscard!.drawnCard.id

    expect(() =>
      engine.discard(riichiPlayerId, { discardCardId: lockedCardIds[0]!, discardPile: "a" }),
    ).toThrow(/must discard the drawn card/)

    engine.discard(riichiPlayerId, { discardCardId: drawnId, discardPile: "a" })
    expect(player.cards.map(({ card }) => card.id)).toEqual(lockedCardIds)
  })

  it("can reproduce the original Riichi skip behavior for balance comparisons", () => {
    const engine = Stud7Engine.create(players, {
      seed: "stud7-baseline-riichi",
      foldBlueSticks: 1,
      riichiDrawMode: "skip",
    })
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find(({ id }) => id === actor)!
    player.riichi = true
    engine.act(actor, { type: "check", drawSource: "deck" })

    expect(engine.state.phase).toBe("betting")
    expect(engine.state.pendingDiscard).toBeNull()
  })

  it("produces legal deterministic heuristic decisions", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-heuristic", heuristicSamples: 2 })
    const actor = engine.state.actingPlayerId!
    const decision = chooseStud7Action(engine.state, actor, 2)
    const replay = chooseStud7Action(engine.state, actor, 2)

    expect(engine.legalActions(actor).some((action) => action.type === decision.action.type)).toBe(
      true,
    )
    expect(decision).toEqual(replay)
  })

  it("folds instead of calling with chips reserved for mandatory charges", () => {
    const engine = Stud7Engine.create(players, { seed: "stud7-liquidity", heuristicSamples: 1 })
    const opener = engine.state.actingPlayerId!
    engine.act(opener, { type: "bet", amount: 50 })
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find((candidate) => candidate.id === actor)!
    player.chips = 95
    player.blueSticks = 4
    player.loans = 2
    player.loansCharged = [1, 1]

    const decision = chooseStud7Action(engine.state, actor, 1)

    expect(decision.action).toEqual({ type: "fold" })
    expect(decision.evaluations.map(({ action }) => action.type)).not.toContain("call")
  })

  it("replays complete simulations independently", { timeout: 60_000 }, () => {
    const first = simulateStud7({ seed: "stud7-complete", playerCount: 2, heuristicSamples: 1 })
    const second = simulateStud7({ seed: "stud7-complete", playerCount: 2, heuristicSamples: 1 })

    expect(first.state.phase).toBe("finished")
    expect(first.state.finalScores).toEqual(second.state.finalScores)
    expect(first.events.map((event) => [event.type, event.actorId, event.payload])).toEqual(
      second.events.map((event) => [event.type, event.actorId, event.payload]),
    )
  })

  it("collects deterministic balance statistics without retaining decisions", () => {
    const result = analyzeStud7Balance({
      games: 1,
      profile: "test-baseline",
      seed: "stud7-balance-test",
      seedPrefix: "stud7-balance-test",
      playerCount: 2,
      heuristicSamples: 1,
      fastMode: true,
      foldBlueSticks: 1,
      riichiDrawMode: "skip",
    })

    expect(result.gamesCompleted).toBe(1)
    expect(result.hands).toBe(12)
    expect(result.initialPots.count).toBe(12)
    expect(
      Object.values(result.actions).reduce((total, count) => total + count, 0),
    ).toBeGreaterThan(0)
    expect(result.tiles.blank).toMatchObject({ label: "Blank" })
  })
})

function finishCheckingRound(engine: Stud7Engine): void {
  const street = engine.state.street

  while (engine.state.phase === "betting" && engine.state.street === street) {
    const actor = engine.state.actingPlayerId!
    engine.act(actor, { type: "check", drawSource: "deck" })
    const drawnId = engine.state.pendingDiscard!.drawnCard.id
    const discardPile = engine.state.discardA.length === 0 ? "a" : "b"
    engine.discard(actor, { discardCardId: drawnId, discardPile })
  }
}

function finishCallingRound(engine: Stud7Engine): void {
  const street = engine.state.street

  while (engine.state.phase === "betting" && engine.state.street === street) {
    const actor = engine.state.actingPlayerId!
    const player = engine.state.players.find(({ id }) => id === actor)!
    const type = engine.state.currentWager === player.roundCommitted ? "check" : "call"
    engine.act(actor, { type, drawSource: "deck" })

    if (engine.state.phase === "discarding") {
      const drawnId = engine.state.pendingDiscard!.drawnCard.id
      const discardPile = engine.state.discardA.length === 0 ? "a" : "b"
      engine.discard(actor, { discardCardId: drawnId, discardPile })
    }
  }
}

function totalBlueSticks(engine: Stud7Engine): number {
  return (
    engine.state.centerBlueSticks +
    engine.state.players.reduce((total, player) => total + player.blueSticks, 0)
  )
}

function expectCardCounts(
  engine: Stud7Engine,
  street: number,
  publicCount: number,
  privateCount: number,
): void {
  expect(engine.state.street).toBe(street)
  expect(
    engine.state.players.every(
      (player) =>
        player.cards.filter(({ visibility }) => visibility === "public").length === publicCount &&
        player.cards.filter(({ visibility }) => visibility === "private").length === privateCount,
    ),
  ).toBe(true)
}
