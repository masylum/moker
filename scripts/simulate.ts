import { fork } from "node:child_process"
import { availableParallelism } from "node:os"
import { fileURLToPath } from "node:url"
import {
  addSimulationHealth,
  createHealthAccumulator,
  mergeHealth,
  type HealthAccumulator,
} from "../src/game/health"
import { formatHealthReport } from "../src/game/health-report"
import { simulateGame } from "../src/game/simulation"

const workerMode = process.argv.includes("--health-worker")

if (workerMode) {
  runWorker()
} else {
  await runCoordinator()
}

async function runCoordinator(): Promise<void> {
  const count = positiveInteger(process.argv[2] ?? "1000", "game count")
  const seedPrefix = process.argv[3] ?? "health"
  const heuristicSamples = positiveInteger(argument("--samples") ?? "64", "sample count")
  const workers = Math.min(
    count,
    positiveInteger(
      argument("--workers") ?? String(Math.max(1, availableParallelism() - 1)),
      "worker count",
    ),
  )
  const startedAt = performance.now()
  const chunks = splitWork(count, workers)
  const progress = Array<number>(workers).fill(0)
  let lastReportedPercent = -1

  const reportProgress = (workerIndex: number, completed: number): void => {
    progress[workerIndex] = completed
    const completedGames = progress.reduce((total, value) => total + value, 0)
    const percent = Math.floor((completedGames / count) * 100)

    if (percent <= lastReportedPercent && completedGames !== count) {
      return
    }

    lastReportedPercent = percent
    const elapsedSeconds = (performance.now() - startedAt) / 1_000
    const gamesPerMinute = elapsedSeconds > 0 ? (completedGames / elapsedSeconds) * 60 : 0
    const remainingSeconds =
      completedGames > 0 ? (elapsedSeconds / completedGames) * (count - completedGames) : 0
    process.stderr.write(
      `Progress ${completedGames}/${count} (${percent}%) · ${gamesPerMinute.toFixed(1)} games/min · ETA ${formatDuration(remainingSeconds)}\n`,
    )
  }

  const partials = await Promise.all(
    chunks.map((chunk, workerIndex) =>
      spawnWorker(
        {
          ...chunk,
          workerIndex,
          seedPrefix,
          heuristicSamples,
        },
        reportProgress,
      ),
    ),
  )
  const health = partials.reduce(mergeHealth, createHealthAccumulator())
  const elapsedSeconds = (performance.now() - startedAt) / 1_000

  if (process.argv.includes("--json")) {
    process.stdout.write(
      `${JSON.stringify({ health, seedPrefix, heuristicSamples, workers, elapsedSeconds }, null, 2)}\n`,
    )

    return
  }

  process.stdout.write(
    `${formatHealthReport(health, { seedPrefix, heuristicSamples, workers, elapsedSeconds })}\n`,
  )
}

function runWorker(): void {
  const start = positiveInteger(argument("--start") ?? "0", "start", true)
  const count = positiveInteger(argument("--count") ?? "1", "count")
  const workerIndex = positiveInteger(argument("--worker-index") ?? "0", "worker index", true)
  const seedPrefix = argument("--seed-prefix") ?? "health"
  const heuristicSamples = positiveInteger(argument("--samples") ?? "64", "sample count")
  const health = createHealthAccumulator()
  const startedAt = performance.now()

  for (let offset = 0; offset < count; offset += 1) {
    const seedIndex = start + offset
    const result = simulateGame({
      seed: `${seedPrefix}-${seedIndex}`,
      playerCount: 4,
      heuristicSamples,
    })
    addSimulationHealth(health, result)
    process.send?.({
      kind: "progress",
      workerIndex,
      completed: offset + 1,
      elapsedMs: performance.now() - startedAt,
    } satisfies WorkerProgressMessage)
  }

  process.send?.({ kind: "complete", workerIndex, health } satisfies WorkerCompleteMessage, () =>
    process.disconnect(),
  )
}

interface WorkerProgressMessage {
  kind: "progress"
  workerIndex: number
  completed: number
  elapsedMs: number
}

interface WorkerCompleteMessage {
  kind: "complete"
  workerIndex: number
  health: HealthAccumulator
}

type WorkerMessage = WorkerProgressMessage | WorkerCompleteMessage

interface WorkerOptions {
  start: number
  count: number
  workerIndex: number
  seedPrefix: string
  heuristicSamples: number
}

function spawnWorker(
  options: WorkerOptions,
  onProgress: (workerIndex: number, completed: number) => void,
): Promise<HealthAccumulator> {
  return new Promise((resolve, reject) => {
    const child = fork(
      fileURLToPath(import.meta.url),
      [
        "--health-worker",
        "--start",
        String(options.start),
        "--count",
        String(options.count),
        "--worker-index",
        String(options.workerIndex),
        "--seed-prefix",
        options.seedPrefix,
        "--samples",
        String(options.heuristicSamples),
      ],
      {
        execArgv: process.execArgv,
        stdio: ["ignore", "ignore", "inherit", "ipc"],
      },
    )
    let settled = false

    child.on("message", (message: unknown) => {
      const result = message as WorkerMessage

      if (result.kind === "progress") {
        onProgress(result.workerIndex, result.completed)

        return
      }

      settled = true
      resolve(result.health)
    })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (!settled && code !== 0) {
        reject(new Error(`Simulation worker ${options.workerIndex + 1} exited with ${code}`))
      }
    })
  })
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "calculating"
  }

  if (seconds <= 0) {
    return "0s"
  }

  const rounded = Math.round(seconds)
  const hours = Math.floor(rounded / 3_600)
  const minutes = Math.floor((rounded % 3_600) / 60)
  const remainingSeconds = rounded % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
}

function splitWork(total: number, workers: number): Array<{ start: number; count: number }> {
  const base = Math.floor(total / workers)
  const remainder = total % workers
  let start = 0

  return Array.from({ length: workers }, (_, index) => {
    const count = base + (index < remainder ? 1 : 0)
    const chunk = { start, count }
    start += count

    return chunk
  })
}

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)

  return index >= 0 ? process.argv[index + 1] : undefined
}

function positiveInteger(value: string, label: string, allowZero = false): number {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isInteger(parsed) || parsed < (allowZero ? 0 : 1)) {
    throw new RangeError(`${label} must be ${allowZero ? "non-negative" : "positive"}`)
  }

  return parsed
}
