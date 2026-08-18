import { Think, type StepContext, type TurnContext } from "@cloudflare/think"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { tool } from "ai"
import { z } from "zod"
import { GameEngine } from "../game/engine"
import { analyzeHandProgress, summarizeHandProgress } from "../game/hand-progress"
import { CHIP_UNIT } from "../game/rules"
import {
  chooseHeuristicAction,
  chooseHeuristicDiscard,
  chooseHeuristicSeedDiscard,
} from "../game/heuristic"
import { agentRulebook } from "../game/rulebook"
import type { GameState } from "../game/types"

const BettingOperationSchema = z.object({
  kind: z.literal("betting"),
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
})
const DiscardOperationSchema = z.object({
  kind: z.literal("discard"),
  discardCardId: z.string(),
  discardPile: z.enum(["a", "b"]),
})
const SeedDiscardOperationSchema = z.object({
  kind: z.literal("seed-discard"),
  discardCardId: z.string(),
  discardPile: z.enum(["a", "b"]),
})
const OperationSchema = z.discriminatedUnion("kind", [
  BettingOperationSchema,
  DiscardOperationSchema,
  SeedDiscardOperationSchema,
])
type AgentOperation = z.infer<typeof OperationSchema>

interface TraceRow {
  id: number
  game_id: string
  turn_id: string
  kind: string
  content_json: string
  created_at: string
}

interface DecisionRow {
  operation_json: string
  reasoning_summary: string
}

export class MahjongPlayer extends Think<Env> {
  private gameTurnContext: {
    gameId: string
    turnId: string
    playerId: string
    state: GameState
  } | null = null
  override sendReasoning = true
  override storeMessages = true
  override storeTools = true
  override maxSteps = 6
  override chatStreamStallTimeoutMs = 120_000

  override getModel() {
    return createOpenRouter({
      apiKey: this.env.OPENROUTER_API_KEY,
      headers: {
        "HTTP-Referer": this.env.APP_URL,
        "X-OpenRouter-Title": "Mahjong Poker Lab",
      },
    })(this.env.OPENROUTER_MODEL)
  }

  override getSystemPrompt(): string {
    return [
      "You are an expert Mahjong Poker player.",
      "Maximize final chips and the highest single Hand on the fixed ladder, accounting for pot equity, future blue-stick charges, loan penalties, live discards, Riichi, and information hidden from you.",
      "Use only legal public information about opponents. The position's knownPrivateCards records tiles retained after public Fishing or Blank exchanges, and bettingHistory records public action strength; compare those ranges with your Hand instead of treating every opponent as fully unknown. Inspect the canonical rules, position, pattern progress, and statistical baseline with tools, then call commit_decision exactly once.",
      "The reasoning_summary must be a concise, auditable strategic explanation, not hidden chain-of-thought.",
      agentRulebook(),
    ].join(" ")
  }

  override beforeTurn(context: TurnContext) {
    const body = context.body
    if (
      !body ||
      typeof body.gameId !== "string" ||
      typeof body.turnId !== "string" ||
      typeof body.playerId !== "string" ||
      !isGameState(body.state)
    ) {
      throw new Error("Missing trusted game context for Mahjong turn")
    }
    this.gameTurnContext = {
      gameId: body.gameId,
      turnId: body.turnId,
      playerId: body.playerId,
      state: body.state,
    }
    return { toolChoice: "required" as const }
  }

  override getTools() {
    return {
      inspect_rules: tool({
        description: "Read the canonical engine rules and complete fixed Hand ladder.",
        inputSchema: z.object({}),
        execute: async () => agentRulebook(),
      }),
      inspect_position: tool({
        description: "Inspect the legal, player-visible game position for this turn.",
        inputSchema: z.object({}),
        execute: async () => {
          const context = this.turnContext()
          return GameEngine.restore(context.state).publicView(context.playerId)
        },
      }),
      statistical_baseline: tool({
        description:
          "Get deterministic Monte Carlo heuristic evaluations as a baseline to improve upon.",
        inputSchema: z.object({}),
        execute: async () => {
          const { state, playerId } = this.turnContext()
          if (state.phase === "betting")
            return chooseHeuristicAction(state, playerId, state.config.heuristicSamples)
          if (state.phase === "discarding")
            return chooseHeuristicDiscard(state, playerId, state.config.heuristicSamples)
          if (state.phase === "seeding")
            return chooseHeuristicSeedDiscard(state, playerId, state.config.heuristicSamples)
          return { error: `No decision is available during ${state.phase}` }
        },
      }),
      inspect_pattern_progress: tool({
        description:
          "Measure the visible hand's current best Hand and distance from every stronger Hand using the scoring definitions.",
        inputSchema: z.object({}),
        execute: async () => {
          const { state, playerId } = this.turnContext()
          const player = state.players.find((candidate) => candidate.id === playerId)

          if (!player) {
            throw new Error("Unknown player in trusted turn context")
          }

          const cards = [...player.privateCards, ...state.community]

          return {
            ...summarizeHandProgress(cards),
            hands: analyzeHandProgress(cards),
          }
        },
      }),
      commit_decision: tool({
        description:
          "Commit the single legal operation to perform and an auditable strategic summary.",
        inputSchema: z.object({
          operation: OperationSchema,
          reasoningSummary: z.string().min(12).max(1200),
        }),
        execute: async ({ operation, reasoningSummary }) => {
          const context = this.turnContext()
          validateOperation(context.state, context.playerId, operation)
          this.ensureSchema()
          this.sql`
            INSERT OR REPLACE INTO llm_decisions (turn_id, game_id, player_id, operation_json, reasoning_summary, created_at)
            VALUES (${context.turnId}, ${context.gameId}, ${context.playerId}, ${JSON.stringify(operation)}, ${reasoningSummary}, ${new Date().toISOString()})
          `
          return { committed: true, operation }
        },
      }),
    }
  }

  async decide(
    gameId: string,
    state: GameState,
    playerId: string,
  ): Promise<{ operation: AgentOperation; reasoningSummary: string; turnId: string }> {
    const turnId = crypto.randomUUID()
    const publicState = GameEngine.restore(state).publicView(playerId)
    await this.runTurn({
      mode: "wait",
      input: `Choose the best legal operation for ${playerId}. Current player-visible state:\n${JSON.stringify(publicState)}`,
      body: { gameId, turnId, playerId, state },
      channel: "web",
    })
    this.ensureSchema()
    const row = [
      ...this.sql<DecisionRow>`
      SELECT operation_json, reasoning_summary FROM llm_decisions
      WHERE turn_id = ${turnId}
    `,
    ][0]
    if (!row) {
      throw new Error("The LLM did not commit a decision")
    }

    return {
      operation: OperationSchema.parse(JSON.parse(row.operation_json)),
      reasoningSummary: row.reasoning_summary,
      turnId,
    }
  }

  override onStepEnd(context: StepContext): void {
    const gameId = this.gameTurnContext?.gameId ?? "unknown"
    const turnId = this.gameTurnContext?.turnId ?? crypto.randomUUID()
    this.ensureSchema()
    const content = {
      text: context.text,
      reasoning: context.reasoning,
      toolCalls: context.toolCalls,
      toolResults: context.toolResults,
      usage: context.usage,
      finishReason: context.finishReason,
    }
    this.sql`
      INSERT INTO reasoning_artifacts (game_id, turn_id, kind, content_json, created_at)
      VALUES (${gameId}, ${turnId}, ${"model-step"}, ${safeStringify(content)}, ${new Date().toISOString()})
    `
  }

  async getReasoning(gameId: string, limit = 100): Promise<TraceRow[]> {
    this.ensureSchema()
    const bounded = Math.max(1, Math.min(500, Math.floor(limit)))
    return [
      ...this.sql<TraceRow>`
      SELECT id, game_id, turn_id, kind, content_json, created_at
      FROM reasoning_artifacts WHERE game_id = ${gameId}
      ORDER BY id DESC LIMIT ${bounded}
    `,
    ].reverse()
  }

  private turnContext(): { gameId: string; turnId: string; playerId: string; state: GameState } {
    if (!this.gameTurnContext) {
      throw new Error("Missing trusted game turn context")
    }

    return this.gameTurnContext
  }

  private ensureSchema(): void {
    this.sql`
      CREATE TABLE IF NOT EXISTS reasoning_artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        turn_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        content_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS llm_decisions (
        turn_id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        operation_json TEXT NOT NULL,
        reasoning_summary TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `
  }
}

function validateOperation(state: GameState, playerId: string, operation: AgentOperation): void {
  if (operation.kind === "betting") {
    const legal = GameEngine.restore(state)
      .legalActions(playerId)
      .find((entry) => entry.type === operation.action.type)
    if (!legal) {
      throw new Error("Committed betting action is illegal")
    }

    if (
      (operation.action.type === "bet" || operation.action.type === "raise") &&
      (operation.action.amount < (legal.minimum ?? 0) ||
        operation.action.amount > (legal.maximum ?? 0) ||
        operation.action.amount % CHIP_UNIT !== 0)
    ) {
      throw new Error("Committed wager is outside legal bounds")
    }
    return
  }
  if (
    operation.kind === "discard" &&
    (state.phase !== "discarding" || state.pendingDiscard?.playerId !== playerId)
  )
    throw new Error("Discard is not legal now")

  if (
    operation.kind === "seed-discard" &&
    (state.phase !== "seeding" || state.actingPlayerId !== playerId)
  ) {
    throw new Error("Seed discard is not legal now")
  }
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as { id?: unknown; players?: unknown; phase?: unknown; config?: unknown }
  return (
    typeof candidate.id === "string" &&
    Array.isArray(candidate.players) &&
    typeof candidate.phase === "string" &&
    typeof candidate.config === "object"
  )
}

function safeStringify(value: unknown): string {
  return JSON.stringify(value, (_key, nested) =>
    typeof nested === "bigint" ? nested.toString() : nested,
  )
}

export type { AgentOperation }
