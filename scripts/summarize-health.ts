import { readFileSync } from "node:fs"
import { basename } from "node:path"
import type { SimulationResult } from "../src/game/types"

/** Post-process retained simulator JSONL without changing or rerunning decisions. */
const paths = process.argv.slice(2)
if (!paths.length) throw new Error("Usage: summarize-health.ts FILE.jsonl [FILE.jsonl ...]")
const reports = paths.map((path) => {
  const games = readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as SimulationResult & { index: number })
    .sort((a, b) => a.index - b.index)
  const summarize = (selected: typeof games) => {
    const hands = selected.flatMap((g) => g.state.handResults)
    const showdowns = hands.filter((h) => h.reason === "showdown")
    const contenders = showdowns.flatMap((h) => h.players.filter((p) => !p.folded && !p.eliminated))
    const actions = hands.flatMap((h) => h.bettingHistory)
    const events = selected.flatMap((g) => g.events)
    const finalStreet = selected[0]!.state.rulesVersion >= 7 ? 3 : 4
    const seatWins: Record<string, number> = {}
    for (const { state } of selected) {
      const best = Math.max(...Object.values(state.finalScores!))
      const winners = Object.entries(state.finalScores!).filter(([, score]) => score === best)
      for (const [id] of winners) seatWins[id] = (seatWins[id] ?? 0) + 1 / winners.length
    }
    const kinds: Record<string, { appearances: number; wins: number }> = {}
    for (const h of showdowns) {
      for (const p of h.players.filter((candidate) => !candidate.folded && !candidate.eliminated)) {
        const kind = p.score.combinations[0]?.kind ?? "high-card"
        const counts = (kinds[kind] ??= { appearances: 0, wins: 0 })
        counts.appearances++
        if (h.winnerIds.includes(p.playerId)) counts.wins++
      }
    }
    const violations: string[] = []
    for (const { state, seed } of selected.filter((g) => g.state.rulesVersion >= 7)) {
      for (const h of state.handResults) {
        if (h.bettingHistory.some((a) => a.street > 3)) violations.push(`${seed}: extra street`)
        const participants = h.players.filter((p) => !p.eliminated)
        if (
          participants.some(
            (p) =>
              p.cards.length !== 6 ||
              p.score.selectedCardIds.length > 4 ||
              p.cards.some((c) => c.kind === "flower"),
          )
        )
          violations.push(`${seed}: cards/combination`)
        if (
          h.reason === "showdown" &&
          !h.allInPlayerIds.length &&
          participants.some((p) => !p.folded && p.publicCards.length !== 4)
        )
          violations.push(`${seed}: exposure`)
        if (h.lotusBluff || participants.some((p) => p.lotusDisqualified))
          violations.push(`${seed}: lotus rule`)
      }
    }
    const pct = (n: number, d = hands.length) => (100 * n) / Math.max(1, d)
    return {
      games: selected.length,
      hands: hands.length,
      showdowns: showdowns.length,
      showdownPercent: pct(showdowns.length),
      showdownTiePercent: pct(
        showdowns.filter((h) => h.winnerIds.length > 1).length,
        showdowns.length,
      ),
      allInPercent: pct(hands.filter((h) => h.allInPlayerIds.length).length),
      finalStreetPercent: pct(
        hands.filter((h) => h.bettingHistory.some((a) => a.street === finalStreet)).length,
      ),
      bettingActionsPerHand: actions.length / hands.length,
      fishPerHand:
        events.filter((e) => e.type === "draw-discard" || e.type === "blank-exchanged").length /
        hands.length,
      foldActionPercent: pct(actions.filter((a) => a.type === "fold").length, actions.length),
      highCardShowdownPercent: pct(
        contenders.filter((p) => !p.score.combinations.length).length,
        contenders.length,
      ),
      visibleWinningCombinationPercent: pct(
        showdowns.filter(
          (h) =>
            !h.allInPlayerIds.length &&
            h.players.some(
              (p) =>
                h.winnerIds.includes(p.playerId) &&
                p.score.selectedCardIds.every((id) => p.publicCards.some((c) => c.id === id)),
            ),
        ).length,
        showdowns.filter((h) => !h.allInPlayerIds.length).length,
      ),
      riichiWonPercent: pct(
        hands.filter((h) => h.riichiSettlement.won).length,
        events.filter((e) => e.type === "riichi-declared").length,
      ),
      riichiDeclarations: events.filter((e) => e.type === "riichi-declared").length,
      eliminatedPlayers: selected
        .flatMap((g) => g.gameSummaries!.flatMap((s) => s.players))
        .filter((p) => p.eliminated).length,
      loans: events.filter((e) => e.type === "loan-taken").length,
      seatWins,
      showdownKinds: kinds,
      variantViolations: violations,
    }
  }
  return {
    file: basename(path),
    rulesVersion: games[0]!.state.rulesVersion,
    mode: games[0]!.state.config.mode,
    all: summarize(games),
    first40: summarize(games.slice(0, 40)),
  }
})
console.log(JSON.stringify(reports, null, 2))
if (reports.some((r) => r.all.variantViolations.length)) process.exitCode = 1
