import { DurableObject } from "cloudflare:workers"
import { prepareCharleston, stepHeuristic } from "../game/automation"
import { GameEngine, type PlayerSetup } from "../game/engine"
import { analyzePokerMath, chooseHeuristicAction } from "../game/heuristic"
import type {
  BettingAction,
  DebugGameView,
  DiscardPile,
  GameConfig,
  GameEvent,
  GameState,
  PublicGameState,
  SimulationResult,
} from "../game/types"

type StoredEventRow = {
  id: number
  type: string
  actor_id: string | null
  payload_json: string
  hand_number: number
  state_version: number
  created_at: string
}

export class GameSession extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ensureSchema()
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS game_state (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot TEXT NOT NULL);
      INSERT OR IGNORE INTO game_state (id, snapshot)
      SELECT 1, state_json FROM game_events ORDER BY id DESC LIMIT 1;
    `)
  }

  async newGame(
    players: PlayerSetup[],
    config: Partial<GameConfig> & Pick<GameConfig, "seed">,
  ): Promise<PublicGameState> {
    const engine = GameEngine.create(players, config)
    prepareCharleston(engine)
    this.persist(engine.state, engine.events, true)
    return engine.publicView(players.find((player) => player.controller === "human")?.id)
  }

  async getGame(viewerId?: string): Promise<PublicGameState> {
    return this.engine().publicView(viewerId)
  }

  async getDebugGame(): Promise<DebugGameView> {
    const engine = this.engine()
    const samples = engine.state.config.heuristicSamples
    const analyses = engine.state.players.map((player) =>
      analyzePokerMath(engine.state, player.id, samples),
    )
    const actingDecision =
      engine.state.phase === "betting" && engine.state.actingPlayerId
        ? chooseHeuristicAction(engine.state, engine.state.actingPlayerId, samples)
        : null

    return {
      state: engine.publicView(undefined, true),
      analyses,
      actingDecision,
      recentDrawDiscards: structuredClone(engine.state.drawDiscardHistory.slice(-8)),
    }
  }

  async applyBettingAction(
    playerId: string,
    action: BettingAction,
    offerStick = false,
  ): Promise<PublicGameState> {
    const engine = this.engine()
    engine.act(playerId, action, offerStick)
    this.commit(engine)
    return engine.publicView(playerId)
  }

  async resolveStick(
    playerId: string,
    source?: "deck" | "discard-a" | "discard-b",
  ): Promise<PublicGameState> {
    const engine = this.engine()
    if (source) engine.spendRiichiStick(playerId, source)
    else engine.finishStickDecision(playerId)
    this.commit(engine)
    return engine.publicView(playerId)
  }

  async applyCharleston(playerId: string, cardIds: string[]): Promise<PublicGameState> {
    const engine = this.engine()
    engine.passCharleston(playerId, cardIds)
    prepareCharleston(engine)
    this.commit(engine)
    return engine.publicView(playerId)
  }

  async applyExposure(playerId: string, cardIds: string[]): Promise<PublicGameState> {
    const engine = this.engine()
    engine.exposeCards(playerId, cardIds)
    this.commit(engine)
    return engine.publicView(playerId)
  }

  async applyDiscard(
    playerId: string,
    discardCardId: string,
    discardPile: DiscardPile,
  ): Promise<PublicGameState> {
    const engine = this.engine()
    engine.discard(playerId, { discardCardId, discardPile })
    this.commit(engine)
    return engine.publicView(playerId)
  }

  async takeLoan(playerId: string): Promise<PublicGameState> {
    const engine = this.engine()
    engine.takeLoan(playerId)
    this.commit(engine)
    return engine.publicView(playerId)
  }

  async repayLoan(playerId: string): Promise<PublicGameState> {
    const engine = this.engine()
    engine.repayLoan(playerId)
    this.commit(engine)
    return engine.publicView(playerId)
  }

  async nextHand(viewerId?: string): Promise<PublicGameState> {
    const engine = this.engine()
    engine.startNextHand()
    prepareCharleston(engine)
    this.commit(engine)
    return engine.publicView(viewerId)
  }

  async stepHeuristic(): Promise<{ state: PublicGameState; rationale: string }> {
    const engine = this.engine()
    const step = stepHeuristic(engine)
    this.commit(engine)
    const humanId = engine.state.players.find((player) => player.controller === "human")?.id
    return { state: engine.publicView(humanId ?? step.playerId), rationale: step.rationale }
  }

  async getEvents(limit = 500): Promise<GameEvent[]> {
    const bounded = Math.max(1, Math.min(2_000, Math.floor(limit)))
    const rows = [
      ...this.ctx.storage.sql.exec<StoredEventRow>(
        `
      SELECT id, type, actor_id, payload_json, hand_number, state_version, created_at
      FROM game_events ORDER BY id DESC LIMIT ?
    `,
        bounded,
      ),
    ].reverse()
    const game = this.requireGame()
    return rows.map((row) => ({
      sequence: row.id,
      gameId: game.id,
      handNumber: row.hand_number,
      type: row.type,
      ...(row.actor_id ? { actorId: row.actor_id } : {}),
      payload: JSON.parse(row.payload_json) as unknown,
      stateVersion: row.state_version,
      createdAt: row.created_at,
    }))
  }

  async storeSimulation(result: SimulationResult): Promise<void> {
    this.persist(result.state, result.events, true)
  }

  private engine(): GameEngine {
    return GameEngine.restore(this.requireGame())
  }

  private requireGame(): GameState {
    const row = this.ctx.storage.sql
      .exec<{ snapshot: string }>("SELECT snapshot FROM game_state WHERE id = 1")
      .toArray()[0]
    if (!row) throw new Error("Game session has not been created")
    const game = JSON.parse(row.snapshot) as GameState
    // Saved computer seats use the current built-in controller.
    for (const player of game.players) {
      if (player.controller !== "human") player.controller = "heuristic"
    }
    return game
  }

  private commit(engine: GameEngine): void {
    this.persist(engine.state, engine.events)
  }

  private persist(state: GameState, events: GameEvent[], replace = false): void {
    const snapshot = JSON.stringify(state)
    this.ctx.storage.transactionSync(() => {
      if (replace) this.ctx.storage.sql.exec("DELETE FROM game_events")
      for (const event of events) {
        this.ctx.storage.sql.exec(
          `INSERT INTO game_events (type, actor_id, payload_json, state_json, hand_number, state_version, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          event.type,
          event.actorId ?? null,
          JSON.stringify(event.payload),
          snapshot,
          event.handNumber,
          event.stateVersion,
          event.createdAt,
        )
      }
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO game_state (id, snapshot) VALUES (1, ?)",
        snapshot,
      )
    })
  }

  private ensureSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS game_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        actor_id TEXT,
        payload_json TEXT NOT NULL,
        state_json TEXT NOT NULL,
        hand_number INTEGER NOT NULL,
        state_version INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )
    `)
  }
}
