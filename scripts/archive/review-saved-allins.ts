import { readFileSync, writeFileSync } from "node:fs"
import { scoreHand } from "../../src/game/scoring"
import { cardLabel } from "../../src/game/cards"
const root = "docs/tournament-bots-2026-09-25/logs"
const result: any[] = []
for (let game = 0; game < 5; game++) {
  const log = JSON.parse(readFileSync(`${root}/selected-riichi.json.logs/${game}.json`, "utf8"))
  const row = JSON.parse(readFileSync(`${root}/selected-riichi.json`, "utf8")).rows[game]
  const seen = new Set<number>()
  for (const event of log.events.filter((e: any) => e.type === "player-all-in")) {
    const first = !seen.has(event.handNumber)
    seen.add(event.handNumber)
    const hand = log.hands.find((h: any) => h.handNumber === event.handNumber)
    const reason = event.payload.reason
    const trigger =
      reason === "opening-charge"
        ? undefined
        : row.allInTriggers.find((x: any) => x.hand === event.handNumber && x.id === event.actorId)
    if (!trigger && reason !== "opening-charge") throw Error("Missing trigger")
    const cards =
      trigger?.cards ?? hand.players.find((p: any) => p.playerId === event.actorId).cards
    const flowers = cards.filter((c: any) => c.kind === "flower").length
    const score = scoreHand(cards, "riichi")
    const best = trigger?.evaluations[0]
    result.push({
      game,
      hand: event.handNumber,
      player: event.actorId,
      first,
      reason,
      street: trigger?.street ?? 0,
      chips: trigger?.chips ?? 0,
      pot: trigger?.pot ?? hand.openingPot,
      loans: trigger?.loans ?? hand.players.find((p: any) => p.playerId === event.actorId).loans,
      kind:
        flowers === 2
          ? "Twin Lotus"
          : flowers === 1
            ? "Single Lotus"
            : (score.combinations[0]?.label ?? "High Card"),
      rank: score.total,
      cards: cards.map(cardLabel),
      equity: best?.estimatedWinRate,
      foldout: best?.estimatedFoldout,
      ev: best?.expectedChipDelta,
      utility: best?.utility,
      rationale: trigger?.rationale,
      winner: hand.winnerIds.includes(event.actorId),
      winCredit: hand.winnerIds.includes(event.actorId) ? 1 / hand.winnerIds.length : 0,
      finalPot: hand.pot,
      opponents: hand.players
        .filter((p: any) => !p.folded && p.playerId !== event.actorId)
        .map((p: any) => ({
          id: p.playerId,
          kind:
            p.cards.filter((c: any) => c.kind === "flower").length === 2
              ? "Twin Lotus"
              : p.lotusDisqualified
                ? "Single Lotus"
                : (p.score?.combinations[0]?.label ?? "High Card"),
          cards: p.cards.map(cardLabel),
        })),
    })
  }
}
writeFileSync("docs/all-in-review-2026-09-25/decisions.json", JSON.stringify(result, null, 2))
const group = (xs: any[], key: string) =>
  Object.fromEntries(
    [...new Set(xs.map((x) => x[key]))].map((k) => [k, xs.filter((x) => x[key] === k).length]),
  )
for (const kind of ["first", "subsequent"]) {
  const xs = result.filter((x) => x.first === (kind === "first"))
  console.log(
    kind,
    JSON.stringify({
      n: xs.length,
      reasons: group(xs, "reason"),
      streets: group(xs, "street"),
      hands: group(xs, "kind"),
    }),
  )
}
for (const reason of ["call", "bet"]) {
  const xs = result.filter((x) => x.first && x.reason === reason)
  console.log(
    reason,
    JSON.stringify({
      n: xs.length,
      hands: group(xs, "kind"),
      stacks: xs.map((x) => x.chips).sort((a, b) => a - b),
      loans: group(xs, "loans"),
      expectedWins: xs.reduce((a, x) => a + x.equity, 0),
      actualWins: xs.reduce((a, x) => a + x.winCredit, 0),
    }),
  )
  console.log(
    xs.map((x) => ({
      g: x.game,
      h: x.hand,
      p: x.player,
      s: x.street,
      stack: x.chips,
      pot: x.pot,
      hand: x.kind,
      eq: x.equity,
      ev: x.ev,
      rationale: x.rationale,
      win: x.winner,
    })),
  )
}
