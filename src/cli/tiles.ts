import { FLOWERS, type Card } from "../game/types"

export function coloredTile(card: Card): string {
  const ansiColor =
    card.color === "red"
      ? 31
      : card.color === "green"
        ? 32
        : card.color === "blue"
          ? 34
          : card.color === "black"
            ? 37
            : 2

  return `\u001B[${ansiColor}m${tileGlyph(card)}\u001B[0m`
}

export function tileGlyph(card: Card): string {
  if (card.kind === "numbered") {
    const base = card.suit === "characters" ? 0x1f006 : card.suit === "bamboo" ? 0x1f00f : 0x1f018

    return String.fromCodePoint(base + card.rank)
  }

  if (card.kind === "wind") {
    return String.fromCodePoint(0x1f000 + ["east", "south", "west", "north"].indexOf(card.wind))
  }

  if (card.kind === "dragon") {
    return String.fromCodePoint(0x1f004 + ["red", "green", "white"].indexOf(card.dragon))
  }

  if (card.kind === "flower") {
    return String.fromCodePoint(0x1f022 + FLOWERS.indexOf(card.flower))
  }

  return card.kind === "joker" ? "★" : "🀫"
}
