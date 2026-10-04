import {
  SELF,
  evictDurableObject,
  runInDurableObject,
  runDurableObjectAlarm,
} from "cloudflare:test"
import { env } from "cloudflare:workers"
import { describe, expect, it } from "vitest"
import type { PublicGameState } from "../src/game/types"

describe("Cloudflare Worker and Durable Object persistence", () => {
  it("serves health through the Worker entrypoint", async () => {
    const response = await SELF.fetch("http://example.com/api/health")
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true })
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
    expect(debugBody.state.players.every((player) => player.privateCards.length === 6)).toBe(true)
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

describe("native session storage", () => {
  const players = [
    { id: "p1", name: "One", controller: "human" as const },
    { id: "p2", name: "Two", controller: "human" as const },
  ]

  it("restores snapshots and events after eviction and recovers the previous ledger format", async () => {
    const stub = env.GAME_SESSION.getByName("storage-recovery")
    const initial = await stub.newGame(players, { seed: "storage-recovery" })
    const events = await stub.getEvents()
    await evictDurableObject(stub)
    expect(await stub.getGame("p1")).toEqual(initial)
    expect(await stub.getEvents()).toEqual(events)

    // Before native storage, the last event batch held the committed snapshot.
    await runInDurableObject(stub, (_instance, ctx) => {
      ctx.storage.sql.exec("DROP TABLE game_state")
    })
    await evictDurableObject(stub)
    expect(await stub.getGame("p1")).toEqual(initial)
    expect(await stub.getEvents()).toEqual(events)
  })

  it("rolls back event replacement when snapshot persistence fails", async () => {
    const stub = env.GAME_SESSION.getByName("storage-rollback")
    const initial = await stub.newGame(players, { seed: "original" })
    const events = await stub.getEvents()
    await runInDurableObject(stub, async (instance, ctx) => {
      ctx.storage.sql.exec(`CREATE TRIGGER reject_snapshot BEFORE INSERT ON game_state
        BEGIN SELECT RAISE(ABORT, 'injected storage failure'); END`)
      try {
        await expect(instance.newGame(players, { seed: "replacement" })).rejects.toThrow(
          "injected storage failure",
        )
        expect(await instance.getGame("p1")).toEqual(initial)
        expect(await instance.getEvents()).toEqual(events)
      } finally {
        ctx.storage.sql.exec("DROP TRIGGER reject_snapshot")
      }
    })
    await evictDurableObject(stub)
    expect(await stub.getGame("p1")).toEqual(initial)
  })

  it("rejects unsupported player controllers", async () => {
    const response = await SELF.fetch("http://example.com/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seed: "invalid",
        players: [players[0], { ...players[1], controller: "external" }],
      }),
    })
    expect(response.status).toBe(400)
  })
})

describe("online rooms", () => {
  async function create(mode = "basic", robot = false) {
    const response = await SELF.fetch("https://example.com/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seed: "never-use-client-seed",
        name: "Alice",
        mode,
        heuristicSamples: 1,
        players: [
          { id: "p1", name: "Player 1", controller: "human" },
          { id: "p2", name: "Player 2", controller: "human" },
          ...(robot ? [{ id: "p3", name: "Robot", controller: "heuristic" }] : []),
        ],
      }),
    })
    expect(response.status).toBe(201)
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("cache-control")).toBe("no-store")
    return {
      ...(await response.json<{ sessionId: string; state: PublicGameState }>()),
      cookie: response.headers.get("set-cookie")!.split(";")[0]!,
    }
  }
  function call(id: string, operation = "", cookie = "", body?: unknown) {
    return SELF.fetch(`https://example.com/api/rooms/${id}${operation ? `/${operation}` : ""}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  }
  async function join(id: string, name: string, cookie = "") {
    const response = await call(id, "join", cookie, { name })
    expect(response.status).toBe(200)
    return {
      ...(await response.json<{ state: PublicGameState }>()),
      cookie: response.headers.get("set-cookie")!.split(";")[0]!,
    }
  }
  const privateIds = (state: PublicGameState) =>
    state.players.filter((p) => Array.isArray(p.privateCards)).map((p) => p.id)

  it("creates ULID links, atomically fills seats, and restores ownership after eviction", async () => {
    const host = await create("riichi")
    expect(host.sessionId).toMatch(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
    expect(host.state.room).toEqual({ viewerId: "p1", hostId: "p1", waitingPlayerIds: ["p2"] })
    expect(host.state.players[0]!.name).toBe("Alice")
    expect(privateIds(host.state)).toEqual(["p1"])
    const early = await call(host.sessionId, "actions", host.cookie, {
      kind: "charleston",
      playerId: "p1",
      cardIds: ["a", "b"],
      expectedVersion: host.state.version,
    })
    expect(early.status).toBe(409)
    await early.arrayBuffer()
    const visitors = await Promise.all([join(host.sessionId, "Bob"), join(host.sessionId, "Carol")])
    expect(new Set(visitors.map((v) => v.state.room!.viewerId))).toEqual(new Set(["p2", null]))
    const seated = visitors.find((v) => v.state.room!.viewerId)!
    const observer = visitors.find((v) => !v.state.room!.viewerId)!
    expect(privateIds(seated.state)).toEqual(["p2"])
    expect(privateIds(observer.state)).toEqual([])
    expect(observer.state.room!.waitingPlayerIds).toEqual([])
    await evictDurableObject(env.GAME_SESSION.getByName(host.sessionId))
    const restored = await join(host.sessionId, "New name ignored on rejoin", seated.cookie)
    expect(restored.state.room!.viewerId).toBe("p2")
    expect(restored.state.players[1]!.name).toBe(seated.state.players[1]!.name)
    const renamed = await call(host.sessionId, "profile", seated.cookie, { name: "  River  " })
    expect(renamed.status).toBe(200)
    const hostView = await (
      await call(host.sessionId, "", host.cookie)
    ).json<{ state: PublicGameState }>()
    expect(hostView.state.players[1]!.name).toBe("River")
    expect(privateIds(hostView.state)).toEqual(["p1"])
    expect(
      (await call(host.sessionId, "profile", observer.cookie, { name: "Cheater" })).status,
    ).toBe(403)
  })

  it("blocks impersonation, observer actions, debug leaks, reset attacks, and seed reconstruction", async () => {
    const host = await create("riichi")
    const other = await join(host.sessionId, "Bob")
    const observer = await join(host.sessionId, "Observer")
    const publicResponse = await SELF.fetch(
      `https://example.com/api/rooms/${host.sessionId}?viewer=p1`,
    )
    const publicState = (await publicResponse.json<{ state: PublicGameState }>()).state
    expect(privateIds(publicState)).toEqual([])
    expect(publicState.config.seed).toBe("private")
    expect(publicState.rngState).toBe(0)
    expect(publicState.id).not.toContain("never-use-client-seed")
    const action = {
      kind: "charleston",
      playerId: "p1",
      cardIds: ["a", "b"],
      expectedVersion: other.state.version,
    }
    expect((await call(host.sessionId, "actions", other.cookie, action)).status).toBe(403)
    expect((await call(host.sessionId, "actions", observer.cookie, action)).status).toBe(403)
    expect((await call(host.sessionId, "actions", "", action)).status).toBe(403)
    for (const route of ["?viewer=p1", "/events", "/debug"]) {
      expect(
        (await SELF.fetch(`https://example.com/api/games/${host.sessionId}${route}`)).status,
      ).toBe(403)
    }
    expect(
      (
        await SELF.fetch(`https://example.com/api/games/${host.sessionId}/heuristic-step`, {
          method: "POST",
        })
      ).status,
    ).toBe(403)
    const reset = await SELF.fetch("https://example.com/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: host.sessionId,
        seed: "reset",
        players: [
          { name: "Thief", controller: "human" },
          { name: "Bot", controller: "heuristic" },
        ],
      }),
    })
    expect(reset.status).toBe(409)
    const crossOrigin = await SELF.fetch(`https://example.com/api/rooms/${host.sessionId}/join`, {
      method: "POST",
      headers: { Origin: "https://other.example", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Visitor" }),
    })
    expect(crossOrigin.status).toBe(403)
  })

  it("synchronizes private Charleston choices and rejects stale or repeated actions", async () => {
    const host = await create("riichi")
    const other = await join(host.sessionId, "Bob")
    const hostView = (
      await (await call(host.sessionId, "", host.cookie)).json<{ state: PublicGameState }>()
    ).state
    const cards = hostView.players[0]!.privateCards
    if (!Array.isArray(cards)) throw new Error("Missing host hand")
    const action = {
      kind: "charleston",
      playerId: "p1",
      cardIds: cards.slice(0, 2).map((c) => c.id),
      expectedVersion: hostView.version,
    }
    const played = await call(host.sessionId, "actions", host.cookie, action)
    expect(played.status).toBe(200)
    expect((await call(host.sessionId, "actions", host.cookie, action)).status).toBe(409)
    const updated = (
      await (await call(host.sessionId, "", other.cookie)).json<{ state: PublicGameState }>()
    ).state
    expect(updated.pendingPlayerIds).not.toContain("p1")
    expect(privateIds(updated)).toEqual(["p2"])
    const secondCards = updated.players[1]!.privateCards
    if (!Array.isArray(secondCards)) throw new Error("Missing second hand")
    const finished = await call(host.sessionId, "actions", other.cookie, {
      kind: "charleston",
      playerId: "p2",
      cardIds: secondCards.slice(0, 2).map((c) => c.id),
      expectedVersion: updated.version,
    })
    expect(finished.status).toBe(200)
    const state = (await finished.json<{ state: PublicGameState }>()).state
    expect(state.phase).toBe("betting")
    expect(state.charlestonReceivedCards).toHaveLength(2)
    expect(
      (
        await call(host.sessionId, "actions", other.cookie, {
          kind: "next-hand",
          expectedVersion: state.version,
        })
      ).status,
    ).toBe(403)
  })

  it("publishes turn changes even when declining a Riichi stick emits no event", async () => {
    const host = await create("riichi")
    const other = await join(host.sessionId, "Bob")
    let state = other.state
    for (const playerId of ["p1", "p2"]) {
      const cookie = playerId === "p1" ? host.cookie : other.cookie
      state = (await (await call(host.sessionId, "", cookie)).json<{ state: PublicGameState }>())
        .state
      const cards = state.players.find((p) => p.id === playerId)!.privateCards
      if (!Array.isArray(cards)) throw new Error("Missing private cards")
      const passed = await call(host.sessionId, "actions", cookie, {
        kind: "charleston",
        playerId,
        cardIds: cards.slice(0, 2).map((card) => card.id),
        expectedVersion: state.version,
      })
      state = (await passed.json<{ state: PublicGameState }>()).state
    }
    const actor = state.actingPlayerId!
    const actorCookie = actor === "p1" ? host.cookie : other.cookie
    const watcherCookie = actor === "p1" ? other.cookie : host.cookie
    const bet = await call(host.sessionId, "actions", actorCookie, {
      kind: "betting",
      playerId: actor,
      action: { type: "bet", amount: 10 },
      offerStick: true,
      expectedVersion: state.version,
    })
    expect(bet.status).toBe(200)
    const betting = (await bet.json<{ state: PublicGameState }>()).state
    expect(betting.stickWindow?.playerId).toBe(actor)
    const finish = await call(host.sessionId, "actions", actorCookie, {
      kind: "riichi-stick",
      playerId: actor,
      expectedVersion: betting.version,
    })
    expect(finish.status).toBe(200)
    const finished = (await finish.json<{ state: PublicGameState }>()).state
    expect(finished.version).toBeGreaterThan(betting.version)
    expect(finished.actingPlayerId).not.toBe(actor)
    const observed = (
      await (await call(host.sessionId, "", watcherCookie)).json<{ state: PublicGameState }>()
    ).state
    expect(observed.version).toBe(finished.version)
    expect(observed.actingPlayerId).toBe(finished.actingPlayerId)
    expect(observed.currentWager).toBe(10)
  })

  it("persists an optional Charleston loan and shares the new balance", async () => {
    const stub = env.GAME_SESSION.getByName("charleston-loan-room")
    await stub.newRoom(
      [
        { id: "p1", name: "Alice", controller: "human" },
        { id: "p2", name: "Bob", controller: "human" },
      ],
      { seed: "loan", mode: "riichi", startingChips: 100 },
      "alice",
      "Alice",
    )
    const joined = await stub.joinRoom("bob", "Bob")
    const borrowed = await stub.roomAction(
      "alice",
      { kind: "take-loan", playerId: "p1" },
      joined.version,
    )
    expect(borrowed.players[0]!.chips).toBe(295)
    expect(borrowed.players[0]!.loans).toBe(1)
    expect(borrowed.pendingPlayerIds).toContain("p1")
    await evictDurableObject(stub)
    const observed = await stub.getRoom("bob")
    expect(observed.players[0]!.chips).toBe(295)
    expect(observed.version).toBeGreaterThan(joined.version)
    expect(privateIds(observed)).toEqual(["p2"])
    await runInDurableObject(stub, async (instance) => {
      await expect(
        instance.roomAction("bob", { kind: "take-loan", playerId: "p1" }, observed.version),
      ).rejects.toThrow("own seat")
    })
  })

  it("lets the host deal the next round once, preserving seats and hiding folded hands", async () => {
    const host = await create()
    const other = await join(host.sessionId, "Bob")
    const state = other.state
    const actor = state.actingPlayerId!
    const response = await call(
      host.sessionId,
      "actions",
      actor === "p1" ? host.cookie : other.cookie,
      {
        kind: "betting",
        playerId: actor,
        action: { type: "fold" },
        expectedVersion: state.version,
      },
    )
    expect(response.status).toBe(200)
    const ended = (await response.json<{ state: PublicGameState }>()).state
    expect(ended.phase).toBe("between-hands")
    const observer = (await (await call(host.sessionId)).json<{ state: PublicGameState }>()).state
    expect(privateIds(observer)).toEqual([])
    const next = { kind: "next-hand", expectedVersion: ended.version }
    const dealt = await call(host.sessionId, "actions", host.cookie, next)
    expect(dealt.status).toBe(200)
    const second = (await dealt.json<{ state: PublicGameState }>()).state
    expect(second.handNumber).toBe(2)
    expect(second.room).toEqual({ viewerId: "p1", hostId: "p1", waitingPlayerIds: [] })
    expect(privateIds(second)).toEqual(["p1"])
    expect((await call(host.sessionId, "actions", host.cookie, next)).status).toBe(409)
  })

  it("runs robots through durable alarms and stops at human turns", async () => {
    const host = await create("basic", true)
    const other = await join(host.sessionId, "Bob")
    const stub = env.GAME_SESSION.getByName(host.sessionId)
    let state = other.state
    for (let index = 0; index < 3 && state.actingPlayerId !== "p3"; index += 1) {
      const cookie = state.actingPlayerId === "p1" ? host.cookie : other.cookie
      const played = await call(host.sessionId, "actions", cookie, {
        kind: "betting",
        playerId: state.actingPlayerId,
        action: { type: "check" },
        expectedVersion: state.version,
      })
      expect(played.status).toBe(200)
      state = (await played.json<{ state: PublicGameState }>()).state
      if (state.pendingDiscard) {
        const discarded = await call(host.sessionId, "actions", cookie, {
          kind: "discard",
          playerId: state.pendingDiscard.playerId,
          discardCardId: state.pendingDiscard.drawnCardId,
          discardPile: "a",
          expectedVersion: state.version,
        })
        if (discarded.status !== 200) throw new Error(await discarded.text())
        state = (await discarded.json<{ state: PublicGameState }>()).state
      }
    }
    expect(state.actingPlayerId).toBe("p3")
    await evictDurableObject(stub)
    expect(await runDurableObjectAlarm(stub)).toBe(true)
    const after = (
      await (await call(host.sessionId, "", host.cookie)).json<{ state: PublicGameState }>()
    ).state
    expect(after.version).toBeGreaterThan(state.version)
    expect(after.actingPlayerId).not.toBe("p3")
    expect(privateIds(after)).toEqual(["p1"])
    await runInDurableObject(stub, (instance) => instance.alarm())
    const unchanged = (
      await (await call(host.sessionId, "", host.cookie)).json<{ state: PublicGameState }>()
    ).state
    expect(unchanged.version).toBe(after.version)
  })
})
