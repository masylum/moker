# Streamlined Moker: implementation and health

The variant is mechanically sound and ready for a human playtest. It needs roughly 15–16% fewer betting decisions per hand in the matching-seed comparison, reaches showdown more often, and does not show an all-in or elimination surge. The principal tradeoff is weaker hands and more public information about the eventual winning combination. These are preliminary bot self-play results, not proof of competitive balance or human enjoyment.

Branch: `codex/streamlined-six-card`. Rules version: **7**. Original-game baseline: `bf26dab2c67a43dbccafcb7d8392145f5462925b` (v6).

## Implemented rules

- Six cards per player; use **up to four** to make the strongest listed combination. Smaller combinations remain valid. Unused cards never break ties.
- Three betting streets. Reveal **0, 2, 2 new cards** before them, giving **0, 2, 4 total public cards** and **6, 4, 2 hidden cards**. Reveal the last two at showdown. Existing all-in early-showdown rules still apply.
- Remove both Lotuses, Twin Lotus, single-Lotus disqualification, and Lotus bluff bonuses. Basic has 102 cards; Riichi has 110.
- Remove Chow + Eye, Pung + Eye, and Three Dragons + Eye. Long Chow becomes four consecutive cards in one suit and is available in both modes.
- Keep Charleston, fishing, color-restricted Jokers, natural-only pairs, Blanks, sticks, loans, antes, and tournament scoring.
- Riichi may be declared on streets 1–2. This preserves the original “before the final street” restriction. Rewards remain two sticks.
- Older saves are explicitly rejected. Browser sessions use a new v7 storage key. Historical flower card rendering and empty Lotus result fields remain available for archived artifacts; they have no active game effect.

See [complete rules](../../public/rules.md).

## New ladder

Weakest to strongest. Frequency is the chance that a uniform six-card Riichi deal **contains** the combination, before Charleston or fishing. Counts overlap. High Card means no listed combination is present.

| Rank | Riichi hand   | Cards used | Deal frequency |
| ---: | ------------- | ---------: | -------------: |
|    1 | High Card     |          1 |        68.612% |
|    2 | Eyes          |          2 |        23.596% |
|    3 | Chow          |          3 |         7.213% |
|    4 | Two Eyes      |          4 |         1.270% |
|    5 | Three Winds   |          3 |         1.255% |
|    6 | Pung          |          3 |         1.225% |
|    7 | Long Chow     |          4 |         0.662% |
|    8 | Three Dragons |          3 |         0.523% |
|    9 | Four Winds    |          4 |         0.047% |
|   10 | Kong          |          4 |         0.008% |

Basic has nine ranks: **High Card → Eyes → Chow → Two Eyes → Three Winds → Long Chow → Pung → Three Dragons → Four Winds**. Its natural Long Chow occurs in 0.436% of deals, compared with 0.406% for Pung. Kong cannot occur in Basic because the deck has only three copies of each identity.

The order uses one million deals per mode. Two Eyes, Three Winds, and Pung are close in Riichi; their small frequency differences should not be treated as precise balance margins. Black Joker strengthens Winds, while the colored Jokers make Pung and Long Chow substantially more accessible. About 74% of Riichi Pung-containing deals require a Joker to form a Pung; about 50% of Long Chow-containing deals require one. Kong necessarily uses a matching Joker.

[Full frequency tables](ladder.md) · [raw counts and seeds](ladder.json)

## Bot changes

Opponent equity sampling now fills six-card hands. Charleston evaluates the four-card core left by its two-card pass. Fishing and hand-progress projections share the new ladder, including four-card Long Chow, and never chase removed five-card patterns.

Exposure uses the new two-card schedule and keeps Blanks concealed when possible. Betting and Riichi decisions account for three streets, with a recalibrated made-hand threshold and the penultimate-street declaration deadline. Publicly stronger hands bound equity in both modes because there is no hidden Lotus disqualification. Lotus bluff incentives, disposal penalties, and reserves for Lotus fees have been removed, including the obsolete training parameter.

Existing scalar policy weights were retained; this is a rules-aware adaptation, not a new policy training run. Regression tests cover visible fishing opportunities, paid two-step fishing, hidden-information independence, unbeatable public hands, and tournament behavior.

## Health results

The main run used **80 four-player games per mode**, four continuous dealer orbits, 200 starting chips, a 5-chip ante, and 24 equity trials per projection. That produced **2,533 variant hands**, with no simulation accounting violations or post-processed variant violations. Baseline runs used 40 games per mode and the original v6 source and bots.

The table below compares the **first 40 seed labels in each version**, so sample sizes match. Changing the deck and policy changes the subsequent random trajectory; these are not identical deals.

| Metric                              | Basic v6 | Basic v7 | Riichi v6 | Riichi v7 |
| ----------------------------------- | -------: | -------: | --------: | --------: |
| Hands                               |      628 |      626 |       639 |       640 |
| Betting decisions per hand          |    11.68 |     9.81 |     10.43 |      8.81 |
| Fishing actions per hand            |     8.27 |     6.74 |      7.43 |      5.65 |
| Hands reaching showdown             |    39.0% |    48.1% |     34.4% |     39.8% |
| All-in hands                        |     8.1% |     8.1% |      8.5% |      8.8% |
| Tied showdowns                      |     2.0% |     3.7% |      4.1% |      3.9% |
| High Card among showdown contenders |     8.7% |    14.0% |      7.0% |     12.0% |
| Eliminated players / 160            |        9 |       10 |         1 |         0 |
| Loans                               |        0 |        0 |         8 |        13 |
| Riichi declarations                 |        — |        — |       133 |       227 |

The full 80-game variant runs confirm the broad pattern: Basic showdowns 48.2%, Riichi 39.4%; all-ins 8.4% and 9.0%; tied showdowns 4.3% and 4.4%. Eliminations were 21/320 in Basic and 1/320 in Riichi. Riichi took 27 loans across 80 games.

### What looks healthy

- Fewer betting decisions and fishing actions support the streamlined objective. Human playing time was not measured; simulation wall time is not a substitute, especially with different worker contention.
- More rounds reach comparison rather than ending in folds. All-in rates remain close to baseline.
- Fishing and Charleston produce meaningful development: although about 69% of raw Riichi deals are High Card, only 11.3% of surviving showdown hands are High Card in the full variant sample. This includes selection effects from folding; it is not a direct improvement probability.
- Two Eyes, Long Chow, Pung, and Three Winds all win meaningful numbers of showdowns. No single Riichi category accounts for a majority of winner appearances.
- Ties remain uncommon, and removing Lotus payments simplifies accounting without disrupting chip conservation.

### What needs attention in playtesting

1. **Less uncertainty on the final street.** In 58.1% of full-run Riichi showdowns without an all-in, at least one winner's selected scoring combination was entirely within their four public cards. The baseline figure was 38.5%. Basic rose from 38.7% to 46.7%. This measures eventual winning-card visibility, not guaranteed knowledge of the winner during betting, but it suggests less room for a hidden reversal.
2. **Weaker hands and fewer chances to improve.** Riichi fishing falls about 24% in the matching-seed sample. High Card showdown appearances increase. Losing a street and one held card makes missed draws more consequential.
3. **More Riichi locks.** Declarations rise from 0.21 to 0.35 per hand in the matching-seed sample. Recorded winning settlements divided by declarations fall from 92.5% to 83.7%. Declarations can occur more than once in a hand after a fold, so this is an aggregate signal rather than a per-player success study. Check whether frequent locks make play feel passive.
4. **Sparse top ranks.** Only six Kongs and sixteen Four Winds reached showdown across all 80 Riichi games. Their observed 100% win rates cannot establish balance. The neighboring mid-ladder categories also have very similar raw rarity.
5. **Seat fairness remains unproven.** Riichi game-win credits were 18.5, 28, 14, and 19.5 across the four seats; Basic was 14.5, 23.5, 24, and 18. This is too little self-play to diagnose a structural seat advantage. A larger rotation-controlled experiment would be needed.

**Assessment:** keep this version for a human playtest. Its mechanics and pace are sound enough to evaluate; the main question is whether the shorter final street still has enough suspense. Do not infer exploit resistance, optimal strategy, or human win rates from these bots.

## Validation and reproduction

- 213 unit tests, including complete games at every supported seat count (2–6) in both modes, checking physical card conservation at every engine step.
- 13 Worker integration tests covering API and persistence behavior.
- Explicit three-street reveal, final-street Riichi rejection, scoring limits, removed patterns, fishing, ties, and old-save rejection tests.
- Browser inspection verified six-card hands, the 3-street counter, and all ten Riichi ranks with legal four-card examples.
- Production build, lint, dead-code, and TypeScript checks pass. All changed files pass formatting. The repository-wide `npm run check` stops at 15 pre-existing formatting failures in archived `docs/twin-lotus-2026-09-27` reports; those unrelated artifacts were left unchanged. The remaining checks were run individually.

```bash
npm run check
npm run build
npm run analyze:ladder -- 1000000 streamlined-ladder-confirm --json /tmp/ladder.json --output /tmp/ladder.md
npm run simulate -- 80 streamlined-health --riichi --workers 4 --output /tmp/variant-riichi.md --jsonl /tmp/moker-variant-riichi.jsonl
npm run simulate -- 80 streamlined-health --workers 3 --output /tmp/variant-basic.md --jsonl /tmp/moker-variant-basic.jsonl
node --import tsx scripts/summarize-health.ts /tmp/moker-variant-basic.jsonl /tmp/moker-variant-riichi.jsonl
```

For the baseline, run the corresponding simulator at the recorded v6 commit with count 40, four workers, and the same seed prefix. Full baseline and variant JSONL are retained under `/tmp/moker-{baseline,variant}-{basic,riichi}.jsonl` for this local experiment; they are not committed because of their size. Re-run the commands if those temporary files are removed.

[Basic baseline](baseline-basic.md) · [Basic variant](variant-basic.md) · [Riichi baseline](baseline-riichi.md) · [Riichi variant](variant-riichi.md) · [aggregate metrics](health-metrics.json)
