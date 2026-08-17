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
    const created = await create.json<{ state: { version: number } }>()

    const restored = await SELF.fetch("http://example.com/api/games/worker-persistence?viewer=p1")
    expect(restored.status).toBe(200)
    const body = await restored.json<{ state: { version: number; handNumber: number } }>()
    expect(body.state.version).toBe(created.state.version)
    expect(body.state.handNumber).toBe(1)

    const events = await SELF.fetch("http://example.com/api/games/worker-persistence/events")
    const ledger = await events.json<{ events: Array<{ type: string }> }>()
    expect(ledger.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["game-created", "hand-started", "street-opened"]),
    )
  })
})
