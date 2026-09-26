import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { GameEngine } from "../../docs/health-2026-09-25/source/src/game/engine"
import { stepHeuristic } from "../../docs/health-2026-09-25/source/src/game/automation"
import { scoreHand, compareHandScores } from "../../docs/health-2026-09-25/source/src/game/scoring"
import type { HandResultPlayer } from "../../docs/health-2026-09-25/source/src/game/types"

// Run independent shards, then aggregate their JSONL files. No production rules are changed.
const [
  modeArg = "basic",
  countArg = "10",
  offsetArg = "0",
  samplesArg = "24",
  chipsArg = "200",
  outArg = "docs/health-2026-09-25",
  gamesArg,
] = process.argv.slice(2)
if (modeArg !== "basic" && modeArg !== "riichi") throw new Error("Expected basic or riichi")
const mode = modeArg
const count = Number(countArg),
  offset = Number(offsetArg),
  samples = Number(samplesArg),
  chips = Number(chipsArg)
if (
  ![count, samples, chips].every((x) => Number.isInteger(x) && x > 0) ||
  !Number.isInteger(offset) ||
  offset < 0
)
  throw new Error("Invalid run arguments")
mkdirSync(outArg, { recursive: true })
const output = `${outArg}/${mode}-s${samples}-c${chips}-${offset}.jsonl`
writeFileSync(output, "")
const started = performance.now()
const players = Array.from({ length: 4 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `Bot ${i + 1}`,
  controller: "heuristic" as const,
}))
const special = (p: HandResultPlayer, kind: string) => p.cards.filter((c) => c.kind === kind).length
for (let index = offset; index < offset + count; index++) {
  const seed = `health-2026-09-25-${index}`
  const engine = GameEngine.create(players, {
    seed,
    mode,
    tournamentGames: gamesArg === "1" ? 1 : mode === "basic" ? 4 : 1,
    heuristicSamples: samples,
    startingChips: chips,
  })
  const violations: string[] = []
  const orbits: object[] = []
  const completed = new Set<number>()
  let steps = 0,
    lotusAttempts = 0
  let lotusPassed = 0
  while (engine.state.phase !== "finished") {
    if (++steps > 20000) throw new Error(`Action limit ${seed}`)
    const step = stepHeuristic(engine)
    if (step.decision?.strategy === "lotus-bluff") lotusAttempts++
    lotusPassed += step.charlestonCardIds?.filter((id) => id.startsWith("flower-")).length ?? 0
    const s = engine.state
    const start = s.gameNumber === 1 ? chips : 100 + s.gameNumber * 100
    const expected = 4 * start + s.players.reduce((sum, p) => sum + p.loans * 200, 0)
    const actual = s.pot + s.players.reduce((sum, p) => sum + p.chips, 0)
    if (Math.abs(expected - actual) > 1e-7)
      violations.push(`chips at step ${steps}: ${actual} vs ${expected}`)
    if (s.players.some((p) => !Number.isFinite(p.chips) || p.chips < 0))
      violations.push(`invalid chips at ${steps}`)
    if (s.gameScores.length >= s.gameNumber && !completed.has(s.gameNumber)) {
      completed.add(s.gameNumber)
      const scores = s.gameScores[s.gameNumber - 1]!
      orbits.push({
        game: s.gameNumber,
        lastAttemptedHand: s.handNumber,
        hands: s.handResults.filter((h) => h.orbitValue === s.orbitValue).length,
        eliminated: s.players.filter((p) => p.eliminated).map((p) => p.id),
        belowAnte: s.players.filter((p) => p.chips < s.orbitValue).map((p) => p.id),
        scores,
        loans: s.players.map((p) => p.loans),
        sticks: s.players.map((p) => p.riichiSticks),
      })
    }
  }
  const s = engine.state
  if (orbits.length !== s.config.tournamentGames) violations.push("missing orbit scores")
  const hands = s.handResults.map((h) => {
    const contenders = h.players.filter((p) => !p.folded && !p.eliminated)
    return {
      game: h.orbitValue / 5,
      number: h.handNumber,
      pot: h.pot,
      reason: h.reason,
      allIn: h.allInPlayerIds.length,
      street: Math.max(0, ...h.bettingHistory.map((a) => a.street)),
      winners: h.winnerIds,
      lotusBonus: h.lotusBluff?.total ?? 0,
      riichiWon: h.riichiSettlement.won,
      actions: h.bettingHistory.reduce(
        (a, r) => {
          a[r.type] = (a[r.type] ?? 0) + 1
          return a
        },
        {} as Record<string, number>,
      ),
      players: h.players
        .filter((p) => p.openingCards.length > 0)
        .map((p) => {
          const jokers = special(p, "joker"),
            flowers = special(p, "flower")
          const noJoker = scoreHand(
            p.cards.filter((c) => c.kind !== "joker"),
            mode,
          )
          const without = contenders.map((q) => ({
            id: q.playerId,
            flowers: special(q, "flower"),
            score: q.playerId === p.playerId ? noJoker : q.score,
          }))
          const twins = without.filter((q) => q.flowers === 2)
          const eligible = without.filter((q) => q.flowers !== 1)
          const pool = twins.length ? twins : eligible.length ? eligible : without
          const best = [...pool].sort((a, b) => compareHandScores(b.score, a.score))[0]
          const stillWins = twins.length
            ? twins.some((q) => q.id === p.playerId)
            : !eligible.length ||
              pool.some(
                (q) => q.id === p.playerId && best && compareHandScores(q.score, best.score) === 0,
              )
          return {
            id: p.playerId,
            folded: p.folded,
            rank:
              flowers === 2
                ? "Twin Lotus"
                : flowers === 1
                  ? "Single Lotus"
                  : (p.score.combinations[0]?.label ?? "High Card"),
            strength: p.score.total,
            won: h.winnerIds.includes(p.playerId),
            share: h.winnerIds.includes(p.playerId) ? 1 / h.winnerIds.length : 0,
            net:
              p.chips -
              p.openingChips -
              200 *
                Math.max(
                  0,
                  p.loans -
                    (s.handResults
                      .find(
                        (prev) =>
                          prev.orbitValue === h.orbitValue && prev.handNumber === h.handNumber - 1,
                      )
                      ?.players.find((q) => q.playerId === p.playerId)?.loans ?? 0),
                ),
            chips: p.chips,
            jokers,
            selectedJokers: p.cards.filter(
              (c) => c.kind === "joker" && p.score.selectedCardIds.includes(c.id),
            ).length,
            jokerRankGain: p.score.total - noJoker.total,
            jokerDecisive:
              jokers > 0 &&
              h.reason === "showdown" &&
              h.winnerIds.includes(p.playerId) &&
              !stillWins,
            jokerColors: p.cards.filter((c) => c.kind === "joker").map((c) => c.color),
            selectedJokerColors: p.cards
              .filter((c) => c.kind === "joker" && p.score.selectedCardIds.includes(c.id))
              .map((c) => c.color),
            flowers,
            openingFlowers: p.openingCards.filter((c) => c.kind === "flower").length,
            acquiredFlowers: p.acquiredCards.filter((c) => c.kind === "flower").length,
            riichi: p.riichi,
          }
        }),
    }
  })
  const eventCounts: Record<string, number> = {}
  const draws: Record<string, number> = {},
    riichiStreets: Record<string, number> = {},
    allInReasons: Record<string, number> = {}
  const stickActions: Record<string, number> = {}
  const lotusMoves = { passed: lotusPassed, drawn: 0, discarded: 0, blankClaimed: 0 }
  let lastAction = "unknown"
  let minted = 0
  for (const e of engine.events) {
    eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1
    const payload = e.payload as Record<string, unknown>
    if (e.type === "betting-action") lastAction = (payload.action as { type: string }).type
    if (e.type === "riichi-stick-spent")
      stickActions[lastAction] = (stickActions[lastAction] ?? 0) + 1
    if (e.type === "blank-exchanged" && String(payload.claimedCardId).startsWith("flower-"))
      lotusMoves.blankClaimed++
    if (e.type === "draw-discard") {
      if (String(payload.drawnCardId).startsWith("flower-")) lotusMoves.drawn++
      if (String(payload.discardedCardId).startsWith("flower-")) lotusMoves.discarded++
      const key = `${String(payload.reason)}:${String(payload.source)}`
      draws[key] = (draws[key] ?? 0) + 1
    }
    if (e.type === "riichi-declared") {
      const key = String(payload.street)
      riichiStreets[key] = (riichiStreets[key] ?? 0) + 1
    }
    if (e.type === "player-all-in") {
      const key = String(payload.reason)
      allInReasons[key] = (allInReasons[key] ?? 0) + 1
    }
    if (e.type === "riichi-sticks-awarded") minted += Number(payload.amount)
  }
  const spent =
    (eventCounts["riichi-stick-spent"] ?? 0) +
    (eventCounts["curse-placed"] ?? 0) +
    (eventCounts["curse-removed"] ?? 0)
  const remaining = (orbits as { sticks: number[] }[])
    .flatMap((o) => o.sticks)
    .reduce((a, b) => a + b, 0)
  if (remaining !== (mode === "riichi" ? 12 * s.config.tournamentGames : 0) + minted - spent)
    violations.push("stick conservation")
  if (
    s.handResults.some((h) => Math.abs(h.pot - h.players.reduce((a, p) => a + p.payout, 0)) > 1e-7)
  )
    violations.push("payout conservation")
  appendFileSync(
    output,
    JSON.stringify({
      seed,
      mode,
      samples,
      chips,
      steps,
      orbits,
      scores: s.finalScores,
      hands,
      eventCounts,
      draws,
      riichiStreets,
      allInReasons,
      minted,
      lotusAttempts,
      lotusMoves,
      stickActions,
      violations,
    }) + "\n",
  )
  if ((index - offset + 1) % 25 === 0 || index === offset + count - 1)
    process.stderr.write(
      `${mode} s${samples} c${chips} ${index - offset + 1}/${count}: ${((performance.now() - started) / 1000).toFixed(1)}s\n`,
    )
}
