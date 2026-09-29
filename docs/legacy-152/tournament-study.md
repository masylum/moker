> Latest: [690-tournament balance study, including a frozen comparison and ten detailed cases](health/README.md). Earlier reports below are historical measurements, not the current recommendation.

# Legacy: four-game tournament study

**Audit update:** See [the deal and Lotus audit](deal-study.md). The earlier fallback counts below overcount draws of the last personal card, and the overlap averages include inactive empty-hand records. The new study corrects both. Showdown category counts remain valid, but zero Twin Lotus showdowns does not mean no pairs occurred: many pair holders won uncontested. The earlier Kong-reordering suggestion is provisional and should not be adopted from these counts alone.

## Recommendation

Keep the 14-card starting personal deck for now. It is not causing stagnant hands in this bot model. A larger starting deck reduces personal fallback draws and slightly reduces repeated opening cards, but removes central reserve. No tested starting size prevents personal deck exhaustion over four games. At six seats, personal collections converge to about nine cards regardless of whether they start with 14, 18, or 20.

Do not reorder the ladder solely by showdown best-hand frequency. The six-player deal strongly favors building matching-card combinations; Kong is much more frequent at showdown than its fresh-deck probability suggests. This is an actionable balancing concern, not evidence that all ranks should simply be sorted by observed counts. Keep the current ladder while testing a candidate change with bots that use that changed ladder.

If early tournament termination must be prevented, revisit circulation: central setup cards currently permanently enter personal decks. Returning an equal number to central at cleanup, or making the central contribution an exchange, are candidates to test. Neither rule was added by this change.

## Method

270 tournaments: 30 matched setup seeds per combination of 4/5/6 players and 14/18/20 starting personal cards. Each tournament requests four games, one hand per dealer per game: 16, 20, or 24 hands. All 270 completed, producing 5,400 hands. The earlier 90-tournament pilot is stored separately and is not pooled into these tables.

The simulation subclasses the production engine only to vary the initial personal-deck allocation. It uses the current 152-card deck, shared piles, Charleston, Treasures, Riichi sticks, betting, and production Legacy bots. Every action goes through the engine. Bots use 12 sampled hidden worlds per decision, compared with the browser default of 24. Setup seeds are `equilibrium:<players>:0` through `:29`; trajectories diverge across sizes. Bots optimize immediate hand strength and are not optimal long-term deck builders.

No observed exhaustion is not a guarantee: with 30 tournaments per configuration, zero failures still gives an approximate 95% upper bound of 9.5% on the true failure probability under this particular policy and seed distribution. Hands within a tournament are correlated. Rare-hand counts are not enough to calibrate a final ladder.

## Deck circulation

| Players | Initial deck | Central minimum | Tournaments with an empty personal deck | Fishing fallback draws per tournament | Distinct cards held per player | Shared cards between consecutive opening hands | Original deck retained at end | Final personal collection |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 4 | 14 | 67 | 18/30 | 5.5 | 78.9 | 1.43/7 | 8.5% | 13.3 |
| 4 | 18 | 52 | 11/30 | 2.0 | 82.6 | 1.15/7 | 11.4% | 14.9 |
| 4 | 20 | 51 | 7/30 | 1.2 | 84.8 | 1.03/7 | 11.3% | 15.8 |
| 5 | 14 | 37 | 15/30 | 2.3 | 91.6 | 1.19/7 | 9.7% | 15.7 |
| 5 | 18 | 12 | 10/30 | 1.0 | 94.9 | 1.03/7 | 10.9% | 17.7 |
| 5 | 20 | 12 | 2/30 | 0.3 | 95.8 | 0.91/7 | 13.2% | 19.7 |
| 6 | 14 | 60 | 30/30 | 66.3 | 79.1 | 2.21/7 | 6.9% | 9.2 |
| 6 | 18 | 30 | 30/30 | 43.4 | 85.3 | 1.91/7 | 6.4% | 9.5 |
| 6 | 20 | 18 | 30/30 | 36.1 | 88.0 | 1.77/7 | 6.2% | 9.3 |

Distinct cards held counts cards actually in a player’s hand, not rejected Treasure offers. Repeated opening cards compares consecutive pre-Charleston seven-card deals. Retention compares the final personal collection (undrawn deck plus final hand) with the original personal allocation. Fishing fallback counts normal deck draws completed by the bot when its personal deck was empty; it does not count setup fallback. Central minimum is the smallest observed central pile across steps, not its end-of-hand size. An empty personal deck is legal and triggers central fallback.

Four-player example: increasing from 14 to 18 cuts mean fallback draws from 5.5 to 2.0 per tournament, but the minimum observed central reserve falls from 67 to 52. At five players, 18/20-card starts reached only 12 central cards. At six players, 20-card starts still emptied a personal deck in all 30 tournaments and ended near nine cards per personal collection. Increasing the start primarily delays depletion.

## Showdown ladder

Counts include every non-folded, non-eliminated showdown participant, including Lotus-disqualified hands. Winners are counted separately; ties can contribute more than one winner. “Contains” counts overlapping patterns, while “best” assigns each player-hand to its strongest category under the current ladder. Because best-hand counts are affected by upgrades, folds, and bot preferences, they are not independent estimates of combination difficulty.

### Starting deck: 14

| Category | 4 players: best / contains | 5 players: best / contains | 6 players: best / contains |
|---|---:|---:|---:|
| high-card | 0.31% (2) / 100.00% | 0.78% (6) / 100.00% | 0.63% (11) / 100.00% |
| eye | 4.17% (27) / 88.72% | 4.96% (38) / 88.12% | 2.13% (37) / 81.04% |
| chow | 3.71% (24) / 40.65% | 3.79% (29) / 43.86% | 1.50% (26) / 28.53% |
| two-eyes | 17.31% (112) / 48.53% | 16.06% (123) / 47.65% | 4.44% (77) / 37.12% |
| pung | 3.25% (21) / 36.63% | 2.22% (17) / 34.99% | 2.48% (43) / 55.85% |
| three-winds | 6.49% (42) / 12.83% | 5.48% (42) / 9.14% | 3.34% (58) / 15.10% |
| chow-eye | 23.03% (149) / 33.38% | 25.59% (196) / 35.77% | 13.14% (228) / 21.27% |
| three-dragons | 0.77% (5) / 3.55% | 1.44% (11) / 4.31% | 1.10% (19) / 5.30% |
| pung-eye | 22.41% (145) / 24.57% | 23.63% (181) / 25.20% | 27.32% (474) / 30.72% |
| twin-lotus | 0.00% (0) / 0.00% | 0.00% (0) / 0.00% | 0.06% (1) / 0.06% |
| long-chow | 4.79% (31) / 4.95% | 6.79% (52) / 7.05% | 6.63% (115) / 6.63% |
| three-dragons-eye | 2.78% (18) / 2.78% | 2.74% (21) / 2.87% | 4.21% (73) / 4.21% |
| four-winds | 5.41% (35) / 5.41% | 3.26% (25) / 3.26% | 11.07% (192) / 11.07% |
| kong | 5.41% (35) / 5.56% | 3.26% (25) / 3.26% | 20.29% (352) / 21.96% |
| quint | 0.15% (1) / 0.15% | 0.00% (0) / 0.00% | 1.67% (29) / 1.67% |

Denominators: 4 players: 191 showdowns, 647 player-hands, 3 Lotus disqualifications; 5 players: 213 showdowns, 766 player-hands, 1 Lotus disqualifications; 6 players: 471 showdowns, 1735 player-hands, 5 Lotus disqualifications.

| Category | 4 players: winning hands | 5 players: winning hands | 6 players: winning hands |
|---|---:|---:|---:|
| high-card | 0 | 0 | 0 |
| eye | 0 | 0 | 0 |
| chow | 0 | 0 | 0 |
| two-eyes | 4 | 2 | 0 |
| pung | 2 | 0 | 0 |
| three-winds | 4 | 4 | 0 |
| chow-eye | 34 | 33 | 4 |
| three-dragons | 2 | 3 | 1 |
| pung-eye | 59 | 78 | 60 |
| twin-lotus | 0 | 0 | 0 |
| long-chow | 23 | 35 | 31 |
| three-dragons-eye | 8 | 18 | 35 |
| four-winds | 27 | 21 | 110 |
| kong | 29 | 22 | 240 |
| quint | 1 | 0 | 28 |

### Starting deck: 18

| Category | 4 players: best / contains | 5 players: best / contains | 6 players: best / contains |
|---|---:|---:|---:|
| high-card | 0.59% (4) / 100.00% | 0.68% (6) / 100.00% | 0.70% (11) / 100.00% |
| eye | 5.04% (34) / 88.43% | 4.07% (36) / 87.46% | 2.42% (38) / 82.79% |
| chow | 5.93% (40) / 45.40% | 4.52% (40) / 44.97% | 1.78% (28) / 32.25% |
| two-eyes | 18.84% (127) / 47.63% | 18.42% (163) / 49.38% | 6.63% (104) / 40.60% |
| pung | 3.26% (22) / 31.90% | 2.94% (26) / 32.32% | 2.36% (37) / 53.41% |
| three-winds | 5.34% (36) / 9.05% | 5.65% (50) / 8.81% | 4.08% (64) / 14.09% |
| chow-eye | 27.30% (184) / 35.46% | 28.36% (251) / 36.95% | 15.87% (249) / 25.05% |
| three-dragons | 0.89% (6) / 2.82% | 1.36% (12) / 3.95% | 1.59% (25) / 5.16% |
| pung-eye | 19.73% (133) / 21.36% | 22.49% (199) / 23.39% | 26.64% (418) / 30.91% |
| twin-lotus | 0.30% (2) / 0.30% | 0.11% (1) / 0.11% | 0.00% (0) / 0.00% |
| long-chow | 5.04% (34) / 5.04% | 4.75% (42) / 4.75% | 6.95% (109) / 7.01% |
| three-dragons-eye | 1.78% (12) / 1.78% | 2.60% (23) / 2.60% | 3.44% (54) / 3.57% |
| four-winds | 2.23% (15) / 2.23% | 2.26% (20) / 2.26% | 8.41% (132) / 8.48% |
| kong | 3.56% (24) / 3.71% | 1.81% (16) / 1.81% | 18.23% (286) / 19.12% |
| quint | 0.15% (1) / 0.15% | 0.00% (0) / 0.00% | 0.89% (14) / 0.89% |

Denominators: 4 players: 196 showdowns, 674 player-hands, 0 Lotus disqualifications; 5 players: 235 showdowns, 885 player-hands, 0 Lotus disqualifications; 6 players: 429 showdowns, 1569 player-hands, 5 Lotus disqualifications.

| Category | 4 players: winning hands | 5 players: winning hands | 6 players: winning hands |
|---|---:|---:|---:|
| high-card | 0 | 0 | 0 |
| eye | 0 | 0 | 0 |
| chow | 0 | 0 | 0 |
| two-eyes | 2 | 0 | 0 |
| pung | 2 | 0 | 1 |
| three-winds | 6 | 1 | 0 |
| chow-eye | 55 | 54 | 7 |
| three-dragons | 1 | 1 | 3 |
| pung-eye | 62 | 94 | 69 |
| twin-lotus | 1 | 0 | 0 |
| long-chow | 25 | 34 | 32 |
| three-dragons-eye | 9 | 20 | 29 |
| four-winds | 12 | 18 | 79 |
| kong | 23 | 16 | 213 |
| quint | 1 | 0 | 13 |

### Starting deck: 20

| Category | 4 players: best / contains | 5 players: best / contains | 6 players: best / contains |
|---|---:|---:|---:|
| high-card | 1.57% (11) / 100.00% | 1.75% (16) / 100.00% | 1.74% (28) / 100.00% |
| eye | 7.71% (54) / 88.14% | 6.12% (56) / 86.01% | 3.22% (52) / 79.42% |
| chow | 5.57% (39) / 42.43% | 5.14% (47) / 42.73% | 1.98% (32) / 38.25% |
| two-eyes | 21.14% (148) / 45.86% | 21.31% (195) / 46.34% | 8.37% (135) / 40.30% |
| pung | 4.14% (29) / 28.14% | 3.50% (32) / 26.99% | 2.67% (43) / 45.13% |
| three-winds | 5.14% (36) / 8.29% | 5.57% (51) / 8.52% | 5.33% (86) / 14.88% |
| chow-eye | 26.57% (186) / 33.14% | 25.36% (232) / 32.90% | 18.60% (300) / 28.64% |
| three-dragons | 1.14% (8) / 3.29% | 1.31% (12) / 3.28% | 1.30% (21) / 4.09% |
| pung-eye | 16.43% (115) / 17.86% | 17.81% (163) / 18.69% | 25.79% (416) / 28.33% |
| twin-lotus | 0.00% (0) / 0.00% | 0.44% (4) / 0.44% | 0.25% (4) / 0.25% |
| long-chow | 3.43% (24) / 3.43% | 5.25% (48) / 5.25% | 8.80% (142) / 8.87% |
| three-dragons-eye | 2.14% (15) / 2.14% | 1.97% (18) / 1.97% | 2.67% (43) / 2.73% |
| four-winds | 2.43% (17) / 2.43% | 2.30% (21) / 2.30% | 8.49% (137) / 8.56% |
| kong | 2.57% (18) / 2.57% | 1.97% (18) / 2.19% | 10.60% (171) / 10.79% |
| quint | 0.00% (0) / 0.00% | 0.22% (2) / 0.22% | 0.19% (3) / 0.19% |

Denominators: 4 players: 198 showdowns, 700 player-hands, 1 Lotus disqualifications; 5 players: 236 showdowns, 915 player-hands, 1 Lotus disqualifications; 6 players: 424 showdowns, 1613 player-hands, 13 Lotus disqualifications.

| Category | 4 players: winning hands | 5 players: winning hands | 6 players: winning hands |
|---|---:|---:|---:|
| high-card | 0 | 0 | 0 |
| eye | 0 | 0 | 1 |
| chow | 0 | 0 | 0 |
| two-eyes | 5 | 2 | 0 |
| pung | 3 | 1 | 0 |
| three-winds | 2 | 4 | 2 |
| chow-eye | 64 | 57 | 12 |
| three-dragons | 4 | 5 | 1 |
| pung-eye | 56 | 80 | 98 |
| twin-lotus | 0 | 0 | 1 |
| long-chow | 18 | 38 | 63 |
| three-dragons-eye | 14 | 16 | 19 |
| four-winds | 16 | 17 | 105 |
| kong | 17 | 15 | 142 |
| quint | 0 | 2 | 3 |

### What changes the interpretation

- With 14-card starts at six players, Kong is the best hand in 20.29% of showdown player-hands and Quint in 1.67%. These are far above fresh-deck rates. Six players also have more hands per tournament and a 6-personal/1-central deal rather than 5/2, so player count is confounded with both tournament length and deal mix.
- Chow + Eyes and Pung + Eyes are common destinations. Standalone Eyes, Chows, and Pungs are often upgraded before showdown or folded, so their low best-hand frequency does not justify promoting them.
- Twin Lotus is almost absent. A single Lotus disqualifies a hand, and bots strongly avoid holding it; low showdown frequency reflects that incentive and policy, not just combinatorics.
- A useful next ladder experiment is lowering Kong relative to Four Winds and Three Dragons + Eyes in the six-player environment, then rerunning with that candidate ladder. Another is testing a common personal/central deal ratio across player counts. Neither change was silently applied.

## Passive-play stress test

All players pass in Charleston, then fold immediately when betting. No fishing replenishes central. This is intentionally adversarial but legal, and demonstrates why initial size alone cannot guarantee full tournaments.

| Players | Initial deck | Completed hands before central cannot fund next deal | Scheduled hands |
|---|---:|---:|---:|
| 4 | 14 | 11 | 16 |
| 4 | 18 | 9 | 16 |
| 4 | 20 | 8 | 16 |
| 5 | 14 | 8 | 20 |
| 5 | 18 | 6 | 20 |
| 5 | 20 | 5 | 20 |
| 6 | 14 | 11 | 24 |
| 6 | 18 | 7 | 24 |
| 6 | 20 | 5 | 24 |

Without fishing, each completed hand permanently moves 2 × player-count central cards into personal collections for 4–5 players, or 1 × player-count for six players. Lane seeds return to central at cleanup. Increasing the initial personal allocation reduces the pool that funds those transfers. The existing early-ending rule scores completed hands and remains in force.

## Reproduction

```sh
npx tsx scripts/legacy-tournaments.ts 30 14,18,20 12 docs/legacy-152/tournaments-final.json
npx tsx scripts/legacy-passive-stress.ts
```

The six-player 18/20 runs were executed separately with the same seeds/settings and merged into the final JSON; the per-size raw outputs are preserved. No failed seeds were skipped. `tournaments.json` is the earlier ten-seed/eight-world pilot.

## UI changes and verification

- Personal face-down deck and count at every seat; own-deck fishing and central fallback use the actual recorded draw origin for animation.
- Fishing enables only appropriate pile/Blank/Treasure/own-deck choices. Treasure selection highlights nonempty opponent decks and central; the own deck is excluded.
- Treasure offers appear in a modal overlay; taking two cards reveals clickable concealed return-card choices. No inline menu or dropdown shifts the table.
- Browser verification: four-player Treasure hunt and two-card exchange; own-deck stick draw; six-player deck/label layout.
- Regression coverage includes actual origin metadata through save/restore, fallback behavior, and preserving hidden drawn-card privacy.
