import { z } from "zod"
import { ActionSchema, CreateGameSchema, SimulationSchema } from "./server/schemas"
import { simulateGame } from "./game/simulation"
import { GameSession } from "./server/game-session"

export { GameSession }

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    const requestId = crypto.randomUUID()
    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url)
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
      return Response.json(
        { error: message, requestId },
        { status: error instanceof z.ZodError ? 400 : 500 },
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
    const sessionId = input.sessionId ?? crypto.randomUUID()
    const game = env.GAME_SESSION.getByName(sessionId)
    const state = await game.newGame(input.players, {
      seed: input.seed,
      mode: input.mode,
      tournamentGames: input.tournamentGames,
      orbits: input.orbits,
      heuristicSamples: input.heuristicSamples,
    })
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

  const match = url.pathname.match(/^\/api\/games\/([^/]+)(?:\/(.+))?$/)
  if (!match) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const sessionId = decodeURIComponent(match[1]!)
  const operation = match[2] ?? ""
  const game = env.GAME_SESSION.getByName(sessionId)

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
    case "riichi-stick":
      return game.resolveStick(input.playerId, input.source)
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
