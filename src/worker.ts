import { routeAgentRequest } from "agents"
import { z } from "zod"
import { simulateGame } from "./game/simulation"
import { SPECIAL_HANDS } from "./game/types"
import { GameSession } from "./server/game-session"
import { MahjongPlayer, type AgentOperation } from "./server/mahjong-player"

export { GameSession, MahjongPlayer }

const PlayerSchema = z.object({
  id: z.string().min(1).max(60).optional(),
  name: z.string().min(1).max(80),
  controller: z.enum(["human", "heuristic", "llm"]),
})
const CreateGameSchema = z.object({
  sessionId: z.string().min(1).max(120).optional(),
  seed: z.string().min(1).max(200),
  players: z.array(PlayerSchema).min(2).max(6),
  activeSpecialHands: z.array(z.enum(SPECIAL_HANDS)).optional(),
  heuristicSamples: z.int().min(1).max(256).optional(),
})
const ActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("betting"),
    playerId: z.string(),
    action: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("check"),
        drawSource: z.enum(["deck", "discard-a", "discard-b"]),
        blankExchange: z
          .object({
            blankCardId: z.string(),
            pile: z.enum(["a", "b"]),
            cardIndex: z.int().nonnegative(),
          })
          .optional(),
      }),
      z.object({
        type: z.literal("call"),
        drawSource: z.enum(["deck", "discard-a", "discard-b"]),
        blankExchange: z
          .object({
            blankCardId: z.string(),
            pile: z.enum(["a", "b"]),
            cardIndex: z.int().nonnegative(),
          })
          .optional(),
      }),
      z.object({
        type: z.literal("bet"),
        amount: z.int().positive(),
        riichi: z.boolean().optional(),
      }),
      z.object({
        type: z.literal("raise"),
        amount: z.int().positive(),
        riichi: z.boolean().optional(),
      }),
      z.object({ type: z.literal("fold") }),
    ]),
  }),
  z.object({
    kind: z.literal("discard"),
    playerId: z.string(),
    discardCardId: z.string(),
    discardPile: z.enum(["a", "b"]),
  }),
  z.object({ kind: z.literal("take-loan"), playerId: z.string() }),
  z.object({ kind: z.literal("repay-loan"), playerId: z.string() }),
  z.object({ kind: z.literal("next-hand"), viewerId: z.string().optional() }),
])
const SimulationSchema = z.object({
  count: z.int().min(1).max(20).default(1),
  seedPrefix: z.string().min(1).max(120),
  playerCount: z.int().min(2).max(6).default(4),
  heuristicSamples: z.int().min(1).max(64).default(8),
  activeSpecialHands: z.array(z.enum(SPECIAL_HANDS)).optional(),
})

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)
    const requestId = crypto.randomUUID()
    try {
      if (url.pathname.startsWith("/agents/")) {
        const response = await routeAgentRequest(request, env)

        if (response) {
          return response
        }
      }

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
    return Response.json({ ok: true, model: env.OPENROUTER_MODEL })
  }
  if (request.method === "POST" && url.pathname === "/api/games") {
    const input = CreateGameSchema.parse(await request.json())
    const sessionId = input.sessionId ?? crypto.randomUUID()
    const game = env.GAME_SESSION.getByName(sessionId)
    const state = await game.newGame(input.players, {
      seed: input.seed,
      activeSpecialHands: input.activeSpecialHands,
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
        playerCount: input.playerCount,
        heuristicSamples: input.heuristicSamples,
        activeSpecialHands: input.activeSpecialHands,
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
    return Response.json({ results })
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
  if (request.method === "GET" && operation === "reasoning") {
    const playerId = url.searchParams.get("player")
    if (!playerId)
      return Response.json({ error: "Missing player query parameter" }, { status: 400 })
    const player = env.MAHJONG_PLAYER.getByName(`${sessionId}:${playerId}`)
    return Response.json({ traces: await player.getReasoning((await game.getInternalState()).id) })
  }
  if (request.method === "POST" && operation === "actions") {
    const input = ActionSchema.parse(await request.json())
    const state = await applyAction(game, input)
    return Response.json({ state })
  }
  if (request.method === "POST" && operation === "heuristic-step") {
    return Response.json(await game.stepHeuristic())
  }
  if (request.method === "POST" && operation === "llm-step") {
    let state = await game.getInternalState()
    const playerId = decisionPlayerId(state)
    const agent = env.MAHJONG_PLAYER.getByName(`${sessionId}:${playerId}`)
    const decisions = []

    for (let step = 0; step < 2; step += 1) {
      const decision = await agent.decide(state.id, state, playerId)
      decisions.push(decision)
      await applyAgentOperation(game, playerId, decision.operation)
      state = await game.getInternalState()

      if (state.phase !== "discarding" || state.pendingDiscard?.playerId !== playerId) {
        break
      }
    }

    const humanId = state.players.find((player) => player.controller === "human")?.id
    const publicState = await game.getGame(humanId)
    return Response.json({
      state: publicState,
      rationale: decisions.map((decision) => decision.reasoningSummary).join(" "),
      turnId: decisions[0]!.turnId,
      turnIds: decisions.map((decision) => decision.turnId),
    })
  }
  return Response.json({ error: "Not found" }, { status: 404 })
}

async function applyAction(
  game: DurableObjectStub<GameSession>,
  input: z.infer<typeof ActionSchema>,
) {
  switch (input.kind) {
    case "betting":
      return game.applyBettingAction(input.playerId, input.action)
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

async function applyAgentOperation(
  game: DurableObjectStub<GameSession>,
  playerId: string,
  operation: AgentOperation,
) {
  switch (operation.kind) {
    case "betting":
      return game.applyBettingAction(playerId, operation.action as BettingActionForRpc)
    case "discard":
      return game.applyDiscard(
        playerId,
        operation.discardCardId,
        operation.discardPile as "a" | "b",
      )
  }

  throw new Error("Unknown agent operation")
}

type BettingActionForRpc = Parameters<GameSession["applyBettingAction"]>[1]

function decisionPlayerId(state: Awaited<ReturnType<GameSession["getInternalState"]>>): string {
  if (state.phase === "betting" && state.actingPlayerId) {
    return state.actingPlayerId
  }

  if (state.phase === "discarding" && state.pendingDiscard) {
    return state.pendingDiscard.playerId
  }

  throw new Error(`No LLM decision is available during ${state.phase}`)
}
