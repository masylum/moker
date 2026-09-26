import { createReadStream, readdirSync, writeFileSync } from "node:fs"
import { createInterface } from "node:readline"
import { join } from "node:path"
import { scoreHand, compareHandScores } from "../src/game/scoring"
import type { Card, HandResult, SimulationResult } from "../src/game/types"

const root = process.argv[2] ?? "docs/health-v6-2026-09-25"
const paths = readdirSync(root)
  .filter((p) => p.endsWith(".jsonl"))
  .sort()
const flowerCount = (cards: readonly Card[]) => cards.filter((c) => c.kind === "flower").length
const winners = (scores: Record<string, number>) =>
  Object.keys(scores).filter(
    (id) => Math.abs(scores[id]! - Math.max(...Object.values(scores))) < 1e-7,
  )
const credit = (id: string, ids: string[]) => (ids.includes(id) ? 1 / ids.length : 0)
const records = []
for (const file of paths) {
  const cohort = file.slice(0, -6)
  const stream = createInterface({ input: createReadStream(join(root, file)), crlfDelay: Infinity })
  for await (const line of stream) {
    if (!line.trim()) continue
    const run = JSON.parse(line) as SimulationResult & { index: number }
    const { state: s, events } = run
    const mode = s.config.mode
    const finalWinners = winners(s.finalScores!)
    const settlements = run.gameSummaries ?? [
      { gameNumber: 1, scores: s.finalScores!, players: s.players },
    ]
    const previousLoans: Record<string, number> = {}
    const hands = s.handResults.map((h) => {
      const game = h.orbitValue / 5
      const gameWinners = winners(s.gameScores[game - 1]!)
      const contenders = h.players.filter((p) => !p.folded && !p.eliminated)
      const withoutJokerWinners = (playerId: string) => {
        const twins = contenders.filter((p) => flowerCount(p.cards) === 2)
        if (twins.length) return twins.map((p) => p.playerId)
        const eligible = contenders.filter((p) => flowerCount(p.cards) !== 1)
        if (!eligible.length) return contenders.map((p) => p.playerId)
        const scores = eligible.map((p) => ({
          id: p.playerId,
          score:
            p.playerId === playerId
              ? scoreHand(
                  p.cards.filter((c) => c.kind !== "joker"),
                  mode,
                )
              : p.score,
        }))
        const best = scores.reduce((a, b) => (compareHandScores(a.score, b.score) >= 0 ? a : b))
        return scores.filter((p) => compareHandScores(p.score, best.score) === 0).map((p) => p.id)
      }
      return {
        game,
        number: h.handNumber,
        orbit: h.orbit,
        pot: h.pot,
        reason: h.reason,
        street: Math.max(0, ...h.bettingHistory.map((a) => a.street)),
        allIn: h.allInPlayerIds,
        winners: h.winnerIds,
        lotusBonus: h.lotusBluff?.total ?? 0,
        riichi: h.riichiSettlement,
        actions: h.bettingHistory,
        players: h.players
          .filter((p) => p.openingCards.length)
          .map((p) => {
            const opening = scoreHand(p.openingCards, mode)
            const flowers = flowerCount(p.cards),
              jokers = p.cards.filter((c) => c.kind === "joker")
            const noJokers = scoreHand(
              p.cards.filter((c) => c.kind !== "joker"),
              mode,
            )
            const show = h.reason === "showdown" && !p.folded && !p.eliminated
            const oldLoans = previousLoans[`${game}:${p.playerId}`] ?? 0
            previousLoans[`${game}:${p.playerId}`] = p.loans
            const ownCredit = credit(p.playerId, h.winnerIds)
            const without = show && jokers.length ? withoutJokerWinners(p.playerId) : h.winnerIds
            return {
              id: p.playerId,
              openingKind: opening.combinations[0]?.kind ?? "high-card",
              openingRank: opening.total,
              openingFlowers: flowerCount(p.openingCards),
              openingJokers: p.openingCards.filter((c) => c.kind === "joker").length,
              openingBlanks: p.openingCards.filter((c) => c.kind === "blank").length,
              finalKind:
                flowers === 2
                  ? "twin-lotus"
                  : flowers === 1
                    ? "single-lotus"
                    : (p.score.combinations[0]?.kind ?? "high-card"),
              finalOrdinaryKind: p.score.combinations[0]?.kind ?? "high-card",
              finalRank: p.score.total,
              improved: p.score.total > opening.total,
              folded: p.folded,
              show,
              won: h.winnerIds.includes(p.playerId),
              winCredit: ownCredit,
              tournamentWinCredit: credit(p.playerId, finalWinners),
              gameWinCredit: credit(p.playerId, gameWinners),
              net: p.chips - p.openingChips - 200 * (p.loans - oldLoans),
              chips: p.chips,
              loans: p.loans,
              sticks: p.riichiSticks,
              eliminated: p.eliminated,
              jokers: jokers.length,
              jokerColors: jokers.map((c) => c.color),
              selectedJokerColors: jokers
                .filter((c) => p.score.selectedCardIds.includes(c.id))
                .map((c) => c.color),
              jokerRankGain: p.score.total - noJokers.total,
              jokerDecisive:
                show && jokers.length > 0 && p.payout > 0 && !without.includes(p.playerId),
              jokerWinCreditGain:
                show && jokers.length > 0 ? ownCredit - credit(p.playerId, without) : 0,
              flowers,
            }
          }),
      }
    })
    const eventCounts: Record<string, number> = {},
      draws: Record<string, number> = {},
      stickActions: Record<string, number> = {}
    const lotusMoves = { drawn: 0, discarded: 0, blankClaimed: 0, charlestonPassed: 0 }
    const allIns: object[] = []
    let currentGame = 1,
      street = 0,
      actionIndex = 0,
      lastAction = "unknown",
      minted = 0
    for (let i = 0; i < events.length; i++) {
      const e = events[i]!,
        data = e.payload as Record<string, unknown>
      eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1
      if (e.type === "hand-started") {
        currentGame = Number(data.ante) / 5
        street = 0
        actionIndex = 0
      }
      if (e.type === "street-opened") street = Number(data.street)
      if (e.type === "betting-action") {
        lastAction = (data.action as { type: string }).type
        actionIndex++
      }
      if (e.type === "riichi-stick-spent")
        stickActions[lastAction] = (stickActions[lastAction] ?? 0) + 1
      if (e.type === "riichi-sticks-awarded") minted += Number(data.amount)
      if (e.type === "draw-discard" || e.type === "blank-exchanged") {
        const source = e.type === "blank-exchanged" ? "blank-exchange" : String(data.source)
        const key = `${String(data.reason)}:${source}`
        draws[key] = (draws[key] ?? 0) + 1
        if (String(data.drawnCardId).startsWith("flower-")) lotusMoves.drawn++
        if (String(data.discardedCardId).startsWith("flower-")) lotusMoves.discarded++
        if (String(data.claimedCardId).startsWith("flower-")) lotusMoves.blankClaimed++
      }
      if (e.type === "charleston-completed") {
        const h = s.handResults.find(
          (x) => x.orbitValue === currentGame * 5 && x.handNumber === e.handNumber,
        )
        if (h)
          lotusMoves.charlestonPassed += h.players.reduce(
            (n, p) => n + flowerCount(p.acquiredCards.slice(0, 2)),
            0,
          )
      }
      if (e.type === "player-all-in") {
        const ante = data.reason === "opening-charge"
        const next = ante ? events.slice(i + 1).find((x) => x.type === "hand-started") : undefined
        const game = ante && next ? (next.payload as { ante: number }).ante / 5 : currentGame
        const h = s.handResults.find(
          (x) => x.orbitValue === game * 5 && x.handNumber === e.handNumber,
        )
        if (!h) continue
        const p = h.players.find((x) => x.playerId === e.actorId)!
        const action = ante ? undefined : h.bettingHistory[actionIndex]
        allIns.push({
          game,
          hand: e.handNumber,
          orbit: h.orbit,
          id: e.actorId,
          reason: data.reason,
          street: ante ? 0 : street,
          rank:
            flowerCount(p.cards) === 2
              ? "twin-lotus"
              : flowerCount(p.cards) === 1
                ? "single-lotus"
                : (p.score.combinations[0]?.kind ?? "high-card"),
          cards: p.cards.map((c) => c.id),
          won: h.winnerIds.includes(p.playerId),
          action,
          pot: h.pot,
        })
      }
    }
    const snapshots = s.handResults.map((h: HandResult) => ({
      game: h.orbitValue / 5,
      hand: h.handNumber,
      orbit: h.orbit,
      scores: Object.fromEntries(h.players.map((p) => [p.playerId, p.chips - 250 * p.loans])),
      chips: Object.fromEntries(h.players.map((p) => [p.playerId, p.chips])),
      eliminated: h.players.filter((p) => p.eliminated).map((p) => p.playerId),
    }))
    const issues: string[] = []
    const startingSupply =
      4 *
      Array.from({ length: s.config.tournamentGames }, (_, i) =>
        i === 0 ? s.config.startingChips : 200 + i * 100,
      ).reduce((a, b) => a + b, 0)
    if (
      Math.abs(
        Object.values(s.finalScores!).reduce((a, b) => a + b, 0) -
          (startingSupply - 50 * (eventCounts["loan-taken"] ?? 0)),
      ) > 1e-7
    )
      issues.push("adjusted score conservation")
    if (settlements.length !== s.config.tournamentGames) issues.push("missing settlements")
    for (const g of settlements) {
      if (g.players.some((p) => p.loans > 1 || p.chips < 0 || !Number.isFinite(p.chips)))
        issues.push(`bad cash/loan game ${g.gameNumber}`)
      const stack = g.gameNumber === 1 ? s.config.startingChips : 100 + g.gameNumber * 100
      if (Math.abs(g.players.reduce((n, p) => n + p.chips - 200 * p.loans, 0) - 4 * stack) > 1e-7)
        issues.push(`chip conservation game ${g.gameNumber}`)
    }
    const remaining = settlements.flatMap((g) => g.players).reduce((n, p) => n + p.riichiSticks, 0)
    if (
      remaining !==
      (mode === "riichi" ? 12 * s.config.tournamentGames : 0) +
        minted -
        (eventCounts["riichi-stick-spent"] ?? 0)
    )
      issues.push("stick conservation")
    records.push({
      cohort,
      index: run.index,
      seed: run.seed,
      mode,
      config: s.config,
      scores: s.finalScores,
      settlements,
      snapshots,
      hands,
      eventCounts,
      draws,
      stickActions,
      minted,
      lotusMoves,
      allIns,
      issues,
    })
  }
}
writeFileSync(join(root, "derived.json"), JSON.stringify(records) + "\n")
console.log(
  JSON.stringify(
    records.reduce(
      (out, r) => {
        out[r.cohort] = (out[r.cohort] ?? 0) + 1
        return out
      },
      {} as Record<string, number>,
    ),
  ),
)
if (records.some((r) => r.issues.length))
  throw new Error("Health invariants failed; inspect derived.json")
