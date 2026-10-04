import {
  DRAGONS,
  FLOWERS,
  JOKER_COLORS,
  SUITS,
  WINDS,
  type Card,
  type CardColor,
  type CardFace,
  type Dragon,
  type Flower,
  type JokerColor,
  type NumberedRank,
  type Suit,
  type Wind,
} from "./types"

export function createDeck(mode: "basic" | "riichi" = "riichi"): Card[] {
  const cards: Card[] = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 9; rank += 1) {
      for (let copy = 1; copy <= 3; copy += 1) {
        cards.push({
          ...numberedFace(suit, rank as NumberedRank),
          id: `${suit}-${rank}-${copy}`,
        })
      }
    }
  }

  for (const dragon of DRAGONS) {
    for (let copy = 1; copy <= 3; copy += 1) {
      cards.push({ ...dragonFace(dragon), id: `dragon-${dragon}-${copy}` })
    }
  }

  for (const wind of WINDS) {
    for (let copy = 1; copy <= 3; copy += 1) {
      cards.push({ ...windFace(wind), id: `wind-${wind}-${copy}` })
    }
  }

  if (mode === "basic") return cards

  for (const color of JOKER_COLORS) {
    cards.push({ ...jokerFace(color), id: `joker-${color}` })
  }

  for (let copy = 1; copy <= 4; copy += 1) {
    cards.push({ ...blankFace(), id: `blank-${copy}` })
  }

  if (cards.length !== 110) {
    throw new Error(`Deck invariant failed: ${cards.length}`)
  }

  return cards
}

export function faceKey(card: CardFace): string {
  switch (card.kind) {
    case "numbered":
      return `${card.suit}-${card.rank}`
    case "dragon":
      return `dragon-${card.dragon}`
    case "wind":
      return `wind-${card.wind}`
    case "flower":
      return `flower-${card.flower}`
    case "joker":
      return `joker-${card.color}`
    case "blank":
      return "blank"
  }
}

export function cardLabel(card: CardFace): string {
  switch (card.kind) {
    case "numbered":
      return `${card.rank} ${suitLabel(card.suit)}`
    case "dragon":
      return `${card.dragon === "white" ? "Blue" : capitalize(card.dragon)} Dragon`
    case "wind":
      return `${capitalize(card.wind)} Wind`
    case "flower":
      return card.flower === "white-lotus" ? "White Lotus" : "Black Lotus"
    case "joker":
      return `${capitalize(card.color)} Joker`
    case "blank":
      return "Blank"
  }
}

export function jokerCanRepresent(joker: CardFace, target: CardFace): boolean {
  if (
    joker.kind !== "joker" ||
    target.kind === "joker" ||
    target.kind === "blank" ||
    target.kind === "flower"
  ) {
    return false
  }

  return joker.color === target.color
}

export function numberedFace(suit: Suit, rank: NumberedRank): CardFace {
  return { kind: "numbered", suit, rank, color: suitColor(suit) }
}

export function dragonFace(dragon: Dragon): CardFace {
  const color = dragon === "green" ? "green" : dragon === "white" ? "blue" : "red"

  return { kind: "dragon", dragon, color }
}

export function windFace(wind: Wind): CardFace {
  return { kind: "wind", wind, color: "black" }
}

export function jokerFace(color: JokerColor): CardFace {
  return { kind: "joker", color }
}

export function flowerFace(flower: Flower): CardFace {
  return { kind: "flower", flower, color: null }
}

export function blankFace(): CardFace {
  return { kind: "blank", color: null }
}

function suitColor(suit: Suit): CardColor {
  return suit === "bamboo" ? "green" : suit === "dots" ? "blue" : "red"
}

export function suitLabel(suit: Suit): "Bams" | "Dots" | "Craks" {
  return suit === "bamboo" ? "Bams" : suit === "dots" ? "Dots" : "Craks"
}

export function compareCards(left: Card, right: Card): number {
  const leftKey = visualSortKey(left)
  const rightKey = visualSortKey(right)

  return (
    leftKey[0] - rightKey[0] ||
    leftKey[1] - rightKey[1] ||
    leftKey[2] - rightKey[2] ||
    left.id.localeCompare(right.id)
  )
}

function visualSortKey(card: Card): [number, number, number] {
  switch (card.kind) {
    case "numbered":
      return [0, SUITS.indexOf(card.suit), card.rank]
    case "dragon":
      return [1, DRAGONS.indexOf(card.dragon), 0]
    case "wind":
      return [2, WINDS.indexOf(card.wind), 0]
    case "flower":
      return [3, FLOWERS.indexOf(card.flower), 0]
    case "joker":
      return [4, JOKER_COLORS.indexOf(card.color), 0]
    case "blank":
      return [5, 0, 0]
  }
}

function capitalize(value: string): string {
  return value[0]!.toUpperCase() + value.slice(1)
}
