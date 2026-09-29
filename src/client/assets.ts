import type { Card } from "../game/types"

/** Original artwork exported from the linked Moker Figma component library. */
export function cardAsset(card: Card): string {
  if (card.kind === "wild") return `/assets/cards/wild-${card.rank}.svg`
  if (card.kind === "treasure") return `/assets/cards/treasure-${card.treasure}.svg`
  if (card.kind === "numbered" && card.suit === "shadow")
    return `/assets/cards/shadow-${card.rank}.svg`
  if (card.kind === "dragon" && card.dragon === "black") return "/assets/cards/shadow-dragon.svg"
  let name: string
  if (card.kind === "numbered")
    name = `${card.suit === "bamboo" ? "bam" : card.suit === "characters" ? "crak" : "dot"}${card.rank}`
  else if (card.kind === "dragon")
    name = card.dragon === "green" ? "bamd" : card.dragon === "red" ? "crakd" : "dotd"
  else if (card.kind === "wind")
    name = { north: "windn", east: "winde", west: "windew", south: "windes" }[card.wind]
  else if (card.kind === "joker")
    name = { green: "bamj", red: "crakj", blue: "dotj", black: "windj" }[card.color]
  else if (card.kind === "flower") name = card.flower === "white-lotus" ? "lotusw" : "lotusb"
  else name = "blank"
  return `/assets/cards/${name}.${name === "bamd" || name === "bamj" ? "png" : "svg"}`
}
