import { compareCards, jokerCanRepresent } from "../game/cards"
import { generateHandCandidates } from "../game/melds"
import type { Card } from "../game/types"

// Public and hidden cards stay separate; each Joker follows the meld it completes.
export function sortHand(
  cards: Card[],
  publicCards: Card[] = [],
  mode: "basic" | "riichi" | "streamlined" = "riichi",
): Card[] {
  const publicIds = new Set(publicCards.map((card) => card.id))
  const group = (hand: Card[]) => {
    const ordered: Card[] = hand.filter((card) => card.kind !== "joker").sort(compareCards)
    const melds = generateHandCandidates(hand, mode)
      .filter((meld) => !["chow-eye", "pung-eye", "three-dragons-eye"].includes(meld.kind))
      .sort((a, b) => b.score - a.score)
    for (const joker of hand.filter((card) => card.kind === "joker").sort(compareCards)) {
      const meld = melds.find((m) => m.cardIds.includes(joker.id))
      const matches = ordered
        .map((card, index) => ({ card, index }))
        .filter(({ card }) =>
          meld ? meld.cardIds.includes(card.id) : jokerCanRepresent(joker, card),
        )
      const anchor = matches.at(-1)?.index
      ordered.splice(anchor === undefined ? ordered.length : anchor + 1, 0, joker)
    }
    return ordered
  }
  return [
    ...group(cards.filter((c) => publicIds.has(c.id))),
    ...group(cards.filter((c) => !publicIds.has(c.id))),
  ]
}
