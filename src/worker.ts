import { z } from "zod"
import {
  ActionSchema,
  CreateGameSchema,
  RoomProfileSchema,
  SimulationSchema,
} from "./server/schemas"
import { simulateGame } from "./game/simulation"
import { GameSession } from "./server/game-session"
import { roomId } from "./server/ulid"

export { GameSession }

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    const requestId = crypto.randomUUID()
    try {
      if (url.pathname.startsWith("/api/")) {
        if (
          request.method !== "GET" &&
          request.headers.get("Origin") &&
          request.headers.get("Origin") !== url.origin
        ) {
          return Response.json({ error: "Cross-origin request rejected" }, { status: 403 })
        }
        const response = await handleApi(request, env, url)
        response.headers.set("Cache-Control", "no-store")
        return response
      }

      return env.ASSETS.fetch(request)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error(
        JSON.stringify({
          level: "error",
          message: "request failed",
          requestId,
          path: url.pathname,
          error: message,
        }),
      )
      const status = message.match(/^\[(400|403|404|409)\] /)
      return Response.json(
        { error: message.replace(/^\[\d+\] /, ""), requestId },
        { status: error instanceof z.ZodError ? 400 : status ? Number(status[1]) : 500 },
      )
    }
  },
} satisfies ExportedHandler<Env>

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return Response.json({ ok: true })
  }
  if (request.method === "POST" && url.pathname === "/api/games") {
    const input = CreateGameSchema.parse(await request.json())
    const config = {
      seed: input.seed,
      mode: input.mode,
      tournamentGames: input.tournamentGames,
      orbits: input.orbits,
      heuristicSamples: input.heuristicSamples,
    }
    if (input.players.filter((player) => player.controller === "human").length > 1) {
      const sessionId = roomId()
      const identity = await roomIdentity(request)
      const state = await env.GAME_SESSION.getByName(sessionId).newRoom(
        input.players,
        config,
        identity.hash,
        input.name ?? "Player 1",
      )
      return roomResponse(request, { sessionId, state }, identity.token, 201)
    }
    const sessionId = input.sessionId ?? crypto.randomUUID()
    const game = env.GAME_SESSION.getByName(sessionId)
    const state = await game.newGame(input.players, config)
    return Response.json({ sessionId, state }, { status: 201 })
  }
  if (request.method === "POST" && url.pathname === "/api/simulations") {
    const input = SimulationSchema.parse(await request.json())
    const results = []
    for (let index = 0; index < input.count; index += 1) {
      const seed = `${input.seedPrefix}-${index}`
      const result = simulateGame({
        seed,
        heuristicSamples: input.heuristicSamples,
      })
      const sessionId = `simulation-${input.seedPrefix}-${index}`
      await env.GAME_SESSION.getByName(sessionId).storeSimulation(result)
      results.push({
        sessionId,
        seed,
        finalScores: result.state.finalScores,
        eventCount: result.events.length,
        decisionCount: result.decisions.length,
      })
    }
    return Response.json({ results, heuristicSamples: input.heuristicSamples })
  }

  const roomMatch = url.pathname.match(
    /^\/api\/rooms\/([0-7][0-9A-HJKMNP-TV-Z]{25})(?:\/(join|profile|actions))?$/,
  )
  if (roomMatch) {
    const game = env.GAME_SESSION.getByName(roomMatch[1]!)
    const identity = await roomIdentity(request)
    if (request.method === "GET" && !roomMatch[2]) {
      return Response.json({ state: await game.getRoom(identity.hash) })
    }
    if (request.method === "POST" && roomMatch[2] === "join") {
      const input = RoomProfileSchema.parse(await request.json())
      const state = await game.joinRoom(identity.hash, input.name)
      return roomResponse(request, { state }, identity.token)
    }
    if (request.method === "POST" && roomMatch[2] === "profile") {
      const input = RoomProfileSchema.parse(await request.json())
      return Response.json({ state: await game.renameRoomPlayer(identity.hash, input.name) })
    }
    if (request.method === "POST" && roomMatch[2] === "actions") {
      const body = await request.json()
      const input = ActionSchema.parse(body)
      const { expectedVersion } = z.object({ expectedVersion: z.int().nonnegative() }).parse(body)
      return Response.json({ state: await game.roomAction(identity.hash, input, expectedVersion) })
    }
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const match = url.pathname.match(/^\/api\/games\/([^/]+)(?:\/(.+))?$/)
  if (!match) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const sessionId = decodeURIComponent(match[1]!)
  const operation = match[2] ?? ""
  const game = env.GAME_SESSION.getByName(sessionId)
  if (await game.isRoom()) return Response.json({ error: "Use the room URL" }, { status: 403 })

  if (request.method === "GET" && operation === "") {
    return Response.json({
      sessionId,
      state: await game.getGame(url.searchParams.get("viewer") ?? undefined),
    })
  }
  if (request.method === "GET" && operation === "events") {
    return Response.json({
      events: await game.getEvents(Number(url.searchParams.get("limit") ?? 500)),
    })
  }
  if (request.method === "GET" && operation === "debug") {
    return Response.json(await game.getDebugGame())
  }
  if (request.method === "POST" && operation === "actions") {
    const input = ActionSchema.parse(await request.json())
    const state = await applyAction(game, input)
    return Response.json({ state })
  }
  if (request.method === "POST" && operation === "heuristic-step") {
    return Response.json(await game.stepHeuristic())
  }
  return Response.json({ error: "Not found" }, { status: 404 })
}

async function applyAction(
  game: DurableObjectStub<GameSession>,
  input: z.infer<typeof ActionSchema>,
) {
  switch (input.kind) {
    case "treasure-choice":
      return game.legacyChoice(input.playerId, input.cardIds, input.returnCardId)
    case "riichi-stick":
      return game.resolveStick(input.playerId, input.source, input)
    case "betting":
      return game.applyBettingAction(input.playerId, input.action, input.offerStick)
    case "charleston":
      return game.applyCharleston(input.playerId, input.cardIds)
    case "expose":
      return game.applyExposure(input.playerId, input.cardIds)
    case "discard":
      return game.applyDiscard(input.playerId, input.discardCardId, input.discardPile)
    case "take-loan":
      return game.takeLoan(input.playerId)
    case "repay-loan":
      return game.repayLoan(input.playerId)
    case "next-hand":
      return game.nextHand(input.viewerId)
  }

  throw new Error("Unknown game action")
}

async function roomIdentity(request: Request) {
  const saved = request.headers
    .get("Cookie")
    ?.match(/(?:^|;\s*)moker-player=([a-f0-9-]{36})(?:;|$)/)?.[1]
  const token = saved ?? crypto.randomUUID()
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
  return { token, hash }
}

function roomResponse(request: Request, body: unknown, token: string, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Set-Cookie": `moker-player=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    },
  })
}
