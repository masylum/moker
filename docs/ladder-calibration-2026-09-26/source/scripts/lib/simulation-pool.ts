import { fork, type ChildProcess } from "node:child_process"
import { availableParallelism } from "node:os"
import type { SimulationOptions } from "../../src/game/simulation"
import type { SimulationResult } from "../../src/game/types"

/** Each child owns a game and RNG. Completion order never determines a seed. */
export async function simulateParallel(options: {
  count: number
  workers?: number
  game: (index: number) => SimulationOptions
  onResult: (result: SimulationResult, index: number) => void | Promise<void>
}): Promise<void> {
  const workers = options.workers ?? availableParallelism()
  if (![options.count, workers].every((n) => Number.isSafeInteger(n) && n > 0))
    throw new RangeError("Game and worker counts must be positive integers")
  const children: ChildProcess[] = []
  let next = 0
  let completed = 0
  let stopped = false
  let interrupt: () => void = () => {}
  try {
    await new Promise<void>((resolve, reject) => {
      const fail = (error: Error) => {
        stopped = true
        reject(error)
      }
      interrupt = () => fail(new Error("Simulation interrupted; completed output is retained"))
      process.once("SIGINT", interrupt)
      process.once("SIGTERM", interrupt)
      for (let worker = 0; worker < Math.min(workers, options.count); worker++) {
        const child = fork(new URL("./simulation-worker.ts", import.meta.url), [], {
          execArgv: ["--import", "tsx"],
          stdio: ["ignore", "ignore", "inherit", "ipc"],
          serialization: "advanced",
        })
        children.push(child)
        let pending = -1
        const dispatch = () => {
          if (stopped || next >= options.count) return
          pending = next++
          try {
            child.send({ index: pending, options: options.game(pending) }, (error) => {
              if (error && !stopped) fail(error)
            })
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)))
          }
        }
        child.on("error", fail)
        child.on("exit", (code, signal) => {
          if (!stopped)
            fail(new Error(`Simulation worker exited (${signal ?? code}), game ${pending}`))
        })
        const receive = async (message: {
          index: number
          result?: SimulationResult
          error?: string
        }) => {
          if (stopped) return
          try {
            if (message.index !== pending || !message.result || message.error)
              throw new Error(
                `Simulation game ${pending} failed: ${message.error ?? "invalid worker response"}`,
              )
            await options.onResult(message.result, message.index)
            completed++
            if (completed === options.count) {
              stopped = true
              resolve()
            } else dispatch()
          } catch (error) {
            fail(error instanceof Error ? error : new Error(String(error)))
          }
        }
        child.on("message", (message) => {
          void receive(message as { index: number; result?: SimulationResult; error?: string })
        })
        dispatch()
      }
    })
  } finally {
    stopped = true
    process.removeListener("SIGINT", interrupt)
    process.removeListener("SIGTERM", interrupt)
    await Promise.all(
      children.map(
        (child) =>
          new Promise<void>((resolve) => {
            if (!child.pid || child.exitCode !== null || child.signalCode !== null) return resolve()
            child.once("exit", () => resolve())
            child.kill("SIGTERM")
          }),
      ),
    )
  }
}
