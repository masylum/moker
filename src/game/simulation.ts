import { GameEngine, type PlayerSetup } from "./engine";
import { chooseBlankClaim, chooseHeuristicAction, chooseHeuristicDiscard } from "./heuristic";
import { MAX_LOANS } from "./rules";
import type { GameConfig, HeuristicDecision, SimulationResult } from "./types";

export interface SimulationOptions extends Partial<GameConfig> {
  seed: string;
  playerCount?: number;
  players?: PlayerSetup[];
}

export function simulateGame(options: SimulationOptions): SimulationResult {
  const playerCount = options.players?.length ?? options.playerCount ?? 4;
  const players = options.players ?? Array.from({ length: playerCount }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Bot ${index + 1}`,
    controller: "heuristic" as const,
  }));
  const engine = GameEngine.create(players, {
    seed: options.seed,
    heuristicSamples: options.heuristicSamples ?? 12,
    activeSpecialHands: options.activeSpecialHands,
    startingChips: options.startingChips,
  });
  const decisions: HeuristicDecision[] = [];
  let safety = 0;

  while (engine.state.phase !== "finished") {
    safety += 1;
    if (safety > 20_000) throw new Error("Simulation exceeded the action safety limit");
    if (engine.state.phase === "between-hands") {
      ensureOpeningLiquidity(engine);
      engine.startNextHand();
      continue;
    }
    if (engine.state.phase === "blank-window") {
      const playerId = engine.state.blankWindow!.eligiblePlayerIds[0]!;
      const choice = chooseBlankClaim(engine.state, playerId, Math.min(8, engine.state.config.heuristicSamples));
      if (choice.claim) engine.claimBlank(playerId);
      else engine.passBlank(playerId);
      continue;
    }
    if (engine.state.phase === "discarding") {
      const playerId = engine.state.pendingDiscard!.playerId;
      const choice = chooseHeuristicDiscard(engine.state, playerId, engine.state.config.heuristicSamples);
      engine.discard(playerId, choice);
      continue;
    }
    if (engine.state.phase === "betting") {
      const playerId = engine.state.actingPlayerId;
      if (!playerId) throw new Error("Betting phase has no acting player");
      const decision = chooseHeuristicAction(engine.state, playerId, engine.state.config.heuristicSamples);
      decisions.push(decision);
      engine.act(playerId, decision.action);
    }
  }
  return { seed: options.seed, state: structuredClone(engine.state), events: structuredClone(engine.events), decisions };
}

export function simulateMany(count: number, options: Omit<SimulationOptions, "seed"> & { seedPrefix: string }): SimulationResult[] {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("Simulation count must be positive");
  return Array.from({ length: count }, (_, index) => simulateGame({ ...options, seed: `${options.seedPrefix}-${index}` }));
}

function ensureOpeningLiquidity(engine: GameEngine): void {
  const nextHand = engine.state.handNumber + 1;
  const handsPerOrbit = engine.state.config.playerCount === 2 ? 4 : engine.state.config.playerCount;
  const orbitValue = [5, 10, 15][Math.min(2, Math.floor((nextHand - 1) / handsPerOrbit))]!;
  for (const player of engine.state.players) {
    const charge = orbitValue * (player.blueSticks + player.loans);
    while (player.chips < charge && player.loans < MAX_LOANS) engine.takeLoan(player.id);
  }
}
