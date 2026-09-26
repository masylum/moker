# Moker health check — 25 September 2026

**Completed: 2,000 four-orbit basic tournaments and 2,000 standard riichi games, plus 1,800 sensitivity/control runs (5,800 total runs).** Four identical bots using the default policy per table, deterministic seeds, rules v5 captured at the start of the run. This is a bot-play balance study, not a prediction of human or optimal play.

## Assessment

**Accounting passed; the balance verdict is sensitive to bot settings.** The large, four-sample batch suppresses voluntary all-ins by construction. Higher-sample bots create much more elimination and borrowing pressure. Treat the default-setting results below as the more relevant stress check, with wider uncertainty from the smaller sample. Fix or calibrate the bot limitations before using simulation alone to approve the chip economy or nerf special cards.

| Equity samples | Runs per mode | Basic elimination / player-orbit | Basic all-in hands | Riichi loans / game | Riichi negative final scores |
| --- | --- | --- | --- | --- | --- |
| 4 | 2,000 | 4.5% | 9.7% | 0.25 | 4.8% |
| 12 | 200 | 25.2% | 38.3% | 1.60 | 25.9% |
| 24 | 100 | 28.3% | 43.1% | 2.14 | 32.8% |

| Samples | Basic hands reaching Street 4 | Riichi hands reaching Street 4 | Riichi all-in hands |
| --- | --- | --- | --- |
| 4 | 80.8% | 76.9% | 15.1% |
| 12 | 32.2% | 21.0% | 56.9% |
| 24 | 25.3% | 9.8% | 71.8% |

The 24-sample setting is the captured app default. Changing sample count also changes confidence shrinkage and which aggressive actions the bot considers; this is more than simply reducing measurement noise. Matched-seed comparisons below confirm the effect.

## Scope and reliability

Basic tournaments use four separate dealer orbits, with fresh 200/300/400/500-chip stacks and 5/10/15/20 antes. Eliminated players return in the next orbit; final scores sum all four game scores. Standard riichi games use one four-seat dealer orbit, 200 starting chips, three sticks each, and automatic 200-chip loans when needed to ante, penalized by 250 at settlement.

The main batch uses four Monte Carlo equity samples per decision. A separate 200-seed matched check in each mode uses 12 samples. A 500-seed matched first-orbit experiment in each mode changes starting chips from 200 to 400 at four samples. After discovering the sample-budget sensitivity, another 100 seeds per mode were run at the app default of 24 samples, with matching 400-chip controls. Basic stack controls end after the first orbit. The same seeds couple experiments, but decisions and later deals may diverge. No game rules or bot policies were modified for this study. The workspace gained an optional continuous-orbits setting during execution; a separately recovered, hash-verified initial source snapshot pins every batch to the same rules. Three riichi seed records reproduced byte-for-byte against that snapshot. These basic results describe four reset games, not four continuous orbits with one bankroll.

The following large-batch tables use four samples unless explicitly labeled otherwise.

| Measurement | Basic tournaments | Riichi games |
| --- | --- | --- |
| Runs | 2,000 | 2,000 |
| Played hands | 31,861 | 8,000 |
| Showdown hands | 87.0% | 89.9% |
| Hands involving an all-in | 9.7% | 15.1% |
| Reach Street 4 | 80.8% | 76.9% |
| Mean / 90th-percentile pot | 277.9 / 626.0 | 185.5 / 380.0 |
| Accounting violations | 0 | 0 |

Across all 5,800 runs, 50,162 hands and 1,765,316 automated steps completed. Chip conservation and finite/nonnegative stacks were checked after every automated step. Final payouts, stick supply, orbit completion, aggregate scores, and the 50-chip net score cost per loan were checked separately. At startup, all 70 existing tests passed. Project TypeScript checking at that time encountered a pre-existing `scripts/analyze-ladder.ts:22` error; the new runner passed its focused type/lint checks. Zero observed violations is evidence for these checks, not a proof that all rules are bug-free.

## Basic eliminations and chip adequacy

There were **1,430 elimination events across 32,000 player-orbits**: 4.5% (95% CI 4.2%–4.7%). Because players re-enter each orbit, these represent **1,346 distinct player/tournament entries** out of 8,000, and **1,051 tournaments (52.5%)** had at least one elimination.

The **default 24-sample check** produced 453 elimination events across 1,600 player-orbits: **28.3% (95% CI 26.4%–30.3%)**. 302 of 400 player/tournament entries were eliminated at least once; 100 of 100 tournaments contained an elimination.

| Orbit | Starting stack / ante | Eliminated before orbit ends | End below another ante | Orbits ending before 4 hands |
| --- | --- | --- | --- | --- |
| 1 | 200 / 5 | 180 (2.2%) | 367 (4.6%) | 0.4% |
| 2 | 300 / 10 | 307 (3.8%) | 656 (8.2%) | 1.8% |
| 3 | 400 / 15 | 455 (5.7%) | 772 (9.7%) | 1.5% |
| 4 | 500 / 20 | 488 (6.1%) | 806 (10.1%) | 3.2% |

“Eliminated” means the engine actually refused a later ante. “End below another ante” includes those players and players depleted by the final hand; the two columns must not be added. A player can finish the last hand with zero chips without ever being marked eliminated. Four planned hands can also become fewer as eliminated dealer seats are skipped.

The starting-stack/ante ratio falls from 40 in Orbit 1 to 30, 26.7, then 25. Later games become tighter in ante-to-stack terms. At the default setting, however, elimination rates are roughly flat across the four orbits: all-in behavior dominates that escalation. Four full antes alone cost only 20/40/60/80 chips per player; betting losses drive the observed depletion.

### Matched 200 → 400 starting-chip experiment

| Mode and matched seeds | Metric | 200 chips | 400 chips | Change | 95% paired CI |
| --- | --- | --- | --- | --- | --- |
| basic, 4 samples (n=500) | Players eliminated in first orbit | 2.9% | 2.1% | -0.70 pp | [-1.55, +0.15] pp |
| basic, 4 samples (n=500) | Players ending below the ante | 4.8% | 3.7% | -1.10 pp | [-2.21, +0.01] pp |
| riichi, 4 samples (n=500) | Loans per game | 0.26 | 0.25 | -0.01 | [-0.06, +0.04] |
| riichi, 4 samples (n=500) | Players with negative scores | 4.9% | 4.9% | +0.05 pp | [-1.06, +1.16] pp |
| riichi, 4 samples (n=500) | Hands involving an all-in | 15.4% | 16.7% | +1.30 pp | [-0.61, +3.21] pp |
| basic, 24 samples (n=100) | Players eliminated in first orbit | 28.7% | 28.5% | -0.25 pp | [-2.61, +2.11] pp |
| basic, 24 samples (n=100) | Players ending below the ante | 31.5% | 31.5% | +0.00 pp | [-2.61, +2.61] pp |
| riichi, 24 samples (n=100) | Loans per game | 2.14 | 2.13 | -0.01 | [-0.19, +0.17] |
| riichi, 24 samples (n=100) | Players with negative scores | 32.8% | 27.3% | -5.50 pp | [-8.88, -2.12] pp |
| riichi, 24 samples (n=100) | Hands involving an all-in | 71.8% | 71.5% | -0.25 pp | [-3.83, +3.33] pp |

These controls isolate the first orbit at ante 5. They do not validate doubling all four tournament stacks. “Enough chips” depends on whether occasional elimination/borrowing is intended; the table quantifies that tradeoff rather than treating zero busts as an automatic design goal.

## Result spread and comeback

| Distribution | Basic: 4 samples | Basic: default 24 | Riichi: 4 samples | Riichi: default 24 |
| --- | --- | --- | --- | --- |
| Player score: mean | 1,400.0 | 1,400.0 | 196.9 | 173.2 |
| Player score: 10th percentile | 764.0 | 434.5 | 14.0 | -250.0 |
| Player score: median | 1,362.0 | 1,346.0 | 175.0 | 155.0 |
| Player score: 90th percentile | 2,086.0 | 2,539.2 | 452.0 | 610.0 |
| Player score: minimum | 10.0 | 0.0 | -402.0 | -745.0 |
| Player score: maximum | 4,263.0 | 3,797.0 | 965.0 | 1,380.0 |
| Winner-to-last gap: median | 1,189.0 | 1,881.5 | 401.5 | 817.5 |
| Winner-to-last gap: 90th percentile | 1,967.2 | 2,907.8 | 661.2 | 1,279.7 |
| Winner-to-runner-up gap: median | 405.0 | 717.5 | 174.0 | 307.5 |

The scales differ: a basic player receives 1,400 total chips across four resets, versus 200 in a standard riichi game. Do not compare the raw gaps as if both formats had the same bankroll or length.

| Basic checkpoint | Checkpoint leader eventually wins | Checkpoint last-place player eventually wins |
| --- | --- | --- |
| After orbit 1 | 33.9% | 18.8% |
| After orbit 2 | 45.5% | 11.8% |
| After orbit 3 | 60.3% | 6.2% |

Checkpoint scores are cumulative. Tied leaders/trailers qualify if any tied player wins; these are descriptive conversion rates, not causal effects of leading.

| Seat | Basic winner credit | Riichi winner credit |
| --- | --- | --- |
| p1 | 25.7% | 24.8% |
| p2 | 24.6% | 25.7% |
| p3 | 24.7% | 23.3% |
| p4 | 24.9% | 26.2% |

Tied final wins split seat credit. Dealer position is randomized. These shares are a bias diagnostic, not a proof of seat fairness.

## Showdown hand popularity and win rates

Each row counts a nonfolded showdown participant, including losses. “Win rate” includes tied wins; “Share of showdown wins” splits a tied pot into fractional win credit. These conditional rates reflect which hands bots take to showdown, not the strength of random dealt hands. Lotus status overrides the normal hand label.

### Basic: 4-sample large batch

| Hand | Appearances | Share of contenders | Win rate when shown | Share of showdown wins |
| --- | --- | --- | --- | --- |
| Two Eyes | 19,639 | 24.8% | 32.4% | 22.9% |
| Eyes | 18,331 | 23.1% | 6.9% | 4.3% |
| Chow + Eye | 11,959 | 15.1% | 58.1% | 25.0% |
| Chow | 11,642 | 14.7% | 24.5% | 10.0% |
| High Card | 5,870 | 7.4% | 1.7% | 0.1% |
| Three Winds | 5,013 | 6.3% | 85.9% | 14.9% |
| Pung | 4,598 | 5.8% | 91.4% | 15.1% |
| Three Dragons | 1,744 | 2.2% | 98.9% | 6.2% |
| Four Winds | 407 | 0.5% | 100.0% | 1.5% |

### Riichi: 4-sample large batch

| Hand | Appearances | Share of contenders | Win rate when shown | Share of showdown wins |
| --- | --- | --- | --- | --- |
| Two Eyes | 3,374 | 17.2% | 24.0% | 11.3% |
| Eyes | 3,314 | 16.9% | 3.9% | 1.7% |
| Chow | 3,107 | 15.8% | 17.7% | 7.2% |
| Chow + Eye | 2,895 | 14.7% | 42.5% | 17.0% |
| Pung | 1,541 | 7.8% | 71.1% | 15.1% |
| Three Winds | 1,362 | 6.9% | 65.9% | 12.0% |
| Pung + Eye | 1,207 | 6.1% | 83.8% | 14.1% |
| High Card | 1,082 | 5.5% | 0.2% | 0.0% |
| Three Dragons | 546 | 2.8% | 82.6% | 6.2% |
| Twin Lotus | 396 | 2.0% | 100.0% | 5.5% |
| Three Dragons + Eye | 388 | 2.0% | 94.6% | 5.1% |
| Four Winds | 306 | 1.6% | 90.5% | 3.9% |
| Single Lotus | 67 | 0.3% | 0.0% | 0.0% |
| Kong | 66 | 0.3% | 93.9% | 0.9% |

### Basic: default 24-sample check

| Hand | Appearances | Share of contenders | Win rate when shown | Share of showdown wins |
| --- | --- | --- | --- | --- |
| Eyes | 713 | 30.3% | 10.0% | 7.2% |
| Two Eyes | 569 | 24.2% | 41.5% | 26.3% |
| Chow | 443 | 18.9% | 34.5% | 16.4% |
| Chow + Eye | 267 | 11.4% | 65.2% | 19.4% |
| Three Winds | 167 | 7.1% | 86.2% | 15.6% |
| Pung | 95 | 4.0% | 93.7% | 9.9% |
| High Card | 50 | 2.1% | 0.0% | 0.0% |
| Three Dragons | 38 | 1.6% | 100.0% | 4.3% |
| Four Winds | 8 | 0.3% | 100.0% | 0.9% |

### Riichi: default 24-sample check

| Hand | Appearances | Share of contenders | Win rate when shown | Share of showdown wins |
| --- | --- | --- | --- | --- |
| Eyes | 190 | 21.8% | 6.3% | 3.8% |
| Chow | 179 | 20.5% | 22.9% | 11.8% |
| Two Eyes | 132 | 15.1% | 31.1% | 13.1% |
| Chow + Eye | 100 | 11.5% | 48.0% | 15.0% |
| Three Winds | 59 | 6.8% | 67.8% | 11.8% |
| Pung | 56 | 6.4% | 76.8% | 13.7% |
| High Card | 43 | 4.9% | 14.0% | 1.0% |
| Pung + Eye | 37 | 4.2% | 83.8% | 9.9% |
| Three Dragons | 23 | 2.6% | 82.6% | 6.1% |
| Twin Lotus | 20 | 2.3% | 100.0% | 6.4% |
| Three Dragons + Eye | 11 | 1.3% | 100.0% | 3.5% |
| Four Winds | 10 | 1.1% | 90.0% | 2.9% |
| Single Lotus | 9 | 1.0% | 0.0% | 0.0% |
| Kong | 4 | 0.5% | 75.0% | 1.0% |

## Joker power

| Jokers held at showdown | Appearances | Win rate | Mean rank drop on removal | Joker selected in best hand | Wins lost if all own jokers removed |
| --- | --- | --- | --- | --- | --- |
| 0 | 13,856 | 30.5% | 0.0 | 0 | 0 |
| 1 | 5,318 | 52.1% | 3.0 | 3,899 | 1,817 |
| 2 | 462 | 57.6% | 4.2 | 410 | 221 |
| 3 | 15 | 73.3% | 6.5 | 14 | 10 |

Observed showdown win rate **with any joker: 52.6% (95% CI 51.5%–53.7%); without: 30.5% (95% CI 30.0%–31.0%).** Confidence intervals cluster observations by game.

| Joker color held | Showdown appearances | Win rate | Used in selected best hand |
| --- | --- | --- | --- |
| green | 1,660 | 52.3% | 73.4% |
| blue | 1,651 | 52.8% | 73.7% |
| red | 1,635 | 52.2% | 74.6% |
| black | 1,341 | 55.5% | 58.6% |

At the default 24-sample setting, showdown win rates were **50.7% (95% CI 45.8%–55.6%) with a joker** and **30.6% (95% CI 27.7%–33.4%) without**. Both settings show the selected showdown populations, not a randomized joker intervention.

Color groups overlap when a hand holds multiple jokers. Rank drop compares the original rank against a rescore with all of that player’s jokers removed, keeping other cards and opponents fixed. A “win lost” means the player ceases to be among the winners; weakening a sole win into a tie is not counted. This is a local scoring diagnostic, not a replay without jokers: it removes cards without replacing them and cannot capture earlier betting, fishing, or selection effects. Lotus rules are preserved.

## Lotus use, Blanks, and fishing

| Riichi measurement | Count |
| --- | --- |
| Player-hands initially dealt at least one Lotus | 3,909 |
| Lotus cards passed in Charleston | 17 |
| Lotus draw transactions | 1,469 |
| Lotus discard transactions | 3,730 |
| Lotuses claimed with Blank exchanges | 221 |
| Player-hands ending with one Lotus | 1,179 |
| Of those, folded | 1,112 |
| Single-Lotus showdown appearances | 67 |
| Single-Lotus showdown wins | 0 |
| Twin-Lotus showdown appearances | 396 |
| Twin-Lotus showdown wins | 396 |
| Twin-Lotus holdings folded | 2 |
| Games with a Twin-Lotus showdown | 374 |
| Uncontested positive Lotus bonuses | 0 |
| Total Lotus bonus chips transferred | 0 |
| Bot decisions tagged Lotus bluff | 171 |
| Blank exchanges | 5,492 |

| Riichi setting | Twin-Lotus wins / 100 hands | Lotus bonus hands | Loans / game | Riichi declarations / 100 hands | Riichi conversion | Fishing sticks spent / game | Sticks left / table |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4 samples | 5.0 | 0 | 0.25 | 45.0 | 90.4% | 1.2 | 14.0 |
| 12 samples | 4.9 | 0 | 1.60 | 24.8 | 88.4% | 0.6 | 13.2 |
| Default 24 samples | 5.0 | 0 | 2.14 | 23.2 | 87.1% | 0.6 | 13.0 |

Draw/discard/pass counts are transactions, not distinct cards: a Lotus may circulate repeatedly. Bluff tags count betting decisions, so dividing successful bonus hands by bluff tags would not be a valid bluff success rate. A single Lotus can win a showdown only under the all-contenders-have-one exception.

| Fishing event category | Transactions |
| --- | --- |
| call:deck | 30,158 |
| call:discard-b | 9,923 |
| call:discard-a | 10,373 |
| riichi-stick:deck | 1,687 |
| riichi-stick:discard-b | 323 |
| riichi-stick:discard-a | 315 |

The engine’s historical `call:` event label means ordinary **Check fishing** under the current rules; actual Calls do not grant free fishing. Blank exchanges are listed separately and replace a fishing action.

## Loans, riichi declarations, and stick economy

| Measurement | Result |
| --- | --- |
| Loans issued | 503 |
| Loans per game | 0.25 |
| Games requiring a loan | 22.9% |
| Players ending with a loan | 6.2% |
| Players with a negative final score | 4.8% |
| Maximum loans held by one player | 2 |
| Riichi declarations | 3,602 |
| Declarations per 100 hands | 45.0 |
| Declarations rewarded | 3,257 |
| Conversion of all declarations | 90.4% (95% CI 89.5%–91.4%) |
| Withdrawals on folding | 5 |
| Reward sticks minted | 6,514 |
| Sticks spent on fishing | 2,455 |
| Mean sticks left per table | 14.0 |

| Declaration street | Declarations |
| --- | --- |
| 1 | 885 |
| 2 | 364 |
| 3 | 2,353 |

| Preceding action for paid fishing | Stick spends |
| --- | --- |
| check | 0 |
| call | 0 |
| bet | 2,455 |

At the **default 24-sample setting**, 214 loans were issued in 100 games; 95.0% of games needed borrowing, 43.8% of players ended with debt, and 32.8% had negative scores. Riichi conversion was 87.1% (95% CI 80.5%–93.7%).

Every loan injects 200 chips but deducts 250 at scoring: the table’s total score falls by **50 per loan**, or **12.6 points per game in the four-sample batch and 107.0 at the default setting**. Borrowing prevents elimination but does not restore the borrower’s standing for free. Loan penalties are already included in all reported riichi scores.

Riichi conversion includes every declaration, including declarations later withdrawn. Two reward sticks are minted only for a sole win. Comparing declarers with everyone else would be selection-biased: bots declare on hands they already consider strong. Curses are not available in the current legal actions; their absence here is a rule change, not a finding that players avoid them.

## Sensitivity and limits of the bots

| Mode | Higher sample budget and matched seeds | Metric | 4 samples | Higher samples |
| --- | --- | --- | --- | --- |
| basic | 12 (n=200) | Eliminated player-orbits | 4.1% | 25.2% |
| basic | 12 (n=200) | Hands involving an all-in | 9.8% | 38.6% |
| basic | 24 (n=100) | Eliminated player-orbits | 3.9% | 28.3% |
| basic | 24 (n=100) | Hands involving an all-in | 8.9% | 43.4% |
| riichi | 12 (n=200) | Hands involving an all-in | 15.2% | 56.9% |
| riichi | 12 (n=200) | Declarations per hand | 47.1% | 24.8% |
| riichi | 12 (n=200) | Loans per game | 0.23 | 1.60 |
| riichi | 24 (n=100) | Hands involving an all-in | 16.2% | 71.8% |
| riichi | 24 (n=100) | Declarations per hand | 51.2% | 23.2% |
| riichi | 24 (n=100) | Loans per game | 0.23 | 2.14 |

The overview pools all hands. Matched comparisons average the rate within each run before comparing runs, so all-in percentages can differ slightly between these tables.

Intervals in the saved summary treat each complete independently seeded game/tournament as a cluster. For rare hand categories and Lotus bluff wins, small counts remain uncertain even with thousands of games. More samples test equity-estimation sensitivity; they do not fix a shared policy error or establish optimal play.

Source inspection and replay records found five material interpretation limits:

1. **Extra fishing is undervalued after Check and Call.** The action evaluator subtracts the stick’s shadow cost but only adds incremental paid-fishing value for Bet. A Check already receives its normal fishing value, but its second draw gets no added utility; a Call with a stick gets no draw utility. Consequently, low spending after those actions cannot establish that the stick mechanic is weak. See `src/game/heuristic.ts`, `drawUtility` and `stickUtility`.
2. **All-in response estimates retain an incompatible assumption.** `foldProbability` returns 100% folding when an opponent cannot fully cover an all-in, although current rules permit a short Call and refund excess payments. `analyzePokerMath` also estimates the callable pot using capped per-player contributions while the engine settles one pot. Treat betting/economy results as this bot policy’s behavior.
3. **Four-sample bots cannot choose a voluntary all-in.** Confidence shrinkage limits even a perfect heads-up estimate to `(4 + 8 × 0.5) / 12 = 66.7%`, below the policy’s 72% all-in threshold. Baseline all-ins therefore come from Calls and antes. The 12-sample sensitivity check is essential; the main batch should not be treated as representative of more aggressive human play.
4. **Lotus development and realized value are inconsistent.** `handPotential` values the ordinary rank of a lone-Lotus hand, whereas showdown equity disqualifies it and discard choice applies a separate penalty. A low observed Lotus-bluff success rate is not an optimal-strategy verdict.
5. **The low-sample bot even folded two guaranteed winners.** Twin Lotus was folded on Hand 4 by p4 in seeds `health-2026-09-25-1907` and `health-2026-09-25-1997`. Known automatic wins should not be diluted by generic equity uncertainty. These two cases occurred in the large four-sample batch.

## Recommended next steps

1. Correct paid-fishing utility after Check/Call, all-in refund/pot estimates, and certainty handling for Twin Lotus before treating bots as a balance oracle.
2. Keep future balance batches at the actual app setting (24 samples here), and report the sample budget; four-sample outcomes substantially understate pressure.
3. Do not increase basic starting chips as the main fix: the default-setting matched first-orbit test changed elimination from 28.75% to 28.50%. In riichi, 400 chips reduced negative scores from 32.75% to 27.25%, but loans stayed at 2.14 versus 2.13 per game and all-in frequency barely changed. It softens the downside, not the pacing.
4. Playtest the desired pace explicitly: only 25.3% of basic hands and 9.8% of riichi hands reached Street 4 at the default setting. If fishing and progressive reveals are meant to be central, this is the main design pressure to investigate after correcting the bots.
5. Keep joker and Lotus rules unchanged until the bot fixes are tested. Jokers have a large, consistent observed advantage; Twin Lotus resolves about 5% of hands at both low and default settings. Zero successful Lotus bluff bonuses means that branch remains inadequately exercised by this policy, not that its bonus is necessarily too small.

## Reproduction and evidence

The preserved executable source is under `health-2026-09-25/source/src/game/` and is imported directly by the runner. Source hashes and the original dirty-working-tree status note are in [manifest.json](health-2026-09-25/manifest.json). Full aggregated metrics and paired confidence intervals are in [summary.json](health-2026-09-25/summary.json). Compressed per-game JSONL records preserve seed, scores, orbit eliminations, hand outcomes, event totals, and invariant results.

```sh
# Baselines; the second numeric parameter is the seed offset.
node --import tsx scripts/health-check.ts basic 2000 0 4 200
node --import tsx scripts/health-check.ts riichi 2000 0 4 200
# Matched equity sensitivity.
node --import tsx scripts/health-check.ts basic 200 0 12 200
node --import tsx scripts/health-check.ts riichi 200 0 12 200
# First-orbit stack controls.
node --import tsx scripts/health-check.ts basic 500 0 4 400 docs/health-2026-09-25 1
node --import tsx scripts/health-check.ts riichi 500 0 4 400
# Default-setting baselines and stack controls.
node --import tsx scripts/health-check.ts basic 100 0 24 200
node --import tsx scripts/health-check.ts basic 100 0 24 400 docs/health-2026-09-25 1
node --import tsx scripts/health-check.ts riichi 100 0 24 200
node --import tsx scripts/health-check.ts riichi 100 0 24 400
python3 scripts/summarize-health.py
python3 scripts/render-health.py
```

Use a fresh output directory or remove prior shards before replaying: overlapping seed ranges are rejected during aggregation. Independent shards were used for the measured run; caches do not change deterministic choices.
