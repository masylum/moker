import {
  DRAGONS,
  JOKER_COLORS,
  SUITS,
  WINDS,
  type Card,
  type CardFace,
  type JokerColor,
  type Suit,
} from "./types";

export function createDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 9; rank += 1) {
      for (let copy = 1; copy <= 3; copy += 1) {
        cards.push({ id: `${suit}-${rank}-${copy}`, kind: "numbered", suit, rank: rank as 1 });
      }
    }
  }
  for (const dragon of DRAGONS) {
    for (let copy = 1; copy <= 3; copy += 1) {
      cards.push({ id: `dragon-${dragon}-${copy}`, kind: "dragon", dragon });
    }
  }
  for (const wind of WINDS) {
    for (let copy = 1; copy <= 3; copy += 1) {
      cards.push({ id: `wind-${wind}-${copy}`, kind: "wind", wind });
    }
  }
  for (const color of JOKER_COLORS) {
    cards.push({ id: `joker-${color}`, kind: "joker", color });
  }
  for (let copy = 1; copy <= 4; copy += 1) {
    cards.push({ id: `blank-${copy}`, kind: "blank" });
  }
  if (cards.length !== 110) throw new Error(`Deck invariant failed: ${cards.length}`);
  return cards;
}

export function faceKey(card: CardFace): string {
  switch (card.kind) {
    case "numbered":
      return `${card.suit}-${card.rank}`;
    case "dragon":
      return `dragon-${card.dragon}`;
    case "wind":
      return `wind-${card.wind}`;
    case "joker":
      return `joker-${card.color}`;
    case "blank":
      return "blank";
  }
}

export function cardLabel(card: CardFace): string {
  switch (card.kind) {
    case "numbered":
      return `${card.rank} ${capitalize(card.suit)}`;
    case "dragon":
      return `${capitalize(card.dragon)} Dragon`;
    case "wind":
      return `${capitalize(card.wind)} Wind`;
    case "joker":
      return `${capitalize(card.color)} Joker`;
    case "blank":
      return "Blank";
  }
}

export function jokerCanRepresent(joker: CardFace, target: CardFace): boolean {
  if (joker.kind !== "joker" || target.kind === "joker" || target.kind === "blank") return false;
  const color = joker.color;
  if (target.kind === "numbered") {
    return (
      (color === "green" && target.suit === "bamboo") ||
      (color === "blue" && target.suit === "dots") ||
      (color === "red" && target.suit === "characters")
    );
  }
  if (target.kind === "dragon") {
    return (
      (color === "green" && target.dragon === "green") ||
      (color === "blue" && target.dragon === "white") ||
      (color === "red" && target.dragon === "red")
    );
  }
  return target.kind === "wind" && color === "black";
}

export function familyOf(card: CardFace): JokerColor | null {
  if (card.kind === "joker") return card.color;
  if (card.kind === "numbered") return suitFamily(card.suit);
  if (card.kind === "dragon") {
    return card.dragon === "green" ? "green" : card.dragon === "white" ? "blue" : "red";
  }
  if (card.kind === "wind") return "black";
  return null;
}

export function suitFamily(suit: Suit): JokerColor {
  return suit === "bamboo" ? "green" : suit === "dots" ? "blue" : "red";
}

export function sameNaturalFace(left: CardFace, right: CardFace): boolean {
  return left.kind !== "joker" && left.kind !== "blank" && faceKey(left) === faceKey(right);
}

function capitalize(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1);
}
