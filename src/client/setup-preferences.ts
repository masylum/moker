import type { SeatKind } from "./api"

const KEY = "moker.setup"
export interface SetupPreferences {
  mode: "basic" | "riichi" | "streamlined"
  seats: SeatKind[]
  games: number
}
export function readSetup(): SetupPreferences {
  const defaults: SetupPreferences = {
    mode: "streamlined",
    seats: ["human", "robot", "robot", "robot", "none", "none"],
    games: 1,
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null")
    if (!saved || typeof saved !== "object") return defaults
    return {
      mode: ["basic", "riichi", "streamlined"].includes(saved.mode) ? saved.mode : defaults.mode,
      seats:
        Array.isArray(saved.seats) &&
        saved.seats.length === 6 &&
        saved.seats.every((seat: unknown) => ["human", "robot", "none"].includes(String(seat)))
          ? saved.seats
          : defaults.seats,
      games: [1, 2, 3, 4].includes(saved.games) ? saved.games : 1,
    }
  } catch {
    return defaults
  }
}
export function saveSetup(setup: SetupPreferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(setup))
  } catch {
    /* Storage is optional. */
  }
}
