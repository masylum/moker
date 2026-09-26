import { LOAN_PENALTY } from "../../docs/fishing-experiment-2026-09-25/current/src/game/rules"

type SettledHand = {
  orbit: number
  handNumber: number
  players: readonly { playerId: string; chips: number; loans: number }[]
}
/** Checkpoints are after settlement and before the next ante/automatic loan. */
export function orbitHistory(hands: readonly SettledHand[], startingChips: Record<string, number>) {
  let startChips = { ...startingChips },
    startScores = { ...startingChips }
  const result = []
  for (const orbit of [...new Set(hands.map((hand) => hand.orbit))].sort((a, b) => a - b)) {
    const played = hands.filter((hand) => hand.orbit === orbit)
    const snapshots = played.map((hand) => ({
      handNumber: hand.handNumber,
      chips: Object.fromEntries(hand.players.map((p) => [p.playerId, p.chips])),
      scores: Object.fromEntries(
        hand.players.map((p) => [p.playerId, p.chips - p.loans * LOAN_PENALTY]),
      ),
    }))
    const end = snapshots.at(-1)!
    result.push({
      orbit,
      hands: played.length,
      startChips,
      startScores,
      endChips: end.chips,
      endScores: end.scores,
      handScores: snapshots.map((s) => s.scores),
    })
    startChips = end.chips
    startScores = end.scores
  }
  return result
}
