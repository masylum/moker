import { describe, expect, it } from "vitest"
import { createDeck, dragonFace, numberedFace, windFace } from "../src/game/cards"
import type { CardFace } from "../src/game/types"
import { scoreHand } from "../src/game/scoring"
import { GameEngine } from "../src/game/engine"
import { stepHeuristic } from "../src/game/automation"
import {
  analyzePokerMath,
  chooseHeuristicAction,
  chooseHeuristicDiscard,
  DEFAULT_BOT_POLICY,
} from "../src/game/heuristic"

function fixture() {
  const game = GameEngine.create(
    [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}`, controller: "heuristic" })),
    { seed: "bot-fishing-fixture", mode: "riichi", heuristicSamples: 24 },
  )
  while (game.state.phase === "charleston") stepHeuristic(game)
  const player = game.state.players.find((p) => p.id === game.state.actingPlayerId)!
  const deck = createDeck("riichi")
  player.privateCards = [
    "bamboo-8-1",
    "bamboo-8-2",
    "bamboo-8-3",
    "dots-1-1",
    "characters-4-1",
    "dots-6-1",
  ].map((id) => deck.find((c) => c.id === id)!)
  player.publicCards = []
  game.state.discardA = []
  game.state.discardB = []
  return { game, player, deck }
}
const passive = {
  ...DEFAULT_BOT_POLICY,
  betEquityFloor: 2,
  raiseEquityFloor: 2,
  bluffFrequency: 0,
}

describe("bot utility and fishing regressions", () => {
  it("protects a guaranteed final lead, including previous tournament games", () => {
    const { game, player } = fixture()
    game.state.handNumber = game.state.maxHands
    game.state.gameNumber = 3
    game.state.config.tournamentGames = 3
    game.state.gameScores = [
      Object.fromEntries(game.state.players.map((p) => [p.id, p === player ? 600 : 0])),
    ]
    player.chips = 300
    for (const other of game.state.players.filter((p) => p !== player)) other.chips = 100
    game.state.pot = 100
    const locked = chooseHeuristicAction(game.state, player.id, 24, passive)
    expect(locked.action.type).toBe("fold")
    expect(locked.rationale).toContain("guarantees")
    game.state.handNumber -= 1
    expect(chooseHeuristicAction(game.state, player.id, 24, passive).rationale).not.toContain(
      "guarantees",
    )
    game.state.handNumber += 1
    game.state.gameScores = []
    expect(chooseHeuristicAction(game.state, player.id, 24, passive).rationale).not.toContain(
      "guarantees",
    )
  })

  it("caps short calls and refunds only this street, preserving earlier pot money", () => {
    const { game, player } = fixture()
    const others = game.state.players.filter((p) => p !== player)
    player.roundCommitted = 20
    player.chips = 10
    others[0]!.roundCommitted = 100
    others[1]!.roundCommitted = 80
    others[2]!.roundCommitted = 0
    game.state.currentWager = 100
    game.state.pot = 1000
    const math = analyzePokerMath(game.state, player.id, 24)
    expect(math.toCall).toBe(10)
    expect(math.potBeforeCall).toBe(880)
    expect(math.potAfterCall).toBe(890)
    expect(math.potOdds).toBeCloseTo(10 / 890)
  })
  it("values Kong highly without treating it as certain", () => {
    const { game, player, deck } = fixture()
    player.privateCards[3] = deck.find((c) => c.id === "joker-green")!
    game.state.currentWager = player.chips
    game.state.pot = 1000
    const decision = chooseHeuristicAction(game.state, player.id, 24)
    expect(decision.action.type).not.toBe("fold")
    expect(
      decision.evaluations
        .filter((e) => e.action.type !== "fold")
        .every((e) => e.estimatedWinRate < 1),
    ).toBe(true)
  })
  it("uses the free Call fish without wasting a stick on an already available Joker", () => {
    const { game, player, deck } = fixture()
    const target = deck.find((c) => c.id === "joker-green")!
    game.state.discardA = [target]
    game.state.currentWager = 5
    const decision = chooseHeuristicAction(game.state, player.id, 24, passive)
    const calls = decision.evaluations.filter((e) => e.action.type === "call")
    const paid = calls.find((e) => e.action.type === "call" && e.action.useRiichiStick)!
    const free = calls.find((e) => e.action.type === "call" && !e.action.useRiichiStick)!
    expect(paid).toBeUndefined()
    expect(free.estimatedWinRate).toBeGreaterThan(0.5)
    expect(free.estimatedWinRate).toBeLessThan(1)
    expect(decision.action.type === "call" && Boolean(decision.action.useRiichiStick)).toBe(false)
  })
  it("uses two Check draws to dig past an unhelpful top and keeps the lane clear", () => {
    const { game, player, deck } = fixture()
    const target = deck.find((c) => c.id === "joker-green")!
    game.state.pot = 1000
    const junk = deck.find((c) => c.kind === "wind")!
    game.state.discardA = [target, junk]
    game.state.discardB = [deck.find((c) => c.kind === "dragon")!]
    const decision = chooseHeuristicAction(game.state, player.id, 24, passive)
    expect(decision.action).toMatchObject({
      type: "check",
      useRiichiStick: true,
      drawSource: "discard-a",
      riichiDrawSource: "discard-a",
    })
    game.act(player.id, decision.action)
    const discard = chooseHeuristicDiscard(game.state, player.id)
    expect(discard.discardPile).toBe("b")
    game.discard(player.id, discard)
    game.discard(player.id, chooseHeuristicDiscard(game.state, player.id))
    expect(player.privateCards.some((c) => c.id === target.id)).toBe(true)
  })
  it("fishes a Blank then exchanges it for a buried Joker without discarding the Blank", () => {
    const { game, player, deck } = fixture()
    const target = deck.find((c) => c.id === "joker-green")!
    game.state.pot = 1000
    const blank = deck.find((c) => c.kind === "blank")!
    game.state.discardA = [blank]
    game.state.discardB = [target, ...deck.filter((c) => c.kind === "wind").slice(0, 3)]
    const decision = chooseHeuristicAction(game.state, player.id, 24, passive)
    expect(decision.action).toMatchObject({
      type: "check",
      useRiichiStick: true,
      drawSource: "discard-a",
      riichiBlankExchange: { blankCardId: blank.id, pile: "b", cardIndex: 0 },
    })
    game.act(player.id, decision.action)
    const discard = chooseHeuristicDiscard(game.state, player.id)
    expect(discard.discardCardId).not.toBe(blank.id)
    game.discard(player.id, discard)
    expect(player.privateCards.some((c) => c.id === target.id)).toBe(true)
    expect(game.state.discardB[0]!.id).toBe(blank.id)
  })
  it("values a visible winning fish alongside a raise, but never attaches it to an all-in", () => {
    const { game, player, deck } = fixture()
    const target = deck.find((c) => c.id === "joker-green")!
    game.state.discardA = [target]
    const decision = chooseHeuristicAction(game.state, player.id, 24)
    const fishingBets = decision.evaluations.filter(
      (e) => e.action.type === "bet" && e.action.useRiichiStick,
    )
    expect(fishingBets.length).toBeGreaterThan(0)
    for (const evaluation of fishingBets) {
      expect(evaluation.estimatedWinRate).toBeGreaterThan(0.5)
      expect(evaluation.estimatedWinRate).toBeLessThan(1)
      expect(evaluation.action).toHaveProperty("amount")
      expect((evaluation.action as { amount: number }).amount).toBeLessThan(
        player.chips + player.roundCommitted,
      )
    }
  })
  it("does not invent full-stack calls when all opponents are short", () => {
    const { game, player, deck } = fixture()
    player.privateCards[3] = deck.find((c) => c.id === "joker-green")!
    player.chips = 1000
    game.state.pot = 100
    game.state.players
      .filter((p) => p !== player)
      .forEach((p, index) => {
        p.chips = (index + 1) * 10
        p.roundCommitted = 0
      })
    const decision = chooseHeuristicAction(game.state, player.id, 24)
    const bets = decision.evaluations.filter((e) => e.action.type === "bet")
    expect(bets.length).toBeGreaterThan(0)
    for (const bet of bets) expect(bet.expectedChipDelta).toBeLessThanOrEqual(160)
  })
  it("keeps decisions invariant when unseen deck order and opponents' hidden cards change", () => {
    const { game, player } = fixture()
    const before = chooseHeuristicAction(game.state, player.id, 24)
    const changed = structuredClone(game.state)
    changed.deck.reverse()
    const hidden = changed.players
      .filter((p) => p.id !== player.id)
      .flatMap((p) => p.privateCards)
      .reverse()
    changed.players
      .filter((p) => p.id !== player.id)
      .forEach((p) => {
        p.privateCards = hidden.splice(0, p.privateCards.length)
      })
    expect(chooseHeuristicAction(changed, player.id, 24)).toEqual(before)
  })
  it("bets a strong Kong without offering removed declarations", () => {
    const { game, player, deck } = fixture()
    player.privateCards[3] = deck.find((c) => c.id === "joker-green")!
    const decision = chooseHeuristicAction(game.state, player.id, 24)
    expect(decision.action.type).toBe("bet")
    expect(decision.evaluations.some((e) => e.action.type === "bet" && e.action.riichi)).toBe(false)
    expect(
      decision.evaluations.find((e) => e.action.type === "bet")?.estimatedWinRate,
    ).toBeLessThan(1)
  })
})

describe("bot fishing respects within-category strength", () => {
  const faces: CardFace[] = [
    windFace("east"),
    dragonFace("red"),
    numberedFace("dots", 9),
    numberedFace("dots", 1),
  ]
  for (const mode of ["basic", "riichi"] as const) {
    for (let tier = 0; tier < faces.length - 1; tier++) {
      it(`${mode}: completes tier ${tier} before tier ${tier + 1}, regardless of lane`, () => {
        for (const strongerLane of ["a", "b"] as const) {
          const { game, player } = fixture()
          game.state.config.mode = mode
          player.riichiSticks = 0
          game.state.currentWager = 0
          player.roundCommitted = 0
          const stronger = faces[tier]!,
            weaker = faces[tier + 1]!
          player.privateCards = [
            stronger,
            stronger,
            weaker,
            weaker,
            numberedFace("bamboo", 2),
            numberedFace("characters", 5),
          ].map((face, i) => ({ ...face, id: `held-${i}` }))
          const high = { ...stronger, id: "complete-high" },
            low = { ...weaker, id: "complete-low" }
          game.state.discardA = [strongerLane === "a" ? high : low]
          game.state.discardB = [strongerLane === "b" ? high : low]
          // Only the two visible alternatives: isolate tie-break preference from unknown draws.
          game.state.deck = []
          const decision = chooseHeuristicAction(game.state, player.id, 24, passive)
          expect(decision.action).toMatchObject({
            type: "check",
            drawSource: `discard-${strongerLane}`,
          })
          game.act(player.id, decision.action)
          game.discard(player.id, chooseHeuristicDiscard(game.state, player.id))
          const score = scoreHand(player.privateCards, mode)
          expect(score.combinations[0]?.kind).toBe("pung")
          expect(score.tieBreak[0]).toBe([11, 10, 9][tier])
        }
      })
    }
  }
})
