# Mahjong Poker health analysis

## Method

- 2,000 deterministic four-player games and 24,000 hands
- Seeds `health-2026-08-19-0` through `health-2026-08-19-1999`
- 64 Monte Carlo rollouts per heuristic evaluation
- Nine simulation workers; runtime 1,312.1 seconds
- All players used the same full heuristic policy
- Win rates credit split pots fractionally

The simulator records original four-tile deals, every tile acquired during play, final private tiles, selected scoring tiles, action and draw choices, Riichi, Flower events, blue sticks, Loans, eliminations, pots, and final scores.

## Verdict

The core play loop is lively and unusually accessible for a wagering game. An average game gives 3.40 of its four players at least one hand win, 44.4% of hands can be won through folds, and 55.6% reach showdown. Players make 15.15 betting decisions per hand and use every major draw route. That supports the intended feeling that players have options and remain live.

The main health risk is the economy. The average pot is 534.93 chips against a 510-chip starting stack, and the average gap between the highest and lowest final score is 2,980.05 points. Loans prevent early removal, but 27.8% of player-games still reach the three-Loan cap and 56.4% of games eliminate at least one player late. This produces excitement, but also makes the outcome swingier than casual Hold'em.

The clearest balance defect is the Flower package. Flowers are harmless in the opening deal, but are almost always liabilities when retained, never produce the fold bonus under the current heuristic, and make the Black Joker much weaker than the colored Jokers. The Blank is healthier than its final-tile win rate first suggests: its opening win rate is near baseline and players successfully get rid of nearly 91% of acquired Blanks.

## Game flow and choices

| Metric                                  |            Result |
| --------------------------------------- | ----------------: |
| Hands reaching showdown                 |             55.6% |
| Hands won before showdown               |             44.4% |
| Hands reaching the five-tile board      |             71.3% |
| Average different hand winners per game |         3.40 of 4 |
| Average betting decisions per hand      |             15.15 |
| Average final pot                       |      534.93 chips |
| Median / 90th percentile pot            | 420 / 1,085 chips |
| Average final-score spread              |   2,980.05 points |
| Games ending before hand 12             |              0.0% |

Action mix:

| Action |   Count | Share |
| ------ | ------: | ----: |
| Check  | 152,574 | 42.0% |
| Call   |  85,640 | 23.6% |
| Bet    |  56,963 | 15.7% |
| Fold   |  50,248 | 13.8% |
| Raise  |  18,112 |  5.0% |

Raises are now substantially less common than folds. The game is still call-heavy and showdown-heavy, which is appropriate for a casual design where players should frequently see what their hand became.

Draw choices attached to checks and calls:

| Source         |   Count | Share |
| -------------- | ------: | ----: |
| Deck           | 207,714 | 87.2% |
| Discard A      |  17,357 |  7.3% |
| Discard B      |  11,297 |  4.7% |
| Blank exchange |   1,846 |  0.8% |

The agents do use public information: 12.0% of draw choices fish from a discard lane. Blank exchange is rare as a share of all actions, but occurred 1,831 times, or in roughly 7.6% of hands.

Riichi was declared in 8,795 hands (36.6%). Riichi players won 45.9% of those hands, far above the 25.7% player-hand baseline. Riichi is both reachable and selected for meaningfully strong positions.

## Blue sticks, Loans, and elimination

| Metric                              |  Mean | Median | 90th percentile |
| ----------------------------------- | ----: | -----: | --------------: |
| Opening pot                         | 87.04 |     80 |             165 |
| Opening charge from blue sticks     | 69.88 |     80 |             120 |
| Opening charge from Loans           | 17.16 |     10 |              50 |
| Blue sticks in center at hand start |  1.16 |      0 |               4 |
| Blue sticks in center at hand end   |  0.72 |      0 |               3 |
| Blue sticks per active player       |  1.87 |      2 |               4 |
| Loans per active player             |  0.33 |      0 |               1 |

Blue sticks cause 80.3% of the average opening pot. Most sticks are held by players rather than accumulating in the center, so the two-stick fold cost is doing its job without emptying player inventories.

Players took 11,533 Loans (5.77 per game) and repaid 2,293 (1.15 per game). The heuristic now repays a seasoned Loan whenever it can preserve the next mandatory opening charge after repayment.

| Maximum Loans in a player-game | Player-games | Share |
| ------------------------------ | -----------: | ----: |
| 0                              |        3,166 | 39.6% |
| 1                              |        1,366 | 17.1% |
| 2                              |        1,248 | 15.6% |
| 3                              |        2,220 | 27.8% |

There were 1,263 eliminations across 56.4% of games. They are strongly back-loaded:

| Elimination point | Count | Share of eliminations |
| ----------------- | ----: | --------------------: |
| Before hand 8     |     7 |                  0.6% |
| Before hand 9     |    64 |                  5.1% |
| Before hand 10    |   268 |                 21.2% |
| Before hand 11    |   445 |                 35.2% |
| Before hand 12    |   479 |                 37.9% |

The three-Loan rule therefore protects play time: essentially nobody disappears during the first two-thirds of a game, while the final orbit still has real knockout pressure.

## Hands that get scored

`Winning share` is the percentage of all 24,000 hand wins. `Holder win rate` is the chance that a player with that final rank won the hand, including uncontested outcomes.

| Rank | Hand              | Final holdings | Winning hands | Winning share | Holder win rate |
| ---: | ----------------- | -------------: | ------------: | ------------: | --------------: |
|    1 | High Card         |         20,685 |           153 |          0.6% |            0.7% |
|    2 | Eye               |         20,993 |         3,122 |         13.0% |           14.9% |
|    3 | Chow              |         13,502 |         3,346 |         13.9% |           24.8% |
|    4 | Pure Suit         |          9,414 |         2,919 |         12.2% |           31.0% |
|    5 | Two Eyes          |          9,543 |         3,535 |         14.7% |           37.0% |
|    6 | Chow Eye          |          7,043 |         3,393 |         14.1% |           48.2% |
|    7 | Pung              |          6,416 |         3,644 |         15.2% |           56.8% |
|    8 | Three Dragons     |          2,090 |         1,297 |          5.4% |           62.1% |
|    9 | Pung Eye          |          1,816 |         1,154 |          4.8% |           63.5% |
|   10 | Three Dragons Eye |            777 |           546 |          2.3% |           70.3% |
|   11 | Four Winds        |            392 |           269 |          1.1% |           68.6% |
|   12 | Dragon Dancer     |            352 |           255 |          1.1% |           72.4% |
|   13 | Kong              |            181 |           135 |          0.6% |           74.6% |
|   14 | Crosswinds        |             71 |            53 |          0.2% |           74.6% |
|   15 | Bouquet           |            144 |           103 |          0.4% |           71.5% |
|   16 | Imperial Garden   |            117 |            76 |          0.3% |           65.0% |

The ladder is working. High Card almost never wins, but players do not need a rare special to compete: ranks 3–7 account for 70.1% of wins. Chow or better wins 86.4% of all hands, matching the observed tabletop experience. Each ordinary step through Pung increases the holder's win rate cleanly.

The top ranks do not have a monotonic holder win rate because this metric includes players who folded before resolution. Rare hands have only 71–181 observations, so their estimates also have much wider uncertainty than the common ranks.

## Jokers, Blank, and Flowers

The 25.7% baseline is fractional win credit across all player-hands.

| Piece       | Opening win rate | Holdings | Final-held win rate | Showdown win rate | Selected in winning hand |
| ----------- | ---------------: | -------: | ------------------: | ----------------: | -----------------------: |
| Any Joker   |            35.2% |   12,462 |               38.5% |             40.2% |                 4,965.33 |
| Black Joker |            24.8% |    3,238 |               24.1% |             26.8% |                   359.00 |
| Blue Joker  |            39.7% |    3,292 |               40.1% |             42.3% |                 1,538.83 |
| Green Joker |            38.4% |    3,249 |               41.0% |             42.7% |                 1,546.00 |
| Red Joker   |            39.5% |    3,215 |               41.4% |             43.1% |                 1,615.50 |
| Blank       |            23.6% |   12,657 |                7.2% |              6.8% |                     0.00 |
| Any Flower  |            25.2% |   12,676 |                7.6% |              6.1% |                   179.00 |

Colored Jokers are very strong and internally consistent: their opening advantage is roughly 13–14 percentage points over a Blank and roughly 14–15 points over the Black Joker. The Black Joker is effectively an ordinary tile because its Flower/Wind substitution space is much less useful than numbered-suit substitution.

The Blank's 7.2% final-held rate is a selection effect, not a 7.2% opening chance to win. Its opening rate is 23.6%, only 2.1 points below baseline. Of 18,773 player-hands that acquired a Blank, only 1,685 retained one at resolution, so players shed 91.0% of Blank exposures through ordinary discards or exchanges. A retained Blank identifies a player who got stuck with it.

Flowers show the same selection effect, but with a genuine strategic problem. They start near baseline at 25.2%, yet 1,354 showdowns were disqualified by a single private Flower. Board Flowers reset the board in 17.3% of hands. Most importantly, the Flower fold bluff triggered zero times. The colorful exception is present, but its positive incentive is currently dead.

Bouquet appears in only 144 final holdings and wins only 0.4% of hands. It is attractive when completed, but too rare to offset the day-to-day Flower liability or make the Black Joker appealing.

## Numbered tiles and honors

Opening win rates are the least selection-biased way to compare ordinary pieces.

| Piece  | Opening win rate | Piece    | Opening win rate | Piece  | Opening win rate |
| ------ | ---------------: | -------- | ---------------: | ------ | ---------------: |
| 1 Bams |            23.8% | 1 Cracks |            23.0% | 1 Dots |            23.2% |
| 2 Bams |            24.0% | 2 Cracks |            24.1% | 2 Dots |            23.2% |
| 3 Bams |            24.7% | 3 Cracks |            24.0% | 3 Dots |            24.2% |
| 4 Bams |            24.0% | 4 Cracks |            24.7% | 4 Dots |            24.3% |
| 5 Bams |            24.5% | 5 Cracks |            25.2% | 5 Dots |            24.8% |
| 6 Bams |            25.0% | 6 Cracks |            25.2% | 6 Dots |            24.9% |
| 7 Bams |            26.4% | 7 Cracks |            26.6% | 7 Dots |            25.4% |
| 8 Bams |            26.1% | 8 Cracks |            25.9% | 8 Dots |            25.5% |
| 9 Bams |            26.0% | 9 Cracks |            25.0% | 9 Dots |            25.6% |

Suit balance is good. The larger signal is rank: low numbered tiles sit around 23–24%, while sevens through nines sit around 25–27% because rank participates in tie-breaking. The spread is noticeable but modest enough to create texture rather than a mandatory discard rule.

| Honor        | Opening win rate | Final-held win rate |
| ------------ | ---------------: | ------------------: |
| East Wind    |            24.9% |               24.1% |
| South Wind   |            25.4% |               24.2% |
| West Wind    |            25.5% |               23.9% |
| North Wind   |            25.2% |               25.3% |
| Green Dragon |            27.1% |               28.1% |
| Red Dragon   |            26.9% |               28.2% |
| White Dragon |            27.2% |               28.5% |

Winds are neutral and tightly grouped. Dragons receive a modest, consistent premium from their dedicated hands.

## Position fairness

| Seat | Game-win share |
| ---- | -------------: |
| 1    |          24.3% |
| 2    |          24.4% |
| 3    |          25.8% |
| 4    |          25.5% |

The 1.5-point range is small for 2,000 games and does not show an actionable dealer/order bias. Split game wins make the seat credits sum slightly above 2,000.

## Comparison with poker

A 103-million-hand study of real-money PokerStars cash games reported that 24.3% of Hold'em hands reached showdown. Its no-limit categories ranged from 6.9% to 26.1%, depending on table size and stakes. Mahjong Poker's 55.6% showdown rate is therefore more than twice the overall Hold'em figure. This is a good difference for the stated casual goal: players see more completed boards, reveal more hands, and receive more feedback about whether their plan worked. Source: [Cigital, Statistical Analysis of Texas Hold'em](https://worldpokerfederation.org/wp-content/uploads/2023/10/CIGITAL-100M-Hand-AnalysisReport.pdf).

Economically, this design behaves more like ante-only Hold'em than ordinary blind poker because everyone begins with a financial interest. WSOP's account of an ante-only tournament similarly describes more action and faster elimination than conventional no-limit play. Mahjong Poker's Loans soften that pressure enough that eliminations remain concentrated in the last three hands. Source: [WSOP, Ante-Only No-Limit Hold'em](https://www.wsop.com/news/ante-only-new-wsop-circuit-tournament-debuts-at-caesars-palace/).

Unlike a poker tournament, the game reliably reaches its scheduled 12 hands instead of trying to eliminate everyone but one player. Poker tournaments use increasing blinds/antes and continue until one player remains; that structure creates stronger survival pressure and less predictable duration. Source: [WSOP tournament overview](https://help.pa.wsop.com/hc/en-us/articles/30531542355739-What-kind-of-poker-tournaments-do-you-have).

In short: Mahjong Poker is more revealing, more forgiving early, more option-dense, and more volatile per resolved pot than conventional Hold'em. Those are coherent choices for a casual hybrid, but the score spread and special-piece asymmetry need attention.

## Recommended balance experiments

1. **Repair Flower incentives first.** The bluff bonus has a 0% trigger rate. Let the heuristic value the concealed single-Flower fold route explicitly, then test whether the current 20-chip-per-opponent bonus is enough. If it still never occurs, raise the bonus or relax its trigger. This is both an AI correction and a rules-health test.
2. **Give the Black Joker a reachable payoff.** The clean target is an opening win rate around 32–36%: below colored Jokers, well above neutral. Making one Flower/Wind bait hand substantially easier is preferable to making Black a universal Joker.
3. **Reduce economic runaway without reducing choices.** Test a roughly 15–20% cut to opening charges, preferably through orbit values rather than bet sizes. Keep the two-stick fold rule, which now leaves players with a healthy 1.87 sticks on average. Compare final-score spread, three-Loan saturation, and eliminations.
4. **Keep the three-Loan cap.** It virtually eliminates early removal while retaining final-orbit tension. Repayment already lowered eliminations by 14.3% relative to the otherwise identical no-repayment cohort.
5. **Keep the current ladder center.** Ranks 3–7 produce 70.1% of wins and have a smooth payoff curve. Do not raise common-hand requirements unless the goal changes toward a tighter, more expert game.
6. **Run controlled A/B cohorts.** Use the same 2,000 seeds for each configuration. Primary gates should be at least 3.4 different winners/game, 40–55% uncontested hands, under 25% of player-games reaching three Loans, and a lower final-score spread without driving showdowns below roughly 45%.

The numerical gates are design targets inferred from this game's stated goals, not universal poker standards.
