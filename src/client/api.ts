import type { BettingAction, PublicGameState } from "../game/types";

export async function createGame(seed: string) {
  return request<{ sessionId: string; state: PublicGameState }>("/api/games", {
    method: "POST",
    body: JSON.stringify({
      seed,
      heuristicSamples: 16,
      players: [
        { id: "p1", name: "You", controller: "human" },
        { id: "p2", name: "Mori", controller: "heuristic" },
        { id: "p3", name: "Kiko", controller: "heuristic" },
        { id: "p4", name: "Grok", controller: "llm" },
      ],
    }),
  });
}

export async function loadGame(sessionId: string, viewer = "p1") {
  return request<{ sessionId: string; state: PublicGameState }>(`/api/games/${encodeURIComponent(sessionId)}?viewer=${viewer}`);
}

export async function gameAction(sessionId: string, action: Record<string, unknown>) {
  return request<{ state: PublicGameState }>(`/api/games/${encodeURIComponent(sessionId)}/actions`, {
    method: "POST",
    body: JSON.stringify(action),
  });
}

export async function bettingAction(sessionId: string, playerId: string, action: BettingAction) {
  return gameAction(sessionId, { kind: "betting", playerId, action });
}

export async function botStep(sessionId: string, kind: "heuristic" | "llm") {
  return request<{ state: PublicGameState; rationale: string }>(`/api/games/${encodeURIComponent(sessionId)}/${kind}-step`, { method: "POST" });
}

export async function getEvents(sessionId: string) {
  return request<{ events: Array<{ sequence: number; handNumber: number; type: string; actorId?: string; payload: unknown }> }>(
    `/api/games/${encodeURIComponent(sessionId)}/events?limit=100`,
  );
}

export async function runSimulations(seedPrefix: string, count: number) {
  return request<{ results: Array<{ sessionId: string; seed: string; finalScores: Record<string, number>; eventCount: number; decisionCount: number }> }>("/api/simulations", {
    method: "POST",
    body: JSON.stringify({ seedPrefix, count, playerCount: 4, heuristicSamples: 6 }),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body;
}
