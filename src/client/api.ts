import type { BettingAction, PublicGameState } from "../game/types"

export type SeatKind = "human" | "robot" | "none"

export async function createGame(
  seed: string,
  mode: "basic" | "riichi" = "basic",
  playerCount = 4,
  tournamentGames: 1 | 2 | 3 | 4 = 1,
  orbits = 1,
  humanCount = 1,
  seats?: SeatKind[],
) {
  const names = ["You", "Mori", "Kiko", "Ren", "Hana", "Sora"]
  return request<{ sessionId: string; state: PublicGameState }>("/api/games", {
    method: "POST",
    body: JSON.stringify({
      seed,
      mode,
      tournamentGames,
      orbits,
      heuristicSamples: 24,
      players: (
        seats ??
        names.slice(0, playerCount).map((_, index) => (index < humanCount ? "human" : "robot"))
      )
        .map((seat, index) => ({
          id: `p${index + 1}`,
          name:
            seat === "human"
              ? humanCount === 1
                ? "You"
                : `Player ${index + 1}`
              : names[index] === "You"
                ? "Aki"
                : names[index],
          controller: seat === "human" ? "human" : "heuristic",
          seat,
        }))
        .filter((player) => player.seat !== "none")
        .map(({ seat: _seat, ...player }) => player),
    }),
  })
}

export async function loadGame(sessionId: string, viewer = "p1") {
  return request<{ sessionId: string; state: PublicGameState }>(
    `/api/games/${encodeURIComponent(sessionId)}?viewer=${viewer}`,
  )
}

export async function gameAction(sessionId: string, action: Record<string, unknown>) {
  return request<{ state: PublicGameState }>(
    `/api/games/${encodeURIComponent(sessionId)}/actions`,
    {
      method: "POST",
      body: JSON.stringify(action),
    },
  )
}

export async function bettingAction(sessionId: string, playerId: string, action: BettingAction) {
  return gameAction(sessionId, { kind: "betting", playerId, action, offerStick: true })
}

export async function botStep(sessionId: string) {
  return request<{ state: PublicGameState; rationale: string }>(
    `/api/games/${encodeURIComponent(sessionId)}/heuristic-step`,
    { method: "POST" },
  )
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set("Content-Type", "application/json")
  const response = await fetch(path, {
    ...init,
    headers,
  })
  const body = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status})`)
  }

  return body
}
