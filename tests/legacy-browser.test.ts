import { describe, expect, it } from "vitest"
import { GameEngine } from "../src/game/engine"
import { createDeck } from "../src/game/cards"
import { prepareCharleston, stepHeuristic } from "../src/game/automation"
import { LEGACY_HAND_ORDER, handRank } from "../src/game/hand-ranks"
import { evaluateLegacy } from "../src/game/legacy-scoring"
import { oracleContains } from "../scripts/legacy-shadow-oracle"
import { SeededRandom } from "../src/game/random"
import { ActionSchema } from "../src/server/schemas"
import type { Card, HandKind } from "../src/game/types"

function game(count = 4, seed = "new-legacy") {
  return GameEngine.create(
    Array.from({ length: count }, (_, i) => ({
      id: `p${i}`,
      name: i === 0 ? "legacy" : `Player ${i}`,
      controller: "human" as const,
    })),
    { mode: "legacy", seed, heuristicSamples: 2 },
  )
}
function finishSetup(g: GameEngine) {
  for (const p of g.state.players.filter((candidate) => !candidate.folded))
    g.passCharleston(
      p.id,
      p.privateCards.slice(0, 2).map((c) => c.id),
    )
}
function pools(g: GameEngine): Card[][] {
  return [
    g.state.deck,
    ...g.state.legacy!.decks,
    g.state.discardA,
    g.state.discardB,
    ...g.state.players.flatMap((p) => [
      g.state.foldedPrivateCards[p.id] ?? p.privateCards,
      p.publicCards,
    ]),
  ]
}
function putInHand(g: GameEngine, id: string, kind: "treasure" | "blank") {
  const player = g.state.players.find((candidate) => candidate.id === id)!
  const existing = player.privateCards.find((c) => c.kind === kind)
  if (existing) return existing
  for (const pool of pools(g)) {
    const index = pool.findIndex((c) => c.kind === kind)
    if (index >= 0) {
      const card = pool[index]!
      pool[index] = player.privateCards[0]!
      player.privateCards[0] = card
      return card
    }
  }
  throw new Error("Missing fixture")
}
function conserve(g: GameEngine) {
  const cards = pools(g).flat()
  expect(cards).toHaveLength(192)
  expect(new Set(cards.map((c) => c.id)).size).toBe(192)
}
function endByFolds(g: GameEngine) {
  while (g.state.phase === "betting") g.act(g.state.actingPlayerId!, { type: "fold" })
}
describe("revised Legacy", () => {
  it("records personal deck draws for animations", () => {
    const g = game()
    finishSetup(g)
    const id = g.state.actingPlayerId!
    g.act(id, { type: "check", drawSource: "deck" })
    expect(g.state.pendingDiscard?.sourceDeckId).toBe(id)
    const restored = GameEngine.restore(g.state)
    const card = restored.state.players.find((p) => p.id === id)!.privateCards[0]!
    restored.discard(id, { discardCardId: card.id, discardPile: "a" })
    const move = restored.publicView().publicDrawDiscards!.at(-1)!
    expect(move.sourceDeckId).toBe(id)
    expect(move.drawnCard).toBeUndefined()
    conserve(restored)
  })
  it("contains exactly the requested 192 cards with no Wilds", () => {
    const deck = createDeck("legacy")
    expect(deck).toHaveLength(192)
    expect(new Set(deck.map((c) => c.id)).size).toBe(192)
    for (const kind of ["numbered", "dragon", "wind"] as const) {
      const faces = new Map<string, number>()
      for (const c of deck.filter((candidate) => candidate.kind === kind)) {
        const face = c.id.replace(/-\d+$/, "")
        faces.set(face, (faces.get(face) ?? 0) + 1)
      }
      expect([...faces.values()].every((n) => n === 4)).toBe(true)
    }
    for (const [kind, count] of [
      ["blank", 5],
      ["joker", 4],
      ["flower", 2],
      ["treasure", 5],
      ["wild", 0],
    ] as const)
      expect(deck.filter((c) => c.kind === kind)).toHaveLength(count)
  })
  it.each([1, 2, 3, 4] as const)("respects %i selected tournament games", (tournamentGames) => {
    const g = GameEngine.create(
      [
        { name: "A", controller: "human" },
        { name: "B", controller: "human" },
      ],
      { mode: "legacy", tournamentGames },
    )
    expect(g.state.config.tournamentGames).toBe(tournamentGames)
  })
  it("scores natural Kongs and colored-Joker Quints for every regular face", () => {
    const deck = createDeck("legacy")
    for (const first of deck.filter(
      (c) => ["numbered", "dragon", "wind"].includes(c.kind) && c.id.endsWith("-1"),
    )) {
      const prefix = first.id.slice(0, -1)
      const four = deck.filter((c) => c.id.startsWith(prefix))
      expect(evaluateLegacy(four).kind).toBe("kong")
      const joker = deck.find((c) => c.kind === "joker" && c.color === first.color)!
      expect(evaluateLegacy([...four, joker]).kind).toBe("quint")
      const wrong = deck.find((c) => c.kind === "joker" && c.color !== first.color)!
      expect(evaluateLegacy([...four, wrong]).kind).toBe("kong")
    }
  })

  it.each(["Legacy", " legacy", "legacy ", "Pao"])("can be selected by %s", (name) => {
    const g = GameEngine.create(
      [
        { name, controller: "human" },
        { name: "Bot", controller: "heuristic" },
      ],
      { mode: "legacy", seed: "hidden" },
    )
    expect(g.state.config.mode).toBe("legacy")
    expect(g.state.legacy).toBeDefined()
  })
  it.each([2, 3, 4, 5, 6])(
    "deals seven personal cards and two shared seeds for %i players",
    (count) => {
      const g = game(count)
      expect(g.state.config.mode).toBe("legacy")
      expect(g.state.config.tournamentGames).toBe(4)
      expect(g.state.config.orbits).toBe(1)
      expect(g.state.phase).toBe("charleston")
      expect(g.state.players.every((p) => p.privateCards.length === 7)).toBe(true)
      expect(g.state.legacy!.decks.map((d) => d.length).reduce((a, b) => a + b, 0)).toBe(
        190 - count * 7,
      )
      expect(
        Math.max(...g.state.legacy!.decks.map((d) => d.length)) -
          Math.min(...g.state.legacy!.decks.map((d) => d.length)),
      ).toBeLessThanOrEqual(1)
      expect(g.state.deck).toHaveLength(0)
      expect(g.state.discardA).toHaveLength(1)
      expect(g.state.discardB).toHaveLength(1)
      conserve(g)
    },
  )
  it.each([1, 2])(
    "exchanges %i Treasure offers, shuffles and preserves deck/hand sizes across restore",
    (count) => {
      let g = game()
      finishSetup(g)
      const id = g.state.actingPlayerId!,
        player = g.state.players.find((candidate) => candidate.id === id)!
      const treasure = putInHand(g, id, "treasure")
      const target = g.state.players.find((p) => p.id !== id)!,
        index = g.state.players.indexOf(target)
      const before = [...g.state.legacy!.decks[index]!],
        otherHand = [...target.privateCards]
      const returned = player.privateCards.find((c) => c.id !== treasure.id)!
      g.act(
        id,
        {
          type: "check",
          treasureSearch: { treasureCardId: treasure.id, targetPlayerId: target.id },
        },
        true,
      )
      expect(g.state.phase).toBe("treasure")
      expect(g.publicView(target.id).legacy?.treasureOffer).toBeUndefined()
      expect(g.publicView().legacy?.treasureOffer).toBeUndefined()
      g = GameEngine.restore(JSON.parse(JSON.stringify(g.state)))
      const offer = g.publicView(id).legacy!.treasureOffer!.cards
      expect(offer).toEqual(before.slice(-3).reverse())
      const snapshot = JSON.stringify(g.state)
      expect(() => g.chooseTreasure(target.id, [offer[0]!.id])).toThrow(
        /Treasure|offered|concealed|search/i,
      )
      expect(() => g.chooseTreasure(id, [offer[0]!.id, offer[0]!.id])).toThrow(
        /Treasure|offered|concealed|search/i,
      )
      expect(() => g.chooseTreasure(id, [offer[0]!.id, offer[1]!.id])).toThrow(
        /Treasure|offered|concealed|search/i,
      )
      expect(JSON.stringify(g.state)).toBe(snapshot)
      const chosen = offer.slice(0, count).map((c) => c.id)
      g.chooseTreasure(id, chosen, count === 2 ? returned.id : undefined)
      const deck = g.state.legacy!.decks[index]!
      expect(deck).toHaveLength(before.length)
      expect(new Set(deck.map((c) => c.id))).toEqual(
        new Set(
          [
            ...before.filter((c) => !chosen.includes(c.id)),
            treasure,
            ...(count === 2 ? [returned] : []),
          ].map((c) => c.id),
        ),
      )
      expect(g.state.players.find((candidate) => candidate.id === id)!.privateCards).toHaveLength(7)
      expect(g.state.players[index]!.privateCards).toEqual(otherHand)
      expect(g.state.stickWindow?.playerId).toBe(id)
      conserve(g)
    },
  )
  it("rejects own/empty decks and public Treasures without spending a stick", () => {
    const g = game()
    finishSetup(g)
    const id = g.state.actingPlayerId!,
      p = g.state.players.find((candidate) => candidate.id === id)!
    const treasure = putInHand(g, id, "treasure")
    g.act(id, { type: "check" }, true)
    g.discard(id, {
      discardCardId: p.privateCards.find((c) => c.id !== treasure.id)!.id,
      discardPile: "a",
    })
    const snapshot = JSON.stringify(g.state)
    expect(() =>
      g.spendRiichiStick(id, "deck", {
        treasureSearch: { treasureCardId: treasure.id, targetPlayerId: id },
      }),
    ).toThrow(/Treasure|offered|concealed|search/i)
    expect(JSON.stringify(g.state)).toBe(snapshot)
    g.spendRiichiStick(id, "deck", {
      treasureSearch: {
        treasureCardId: treasure.id,
        targetPlayerId: g.state.players.find((candidate) => candidate.id !== id)!.id,
      },
    })
    expect(g.state.phase).toBe("treasure")
    expect(p.riichiSticks).toBe(1)
    g.chooseTreasure(id, [g.publicView(id).legacy!.treasureOffer!.cards[0]!.id])
    conserve(g)
  })
  it("uses any position in either shared pile for Blanks", () => {
    const g = game()
    finishSetup(g)
    const id = g.state.actingPlayerId!,
      blank = putInHand(g, id, "blank")
    g.state.discardB.push(...g.state.legacy!.decks[0]!.splice(-3))
    const target = g.state.discardB[0]!
    g.act(id, { type: "check", blankExchange: { blankCardId: blank.id, pile: "b", cardIndex: 0 } })
    expect(g.state.discardB[0]!.id).toBe(blank.id)
    expect(
      g.state.players
        .find((candidate) => candidate.id === id)!
        .privateCards.some((c) => c.id === target.id),
    ).toBe(true)
    conserve(g)
  })
  it("rejects empty personal draws and permits fishing instead", () => {
    const g = game()
    finishSetup(g)
    const id = g.state.actingPlayerId!,
      p = g.state.players.find((candidate) => candidate.id === id)!,
      seat = g.state.players.indexOf(p)
    const personalTop = g.state.legacy!.decks[seat]!.at(-1)!
    g.act(id, { type: "check" }, true)
    expect(p.privateCards.at(-1)!.id).toBe(personalTop.id)
    g.discard(id, { discardCardId: personalTop.id, discardPile: "b" })
    expect(g.state.discardA).toHaveLength(1)
    const remaining = g.state.legacy!.decks[seat]!.splice(0)
    g.state.legacy!.decks[(seat + 1) % 4]!.push(...remaining)
    const snapshot = JSON.stringify(g.state)
    expect(() => g.spendRiichiStick(id, "deck")).toThrow(/empty/)
    expect(JSON.stringify(g.state)).toBe(snapshot)
    const top = g.state.discardB.at(-1)!
    g.spendRiichiStick(id, "discard-b")
    expect(g.state.players.find((candidate) => candidate.id === id)!.privateCards.at(-1)!.id).toBe(
      top.id,
    )
    conserve(g)
  })
  it("returns hands and redistributes discards while preserving two seeds", () => {
    const g = game()
    finishSetup(g)
    const id = g.state.actingPlayerId!,
      p = g.state.players.find((candidate) => candidate.id === id)!
    g.act(id, { type: "check" }, true)
    const discarded = p.privateCards[0]!
    g.discard(id, { discardCardId: discarded.id, discardPile: "a" })
    g.finishStickDecision(id)
    const own = g.state.players.map(
      (candidate, i) =>
        new Set(
          [...g.state.legacy!.decks[i]!, ...candidate.privateCards, ...candidate.publicCards].map(
            (c) => c.id,
          ),
        ),
    )
    const dealer = g.state.dealerIndex
    endByFolds(g)
    expect(g.state.discardA).toEqual([])
    expect(g.state.deck).toHaveLength(2)
    g.state.legacy!.decks.forEach((d, i) => {
      expect(d.length).toBe(own[i]!.size + (i === dealer ? 1 : 0))
      const ids = new Set(d.map((c) => c.id))
      for (const cardId of own[i]!) expect(ids.has(cardId)).toBe(true)
    })
    conserve(g)
    g.startNextHand()
    expect(g.state.discardA).toHaveLength(1)
    expect(g.state.discardB).toHaveLength(1)
    conserve(g)
  })
  it("rejects central Treasure searches without changing state", () => {
    const g = game()
    finishSetup(g)
    const id = g.state.actingPlayerId!,
      treasure = putInHand(g, id, "treasure")
    const snapshot = JSON.stringify(g.state)
    expect(() =>
      g.act(id, {
        type: "check",
        treasureSearch: { treasureCardId: treasure.id, targetPlayerId: "central" },
      }),
    ).toThrow(/nonempty/)
    expect(JSON.stringify(g.state)).toBe(snapshot)
  })
  it("rejects saves using the old central-deck Legacy rules", () => {
    const g = game()
    Object.assign(g.state.legacy!, { version: 2 })
    expect(() => GameEngine.restore(g.state)).toThrow(/Legacy rules changed/)
  })
  it.each([2, 3, 4, 5, 6])(
    "runs restored %i-player bot tournaments with card conservation",
    (count) => {
      let g = game(count, `bots-new-${count}`)
      g.state.players.forEach((p) => (p.controller = "heuristic"))
      let steps = 0
      while (g.state.phase !== "finished" && steps++ < 2500) {
        prepareCharleston(g)
        if (g.state.phase === "finished") break
        stepHeuristic(g)
        conserve(g)
        g = GameEngine.restore(JSON.parse(JSON.stringify(g.state)))
      }
      expect(g.state.phase).toBe("finished")
      expect(g.state.handResults.length).toBeGreaterThan(0)
    },
    30000,
  )

  it.each(["loss", "tie", "fold", "uncontested"] as const)(
    "settles Treasure bank payout for %s",
    (outcome) => {
      const g = game(2)
      finishSetup(g)
      const deck = createDeck("legacy")
      const pick = (ids: string[]) => ids.map((id) => deck.find((c) => c.id === id)!)
      const treasures = deck.filter((c) => c.kind === "treasure")
      const numbered = deck.filter((c) => c.kind === "numbered")
      const a = g.state.players[0]!,
        b = g.state.players[1]!
      // A Pung against two Treasure-bearing high-card hands, or equal rank/tie-breaks.
      a.privateCards = [numbered[0]!, numbered[1]!, numbered[2]!]
      b.privateCards = [treasures[0]!, treasures[1]!, ...numbered.slice(10, 12)]
      b.publicCards = [treasures[2]!]
      if (outcome === "tie") {
        a.privateCards = pick(["wind-east-1"])
        b.privateCards = [...treasures, ...pick(["wind-south-1"])]
        b.publicCards = []
      }
      a.riichi = b.riichi = true
      g.state.street = 4
      g.state.pendingPlayerIds = [a.id, b.id]
      g.state.actingPlayerId = a.id
      if (outcome === "fold") {
        g.state.actingPlayerId = b.id
        g.act(b.id, { type: "fold" })
      } else if (outcome === "uncontested") g.act(a.id, { type: "fold" })
      else {
        g.act(a.id, { type: "check" })
        g.act(b.id, { type: "check" })
      }
      const result = g.state.handResults.at(-1)!
      const loser = result.players.find((p) => p.playerId === b.id)!
      expect(loser.treasurePayout).toBe(outcome === "loss" ? 60 : undefined)
      expect(result.reason).toBe(
        outcome === "loss" || outcome === "tie" ? "showdown" : "uncontested",
      )
    },
  )
  it("rejects public Treasure use and concealed-card returns that were not held before the search", () => {
    const g = game()
    finishSetup(g)
    const id = g.state.actingPlayerId!,
      p = g.state.players.find((candidate) => candidate.id === id)!
    const treasure = putInHand(g, id, "treasure")
    p.privateCards = p.privateCards.filter((c) => c.id !== treasure.id)
    p.publicCards.push(treasure)
    expect(() =>
      g.act(id, {
        type: "check",
        treasureSearch: {
          treasureCardId: treasure.id,
          targetPlayerId: g.state.players.find((candidate) => candidate.id !== id)!.id,
        },
      }),
    ).toThrow(/Treasure|offered|concealed|search/i)
    p.publicCards = []
    p.privateCards.push(treasure)
    g.act(id, {
      type: "check",
      treasureSearch: {
        treasureCardId: treasure.id,
        targetPlayerId: g.state.players.find((candidate) => candidate.id !== id)!.id,
      },
    })
    const offers = g.publicView(id).legacy!.treasureOffer!.cards
    expect(() =>
      g.chooseTreasure(
        id,
        offers.slice(0, 2).map((c) => c.id),
        offers[0]!.id,
      ),
    ).toThrow(/Treasure|offered|concealed|search/i)
    conserve(g)
  })
  it("validates one/two choices and removes the seeding action", () => {
    expect(
      ActionSchema.safeParse({ kind: "legacy-seed", playerId: "p0", cardId: "x" }).success,
    ).toBe(false)
    expect(
      ActionSchema.safeParse({
        kind: "treasure-choice",
        playerId: "p0",
        cardIds: ["x", "y"],
        returnCardId: "z",
      }).success,
    ).toBe(true)
  })
  it("uses the new Legacy order, with ordinary Riichi and Basic unchanged", () => {
    expect(LEGACY_HAND_ORDER).toEqual([
      "high-card",
      "eye",
      "chow",
      "two-eyes",
      "pung",
      "three-dragons",
      "three-winds",
      "chow-eye",
      "pung-eye",
      "twin-lotus",
      "three-dragons-eye",
      "long-chow",
      "four-dragons",
      "four-winds",
      "kong",
      "quint",
    ])
    expect(handRank("chow-eye", "legacy")).toBeGreaterThan(handRank("three-winds", "legacy"))
    expect(handRank("chow-eye", "riichi")).toBeLessThan(handRank("pung", "riichi"))
    expect(handRank("pung", "basic")).toBe(7)
  })
  it("recognizes every distinct Dragon trio and Four Dragons with legal Joker substitutions", () => {
    const deck = createDeck("legacy"),
      card = (id: string) => deck.find((c) => c.id === id)!
    const dragons = ["red", "green", "white", "black"].map((c) => card(`dragon-${c}-1`))
    for (const omitted of dragons)
      expect(evaluateLegacy(dragons.filter((c) => c !== omitted)).kind).toBe("three-dragons")
    expect(evaluateLegacy(dragons).kind).toBe("four-dragons")
    expect(evaluateLegacy([...dragons.slice(0, 3), card("joker-black")]).kind).toBe("four-dragons")
    expect(evaluateLegacy([card("shadow-1-1"), card("shadow-2-1"), card("joker-black")]).kind).toBe(
      "chow",
    )
    expect(evaluateLegacy([card("shadow-1-1"), card("shadow-2-1"), card("joker-red")]).kind).toBe(
      "high-card",
    )
    expect(evaluateLegacy([card("shadow-1-1"), card("joker-black")]).kind).toBe("high-card")
    for (const mode of ["basic", "riichi"] as const)
      expect(
        createDeck(mode).some(
          (c) =>
            (c.kind === "numbered" && c.suit === "shadow") ||
            (c.kind === "dragon" && c.dragon === "black"),
        ),
      ).toBe(false)
  })
  it("matches an independent four-suit oracle across 5000 hands", () => {
    const random = new SeededRandom("shadow-production-oracle"),
      deck = createDeck("legacy")
    for (let i = 0; i < 5000; i++) {
      const hand = random.shuffle(deck).slice(0, 7),
        actual = new Set<HandKind>()
      const score = evaluateLegacy(hand, actual)
      const expected = oracleContains(hand, true)
      expect([...actual].sort()).toEqual([...expected].sort())
      expect(score.total).toBe(Math.max(...[...actual].map((k) => handRank(k, "legacy"))))
    }
  }, 30000)
})
