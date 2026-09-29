import { describe, expect, it } from "vitest"
import { createDeck } from "../src/game/cards"
import { scoreHand, compareHandStrengths } from "../src/game/scoring"
import { SeededRandom } from "../src/game/random"
import type { Card } from "../src/game/types"
import { legacyDeck, isTreasure, identities } from "../scripts/legacy/cards"
import { evaluateLegacy, LEGACY_LADDER, type LegacyKind } from "../scripts/legacy/scoring"
import { LegacyEngine } from "../scripts/legacy/engine"
import { botView, stepLegacy } from "../scripts/legacy/bots"
import { referenceLegacy } from "../scripts/legacy/reference"
import {
  exactIdentical,
  exactHonors,
  exactDragonEye,
  choose,
} from "../scripts/legacy/probabilities"

const deck = legacyDeck()
function cards(...ids: string[]): Card[] {
  return ids.map((id) => {
    const card = deck.find((candidate) => candidate.id === id)
    if (!card) throw new Error(id)
    return card
  })
}
function engine(players = 4, overrides = {}) {
  return LegacyEngine.createLegacy({
    seed: "legacy-test",
    players,
    orbits: 2,
    ...overrides,
  })
}
function give(game: LegacyEngine, seat: number, id: string) {
  const own = game.state.players[seat].privateCards
  if (own.some((c) => c.id === id)) return
  const pools = [...game.decks, ...game.lanes, ...game.state.players.map((p) => p.privateCards)]
  const pool = pools.find((p) => p.some((c) => c.id === id))!
  const index = pool.findIndex((c) => c.id === id)
  const replace = own.findIndex((c) => !isTreasure(c))
  ;[own[replace], pool[index]] = [pool[index], own[replace]]
}
function open(game: LegacyEngine) {
  for (const p of game.state.players)
    game.passCharleston(
      p.id,
      p.privateCards.slice(0, 2).map((c) => c.id),
    )
}

describe("Legacy evaluator", () => {
  it("agrees with independent exhaustive suit assignments and contained categories", () => {
    const random = new SeededRandom("wild-reference-v2")
    for (let sample = 0; sample < 2000; sample++) {
      const hand = random.shuffle(deck).slice(0, 7)
      const actualKinds = new Set<LegacyKind>(),
        expectedKinds = new Set<LegacyKind>()
      expect(
        compareHandStrengths(
          evaluateLegacy(hand, actualKinds),
          referenceLegacy(hand, expectedKinds),
        ),
      ).toBe(0)
      expect([...actualKinds].sort()).toEqual([...expectedKinds].sort())
    }
  }, 30000)
  it("matches v6 Riichi categories and tie breaks on ordinary cards", () => {
    const random = new SeededRandom("legacy-equivalence")
    for (let i = 0; i < 1000; i++) {
      const hand = random.shuffle(createDeck("riichi")).slice(0, 7)
      const base = scoreHand(hand),
        actual = evaluateLegacy(hand)
      const kind = base.combinations[0]?.kind ?? "high-card"
      expect(actual.kind).toBe(kind)
      expect(actual.tieBreak).toEqual(base.tieBreak)
    }
  })
  it("keeps wild numbers fixed and allows wild pairs", () => {
    expect(evaluateLegacy(cards("wild-5", "dots-5-1")).kind).toBe("eye")
    expect(evaluateLegacy(cards("wild-5", "dots-6-1")).kind).toBe("high-card")
    expect(evaluateLegacy(cards("wild-5", "dots-4-1", "dots-6-1")).kind).toBe("chow")
    expect(evaluateLegacy(cards("wild-5", "wind-east-1")).kind).toBe("high-card")
  })
  it("handles wild Dragons and ranks Quints above Kongs", () => {
    expect(evaluateLegacy(cards("wild-dragon", "dragon-red-1", "dragon-white-1")).kind).toBe(
      "three-dragons",
    )
    const kong = evaluateLegacy(cards("bamboo-5-1", "bamboo-5-2", "bamboo-5-3", "wild-5"))
    const quint = evaluateLegacy(
      cards("bamboo-5-1", "bamboo-5-2", "bamboo-5-3", "wild-5", "joker-green"),
    )
    expect(kong.kind).toBe("kong")
    expect(quint.kind).toBe("quint")
    expect(compareHandStrengths(quint, kong)).toBeGreaterThan(0)
    expect(
      evaluateLegacy(
        cards("wind-east-1", "wind-east-2", "wind-east-3", "wind-east-4", "joker-black"),
      ).kind,
    ).toBe("quint")
  })
  it("does not reuse a wildcard between a pair and a meld", () => {
    const hand = cards("dots-4-1", "dots-6-1", "wild-5", "bamboo-5-1", "blank-1")
    expect(evaluateLegacy(hand).kind).toBe("chow")
    expect(evaluateLegacy(cards("joker-blue", "dots-5-1")).kind).toBe("high-card")
  })
  it("never scores Treasure combinations", () => {
    const treasures = cards("treasure-1", "treasure-2", "treasure-3", "treasure-4")
    const kinds = new Set<LegacyKind>()
    expect(evaluateLegacy(treasures, kinds).kind).toBe("high-card")
    expect(kinds.size).toBe(0)
    expect(LEGACY_LADDER.some((kind) => kind.includes("treasure"))).toBe(false)
  })
  it("recognizes all 34 physical Quints and every one-card deletion", () => {
    for (let identity = 0; identity < 34; identity++) {
      const hand = deck.filter((card) => identities(card, true).includes(identity))
      expect(hand.length).toBe(5)
      expect(evaluateLegacy(hand).kind).toBe("quint")
      for (let remove = 0; remove < 5; remove++)
        expect(evaluateLegacy(hand.filter((_, i) => i !== remove)).kind).toBe("kong")
    }
  })
  it("agrees with exact rare-hand probabilities on exhaustive reduced decks", () => {
    const pools = [
      cards(
        "bamboo-5-1",
        "bamboo-5-2",
        "bamboo-5-3",
        "dots-5-1",
        "dots-5-2",
        "dots-5-3",
        "wild-5",
        "joker-green",
        "joker-blue",
        "wind-north-1",
        "wind-north-2",
        "wind-north-3",
        "joker-black",
      ),
      cards(
        "wind-east-1",
        "wind-south-1",
        "wind-west-1",
        "wind-north-1",
        "joker-black",
        "dragon-red-1",
        "dragon-green-1",
        "dragon-white-1",
        "joker-red",
        "joker-green",
        "joker-blue",
        "wild-dragon",
        "flower-white-lotus",
        "flower-black-lotus",
      ),
    ]
    for (const pool of pools) {
      const exact = {
        ...exactIdentical(pool),
        ...exactHonors(pool),
        "three-dragons-eye": exactDragonEye(pool),
      }
      const counts = {
        kong: 0,
        quint: 0,
        "three-winds": 0,
        "four-winds": 0,
        "three-dragons": 0,
        "three-dragons-eye": 0,
        "twin-lotus": 0,
      }
      const mismatches: string[] = []
      const visit = (start: number, picked: Card[]) => {
        if (picked.length === 7) {
          const kinds = new Set<LegacyKind>()
          evaluateLegacy(picked, kinds)
          for (const kind of Object.keys(counts) as (keyof typeof counts)[])
            if (kinds.has(kind)) counts[kind]++
          if (compareHandStrengths(evaluateLegacy(picked), referenceLegacy(picked)) !== 0)
            mismatches.push(picked.map((c) => c.id).join(","))
          return
        }
        for (let i = start; i <= pool.length - (7 - picked.length); i++)
          visit(i + 1, [...picked, pool[i]])
      }
      visit(0, [])
      expect(mismatches).toEqual([])
      for (const kind of Object.keys(counts) as (keyof typeof counts)[])
        expect(counts[kind] / choose(pool.length, 7)).toBeCloseTo(exact[kind], 12)
    }
  }, 30000)
})

describe("Legacy v2 physical rules", () => {
  it("supports the extra stick fish after a normal draw, including a queued Treasure search", () => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!),
      id = game.state.players[actor].id
    give(game, actor, "treasure-1")
    game.actWithFish(
      id,
      { type: "check", useRiichiStick: true },
      [
        { kind: "draw", source: "deck" },
        { kind: "treasure", cardId: "treasure-1", target: actor, discardPile: "b" },
      ],
      (offered) => offered[1].id,
    )
    expect(game.state.phase).toBe("discarding")
    const drawn = game.state.pendingDiscard!.drawnCardId
    game.discard(id, { discardCardId: drawn, discardPile: "a" })
    expect(game.searches.length).toBe(1)
    expect(game.state.players[actor].riichiSticks).toBe(1)
    expect(game.state.players[actor].privateCards.length).toBe(7)
    expect(game.state.pendingDiscard).toBeNull()
    game.assertCards()
  })
  it.each([2, 3, 4, 5, 6])("splits 132 cards evenly and seeds left at %i players", (count) => {
    const game = engine(count)
    expect(game.reserve.length).toBe(132 % count)
    expect(new Set(game.deckSizes[0]).size).toBe(1)
    expect(game.state.players.every((p) => p.privateCards.length === 7)).toBe(true)
    expect(game.lanes.every((lane) => lane.length === 1)).toBe(true)
    expect(game.allCards.some((c) => c.id.startsWith("riichi-"))).toBe(false)
    expect(game.state.players.every((p) => p.riichiSticks === 2)).toBe(true)
    game.assertCards()
  })
  it("commits a Treasure before a private three-card choice and preserves the other cards' order", () => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!),
      target = game.neighbor(actor, "a")
    give(game, actor, "treasure-1")
    const player = game.state.players[actor],
      targetHand = structuredClone(game.state.players[target].privateCards)
    const oldDeck = [...game.decks[target]],
      offers = oldDeck.slice(-3).reverse()
    game.actWithFish(
      player.id,
      { type: "check" },
      [{ kind: "treasure", cardId: "treasure-1", target, discardPile: "b" }],
      (offered, kept) => {
        expect(game.lanes[game.neighbor(actor, "b")].at(-1)?.id).toBe("treasure-1")
        expect(player.privateCards.length).toBe(6)
        expect(kept.some((c) => c.id === "treasure-1")).toBe(false)
        expect(offered.map((c) => c.id)).toEqual(offers.map((c) => c.id))
        return offered[1].id
      },
    )
    expect(game.decks[target]).toEqual(oldDeck.filter((c) => c.id !== offers[1].id))
    expect(player.privateCards.some((c) => c.id === offers[1].id)).toBe(true)
    expect(player.privateCards.length).toBe(7)
    expect(game.state.players[target].privateCards).toEqual(targetHand)
    expect(game.state.pendingDiscard).toBeNull()
    expect(game.knownTop[actor][target]).toEqual([offers[0].id, offers[2].id])
    expect(botView(game, target).decks[target].top).toEqual([])
    game.actWithFish(game.state.players[target].id, { type: "check" }, [
      { kind: "draw", source: "deck" },
    ])
    expect(game.state.pendingDiscard?.drawnCardId).toBe(offers[0].id)
    expect(
      botView(game, actor)
        .opponents.find((p) => p.seat === target)
        ?.known.some((c) => c.id === offers[0].id),
    ).toBe(true)
    expect(game.knownTop[actor][target]).toEqual([offers[2].id])
    game.assertCards()
  })
  it.each([1, 2, 3])("can search one's own deck with only %i cards remaining", (count) => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!)
    give(game, actor, "treasure-1")
    game.decks[(actor + 1) % 4].push(
      ...game.decks[actor].splice(0, game.decks[actor].length - count),
    )
    game.actWithFish(
      game.state.players[actor].id,
      { type: "check" },
      [{ kind: "treasure", cardId: "treasure-1", target: actor, discardPile: "a" }],
      (offered) => {
        expect(offered.length).toBe(count)
        return offered.at(-1)!.id
      },
    )
    expect(game.decks[actor].length).toBe(count - 1)
    game.assertCards()
  })
  it("allows searching a Riichi player's deck without touching their locked hand", () => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!),
      target = (actor + 1) % 4
    give(game, actor, "treasure-1")
    game.state.players[target].riichi = true
    const hand = structuredClone(game.state.players[target].privateCards)
    game.actWithFish(game.state.players[actor].id, { type: "check" }, [
      { kind: "treasure", cardId: "treasure-1", target, discardPile: "a" },
    ])
    expect(game.state.players[target].privateCards).toEqual(hand)
    game.assertCards()
  })
  it("rolls back an invalid Treasure choice, including discarded cards and memory", () => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!)
    give(game, actor, "treasure-1")
    const snapshot = () =>
      JSON.stringify({
        state: game.state,
        decks: game.decks,
        lanes: game.lanes,
        top: game.knownTop,
        searches: game.searches,
      })
    const before = snapshot()
    expect(() =>
      game.actWithFish(
        game.state.players[actor].id,
        { type: "check" },
        [{ kind: "treasure", cardId: "treasure-1", target: actor, discardPile: "a" }],
        () => "not-offered",
      ),
    ).toThrow("one of the offered")
    expect(snapshot()).toBe(before)
    game.assertCards()
  })
  it("rejects an empty target and cannot play a public Treasure", () => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!),
      target = (actor + 1) % 4
    give(game, actor, "treasure-1")
    game.decks[actor].push(...game.decks[target].splice(0))
    const action = () =>
      game.actWithFish(game.state.players[actor].id, { type: "check" }, [
        { kind: "treasure", cardId: "treasure-1", target, discardPile: "a" },
      ])
    expect(action).toThrow("Invalid Treasure search")
    const p = game.state.players[actor],
      index = p.privateCards.findIndex((c) => c.id === "treasure-1")
    p.publicCards.push(p.privateCards.splice(index, 1)[0])
    expect(action).toThrow("concealed card")
    game.assertCards()
  })
  it("draws clockwise, wraps and skips empty decks including eliminated seats", () => {
    const game = engine()
    open(game)
    const actor = 3,
      owner = 2
    game.state.actingPlayerId = game.state.players[actor].id
    for (const index of [3, 0, 1]) game.decks[owner].push(...game.decks[index].splice(0))
    game.state.players[owner].eliminated = true
    const expected = game.decks[owner].at(-1)!.id
    game.actWithFish(game.state.players[actor].id, { type: "check" }, [
      { kind: "draw", source: "deck" },
    ])
    expect(game.state.pendingDiscard?.drawnCardId).toBe(expected)
    expect(game.fallbacks.at(-1)).toMatchObject({ actor, owner, reason: "fish" })
    game.assertCards()
  })
  it("uses clockwise fallback during an eight-card deal instead of skipping the seed", () => {
    const game = engine()
    game.decks[1].push(...game.decks[0].splice(0), ...game.lanes[0].splice(0))
    game.state.phase = "between-hands"
    game.startNextHand()
    expect(game.fallbacks.some((f) => f.actor === 0 && f.owner === 1 && f.reason === "deal")).toBe(
      true,
    )
    expect(game.state.players.every((p) => p.privateCards.length === 7)).toBe(true)
    expect(game.lanes.flat().length).toBe(4)
    game.assertCards()
  })
  it("keeps unknown fallback draws private from the original deck owner", () => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!),
      owner = (actor + 1) % 4
    game.decks[owner].push(...game.decks[actor].splice(0))
    for (const card of game.decks[owner]) game.knownDecks[owner].add(card.id)
    game.actWithFish(game.state.players[actor].id, { type: "check" }, [
      { kind: "draw", source: "deck" },
    ])
    expect(game.knownDecks[owner].size).toBe(0)
    expect(game.knownTop[owner][owner]).toEqual([])
    game.assertCards()
  })
  it("keeps undealt order and private cards out of bot views before searching", () => {
    const game = engine()
    open(game)
    const seat = game.seat(game.state.actingPlayerId!),
      other = (seat + 1) % 4
    const before = botView(game, seat)
    game.decks[seat].reverse()
    game.decks[other].reverse()
    const hidden = game.state.players[other].privateCards
    ;[hidden[0], game.decks[other][0]] = [game.decks[other][0], hidden[0]]
    expect(botView(game, seat)).toEqual(before)
  })
  it("lets Blanks exchange for a buried card in one's own lane", () => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!)
    give(game, actor, "blank-1")
    game.lanes[actor].push(game.decks[(actor + 1) % 4].pop()!)
    const taken = game.lanes[actor][0]
    game.actWithFish(game.state.players[actor].id, { type: "check" }, [
      { kind: "blank", cardId: "blank-1", lane: actor, index: 0 },
    ])
    expect(game.lanes[actor][0].id).toBe("blank-1")
    expect(game.state.players[actor].privateCards.some((c) => c.id === taken.id)).toBe(true)
    game.assertCards()
  })
  it("retains the Riichi stick win reward, with no immediate declaration grant", () => {
    const game = engine()
    open(game)
    const id = game.state.actingPlayerId!,
      p = game.state.players[game.seat(id)]
    game.actWithFish(id, { type: "bet", amount: 5, riichi: true }, [])
    expect(p.riichiSticks).toBe(2)
    while (game.state.phase === "betting")
      game.actWithFish(game.state.actingPlayerId!, { type: "fold" }, [])
    expect(game.state.handWinners).toEqual([id])
    expect(p.riichiSticks).toBe(4)
    game.assertCards()
  })
  it("has no Treasure showdown payout and preserves chip totals", () => {
    const game = engine()
    open(game)
    const actor = game.seat(game.state.actingPlayerId!)
    give(game, actor, "treasure-1")
    const holder = game.state.players[actor]
    game.actWithFish(holder.id, { type: "bet", amount: holder.chips }, [])
    while (game.state.phase === "betting" || game.state.phase === "discarding") {
      if (game.state.phase === "betting")
        game.actWithFish(game.state.actingPlayerId!, { type: "call" }, [
          { kind: "draw", source: "deck" },
        ])
      else
        game.discard(game.state.pendingDiscard!.playerId, {
          discardCardId: game.state.pendingDiscard!.drawnCardId,
          discardPile: "a",
        })
    }
    expect(game.state.handResults.at(-1)?.reason).toBe("showdown")
    expect(game.state.players.reduce((sum, p) => sum + p.chips, 0)).toBeCloseTo(800)
    game.assertCards()
  })
  it("completes long six-player sessions deterministically with conserved cards", () => {
    const run = () => {
      const game = engine(6, { orbits: 4 })
      for (let i = 0; game.state.phase !== "finished" && i < 4000; i++) stepLegacy(game, 4, [])
      expect(game.state.phase).toBe("finished")
      game.assertCards()
      expect(game.state.players.reduce((sum, p) => sum + p.chips, 0)).toBeCloseTo(
        1200 + game.state.players.reduce((sum, p) => sum + p.loans * 200, 0),
      )
      return { scores: game.state.finalScores, fallbacks: game.fallbacks, searches: game.searches }
    }
    expect(run()).toEqual(run())
  }, 30000)
})
