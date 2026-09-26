import { writeFileSync } from "node:fs"
import { parseArgs } from "node:util"
import { createDeck } from "../src/game/cards"
import { HAND_RANKS, handRank } from "../src/game/hand-ranks"
import { generateHandCandidates } from "../src/game/melds"
import { SeededRandom } from "../src/game/random"
import type { HandKind } from "../src/game/types"

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mode: { type: "string", default: "both" },
    json: { type: "string" },
    output: { type: "string" },
  },
})
const samples = Number(positionals[0] ?? 100000)
const seed = positionals[1] ?? "ladder-v6"
if (
  !Number.isSafeInteger(samples) ||
  samples < 1 ||
  !["both", "basic", "riichi"].includes(values.mode!)
)
  throw new Error(
    "Usage: analyze-ladder.ts [deals] [seed] --mode both|basic|riichi [--json FILE] [--output FILE]",
  )
const started = performance.now()
const modes =
  values.mode === "both" ? (["basic", "riichi"] as const) : [values.mode as "basic" | "riichi"]
const results = []
for (const mode of modes) {
  const random = new SeededRandom(`${seed}:${mode}`),
    deck = createDeck(mode)
  const kinds = (Object.keys(HAND_RANKS) as HandKind[]).filter(
    (kind) => mode === "riichi" || !["pung-eye", "three-dragons-eye", "kong"].includes(kind),
  )
  const rank = (kind: HandKind) => handRank(kind, mode)
  const rows = Object.fromEntries(
    kinds.map((kind) => [
      kind,
      {
        kind,
        rank: rank(kind),
        contains: 0,
        best: 0,
        jokerDependent: 0,
        usingJoker: {} as Record<string, number>,
      },
    ]),
  )
  let singleLotus = 0,
    twinLotus = 0,
    jokerHands = 0
  for (let sample = 0; sample < samples; sample++) {
    const cards = random.shuffle(deck).slice(0, 7)
    const flowers = cards.filter((c) => c.kind === "flower").length
    if (flowers === 1) singleLotus++
    if (flowers === 2) twinLotus++
    const candidates = generateHandCandidates(cards.filter((c) => c.kind !== "flower")).filter(
      (c) => kinds.includes(c.kind),
    )
    const present = new Set<HandKind>(candidates.map((c) => c.kind))
    if (!present.size) present.add("high-card")
    const jokers = cards.filter((c) => c.kind === "joker")
    if (jokers.length) jokerHands++
    const natural = jokers.length
      ? new Set(
          generateHandCandidates(
            cards.filter((c) => c.kind !== "joker" && c.kind !== "flower"),
          ).map((c) => c.kind),
        )
      : present
    let best: HandKind = "high-card"
    for (const kind of present) {
      const row = rows[kind]!
      row.contains++
      if (rank(kind) > rank(best)) best = kind
      if (kind !== "high-card" && !natural.has(kind)) row.jokerDependent++
      for (const joker of jokers) {
        if (candidates.some((c) => c.kind === kind && c.cardIds.includes(joker.id)))
          row.usingJoker[joker.color!] = (row.usingJoker[joker.color!] ?? 0) + 1
      }
    }
    rows[best]!.best++
  }
  results.push({
    mode,
    deckSize: deck.length,
    samples,
    seed: `${seed}:${mode}`,
    singleLotus,
    twinLotus,
    jokerHands,
    rows: Object.values(rows).sort((a, b) => a.rank - b.rank),
  })
}
const output = { seconds: (performance.now() - started) / 1000, results }
if (values.json) writeFileSync(values.json, JSON.stringify(output, null, 2) + "\n")
const text = results
  .map((r) =>
    [
      `## ${r.mode} — ${r.deckSize} cards`,
      "",
      `${r.samples} uniform seven-card deals, seed ${r.seed}. Contains counts overlap; best counts partition the ordinary scoring ladder. Lotuses are reported separately.`,
      "",
      "| Rank | Hand | Contains | Frequency | Ordinary best | Joker-dependent contains |",
      "|---:|---|---:|---:|---:|---:|",
      ...r.rows.map(
        (x) =>
          `| ${x.rank} | ${x.kind} | ${x.contains} | ${((100 * x.contains) / r.samples).toFixed(3)}% | ${x.best} | ${x.jokerDependent} |`,
      ),
      "",
      `Single Lotus: ${r.singleLotus}; Twin Lotus: ${r.twinLotus}; hands with Jokers: ${r.jokerHands}.`,
      "",
    ].join("\n"),
  )
  .join("\n")
if (values.output) writeFileSync(values.output, text)
console.log(text)
