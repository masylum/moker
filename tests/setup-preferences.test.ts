import { afterEach, describe, expect, it, vi } from "vitest"
import { readSetup, saveSetup } from "../src/client/setup-preferences"

afterEach(() => vi.unstubAllGlobals())
describe("setup preferences", () => {
  it.each(["basic", "riichi", "streamlined"] as const)(
    "remembers %s mode, seats and tournament length",
    (mode) => {
      const values = new Map<string, string>()
      vi.stubGlobal("localStorage", {
        getItem: (key: string) => values.get(key),
        setItem: (key: string, value: string) => values.set(key, value),
      })
      const setup = {
        mode,
        seats: ["human", "robot", "none", "none", "none", "none"] as const,
        games: 3,
      }
      saveSetup({ ...setup, seats: [...setup.seats] })
      expect(readSetup()).toEqual(setup)
    },
  )
  it("defaults new players to Streamlined", () => {
    vi.stubGlobal("localStorage", { getItem: () => null })
    expect(readSetup().mode).toBe("streamlined")
  })
  it("recovers from malformed and unavailable storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "{broken",
      setItem: () => {
        throw new Error("disabled")
      },
    })
    expect(readSetup().games).toBe(1)
    expect(() => saveSetup(readSetup())).not.toThrow()
  })
  it("rejects invalid saved choices", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => JSON.stringify({ mode: "nope", seats: ["human"], games: 90 }),
    })
    expect(readSetup()).toEqual({
      mode: "streamlined",
      seats: ["human", "robot", "robot", "robot", "none", "none"],
      games: 1,
    })
  })
})
