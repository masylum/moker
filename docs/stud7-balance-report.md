# Stud7 blue-stick and Riichi balance report

## Experiment

This report compares three Stud7 rules profiles:

1. **Baseline:** Fold gains one blue stick; Riichi skips Draw & Discard.
2. **Fold +2:** Fold gains two blue sticks; Riichi skips Draw & Discard.
3. **Locked draw:** Fold gains two blue sticks; Riichi draws but must discard the drawn tile.

The main cohort attempted 1,000 deterministic four-player games per profile, using the same paired seed families. Betting used one showdown-equity rollout per decision. For practical bulk speed, Draw & Discard chose the immediate highest ladder rank and used seeded random tie-breaking. A separate 30-game-per-profile cohort used the complete future-rollout discard heuristic as a directional sensitivity check.

“Win with tile” means the percentage of completed seat-hands containing that face among the retained cards that won the hand. It is useful for identifying association and selection pressure, but it is not the causal value of receiving that tile in the opening deal. Tied faces in fast mode are selected randomly and deterministically, avoiding suit-order bias.

## Cohort summary

| Metric                         | Baseline |  Fold +2 | Locked draw |
| ------------------------------ | -------: | -------: | ----------: |
| Games attempted                |    1,000 |    1,000 |       1,000 |
| Games completed                |      964 |      972 |         972 |
| Hands analyzed                 |   11,568 |   11,664 |      11,664 |
| Average initial pot            |    78.00 |    80.93 |       80.93 |
| Orbit 1 initial pot            |    27.98 |    33.85 |       33.88 |
| Orbit 2 initial pot            |    79.20 |    80.11 |       80.10 |
| Orbit 3 initial pot            |   126.83 |   128.85 |      128.83 |
| Average final pot              |   263.77 |   289.85 |      290.39 |
| Loans taken per game           |     1.03 |     1.18 |        1.17 |
| Ending Loans per player        |    0.259 |    0.295 |       0.293 |
| Players taking a Loan per game |    0.885 |    0.993 |       0.985 |
| Showdown rate                  |    4.77% |    7.48% |       7.20% |
| Average winning ladder points  |     1.73 |     1.91 |        1.91 |
| Average final score            |   476.13 |   475.58 |      475.61 |
| Average winning final score    | 1,439.41 | 1,488.42 |    1,484.55 |
| Average final-score spread     | 1,633.33 | 1,657.56 |    1,652.40 |
| Riichi hand win rate           |   61.24% |   57.67% |      57.71% |
| Win with any Joker             |   30.62% |   31.63% |      32.10% |
| Win with any Blank             |   17.85% |   17.10% |      17.33% |

The incomplete games are a real economy failure, not infrastructure loss: a player had already taken both Loans and could not afford a later mandatory blue-stick charge. It occurred in 3.6% of baseline attempts and 2.8% of each Fold +2 profile.

## Action mix

| Action                           | Baseline | Fold +2 | Locked draw |
| -------------------------------- | -------: | ------: | ----------: |
| Check                            |   49.12% |  51.43% |      51.24% |
| Call                             |    1.17% |   2.80% |       2.78% |
| Bet                              |   10.67% |  10.19% |      10.22% |
| Raise                            |    9.89% |   9.44% |       9.48% |
| Fold                             |   29.16% |  26.15% |      26.28% |
| Riichi declaration / all actions |    0.99% |   0.86% |       0.86% |

The simulation does not show Raises occurring more often than Folds: baseline has roughly three Folds for every Raise. It does confirm that Raises are about ten times as common as Riichi declarations. Fold +2 is a stronger future-cost penalty, so it reduces folding by about three percentage points and increases calling. It does not make Riichi more attractive.

## Winning Hand distribution

| Rank and Hand          | Baseline | Fold +2 | Locked draw |
| ---------------------- | -------: | ------: | ----------: |
| 1 High Card            |   66.22% |  60.72% |      60.79% |
| 2 Eye                  |   19.88% |  21.24% |      21.07% |
| 3 Chow                 |    6.21% |   7.43% |       7.57% |
| 4 Pure Suit            |    0.99% |   1.47% |       1.42% |
| 5 Two Eyes             |    2.21% |   3.02% |       3.00% |
| 6 Chow + Eye           |    0.96% |   1.49% |       1.51% |
| 7 Pung                 |    2.11% |   2.81% |       2.83% |
| 8 Three Dragons        |    0.86% |   0.88% |       0.85% |
| 9 Pung + Eye           |    0.31% |   0.57% |       0.56% |
| 10 Three Dragons + Eye |    0.07% |   0.16% |       0.17% |
| 11 Four Winds          |    0.10% |   0.06% |       0.07% |
| 12 Dragon Dancer       |    0.03% |   0.08% |       0.09% |
| 13 Kong                |    0.03% |   0.04% |       0.06% |
| 14 Crosswinds          |    0.03% |   0.01% |       0.01% |

High Card dominates because more than 92% of hands end without a showdown. Fold +2 produces more Calls and showdowns, so winning Hands move slightly higher on the ladder.

## Win rate by retained tile face

The number in parentheses is the seat-hand sample for that profile.

| Tile           |       Baseline |        Fold +2 |    Locked draw |
| -------------- | -------------: | -------------: | -------------: |
| 🀐 1 Bamboo     | 21.72% (4,761) | 22.14% (5,017) | 22.07% (4,989) |
| 🀑 2 Bamboo     | 23.70% (4,662) | 22.20% (4,902) | 22.39% (4,935) |
| 🀒 3 Bamboo     | 23.95% (4,769) | 25.41% (4,920) | 25.17% (4,891) |
| 🀓 4 Bamboo     | 24.18% (4,681) | 25.05% (4,931) | 24.34% (4,893) |
| 🀔 5 Bamboo     | 24.89% (4,765) | 24.73% (4,869) | 24.83% (4,861) |
| 🀕 6 Bamboo     | 25.48% (4,628) | 25.72% (4,918) | 25.64% (4,946) |
| 🀖 7 Bamboo     | 25.69% (4,683) | 25.56% (4,961) | 25.79% (4,943) |
| 🀗 8 Bamboo     | 25.10% (4,702) | 25.36% (4,965) | 25.83% (4,964) |
| 🀘 9 Bamboo     | 25.06% (4,712) | 23.61% (4,963) | 23.99% (4,902) |
| 🀇 1 Characters | 23.19% (4,602) | 20.85% (4,801) | 20.97% (4,816) |
| 🀈 2 Characters | 23.45% (4,777) | 22.97% (4,964) | 22.99% (4,932) |
| 🀉 3 Characters | 25.06% (4,733) | 23.73% (4,951) | 24.01% (4,957) |
| 🀊 4 Characters | 23.91% (4,617) | 23.35% (4,967) | 22.95% (4,963) |
| 🀋 5 Characters | 23.23% (4,701) | 24.32% (4,995) | 24.08% (4,995) |
| 🀌 6 Characters | 23.17% (4,674) | 25.47% (4,944) | 25.51% (4,912) |
| 🀍 7 Characters | 25.04% (4,689) | 25.48% (5,008) | 25.34% (5,007) |
| 🀎 8 Characters | 23.29% (4,672) | 25.12% (4,944) | 25.01% (4,926) |
| 🀏 9 Characters | 23.47% (4,577) | 23.82% (4,949) | 23.86% (4,941) |
| 🀙 1 Dots       | 24.06% (4,577) | 22.18% (4,906) | 22.75% (4,931) |
| 🀚 2 Dots       | 22.01% (4,679) | 23.84% (4,979) | 24.06% (4,975) |
| 🀛 3 Dots       | 24.82% (4,658) | 24.28% (4,889) | 24.34% (4,894) |
| 🀜 4 Dots       | 24.42% (4,668) | 24.75% (4,918) | 24.89% (4,906) |
| 🀝 5 Dots       | 23.97% (4,773) | 25.31% (5,018) | 25.07% (4,994) |
| 🀞 6 Dots       | 25.80% (4,631) | 25.14% (4,888) | 24.98% (4,892) |
| 🀟 7 Dots       | 25.79% (4,614) | 25.52% (4,909) | 25.61% (4,881) |
| 🀠 8 Dots       | 24.99% (4,790) | 24.08% (4,962) | 23.84% (4,963) |
| 🀡 9 Dots       | 24.64% (4,672) | 24.09% (4,935) | 23.85% (4,936) |
| 🀅 Green Dragon | 26.89% (4,723) | 26.40% (4,883) | 26.33% (4,880) |
| 🀄 Red Dragon  | 25.79% (4,576) | 26.04% (4,815) | 25.88% (4,826) |
| 🀆 White Dragon | 25.48% (4,710) | 25.78% (4,938) | 25.60% (4,925) |
| 🀀 East Wind    | 28.10% (4,729) | 26.18% (5,019) | 26.01% (4,990) |
| 🀁 South Wind   | 27.07% (4,644) | 26.45% (4,995) | 26.10% (5,004) |
| 🀂 West Wind    | 25.58% (4,649) | 26.75% (4,841) | 27.11% (4,814) |
| 🀃 North Wind   | 27.67% (4,597) | 26.83% (4,796) | 26.75% (4,796) |
| ★ Black Joker  | 20.15% (1,633) | 18.70% (1,658) | 18.51% (1,659) |
| ★ Blue Joker   | 35.03% (1,733) | 37.91% (1,849) | 38.47% (1,861) |
| ★ Green Joker  | 34.98% (1,738) | 35.07% (1,839) | 35.69% (1,835) |
| ★ Red Joker    | 33.18% (1,688) | 35.15% (1,775) | 35.80% (1,760) |
| □ Blank        | 17.85% (6,079) | 17.10% (6,276) | 17.33% (6,239) |

## Interpretation

- **Keep the locked-draw Riichi behavior.** Relative to Fold +2 with skipped draws, its opening pots, loans, action mix, Riichi win rate, and Hand distribution are almost unchanged. It preserves turn cadence and public discard information without changing the declared cards.
- **Fold +2 does not solve Riichi scarcity.** It lowers the Fold rate because accepting two future liabilities is worse, but Riichi remains below 1% of actions. If more Riichi is the goal, its declaration threshold or reward needs direct adjustment.
- **The economy needs an insolvency rule.** Between 2.8% and 3.6% of games failed when two Loans could no longer cover a mandatory charge. Define elimination, an all-in charge, a capped charge, or additional emergency credit before relying on long balance runs.
- **Joker colors are not equivalent.** In the selected profile, Blue/Green/Red Jokers win 38.47%/35.69%/35.80%; Black Joker wins only 18.51%, just 1.18 points above the 17.33% Blank and far below the roughly 25% four-player seat baseline.
- **The game is mostly decided before showdown.** Only 7.20% of selected-profile hands reach showdown and 60.79% of recorded winning Hands are High Card. More Calls or lower aggression would expose more of the five-card ladder.

The 90-game full-rollout sensitivity cohort retained the same main direction: Fold +2 increased opening pots and Loans, Raises remained far more common than Riichi, and the locked-draw rule did not cause a mechanical failure. Its sample is too small for tile-level conclusions.
