/** Isolated, played-game ladder experiments. Production rankings are never mutated. */
import {
  appendFileSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { parseArgs } from "node:util"
import { HAND_RANKS } from "../src/game/hand-ranks"
import { STARTING_RIICHI_STICKS } from "../src/game/rules"
import { generateHandCandidates } from "../src/game/melds"
import { scoreHand } from "../src/game/scoring"
import type { Card, HandKind, SimulationResult } from "../src/game/types"
import { applyRuleVariants, type LotusObservation } from "./lib/rule-variants"
import { simulateParallel } from "./lib/simulation-pool"

type LadderKind = HandKind | "long-chow"

const { values } = parseArgs({
  options: {
    mode: { type: "string", default: "basic" },
    order: { type: "string" },
    count: { type: "string", default: "40" },
    workers: { type: "string", default: "10" },
    seed: { type: "string", default: "ladder-search-20260925" },
    out: { type: "string" },
    orbits: { type: "string", default: "4" },
    games: { type: "string", default: "1" },
    "starting-sticks": { type: "string" },
    "long-chow": { type: "boolean", default: false },
    "scaled-lotus": { type: "boolean", default: false },
    "saved-samples": { type: "string", default: "2" },
    inside: { type: "boolean", default: false },
  },
})
const mode = values.mode as "basic" | "riichi"
if (!["basic", "riichi"].includes(mode) || !values.out || !values.order)
  throw new Error("Specify --mode, --order (weakest first), --out")
const order = values.order.split(",") as LadderKind[]
if (order[0] !== "high-card" || order[1] !== "eye")
  throw new Error("These experiments keep High Card and Eyes as the bottom two ranks")
const allowed = (Object.keys(HAND_RANKS) as LadderKind[]).filter(
  (k) => mode === "riichi" || !["pung-eye", "three-dragons-eye", "kong"].includes(k),
)
if (values["long-chow"] && !allowed.includes("long-chow")) allowed.push("long-chow")
if (values["long-chow"] && mode !== "riichi") throw new Error("Long Chow is Riichi-only")
if (
  order.length !== allowed.length ||
  new Set(order).size !== allowed.length ||
  order.some((k) => !allowed.includes(k))
)
  throw new Error("Order must be a permutation of the mode's ladder")
const constraints: [LadderKind, LadderKind][] = [
  ["high-card", "eye"],
  ["eye", "chow"],
  ["eye", "two-eyes"],
  ["chow", "chow-eye"],
  ["chow", "long-chow"],
  ["eye", "pung"],
  ["pung", "pung-eye"],
  ["two-eyes", "pung-eye"],
  ["pung", "kong"],
  ["three-winds", "four-winds"],
  ["three-dragons", "three-dragons-eye"],
  ["eye", "three-dragons-eye"],
]
if (
  constraints.some(
    ([a, b]) => order.includes(a) && order.includes(b) && order.indexOf(a) > order.indexOf(b),
  )
)
  throw new Error("Order violates a structural constraint")
const count = Number(values.count),
  workers = Number(values.workers),
  orbits = Number(values.orbits),
  games = Number(values.games) as 1 | 2 | 3 | 4
if (
  ![count, workers, orbits].every((n) => Number.isSafeInteger(n) && n > 0) ||
  ![1, 2, 3, 4].includes(games)
)
  throw new Error("Invalid batch dimensions")
const startingSticks = Number(values["starting-sticks"] ?? STARTING_RIICHI_STICKS)
if (!Number.isSafeInteger(startingSticks) || startingSticks < 0) throw new Error("Invalid sticks")
const savedSamples = Number(values["saved-samples"])
if (!Number.isSafeInteger(savedSamples) || savedSamples < 0) throw new Error("Invalid samples")
const out = resolve(values.out)
mkdirSync(dirname(out), { recursive: true })
if (!values.inside) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const sandbox = mkdtempSync(join(tmpdir(), "moker-ladder-"))
  try {
    cpSync(join(repo, "src/game"), join(sandbox, "src/game"), { recursive: true })
    mkdirSync(join(sandbox, "scripts/lib"), { recursive: true })
    for (const name of ["simulation-pool.ts", "simulation-worker.ts", "rule-variants.ts"])
      cpSync(join(repo, "scripts/lib", name), join(sandbox, "scripts/lib", name))
    cpSync(fileURLToPath(import.meta.url), join(sandbox, "scripts/ladder-experiment.ts"))
    symlinkSync(join(repo, "node_modules"), join(sandbox, "node_modules"), "dir")
    writeFileSync(join(sandbox, "package.json"), '{"type":"module"}\n')
    const ranks = { ...HAND_RANKS } as Record<LadderKind, number>
    order.forEach((k, i) => {
      ranks[k] = i + 1
    })
    writeFileSync(
      join(sandbox, "src/game/hand-ranks.ts"),
      `import type { HandKind } from "./types"\nexport const HAND_RANKS = ${JSON.stringify(ranks)} as const satisfies Record<HandKind, number>\nexport function handRank(kind: HandKind, _mode: "basic" | "riichi"): number { return HAND_RANKS[kind] }\n`,
    )
    const rulesPath = join(sandbox, "src/game/rules.ts")
    writeFileSync(
      rulesPath,
      readFileSync(rulesPath, "utf8").replace(
        /export const STARTING_RIICHI_STICKS = \d+/,
        `export const STARTING_RIICHI_STICKS = ${startingSticks}`,
      ),
    )
    applyRuleVariants(join(sandbox, "src/game"), values["long-chow"], values["scaled-lotus"])
    writeFileSync(
      out + ".manifest.json",
      JSON.stringify(
        {
          mode,
          order,
          count,
          workers,
          orbits,
          games,
          samples: 24,
          startingSticks,
          longChow: values["long-chow"],
          scaledLotus: values["scaled-lotus"],
          savedSamples,
          seed: values.seed,
          sourceHashes: Object.fromEntries(
            [
              "heuristic.ts",
              "scoring.ts",
              "hand-ranks.ts",
              "hand-progress.ts",
              "engine.ts",
              "rules.ts",
              "melds.ts",
              "types.ts",
              "simulation.ts",
            ].map((f) => [
              f,
              createHash("sha256")
                .update(readFileSync(join(sandbox, "src/game", f)))
                .digest("hex"),
            ]),
          ),
        },
        null,
        2,
      ),
    )
    await new Promise<void>((done, fail) => {
      const child = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          join(sandbox, "scripts/ladder-experiment.ts"),
          ...process.argv.slice(2),
          "--out",
          out,
          "--inside",
        ],
        { cwd: sandbox, stdio: "inherit" },
      )
      child.on("error", fail)
      child.on("exit", (code) => (code === 0 ? done() : fail(new Error(`Batch exit ${code}`))))
    })
  } finally {
    rmSync(sandbox, { recursive: true, force: true })
  }
} else {
  const supported = new Set(order)
  const contains = (cards: Card[]) =>
    new Set(
      generateHandCandidates(cards.filter((c) => c.kind !== "flower"))
        .map((c) => c.kind)
        .filter((k) => supported.has(k)),
    )
  const kind = (cards: Card[]) => scoreHand(cards, mode).combinations[0]?.kind ?? "high-card"
  const aggregate = (result: SimulationResult, scope: "all" | "early" | "nonterminal") => {
    const previousLoans = new Map<string, number>()
    const rows = Object.fromEntries(
      order.map((k) => [
        k,
        {
          opening: 0,
          openingContains: 0,
          openingWins: 0,
          openingNet: 0,
          firstDealPlayers: 0,
          firstDealChampionCredit: 0,
          end: 0,
          contains: 0,
          ordinaryContains: 0,
          newBuilt: 0,
          show: 0,
          showWins: 0,
          showNet: 0,
          showContains: 0,
        },
      ]),
    )
    let deals = 0,
      hands = 0,
      showdowns = 0,
      allIns = 0,
      street4 = 0,
      twins = 0
    for (const h of result.state.handResults) {
      if (scope === "early" && h.orbit > Math.max(1, orbits - 1)) continue
      if (
        scope === "nonterminal" &&
        h === result.state.handResults.findLast((other) => other.orbitValue === h.orbitValue)
      )
        continue
      hands++
      showdowns += Number(h.reason === "showdown")
      allIns += Number(h.allInPlayerIds.length > 0)
      street4 += Number(h.bettingHistory.some((a) => a.street === 4))
      for (const p of h.players) {
        if (!p.openingCards.length) continue
        deals++
        const initial = kind(p.openingCards),
          final = kind(p.cards),
          start = contains(p.openingCards),
          end = contains(p.cards)
        const win = h.winnerIds.includes(p.playerId) ? 1 / h.winnerIds.length : 0
        rows[initial]!.opening++
        for (const k of start) rows[k]!.openingContains++
        rows[initial]!.openingWins += win
        if (h === result.state.handResults[0]) {
          const scores = result.state.finalScores!
          const champions = Object.keys(scores).filter(
            (id) => scores[id] === Math.max(...Object.values(scores)),
          )
          rows[initial]!.firstDealPlayers++
          rows[initial]!.firstDealChampionCredit += champions.includes(p.playerId)
            ? 1 / champions.length
            : 0
        }
        const loanKey = `${h.orbitValue}:${p.playerId}`
        const net = p.chips - p.openingChips - 200 * (p.loans - (previousLoans.get(loanKey) ?? 0))
        previousLoans.set(loanKey, p.loans)
        rows[initial]!.openingNet += net
        rows[final]!.end++
        const flowers = p.cards.filter((c) => c.kind === "flower").length
        for (const k of end) {
          rows[k]!.contains++
          rows[k]!.ordinaryContains += Number(flowers === 0)
          rows[k]!.newBuilt += Number(!start.has(k))
        }
        if (flowers === 2) twins++
        if (h.reason === "showdown" && !p.folded && !p.eliminated && flowers === 0) {
          rows[final]!.show++
          rows[final]!.showWins += win
          rows[final]!.showNet += net
          for (const k of end) rows[k]!.showContains++
        }
      }
    }
    return { rows, deals, hands, showdowns, allIns, street4, twins }
  }
  writeFileSync(out, "")
  const started = performance.now()
  let completed = 0
  await simulateParallel({
    count,
    workers,
    game: (index) => ({
      seed: `${values.seed}-${mode}-${index}`,
      mode,
      orbits,
      tournamentGames: games,
      heuristicSamples: 24,
      collectDecisions: index < savedSamples,
      collectGameSummaries: true,
    }),
    onResult: (r, index) => {
      const loans = r.events.filter((e) => e.type === "loan-taken").length
      const expected =
        4 * Array.from({ length: games }, (_, i) => 200 + 100 * i).reduce((a, b) => a + b, 0) -
        50 * loans
      if (
        Math.abs(Object.values(r.state.finalScores!).reduce((a, b) => a + b, 0) - expected) > 1e-6
      )
        throw new Error("Score conservation failed")
      appendFileSync(
        out,
        JSON.stringify({
          index,
          seed: r.seed,
          all: aggregate(r, "all"),
          early: aggregate(r, "early"),
          nonterminal: aggregate(r, "nonterminal"),
          scores: r.state.finalScores,
          lotusObservations: (r as SimulationResult & { lotusObservations: LotusObservation[] })
            .lotusObservations,
          handDiagnostics: r.state.handResults.map((h) => ({
            game: h.orbitValue / 5,
            hand: h.handNumber,
            reason: h.reason,
            street4: h.bettingHistory.some((b) => b.street === 4),
            allIn: h.allInPlayerIds.length > 0,
            lotusBluff: h.lotusBluff,
            players: h.players.map((p) => ({
              id: p.playerId,
              folded: p.folded,
              openingLotuses: p.openingCards.filter((c) => c.kind === "flower").length,
              finalLotuses: p.cards.filter((c) => c.kind === "flower").length,
              kind: kind(p.cards),
              contains: [...contains(p.cards)],
              won: h.winnerIds.includes(p.playerId) ? 1 / h.winnerIds.length : 0,
              openingKind: kind(p.openingCards),
            })),
          })),
          lotusEvents: r.events.filter((e) =>
            ["card-drawn", "draw-discard", "blank-exchanged", "hand-started"].includes(e.type),
          ),
          resources: r.gameSummaries!.map((g) => {
            const hands = r.state.handResults.filter((h) => h.orbitValue === g.gameNumber * 5)
            const earned = hands.reduce((sum, h) => sum + h.riichiSettlement.sticksAwarded, 0)
            const remaining = g.players.reduce((sum, p) => sum + p.riichiSticks, 0)
            const initial = mode === "riichi" ? startingSticks * g.players.length : 0
            return {
              game: g.gameNumber,
              initial,
              earned,
              remaining,
              spent: initial + earned - remaining,
              unusedPlayers: g.players.filter((p) => p.riichiSticks > 0).length,
              loans: g.players.reduce((sum, p) => sum + p.loans, 0),
              players: g.players,
            }
          }),
          declarations: r.events.filter((e) => e.type === "riichi-declared").length,
          fishing: r.events.filter((e) => e.type === "draw-discard").map((e) => e.payload),
          loans,
          sticks: r.events.filter((e) => e.type === "riichi-stick-spent").length,
          eliminated: r.gameSummaries!.flatMap((g) => g.players).filter((p) => p.eliminated).length,
        }) + "\n",
      )
      if (index < savedSamples) writeFileSync(out + `.sample-${index}.json`, JSON.stringify(r))
      completed++
      if (completed % 10 === 0 || completed === count)
        console.log(
          `${mode} ${completed}/${count} ${((performance.now() - started) / 1000).toFixed(1)}s`,
        )
    },
  })
}
