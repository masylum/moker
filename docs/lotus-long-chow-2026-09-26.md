# Lotus scaling and Long Chow — 26 September 2026

**Long Chow looks promising in the proposed position. The larger Lotus payout did not meaningfully change actual bluff usage under these bots, and their Lotus valuation is too limited to treat that as a verdict on human play.** Both proposals remain experimental; production rules were not changed.

Tested four arms with **60 matched four-game tournaments each: 240 analyzed tournaments, 960 constituent games, 3,840 hands**. Each constituent game has one orbit, four bots and three starting sticks. Stacks reset to 200/300/400/500; antes to 5/10/15/20. All runs used the **24-sample bot setting and ten workers**. Paired confidence intervals resample whole tournaments (4,000 replicates).

## Lotus scaling

The existing three-ante reward already grows in nominal chips. Relative to each individual game’s starting stack it actually rises from 7.5% to 12%. Relative to accumulated tournament starting chips it shrinks, which supports the concern about its weight in the overall tournament. The experimental rule increases its ante multiplier by one each game.

| Game | Current: per opponent | Tested: per opponent | Current / cumulative starting chips | Tested / cumulative starting chips |
|---|---:|---:|---:|---:|
| 1 | 15 | 15 | 7.5% | 7.5% |
| 2 | 30 | 40 | 6.0% | 8.0% |
| 3 | 45 | 75 | 5.0% | 8.3% |
| 4 | 60 | 120 | 4.3% | 8.6% |

The denominators are one player’s cumulative starting chips: 200/500/900/1,400. Actual scores can differ. Each payer remains capped at their remaining chips; the bonus does not trigger borrowing. Engine payouts, ordinary betting reward estimates and secured-lead liability were updated for the variant.

| Actual Lotus usage | Current rules | Scaled reward | Long Chow only | Both changes |
|---|---:|---:|---:|---:|
| Single-Lotus decisions | 442 | 442 | 443 | 443 |
| Bets holding one Lotus before the action | 141 | 144 | 136 | 137 |
| Single-Lotus bets without fishing | 4 | 3 | 4 | 4 |
| Successful single-Lotus bonus hands | 0 | 0 | 1 | 1 |
| Total bonus chips paid | 0 | 0 | 170 | 290 |
| Lotus discards | 378 | 380 | 368 | 368 |
| Lotus pickups from lanes | 72 | 72 | 73 | 73 |
| Lotus Blank claims | 3 | 4 | 2 | 2 |
| Twin Lotus wins | 69 | 70 | 70 | 70 |

The apparent 141/144 single-Lotus bets are mostly bets that buy a fish and can discard the Lotus or complete Twin Lotus. They must not be reported as 141/144 bluffs. Only **4 versus 3** bets retained the single Lotus without fishing; all occurred in game 4. There were **zero successful bonus hands** in either the current-rule or scaled-only arm. Lane pickups were unchanged at 72, and immediate retention after drawing a Lotus was **42.4% versus 42.1%**.

With Long Chow present, the same one successful bluff occurred in both reward variants: seed 3, game 4, hand 4, player 1. The higher reward raised its actual payment from **170 to 290 chips**, less than the nominal 180-to-360 change because one payer was short. It did not create another successful bluff. The winner was already the tournament champion in both versions.

### Lotus usage by tournament game

Each game-number row covers 60 constituent games per arm. Values show current reward → scaled reward, without Long Chow.

| Game | Single-Lotus decisions | Bets without fishing | Bonus wins | Lotus discards | Lane pickups | Twin wins |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 100 → 100 | 0 → 0 | 0 → 0 | 111 → 111 | 21 → 21 | 17 → 17 |
| 2 | 108 → 108 | 0 → 0 | 0 → 0 | 94 → 95 | 20 → 20 | 17 → 17 |
| 3 | 118 → 118 | 0 → 0 | 0 → 0 | 93 → 93 | 19 → 18 | 19 → 19 |
| 4 | 116 → 116 | 4 → 3 | 0 → 0 | 80 → 81 | 12 → 13 | 16 → 17 |

### Limits of the Lotus result

The payout schedule maintains its value relative to cumulative tournament scores, but the behavioral test does **not** validate its balance. Zero or one payout is too little evidence to estimate its strategic effect. Zero bootstrap intervals around zero observed rewards do not establish zero population probability.

The current bot has a fixed **−250 hand-potential penalty for a single Lotus**, which encourages shedding it. Increasing the payout changes betting utility but not that retention penalty. Its final-hand championship calculation also omits the Lotus bonus when projecting the final score, even though ordinary expected-chip calculations and the secured-lead check know about it. Ordinary bluff-bonus estimation uses the pre-fishing holding, so a bet that subsequently discards the Lotus can still receive bonus credit in that estimate. These are concrete limitations of the existing policy; this experiment preserved that policy rather than mixing a strategy redesign into the rule comparison.

**Recommendation:** the proposed scaling is economically sensible, but improve Lotus retention and payout valuation before using bot usage to choose the final schedule. This test does not establish that a larger reward would fail to encourage human bluffing.

## Long Chow

The tested hand is **five consecutive numbers in one suit**, allowing a matching-color Joker. It sits between Three Dragons and Three Dragons + Eyes. Four Winds and Kong shift up one rank; the bot’s Twin Lotus sentinel also shifts, preserving its superiority. Basic is unchanged.

In the Long-Chow-only arm, 3,839 dealt player-hands produced:

| Combination | Retained hands | Share of dealt player-hands | Newly built since opening | Showdowns as best category | Showdown win rate |
|---|---:|---:|---:|---:|---:|
| Three Dragons | 145 | 3.78% | 107 | 23 | 65.2% |
| Long Chow | 116 | 3.02% | 109 | 35 | 77.1% |
| Three Dragons + Eyes | 50 | 1.30% | 43 | 15 | 93.3% |

**109 of 116 retained Long Chows (94%) were absent from the opening hand.** It is being constructed in play, not just rewarding a rare initial deal. It won **27 of 35** showdowns where it was the best category. Retained counts include folded and uncontested holdings; showdown rows exclude those and Single/Twin Lotus holdings.

The proposed local rarity order is observed: Three Dragons > Long Chow > Three Dragons + Eyes in frequency, with the reverse ordering in hand strength. The combined arm is nearly identical: **144 → 115 → 49** retained combinations. This is a paired sensitivity check, not independent replication.

The Long-Chow-only frequency differences, with whole-tournament 95% bootstrap intervals, are:

- Three Dragons minus Long Chow: **+0.76 percentage points [−0.16, +1.64]**. The point estimate fits the proposal, but their true frequency ordering is not established.
- Long Chow minus Three Dragons + Eyes: **+1.72 points [+1.04, +2.42]**. This separation is clearer.

The rest of the observed showdown win-rate ladder is not perfectly ordered: Pung won 43.9% versus Three Winds 33.3%; Pung + Eyes won 71.4% versus Three Dragons 65.2%. These are selected opponent ranges and modest counts, not grounds to automatically reorder those categories. This was a candidate test, not a new convergence search.

### Gameplay effects

| Metric | Current rules | Scaled reward | Long Chow only | Both changes |
|---|---:|---:|---:|---:|
| Street-four hands (%) | 27.29 | 27.08 | 25.10 | 25.10 |
| Showdowns (%) | 27.81 | 27.81 | 24.58 | 24.79 |
| All-in hands (%) | 9.58 | 9.69 | 9.58 | 9.58 |
| Sticks spent per constituent game | 4.86 | 4.87 | 5.07 | 5.07 |
| Loans, total | 5 | 6 | 6 | 6 |
| Eliminations, total | 0 | 0 | 1 | 1 |

Long Chow reduced showdown frequency by **3.23 percentage points**, with an individual 95% interval **[−6.35, −0.10]**. Street-four frequency fell **2.19 points [−5.42, +0.73]**, which is inconclusive. All-in frequency was unchanged in the point estimate, with a difference interval of **[−1.46, +1.46]** points. These intervals are not adjusted for examining multiple outcomes.

Long Chow gives Chow holdings a stronger attainable target, but it did not produce longer hands in this batch. Earlier folds are a tradeoff to watch. It changed the tournament champion set in **36 of 60 matched seeds**, demonstrating substantial effects on play rather than merely relabeling the same hands; that count is not a measure of fairness or improvement.

Example traces include a natural **4–8 Dots** winning uncontested, **4–7 Bams + Green Joker** winning at showdown, and natural **5–9 Bams** winning a final-hand showdown. All appear in the first two saved Long Chow sample traces.

**Recommendation:** keep Long Chow in this proposed position as a promising candidate. Its construction and local ordering look sensible; do not yet claim exact rarity convergence or improved late-street participation.

## Validation and reproducibility

191 unit tests passed; the expanded variant probe also passed after adding a secured-lead liability regression. Lint, unused-code checking and type checking passed. The isolated-engine probe checks 15 natural Long Chows, 75 matching-Joker substitutions, wrong-suit/color/duplicate/wrap rejection, Basic exclusions, neighbor ordering, actual bot fishing, Twin Lotus strength 14 above Kong 13, and four capped Lotus payout schedules.

All simulations passed score conservation. Every recorded game-1 hand diagnostic matched between the corresponding standard/scaled reward arms. Reconstructing all four variants from the same production source reproduced every recorded source hash, confirming that only declared rule patches differed.

The scaled-only batch was rerun after correcting its separate secured-lead liability expression. Superseded data are excluded: **300 executed tournaments, 240 analyzed**, with 59 of 60 repeated game records identical. Production rules and bot policy remain unchanged.

[Experiment design and reproduction commands](lotus-long-chow-2026-09-26/method.md), [full results and uncertainty](lotus-long-chow-2026-09-26/analysis.json), [source verification](lotus-long-chow-2026-09-26/source-verification.json), and JSONL data/manifests/sample traces in [the experiment directory](lotus-long-chow-2026-09-26/).
