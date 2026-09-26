# Mahjong Poker rules-v4 curse-cleanup health report

Deterministic bot simulation: 64 games, 768 hands, seed family `health-v2`, 2 equity samples per decision, 173.4 seconds.

## Economy and play

| Metric                                    |                                    Result |
| ----------------------------------------- | ----------------------------------------: |
| Games / hands                             |                                  64 / 768 |
| Starting chips / sticks per player        |                                   400 / 2 |
| Invariant violations                      |                                         0 |
| Showdown rate                             |                                     88.9% |
| Bets / Calls / Folds per hand             |                       4.24 / 11.13 / 1.16 |
| Mean / p90 pot                            |                               445.8 / 850 |
| Voluntary all-ins / hand                  |                                     0.111 |
| Short-ante hands                          |                                      8.9% |
| Loans taken / repaid per game             |                               4.28 / 1.69 |
| Players ending with debt                  |                                     42.2% |
| Players ending at two Loans               |                                     22.7% |
| Negative final scores                     |                                     39.8% |
| Mean / p90 final spread                   |                             1947.5 / 2680 |
| Hand-4 leader wins game                   |                                     59.4% |
| Hand-4 trailer wins game                  |                                     10.9% |
| Hand-8 leader wins game                   |                                     70.3% |
| Hand-8 trailer wins game                  |                                      3.1% |
| Mean leader margin H4 / H8                |                             494.8 / 717.0 |
| Riichi declarations / wins per hand       |                             0.409 / 0.311 |
| Riichi conversion                         |                                     76.1% |
| Riichi sticks minted per game             |                                      7.47 |
| Riichi sticks remaining per game          |                                      4.34 |
| Extra-draw stick spends per game          |                                      0.64 |
| Curse actions share of stick spending     |                                     94.3% |
| Curses placed per game                    |                                      6.94 |
| Curses targeting the current leader       |                                    100.0% |
| Curse placements O1 / O2 / O3 per game    |                        0.95 / 1.63 / 4.36 |
| Maximum observed Curse stack              |                                         8 |
| Curse fold payments per game / mean chips |                               1.13 / 41.1 |
| Curse chips paid per game                 |                                      46.3 |
| Curses removed with sticks per game       |                                      3.55 |
| Curse removals by prior Riichi winners    |                                     88.5% |
| Cleared Curses removed / burned           |      227 / 72 (75.9% removed with sticks) |
| Curses outstanding at game end            |                                      2.27 |
| Lotus Bluffs per 100 hands                |                                      0.13 |
| Final winner seats                        | p1 20.3% · p2 34.4% · p3 25.0% · p4 20.3% |

## Showdown rank appearances

- high-card: 189
- eye: 307
- chow: 108
- pure-suit: 185
- two-eyes: 330
- pung: 98
- long-chow: 112
- chow-eye: 351
- three-dragons: 42
- twin-lotus: 40
- bird-migration: 51
- pung-eye: 111
- great-chow: 91
- four-winds: 29
- three-dragons-eye: 42
- kong: 7

## Automated assessment

- Pressure arrives early: the first-orbit leader converts at least 45% of games.
- By Hand 8, leaders have a strong conversion advantage.
- Loan pressure is high: at least 35% of players finish with an outstanding penalty.
- The downside tail is severe: at least one fifth of final scores are negative.
- Showdowns remain frequent because a Call also improves the Hand; Fold pressure is a watch item.
- All-in frequency does not dominate play.
- Curse placement and cleanup dominate the stick economy, leaving little stick use for extra draws.
- Most cleared Curses consume sticks, so Curse defense strongly competes with Hand development.
- No large winner-seat bias appears in this batch.

## Comparison with winner-conversion Curses

Both versions used the same 64 `health-v2` seeds and two-sample bots. Rules-v3 started with three sticks and converted a winner's Curses into sticks; rules-v4 starts with two, never clears Curses on a win, and permits one-stick self-cleanup.

| Metric                         | rules-v3 conversion | rules-v4 cleanup |    Change |
| ------------------------------ | ------------------: | ---------------: | --------: |
| Hand-4 trailer wins game       |                6.3% |            10.9% |   +4.6 pp |
| Hand-8 trailer wins game       |                4.7% |             3.1% |   -1.6 pp |
| Hand-8 leader wins game        |               70.3% |            70.3% | unchanged |
| Mean leader margin H4          |               516.4 |            494.8 |     -4.2% |
| Mean leader margin H8          |               831.6 |            717.0 |    -13.8% |
| Mean final spread              |             1,967.3 |          1,947.5 |     -1.0% |
| Players ending with debt       |               46.5% |            42.2% |   -4.3 pp |
| Curse placements / game        |                2.05 |             6.94 |   +238.5% |
| Curse Fold-tax chips / game    |                18.1 |             46.3 |   +155.8% |
| Extra-draw stick spends / game |               16.25 |             0.64 |    -96.1% |

The rare Hand-8-trailer outcome is noisy. In the exact first 32 matched seeds, rules-v4 improved Hand-4 trailer wins from 3.1% to 9.4%, Hand-8 trailer wins from 0% to 3.1%, and reduced Hand-8 leader conversion from 81.3% to 71.9%. Across all 64 seeds, early comeback improved and leader margins shrank materially, but late trailer wins did not improve consistently.

## Comparison with the original economy

On the original 32-seed rules-v2 baseline, Hand-4 and Hand-8 trailer wins were 12.5% and 3.1%. Rules-v4 produced 9.4% and 3.1% on those same seeds. The cleanup design therefore restores late comeback to the original observed rate and recovers most—but not all—of the early comeback lost under winner conversion.

## Finite-stick economy verdict

- The supply constraint held in every game. Each table began with eight sticks, Riichi wins minted 7.47 per game on average, and 4.34 remained at game end. No game exceeded the theoretical 24-stick minting limit.
- The intended Riichi-to-cleanup loop is active: players removed 3.55 Curses per game with sticks, and 88.5% of those removals came after that player had previously won a Riichi Hand.
- Curses now create meaningful pressure. They targeted the current leader 100% of the time, reached stacks as high as eight, and generated 46.3 Fold-tax chips per game.
- Comeback health is better than with winner conversion, especially in leader margins and the matched first 32 games. It is not a decisive improvement over the original no-conversion baseline.
- The main concern is option crowd-out: 94.3% of spent sticks went to placing or removing Curses. Extra-draw spending collapsed to 0.64 per game. If Riichi sticks are still meant to be a major hand-crafting tool, Curse actions are currently too efficient relative to drawing.
