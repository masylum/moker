import { writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import { createDeck } from "../src/game/cards"
import { SeededRandom } from "../src/game/random"
import { isWild, lotusCount } from "./legacy/cards"
import { evaluateLegacy, type LegacyKind } from "../src/game/legacy-scoring"
import { LEGACY_HAND_ORDER as LEGACY_LADDER } from "../src/game/hand-ranks"
import { exactIdentical, exactHonors, exactDragonEye } from "./legacy/probabilities"

const { values } = parseArgs({
  options: {
    samples: { type: "string", default: "1000000" },
    deck: { type: "string", default: "legacy" },
    seed: { type: "string", default: "legacy-ladder-v2" },
    output: { type: "string" },
  },
})
const samples = Number(values.samples)
if (
  !Number.isSafeInteger(samples) ||
  samples < 0 ||
  !["riichi", "legacy", "no-wilds", "no-extra-winds", "no-extra-utilities"].includes(values.deck!)
)
  throw new Error("Invalid ladder options")
let deck = values.deck === "riichi" ? createDeck("riichi") : createDeck("legacy")
if (values.deck === "no-wilds") deck = deck.filter((c) => !isWild(c))
if (values.deck === "no-extra-winds")
  deck = deck.filter((c) => !(c.kind === "wind" && c.id.endsWith("-4")))
if (values.deck === "no-extra-utilities")
  deck = deck.filter((c) => !c.id.startsWith("treasure-") && !["blank-5", "blank-6"].includes(c.id))
const random = new SeededRandom(values.seed!),
  started = performance.now()
const rows = Object.fromEntries(
  LEGACY_LADDER.map((kind) => [kind, { contains: 0, best: 0, eligibleBest: 0 }]),
)
const cooccurrence = Object.fromEntries(
  LEGACY_LADDER.map((kind) => [kind, Object.fromEntries(LEGACY_LADDER.map((other) => [other, 0]))]),
)
let singleLotus = 0
for (let i = 0; i < samples; i++) {
  // Uniform sample without replacement. Avoid shuffling the whole deck to draw 7.
  const indexes = new Set<number>()
  while (indexes.size < 7) indexes.add(random.integer(deck.length))
  const hand = [...indexes].map((index) => deck[index]),
    contains = new Set<LegacyKind>()
  const best = evaluateLegacy(hand, contains)
  const disqualified = lotusCount(hand) === 1
  if (disqualified) singleLotus++
  rows[best.kind].best++
  if (!disqualified) rows[best.kind].eligibleBest++
  for (const kind of contains) {
    rows[kind].contains++
    for (const other of contains) cooccurrence[kind][other]++
  }
  if ((i + 1) % 250000 === 0)
    console.log(
      `${values.deck}: ${i + 1}/${samples}; ${((performance.now() - started) / 1000).toFixed(1)}s`,
    )
}
const exact = {
  ...exactIdentical(deck),
  ...exactHonors(deck),
  "three-dragons-eye": exactDragonEye(deck),
}
const output = {
  version: 2,
  options: values,
  samples,
  deckSize: deck.length,
  rows,
  singleLotus,
  cooccurrence,
  exact,
  seconds: (performance.now() - started) / 1000,
}
if (values.output) writeFileSync(values.output, JSON.stringify(output, null, 2) + "\n")
else console.log(JSON.stringify(output, null, 2))
