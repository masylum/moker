import { SELF } from "cloudflare:test"
import { describe, expect, it } from "vitest"

describe("Cloudflare Worker and Durable Object persistence", () => {
  it("serves health through the Worker entrypoint", async () => {
    const response = await SELF.fetch("http://example.com/api/health")
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, model: "x-ai/grok-4.6" })
  })

  it("supports two humans, two orbits, and private per-player views", async () => {
    const response = await SELF.fetch("http://example.com/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "two-humans",
        seed: "handoff",
        orbits: 2,
        players: [
          { id: "p1", name: "Player 1", controller: "human" },
          { id: "p2", name: "Player 2", controller: "human" },
        ],
      }),
    })
    expect(response.status).toBe(201)
    const game = await response.json<{
      state: { config: { orbits: number }; maxHands: number; actingPlayerId: string }
    }>()
    expect(game.state.config.orbits).toBe(2)
    expect(game.state.maxHands).toBe(4)
    for (const viewer of ["", "p1", "p2"]) {
      const view = await SELF.fetch(`http://example.com/api/games/two-humans?viewer=${viewer}`)
      const body = await view.json<{
        state: { players: Array<{ id: string; privateCards: unknown[] | { count: number } }> }
      }>()
      expect(
        body.state.players.filter((p) => Array.isArray(p.privateCards)).map((p) => p.id),
      ).toEqual(viewer ? [viewer] : [])
    }
    const action = await SELF.fetch("http://example.com/api/games/two-humans/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "betting",
        playerId: game.state.actingPlayerId,
        action: { type: "check" },
      }),
    })
    expect(action.status).toBe(200)
    const next = await action.json<{
      state: { phase: string; actingPlayerId: string; pendingDiscard: { drawnCardId: string } }
    }>()
    expect(next.state.phase).toBe("discarding")
    expect(next.state.actingPlayerId).toBe(game.state.actingPlayerId)
    const discarded = await SELF.fetch("http://example.com/api/games/two-humans/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "discard",
        playerId: next.state.actingPlayerId,
        discardCardId: next.state.pendingDiscard.drawnCardId,
        discardPile: "a",
      }),
    })
    expect(discarded.status).toBe(200)
    const after = await discarded.json<{ state: { actingPlayerId: string } }>()
    expect(after.state.actingPlayerId).not.toBe(game.state.actingPlayerId)
  })

  it("creates and restores a persistent game session", async () => {
    const create = await SELF.fetch("http://example.com/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "worker-persistence",
        seed: "worker-seed",
        mode: "riichi",
        heuristicSamples: 1,
        players: [
          { id: "p1", name: "Human", controller: "human" },
          { id: "p2", name: "Bot 2", controller: "heuristic" },
          { id: "p3", name: "Bot 3", controller: "heuristic" },
          { id: "p4", name: "Bot 4", controller: "heuristic" },
        ],
      }),
    })
    expect(create.status).toBe(201)
    const created = await create.json<{
      state: {
        version: number
        phase: string
        actingPlayerId: string
        players: Array<{ id: string; privateCards: Array<{ id: string }> | { count: number } }>
      }
    }>()
    expect(created.state.phase).toBe("charleston")

    const restored = await SELF.fetch("http://example.com/api/games/worker-persistence?viewer=p1")
    expect(restored.status).toBe(200)
    const body = await restored.json<{ state: { version: number; handNumber: number } }>()
    expect(body.state.version).toBe(created.state.version)
    expect(body.state.handNumber).toBe(1)

    let state = created.state
    for (let step = 0; step < 12 && state.actingPlayerId !== "p1"; step += 1) {
      const response = await SELF.fetch(
        "http://example.com/api/games/worker-persistence/heuristic-step",
        { method: "POST" },
      )
      expect(response.status).toBe(200)
      state = (await response.json<{ state: typeof state }>()).state
    }
    expect(state.actingPlayerId).toBe("p1")
    const human = state.players.find((player) => player.id === "p1")!
    const humanCards = Array.isArray(human.privateCards) ? human.privateCards : []
    const humanPass = await SELF.fetch("http://example.com/api/games/worker-persistence/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "charleston",
        playerId: "p1",
        cardIds: humanCards.slice(0, 2).map((card) => card.id),
      }),
    })
    expect(humanPass.status).toBe(200)
    state = (await humanPass.json<{ state: typeof state }>()).state
    while (state.phase === "charleston") {
      const response = await SELF.fetch(
        "http://example.com/api/games/worker-persistence/heuristic-step",
        { method: "POST" },
      )
      expect(response.status).toBe(200)
      state = (await response.json<{ state: typeof state }>()).state
    }

    const events = await SELF.fetch("http://example.com/api/games/worker-persistence/events")
    const ledger = await events.json<{ events: Array<{ type: string }> }>()
    expect(ledger.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "game-created",
        "hand-started",
        "charleston-selected",
        "charleston-completed",
        "street-opened",
      ]),
    )

    const debug = await SELF.fetch("http://example.com/api/games/worker-persistence/debug")
    const debugBody = await debug.json<{
      state: { players: Array<{ privateCards: unknown[] }> }
      analyses: unknown[]
    }>()
    expect(debug.status).toBe(200)
    expect(debugBody.state.players.every((player) => player.privateCards.length === 7)).toBe(true)
    expect(debugBody.analyses).toHaveLength(4)
  })
  it("runs and reports simulation batches at the app's 24-sample budget", async () => {
    const response = await SELF.fetch("http://example.com/api/simulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seedPrefix: "budget-regression", count: 1 }),
    })
    expect(response.status).toBe(200)
    const batch = await response.json<{
      heuristicSamples: number
      results: Array<{ sessionId: string }>
    }>()
    expect(batch.heuristicSamples).toBe(24)
    const saved = await SELF.fetch(`http://example.com/api/games/${batch.results[0]!.sessionId}`)
    const result = await saved.json<{
      state: { phase: string; config: { heuristicSamples: number } }
    }>()
    expect(result.state.phase).toBe("finished")
    expect(result.state.config.heuristicSamples).toBe(24)
  }, 30000)
})
