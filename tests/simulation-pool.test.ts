import { describe, expect, it } from "vitest"
import { simulateGame } from "../src/game/simulation"
import { simulateParallel } from "../scripts/lib/simulation-pool"
import type { SimulationResult } from "../src/game/types"

describe("CPU simulation pool", () => {
  it("captures independent settlements before stacks reset without changing gameplay", () => {
    const options = {
      seed: "settlement-snapshots",
      mode: "riichi" as const,
      tournamentGames: 2 as const,
      orbits: 1,
      heuristicSamples: 1,
    }
    const plain = simulateGame(options)
    const captured = simulateGame({ ...options, collectGameSummaries: true })
    const { gameSummaries, ...rest } = captured
    expect(rest).toEqual(plain)
    expect(gameSummaries).toHaveLength(2)
    for (const [index, settlement] of gameSummaries!.entries()) {
      expect(settlement.gameNumber).toBe(index + 1)
      expect(settlement.scores).toEqual(captured.state.gameScores[index])
      for (const player of settlement.players)
        expect(settlement.scores[player.id]).toBe(player.chips - 250 * player.loans)
      expect(settlement.players.reduce((sum, p) => sum + p.chips - 200 * p.loans, 0)).toBe(
        4 * (200 + index * 100),
      )
    }
    const original = gameSummaries![0]!.players[0]!.chips
    captured.state.players[0]!.chips += 1
    expect(gameSummaries![0]!.players[0]!.chips).toBe(original)
  })

  it("matches serial games exactly, including logs, regardless of completion order", async () => {
    // Low samples are only for infrastructure tests, never balance evidence.
    const game = (index: number) => ({
      seed: `pool-test-${index}`,
      mode: index % 2 ? ("riichi" as const) : ("basic" as const),
      heuristicSamples: 1,
      orbits: 1,
    })
    const expected = Array.from({ length: 4 }, (_, index) => simulateGame(game(index)))
    const actual: SimulationResult[] = []
    await simulateParallel({
      count: 4,
      workers: 2,
      game,
      onResult: (result, index) => {
        actual[index] = result
      },
    })
    expect(actual).toEqual(expected)
    const lean = simulateGame({ ...game(0), collectDecisions: false })
    expect(lean).toEqual({ ...expected[0], decisions: [] })
  }, 30_000)

  it("rejects worker simulation failures and stops the remaining workers", async () => {
    await expect(
      simulateParallel({
        count: 2,
        workers: 2,
        game: (index) => ({ seed: `pool-failure-${index}`, maxSteps: 0 }),
        onResult: () => {
          throw new Error("Should not complete")
        },
      }),
    ).rejects.toThrow("action safety limit")
  }, 10_000)

  it("rejects sink failures and invalid worker counts", async () => {
    await expect(
      simulateParallel({
        count: 1,
        workers: 1,
        game: () => ({ seed: "pool-sink", heuristicSamples: 1 }),
        onResult: () => {
          throw new Error("Cannot write output")
        },
      }),
    ).rejects.toThrow("Cannot write output")
    await expect(
      simulateParallel({
        count: 1,
        workers: 0,
        game: () => ({ seed: "unused" }),
        onResult: () => {},
      }),
    ).rejects.toThrow("positive integers")
  }, 10_000)
})
