import { LEGACY_DRAGONS as DRAGONS, LEGACY_SUITS as SUITS, WINDS, type Card } from "./types"
const dragonStart = SUITS.length * 9,
  windStart = dragonStart + DRAGONS.length
export function identities(card: Card, allowJoker: boolean): number[] {
  if (card.kind === "wild")
    return card.rank === "dragon"
      ? DRAGONS.map((_, i) => dragonStart + i)
      : SUITS.map((_, i) => i * 9 + Number(card.rank) - 1)
  if (card.kind === "numbered") return [SUITS.indexOf(card.suit) * 9 + card.rank - 1]
  if (card.kind === "dragon") return [dragonStart + DRAGONS.indexOf(card.dragon)]
  if (card.kind === "wind") return [windStart + WINDS.indexOf(card.wind)]
  if (card.kind !== "joker" || !allowJoker) return []
  const winds = WINDS.map((_, i) => windStart + i)
  if (card.color === "black")
    return [
      ...Array.from({ length: 9 }, (_, i) => SUITS.indexOf("shadow") * 9 + i),
      dragonStart + DRAGONS.indexOf("black"),
      ...winds,
    ]
  const suit = card.color === "green" ? 0 : card.color === "blue" ? 1 : 2
  const dragon = card.color === "green" ? 1 : card.color === "blue" ? 2 : 0
  return [...Array.from({ length: 9 }, (_, i) => suit * 9 + i), dragonStart + dragon]
}
export const identityValue = (id: number): number =>
  id >= windStart ? 11 : id >= dragonStart ? 10 : (id % 9) + 1
