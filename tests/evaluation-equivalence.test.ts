import { createHash } from "node:crypto"
import { describe, expect, it } from "vitest"
import { createDeck } from "../src/game/cards"
import { analyzeHandProgress, nextHandPotential } from "../src/game/hand-progress"
import { SeededRandom } from "../src/game/random"
import { scoreHand } from "../src/game/scoring"
import golden from "./fixtures/evaluation-golden.json"

describe("evaluation optimization", () => {
  it.each(["basic", "riichi"] as const)(
    "preserves the calibrated %s scores, ties and progress explanations",
    (mode) => {
      const random = new SeededRandom(golden.seed)
      const deck = createDeck(mode)
      const hash = createHash("sha256")
      for (let index = 0; index < golden.count; index++) {
        const cards = Object.freeze(
          random
            .shuffle(deck)
            .slice(0, index % 9)
            .map((card) => Object.freeze(card)),
        )
        const score = scoreHand(cards, mode)
        const progress = analyzeHandProgress(cards, mode)
        hash.update(JSON.stringify({ score, progress }))
        const next = progress
          .filter((entry) => entry.rank > score.total)
          .sort((a, b) => a.missing - b.missing || b.rank - a.rank)[0]
        expect(nextHandPotential(cards, mode, score.total)).toEqual({
          nextRank: next?.rank ?? null,
          nextMissing: next?.missing ?? null,
        })
        expect(nextHandPotential(cards, mode, 14)).toEqual({ nextRank: null, nextMissing: null })
      }
      expect(hash.digest("hex")).toBe(golden.hashes[mode])
    },
    15_000,
  )
})
