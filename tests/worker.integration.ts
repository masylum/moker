import { SELF } from "cloudflare:test"
import { describe, expect, it } from "vitest"

describe("Cloudflare Worker and Durable Object persistence", () => {
  it("serves health through the Worker entrypoint", async () => {
    const response = await SELF.fetch("http://example.com/api/health")
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, model: "x-ai/grok-4.6" })
  })

  it("creates and restores a persistent game session", async () => {
    const create = await SELF.fetch("http://example.com/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "worker-persistence",
        seed: "worker-seed",
        heuristicSamples: 1,
        players: [
          { id: "p1", name: "Human", controller: "human" },
          { id: "p2", name: "Bot", controller: "heuristic" },
        ],
      }),
    })
    expect(create.status).toBe(201)
    const created = await create.json<{
      state: {
        version: number
        phase: string
        players: Array<{ id: string; privateCards: Array<{ id: string }> | { count: number } }>
      }
    }>()
    expect(created.state.phase).toBe("seeding")

    const restored = await SELF.fetch("http://example.com/api/games/worker-persistence?viewer=p1")
    expect(restored.status).toBe(200)
    const body = await restored.json<{ state: { version: number; handNumber: number } }>()
    expect(body.state.version).toBe(created.state.version)
    expect(body.state.handNumber).toBe(1)

    const botSeed = await SELF.fetch(
      "http://example.com/api/games/worker-persistence/heuristic-step",
      { method: "POST" },
    )
    expect(botSeed.status).toBe(200)
    const human = created.state.players.find((player) => player.id === "p1")!
    const humanCards = Array.isArray(human.privateCards) ? human.privateCards : []
    const humanSeed = await SELF.fetch("http://example.com/api/games/worker-persistence/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "seed-discard",
        playerId: "p1",
        discardCardId: humanCards[0]!.id,
        discardPile: "b",
      }),
    })
    expect(humanSeed.status).toBe(200)

    const events = await SELF.fetch("http://example.com/api/games/worker-persistence/events")
    const ledger = await events.json<{ events: Array<{ type: string }> }>()
    expect(ledger.events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "game-created",
        "hand-started",
        "seed-discard-started",
        "seed-discard",
        "street-opened",
      ]),
    )

    const debug = await SELF.fetch("http://example.com/api/games/worker-persistence/debug")
    const debugBody = await debug.json<{
      state: { players: Array<{ privateCards: unknown[] }> }
      analyses: unknown[]
    }>()
    expect(debug.status).toBe(200)
    expect(debugBody.state.players.every((player) => player.privateCards.length === 3)).toBe(true)
    expect(debugBody.analyses).toHaveLength(2)
  })
})
