# Two starting sticks and Wind-pair strategy — 2026-09-25

Two starting Riichi sticks looks like a useful reduction, especially in short games with resets. It clearly reduces leftovers and paid fishing. This batch found no clear worsening of all-ins, loans or street-four play. That is evidence for trying two, not proof that it is optimal. There is also a concrete endgame stick-valuation weakness in the bots, described below.

The calibrated Riichi ladder is now applied to scoring, bot hand-progress evaluation, the app and the rules. Basic retains its previous order. The app still starts with **three sticks**; the two-stick variant was tested in isolated snapshots. Winning Riichi continues to award two sticks.

Analyzed **280 runs, 520 constituent games and 4,480 hands**, with four bots, **24 joint equity trials per decision** and ten workers. There were 100 matched seed pairs of four-orbit games, and 40 matched seed pairs of four-game tournaments with one orbit and stack resets per game. Same seeds, same policies, same calibrated ladder. Source hashes match across all arms except the stick constant in `rules.ts`.

## Results

Resource averages below are **per four-player table, per constituent game**, not per player or whole reset tournament. All remaining stocks include earned Riichi rewards.

| Metric | Four orbits: 3 sticks | Four orbits: 2 sticks | Reset games: 3 sticks | Reset games: 2 sticks |
|---|---:|---:|---:|---:|
| Starting supply | 12.00 | 8.00 | 12.00 | 8.00 |
| Earned from Riichi | 5.40 | 5.82 | 1.34 | 1.30 |
| Sticks spent | 12.38 | 10.09 | 4.97 | 4.42 |
| Sticks remaining | 5.02 | 3.73 | 8.37 | 4.88 |
| Players finishing with sticks (%) | 62.75 | 50.50 | 92.97 | 72.66 |
| Riichi declarations | 2.91 | 3.09 | 0.72 | 0.71 |
| Loans | 0.250 | 0.240 | 0.013 | 0.006 |
| All-in hands (%) | 11.25 | 11.00 | 9.84 | 10.31 |
| Hands reaching street 4 (%) | 33.06 | 35.19 | 25.16 | 27.03 |
| Showdowns (%) | 32.06 | 34.25 | 25.62 | 27.34 |
| Free fishes per hand | 5.77 | 6.23 | 4.51 | 4.60 |
| Paid fishes per hand | 0.74 | 0.60 | 1.19 | 1.06 |

No players were eliminated in these batches; zero observed events does not establish zero risk. Four-orbit loans were 25 versus 24 total; reset-tournament loans were 2 versus 1. Free/paid fishing counts ordinary draw/discard events; Blank exchanges are excluded from those two rows, but all paid uses are included in sticks spent.

With two sticks, **49.5%** of players exhausted their stock in four-orbit games, versus **37.25%** with three. In reset games, those figures were **27.34% versus 7.03%**. The lower allowance creates real scarcity. Nevertheless, ordinary fishing in four-orbit games rose from **6.51 to 6.82 draws per hand**, as more free fishing offset fewer paid draws.

## Paired uncertainty

95% percentile bootstrap intervals, 4,000 resamples of matched whole runs. Games within a reset tournament stay together. Changes are two minus three sticks. These are individual intervals, not simultaneous guarantees for all metrics.

| Change | Four-orbit games | Reset tournaments |
|---|---:|---:|
| Leftover sticks per game | -1.29 [-1.92, -0.69] | -3.49 [-3.80, -3.17] |
| Sticks spent per game | -2.29 [-2.79, -1.79] | -0.55 [-0.81, -0.28] |
| Street-four rate (percentage points) | +2.12 [-0.25, +4.50] | +1.88 [-2.34, +5.78] |
| All-in rate (percentage points) | -0.25 [-1.19, +0.69] | +0.47 [-0.78, +1.72] |
| Loans per game | -0.01 [-0.11, +0.09] | -0.01 [-0.02, +0.00] |

The reduction in leftovers and spending is clear. The increases in street-four play are encouraging but inconclusive. The loan sample, especially with resets, is too sparse for strong claims about rare distress.

## Each game of the reset tournament

Stacks reset to 200/300/400/500 chips; antes are 5/10/15/20. Each row contains 40 games per arm.

| Game | Spent: 3 → 2 | Remaining: 3 → 2 | Earned: 3 → 2 | Loans: 3 → 2 |
|---|---:|---:|---:|---:|
| 1 | 4.75 → 4.15 | 8.85 → 5.55 | 1.60 → 1.70 | 0.000 → 0.000 |
| 2 | 5.28 → 4.47 | 8.47 → 5.12 | 1.75 → 1.60 | 0.025 → 0.025 |
| 3 | 5.15 → 4.70 | 8.20 → 4.50 | 1.35 → 1.20 | 0.025 → 0.000 |
| 4 | 4.70 → 4.35 | 7.95 → 4.35 | 0.65 → 0.70 | 0.000 → 0.000 |

## Why some sticks still go unused

Riichi rewards replenish stocks, and a reward on the last hand cannot be spent. In the saved two-stick continuous sample 0, the table started with 8, earned 10, spent 10 and finished with 8. Five Riichi wins supplied those 10 rewards. Leftovers alone therefore do not measure how much of the initial allowance was unnecessary.

There is also a bot limitation: `stickShadowValue` remains positive on the final hand (`12 / current sticks`, plus a remaining-hands term). Spending is penalized by that value, and winning a Riichi declaration receives a positive reward estimate, even when its sticks will arrive too late to use. Unused sticks contribute no final points. This can cause over-conservation or overvaluation of terminal Riichi rewards. The heuristic was left identical in both arms to isolate the allowance change. Correcting that terminal valuation is a sensible next bot improvement before calling any stick budget fully calibrated.

## Do bots understand Wind > Dragon > 9…1?

**Yes for made hands and visible fishing completions; only partially for longer-term targets.**

- Showdown comparisons and Monte Carlo win estimates compare the full tie-break, not just the ladder category. A Wind Pung beats Dragon and numbered Pungs. All Wind Pungs tie one another; direction does not matter.
- Fishing and discard evaluation also includes the made hand’s tie-break. New controlled tests gave the bot two visible completions and swapped their lanes: in both modes it chose Wind over Dragon, Dragon over 9, and 9 over 1, then kept the stronger combination. That is 12 lane/mode scenarios. Basic completes Pung; Riichi can complete Pung and Eyes from these two-pair fixtures.
- Longer-term potential tracks the next category and missing-card count. It does not explicitly score every future target’s tie-break or remaining outs. A Wind pair already gets the stronger Eyes tie-break, and a visible third Wind is properly valued, but the bot is not doing a full multi-turn Wind-Pung pursuit calculation.
- Category still comes first. With the new Riichi ladder, Three Winds beats every Pung, including a Wind Pung. In Basic, Pung still beats Three Winds. A Wind pair is a useful opportunity, not a reason to ignore stronger categories.

## Validation and artifacts

152 unit tests and four Worker integration tests pass. Lint, unused-code checking and type checking pass. The applied ladder exactly reproduces all hand results and final scores of one saved Basic baseline game and one saved Riichi candidate game. Basic also retains its previous 512-hand evaluation checksum; the Riichi checksum was updated for the intentional rank changes. Edited files pass formatting. The repository-wide format check is blocked by existing formatting in unrelated `src/client/styles/home.css` and `motion.css`.

Every run passed score conservation; stick-spending events match initial plus earned minus remaining stocks across every constituent game. The experiment runner now resolves child output paths correctly. Its first 100-run baseline output was lost to temporary-directory cleanup and rerun with identical seeds: **380 executed runs, 280 unique analyzed runs**. Those duplicates are not counted as extra evidence.

[Full design and reproduction commands](two-sticks-2026-09-25/method.md), [paired results](two-sticks-2026-09-25/analysis.json), and JSONL data/manifests/sample traces in [the experiment directory](two-sticks-2026-09-25/).
