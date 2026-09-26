# Ladder convergence experiments — 25 September 2026

Follow-up: the recommended Riichi ladder has now been applied to the app, scoring and bot hand-progress evaluation. Basic retains its existing order. The report below records the calibration experiment before that application; the subsequent stick trial is documented in `two-sticks-2026-09-25.md`.

**Recommendation: keep Basic unchanged; the three-swap Riichi candidate is the best-calibrated order tested.** Played games, rather than uniform opening deals, determined this recommendation. The candidate was selected before its held-out seeds were played. The production ladder remains unchanged; both tested orders are saved in [locked-candidates.json](ladder-convergence-2026-09-25/locked-candidates.json).

Later Dragon audit: scoring and immediate fishing/Blank tactics passed, but two bot-planning limitations remain. Treat the applied ladder as provisional; see [the audit](dragons-audit-2026-09-25.md).

## Recommended orders, weakest first

| Rank | Basic | Riichi candidate |
| --- | --- | --- |
| 1 | High Card | High Card |
| 2 | Eyes | Eyes |
| 3 | Chow | Chow |
| 4 | Two Eyes | Two Eyes |
| 5 | Chow + Eye | Chow + Eye |
| 6 | Three Winds | Pung |
| 7 | Pung | Three Winds |
| 8 | Three Dragons | Pung + Eye |
| 9 | Four Winds | Three Dragons |
| 10 | — | Three Dragons + Eye |
| 11 | — | Four Winds |
| 12 | — | Kong |

Riichi changes **Pung / Three Winds**, **Three Dragons / Pung + Eye**, and **Four Winds / Three Dragons + Eye**. The bottom five ranks and Kong remain in place. The Joker expansion now changes one shared relative ordering: Basic keeps Three Winds below Pung, whereas Riichi places Pung below Three Winds. This adds a rules-learning cost, but matches the different construction opportunities in played games.

## What was tested

Completed **1,160 runs, 1,520 constituent games, 18,467 hands** at **24 joint equity trials per projection**, up to four opponent completions per trial, using **10 CPU workers**. The search used 400 screening games over ten mode/order combinations, then 80 matched games per Riichi arm for the combined revision. Held-out validation used 160 Basic games and 160 games per Riichi arm. A final format check used 40 four-game reset tournaments per arm (Basic original, Riichi original, Riichi candidate).

Main games have four continuous orbits and 200 starting chips. Reset tournaments have one orbit per game, stacks 200/300/400/500, and antes 5/10/15/20. Candidate engines are isolated temporary copies. Meld ranking, discards, fishing targets, Charleston, equity projections and bets use the candidate ladder throughout play. The bot policy parameters are fixed. This is a search for a stable ladder under the current heuristic strategy, **not proof of equilibrium against optimal or human play**.

The experiment also verified identical production-versus-isolated baseline state, events and settlements for one seed in each mode. A concurrent engine edit only added three lines to the public-view projection (`charlestonReceivedCards`); removing those lines reproduces the original engine hash exactly. Simulation does not call that projection. Both arms in each comparison use matching engine sources, and the heuristic source hash is constant. See [source-change-note.json](ladder-convergence-2026-09-25/source-change-note.json).

## Calibration target

Showdown win rate alone is circular: making a hand higher-ranked already makes it beat more hands. I therefore measured **every combination retained at the end of a dealt player-hand**, including folded holdings and combinations hidden below the best score. Higher ranks should generally be less common to achieve in actual play. I separately checked observed showdown wins, acquisition since the original deal, the first three orbits, and basic gameplay metrics.

“End contains” counts overlapping combinations: a Pung + Eye can also contain an Eye and Pung. This is intentional. Best-category frequencies suppress weaker components and can mislead calibration. “Newly formed” means the retained combination type was absent from the original pre-Charleston deal. It does not count every temporary combination a player later abandoned. Showdown rows exclude Single/Twin Lotus holdings from ordinary categories; ties receive fractional win credit.

Basic illustrates why this matters: Two Eyes is often the best showdown category, but Chow remains more common when all contained combinations are counted. Swapping their ranks based solely on showdown popularity worsened the screen. Likewise, Three Winds is more common than Chow + Eye in opening deals but less common after strategic hand-building; its existing Basic position is justified by the latter.

## Iterative results

| Stage / mode | Games per arm | Original rarity mismatch | Selected rarity mismatch | Selected: first-three-orbit mismatch |
| --- | --- | --- | --- | --- |
| Screen Basic | 40 | 0.000 | Original retained | 0.000 |
| Riichi combined revision | 80 | 1.410 | 0.000 | 0.000 |
| Held-out Basic | 160 | 0.000 | Original retained | 0.000 |
| Held-out Riichi | 160 | 1.495 | 0.000 | 0.000 |

Rarity mismatch sums positive log frequency ratios where an adjacent higher rank is more common than the rank below it. **Zero means the observed frequency order matches the ladder**; it does not prove exact underlying probabilities. High Card is excluded because it is absence of a meld rather than a contained combination.

In held-out Riichi, the paired mismatch change is **-1.495**, with a run-bootstrap 95% interval **[-1.789, -1.192]**. Both the unmodified and combined orders were replayed from matched seed blocks; later card paths can diverge because strategies differ. The full per-candidate results and uncertainty are in [analysis.json](ladder-convergence-2026-09-25/analysis.json).

## Basic: held-out original

| Combination | Opening best n (%) | Opening → hand win | End contains n (%) | Newly formed | Showdown n | Showdown win |
| --- | --- | --- | --- | --- | --- | --- |
| High Card | 5442 (54.99%) | 16.1% | — | — | 289 | 4.2% |
| Eyes | 2953 (29.84%) | 29.7% | 6622 (66.91%) | 3055 | 627 | 11.6% |
| Chow | 757 (7.65%) | 40.9% | 2611 (26.38%) | 1759 | 394 | 16.0% |
| Two Eyes | 345 (3.49%) | 44.3% | 2474 (25.00%) | 2149 | 889 | 27.0% |
| Chow + Eye | 101 (1.02%) | 52.5% | 1381 (13.95%) | 1281 | 516 | 54.5% |
| Three Winds | 186 (1.88%) | 79.7% | 604 (6.10%) | 416 | 149 | 70.5% |
| Pung | 70 (0.71%) | 85.7% | 538 (5.44%) | 468 | 176 | 88.1% |
| Three Dragons | 41 (0.41%) | 96.3% | 179 (1.81%) | 138 | 43 | 97.7% |
| Four Winds | 2 (0.02%) | 100.0% | 36 (0.36%) | 34 | 8 | 100.0% |

Opening hand wins include uncontested wins and Lotus effects. They measure the potential of the original best ordinary category under actual play, not a controlled comparison of otherwise identical hands.

## Riichi: held-out candidate

| Combination | Opening best n (%) | Opening → hand win | End contains n (%) | Newly formed | Showdown n | Showdown win |
| --- | --- | --- | --- | --- | --- | --- |
| High Card | 5920 (57.84%) | 19.6% | — | — | 203 | 4.4% |
| Eyes | 2449 (23.93%) | 24.5% | 6194 (60.51%) | 3160 | 355 | 9.3% |
| Chow | 993 (9.70%) | 28.2% | 3089 (30.18%) | 2024 | 300 | 12.0% |
| Two Eyes | 247 (2.41%) | 39.7% | 2163 (21.13%) | 1899 | 505 | 13.1% |
| Chow + Eye | 109 (1.06%) | 37.6% | 1464 (14.30%) | 1355 | 449 | 35.4% |
| Pung | 175 (1.71%) | 59.4% | 1229 (12.01%) | 1022 | 158 | 46.8% |
| Three Winds | 218 (2.13%) | 75.9% | 752 (7.35%) | 526 | 203 | 53.7% |
| Pung + Eye | 20 (0.20%) | 60.0% | 591 (5.77%) | 571 | 214 | 73.8% |
| Three Dragons | 86 (0.84%) | 95.9% | 383 (3.74%) | 290 | 43 | 88.4% |
| Three Dragons + Eye | 9 (0.09%) | 100.0% | 130 (1.27%) | 121 | 44 | 93.2% |
| Four Winds | 8 (0.08%) | 100.0% | 84 (0.82%) | 76 | 28 | 96.4% |
| Kong | 2 (0.02%) | 100.0% | 42 (0.41%) | 40 | 12 | 100.0% |

Opening hand wins include uncontested wins and Lotus effects. They measure the potential of the original best ordinary category under actual play, not a controlled comparison of otherwise identical hands.

The opening-potential column is **not perfectly ordered** in Riichi: Chow + Eye wins 37.6% versus Two Eyes 39.7%; Pung + Eye wins 60.0% versus Three Winds 75.9%. The latter has only 20 opening Pung + Eye observations. Game-level bootstrap checks do not establish either inversion; the intervals are retained in [opening-potential-uncertainty.json](ladder-convergence-2026-09-25/opening-potential-uncertainty.json). This is an unresolved sampling limit, not evidence that every measure has converged. A starting combination can also develop into a different hand, so opening potential and final showdown strength are distinct targets.

## Showdown consistency and limits

**Basic:** No observed adjacent showdown win-rate inversion among categories with at least 20 observations each.


**Riichi candidate:** No observed adjacent showdown win-rate inversion among categories with at least 20 observations each.


A conditional showdown rate need not be perfectly monotonic: strong hands push weak opponents out, and different categories reach showdown against different ranges. Reordering to remove every tiny point inversion would tune to selection effects and noise. Bootstrap intervals resample whole games; rare all-win categories can give degenerate bootstrap intervals, so their small raw counts remain a limitation. Kong and the other rare top hands are not precisely calibrated simply because their observed win rate is high.

The first-deal championship data are retained separately. Examples from the held-out games:

| Mode / first ordinary hand | Players | Champion credit | Championship rate |
| --- | --- | --- | --- |
| Basic / High Card | 366 | 90 | 24.6% |
| Basic / Eyes | 179 | 44 | 24.6% |
| Basic / Chow | 51 | 14 | 27.5% |
| Basic / Pung | 5 | 2 | 40.0% |
| Basic / Three Winds | 9 | 5 | 55.6% |
| Riichi candidate / High Card | 362 | 96 | 26.5% |
| Riichi candidate / Eyes | 164 | 33 | 20.1% |
| Riichi candidate / Chow | 61 | 15.5 | 25.4% |
| Riichi candidate / Pung | 18 | 4 | 22.2% |
| Riichi candidate / Three Winds | 10 | 5 | 50.0% |

The premium initial categories have too few tournament starters to drive rank changes reliably. Tournament outcomes also depend heavily on later deals and final-hand strategy. The recommendation rests on repeated actual construction frequencies and hand outcomes, not a claim that one rare starting hand guarantees a tournament.

## Gameplay and format guardrails

| Held-out arm | All-in hands | Reached Street 4 | Showdowns |
| --- | --- | --- | --- |
| Basic original | 8.5% | 46.8% | 38.9% |
| Riichi original | 10.4% | 35.2% | 34.4% |
| Riichi candidate | 10.7% | 31.8% | 30.5% |

| Held-out arm | Eliminations / players | Loans / game | Sticks spent / table-game |
| --- | --- | --- | --- |
| Basic original | 41/640 | 0.00 | 0.00 |
| Riichi original | 1/640 | 0.18 | 12.32 |
| Riichi candidate | 2/640 | 0.19 | 12.09 |

All-in change, candidate minus original: **+0.3 points**, approximate paired 95% interval **-0.6 to +1.3**.

Street 4 change, candidate minus original: **-3.4 points**, approximate paired 95% interval **-5.8 to -1.0**.

| Reset format, 40 tournaments each | Rarity mismatch | All-in hands | Street 4 |
| --- | --- | --- | --- |
| Basic original | 0.000 | 6.1% | 43.3% |
| Riichi original | 1.466 | 9.7% | 28.7% |
| Riichi candidate | 0.197 | 9.4% | 27.8% |

**Tradeoff:** the held-out Riichi candidate reaches Street 4 less often. This is not an across-the-board gameplay improvement. Better rarity and showdown ordering is the reason to prefer this candidate; preserving the original hand-building rate would require a separate policy/rule experiment, not another unmotivated rank swap.

The reset check is a smaller sensitivity test, not a separate retuning set. The candidate’s Four Winds / Three Dragons + Eye count ratio is 33/27 = 1.22, with an approximate 95% interval of 0.75–2.03. That does not establish a reversal of the larger main-format result. Its Pung / Three Winds showdown point inversion also has a wide interval (higher minus lower: −35.1 to +11.7 points). Thus the common-rank recommendation is stable; the rare upper pair is still provisional across formats. Its one-orbit games give fresh sticks each game and different tournament incentives. Any remaining reset-format rarity inversions are listed below; compare their counts before treating them as a different ladder requirement.

- reset-basic-baseline: none observed.
- reset-riichi-selected: Four Winds 33 versus lower Three Dragons + Eye 27.

## Strategy evidence

In the first saved round-two seed, both arms dealt p1 the same seven cards. Under the original, p1 acquired three cards including Charleston and folded Two Eyes; under the candidate, p1 acquired seven and reached showdown. The first-hand pot changed from 110 uncontested chips to a 250-chip showdown. Across that game the draw/discard count was 87 versus 106. This is an example of the decision feedback being tested, not evidence that one ladder is superior from one game. [Original trace](ladder-convergence-2026-09-25/round2-riichi-baseline.jsonl.sample-0.json), [candidate trace](ladder-convergence-2026-09-25/round2-riichi-combined.jsonl.sample-0.json).

## Practical conclusion

The common-rank search supports retaining Basic and the three Riichi swaps for calibration, with the measured Street 4 cost treated as a real tradeoff. Treat convergence as **local empirical stability under these bots**, not an exhaustive search of all possible rankings or proof of optimal strategy. The candidate must remain fixed during validation; future player data or a material bot-policy change can justify reopening calibration. Avoid further tweaks merely to make noisy conditional win-rate percentages perfectly sorted.

Experiment code: `scripts/ladder-experiment.ts` runs isolated candidate games; `scripts/analyze-ladder-experiments.py` produces aggregates, paired deltas and bootstrap intervals. [Protocol](ladder-convergence-2026-09-25/method.md), [locked orders](ladder-convergence-2026-09-25/locked-candidates.json), and per-arm manifests retain sample counts, seeds and engine hashes. No production ranking change or deployment was made.

## Verification

All 1,160 experiment runs passed score conservation, loan-adjusted chip-flow, unique seed/index, and hand-win-credit checks. The 36 saved sample traces passed a separate rescore against their declared candidate orders, plus loan-cap and stick-accounting checks. Two baseline seeds also matched production state/events/settlements exactly. Lint, type checks, dead-code analysis, 143 unit tests and four integration tests passed. The experiment script formats correctly; the repository-wide formatting check flags concurrent edits in `src/client/App.tsx`, which this experiment did not modify.

Cohort simulation runtimes totaled **39.8 minutes**. Full budgets, timings and validation counts are in [experiment-summary.json](ladder-convergence-2026-09-25/experiment-summary.json).
