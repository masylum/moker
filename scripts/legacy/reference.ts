import { dragonFace, faceKey, jokerCanRepresent, numberedFace } from "../../src/game/cards"
import { generateHandCandidates } from "../../src/game/melds"
import { compareHandStrengths, scoreHand, type HandStrength } from "../../src/game/scoring"
import { DRAGONS, SUITS, type Card } from "../../src/game/types"
import { isWild } from "./cards"
import { LEGACY_LADDER, type LegacyKind } from "./scoring"

/** Independent slow oracle: expand every wild suit, then use the v6 evaluator.
 * Quint is checked separately from natural identity counts and eligible Jokers. */
export function referenceLegacy(cards: readonly Card[], contains?: Set<LegacyKind>): HandStrength {
  let best: HandStrength = { total: 0, tieBreak: [] }
  const expand = (index: number, assigned: Card[]) => {
    if (index < cards.length) {
      const card = cards[index]
      if (!isWild(card)) return expand(index + 1, [...assigned, card])
      const variants =
        card.kind === "numbered"
          ? SUITS.map((suit) => numberedFace(suit, card.rank))
          : DRAGONS.map(dragonFace)
      for (const variant of variants) expand(index + 1, [...assigned, { ...variant, id: card.id }])
      return
    }
    const score = scoreHand(assigned)
    let candidate: HandStrength = {
      total: LEGACY_LADDER.indexOf(score.combinations[0]?.kind ?? "high-card") + 1,
      tieBreak: score.tieBreak,
    }
    if (contains) {
      for (const combination of generateHandCandidates(assigned)) contains.add(combination.kind)
      if (assigned.some((c) => ["numbered", "wind", "dragon"].includes(c.kind)))
        contains.add("high-card")
    }
    for (const target of assigned.filter((c) => ["numbered", "wind", "dragon"].includes(c.kind))) {
      if (
        assigned.filter((c) => faceKey(c) === faceKey(target) || jokerCanRepresent(c, target))
          .length < 5
      )
        continue
      contains?.add("quint")
      const value =
        target.kind === "wind"
          ? 11
          : target.kind === "dragon"
            ? 10
            : target.kind === "numbered"
              ? target.rank
              : 0
      const quint = {
        total: LEGACY_LADDER.indexOf("quint") + 1,
        tieBreak: Array<number>(5).fill(value),
      }
      if (compareHandStrengths(quint, candidate) > 0) candidate = quint
    }
    if (compareHandStrengths(candidate, best) > 0) best = candidate
  }
  expand(0, [])
  return best
}
