import type { z } from "zod"
import type { ActionSchema } from "./schemas"
import { DurableObject } from "cloudflare:workers"
import { prepareCharleston, stepHeuristic } from "../game/automation"
import { GameEngine, type PlayerSetup } from "../game/engine"
import { analyzePokerMath, chooseHeuristicAction } from "../game/heuristic"
import type {
  BettingAction,
  BlankExchange,
  TreasureSearch,
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
      CREATE TABLE IF NOT EXISTS room_members (identity TEXT PRIMARY KEY, player_id TEXT UNIQUE);
      CREATE TABLE IF NOT EXISTS room_host (id INTEGER PRIMARY KEY CHECK (id = 1), player_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS game_state (id INTEGER PRIMARY KEY CHECK (id = 1), snapshot TEXT NOT NULL);
      INSERT OR IGNORE INTO game_state (id, snapshot)
      SELECT 1, state_json FROM game_events ORDER BY id DESC LIMIT 1;
    `)
  }

  async newGame(
    players: PlayerSetup[],
    config: Partial<GameConfig> & Pick<GameConfig, "seed">,
  ): Promise<PublicGameState> {
    if (this.isRoom()) throw new Error("[409] This room already exists")
    const engine = GameEngine.create(players, config)
    prepareCharleston(engine)
    this.persist(engine.state, engine.events, true)
    return engine.publicView(players.find((player) => player.controller === "human")?.id)
  }

  isRoom(): boolean {
    return this.ctx.storage.sql.exec("SELECT id FROM room_host").toArray().length > 0
  }

  async newRoom(
    players: PlayerSetup[],
    config: Partial<GameConfig> & Pick<GameConfig, "seed">,
    identity: string,
    name: string,
  ): Promise<PublicGameState> {
    if (this.isRoom()) throw new Error("[409] This room already exists")
    const hostIndex = players.findIndex((p) => p.controller === "human")
    const engine = GameEngine.create(
      players.map((p, i) => (i === hostIndex ? { ...p, name } : p)),
      { ...config, seed: crypto.randomUUID() },
    )
    const host = engine.state.players.find((player) => player.controller === "human")!
    host.name = name
    prepareCharleston(engine)
    this.ctx.storage.transactionSync(() => {
      this.persist(engine.state, engine.events, true)
      this.ctx.storage.sql.exec("INSERT INTO room_host VALUES (1, ?)", host.id)
      this.ctx.storage.sql.exec("INSERT INTO room_members VALUES (?, ?)", identity, host.id)
    })
    return this.roomView(engine, identity)
  }

  async joinRoom(identity: string, name: string): Promise<PublicGameState> {
    const engine = this.roomEngine()
    const existing = this.member(identity)
    if (!existing) {
      const open = this.waitingPlayers(engine)[0]
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec("INSERT INTO room_members VALUES (?, ?)", identity, open ?? null)
        if (open) {
          engine.state.players.find((player) => player.id === open)!.name = name
          engine.state.version += 1
          this.commit(engine)
        }
      })
      await this.scheduleRoomBot(engine)
    }
    return this.roomView(engine, identity)
  }

  async getRoom(identity: string): Promise<PublicGameState> {
    return this.roomView(this.roomEngine(), identity)
  }

  async renameRoomPlayer(identity: string, name: string): Promise<PublicGameState> {
    const engine = this.roomEngine()
    const id = this.member(identity)?.player_id
    if (!id) throw new Error("[403] Observers cannot rename players")
    engine.state.players.find((player) => player.id === id)!.name = name
    engine.state.version += 1
    this.commit(engine)
    return this.roomView(engine, identity)
  }

  async roomAction(
    identity: string,
    input: z.infer<typeof ActionSchema>,
    expectedVersion: number,
  ): Promise<PublicGameState> {
    const engine = this.roomEngine()
    const id = this.member(identity)?.player_id
    if (!id) throw new Error("[403] Observers cannot play")
    if (this.waitingPlayers(engine).length) throw new Error("[409] Waiting for human players")
    if (input.kind === "next-hand" ? id !== this.hostId() : input.playerId !== id) {
      throw new Error("[403] You can only control your own seat; the host deals each round")
    }
    if (engine.state.version !== expectedVersion)
      throw new Error("[409] The table changed. Try again")
    try {
      switch (input.kind) {
        case "treasure-choice":
          engine.chooseTreasure(id, input.cardIds, input.returnCardId)
          break
        case "riichi-stick":
          if (input.source) engine.spendRiichiStick(id, input.source, input)
          else engine.finishStickDecision(id)
          break
        case "betting":
          engine.act(id, input.action, input.offerStick)
          break
        case "charleston":
          engine.passCharleston(id, input.cardIds)
          prepareCharleston(engine)
          break
        case "expose":
          engine.exposeCards(id, input.cardIds)
          break
        case "discard":
          engine.discard(id, { discardCardId: input.discardCardId, discardPile: input.discardPile })
          break
        case "take-loan":
          engine.takeLoan(id)
          break
        case "repay-loan":
          engine.repayLoan(id)
          break
        case "next-hand":
          engine.startNextHand()
          prepareCharleston(engine)
          break
      }
    } catch (error) {
      throw new Error(`[409] ${error instanceof Error ? error.message : "Invalid move"}`, {
        cause: error,
      })
    }
    // Some transitions (such as declining a stick) do not emit an engine event.
    // Room revisions must still advance so every connected player receives them.
    engine.state.version = Math.max(engine.state.version, expectedVersion + 1)
    this.commit(engine)
    await this.scheduleRoomBot(engine)
    return this.roomView(engine, identity)
  }

  override async alarm(): Promise<void> {
    if (!this.isRoom()) return
    const engine = this.roomEngine()
    if (!this.roomBotCanAct(engine)) return
    stepHeuristic(engine)
    this.commit(engine)
    await this.scheduleRoomBot(engine)
  }

  private roomEngine(): GameEngine {
    if (!this.isRoom()) throw new Error("[404] Room not found")
    return this.engine()
  }

  private member(identity: string) {
    return this.ctx.storage.sql
      .exec<{ player_id: string | null }>(
        "SELECT player_id FROM room_members WHERE identity = ?",
        identity,
      )
      .toArray()[0]
  }

  private hostId(): string {
    return this.ctx.storage.sql.exec<{ player_id: string }>("SELECT player_id FROM room_host").one()
      .player_id
  }

  private waitingPlayers(engine: GameEngine): string[] {
    const occupied = new Set(
      this.ctx.storage.sql
        .exec<{ player_id: string | null }>("SELECT player_id FROM room_members")
        .toArray()
        .map((member) => member.player_id),
    )
    return engine.state.players
      .filter((player) => player.controller === "human" && !occupied.has(player.id))
      .map((player) => player.id)
  }

  private roomView(engine: GameEngine, identity: string): PublicGameState {
    const viewerId = this.member(identity)?.player_id ?? null
    const state = engine.publicView(viewerId ?? undefined)
    // A reproducible shuffle is useful for local games, but would expose online hands.
    state.config.seed = "private"
    state.id = "room"
    state.rngState = 0
    state.room = { viewerId, hostId: this.hostId(), waitingPlayerIds: this.waitingPlayers(engine) }
    return state
  }

  private roomBotCanAct(engine: GameEngine): boolean {
    const state = engine.state
    const actorId = state.pendingDiscard?.playerId ?? state.actingPlayerId
    return (
      !this.waitingPlayers(engine).length &&
      ["treasure", "charleston", "exposing", "betting", "discarding"].includes(state.phase) &&
      state.players.some((player) => player.id === actorId && player.controller !== "human")
    )
  }

  private async scheduleRoomBot(engine: GameEngine): Promise<void> {
    if (this.roomBotCanAct(engine)) await this.ctx.storage.setAlarm(Date.now() + 1300)
  }

  async getGame(viewerId?: string): Promise<PublicGameState> {
    return this.engine().publicView(viewerId)
  }

  async getDebugGame(): Promise<DebugGameView> {
    const engine = this.engine()
    const samples = engine.state.config.heuristicSamples
    const analyses =
      engine.state.config.mode === "legacy"
        ? []
        : engine.state.players.map((player) => analyzePokerMath(engine.state, player.id, samples))
    const actingDecision =
      engine.state.config.mode !== "legacy" &&
      engine.state.phase === "betting" &&
      engine.state.actingPlayerId
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
    fishing: { blankExchange?: BlankExchange; treasureSearch?: TreasureSearch } = {},
  ): Promise<PublicGameState> {
    const engine = this.engine()
    if (source) engine.spendRiichiStick(playerId, source, fishing)
    else engine.finishStickDecision(playerId)
    this.commit(engine)
    return engine.publicView(playerId)
  }

  async legacyChoice(
    playerId: string,
    cardIds: string[],
    returnCardId?: string,
  ): Promise<PublicGameState> {
    const engine = this.engine()
    engine.chooseTreasure(playerId, cardIds, returnCardId)
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
