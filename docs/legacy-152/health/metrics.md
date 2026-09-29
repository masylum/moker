# Legacy health metrics

Each row below covers ten four-game tournaments of the given player count unless its tournament count says otherwise. A “win” means winning at least one pot, including tied and side-pot wins. It need not mean a positive chip profit. Opening cards are the seven cards dealt **before Charleston**. Conditional card win rates are associations, not causal card values: the same card can recur in a strong player’s collection.

Configurations: **validation-current** uses the live deal (5+2 for 4–5 players; 6+1 for six) and current ladder. **validation-candidate** alternates 5+2 and 6+1, using ladder B. **validation-rarity** also raises Three Winds above Pung and Eyes (ladder C). **rotation-one/two/three** add that many random, equal-size card exchanges with central between games to B. **final-prototype** adds the one-card exchange to C. The validation and rotation arms use seeds 100–109 and 24 hidden-world samples. The final frozen comparison, confirmation-current versus confirmation-prototype, uses previously unused seeds 200–209, also with 24 samples. Confirmation uses the same rules as validation-current and final-prototype respectively.

Exchanges are research-only: select the replacement from central before returning the outgoing random personal card; shuffle both decks. Process players in seat order. Personal and central deck sizes do not change. There is no cap, trimming, additional card creation, or exchange during a hand.

“Weak opening” means its combination category is below at least half of the active seats (ties do not manufacture a bottom half); kickers are ignored. “Eliminations” counts player/game episodes, so one person eliminated in three games counts three times. “Repeated core” uses the same player, winning category, and multiset of selected card faces; a Joker substitution with different selected faces counts as a different core.

## validation-current

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 158 | 64 | 0 | 77 | 12.55 (7–22) | 4.2 | 1.55/7 |
| 5 | 10 | 200 | 66 | 0 | 22 | 17.86 (7–35) | 1.6 | 1.23/7 |
| 6 | 10 | 240 | 152 | 0 | 58 | 9.05 (7–18) | 26.4 | 2.41/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 23/218 (10.55%) | 27/218 | 6/10 | 3/10 | 3/160 | 10 | 10 |
| 5 | 13/179 (7.26%) | 18/179 | 3/10 | 2/10 | 1/200 | 9 | 12 |
| 6 | 20/499 (4.01%) | 24/499 | 0/10 | 4/10 | 41/240 | 93 | 61 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 372/428 | 58 | 54 | 176 | 1100 | 0 | 6, 4, 2, 4, 3, 2, 5, 1, 2, 5 |
| 5 | 448/462 | 34 | 31 | 278 | 1200 | 0 | 2, 2, 2, 2, 2, 6, 3, 1, 1, 1 |
| 6 | 557/692 | 139 | 106 | 266 | 3720 | 2 | 3, 8, 5, 5, 5, 7, 17, 10, 12, 3 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 0.0% → 2.63% → 5.62% → 5.0% | 0.42% → 5.22% → 11.62% → 18.62% |
| 5 | 1.2% → 2.0% → 1.61% → 1.2% | 0.88% → 5.18% → 6.74% → 3.12% |
| 6 | 3.61% → 12.57% → 16.51% → 21.26% | 1.37% → 13.75% → 28.13% → 42.05% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 632 dealt player-hands; 210 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 632/632 | 632/632 | 210/210 | 1/210 | 0/158 |
| eye | 346/632 | 510/632 | 180/210 | 11/210 | 0/158 |
| chow | 89/632 | 207/632 | 91/210 | 7/210 | 0/158 |
| two-eyes | 59/632 | 262/632 | 107/210 | 37/210 | 0/158 |
| pung | 57/632 | 197/632 | 64/210 | 2/210 | 0/158 |
| three-winds | 36/632 | 72/632 | 26/210 | 14/210 | 2/158 |
| chow-eye | 16/632 | 138/632 | 71/210 | 57/210 | 16/158 |
| three-dragons | 5/632 | 14/632 | 2/210 | 0/210 | 2/158 |
| pung-eye | 12/632 | 124/632 | 46/210 | 42/210 | 43/158 |
| twin-lotus | 0/632 | 1/632 | 0/210 | 0/210 | 1/158 |
| long-chow | 1/632 | 24/632 | 12/210 | 12/210 | 19/158 |
| three-dragons-eye | 1/632 | 11/632 | 2/210 | 2/210 | 5/158 |
| four-winds | 4/632 | 40/632 | 11/210 | 11/210 | 35/158 |
| kong | 6/632 | 38/632 | 14/210 | 14/210 | 35/158 |
| quint | 0/632 | 0/632 | 0/210 | 0/210 | 0/158 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 43/122 | 35.2% | 117/510 | 22.9% |
| blank | 39/140 | 27.9% | 121/492 | 24.6% |
| treasure | 33/150 | 22.0% | 127/482 | 26.3% |
| single_lotus | 8/29 | 27.6% | 152/603 | 25.2% |
| twin_lotus | 0/0 | — | 160/632 | 25.3% |
| two_dragon_types | 10/43 | 23.3% | 150/589 | 25.5% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 24/107 | 22.4% |
| bamboo-2 | 18/86 | 20.9% |
| bamboo-3 | 25/109 | 22.9% |
| bamboo-4 | 27/105 | 25.7% |
| bamboo-5 | 36/136 | 26.5% |
| bamboo-6 | 30/130 | 23.1% |
| bamboo-7 | 29/111 | 26.1% |
| bamboo-8 | 24/81 | 29.6% |
| bamboo-9 | 15/60 | 25.0% |
| blank | 39/140 | 27.9% |
| characters-1 | 26/98 | 26.5% |
| characters-2 | 24/97 | 24.7% |
| characters-3 | 31/108 | 28.7% |
| characters-4 | 22/107 | 20.6% |
| characters-5 | 24/117 | 20.5% |
| characters-6 | 16/84 | 19.0% |
| characters-7 | 15/97 | 15.5% |
| characters-8 | 23/111 | 20.7% |
| characters-9 | 23/98 | 23.5% |
| dots-1 | 19/89 | 21.3% |
| dots-2 | 12/93 | 12.9% |
| dots-3 | 23/101 | 22.8% |
| dots-4 | 19/90 | 21.1% |
| dots-5 | 21/106 | 19.8% |
| dots-6 | 26/107 | 24.3% |
| dots-7 | 21/109 | 19.3% |
| dots-8 | 20/107 | 18.7% |
| dots-9 | 30/93 | 32.3% |
| dragon-green | 21/95 | 22.1% |
| dragon-red | 22/100 | 22.0% |
| dragon-white | 29/109 | 26.6% |
| flower-black-lotus | 4/13 | 30.8% |
| flower-white-lotus | 4/16 | 25.0% |
| joker-black | 13/26 | 50.0% |
| joker-blue | 10/27 | 37.0% |
| joker-green | 9/39 | 23.1% |
| joker-red | 12/38 | 31.6% |
| treasure-1 | 8/35 | 22.9% |
| treasure-2 | 7/35 | 20.0% |
| treasure-3 | 6/24 | 25.0% |
| treasure-4 | 6/35 | 17.1% |
| treasure-5 | 7/33 | 21.2% |
| wind-east | 31/109 | 28.4% |
| wind-north | 38/116 | 32.8% |
| wind-south | 38/127 | 29.9% |
| wind-west | 42/108 | 38.9% |

### 5 players: ladder

Denominators: 998 dealt player-hands; 237 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 998/998 | 998/998 | 237/237 | 4/237 | 0/200 |
| eye | 466/998 | 764/998 | 212/237 | 10/237 | 0/200 |
| chow | 124/998 | 341/998 | 94/237 | 6/237 | 0/200 |
| two-eyes | 70/998 | 387/998 | 130/237 | 50/237 | 0/200 |
| pung | 49/998 | 227/998 | 78/237 | 5/237 | 0/200 |
| three-winds | 34/998 | 70/998 | 18/237 | 11/237 | 0/200 |
| chow-eye | 25/998 | 216/998 | 80/237 | 63/237 | 17/200 |
| three-dragons | 4/998 | 32/998 | 10/237 | 1/237 | 12/200 |
| pung-eye | 8/998 | 161/998 | 58/237 | 56/237 | 86/200 |
| twin-lotus | 1/998 | 10/998 | 1/237 | 1/237 | 8/200 |
| long-chow | 3/998 | 29/998 | 9/237 | 9/237 | 25/200 |
| three-dragons-eye | 2/998 | 15/998 | 9/237 | 9/237 | 12/200 |
| four-winds | 2/998 | 26/998 | 6/237 | 6/237 | 24/200 |
| kong | 0/998 | 17/998 | 6/237 | 6/237 | 16/200 |
| quint | 0/998 | 0/998 | 0/237 | 0/237 | 0/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 58/161 | 36.0% | 144/837 | 17.2% |
| blank | 48/218 | 22.0% | 154/780 | 19.7% |
| treasure | 49/251 | 19.5% | 153/747 | 20.5% |
| single_lotus | 7/72 | 9.7% | 195/926 | 21.1% |
| twin_lotus | 1/1 | 100.0% | 201/997 | 20.2% |
| two_dragon_types | 7/61 | 11.5% | 195/937 | 20.8% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 28/127 | 22.0% |
| bamboo-2 | 28/166 | 16.9% |
| bamboo-3 | 35/175 | 20.0% |
| bamboo-4 | 31/167 | 18.6% |
| bamboo-5 | 24/166 | 14.5% |
| bamboo-6 | 28/164 | 17.1% |
| bamboo-7 | 39/196 | 19.9% |
| bamboo-8 | 29/174 | 16.7% |
| bamboo-9 | 43/179 | 24.0% |
| blank | 48/218 | 22.0% |
| characters-1 | 36/156 | 23.1% |
| characters-2 | 29/168 | 17.3% |
| characters-3 | 27/146 | 18.5% |
| characters-4 | 34/155 | 21.9% |
| characters-5 | 27/151 | 17.9% |
| characters-6 | 36/180 | 20.0% |
| characters-7 | 31/150 | 20.7% |
| characters-8 | 28/175 | 16.0% |
| characters-9 | 28/160 | 17.5% |
| dots-1 | 29/161 | 18.0% |
| dots-2 | 31/162 | 19.1% |
| dots-3 | 32/195 | 16.4% |
| dots-4 | 36/170 | 21.2% |
| dots-5 | 30/161 | 18.6% |
| dots-6 | 39/193 | 20.2% |
| dots-7 | 35/204 | 17.2% |
| dots-8 | 20/160 | 12.5% |
| dots-9 | 32/161 | 19.9% |
| dragon-green | 24/156 | 15.4% |
| dragon-red | 37/160 | 23.1% |
| dragon-white | 40/151 | 26.5% |
| flower-black-lotus | 5/37 | 13.5% |
| flower-white-lotus | 4/37 | 10.8% |
| joker-black | 10/30 | 33.3% |
| joker-blue | 16/49 | 32.7% |
| joker-green | 20/46 | 43.5% |
| joker-red | 15/43 | 34.9% |
| treasure-1 | 8/54 | 14.8% |
| treasure-2 | 9/52 | 17.3% |
| treasure-3 | 18/57 | 31.6% |
| treasure-4 | 9/48 | 18.8% |
| treasure-5 | 10/60 | 16.7% |
| wind-east | 32/165 | 19.4% |
| wind-north | 35/176 | 19.9% |
| wind-south | 41/182 | 22.5% |
| wind-west | 26/157 | 16.6% |

### 6 players: ladder

Denominators: 1326 dealt player-hands; 560 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1326/1326 | 1326/1326 | 560/560 | 2/560 | 0/240 |
| eye | 810/1326 | 1008/1326 | 467/560 | 9/560 | 0/240 |
| chow | 249/1326 | 379/1326 | 178/560 | 8/560 | 0/240 |
| two-eyes | 197/1326 | 412/1326 | 203/560 | 35/560 | 0/240 |
| pung | 291/1326 | 447/1326 | 310/560 | 13/560 | 0/240 |
| three-winds | 87/1326 | 125/1326 | 68/560 | 18/560 | 0/240 |
| chow-eye | 78/1326 | 238/1326 | 146/560 | 89/560 | 3/240 |
| three-dragons | 22/1326 | 56/1326 | 35/560 | 13/560 | 4/240 |
| pung-eye | 70/1326 | 215/1326 | 152/560 | 127/560 | 31/240 |
| twin-lotus | 5/1326 | 11/1326 | 5/560 | 5/560 | 4/240 |
| long-chow | 13/1326 | 56/1326 | 34/560 | 34/560 | 25/240 |
| three-dragons-eye | 5/1326 | 35/1326 | 22/560 | 21/560 | 11/240 |
| four-winds | 22/1326 | 67/1326 | 45/560 | 45/560 | 25/240 |
| kong | 70/1326 | 179/1326 | 141/560 | 124/560 | 119/240 |
| quint | 9/1326 | 19/1326 | 17/560 | 17/560 | 18/240 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 132/364 | 36.3% | 109/962 | 11.3% |
| blank | 40/285 | 14.0% | 201/1041 | 19.3% |
| treasure | 43/325 | 13.2% | 198/1001 | 19.8% |
| single_lotus | 9/53 | 17.0% | 232/1273 | 18.2% |
| twin_lotus | 1/5 | 20.0% | 240/1321 | 18.2% |
| two_dragon_types | 14/90 | 15.6% | 227/1236 | 18.4% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 38/184 | 20.7% |
| bamboo-2 | 28/197 | 14.2% |
| bamboo-3 | 32/175 | 18.3% |
| bamboo-4 | 22/174 | 12.6% |
| bamboo-5 | 40/168 | 23.8% |
| bamboo-6 | 39/202 | 19.3% |
| bamboo-7 | 42/285 | 14.7% |
| bamboo-8 | 20/178 | 11.2% |
| bamboo-9 | 34/226 | 15.0% |
| blank | 40/285 | 14.0% |
| characters-1 | 21/208 | 10.1% |
| characters-2 | 22/210 | 10.5% |
| characters-3 | 28/199 | 14.1% |
| characters-4 | 40/205 | 19.5% |
| characters-5 | 50/265 | 18.9% |
| characters-6 | 36/239 | 15.1% |
| characters-7 | 31/230 | 13.5% |
| characters-8 | 31/203 | 15.3% |
| characters-9 | 47/203 | 23.2% |
| dots-1 | 36/197 | 18.3% |
| dots-2 | 25/188 | 13.3% |
| dots-3 | 22/138 | 15.9% |
| dots-4 | 14/137 | 10.2% |
| dots-5 | 35/210 | 16.7% |
| dots-6 | 31/202 | 15.3% |
| dots-7 | 36/189 | 19.0% |
| dots-8 | 37/219 | 16.9% |
| dots-9 | 25/171 | 14.6% |
| dragon-green | 29/218 | 13.3% |
| dragon-red | 22/194 | 11.3% |
| dragon-white | 32/192 | 16.7% |
| flower-black-lotus | 4/36 | 11.1% |
| flower-white-lotus | 7/27 | 25.9% |
| joker-black | 16/70 | 22.9% |
| joker-blue | 23/95 | 24.2% |
| joker-green | 41/97 | 42.3% |
| joker-red | 57/123 | 46.3% |
| treasure-1 | 6/66 | 9.1% |
| treasure-2 | 6/79 | 7.6% |
| treasure-3 | 10/68 | 14.7% |
| treasure-4 | 4/73 | 5.5% |
| treasure-5 | 17/69 | 24.6% |
| wind-east | 50/244 | 20.5% |
| wind-north | 31/246 | 12.6% |
| wind-south | 41/242 | 16.9% |
| wind-west | 33/194 | 17.0% |

## validation-candidate

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 160 | 68 | 0 | 86 | 9.4 (7–15) | 11.4 | 2.1/7 |
| 5 | 10 | 200 | 75 | 0 | 59 | 11.76 (7–18) | 5.4 | 1.74/7 |
| 6 | 10 | 240 | 123 | 0 | 40 | 12.12 (7–22) | 9.6 | 1.79/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 29/228 (12.72%) | 33/228 | 4/10 | 5/10 | 2/160 | 10 | 13 |
| 5 | 23/267 (8.61%) | 26/267 | 1/10 | 2/10 | 3/200 | 22 | 19 |
| 6 | 40/484 (8.26%) | 44/484 | 3/10 | 2/10 | 21/240 | 55 | 70 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 341/376 | 33 | 28 | 145 | 1520 | 0 | 2, 3, 6, 3, 3, 10, 2, 2, 4, 2 |
| 5 | 449/478 | 39 | 39 | 217 | 2120 | 0 | 8, 4, 4, 1, 1, 4, 2, 2, 3, 2 |
| 6 | 568/616 | 72 | 68 | 310 | 2500 | 0 | 3, 5, 6, 2, 4, 3, 4, 4, 5, 4 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 3.75% → 6.25% → 8.12% → 11.39% | 0.42% → 12.35% → 22.05% → 28.75% |
| 5 | 0.4% → 3.24% → 4.07% → 4.4% | 0.88% → 6.3% → 14.88% → 8.24% |
| 6 | 1.39% → 4.79% → 10.06% → 8.45% | 1.07% → 11.8% → 23.78% → 22.62% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 638 dealt player-hands; 202 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 638/638 | 638/638 | 202/202 | 1/202 | 0/160 |
| eye | 384/638 | 508/638 | 169/202 | 4/202 | 0/160 |
| chow | 118/638 | 227/638 | 90/202 | 8/202 | 0/160 |
| two-eyes | 82/638 | 268/638 | 103/202 | 23/202 | 1/160 |
| pung | 89/638 | 215/638 | 89/202 | 7/202 | 1/160 |
| three-winds | 31/638 | 52/638 | 16/202 | 4/202 | 0/160 |
| chow-eye | 36/638 | 151/638 | 67/202 | 42/202 | 6/160 |
| pung-eye | 21/638 | 147/638 | 66/202 | 59/202 | 52/160 |
| three-dragons | 8/638 | 19/638 | 6/202 | 4/202 | 9/160 |
| kong | 13/638 | 43/638 | 17/202 | 11/202 | 23/160 |
| long-chow | 8/638 | 38/638 | 22/202 | 22/202 | 26/160 |
| four-winds | 5/638 | 27/638 | 9/202 | 9/202 | 22/160 |
| three-dragons-eye | 1/638 | 7/638 | 2/202 | 2/202 | 7/160 |
| twin-lotus | 2/638 | 4/638 | 0/202 | 0/202 | 4/160 |
| quint | 2/638 | 9/638 | 6/202 | 6/202 | 9/160 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 58/141 | 41.1% | 105/497 | 21.1% |
| blank | 44/149 | 29.5% | 119/489 | 24.3% |
| treasure | 19/132 | 14.4% | 144/506 | 28.5% |
| single_lotus | 4/22 | 18.2% | 159/616 | 25.8% |
| twin_lotus | 2/2 | 100.0% | 161/636 | 25.3% |
| two_dragon_types | 18/43 | 41.9% | 145/595 | 24.4% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 15/72 | 20.8% |
| bamboo-2 | 25/124 | 20.2% |
| bamboo-3 | 28/134 | 20.9% |
| bamboo-4 | 17/85 | 20.0% |
| bamboo-5 | 25/112 | 22.3% |
| bamboo-6 | 27/111 | 24.3% |
| bamboo-7 | 22/103 | 21.4% |
| bamboo-8 | 19/80 | 23.8% |
| bamboo-9 | 20/80 | 25.0% |
| blank | 44/149 | 29.5% |
| characters-1 | 18/94 | 19.1% |
| characters-2 | 18/109 | 16.5% |
| characters-3 | 17/93 | 18.3% |
| characters-4 | 32/118 | 27.1% |
| characters-5 | 33/138 | 23.9% |
| characters-6 | 22/86 | 25.6% |
| characters-7 | 40/117 | 34.2% |
| characters-8 | 27/103 | 26.2% |
| characters-9 | 20/86 | 23.3% |
| dots-1 | 20/82 | 24.4% |
| dots-2 | 14/96 | 14.6% |
| dots-3 | 20/90 | 22.2% |
| dots-4 | 20/96 | 20.8% |
| dots-5 | 15/89 | 16.9% |
| dots-6 | 25/102 | 24.5% |
| dots-7 | 23/115 | 20.0% |
| dots-8 | 19/70 | 27.1% |
| dots-9 | 27/113 | 23.9% |
| dragon-green | 40/112 | 35.7% |
| dragon-red | 29/89 | 32.6% |
| dragon-white | 28/91 | 30.8% |
| flower-black-lotus | 4/12 | 33.3% |
| flower-white-lotus | 4/14 | 28.6% |
| joker-black | 12/33 | 36.4% |
| joker-blue | 13/34 | 38.2% |
| joker-green | 17/39 | 43.6% |
| joker-red | 23/50 | 46.0% |
| treasure-1 | 5/30 | 16.7% |
| treasure-2 | 4/40 | 10.0% |
| treasure-3 | 4/27 | 14.8% |
| treasure-4 | 2/11 | 18.2% |
| treasure-5 | 6/34 | 17.6% |
| wind-east | 23/102 | 22.5% |
| wind-north | 34/133 | 25.6% |
| wind-south | 31/106 | 29.2% |
| wind-west | 32/107 | 29.9% |

### 5 players: ladder

Denominators: 993 dealt player-hands; 240 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 993/993 | 993/993 | 240/240 | 0/240 | 0/200 |
| eye | 558/993 | 796/993 | 218/240 | 6/240 | 0/200 |
| chow | 168/993 | 324/993 | 107/240 | 6/240 | 0/200 |
| two-eyes | 110/993 | 405/993 | 116/240 | 24/240 | 1/200 |
| pung | 111/993 | 277/993 | 118/240 | 1/240 | 0/200 |
| three-winds | 31/993 | 66/993 | 20/240 | 11/240 | 0/200 |
| chow-eye | 45/993 | 216/993 | 90/240 | 58/240 | 9/200 |
| pung-eye | 16/993 | 173/993 | 79/240 | 73/240 | 66/200 |
| three-dragons | 9/993 | 39/993 | 14/240 | 1/240 | 12/200 |
| kong | 9/993 | 48/993 | 24/240 | 21/240 | 30/200 |
| long-chow | 3/993 | 37/993 | 17/240 | 17/240 | 28/200 |
| four-winds | 3/993 | 26/993 | 7/240 | 7/240 | 25/200 |
| three-dragons-eye | 2/993 | 26/993 | 13/240 | 13/240 | 26/200 |
| twin-lotus | 0/993 | 1/993 | 0/240 | 0/240 | 1/200 |
| quint | 0/993 | 2/993 | 2/240 | 2/240 | 2/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 92/228 | 40.4% | 111/765 | 14.5% |
| blank | 39/196 | 19.9% | 164/797 | 20.6% |
| treasure | 40/219 | 18.3% | 163/774 | 21.1% |
| single_lotus | 12/57 | 21.1% | 191/936 | 20.4% |
| twin_lotus | 0/0 | — | 203/993 | 20.4% |
| two_dragon_types | 18/69 | 26.1% | 185/924 | 20.0% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 26/122 | 21.3% |
| bamboo-2 | 24/133 | 18.0% |
| bamboo-3 | 31/183 | 16.9% |
| bamboo-4 | 21/115 | 18.3% |
| bamboo-5 | 36/155 | 23.2% |
| bamboo-6 | 39/194 | 20.1% |
| bamboo-7 | 41/190 | 21.6% |
| bamboo-8 | 35/149 | 23.5% |
| bamboo-9 | 33/169 | 19.5% |
| blank | 39/196 | 19.9% |
| characters-1 | 27/127 | 21.3% |
| characters-2 | 31/185 | 16.8% |
| characters-3 | 30/153 | 19.6% |
| characters-4 | 23/156 | 14.7% |
| characters-5 | 38/181 | 21.0% |
| characters-6 | 40/184 | 21.7% |
| characters-7 | 24/164 | 14.6% |
| characters-8 | 40/185 | 21.6% |
| characters-9 | 28/163 | 17.2% |
| dots-1 | 18/142 | 12.7% |
| dots-2 | 30/159 | 18.9% |
| dots-3 | 23/159 | 14.5% |
| dots-4 | 29/147 | 19.7% |
| dots-5 | 33/161 | 20.5% |
| dots-6 | 28/184 | 15.2% |
| dots-7 | 30/178 | 16.9% |
| dots-8 | 23/159 | 14.5% |
| dots-9 | 22/155 | 14.2% |
| dragon-green | 45/184 | 24.5% |
| dragon-red | 29/150 | 19.3% |
| dragon-white | 42/154 | 27.3% |
| flower-black-lotus | 3/31 | 9.7% |
| flower-white-lotus | 9/26 | 34.6% |
| joker-black | 17/49 | 34.7% |
| joker-blue | 17/55 | 30.9% |
| joker-green | 33/66 | 50.0% |
| joker-red | 30/69 | 43.5% |
| treasure-1 | 10/58 | 17.2% |
| treasure-2 | 10/43 | 23.3% |
| treasure-3 | 8/40 | 20.0% |
| treasure-4 | 8/43 | 18.6% |
| treasure-5 | 7/52 | 13.5% |
| wind-east | 33/176 | 18.8% |
| wind-north | 21/140 | 15.0% |
| wind-south | 38/185 | 20.5% |
| wind-west | 34/142 | 23.9% |

### 6 players: ladder

Denominators: 1386 dealt player-hands; 418 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1386/1386 | 1386/1386 | 418/418 | 2/418 | 0/240 |
| eye | 783/1386 | 1075/1386 | 346/418 | 4/418 | 0/240 |
| chow | 229/1386 | 425/1386 | 154/418 | 7/418 | 0/240 |
| two-eyes | 143/1386 | 518/1386 | 179/418 | 29/418 | 0/240 |
| pung | 189/1386 | 435/1386 | 223/418 | 11/418 | 0/240 |
| three-winds | 74/1386 | 126/1386 | 51/418 | 9/418 | 0/240 |
| chow-eye | 64/1386 | 271/1386 | 111/418 | 70/418 | 1/240 |
| pung-eye | 38/1386 | 243/1386 | 128/418 | 111/418 | 53/240 |
| three-dragons | 17/1386 | 46/1386 | 27/418 | 9/418 | 9/240 |
| kong | 25/1386 | 112/1386 | 77/418 | 69/418 | 53/240 |
| long-chow | 8/1386 | 61/1386 | 36/418 | 36/418 | 30/240 |
| four-winds | 14/1386 | 68/1386 | 36/418 | 36/418 | 60/240 |
| three-dragons-eye | 2/1386 | 24/1386 | 18/418 | 18/418 | 23/240 |
| twin-lotus | 0/1386 | 0/1386 | 0/418 | 0/418 | 0/240 |
| quint | 1/1386 | 11/1386 | 7/418 | 7/418 | 11/240 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 97/322 | 30.1% | 146/1064 | 13.7% |
| blank | 43/274 | 15.7% | 200/1112 | 18.0% |
| treasure | 36/308 | 11.7% | 207/1078 | 19.2% |
| single_lotus | 7/53 | 13.2% | 236/1333 | 17.7% |
| twin_lotus | 0/0 | — | 243/1386 | 17.5% |
| two_dragon_types | 15/82 | 18.3% | 228/1304 | 17.5% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 27/174 | 15.5% |
| bamboo-2 | 39/166 | 23.5% |
| bamboo-3 | 36/224 | 16.1% |
| bamboo-4 | 29/207 | 14.0% |
| bamboo-5 | 29/204 | 14.2% |
| bamboo-6 | 33/228 | 14.5% |
| bamboo-7 | 29/209 | 13.9% |
| bamboo-8 | 30/217 | 13.8% |
| bamboo-9 | 28/192 | 14.6% |
| blank | 43/274 | 15.7% |
| characters-1 | 37/213 | 17.4% |
| characters-2 | 42/206 | 20.4% |
| characters-3 | 33/227 | 14.5% |
| characters-4 | 38/235 | 16.2% |
| characters-5 | 41/237 | 17.3% |
| characters-6 | 37/262 | 14.1% |
| characters-7 | 32/230 | 13.9% |
| characters-8 | 31/240 | 12.9% |
| characters-9 | 53/242 | 21.9% |
| dots-1 | 40/226 | 17.7% |
| dots-2 | 25/202 | 12.4% |
| dots-3 | 29/202 | 14.4% |
| dots-4 | 34/184 | 18.5% |
| dots-5 | 40/225 | 17.8% |
| dots-6 | 35/231 | 15.2% |
| dots-7 | 35/259 | 13.5% |
| dots-8 | 33/254 | 13.0% |
| dots-9 | 28/232 | 12.1% |
| dragon-green | 46/226 | 20.4% |
| dragon-red | 44/225 | 19.6% |
| dragon-white | 35/238 | 14.7% |
| flower-black-lotus | 2/28 | 7.1% |
| flower-white-lotus | 5/25 | 20.0% |
| joker-black | 30/81 | 37.0% |
| joker-blue | 24/90 | 26.7% |
| joker-green | 25/86 | 29.1% |
| joker-red | 28/91 | 30.8% |
| treasure-1 | 11/56 | 19.6% |
| treasure-2 | 13/79 | 16.5% |
| treasure-3 | 2/59 | 3.4% |
| treasure-4 | 5/72 | 6.9% |
| treasure-5 | 7/71 | 9.9% |
| wind-east | 46/259 | 17.8% |
| wind-north | 56/225 | 24.9% |
| wind-south | 65/244 | 26.6% |
| wind-west | 60/247 | 24.3% |

## validation-rarity

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 160 | 67 | 0 | 81 | 10.72 (7–22) | 13.3 | 2.02/7 |
| 5 | 10 | 200 | 102 | 0 | 54 | 11.48 (7–21) | 10 | 1.85/7 |
| 6 | 10 | 240 | 123 | 0 | 41 | 10.87 (7–21) | 19.4 | 1.9/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 22/238 (9.24%) | 28/238 | 5/10 | 1/10 | 1/160 | 8 | 6 |
| 5 | 31/256 (12.11%) | 37/256 | 4/10 | 2/10 | 3/200 | 19 | 21 |
| 6 | 43/513 (8.38%) | 61/513 | 2/10 | 2/10 | 7/240 | 43 | 41 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 327/376 | 33 | 28 | 128 | 1620 | 1 | 4, 2, 7, 5, 4, 6, 4, 5, 3, 4 |
| 5 | 442/464 | 34 | 32 | 208 | 2280 | 1 | 3, 4, 2, 3, 3, 5, 3, 3, 2, 3 |
| 6 | 523/560 | 46 | 40 | 325 | 4380 | 5 | 3, 2, 4, 5, 2, 11, 4, 5, 5, 5 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 3.12% → 8.12% → 11.25% → 14.47% | 0.42% → 14.07% → 29.12% → 38.38% |
| 5 | 4.8% → 6.02% → 7.29% → 5.6% | 0.88% → 21.44% → 23.7% → 13.68% |
| 6 | 1.94% → 9.44% → 12.22% → 10.66% | 1.07% → 16.17% → 30.13% → 21.67% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 639 dealt player-hands; 220 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 639/639 | 639/639 | 220/220 | 0/220 | 0/160 |
| eye | 392/639 | 515/639 | 191/220 | 5/220 | 0/160 |
| chow | 111/639 | 196/639 | 83/220 | 5/220 | 0/160 |
| two-eyes | 89/639 | 236/639 | 104/220 | 36/220 | 1/160 |
| pung | 121/639 | 233/639 | 97/220 | 2/220 | 0/160 |
| chow-eye | 25/639 | 137/639 | 64/220 | 45/220 | 8/160 |
| pung-eye | 22/639 | 118/639 | 54/220 | 45/220 | 17/160 |
| three-winds | 39/639 | 68/639 | 21/220 | 11/220 | 19/160 |
| three-dragons | 4/639 | 20/639 | 6/220 | 0/220 | 6/160 |
| kong | 26/639 | 86/639 | 36/220 | 28/220 | 44/160 |
| long-chow | 5/639 | 28/639 | 19/220 | 19/220 | 17/160 |
| four-winds | 9/639 | 29/639 | 10/220 | 10/220 | 23/160 |
| three-dragons-eye | 1/639 | 14/639 | 6/220 | 6/220 | 13/160 |
| twin-lotus | 0/639 | 1/639 | 0/220 | 0/220 | 1/160 |
| quint | 3/639 | 13/639 | 8/220 | 8/220 | 11/160 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 74/161 | 46.0% | 86/478 | 18.0% |
| blank | 27/124 | 21.8% | 133/515 | 25.8% |
| treasure | 28/140 | 20.0% | 132/499 | 26.5% |
| single_lotus | 5/26 | 19.2% | 155/613 | 25.3% |
| twin_lotus | 0/0 | — | 160/639 | 25.0% |
| two_dragon_types | 14/48 | 29.2% | 146/591 | 24.7% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 10/78 | 12.8% |
| bamboo-2 | 26/112 | 23.2% |
| bamboo-3 | 28/113 | 24.8% |
| bamboo-4 | 18/85 | 21.2% |
| bamboo-5 | 18/73 | 24.7% |
| bamboo-6 | 21/105 | 20.0% |
| bamboo-7 | 24/93 | 25.8% |
| bamboo-8 | 21/104 | 20.2% |
| bamboo-9 | 15/79 | 19.0% |
| blank | 27/124 | 21.8% |
| characters-1 | 16/87 | 18.4% |
| characters-2 | 16/74 | 21.6% |
| characters-3 | 12/67 | 17.9% |
| characters-4 | 23/102 | 22.5% |
| characters-5 | 37/125 | 29.6% |
| characters-6 | 21/87 | 24.1% |
| characters-7 | 32/123 | 26.0% |
| characters-8 | 20/113 | 17.7% |
| characters-9 | 20/111 | 18.0% |
| dots-1 | 20/97 | 20.6% |
| dots-2 | 21/102 | 20.6% |
| dots-3 | 22/99 | 22.2% |
| dots-4 | 20/110 | 18.2% |
| dots-5 | 19/81 | 23.5% |
| dots-6 | 21/91 | 23.1% |
| dots-7 | 20/126 | 15.9% |
| dots-8 | 22/113 | 19.5% |
| dots-9 | 38/115 | 33.0% |
| dragon-green | 29/116 | 25.0% |
| dragon-red | 19/77 | 24.7% |
| dragon-white | 30/110 | 27.3% |
| flower-black-lotus | 2/11 | 18.2% |
| flower-white-lotus | 3/15 | 20.0% |
| joker-black | 20/40 | 50.0% |
| joker-blue | 7/21 | 33.3% |
| joker-green | 29/54 | 53.7% |
| joker-red | 25/57 | 43.9% |
| treasure-1 | 7/26 | 26.9% |
| treasure-2 | 9/41 | 22.0% |
| treasure-3 | 5/24 | 20.8% |
| treasure-4 | 6/31 | 19.4% |
| treasure-5 | 5/27 | 18.5% |
| wind-east | 34/108 | 31.5% |
| wind-north | 33/110 | 30.0% |
| wind-south | 41/113 | 36.3% |
| wind-west | 34/107 | 31.8% |

### 5 players: ladder

Denominators: 996 dealt player-hands; 393 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 996/996 | 996/996 | 393/393 | 0/393 | 0/200 |
| eye | 593/996 | 796/996 | 345/393 | 5/393 | 0/200 |
| chow | 190/996 | 352/996 | 173/393 | 11/393 | 0/200 |
| two-eyes | 111/996 | 379/996 | 202/393 | 53/393 | 0/200 |
| pung | 141/996 | 340/996 | 189/393 | 9/393 | 0/200 |
| chow-eye | 53/996 | 229/996 | 130/393 | 81/393 | 5/200 |
| pung-eye | 23/996 | 197/996 | 132/393 | 112/393 | 29/200 |
| three-winds | 36/996 | 82/996 | 31/393 | 24/393 | 41/200 |
| three-dragons | 12/996 | 32/996 | 13/393 | 3/393 | 7/200 |
| kong | 12/996 | 69/996 | 36/393 | 35/393 | 31/200 |
| long-chow | 18/996 | 68/996 | 42/393 | 42/393 | 45/200 |
| four-winds | 4/996 | 17/996 | 7/393 | 7/393 | 16/200 |
| three-dragons-eye | 3/996 | 22/996 | 10/393 | 10/393 | 20/200 |
| twin-lotus | 2/996 | 2/996 | 0/393 | 0/393 | 2/200 |
| quint | 1/996 | 4/996 | 1/393 | 1/393 | 4/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 77/211 | 36.5% | 130/785 | 16.6% |
| blank | 39/172 | 22.7% | 168/824 | 20.4% |
| treasure | 47/228 | 20.6% | 160/768 | 20.8% |
| single_lotus | 11/44 | 25.0% | 196/952 | 20.6% |
| twin_lotus | 2/2 | 100.0% | 205/994 | 20.6% |
| two_dragon_types | 16/56 | 28.6% | 191/940 | 20.3% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 18/118 | 15.3% |
| bamboo-2 | 31/129 | 24.0% |
| bamboo-3 | 40/199 | 20.1% |
| bamboo-4 | 33/196 | 16.8% |
| bamboo-5 | 28/181 | 15.5% |
| bamboo-6 | 33/164 | 20.1% |
| bamboo-7 | 37/198 | 18.7% |
| bamboo-8 | 21/149 | 14.1% |
| bamboo-9 | 17/145 | 11.7% |
| blank | 39/172 | 22.7% |
| characters-1 | 26/160 | 16.2% |
| characters-2 | 27/156 | 17.3% |
| characters-3 | 29/169 | 17.2% |
| characters-4 | 24/155 | 15.5% |
| characters-5 | 35/152 | 23.0% |
| characters-6 | 32/149 | 21.5% |
| characters-7 | 27/146 | 18.5% |
| characters-8 | 34/158 | 21.5% |
| characters-9 | 29/157 | 18.5% |
| dots-1 | 40/182 | 22.0% |
| dots-2 | 30/153 | 19.6% |
| dots-3 | 27/169 | 16.0% |
| dots-4 | 30/162 | 18.5% |
| dots-5 | 32/142 | 22.5% |
| dots-6 | 43/192 | 22.4% |
| dots-7 | 41/195 | 21.0% |
| dots-8 | 27/146 | 18.5% |
| dots-9 | 33/168 | 19.6% |
| dragon-green | 36/152 | 23.7% |
| dragon-red | 33/148 | 22.3% |
| dragon-white | 35/150 | 23.3% |
| flower-black-lotus | 6/21 | 28.6% |
| flower-white-lotus | 9/27 | 33.3% |
| joker-black | 17/44 | 38.6% |
| joker-blue | 25/58 | 43.1% |
| joker-green | 21/66 | 31.8% |
| joker-red | 19/57 | 33.3% |
| treasure-1 | 10/42 | 23.8% |
| treasure-2 | 14/65 | 21.5% |
| treasure-3 | 6/47 | 12.8% |
| treasure-4 | 12/50 | 24.0% |
| treasure-5 | 7/42 | 16.7% |
| wind-east | 48/166 | 28.9% |
| wind-north | 55/181 | 30.4% |
| wind-south | 52/141 | 36.9% |
| wind-west | 35/136 | 25.7% |

### 6 players: ladder

Denominators: 1419 dealt player-hands; 546 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1419/1419 | 1419/1419 | 546/546 | 6/546 | 0/240 |
| eye | 866/1419 | 1154/1419 | 489/546 | 13/546 | 0/240 |
| chow | 231/1419 | 440/1419 | 196/546 | 14/546 | 1/240 |
| two-eyes | 172/1419 | 538/1419 | 248/546 | 69/546 | 0/240 |
| pung | 257/1419 | 519/1419 | 280/546 | 13/546 | 0/240 |
| chow-eye | 76/1419 | 292/1419 | 152/546 | 102/546 | 2/240 |
| pung-eye | 52/1419 | 280/1419 | 154/546 | 129/546 | 24/240 |
| three-winds | 39/1419 | 100/1419 | 38/546 | 26/546 | 30/240 |
| three-dragons | 12/1419 | 40/1419 | 25/546 | 5/546 | 6/240 |
| kong | 52/1419 | 177/1419 | 109/546 | 89/546 | 73/240 |
| long-chow | 5/1419 | 48/1419 | 32/546 | 32/546 | 33/240 |
| four-winds | 11/1419 | 24/1419 | 11/546 | 11/546 | 17/240 |
| three-dragons-eye | 4/1419 | 28/1419 | 20/546 | 20/546 | 25/240 |
| twin-lotus | 6/1419 | 10/1419 | 0/546 | 0/546 | 10/240 |
| quint | 4/1419 | 22/1419 | 17/546 | 17/546 | 19/240 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 92/319 | 28.8% | 150/1100 | 13.6% |
| blank | 50/257 | 19.5% | 192/1162 | 16.5% |
| treasure | 55/343 | 16.0% | 187/1076 | 17.4% |
| single_lotus | 6/64 | 9.4% | 236/1355 | 17.4% |
| twin_lotus | 6/6 | 100.0% | 236/1413 | 16.7% |
| two_dragon_types | 14/84 | 16.7% | 228/1335 | 17.1% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 22/204 | 10.8% |
| bamboo-2 | 29/242 | 12.0% |
| bamboo-3 | 46/270 | 17.0% |
| bamboo-4 | 30/212 | 14.2% |
| bamboo-5 | 40/249 | 16.1% |
| bamboo-6 | 42/246 | 17.1% |
| bamboo-7 | 38/212 | 17.9% |
| bamboo-8 | 28/208 | 13.5% |
| bamboo-9 | 27/197 | 13.7% |
| blank | 50/257 | 19.5% |
| characters-1 | 34/205 | 16.6% |
| characters-2 | 41/215 | 19.1% |
| characters-3 | 29/248 | 11.7% |
| characters-4 | 32/251 | 12.7% |
| characters-5 | 33/245 | 13.5% |
| characters-6 | 47/248 | 19.0% |
| characters-7 | 26/189 | 13.8% |
| characters-8 | 30/232 | 12.9% |
| characters-9 | 36/221 | 16.3% |
| dots-1 | 46/239 | 19.2% |
| dots-2 | 19/217 | 8.8% |
| dots-3 | 25/200 | 12.5% |
| dots-4 | 30/205 | 14.6% |
| dots-5 | 23/212 | 10.8% |
| dots-6 | 36/204 | 17.6% |
| dots-7 | 30/231 | 13.0% |
| dots-8 | 32/242 | 13.2% |
| dots-9 | 29/194 | 14.9% |
| dragon-green | 42/238 | 17.6% |
| dragon-red | 36/193 | 18.7% |
| dragon-white | 37/227 | 16.3% |
| flower-black-lotus | 9/44 | 20.5% |
| flower-white-lotus | 9/32 | 28.1% |
| joker-black | 18/62 | 29.0% |
| joker-blue | 25/90 | 27.8% |
| joker-green | 31/90 | 34.4% |
| joker-red | 24/90 | 26.7% |
| treasure-1 | 8/55 | 14.5% |
| treasure-2 | 11/81 | 13.6% |
| treasure-3 | 12/80 | 15.0% |
| treasure-4 | 15/81 | 18.5% |
| treasure-5 | 12/70 | 17.1% |
| wind-east | 47/243 | 19.3% |
| wind-north | 56/209 | 26.8% |
| wind-south | 54/226 | 23.9% |
| wind-west | 45/244 | 18.4% |

## rotation-one

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 160 | 65 | 0 | 86 | 8.62 (7–12) | 13.2 | 2.04/7 |
| 5 | 10 | 200 | 76 | 0 | 48 | 13.06 (7–23) | 4.5 | 1.59/7 |
| 6 | 10 | 240 | 124 | 0 | 51 | 10.47 (7–21) | 16.3 | 1.8/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 28/224 (12.5%) | 32/224 | 3/10 | 4/10 | 2/160 | 17 | 16 |
| 5 | 17/235 (7.23%) | 19/235 | 2/10 | 2/10 | 3/200 | 20 | 25 |
| 6 | 33/470 (7.02%) | 38/470 | 3/10 | 4/10 | 19/240 | 52 | 57 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 353/388 | 34 | 34 | 150 | 800 | 0 | 1, 2, 3, 1, 2, 5, 1, 3, 5, 3 |
| 5 | 465/488 | 49 | 44 | 216 | 1600 | 0 | 3, 2, 1, 1, 1, 2, 5, 3, 3, 5 |
| 6 | 578/608 | 72 | 64 | 334 | 3160 | 5 | 3, 6, 2, 3, 3, 7, 4, 3, 2, 2 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 3.75% → 8.75% → 9.43% → 9.43% | 0.42% → 6.45% → 10.78% → 12.18% |
| 5 | 0.4% → 3.24% → 4.07% → 3.6% | 0.88% → 5.2% → 6.46% → 6.74% |
| 6 | 1.39% → 5.92% → 6.94% → 6.29% | 1.07% → 8.82% → 7.68% → 11.9% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 638 dealt player-hands; 208 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 638/638 | 638/638 | 208/208 | 1/208 | 0/160 |
| eye | 376/638 | 507/638 | 178/208 | 4/208 | 0/160 |
| chow | 112/638 | 238/638 | 83/208 | 11/208 | 0/160 |
| two-eyes | 80/638 | 261/638 | 105/208 | 27/208 | 1/160 |
| pung | 92/638 | 216/638 | 94/208 | 9/208 | 1/160 |
| three-winds | 29/638 | 45/638 | 15/208 | 8/208 | 0/160 |
| chow-eye | 20/638 | 151/638 | 59/208 | 42/208 | 7/160 |
| pung-eye | 30/638 | 144/638 | 64/208 | 57/208 | 55/160 |
| three-dragons | 10/638 | 21/638 | 8/208 | 3/208 | 9/160 |
| kong | 6/638 | 34/638 | 16/208 | 16/208 | 24/160 |
| long-chow | 6/638 | 37/638 | 20/208 | 20/208 | 25/160 |
| four-winds | 7/638 | 28/638 | 5/208 | 5/208 | 27/160 |
| three-dragons-eye | 3/638 | 10/638 | 5/208 | 5/208 | 10/160 |
| twin-lotus | 0/638 | 1/638 | 0/208 | 0/208 | 1/160 |
| quint | 0/638 | 0/638 | 0/208 | 0/208 | 0/160 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 61/140 | 43.6% | 99/498 | 19.9% |
| blank | 36/146 | 24.7% | 124/492 | 25.2% |
| treasure | 29/123 | 23.6% | 131/515 | 25.4% |
| single_lotus | 7/16 | 43.8% | 153/622 | 24.6% |
| twin_lotus | 0/0 | — | 160/638 | 25.1% |
| two_dragon_types | 10/34 | 29.4% | 150/604 | 24.8% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 11/79 | 13.9% |
| bamboo-2 | 21/117 | 17.9% |
| bamboo-3 | 30/138 | 21.7% |
| bamboo-4 | 20/93 | 21.5% |
| bamboo-5 | 24/106 | 22.6% |
| bamboo-6 | 28/102 | 27.5% |
| bamboo-7 | 17/93 | 18.3% |
| bamboo-8 | 26/107 | 24.3% |
| bamboo-9 | 25/92 | 27.2% |
| blank | 36/146 | 24.7% |
| characters-1 | 22/112 | 19.6% |
| characters-2 | 15/81 | 18.5% |
| characters-3 | 25/115 | 21.7% |
| characters-4 | 24/112 | 21.4% |
| characters-5 | 30/134 | 22.4% |
| characters-6 | 23/104 | 22.1% |
| characters-7 | 25/106 | 23.6% |
| characters-8 | 25/109 | 22.9% |
| characters-9 | 19/79 | 24.1% |
| dots-1 | 17/80 | 21.2% |
| dots-2 | 18/89 | 20.2% |
| dots-3 | 18/110 | 16.4% |
| dots-4 | 23/90 | 25.6% |
| dots-5 | 19/83 | 22.9% |
| dots-6 | 25/98 | 25.5% |
| dots-7 | 27/113 | 23.9% |
| dots-8 | 19/93 | 20.4% |
| dots-9 | 33/130 | 25.4% |
| dragon-green | 39/118 | 33.1% |
| dragon-red | 22/90 | 24.4% |
| dragon-white | 17/67 | 25.4% |
| flower-black-lotus | 2/5 | 40.0% |
| flower-white-lotus | 5/11 | 45.5% |
| joker-black | 16/37 | 43.2% |
| joker-blue | 13/29 | 44.8% |
| joker-green | 18/41 | 43.9% |
| joker-red | 21/43 | 48.8% |
| treasure-1 | 5/34 | 14.7% |
| treasure-2 | 9/30 | 30.0% |
| treasure-3 | 10/27 | 37.0% |
| treasure-4 | 5/20 | 25.0% |
| treasure-5 | 4/27 | 14.8% |
| wind-east | 31/94 | 33.0% |
| wind-north | 41/119 | 34.5% |
| wind-south | 42/127 | 33.1% |
| wind-west | 30/99 | 30.3% |

### 5 players: ladder

Denominators: 993 dealt player-hands; 243 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 993/993 | 993/993 | 243/243 | 1/243 | 0/200 |
| eye | 528/993 | 757/993 | 205/243 | 4/243 | 0/200 |
| chow | 124/993 | 289/993 | 102/243 | 10/243 | 0/200 |
| two-eyes | 86/993 | 375/993 | 118/243 | 29/243 | 1/200 |
| pung | 89/993 | 253/993 | 110/243 | 5/243 | 0/200 |
| three-winds | 45/993 | 91/993 | 28/243 | 10/243 | 0/200 |
| chow-eye | 25/993 | 176/993 | 75/243 | 51/243 | 8/200 |
| pung-eye | 14/993 | 170/993 | 80/243 | 74/243 | 77/200 |
| three-dragons | 12/993 | 43/993 | 12/243 | 0/243 | 18/200 |
| kong | 5/993 | 29/993 | 12/243 | 12/243 | 12/200 |
| long-chow | 4/993 | 33/993 | 18/243 | 18/243 | 26/200 |
| four-winds | 5/993 | 37/993 | 17/243 | 17/243 | 32/200 |
| three-dragons-eye | 1/993 | 25/993 | 12/243 | 12/243 | 22/200 |
| twin-lotus | 2/993 | 4/993 | 0/243 | 0/243 | 4/200 |
| quint | 0/993 | 0/993 | 0/243 | 0/243 | 0/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 68/195 | 34.9% | 138/798 | 17.3% |
| blank | 40/211 | 19.0% | 166/782 | 21.2% |
| treasure | 37/202 | 18.3% | 169/791 | 21.4% |
| single_lotus | 9/55 | 16.4% | 197/938 | 21.0% |
| twin_lotus | 2/2 | 100.0% | 204/991 | 20.6% |
| two_dragon_types | 19/74 | 25.7% | 187/919 | 20.3% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 19/141 | 13.5% |
| bamboo-2 | 20/139 | 14.4% |
| bamboo-3 | 34/168 | 20.2% |
| bamboo-4 | 32/142 | 22.5% |
| bamboo-5 | 37/157 | 23.6% |
| bamboo-6 | 39/186 | 21.0% |
| bamboo-7 | 33/207 | 15.9% |
| bamboo-8 | 40/180 | 22.2% |
| bamboo-9 | 28/167 | 16.8% |
| blank | 40/211 | 19.0% |
| characters-1 | 31/147 | 21.1% |
| characters-2 | 34/171 | 19.9% |
| characters-3 | 29/171 | 17.0% |
| characters-4 | 26/182 | 14.3% |
| characters-5 | 30/162 | 18.5% |
| characters-6 | 29/172 | 16.9% |
| characters-7 | 35/142 | 24.6% |
| characters-8 | 25/154 | 16.2% |
| characters-9 | 33/170 | 19.4% |
| dots-1 | 32/156 | 20.5% |
| dots-2 | 32/149 | 21.5% |
| dots-3 | 27/161 | 16.8% |
| dots-4 | 26/146 | 17.8% |
| dots-5 | 30/149 | 20.1% |
| dots-6 | 24/173 | 13.9% |
| dots-7 | 28/169 | 16.6% |
| dots-8 | 21/138 | 15.2% |
| dots-9 | 31/138 | 22.5% |
| dragon-green | 48/188 | 25.5% |
| dragon-red | 38/173 | 22.0% |
| dragon-white | 44/149 | 29.5% |
| flower-black-lotus | 4/25 | 16.0% |
| flower-white-lotus | 9/34 | 26.5% |
| joker-black | 15/42 | 35.7% |
| joker-blue | 13/46 | 28.3% |
| joker-green | 27/59 | 45.8% |
| joker-red | 18/62 | 29.0% |
| treasure-1 | 3/40 | 7.5% |
| treasure-2 | 10/42 | 23.8% |
| treasure-3 | 11/44 | 25.0% |
| treasure-4 | 13/52 | 25.0% |
| treasure-5 | 4/39 | 10.3% |
| wind-east | 40/187 | 21.4% |
| wind-north | 40/183 | 21.9% |
| wind-south | 45/198 | 22.7% |
| wind-west | 43/163 | 26.4% |

### 6 players: ladder

Denominators: 1395 dealt player-hands; 446 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1395/1395 | 1395/1395 | 446/446 | 3/446 | 0/240 |
| eye | 753/1395 | 1090/1395 | 364/446 | 12/446 | 0/240 |
| chow | 210/1395 | 454/1395 | 165/446 | 10/446 | 1/240 |
| two-eyes | 144/1395 | 497/1395 | 177/446 | 33/446 | 0/240 |
| pung | 168/1395 | 438/1395 | 214/446 | 14/446 | 0/240 |
| three-winds | 79/1395 | 146/1395 | 60/446 | 21/446 | 0/240 |
| chow-eye | 47/1395 | 304/1395 | 123/446 | 76/446 | 1/240 |
| pung-eye | 28/1395 | 240/1395 | 120/446 | 112/446 | 61/240 |
| three-dragons | 20/1395 | 58/1395 | 39/446 | 10/446 | 9/240 |
| kong | 18/1395 | 68/1395 | 50/446 | 48/446 | 36/240 |
| long-chow | 8/1395 | 71/1395 | 44/446 | 44/446 | 35/240 |
| four-winds | 14/1395 | 66/1395 | 33/446 | 33/446 | 53/240 |
| three-dragons-eye | 4/1395 | 40/1395 | 29/446 | 29/446 | 37/240 |
| twin-lotus | 2/1395 | 5/1395 | 0/446 | 0/446 | 5/240 |
| quint | 0/1395 | 2/1395 | 1/446 | 1/446 | 2/240 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 86/314 | 27.4% | 161/1081 | 14.9% |
| blank | 47/250 | 18.8% | 200/1145 | 17.5% |
| treasure | 46/353 | 13.0% | 201/1042 | 19.3% |
| single_lotus | 10/63 | 15.9% | 237/1332 | 17.8% |
| twin_lotus | 2/2 | 100.0% | 245/1393 | 17.6% |
| two_dragon_types | 29/111 | 26.1% | 218/1284 | 17.0% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 29/205 | 14.1% |
| bamboo-2 | 35/210 | 16.7% |
| bamboo-3 | 26/191 | 13.6% |
| bamboo-4 | 35/218 | 16.1% |
| bamboo-5 | 32/218 | 14.7% |
| bamboo-6 | 41/234 | 17.5% |
| bamboo-7 | 33/199 | 16.6% |
| bamboo-8 | 28/179 | 15.6% |
| bamboo-9 | 28/213 | 13.1% |
| blank | 47/250 | 18.8% |
| characters-1 | 31/234 | 13.2% |
| characters-2 | 38/227 | 16.7% |
| characters-3 | 30/235 | 12.8% |
| characters-4 | 33/242 | 13.6% |
| characters-5 | 43/241 | 17.8% |
| characters-6 | 39/268 | 14.6% |
| characters-7 | 39/224 | 17.4% |
| characters-8 | 26/214 | 12.1% |
| characters-9 | 34/206 | 16.5% |
| dots-1 | 23/200 | 11.5% |
| dots-2 | 28/212 | 13.2% |
| dots-3 | 32/214 | 15.0% |
| dots-4 | 26/235 | 11.1% |
| dots-5 | 34/212 | 16.0% |
| dots-6 | 42/228 | 18.4% |
| dots-7 | 28/237 | 11.8% |
| dots-8 | 43/252 | 17.1% |
| dots-9 | 42/225 | 18.7% |
| dragon-green | 50/212 | 23.6% |
| dragon-red | 55/227 | 24.2% |
| dragon-white | 46/246 | 18.7% |
| flower-black-lotus | 6/34 | 17.6% |
| flower-white-lotus | 8/33 | 24.2% |
| joker-black | 26/74 | 35.1% |
| joker-blue | 22/83 | 26.5% |
| joker-green | 29/101 | 28.7% |
| joker-red | 13/75 | 17.3% |
| treasure-1 | 14/59 | 23.7% |
| treasure-2 | 10/76 | 13.2% |
| treasure-3 | 5/77 | 6.5% |
| treasure-4 | 12/89 | 13.5% |
| treasure-5 | 8/84 | 9.5% |
| wind-east | 57/253 | 22.5% |
| wind-north | 71/261 | 27.2% |
| wind-south | 64/271 | 23.6% |
| wind-west | 66/256 | 25.8% |

## rotation-two

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 160 | 57 | 0 | 86 | 8.75 (7–15) | 17.1 | 1.97/7 |
| 5 | 10 | 200 | 83 | 0 | 58 | 11.94 (7–22) | 7.5 | 1.69/7 |
| 6 | 10 | 240 | 119 | 0 | 47 | 11.1 (7–20) | 12.1 | 1.73/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 23/207 (11.11%) | 28/207 | 1/10 | 2/10 | 2/160 | 10 | 6 |
| 5 | 19/227 (8.37%) | 24/227 | 2/10 | 3/10 | 4/200 | 19 | 22 |
| 6 | 37/478 (7.74%) | 40/478 | 1/10 | 1/10 | 12/240 | 45 | 74 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 356/380 | 31 | 30 | 157 | 700 | 0 | 2, 3, 3, 3, 3, 3, 4, 1, 2, 2 |
| 5 | 441/466 | 35 | 33 | 239 | 1880 | 0 | 3, 4, 2, 3, 2, 3, 2, 2, 3, 2 |
| 6 | 554/590 | 55 | 55 | 336 | 3740 | 0 | 2, 4, 3, 9, 2, 2, 3, 2, 2, 2 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 3.75% → 5.06% → 1.88% → 3.75% | 0.42% → 2.38% → 4.5% → 4.3% |
| 5 | 0.4% → 0.8% → 4.86% → 5.26% | 0.88% → 2.64% → 3.44% → 4.94% |
| 6 | 1.39% → 5.34% → 4.6% → 4.41% | 1.07% → 5.4% → 6.92% → 6.4% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 638 dealt player-hands; 181 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 638/638 | 638/638 | 181/181 | 2/181 | 0/160 |
| eye | 377/638 | 519/638 | 158/181 | 3/181 | 0/160 |
| chow | 112/638 | 224/638 | 77/181 | 8/181 | 0/160 |
| two-eyes | 75/638 | 265/638 | 89/181 | 25/181 | 1/160 |
| pung | 71/638 | 209/638 | 82/181 | 7/181 | 1/160 |
| three-winds | 19/638 | 39/638 | 13/181 | 4/181 | 0/160 |
| chow-eye | 43/638 | 162/638 | 63/181 | 46/181 | 7/160 |
| pung-eye | 9/638 | 130/638 | 55/181 | 51/181 | 52/160 |
| three-dragons | 12/638 | 31/638 | 5/181 | 3/181 | 11/160 |
| kong | 8/638 | 35/638 | 12/181 | 12/181 | 27/160 |
| long-chow | 2/638 | 30/638 | 13/181 | 13/181 | 23/160 |
| four-winds | 2/638 | 21/638 | 5/181 | 5/181 | 19/160 |
| three-dragons-eye | 3/638 | 18/638 | 2/181 | 2/181 | 18/160 |
| twin-lotus | 0/638 | 1/638 | 0/181 | 0/181 | 1/160 |
| quint | 0/638 | 0/638 | 0/181 | 0/181 | 0/160 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 55/142 | 38.7% | 105/496 | 21.2% |
| blank | 42/168 | 25.0% | 118/470 | 25.1% |
| treasure | 30/145 | 20.7% | 130/493 | 26.4% |
| single_lotus | 7/18 | 38.9% | 153/620 | 24.7% |
| twin_lotus | 0/0 | — | 160/638 | 25.1% |
| two_dragon_types | 18/40 | 45.0% | 142/598 | 23.7% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 23/107 | 21.5% |
| bamboo-2 | 24/123 | 19.5% |
| bamboo-3 | 28/116 | 24.1% |
| bamboo-4 | 26/120 | 21.7% |
| bamboo-5 | 24/115 | 20.9% |
| bamboo-6 | 21/90 | 23.3% |
| bamboo-7 | 21/81 | 25.9% |
| bamboo-8 | 24/92 | 26.1% |
| bamboo-9 | 20/78 | 25.6% |
| blank | 42/168 | 25.0% |
| characters-1 | 16/109 | 14.7% |
| characters-2 | 29/117 | 24.8% |
| characters-3 | 21/92 | 22.8% |
| characters-4 | 31/109 | 28.4% |
| characters-5 | 28/125 | 22.4% |
| characters-6 | 21/89 | 23.6% |
| characters-7 | 24/104 | 23.1% |
| characters-8 | 25/107 | 23.4% |
| characters-9 | 28/87 | 32.2% |
| dots-1 | 19/108 | 17.6% |
| dots-2 | 20/87 | 23.0% |
| dots-3 | 19/107 | 17.8% |
| dots-4 | 21/89 | 23.6% |
| dots-5 | 16/86 | 18.6% |
| dots-6 | 24/112 | 21.4% |
| dots-7 | 21/104 | 20.2% |
| dots-8 | 25/99 | 25.3% |
| dots-9 | 33/120 | 27.5% |
| dragon-green | 30/117 | 25.6% |
| dragon-red | 26/86 | 30.2% |
| dragon-white | 27/101 | 26.7% |
| flower-black-lotus | 3/7 | 42.9% |
| flower-white-lotus | 4/11 | 36.4% |
| joker-black | 10/23 | 43.5% |
| joker-blue | 12/31 | 38.7% |
| joker-green | 14/52 | 26.9% |
| joker-red | 21/42 | 50.0% |
| treasure-1 | 10/38 | 26.3% |
| treasure-2 | 4/43 | 9.3% |
| treasure-3 | 9/27 | 33.3% |
| treasure-4 | 2/18 | 11.1% |
| treasure-5 | 7/31 | 22.6% |
| wind-east | 23/90 | 25.6% |
| wind-north | 30/98 | 30.6% |
| wind-south | 35/110 | 31.8% |
| wind-west | 28/94 | 29.8% |

### 5 players: ladder

Denominators: 993 dealt player-hands; 283 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 993/993 | 993/993 | 283/283 | 2/283 | 0/200 |
| eye | 531/993 | 792/993 | 250/283 | 8/283 | 0/200 |
| chow | 153/993 | 318/993 | 120/283 | 11/283 | 0/200 |
| two-eyes | 100/993 | 385/993 | 151/283 | 42/283 | 1/200 |
| pung | 79/993 | 262/993 | 113/283 | 4/283 | 0/200 |
| three-winds | 37/993 | 76/993 | 28/283 | 14/283 | 0/200 |
| chow-eye | 36/993 | 208/993 | 97/283 | 69/283 | 11/200 |
| pung-eye | 18/993 | 175/993 | 89/283 | 86/283 | 87/200 |
| three-dragons | 10/993 | 38/993 | 9/283 | 1/283 | 17/200 |
| kong | 1/993 | 21/993 | 7/283 | 6/283 | 11/200 |
| long-chow | 5/993 | 34/993 | 19/283 | 19/283 | 25/200 |
| four-winds | 5/993 | 32/993 | 13/283 | 13/283 | 29/200 |
| three-dragons-eye | 1/993 | 18/993 | 8/283 | 8/283 | 18/200 |
| twin-lotus | 1/993 | 1/993 | 0/283 | 0/283 | 1/200 |
| quint | 0/993 | 0/993 | 0/283 | 0/283 | 0/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 72/205 | 35.1% | 131/788 | 16.6% |
| blank | 43/198 | 21.7% | 160/795 | 20.1% |
| treasure | 37/227 | 16.3% | 166/766 | 21.7% |
| single_lotus | 13/57 | 22.8% | 190/936 | 20.3% |
| twin_lotus | 1/1 | 100.0% | 202/992 | 20.4% |
| two_dragon_types | 19/68 | 27.9% | 184/925 | 19.9% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 24/139 | 17.3% |
| bamboo-2 | 21/139 | 15.1% |
| bamboo-3 | 30/163 | 18.4% |
| bamboo-4 | 25/143 | 17.5% |
| bamboo-5 | 20/137 | 14.6% |
| bamboo-6 | 30/166 | 18.1% |
| bamboo-7 | 30/168 | 17.9% |
| bamboo-8 | 37/159 | 23.3% |
| bamboo-9 | 46/170 | 27.1% |
| blank | 43/198 | 21.7% |
| characters-1 | 32/152 | 21.1% |
| characters-2 | 35/171 | 20.5% |
| characters-3 | 31/162 | 19.1% |
| characters-4 | 31/148 | 20.9% |
| characters-5 | 40/200 | 20.0% |
| characters-6 | 28/177 | 15.8% |
| characters-7 | 33/186 | 17.7% |
| characters-8 | 23/171 | 13.5% |
| characters-9 | 33/189 | 17.5% |
| dots-1 | 28/157 | 17.8% |
| dots-2 | 30/145 | 20.7% |
| dots-3 | 31/170 | 18.2% |
| dots-4 | 39/168 | 23.2% |
| dots-5 | 26/150 | 17.3% |
| dots-6 | 32/164 | 19.5% |
| dots-7 | 30/178 | 16.9% |
| dots-8 | 21/144 | 14.6% |
| dots-9 | 24/143 | 16.8% |
| dragon-green | 38/172 | 22.1% |
| dragon-red | 42/186 | 22.6% |
| dragon-white | 36/133 | 27.1% |
| flower-black-lotus | 8/28 | 28.6% |
| flower-white-lotus | 7/31 | 22.6% |
| joker-black | 11/43 | 25.6% |
| joker-blue | 13/41 | 31.7% |
| joker-green | 25/67 | 37.3% |
| joker-red | 28/68 | 41.2% |
| treasure-1 | 7/41 | 17.1% |
| treasure-2 | 11/53 | 20.8% |
| treasure-3 | 6/45 | 13.3% |
| treasure-4 | 10/48 | 20.8% |
| treasure-5 | 7/61 | 11.5% |
| wind-east | 36/167 | 21.6% |
| wind-north | 41/179 | 22.9% |
| wind-south | 45/182 | 24.7% |
| wind-west | 33/165 | 20.0% |

### 6 players: ladder

Denominators: 1404 dealt player-hands; 435 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1404/1404 | 1404/1404 | 435/435 | 6/435 | 0/240 |
| eye | 789/1404 | 1107/1404 | 379/435 | 16/435 | 0/240 |
| chow | 241/1404 | 475/1404 | 182/435 | 4/435 | 0/240 |
| two-eyes | 153/1404 | 547/1404 | 205/435 | 44/435 | 0/240 |
| pung | 145/1404 | 412/1404 | 203/435 | 10/435 | 0/240 |
| three-winds | 47/1404 | 107/1404 | 36/435 | 17/435 | 0/240 |
| chow-eye | 65/1404 | 318/1404 | 144/435 | 98/435 | 6/240 |
| pung-eye | 30/1404 | 265/1404 | 141/435 | 131/435 | 78/240 |
| three-dragons | 14/1404 | 47/1404 | 20/435 | 6/435 | 13/240 |
| kong | 4/1404 | 45/1404 | 30/435 | 30/435 | 26/240 |
| long-chow | 10/1404 | 67/1404 | 45/435 | 45/435 | 48/240 |
| four-winds | 10/1404 | 46/1404 | 14/435 | 14/435 | 43/240 |
| three-dragons-eye | 4/1404 | 23/1404 | 14/435 | 14/435 | 23/240 |
| twin-lotus | 1/1404 | 3/1404 | 0/435 | 0/435 | 3/240 |
| quint | 0/1404 | 0/1404 | 0/435 | 0/435 | 0/240 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 98/308 | 31.8% | 143/1096 | 13.0% |
| blank | 46/261 | 17.6% | 195/1143 | 17.1% |
| treasure | 48/342 | 14.0% | 193/1062 | 18.2% |
| single_lotus | 11/65 | 16.9% | 230/1339 | 17.2% |
| twin_lotus | 1/1 | 100.0% | 240/1403 | 17.1% |
| two_dragon_types | 17/90 | 18.9% | 224/1314 | 17.0% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 31/211 | 14.7% |
| bamboo-2 | 32/217 | 14.7% |
| bamboo-3 | 32/236 | 13.6% |
| bamboo-4 | 36/242 | 14.9% |
| bamboo-5 | 51/269 | 19.0% |
| bamboo-6 | 48/243 | 19.8% |
| bamboo-7 | 28/217 | 12.9% |
| bamboo-8 | 34/228 | 14.9% |
| bamboo-9 | 33/205 | 16.1% |
| blank | 46/261 | 17.6% |
| characters-1 | 41/206 | 19.9% |
| characters-2 | 35/210 | 16.7% |
| characters-3 | 30/232 | 12.9% |
| characters-4 | 31/255 | 12.2% |
| characters-5 | 34/263 | 12.9% |
| characters-6 | 46/284 | 16.2% |
| characters-7 | 42/254 | 16.5% |
| characters-8 | 33/220 | 15.0% |
| characters-9 | 41/207 | 19.8% |
| dots-1 | 33/212 | 15.6% |
| dots-2 | 21/189 | 11.1% |
| dots-3 | 20/192 | 10.4% |
| dots-4 | 20/191 | 10.5% |
| dots-5 | 31/236 | 13.1% |
| dots-6 | 40/254 | 15.7% |
| dots-7 | 41/240 | 17.1% |
| dots-8 | 39/215 | 18.1% |
| dots-9 | 37/234 | 15.8% |
| dragon-green | 32/201 | 15.9% |
| dragon-red | 47/225 | 20.9% |
| dragon-white | 39/228 | 17.1% |
| flower-black-lotus | 5/28 | 17.9% |
| flower-white-lotus | 8/39 | 20.5% |
| joker-black | 28/66 | 42.4% |
| joker-blue | 27/92 | 29.3% |
| joker-green | 30/90 | 33.3% |
| joker-red | 25/83 | 30.1% |
| treasure-1 | 10/62 | 16.1% |
| treasure-2 | 17/89 | 19.1% |
| treasure-3 | 5/70 | 7.1% |
| treasure-4 | 6/74 | 8.1% |
| treasure-5 | 12/78 | 15.4% |
| wind-east | 40/229 | 17.5% |
| wind-north | 54/226 | 23.9% |
| wind-south | 51/245 | 20.8% |
| wind-west | 55/240 | 22.9% |

## rotation-three

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 160 | 61 | 0 | 86 | 9.1 (7–15) | 13.9 | 1.96/7 |
| 5 | 10 | 200 | 88 | 0 | 60 | 10.66 (7–20) | 8.3 | 1.73/7 |
| 6 | 10 | 240 | 122 | 0 | 49 | 10.55 (7–20) | 16.9 | 1.77/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 22/223 (9.87%) | 26/223 | 4/10 | 3/10 | 2/160 | 10 | 7 |
| 5 | 24/237 (10.13%) | 26/237 | 2/10 | 2/10 | 3/200 | 16 | 17 |
| 6 | 38/454 (8.37%) | 43/454 | 1/10 | 3/10 | 13/240 | 49 | 57 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 346/372 | 27 | 26 | 153 | 700 | 0 | 3, 2, 2, 4, 3, 2, 2, 3, 2, 4 |
| 5 | 451/464 | 34 | 32 | 253 | 1380 | 2 | 5, 3, 2, 1, 2, 6, 2, 2, 3, 3 |
| 6 | 539/562 | 44 | 41 | 300 | 2440 | 0 | 4, 2, 2, 2, 2, 2, 3, 3, 2, 2 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 3.75% → 4.43% → 6.88% → 7.59% | 0.42% → 1.9% → 1.18% → 2.38% |
| 5 | 0.4% → 3.2% → 3.21% → 3.24% | 0.88% → 2.28% → 1.64% → 0.94% |
| 6 | 1.39% → 6.11% → 5.87% → 5.26% | 1.07% → 3.77% → 4.37% → 2.63% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 636 dealt player-hands; 194 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 636/636 | 636/636 | 194/194 | 1/194 | 0/160 |
| eye | 356/636 | 507/636 | 171/194 | 3/194 | 0/160 |
| chow | 105/636 | 230/636 | 89/194 | 7/194 | 0/160 |
| two-eyes | 73/636 | 258/636 | 90/194 | 28/194 | 1/160 |
| pung | 74/636 | 204/636 | 77/194 | 6/194 | 1/160 |
| three-winds | 27/636 | 48/636 | 13/194 | 7/194 | 0/160 |
| chow-eye | 23/636 | 153/636 | 71/194 | 52/194 | 7/160 |
| pung-eye | 21/636 | 134/636 | 51/194 | 44/194 | 60/160 |
| three-dragons | 13/636 | 23/636 | 10/194 | 2/194 | 11/160 |
| kong | 11/636 | 38/636 | 16/194 | 16/194 | 22/160 |
| long-chow | 1/636 | 29/636 | 17/194 | 17/194 | 26/160 |
| four-winds | 5/636 | 19/636 | 3/194 | 3/194 | 18/160 |
| three-dragons-eye | 2/636 | 12/636 | 8/194 | 8/194 | 12/160 |
| twin-lotus | 1/636 | 2/636 | 0/194 | 0/194 | 2/160 |
| quint | 0/636 | 0/636 | 0/194 | 0/194 | 0/160 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 44/134 | 32.8% | 117/502 | 23.3% |
| blank | 34/121 | 28.1% | 127/515 | 24.7% |
| treasure | 28/134 | 20.9% | 133/502 | 26.5% |
| single_lotus | 10/29 | 34.5% | 151/607 | 24.9% |
| twin_lotus | 1/1 | 100.0% | 160/635 | 25.2% |
| two_dragon_types | 16/35 | 45.7% | 145/601 | 24.1% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 17/88 | 19.3% |
| bamboo-2 | 26/109 | 23.9% |
| bamboo-3 | 27/130 | 20.8% |
| bamboo-4 | 23/103 | 22.3% |
| bamboo-5 | 24/118 | 20.3% |
| bamboo-6 | 22/124 | 17.7% |
| bamboo-7 | 24/96 | 25.0% |
| bamboo-8 | 23/105 | 21.9% |
| bamboo-9 | 25/84 | 29.8% |
| blank | 34/121 | 28.1% |
| characters-1 | 11/100 | 11.0% |
| characters-2 | 24/108 | 22.2% |
| characters-3 | 24/98 | 24.5% |
| characters-4 | 34/110 | 30.9% |
| characters-5 | 28/116 | 24.1% |
| characters-6 | 27/112 | 24.1% |
| characters-7 | 24/96 | 25.0% |
| characters-8 | 18/106 | 17.0% |
| characters-9 | 20/83 | 24.1% |
| dots-1 | 21/93 | 22.6% |
| dots-2 | 24/95 | 25.3% |
| dots-3 | 19/101 | 18.8% |
| dots-4 | 25/100 | 25.0% |
| dots-5 | 21/93 | 22.6% |
| dots-6 | 20/85 | 23.5% |
| dots-7 | 23/112 | 20.5% |
| dots-8 | 24/114 | 21.1% |
| dots-9 | 30/118 | 25.4% |
| dragon-green | 36/101 | 35.6% |
| dragon-red | 28/92 | 30.4% |
| dragon-white | 19/74 | 25.7% |
| flower-black-lotus | 7/19 | 36.8% |
| flower-white-lotus | 5/12 | 41.7% |
| joker-black | 11/30 | 36.7% |
| joker-blue | 13/33 | 39.4% |
| joker-green | 11/37 | 29.7% |
| joker-red | 14/41 | 34.1% |
| treasure-1 | 11/32 | 34.4% |
| treasure-2 | 4/31 | 12.9% |
| treasure-3 | 5/32 | 15.6% |
| treasure-4 | 4/28 | 14.3% |
| treasure-5 | 6/22 | 27.3% |
| wind-east | 25/122 | 20.5% |
| wind-north | 45/136 | 33.1% |
| wind-south | 33/98 | 33.7% |
| wind-west | 29/94 | 30.9% |

### 5 players: ladder

Denominators: 996 dealt player-hands; 292 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 996/996 | 996/996 | 292/292 | 2/292 | 0/200 |
| eye | 559/996 | 799/996 | 263/292 | 6/292 | 0/200 |
| chow | 148/996 | 336/996 | 140/292 | 12/292 | 0/200 |
| two-eyes | 94/996 | 401/996 | 160/292 | 40/292 | 1/200 |
| pung | 104/996 | 293/996 | 138/292 | 3/292 | 0/200 |
| three-winds | 35/996 | 78/996 | 19/292 | 4/292 | 0/200 |
| chow-eye | 37/996 | 234/996 | 112/292 | 73/292 | 14/200 |
| pung-eye | 13/996 | 184/996 | 99/292 | 91/292 | 65/200 |
| three-dragons | 12/996 | 35/996 | 9/292 | 1/292 | 16/200 |
| kong | 6/996 | 42/996 | 21/292 | 19/292 | 20/200 |
| long-chow | 2/996 | 35/996 | 18/292 | 18/292 | 32/200 |
| four-winds | 3/996 | 33/996 | 13/292 | 13/292 | 30/200 |
| three-dragons-eye | 3/996 | 18/996 | 8/292 | 8/292 | 18/200 |
| twin-lotus | 1/996 | 2/996 | 0/292 | 0/292 | 2/200 |
| quint | 0/996 | 2/996 | 2/292 | 2/292 | 2/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 68/217 | 31.3% | 132/779 | 16.9% |
| blank | 29/190 | 15.3% | 171/806 | 21.2% |
| treasure | 38/224 | 17.0% | 162/772 | 21.0% |
| single_lotus | 11/55 | 20.0% | 189/941 | 20.1% |
| twin_lotus | 1/1 | 100.0% | 199/995 | 20.0% |
| two_dragon_types | 23/65 | 35.4% | 177/931 | 19.0% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 21/131 | 16.0% |
| bamboo-2 | 44/200 | 22.0% |
| bamboo-3 | 27/167 | 16.2% |
| bamboo-4 | 33/177 | 18.6% |
| bamboo-5 | 35/152 | 23.0% |
| bamboo-6 | 36/189 | 19.0% |
| bamboo-7 | 37/180 | 20.6% |
| bamboo-8 | 42/180 | 23.3% |
| bamboo-9 | 29/169 | 17.2% |
| blank | 29/190 | 15.3% |
| characters-1 | 24/139 | 17.3% |
| characters-2 | 29/152 | 19.1% |
| characters-3 | 34/175 | 19.4% |
| characters-4 | 26/152 | 17.1% |
| characters-5 | 27/168 | 16.1% |
| characters-6 | 33/179 | 18.4% |
| characters-7 | 28/142 | 19.7% |
| characters-8 | 25/180 | 13.9% |
| characters-9 | 29/154 | 18.8% |
| dots-1 | 30/151 | 19.9% |
| dots-2 | 32/164 | 19.5% |
| dots-3 | 26/164 | 15.9% |
| dots-4 | 33/168 | 19.6% |
| dots-5 | 34/147 | 23.1% |
| dots-6 | 18/151 | 11.9% |
| dots-7 | 27/162 | 16.7% |
| dots-8 | 18/166 | 10.8% |
| dots-9 | 29/149 | 19.5% |
| dragon-green | 38/153 | 24.8% |
| dragon-red | 34/154 | 22.1% |
| dragon-white | 51/162 | 31.5% |
| flower-black-lotus | 5/26 | 19.2% |
| flower-white-lotus | 8/31 | 25.8% |
| joker-black | 16/55 | 29.1% |
| joker-blue | 16/45 | 35.6% |
| joker-green | 18/66 | 27.3% |
| joker-red | 24/64 | 37.5% |
| treasure-1 | 3/43 | 7.0% |
| treasure-2 | 8/41 | 19.5% |
| treasure-3 | 8/56 | 14.3% |
| treasure-4 | 11/54 | 20.4% |
| treasure-5 | 8/49 | 16.3% |
| wind-east | 38/187 | 20.3% |
| wind-north | 35/157 | 22.3% |
| wind-south | 28/151 | 18.5% |
| wind-west | 39/151 | 25.8% |

### 6 players: ladder

Denominators: 1403 dealt player-hands; 475 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1403/1403 | 1403/1403 | 475/475 | 7/475 | 0/240 |
| eye | 762/1403 | 1101/1403 | 399/475 | 19/475 | 0/240 |
| chow | 222/1403 | 445/1403 | 190/475 | 8/475 | 0/240 |
| two-eyes | 176/1403 | 568/1403 | 237/475 | 47/475 | 0/240 |
| pung | 130/1403 | 420/1403 | 222/475 | 17/475 | 0/240 |
| three-winds | 54/1403 | 111/1403 | 47/475 | 24/475 | 0/240 |
| chow-eye | 66/1403 | 294/1403 | 145/475 | 95/475 | 7/240 |
| pung-eye | 36/1403 | 284/1403 | 163/475 | 152/475 | 80/240 |
| three-dragons | 13/1403 | 36/1403 | 16/475 | 5/475 | 12/240 |
| kong | 6/1403 | 52/1403 | 28/475 | 28/475 | 33/240 |
| long-chow | 16/1403 | 65/1403 | 42/475 | 42/475 | 45/240 |
| four-winds | 7/1403 | 44/1403 | 20/475 | 20/475 | 41/240 |
| three-dragons-eye | 1/1403 | 19/1403 | 11/475 | 11/475 | 18/240 |
| twin-lotus | 2/1403 | 4/1403 | 0/475 | 0/475 | 4/240 |
| quint | 0/1403 | 0/1403 | 0/475 | 0/475 | 0/240 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 82/281 | 29.2% | 158/1122 | 14.1% |
| blank | 37/241 | 15.4% | 203/1162 | 17.5% |
| treasure | 41/296 | 13.9% | 199/1107 | 18.0% |
| single_lotus | 10/70 | 14.3% | 230/1333 | 17.3% |
| twin_lotus | 2/2 | 100.0% | 238/1401 | 17.0% |
| two_dragon_types | 14/100 | 14.0% | 226/1303 | 17.3% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 28/194 | 14.4% |
| bamboo-2 | 21/187 | 11.2% |
| bamboo-3 | 30/239 | 12.6% |
| bamboo-4 | 49/255 | 19.2% |
| bamboo-5 | 38/240 | 15.8% |
| bamboo-6 | 39/237 | 16.5% |
| bamboo-7 | 31/184 | 16.8% |
| bamboo-8 | 33/244 | 13.5% |
| bamboo-9 | 44/222 | 19.8% |
| blank | 37/241 | 15.4% |
| characters-1 | 33/232 | 14.2% |
| characters-2 | 34/214 | 15.9% |
| characters-3 | 37/234 | 15.8% |
| characters-4 | 37/245 | 15.1% |
| characters-5 | 42/259 | 16.2% |
| characters-6 | 37/248 | 14.9% |
| characters-7 | 41/255 | 16.1% |
| characters-8 | 41/247 | 16.6% |
| characters-9 | 41/209 | 19.6% |
| dots-1 | 34/237 | 14.3% |
| dots-2 | 32/204 | 15.7% |
| dots-3 | 40/214 | 18.7% |
| dots-4 | 38/220 | 17.3% |
| dots-5 | 36/213 | 16.9% |
| dots-6 | 41/234 | 17.5% |
| dots-7 | 35/257 | 13.6% |
| dots-8 | 37/226 | 16.4% |
| dots-9 | 31/228 | 13.6% |
| dragon-green | 44/223 | 19.7% |
| dragon-red | 36/228 | 15.8% |
| dragon-white | 48/237 | 20.3% |
| flower-black-lotus | 6/37 | 16.2% |
| flower-white-lotus | 8/37 | 21.6% |
| joker-black | 24/68 | 35.3% |
| joker-blue | 25/84 | 29.8% |
| joker-green | 17/68 | 25.0% |
| joker-red | 24/84 | 28.6% |
| treasure-1 | 14/78 | 17.9% |
| treasure-2 | 11/65 | 16.9% |
| treasure-3 | 4/49 | 8.2% |
| treasure-4 | 11/65 | 16.9% |
| treasure-5 | 4/69 | 5.8% |
| wind-east | 45/241 | 18.7% |
| wind-north | 59/232 | 25.4% |
| wind-south | 43/229 | 18.8% |
| wind-west | 51/261 | 19.5% |

## final-prototype

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 160 | 72 | 0 | 77 | 10.07 (7–19) | 17.2 | 2.04/7 |
| 5 | 10 | 200 | 97 | 0 | 54 | 11.56 (7–23) | 11.7 | 1.83/7 |
| 6 | 10 | 240 | 129 | 0 | 28 | 11.4 (7–23) | 17.7 | 1.83/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 26/237 (10.97%) | 31/237 | 4/10 | 5/10 | 2/160 | 7 | 9 |
| 5 | 20/249 (8.03%) | 29/249 | 3/10 | 1/10 | 4/200 | 14 | 10 |
| 6 | 42/506 (8.3%) | 57/506 | 1/10 | 1/10 | 8/240 | 44 | 46 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 336/362 | 21 | 21 | 131 | 1000 | 0 | 2, 2, 4, 6, 7, 5, 2, 4, 2, 5 |
| 5 | 440/474 | 43 | 37 | 194 | 2440 | 1 | 5, 3, 3, 3, 2, 5, 3, 4, 3, 2 |
| 6 | 538/570 | 46 | 45 | 317 | 4000 | 1 | 2, 5, 2, 4, 2, 4, 3, 3, 2, 2 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 3.12% → 6.88% → 12.03% → 7.5% | 0.42% → 9.12% → 17.88% → 15.9% |
| 5 | 4.8% → 4.03% → 5.74% → 8.4% | 0.88% → 9.34% → 17.22% → 12.5% |
| 6 | 1.94% → 8.33% → 6.82% → 6.72% | 1.07% → 11.63% → 11.1% → 9.85% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 638 dealt player-hands; 227 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 638/638 | 638/638 | 227/227 | 0/227 | 0/160 |
| eye | 398/638 | 519/638 | 194/227 | 6/227 | 0/160 |
| chow | 123/638 | 215/638 | 86/227 | 9/227 | 0/160 |
| two-eyes | 82/638 | 238/638 | 112/227 | 40/227 | 1/160 |
| pung | 123/638 | 218/638 | 100/227 | 4/227 | 0/160 |
| chow-eye | 40/638 | 146/638 | 57/227 | 37/227 | 6/160 |
| pung-eye | 25/638 | 111/638 | 60/227 | 51/227 | 21/160 |
| three-winds | 36/638 | 70/638 | 22/227 | 16/227 | 32/160 |
| three-dragons | 2/638 | 10/638 | 3/227 | 1/227 | 4/160 |
| kong | 17/638 | 78/638 | 33/227 | 25/227 | 36/160 |
| long-chow | 7/638 | 37/638 | 24/227 | 24/227 | 27/160 |
| four-winds | 4/638 | 18/638 | 5/227 | 5/227 | 15/160 |
| three-dragons-eye | 0/638 | 5/638 | 2/227 | 2/227 | 5/160 |
| twin-lotus | 0/638 | 1/638 | 0/227 | 0/227 | 1/160 |
| quint | 0/638 | 12/638 | 7/227 | 7/227 | 12/160 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 67/147 | 45.6% | 97/491 | 19.8% |
| blank | 39/133 | 29.3% | 125/505 | 24.8% |
| treasure | 25/139 | 18.0% | 139/499 | 27.9% |
| single_lotus | 4/20 | 20.0% | 160/618 | 25.9% |
| twin_lotus | 0/0 | — | 164/638 | 25.7% |
| two_dragon_types | 9/34 | 26.5% | 155/604 | 25.7% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 13/90 | 14.4% |
| bamboo-2 | 21/118 | 17.8% |
| bamboo-3 | 28/126 | 22.2% |
| bamboo-4 | 30/104 | 28.8% |
| bamboo-5 | 22/95 | 23.2% |
| bamboo-6 | 30/118 | 25.4% |
| bamboo-7 | 30/89 | 33.7% |
| bamboo-8 | 31/85 | 36.5% |
| bamboo-9 | 20/78 | 25.6% |
| blank | 39/133 | 29.3% |
| characters-1 | 19/99 | 19.2% |
| characters-2 | 14/70 | 20.0% |
| characters-3 | 11/76 | 14.5% |
| characters-4 | 26/97 | 26.8% |
| characters-5 | 23/102 | 22.5% |
| characters-6 | 19/83 | 22.9% |
| characters-7 | 21/89 | 23.6% |
| characters-8 | 22/131 | 16.8% |
| characters-9 | 18/107 | 16.8% |
| dots-1 | 15/105 | 14.3% |
| dots-2 | 21/89 | 23.6% |
| dots-3 | 32/108 | 29.6% |
| dots-4 | 23/115 | 20.0% |
| dots-5 | 20/102 | 19.6% |
| dots-6 | 19/97 | 19.6% |
| dots-7 | 29/150 | 19.3% |
| dots-8 | 25/98 | 25.5% |
| dots-9 | 22/102 | 21.6% |
| dragon-green | 25/95 | 26.3% |
| dragon-red | 23/80 | 28.8% |
| dragon-white | 22/79 | 27.8% |
| flower-black-lotus | 3/10 | 30.0% |
| flower-white-lotus | 1/10 | 10.0% |
| joker-black | 20/40 | 50.0% |
| joker-blue | 8/34 | 23.5% |
| joker-green | 27/45 | 60.0% |
| joker-red | 16/36 | 44.4% |
| treasure-1 | 11/38 | 28.9% |
| treasure-2 | 7/36 | 19.4% |
| treasure-3 | 1/11 | 9.1% |
| treasure-4 | 6/42 | 14.3% |
| treasure-5 | 3/30 | 10.0% |
| wind-east | 36/117 | 30.8% |
| wind-north | 45/104 | 43.3% |
| wind-south | 31/108 | 28.7% |
| wind-west | 44/116 | 37.9% |

### 5 players: ladder

Denominators: 992 dealt player-hands; 352 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 992/992 | 992/992 | 352/352 | 0/352 | 0/200 |
| eye | 559/992 | 776/992 | 303/352 | 5/352 | 0/200 |
| chow | 142/992 | 292/992 | 120/352 | 10/352 | 0/200 |
| two-eyes | 113/992 | 382/992 | 180/352 | 48/352 | 0/200 |
| pung | 128/992 | 331/992 | 166/352 | 8/352 | 0/200 |
| chow-eye | 43/992 | 188/992 | 95/352 | 60/352 | 4/200 |
| pung-eye | 25/992 | 201/992 | 115/352 | 98/352 | 22/200 |
| three-winds | 40/992 | 79/992 | 41/352 | 27/352 | 25/200 |
| three-dragons | 12/992 | 43/992 | 19/352 | 4/352 | 9/200 |
| kong | 20/992 | 87/992 | 41/352 | 36/352 | 52/200 |
| long-chow | 5/992 | 46/992 | 24/352 | 24/352 | 38/200 |
| four-winds | 9/992 | 23/992 | 14/352 | 14/352 | 14/200 |
| three-dragons-eye | 3/992 | 29/992 | 15/352 | 15/352 | 27/200 |
| twin-lotus | 3/992 | 4/992 | 0/352 | 0/352 | 4/200 |
| quint | 0/992 | 5/992 | 3/352 | 3/352 | 5/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 70/210 | 33.3% | 137/782 | 17.5% |
| blank | 45/231 | 19.5% | 162/761 | 21.3% |
| treasure | 42/202 | 20.8% | 165/790 | 20.9% |
| single_lotus | 12/51 | 23.5% | 195/941 | 20.7% |
| twin_lotus | 3/3 | 100.0% | 204/989 | 20.6% |
| two_dragon_types | 25/83 | 30.1% | 182/909 | 20.0% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 18/118 | 15.3% |
| bamboo-2 | 31/145 | 21.4% |
| bamboo-3 | 30/191 | 15.7% |
| bamboo-4 | 40/161 | 24.8% |
| bamboo-5 | 34/159 | 21.4% |
| bamboo-6 | 31/170 | 18.2% |
| bamboo-7 | 27/165 | 16.4% |
| bamboo-8 | 25/147 | 17.0% |
| bamboo-9 | 26/149 | 17.4% |
| blank | 45/231 | 19.5% |
| characters-1 | 26/152 | 17.1% |
| characters-2 | 35/179 | 19.6% |
| characters-3 | 21/162 | 13.0% |
| characters-4 | 26/137 | 19.0% |
| characters-5 | 30/161 | 18.6% |
| characters-6 | 42/181 | 23.2% |
| characters-7 | 26/169 | 15.4% |
| characters-8 | 25/137 | 18.2% |
| characters-9 | 32/156 | 20.5% |
| dots-1 | 27/160 | 16.9% |
| dots-2 | 27/161 | 16.8% |
| dots-3 | 25/158 | 15.8% |
| dots-4 | 18/150 | 12.0% |
| dots-5 | 24/141 | 17.0% |
| dots-6 | 31/169 | 18.3% |
| dots-7 | 34/162 | 21.0% |
| dots-8 | 19/127 | 15.0% |
| dots-9 | 26/149 | 17.4% |
| dragon-green | 43/165 | 26.1% |
| dragon-red | 51/195 | 26.2% |
| dragon-white | 44/172 | 25.6% |
| flower-black-lotus | 8/32 | 25.0% |
| flower-white-lotus | 10/25 | 40.0% |
| joker-black | 14/38 | 36.8% |
| joker-blue | 22/59 | 37.3% |
| joker-green | 18/71 | 25.4% |
| joker-red | 25/65 | 38.5% |
| treasure-1 | 12/41 | 29.3% |
| treasure-2 | 11/45 | 24.4% |
| treasure-3 | 3/30 | 10.0% |
| treasure-4 | 13/67 | 19.4% |
| treasure-5 | 4/29 | 13.8% |
| wind-east | 46/162 | 28.4% |
| wind-north | 47/197 | 23.9% |
| wind-south | 39/154 | 25.3% |
| wind-west | 42/160 | 26.2% |

### 6 players: ladder

Denominators: 1429 dealt player-hands; 568 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1429/1429 | 1429/1429 | 568/568 | 5/568 | 0/240 |
| eye | 818/1429 | 1143/1429 | 498/568 | 16/568 | 0/240 |
| chow | 248/1429 | 463/1429 | 229/568 | 14/568 | 0/240 |
| two-eyes | 161/1429 | 554/1429 | 266/568 | 69/568 | 0/240 |
| pung | 196/1429 | 472/1429 | 262/568 | 16/568 | 0/240 |
| chow-eye | 70/1429 | 309/1429 | 178/568 | 118/568 | 3/240 |
| pung-eye | 42/1429 | 275/1429 | 162/568 | 137/568 | 26/240 |
| three-winds | 46/1429 | 111/1429 | 51/568 | 42/568 | 39/240 |
| three-dragons | 19/1429 | 68/1429 | 39/568 | 6/568 | 19/240 |
| kong | 23/1429 | 100/1429 | 66/568 | 63/568 | 50/240 |
| long-chow | 12/1429 | 58/1429 | 42/568 | 42/568 | 42/240 |
| four-winds | 5/1429 | 13/1429 | 6/568 | 6/568 | 13/240 |
| three-dragons-eye | 4/1429 | 42/1429 | 33/568 | 33/568 | 39/240 |
| twin-lotus | 1/1429 | 4/1429 | 0/568 | 0/568 | 4/240 |
| quint | 1/1429 | 5/1429 | 1/568 | 1/568 | 5/240 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 102/322 | 31.7% | 141/1107 | 12.7% |
| blank | 53/258 | 20.5% | 190/1171 | 16.2% |
| treasure | 55/341 | 16.1% | 188/1088 | 17.3% |
| single_lotus | 9/56 | 16.1% | 234/1373 | 17.0% |
| twin_lotus | 1/1 | 100.0% | 242/1428 | 16.9% |
| two_dragon_types | 26/92 | 28.3% | 217/1337 | 16.2% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 26/209 | 12.4% |
| bamboo-2 | 36/239 | 15.1% |
| bamboo-3 | 44/247 | 17.8% |
| bamboo-4 | 28/211 | 13.3% |
| bamboo-5 | 45/256 | 17.6% |
| bamboo-6 | 43/253 | 17.0% |
| bamboo-7 | 35/230 | 15.2% |
| bamboo-8 | 25/221 | 11.3% |
| bamboo-9 | 25/187 | 13.4% |
| blank | 53/258 | 20.5% |
| characters-1 | 24/189 | 12.7% |
| characters-2 | 27/194 | 13.9% |
| characters-3 | 34/247 | 13.8% |
| characters-4 | 41/269 | 15.2% |
| characters-5 | 41/235 | 17.4% |
| characters-6 | 43/261 | 16.5% |
| characters-7 | 37/220 | 16.8% |
| characters-8 | 29/227 | 12.8% |
| characters-9 | 34/251 | 13.5% |
| dots-1 | 39/231 | 16.9% |
| dots-2 | 40/231 | 17.3% |
| dots-3 | 35/238 | 14.7% |
| dots-4 | 29/230 | 12.6% |
| dots-5 | 34/231 | 14.7% |
| dots-6 | 28/190 | 14.7% |
| dots-7 | 30/241 | 12.4% |
| dots-8 | 38/251 | 15.1% |
| dots-9 | 27/231 | 11.7% |
| dragon-green | 48/227 | 21.1% |
| dragon-red | 53/247 | 21.5% |
| dragon-white | 52/224 | 23.2% |
| flower-black-lotus | 6/31 | 19.4% |
| flower-white-lotus | 5/27 | 18.5% |
| joker-black | 13/51 | 25.5% |
| joker-blue | 25/84 | 29.8% |
| joker-green | 46/106 | 43.4% |
| joker-red | 26/96 | 27.1% |
| treasure-1 | 8/78 | 10.3% |
| treasure-2 | 14/67 | 20.9% |
| treasure-3 | 7/68 | 10.3% |
| treasure-4 | 17/75 | 22.7% |
| treasure-5 | 12/73 | 16.4% |
| wind-east | 45/230 | 19.6% |
| wind-north | 46/219 | 21.0% |
| wind-south | 49/253 | 19.4% |
| wind-west | 53/232 | 22.8% |

## confirmation-current

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 160 | 60 | 0 | 78 | 11.5 (7–21) | 4.7 | 1.54/7 |
| 5 | 10 | 200 | 94 | 0 | 43 | 14.3 (7–22) | 2.1 | 1.31/7 |
| 6 | 10 | 239 | 159 | 0 | 55 | 8.8 (7–18) | 30.5 | 2.45/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 23/225 (10.22%) | 29/225 | 5/10 | 3/10 | 1/160 | 13 | 10 |
| 5 | 17/211 (8.06%) | 21/211 | 0/10 | 5/10 | 1/200 | 20 | 16 |
| 6 | 28/466 (6.01%) | 31/466 | 3/10 | 2/10 | 50/240 | 99 | 79 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 366/386 | 36 | 33 | 209 | 860 | 0 | 3, 2, 2, 2, 2, 2, 1, 2, 1, 6 |
| 5 | 462/478 | 42 | 39 | 242 | 2060 | 0 | 2, 2, 2, 1, 1, 3, 1, 2, 3, 2 |
| 6 | 545/680 | 142 | 100 | 233 | 3900 | 3 | 5, 12, 6, 5, 8, 6, 2, 18, 9, 3 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 0.62% → 5.0% → 5.03% → 4.38% | 0.33% → 5.1% → 7.9% → 14.8% |
| 5 | 0.8% → 2.4% → 1.21% → 1.2% | 0.48% → 7% → 9.66% → 8.2% |
| 6 | 4.74% → 12.38% → 13.73% → 21.85% | 0.6% → 27.3% → 27.17% → 36.42% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 639 dealt player-hands; 202 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 639/639 | 639/639 | 202/202 | 0/202 | 0/160 |
| eye | 311/639 | 498/639 | 166/202 | 8/202 | 0/160 |
| chow | 113/639 | 243/639 | 89/202 | 9/202 | 0/160 |
| two-eyes | 56/639 | 259/639 | 87/202 | 31/202 | 0/160 |
| pung | 57/639 | 185/639 | 69/202 | 7/202 | 1/160 |
| three-winds | 23/639 | 56/639 | 23/202 | 14/202 | 1/160 |
| chow-eye | 22/639 | 154/639 | 63/202 | 44/202 | 12/160 |
| three-dragons | 6/639 | 21/639 | 11/202 | 1/202 | 6/160 |
| pung-eye | 11/639 | 121/639 | 43/202 | 40/202 | 63/160 |
| twin-lotus | 1/639 | 3/639 | 0/202 | 0/202 | 3/160 |
| long-chow | 7/639 | 40/639 | 20/202 | 20/202 | 23/160 |
| three-dragons-eye | 2/639 | 11/639 | 10/202 | 9/202 | 7/160 |
| four-winds | 0/639 | 24/639 | 9/202 | 9/202 | 21/160 |
| kong | 4/639 | 24/639 | 10/202 | 10/202 | 23/160 |
| quint | 0/639 | 0/639 | 0/202 | 0/202 | 0/160 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 53/147 | 36.1% | 108/492 | 22.0% |
| blank | 27/129 | 20.9% | 134/510 | 26.3% |
| treasure | 39/150 | 26.0% | 122/489 | 24.9% |
| single_lotus | 8/39 | 20.5% | 153/600 | 25.5% |
| twin_lotus | 1/1 | 100.0% | 160/638 | 25.1% |
| two_dragon_types | 12/51 | 23.5% | 149/588 | 25.3% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 19/85 | 22.4% |
| bamboo-2 | 20/96 | 20.8% |
| bamboo-3 | 18/93 | 19.4% |
| bamboo-4 | 27/97 | 27.8% |
| bamboo-5 | 24/106 | 22.6% |
| bamboo-6 | 19/109 | 17.4% |
| bamboo-7 | 17/127 | 13.4% |
| bamboo-8 | 21/100 | 21.0% |
| bamboo-9 | 27/122 | 22.1% |
| blank | 27/129 | 20.9% |
| characters-1 | 27/111 | 24.3% |
| characters-2 | 25/99 | 25.3% |
| characters-3 | 24/104 | 23.1% |
| characters-4 | 23/102 | 22.5% |
| characters-5 | 31/131 | 23.7% |
| characters-6 | 27/120 | 22.5% |
| characters-7 | 28/107 | 26.2% |
| characters-8 | 20/94 | 21.3% |
| characters-9 | 25/113 | 22.1% |
| dots-1 | 22/80 | 27.5% |
| dots-2 | 19/109 | 17.4% |
| dots-3 | 19/92 | 20.7% |
| dots-4 | 21/104 | 20.2% |
| dots-5 | 30/108 | 27.8% |
| dots-6 | 25/97 | 25.8% |
| dots-7 | 37/126 | 29.4% |
| dots-8 | 20/109 | 18.3% |
| dots-9 | 17/81 | 21.0% |
| dragon-green | 24/112 | 21.4% |
| dragon-red | 33/99 | 33.3% |
| dragon-white | 26/116 | 22.4% |
| flower-black-lotus | 5/19 | 26.3% |
| flower-white-lotus | 5/22 | 22.7% |
| joker-black | 11/29 | 37.9% |
| joker-blue | 17/50 | 34.0% |
| joker-green | 10/25 | 40.0% |
| joker-red | 19/49 | 38.8% |
| treasure-1 | 6/29 | 20.7% |
| treasure-2 | 12/31 | 38.7% |
| treasure-3 | 8/36 | 22.2% |
| treasure-4 | 10/37 | 27.0% |
| treasure-5 | 9/34 | 26.5% |
| wind-east | 36/124 | 29.0% |
| wind-north | 27/101 | 26.7% |
| wind-south | 35/104 | 33.7% |
| wind-west | 32/97 | 33.0% |

### 5 players: ladder

Denominators: 998 dealt player-hands; 312 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 998/998 | 998/998 | 312/312 | 4/312 | 0/200 |
| eye | 466/998 | 769/998 | 263/312 | 10/312 | 0/200 |
| chow | 127/998 | 336/998 | 133/312 | 12/312 | 0/200 |
| two-eyes | 70/998 | 376/998 | 148/312 | 35/312 | 0/200 |
| pung | 65/998 | 275/998 | 125/312 | 5/312 | 0/200 |
| three-winds | 41/998 | 81/998 | 34/312 | 16/312 | 0/200 |
| chow-eye | 27/998 | 215/998 | 110/312 | 80/312 | 9/200 |
| three-dragons | 10/998 | 34/998 | 18/312 | 7/312 | 8/200 |
| pung-eye | 8/998 | 188/998 | 99/312 | 92/312 | 88/200 |
| twin-lotus | 0/998 | 5/998 | 0/312 | 0/312 | 3/200 |
| long-chow | 1/998 | 40/998 | 16/312 | 16/312 | 31/200 |
| three-dragons-eye | 2/998 | 20/998 | 11/312 | 11/312 | 14/200 |
| four-winds | 3/998 | 35/998 | 16/312 | 16/312 | 30/200 |
| kong | 0/998 | 17/998 | 8/312 | 8/312 | 17/200 |
| quint | 0/998 | 0/998 | 0/312 | 0/312 | 0/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 65/222 | 29.3% | 139/776 | 17.9% |
| blank | 46/224 | 20.5% | 158/774 | 20.4% |
| treasure | 40/228 | 17.5% | 164/770 | 21.3% |
| single_lotus | 15/60 | 25.0% | 189/938 | 20.1% |
| twin_lotus | 0/0 | — | 204/998 | 20.4% |
| two_dragon_types | 15/60 | 25.0% | 189/938 | 20.1% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 26/149 | 17.4% |
| bamboo-2 | 24/160 | 15.0% |
| bamboo-3 | 28/167 | 16.8% |
| bamboo-4 | 28/142 | 19.7% |
| bamboo-5 | 38/166 | 22.9% |
| bamboo-6 | 37/175 | 21.1% |
| bamboo-7 | 31/159 | 19.5% |
| bamboo-8 | 29/152 | 19.1% |
| bamboo-9 | 41/172 | 23.8% |
| blank | 46/224 | 20.5% |
| characters-1 | 36/181 | 19.9% |
| characters-2 | 31/179 | 17.3% |
| characters-3 | 37/171 | 21.6% |
| characters-4 | 38/172 | 22.1% |
| characters-5 | 36/170 | 21.2% |
| characters-6 | 25/152 | 16.4% |
| characters-7 | 36/178 | 20.2% |
| characters-8 | 30/182 | 16.5% |
| characters-9 | 24/157 | 15.3% |
| dots-1 | 26/159 | 16.4% |
| dots-2 | 30/169 | 17.8% |
| dots-3 | 31/171 | 18.1% |
| dots-4 | 22/149 | 14.8% |
| dots-5 | 23/159 | 14.5% |
| dots-6 | 39/174 | 22.4% |
| dots-7 | 30/171 | 17.5% |
| dots-8 | 30/170 | 17.6% |
| dots-9 | 28/158 | 17.7% |
| dragon-green | 39/175 | 22.3% |
| dragon-red | 43/171 | 25.1% |
| dragon-white | 39/153 | 25.5% |
| flower-black-lotus | 11/32 | 34.4% |
| flower-white-lotus | 4/28 | 14.3% |
| joker-black | 19/57 | 33.3% |
| joker-blue | 19/67 | 28.4% |
| joker-green | 17/65 | 26.2% |
| joker-red | 12/48 | 25.0% |
| treasure-1 | 8/52 | 15.4% |
| treasure-2 | 12/52 | 23.1% |
| treasure-3 | 6/46 | 13.0% |
| treasure-4 | 9/52 | 17.3% |
| treasure-5 | 7/42 | 16.7% |
| wind-east | 42/177 | 23.7% |
| wind-north | 40/165 | 24.2% |
| wind-south | 40/178 | 22.5% |
| wind-west | 41/164 | 25.0% |

### 6 players: ladder

Denominators: 1290 dealt player-hands; 581 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1290/1290 | 1290/1290 | 581/581 | 3/581 | 0/239 |
| eye | 803/1290 | 990/1290 | 459/581 | 8/581 | 0/239 |
| chow | 233/1290 | 362/1290 | 172/581 | 8/581 | 0/239 |
| two-eyes | 202/1290 | 460/1290 | 232/581 | 34/581 | 0/239 |
| pung | 257/1290 | 435/1290 | 312/581 | 6/581 | 0/239 |
| three-winds | 103/1290 | 145/1290 | 98/581 | 23/581 | 0/239 |
| chow-eye | 73/1290 | 205/1290 | 120/581 | 69/581 | 0/239 |
| three-dragons | 24/1290 | 53/1290 | 36/581 | 9/581 | 8/239 |
| pung-eye | 67/1290 | 237/1290 | 174/581 | 162/581 | 40/239 |
| twin-lotus | 1/1290 | 2/1290 | 2/581 | 2/581 | 0/239 |
| long-chow | 20/1290 | 62/1290 | 48/581 | 48/581 | 26/239 |
| three-dragons-eye | 4/1290 | 33/1290 | 27/581 | 26/581 | 14/239 |
| four-winds | 31/1290 | 91/1290 | 71/581 | 71/581 | 44/239 |
| kong | 48/1290 | 140/1290 | 112/581 | 102/581 | 95/239 |
| quint | 5/1290 | 12/1290 | 10/581 | 10/581 | 12/239 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 108/315 | 34.3% | 134/975 | 13.7% |
| blank | 48/285 | 16.8% | 194/1005 | 19.3% |
| treasure | 44/292 | 15.1% | 198/998 | 19.8% |
| single_lotus | 9/42 | 21.4% | 233/1248 | 18.7% |
| twin_lotus | 0/1 | 0.0% | 242/1289 | 18.8% |
| two_dragon_types | 19/79 | 24.1% | 223/1211 | 18.4% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 27/199 | 13.6% |
| bamboo-2 | 36/218 | 16.5% |
| bamboo-3 | 32/175 | 18.3% |
| bamboo-4 | 29/134 | 21.6% |
| bamboo-5 | 34/197 | 17.3% |
| bamboo-6 | 30/175 | 17.1% |
| bamboo-7 | 48/186 | 25.8% |
| bamboo-8 | 41/214 | 19.2% |
| bamboo-9 | 38/193 | 19.7% |
| blank | 48/285 | 16.8% |
| characters-1 | 18/139 | 12.9% |
| characters-2 | 27/180 | 15.0% |
| characters-3 | 46/221 | 20.8% |
| characters-4 | 30/206 | 14.6% |
| characters-5 | 24/211 | 11.4% |
| characters-6 | 23/189 | 12.2% |
| characters-7 | 31/208 | 14.9% |
| characters-8 | 35/186 | 18.8% |
| characters-9 | 35/188 | 18.6% |
| dots-1 | 23/185 | 12.4% |
| dots-2 | 32/245 | 13.1% |
| dots-3 | 28/172 | 16.3% |
| dots-4 | 30/192 | 15.6% |
| dots-5 | 34/212 | 16.0% |
| dots-6 | 34/215 | 15.8% |
| dots-7 | 29/228 | 12.7% |
| dots-8 | 34/200 | 17.0% |
| dots-9 | 29/207 | 14.0% |
| dragon-green | 34/180 | 18.9% |
| dragon-red | 54/194 | 27.8% |
| dragon-white | 35/185 | 18.9% |
| flower-black-lotus | 4/21 | 19.0% |
| flower-white-lotus | 5/23 | 21.7% |
| joker-black | 21/78 | 26.9% |
| joker-blue | 22/68 | 32.4% |
| joker-green | 37/95 | 38.9% |
| joker-red | 34/87 | 39.1% |
| treasure-1 | 11/56 | 19.6% |
| treasure-2 | 10/67 | 14.9% |
| treasure-3 | 6/48 | 12.5% |
| treasure-4 | 10/61 | 16.4% |
| treasure-5 | 9/85 | 10.6% |
| wind-east | 48/265 | 18.1% |
| wind-north | 41/257 | 16.0% |
| wind-south | 50/227 | 22.0% |
| wind-west | 40/226 | 17.7% |

## confirmation-prototype

| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |
|---|---:|---:|---:|---:|---:|---|---:|---:|
| 4 | 10 | 160 | 69 | 0 | 86 | 9.4 (7–20) | 14.9 | 2.05/7 |
| 5 | 10 | 200 | 91 | 0 | 60 | 10.9 (7–22) | 15.7 | 1.81/7 |
| 6 | 10 | 240 | 108 | 0 | 24 | 11.37 (7–20) | 20.1 | 1.9/7 |

| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |
|---|---|---|---|---|---|---:|---:|
| 4 | 24/234 (10.26%) | 32/234 | 3/10 | 3/10 | 3/160 | 10 | 8 |
| 5 | 33/244 (13.52%) | 34/244 | 1/10 | 4/10 | 3/200 | 24 | 15 |
| 6 | 33/508 (6.5%) | 46/508 | 1/10 | 3/10 | 3/240 | 29 | 20 |

Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.

| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |
|---|---|---:|---:|---:|---:|---:|---|
| 4 | 331/360 | 22 | 20 | 161 | 1360 | 0 | 2, 3, 1, 7, 2, 5, 6, 4, 3, 2 |
| 5 | 445/458 | 32 | 29 | 203 | 1920 | 2 | 3, 5, 2, 3, 2, 3, 4, 6, 7, 3 |
| 6 | 544/554 | 42 | 37 | 293 | 2320 | 1 | 4, 2, 5, 3, 3, 5, 5, 2, 3, 5 |

Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.

| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 1.88% → 9.38% → 8.92% → 9.49% | 0.33% → 8.2% → 24.85% → 23.88% |
| 5 | 1.6% → 5.22% → 6.88% → 9.64% | 0.48% → 10.94% → 11.04% → 14.44% |
| 6 | 1.67% → 6.39% → 6.96% → 6.18% | 0.65% → 8.85% → 10.57% → 10.65% |

For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.

### 4 players: ladder

Denominators: 635 dealt player-hands; 228 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 635/635 | 635/635 | 228/228 | 1/228 | 0/160 |
| eye | 386/635 | 525/635 | 202/228 | 6/228 | 0/160 |
| chow | 106/635 | 188/635 | 87/228 | 12/228 | 0/160 |
| two-eyes | 83/635 | 247/635 | 102/228 | 37/228 | 0/160 |
| pung | 126/635 | 255/635 | 104/228 | 4/228 | 0/160 |
| chow-eye | 32/635 | 132/635 | 63/228 | 43/228 | 6/160 |
| pung-eye | 24/635 | 127/635 | 55/228 | 49/228 | 17/160 |
| three-winds | 22/635 | 64/635 | 22/228 | 14/228 | 38/160 |
| three-dragons | 8/635 | 23/635 | 13/228 | 3/228 | 3/160 |
| kong | 17/635 | 84/635 | 35/228 | 25/228 | 43/160 |
| long-chow | 3/635 | 22/635 | 13/228 | 13/228 | 18/160 |
| four-winds | 2/635 | 11/635 | 4/228 | 4/228 | 8/160 |
| three-dragons-eye | 3/635 | 16/635 | 10/228 | 9/228 | 13/160 |
| twin-lotus | 0/635 | 3/635 | 0/228 | 0/228 | 3/160 |
| quint | 2/635 | 13/635 | 8/228 | 8/228 | 11/160 |

### 4 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 68/177 | 38.4% | 95/458 | 20.7% |
| blank | 28/131 | 21.4% | 135/504 | 26.8% |
| treasure | 29/135 | 21.5% | 134/500 | 26.8% |
| single_lotus | 4/42 | 9.5% | 159/593 | 26.8% |
| twin_lotus | 0/0 | — | 163/635 | 25.7% |
| two_dragon_types | 8/42 | 19.0% | 155/593 | 26.1% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 24/91 | 26.4% |
| bamboo-2 | 20/87 | 23.0% |
| bamboo-3 | 36/128 | 28.1% |
| bamboo-4 | 29/112 | 25.9% |
| bamboo-5 | 22/100 | 22.0% |
| bamboo-6 | 17/84 | 20.2% |
| bamboo-7 | 20/109 | 18.3% |
| bamboo-8 | 16/70 | 22.9% |
| bamboo-9 | 21/124 | 16.9% |
| blank | 28/131 | 21.4% |
| characters-1 | 25/97 | 25.8% |
| characters-2 | 18/79 | 22.8% |
| characters-3 | 20/99 | 20.2% |
| characters-4 | 18/100 | 18.0% |
| characters-5 | 23/95 | 24.2% |
| characters-6 | 12/84 | 14.3% |
| characters-7 | 20/72 | 27.8% |
| characters-8 | 11/64 | 17.2% |
| characters-9 | 23/93 | 24.7% |
| dots-1 | 14/64 | 21.9% |
| dots-2 | 30/131 | 22.9% |
| dots-3 | 21/113 | 18.6% |
| dots-4 | 18/104 | 17.3% |
| dots-5 | 29/97 | 29.9% |
| dots-6 | 32/110 | 29.1% |
| dots-7 | 28/108 | 25.9% |
| dots-8 | 29/93 | 31.2% |
| dots-9 | 26/88 | 29.5% |
| dragon-green | 31/116 | 26.7% |
| dragon-red | 24/80 | 30.0% |
| dragon-white | 27/117 | 23.1% |
| flower-black-lotus | 1/19 | 5.3% |
| flower-white-lotus | 3/23 | 13.0% |
| joker-black | 24/50 | 48.0% |
| joker-blue | 22/57 | 38.6% |
| joker-green | 18/61 | 29.5% |
| joker-red | 11/27 | 40.7% |
| treasure-1 | 4/29 | 13.8% |
| treasure-2 | 7/34 | 20.6% |
| treasure-3 | 7/30 | 23.3% |
| treasure-4 | 7/22 | 31.8% |
| treasure-5 | 4/34 | 11.8% |
| wind-east | 34/112 | 30.4% |
| wind-north | 31/113 | 27.4% |
| wind-south | 38/99 | 38.4% |
| wind-west | 47/117 | 40.2% |

### 5 players: ladder

Denominators: 995 dealt player-hands; 326 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 995/995 | 995/995 | 326/326 | 1/326 | 0/200 |
| eye | 543/995 | 789/995 | 287/326 | 10/326 | 0/200 |
| chow | 166/995 | 356/995 | 143/326 | 9/326 | 0/200 |
| two-eyes | 106/995 | 383/995 | 163/326 | 42/326 | 0/200 |
| pung | 134/995 | 323/995 | 140/326 | 4/326 | 0/200 |
| chow-eye | 48/995 | 223/995 | 109/326 | 71/326 | 4/200 |
| pung-eye | 34/995 | 209/995 | 100/326 | 69/326 | 17/200 |
| three-winds | 24/995 | 74/995 | 21/326 | 17/326 | 40/200 |
| three-dragons | 11/995 | 41/995 | 24/326 | 2/326 | 7/200 |
| kong | 12/995 | 81/995 | 43/326 | 41/326 | 52/200 |
| long-chow | 10/995 | 49/995 | 33/326 | 33/326 | 34/200 |
| four-winds | 2/995 | 14/995 | 4/326 | 4/326 | 12/200 |
| three-dragons-eye | 3/995 | 31/995 | 22/326 | 22/326 | 29/200 |
| twin-lotus | 0/995 | 3/995 | 0/326 | 0/326 | 3/200 |
| quint | 0/995 | 2/995 | 1/326 | 1/326 | 2/200 |

### 5 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 88/267 | 33.0% | 114/728 | 15.7% |
| blank | 40/194 | 20.6% | 162/801 | 20.2% |
| treasure | 39/202 | 19.3% | 163/793 | 20.6% |
| single_lotus | 9/39 | 23.1% | 193/956 | 20.2% |
| twin_lotus | 0/0 | — | 202/995 | 20.3% |
| two_dragon_types | 18/72 | 25.0% | 184/923 | 19.9% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 29/168 | 17.3% |
| bamboo-2 | 25/143 | 17.5% |
| bamboo-3 | 26/175 | 14.9% |
| bamboo-4 | 36/172 | 20.9% |
| bamboo-5 | 25/163 | 15.3% |
| bamboo-6 | 23/155 | 14.8% |
| bamboo-7 | 28/164 | 17.1% |
| bamboo-8 | 18/147 | 12.2% |
| bamboo-9 | 31/138 | 22.5% |
| blank | 40/194 | 20.6% |
| characters-1 | 24/143 | 16.8% |
| characters-2 | 34/169 | 20.1% |
| characters-3 | 24/149 | 16.1% |
| characters-4 | 27/158 | 17.1% |
| characters-5 | 42/189 | 22.2% |
| characters-6 | 36/143 | 25.2% |
| characters-7 | 29/160 | 18.1% |
| characters-8 | 32/157 | 20.4% |
| characters-9 | 23/171 | 13.5% |
| dots-1 | 20/133 | 15.0% |
| dots-2 | 24/152 | 15.8% |
| dots-3 | 25/166 | 15.1% |
| dots-4 | 36/189 | 19.0% |
| dots-5 | 29/156 | 18.6% |
| dots-6 | 36/176 | 20.5% |
| dots-7 | 37/188 | 19.7% |
| dots-8 | 25/166 | 15.1% |
| dots-9 | 31/179 | 17.3% |
| dragon-green | 34/178 | 19.1% |
| dragon-red | 32/161 | 19.9% |
| dragon-white | 36/149 | 24.2% |
| flower-black-lotus | 6/19 | 31.6% |
| flower-white-lotus | 3/20 | 15.0% |
| joker-black | 25/68 | 36.8% |
| joker-blue | 21/68 | 30.9% |
| joker-green | 16/56 | 28.6% |
| joker-red | 34/92 | 37.0% |
| treasure-1 | 7/41 | 17.1% |
| treasure-2 | 7/40 | 17.5% |
| treasure-3 | 8/34 | 23.5% |
| treasure-4 | 14/63 | 22.2% |
| treasure-5 | 10/45 | 22.2% |
| wind-east | 48/143 | 33.6% |
| wind-north | 59/185 | 31.9% |
| wind-south | 32/150 | 21.3% |
| wind-west | 35/150 | 23.3% |

### 6 players: ladder

Denominators: 1435 dealt player-hands; 463 nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.

| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |
|---|---:|---:|---:|---:|---:|
| high-card | 1435/1435 | 1435/1435 | 463/463 | 4/463 | 0/240 |
| eye | 826/1435 | 1133/1435 | 397/463 | 16/463 | 0/240 |
| chow | 207/1435 | 455/1435 | 173/463 | 15/463 | 0/240 |
| two-eyes | 198/1435 | 552/1435 | 221/463 | 64/463 | 0/240 |
| pung | 208/1435 | 447/1435 | 194/463 | 10/463 | 0/240 |
| chow-eye | 47/1435 | 299/1435 | 135/463 | 93/463 | 3/240 |
| pung-eye | 43/1435 | 264/1435 | 127/463 | 107/463 | 24/240 |
| three-winds | 66/1435 | 132/1435 | 54/463 | 35/463 | 49/240 |
| three-dragons | 12/1435 | 45/1435 | 26/463 | 6/463 | 13/240 |
| kong | 22/1435 | 100/1435 | 50/463 | 45/463 | 64/240 |
| long-chow | 4/1435 | 49/1435 | 27/463 | 27/463 | 31/240 |
| four-winds | 9/1435 | 34/1435 | 19/463 | 19/463 | 26/240 |
| three-dragons-eye | 3/1435 | 25/1435 | 20/463 | 20/463 | 23/240 |
| twin-lotus | 0/1435 | 4/1435 | 0/463 | 0/463 | 4/240 |
| quint | 0/1435 | 3/1435 | 2/463 | 2/463 | 3/240 |

### 6 players: opening-card associations

| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |
|---|---:|---:|---:|---:|
| joker | 79/307 | 25.7% | 167/1128 | 14.8% |
| blank | 40/277 | 14.4% | 206/1158 | 17.8% |
| treasure | 48/311 | 15.4% | 198/1124 | 17.6% |
| single_lotus | 9/74 | 12.2% | 237/1361 | 17.4% |
| twin_lotus | 0/0 | — | 246/1435 | 17.1% |
| two_dragon_types | 9/75 | 12.0% | 237/1360 | 17.4% |

| Individual face in opening hand | Wins / openings holding it | Conditional win rate |
|---|---:|---:|
| bamboo-1 | 29/196 | 14.8% |
| bamboo-2 | 29/180 | 16.1% |
| bamboo-3 | 43/262 | 16.4% |
| bamboo-4 | 33/224 | 14.7% |
| bamboo-5 | 37/220 | 16.8% |
| bamboo-6 | 36/200 | 18.0% |
| bamboo-7 | 38/232 | 16.4% |
| bamboo-8 | 34/217 | 15.7% |
| bamboo-9 | 41/286 | 14.3% |
| blank | 40/277 | 14.4% |
| characters-1 | 45/226 | 19.9% |
| characters-2 | 39/237 | 16.5% |
| characters-3 | 21/231 | 9.1% |
| characters-4 | 29/265 | 10.9% |
| characters-5 | 33/210 | 15.7% |
| characters-6 | 43/239 | 18.0% |
| characters-7 | 39/269 | 14.5% |
| characters-8 | 36/234 | 15.4% |
| characters-9 | 38/220 | 17.3% |
| dots-1 | 31/220 | 14.1% |
| dots-2 | 44/246 | 17.9% |
| dots-3 | 36/230 | 15.7% |
| dots-4 | 32/229 | 14.0% |
| dots-5 | 37/208 | 17.8% |
| dots-6 | 30/232 | 12.9% |
| dots-7 | 34/257 | 13.2% |
| dots-8 | 31/241 | 12.9% |
| dots-9 | 36/188 | 19.1% |
| dragon-green | 43/227 | 18.9% |
| dragon-red | 32/243 | 13.2% |
| dragon-white | 32/184 | 17.4% |
| flower-black-lotus | 3/31 | 9.7% |
| flower-white-lotus | 6/43 | 14.0% |
| joker-black | 23/69 | 33.3% |
| joker-blue | 20/72 | 27.8% |
| joker-green | 18/96 | 18.8% |
| joker-red | 22/86 | 25.6% |
| treasure-1 | 9/54 | 16.7% |
| treasure-2 | 8/69 | 11.6% |
| treasure-3 | 7/71 | 9.9% |
| treasure-4 | 11/67 | 16.4% |
| treasure-5 | 15/66 | 22.7% |
| wind-east | 62/251 | 24.7% |
| wind-north | 69/266 | 25.9% |
| wind-south | 65/277 | 23.5% |
| wind-west | 56/211 | 26.5% |

