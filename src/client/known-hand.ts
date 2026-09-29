import { scoreHand } from "../game/scoring"
import type { PublicPlayerState } from "../game/types"

/** Rank only the cards visibly revealed on the table; higher ranks are stronger. */
export function knownHand(player: PublicPlayerState, mode: "basic" | "riichi" | "legacy") {
  const cards = [...new Map(player.publicCards.map((card) => [card.id, card])).values()]
  if (!cards.length) return { label: "", rank: undefined }
  const score = scoreHand(cards, mode)
  if (!score.selectedCardIds.length) return { label: "", rank: undefined }
  return {
    label: score.combinations[0]?.label ?? "High Card",
    rank: score.total,
  }
}
