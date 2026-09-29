import { createDeck, dragonFace, numberedFace, windFace } from "../../src/game/cards"
import { DRAGONS, SUITS, WINDS, type Card, type NumberedRank } from "../../src/game/types"

/** Headless-only encoding: IDs distinguish experimental cards from v6 faces.
 * Never serialize these through the production room/card API or score them with
 * the v6 evaluator. Keeping the experiment here avoids exposing a new web mode. */
export function legacyDeck(): Card[] {
  const cards = createDeck("riichi")
  for (let rank = 1; rank <= 9; rank++)
    cards.push({
      ...numberedFace("bamboo", rank as NumberedRank),
      color: "black",
      id: `wild-${rank}`,
    })
  cards.push({ ...dragonFace("red"), color: "black", id: "wild-dragon" })
  for (const wind of WINDS) cards.push({ ...windFace(wind), id: `wind-${wind}-4` })
  for (let i = 5; i <= 6; i++) cards.push({ kind: "blank", color: null, id: `blank-${i}` })
  for (let i = 1; i <= 4; i++) cards.push({ kind: "blank", color: null, id: `treasure-${i}` })
  return cards
}

export const isWild = (card: Card): boolean => card.id.startsWith("wild-")
export const isTreasure = (card: Card): boolean => card.id.startsWith("treasure-")
export const isBlank = (card: Card): boolean => card.kind === "blank" && !isTreasure(card)
export const lotusCount = (cards: readonly Card[]): number =>
  cards.filter((c) => c.kind === "flower").length

// 0..26 suited numbers, 27..29 Dragons, 30..33 Winds.
export function identities(card: Card, allowJoker: boolean): number[] {
  if (isWild(card)) {
    if (card.kind === "numbered") return [card.rank - 1, card.rank + 8, card.rank + 17]
    return [27, 28, 29]
  }
  if (card.kind === "numbered") return [SUITS.indexOf(card.suit) * 9 + card.rank - 1]
  if (card.kind === "dragon") return [27 + DRAGONS.indexOf(card.dragon)]
  if (card.kind === "wind") return [30 + WINDS.indexOf(card.wind)]
  if (card.kind !== "joker" || !allowJoker) return []
  if (card.color === "black") return [30, 31, 32, 33]
  const suit = card.color === "green" ? 0 : card.color === "blue" ? 1 : 2
  const dragon = card.color === "green" ? 28 : card.color === "blue" ? 29 : 27
  return [...Array.from({ length: 9 }, (_, rank) => suit * 9 + rank), dragon]
}

export const identityValue = (identity: number): number =>
  identity >= 30 ? 11 : identity >= 27 ? 10 : (identity % 9) + 1
