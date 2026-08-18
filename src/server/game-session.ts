import { Agent } from "agents"
import { stepHeuristic } from "../game/automation"
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

interface SessionState {
  game: GameState | null
}

interface StoredEventRow {
  id: number
  type: string
  actor_id: string | null
  payload_json: string
  state_json: string
  hand_number: number
  state_version: number
  created_at: string
}

export class GameSession extends Agent<Env, SessionState> {
  override initialState: SessionState = { game: null }

  async newGame(
    players: PlayerSetup[],
    config: Partial<GameConfig> & Pick<GameConfig, "seed">,
  ): Promise<PublicGameState> {
    this.ensureSchema()
    this.sql`DELETE FROM game_events`
    const engine = GameEngine.create(players, config)
    this.commit(engine)
    return engine.publicView(players.find((player) => player.controller === "human")?.id)
  }

  async getGame(viewerId?: string): Promise<PublicGameState> {
    return this.engine().publicView(viewerId)
  }

  async getInternalState(): Promise<GameState> {
    return structuredClone(this.requireGame())
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

  async applyBettingAction(playerId: string, action: BettingAction): Promise<PublicGameState> {
    const engine = this.engine()
    engine.act(playerId, action)
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

  async applySeedDiscard(
    playerId: string,
    discardCardId: string,
    discardPile: DiscardPile,
  ): Promise<PublicGameState> {
    const engine = this.engine()
    engine.seedDiscard(playerId, { discardCardId, discardPile })
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

  async getEvents(limit = 500): Promise<Array<GameEvent & { state: GameState }>> {
    this.ensureSchema()
    const bounded = Math.max(1, Math.min(2_000, Math.floor(limit)))
    const rows = [
      ...this.sql<StoredEventRow>`
      SELECT id, type, actor_id, payload_json, state_json, hand_number, state_version, created_at
      FROM game_events ORDER BY id DESC LIMIT ${bounded}
    `,
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
      state: JSON.parse(row.state_json) as GameState,
    }))
  }

  async storeSimulation(result: SimulationResult): Promise<void> {
    this.ensureSchema()
    this.sql`DELETE FROM game_events`
    const snapshot = JSON.stringify(result.state)
    for (const event of result.events) {
      this.sql`
        INSERT INTO game_events (type, actor_id, payload_json, state_json, hand_number, state_version, created_at)
        VALUES (${event.type}, ${event.actorId ?? null}, ${JSON.stringify(event.payload)}, ${snapshot}, ${event.handNumber}, ${event.stateVersion}, ${event.createdAt})
      `
    }
    this.setState({ game: structuredClone(result.state) })
  }

  private engine(): GameEngine {
    return GameEngine.restore(this.requireGame())
  }

  private requireGame(): GameState {
    if (!this.state.game) {
      throw new Error("Game session has not been created")
    }

    return this.state.game
  }

  private commit(engine: GameEngine): void {
    this.ensureSchema()
    const snapshot = JSON.stringify(engine.state)
    for (const event of engine.events) {
      this.sql`
        INSERT INTO game_events (type, actor_id, payload_json, state_json, hand_number, state_version, created_at)
        VALUES (${event.type}, ${event.actorId ?? null}, ${JSON.stringify(event.payload)}, ${snapshot}, ${event.handNumber}, ${event.stateVersion}, ${event.createdAt})
      `
    }
    this.setState({ game: structuredClone(engine.state) })
  }

  private ensureSchema(): void {
    this.sql`
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
    `
  }
}
