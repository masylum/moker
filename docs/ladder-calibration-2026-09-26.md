# Full ladder calibration — 26 September 2026

**Recommendation: keep Basic unchanged; use Advanced with Long Chow between Three Dragons and Three Dragons + Eyes. No further rank swap is supported by this calibration.**

All four main validation cohorts—Basic and current-rule Advanced, each in continuous and four-game reset formats—have **zero observed rarity inversions**. This also holds after removing Lotus holdings and after excluding the final hand of each constituent game. Of the 18 adjacent rarity relationships across both ladders, **15 are clearly separated in both formats** using approximate simultaneous 95% intervals within each mode/format. The remaining three are uncertainty bands, not demonstrated ranking errors:

- **Basic: Three Winds / Pung.** Continuous retained counts 330 / 322; reset counts 343 / 308.
- **Advanced: Three Dragons / Long Chow.** Continuous 236 / 180; resets 204 / 176. The difference is clear in the ordinary continuous 95% interval, but not after the stricter multi-comparison adjustment or in reset play.
- **Advanced: Three Dragons + Eyes / Four Winds.** Continuous 72 / 71; resets 99 / 53. The continuous format does not establish which is rarer.

Long Chow appeared in **2.93%** of continuous and **2.86%** of reset player-hands. It was absent from the opening in **174/180 (96.7%)** and **172/176 (97.7%)** of those cases respectively. Construction includes Charleston and fishing. Its ordinary showdown win credit was **44/53 (83.0%)** and **41/52 (78.8%)**. It is a practical development route, not merely a rare opening deal.

This is strong support for the proposed *played-rarity* ordering under these bots. It is not proof of a unique mathematically correct ladder or of optimal human-play balance. Opening potential and conditional showdown success remain separate, imperfectly ordered measures; their full counts are below. Long Chow is still an experimental rule in these snapshots, not an implemented production UI/rulebook change.

## Scope and reproducibility

Completed **1,168 simulation runs, 2,464 constituent games and 17,464 table hands**. Screening used 448 runs. The selected orders were locked before validation. The main tables below use 192 Basic and 192 current-rule Advanced primary validation runs, plus 48 short-format runs per mode. An additional 240 Advanced runs under the earlier three-stick-reset rule remain a separate robustness reference. All games use four heuristic players, **24 equity samples**, ten CPU workers, the current Lotus reward and existing all-in/Riichi fishing locks. Current Advanced starts with two sticks, carries unused sticks forward between games, and adds two each subsequent game. Basic has no Jokers; Advanced includes matching-colour Jokers and experimental Long Chow.

Continuous means four orbits in one 200-chip game. Reset means one orbit per game, with starting stacks 200/300/400/500 and antes 5/10/15/20. Formats are not pooled when choosing or assessing the ladder. The one-game sensitivity format is a single orbit, distinct from the four-orbit continuous format.

This calibration did not change production rules or bot policy. Sources were frozen before screening. A concurrent change to two sticks with carryover was discovered in the final source audit, so Advanced was validated again on a second frozen source snapshot and fresh seeds. Basic behaviour was unchanged and an exact production replay confirmed this. The main tables use the current stick economy; earlier Advanced data is not pooled into them. Long Chow remains experimental in the snapshots. See [protocol](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/protocol.md), [locked orders](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/locked-orders.json), [source hashes](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/source-hashes.json), [screen plan](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/screen-plan.json), [validation plan](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/validation-plan.json), [original analysis](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/analysis.json), [current-rule Advanced analysis](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/current-rules/analysis.json), and [source-change explanation](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/source-change-note.json).

## What “calibrated” means

The primary target is decreasing frequency of combinations constructed and retained in played hands. “Retained” includes folded and uncontested holdings and counts overlapping combinations: a Long Chow also contains Chow; Pung + Eyes contains Pung and Eyes. This avoids mistaking best-category classification or selective showdowns for construction difficulty. High Card is absence of a meld and is excluded from the rarity objective. Counts refer to player-hands, not four-player table hands.

Opening-best frequency and subsequent hand-win credit describe initial potential. “Newly built” means the retained combination was absent from that player’s pre-Charleston opening. Showdown win credit is conditional on reaching showdown with that best ordinary category, excludes Lotus holdings, and splits one hand-win credit among winning players. It is not head-to-head intrinsic equity and is not forced into a monotonic sequence.

## Search results

All six Basic and ten Advanced permitted adjacent swaps above Eyes were played using the same first 16 seeds as their baseline. Every swap had a larger rarity mismatch than its matched baseline. Advanced screening used the original three-stick-reset economy; the selected order was then independently confirmed under the current two-stick carryover economy. Both starting orders had zero mismatch in both 48-run baseline formats and in the no-Lotus and nonterminal checks. The predeclared minimum-change rule therefore selected Basic unchanged and Advanced with Long Chow between Three Dragons and Three Dragons + Eyes. No extra tuning round was warranted before validation. This establishes a local result, not an exhaustive search of all permutations.

| Mode | Neighbour swap | Baseline mismatch | Candidate mismatch |
|---|---|---:|---:|
| Basic | Chow / Two Eyes | 0.000 | 0.341 |
| Basic | Two Eyes / Chow + Eyes | 0.000 | 0.897 |
| Basic | Chow + Eyes / Three Winds | 0.000 | 0.896 |
| Basic | Three Winds / Pung | 0.000 | 0.244 |
| Basic | Pung / Three Dragons | 0.000 | 0.734 |
| Basic | Three Dragons / Four Winds | 0.000 | 1.169 |
| Advanced | Chow / Two Eyes | 0.000 | 0.595 |
| Advanced | Two Eyes / Chow + Eyes | 0.000 | 0.839 |
| Advanced | Chow + Eyes / Pung | 0.000 | 0.560 |
| Advanced | Pung / Three Winds | 0.000 | 1.032 |
| Advanced | Three Winds / Pung + Eyes | 0.000 | 0.121 |
| Advanced | Pung + Eyes / Three Dragons | 0.000 | 0.809 |
| Advanced | Three Dragons / Long Chow | 0.000 | 0.317 |
| Advanced | Long Chow / Three Dragons + Eyes | 0.000 | 1.067 |
| Advanced | Three Dragons + Eyes / Four Winds | 0.000 | 1.266 |
| Advanced | Four Winds / Kong | 0.000 | 1.466 |

Mismatch sums positive log ratios of adjacent higher/lower retained counts, with a 0.5 count correction. Zero is the minimum, not a certainty statement.

## Basic: independent validation

Each format has 96 new runs. Continuous: 5,961 dealt player-hands; four-game reset: 6,133. Rows follow the selected order, weakest first.

| Combination | Retained: continuous | Retained: resets | Newly built: continuous / resets | Showdown wins: continuous | Showdown wins: resets |
|---|---:|---:|---:|---:|---:|
| High Card | — | — | — | 9/174 (5.2%) | 6/139 (4.3%) |
| Eyes | 3,968 (66.57%) | 3,930 (64.08%) | 1860 / 1717 | 38/392 (9.7%) | 27/389 (6.9%) |
| Chow | 1,563 (26.22%) | 1,566 (25.53%) | 1030 / 1025 | 28/190 (14.7%) | 42/256 (16.4%) |
| Two Eyes | 1,400 (23.49%) | 1,375 (22.42%) | 1160 / 1168 | 126/473 (26.6%) | 139/489 (28.4%) |
| Chow + Eyes | 852 (14.29%) | 801 (13.06%) | 786 / 723 | 186/319 (58.3%) | 201/313 (64.2%) |
| Three Winds | 330 (5.54%) | 343 (5.59%) | 211 / 241 | 45/64 (70.3%) | 50/73 (68.5%) |
| Pung | 322 (5.40%) | 308 (5.02%) | 265 / 262 | 85/99 (85.9%) | 70/82 (85.4%) |
| Three Dragons | 123 (2.06%) | 122 (1.99%) | 90 / 104 | 31/34 (91.2%) | 24/25 (96.0%) |
| Four Winds | 26 (0.44%) | 17 (0.28%) | 22 / 16 | 9/9 (100.0%) | 1/1 (100.0%) |

| Initial best combination | Continuous openings | Subsequent hand-win credit | Reset openings | Subsequent hand-win credit |
|---|---:|---:|---:|---:|
| High Card | 3301 (55.4%) | 16.2% | 3405 (55.5%) | 15.8% |
| Eyes | 1684 (28.3%) | 29.1% | 1805 (29.4%) | 27.7% |
| Chow | 462 (7.8%) | 35.1% | 467 (7.6%) | 42.8% |
| Two Eyes | 240 (4.0%) | 46.0% | 211 (3.4%) | 46.0% |
| Chow + Eyes | 65 (1.1%) | 51.5% | 79 (1.3%) | 62.0% |
| Three Winds | 115 (1.9%) | 89.1% | 101 (1.6%) | 90.6% |
| Pung | 57 (1.0%) | 79.8% | 46 (0.8%) | 93.5% |
| Three Dragons | 33 (0.6%) | 95.5% | 18 (0.3%) | 94.4% |
| Four Winds | 4 (0.1%) | 100.0% | 1 (0.0%) | 100.0% |

### Adjacent rarity uncertainty

Ratio = frequency of the higher category divided by its neighbour below. Below 1 supports the selected ordering. Intervals use 4,000 whole-run bootstrap resamples; the table shows pointwise 95% intervals. Approximate simultaneous intervals across all adjacent pairs within each mode/format are retained in `analysis.json` and used to distinguish strong support from unresolved pairs. Rare/all-win outcomes retain their small-sample limitations.

| Higher / lower | Continuous ratio [95% interval] | Reset ratio [95% interval] |
|---|---:|---:|
| Chow / Eyes | 0.39 [0.38, 0.41] | 0.40 [0.38, 0.42] |
| Two Eyes / Chow | 0.90 [0.84, 0.96] | 0.88 [0.82, 0.94] |
| Chow + Eyes / Two Eyes | 0.61 [0.56, 0.66] | 0.58 [0.54, 0.63] |
| Three Winds / Chow + Eyes | 0.39 [0.34, 0.44] | 0.43 [0.38, 0.48] |
| Pung / Three Winds | 0.98 [0.83, 1.15] | 0.90 [0.76, 1.05] |
| Three Dragons / Pung | 0.38 [0.31, 0.47] | 0.40 [0.33, 0.47] |
| Four Winds / Three Dragons | 0.21 [0.14, 0.31] | 0.14 [0.08, 0.23] |

## Advanced: independent validation

Each format has 96 new runs. Continuous: 6,144 dealt player-hands; four-game reset: 6,144. Rows follow the selected order, weakest first.

| Combination | Retained: continuous | Retained: resets | Newly built: continuous / resets | Showdown wins: continuous | Showdown wins: resets |
|---|---:|---:|---:|---:|---:|
| High Card | — | — | — | 4/105 (3.8%) | 1/62 (1.6%) |
| Eyes | 3,664 (59.64%) | 3,591 (58.45%) | 1823 / 1756 | 14/188 (7.4%) | 10/133 (7.5%) |
| Chow | 1,785 (29.05%) | 1,843 (30.00%) | 1206 / 1207 | 14/140 (10.0%) | 19/125 (15.2%) |
| Two Eyes | 1,246 (20.28%) | 1,125 (18.31%) | 1087 / 952 | 34/307 (11.1%) | 39/215 (18.1%) |
| Chow + Eyes | 846 (13.77%) | 830 (13.51%) | 782 / 771 | 84/239 (35.1%) | 71/190 (37.4%) |
| Pung | 694 (11.30%) | 667 (10.86%) | 584 / 533 | 42/105 (40.0%) | 32/75 (42.7%) |
| Three Winds | 456 (7.42%) | 404 (6.58%) | 325 / 290 | 62/134 (46.3%) | 44/111 (39.6%) |
| Pung + Eyes | 321 (5.22%) | 294 (4.79%) | 313 / 282 | 86/133 (64.7%) | 75/114 (65.8%) |
| Three Dragons | 236 (3.84%) | 204 (3.32%) | 176 / 159 | 31/37 (83.8%) | 14/15 (93.3%) |
| Long Chow | 180 (2.93%) | 176 (2.86%) | 174 / 172 | 44/53 (83.0%) | 41/52 (78.8%) |
| Three Dragons + Eyes | 72 (1.17%) | 99 (1.61%) | 64 / 94 | 19/22 (86.4%) | 31/36 (86.1%) |
| Four Winds | 71 (1.16%) | 53 (0.86%) | 63 / 48 | 23/23 (100.0%) | 11/13 (84.6%) |
| Kong | 11 (0.18%) | 22 (0.36%) | 9 / 21 | 4/4 (100.0%) | 9/10 (90.0%) |

| Initial best combination | Continuous openings | Subsequent hand-win credit | Reset openings | Subsequent hand-win credit |
|---|---:|---:|---:|---:|
| High Card | 3591 (58.4%) | 19.8% | 3563 (58.0%) | 18.5% |
| Eyes | 1506 (24.5%) | 22.0% | 1467 (23.9%) | 24.6% |
| Chow | 519 (8.4%) | 33.2% | 588 (9.6%) | 34.1% |
| Two Eyes | 155 (2.5%) | 36.1% | 169 (2.8%) | 36.7% |
| Chow + Eyes | 65 (1.1%) | 46.2% | 62 (1.0%) | 44.4% |
| Pung | 100 (1.6%) | 68.0% | 118 (1.9%) | 67.8% |
| Three Winds | 123 (2.0%) | 74.0% | 109 (1.8%) | 77.5% |
| Pung + Eyes | 9 (0.1%) | 77.8% | 12 (0.2%) | 75.0% |
| Three Dragons | 52 (0.8%) | 90.4% | 40 (0.7%) | 95.0% |
| Long Chow | 6 (0.1%) | 83.3% | 4 (0.1%) | 100.0% |
| Three Dragons + Eyes | 8 (0.1%) | 87.5% | 5 (0.1%) | 80.0% |
| Four Winds | 8 (0.1%) | 100.0% | 5 (0.1%) | 100.0% |
| Kong | 2 (0.0%) | 100.0% | 2 (0.0%) | 100.0% |

### Adjacent rarity uncertainty

Ratio = frequency of the higher category divided by its neighbour below. Below 1 supports the selected ordering. Intervals use 4,000 whole-run bootstrap resamples; the table shows pointwise 95% intervals. Approximate simultaneous intervals across all adjacent pairs within each mode/format are retained in `analysis.json` and used to distinguish strong support from unresolved pairs. Rare/all-win outcomes retain their small-sample limitations.

| Higher / lower | Continuous ratio [95% interval] | Reset ratio [95% interval] |
|---|---:|---:|
| Chow / Eyes | 0.49 [0.47, 0.51] | 0.51 [0.49, 0.54] |
| Two Eyes / Chow | 0.70 [0.66, 0.74] | 0.61 [0.57, 0.65] |
| Chow + Eyes / Two Eyes | 0.68 [0.63, 0.74] | 0.74 [0.68, 0.81] |
| Pung / Chow + Eyes | 0.82 [0.75, 0.90] | 0.80 [0.73, 0.89] |
| Three Winds / Pung | 0.66 [0.59, 0.74] | 0.61 [0.53, 0.69] |
| Pung + Eyes / Three Winds | 0.70 [0.61, 0.81] | 0.73 [0.62, 0.85] |
| Three Dragons / Pung + Eyes | 0.74 [0.62, 0.87] | 0.69 [0.58, 0.83] |
| Long Chow / Three Dragons | 0.76 [0.63, 0.93] | 0.86 [0.71, 1.03] |
| Three Dragons + Eyes / Long Chow | 0.40 [0.31, 0.51] | 0.56 [0.45, 0.71] |
| Four Winds / Three Dragons + Eyes | 0.99 [0.71, 1.38] | 0.54 [0.38, 0.74] |
| Kong / Four Winds | 0.16 [0.07, 0.28] | 0.42 [0.26, 0.64] |

## Formats and gameplay

| Mode / format | Runs | Rarity mismatch | All-in hands | Street four | Showdowns | Loans / game | Sticks spent / game |
|---|---:|---:|---:|---:|---:|---:|---:|
| Basic / four continuous orbits | 96 | 0.000 | 8.2% | 44.7% | 36.8% | 0.000 | 0.00 |
| Basic / 1 reset game(s) | 16 | 0.000 | 25.0% | 31.2% | 42.2% | 0.000 | 0.00 |
| Basic / 2 reset game(s) | 16 | 0.070 | 12.5% | 46.1% | 41.4% | 0.000 | 0.00 |
| Basic / 3 reset game(s) | 16 | 0.000 | 9.9% | 48.4% | 38.5% | 0.000 | 0.00 |
| Basic / 4 reset game(s) | 96 | 0.000 | 6.4% | 43.6% | 36.5% | 0.000 | 0.00 |
| Advanced / four continuous orbits | 96 | 0.000 | 11.0% | 33.5% | 31.3% | 0.219 | 10.55 |
| Advanced / 1 reset game(s) | 16 | 0.000 | 25.0% | 26.6% | 37.5% | 0.000 | 4.25 |
| Advanced / 2 reset game(s) | 16 | 0.000 | 15.6% | 22.7% | 30.5% | 0.031 | 4.78 |
| Advanced / 3 reset game(s) | 16 | 0.000 | 9.9% | 28.1% | 26.6% | 0.021 | 4.85 |
| Advanced / 4 reset game(s) | 96 | 0.000 | 9.8% | 27.0% | 26.4% | 0.018 | 4.99 |

The 16-run short-format checks are sensitivity samples, not separately tuned ladders. Their rare-category counts can reverse by chance; interpret those inversions with their counts and intervals. Primary validation remains separate from exploratory screens.

## Interpretation, limitations and verification

### Potential and showdown cross-checks

The initial-hand and showdown tables were inspected rather than optimized until their point estimates looked sorted. Two relevant examples:

- Basic continuous Three Winds openings won 89.1% (102.5 credits / 115), versus Pung 79.8% (45.5 / 57). The Pung-minus-Winds difference is −9.3 percentage points, with a whole-run bootstrap 95% interval **[−22.8, +3.4]**. This does not establish a reversed potential order.
- Advanced reset Three Dragons won 14/15 showdowns (93.3%), versus Long Chow 41/52 (78.8%). The Long-minus-Dragons difference is −14.5 points, interval **[−29.5, +2.0]**. The corresponding continuous difference is −0.8 points, interval **[−16.3, +15.7]**. These are conditional samples against different opponents, not an intrinsic equity comparison. The observed drops are insufficient grounds for another swap.

Premium opening categories have very few observations: only six continuous and four reset Long Chow openings. A 100% result on four openings or four Kong showdowns is not certainty. Full diagnostic intervals are in [potential-showdown-checks.json](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/potential-showdown-checks.json).

### Short formats and terminal behaviour

All current-rule Advanced one-, two- and three-game checks also have zero observed rarity inversions. Basic has one tiny reversal in its two-game check: **27 Three Winds versus 29 Pungs**, the same unresolved pair as in the larger validation. No order was tuned to those 16-run checks.

One-orbit single-game tournaments have 25% all-in hands in both small samples. All 16 Basic all-ins were on final hands; Advanced had 15 final-hand and one earlier all-in. Excluding each final hand gives **0/48 Basic** and **1/48 Advanced** all-ins. This is a tournament-horizon effect in the observed samples, not evidence that a quarter of ordinary early hands are being shoved. All-in totals also include forced ante all-ins.

### Resources under the current stick rule

Advanced continuous games spent **10.55 sticks per table-game**, declared Riichi **3.91 times**, took **0.219 loans**, and finished with **4.64 sticks** on average. Four-game reset tournaments spent **4.99 sticks per constituent game**, declared Riichi **0.77 times per game**, and took **0.018 loans per game**. The mean remaining stock at constituent-game ends was **11.90 sticks per table**, reflecting carryover and fresh top-ups. Two starting sticks does not imply leftover stocks stay small when sticks accumulate between games. These are observations, not matched causal estimates of the stick change.

### Strategy and implementation audit

Fourteen complete saved traces were reviewed through hand-by-hand summaries and selected betting/fishing evaluations. [The sample review](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/sample-review.md) records specific examples rather than labeling every action optimal. An independent face-count oracle matched **1,792 opening/final holdings**, **361 active ordinary score/tie-break results**, and **70 showdown pots**. Seven-card counts and physical-card uniqueness also passed. The existing Long Chow probe checks natural runs, matching Joker substitutions, exclusions from Basic, relative ranks, paid fishing and Twin Lotus priority; the Dragon probe covers all 286 relevant physical triples and normal-bot tactics.

A concrete strategic limitation remains: a bot correctly built Long Chow with a two-step lane fish, then folded because its opponent model assigned only 9.3% equity against a bettor showing three Winds. The opponent actually held only Three Winds. This demonstrates pessimistic estimation and why conditional showdown tables cannot alone calibrate rarity; it does not prove the fold irrational from the bot’s information. Earlier secondary-route retention and final-hand continuation limitations were not changed during this study. The recommendations are conditional on this fixed heuristic policy. Human play or a material bot-policy change warrants a further check.

### Verification and reproduction

All 1,168 analyzed runs passed seed/index, deal-count, hand-win-credit and score-conservation checks. Selection and validation seeds are disjoint. Sources stayed frozen within each study, and the current-rule snapshot matches the live game source at completion. Basic’s full state, events and decisions matched a production replay after the concurrent rule change. All **576 current-rule constituent-game stick ledgers** passed the carryover/top-up and spending checks.

Type checking, lint and unused-code analysis passed. **200 tests in 20 files passed** with two test workers and a 30-second timeout. An earlier test run alongside ten simulation workers hit two five-second timeouts; the bounded-concurrency rerun had no failures. No assertion failures were observed. See [verification.json](/Users/pao/repos/moker/docs/ladder-calibration-2026-09-26/verification.json).

Summed simulation batch wall time was **42.0 minutes using ten CPU workers**, including the additional current-rule confirmation.

Run the saved plans with `python3 docs/ladder-calibration-2026-09-26/run-batches.py docs/ladder-calibration-2026-09-26/screen-plan.json` and the corresponding validation plan. The nested `current-rules/run-batches.py` runs its own validation plan. Complete existing outputs are retained. Recompute results with `scripts/analyze-calibration.py DIRECTORY --uncertainty`; independently check saved traces with `scripts/audit-calibration.py DIRECTORY`. Original and current-rule data must remain separate when reporting the Advanced ladder.
