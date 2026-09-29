# Legacy v2: ladder and bot experiment

Current candidate: persistent personal decks and player-owned lanes; fixed-rank wilds; Quint above Kong; Treasure searches with no payout or scoring sets; clockwise fallback draws; existing Riichi sticks and rewards unchanged. This is a headless prototype on `codex/legacy-prototype`, not deployed or browser-playable.

## Findings

- Keep Quint above Kong. Its exact random seven-card probability is about one in 433,220; Kong is about one in 2,070.
- Keep Four Winds above Three Dragons and Eyes. Their Legacy probabilities are almost equal, but exact counting supports that order. The extra Winds and wilds change the relationship from ordinary Riichi.
- The ladder is not strictly ordered by initial rarity. Chow and Eyes is rarer than Pung and Three Winds; Pung and Eyes is rarer than Three Dragons. These are candidates for a separately tested reorder, not silent changes to this prototype.
- Searches give Treasures a useful role without a payout. These bots usually spend them when eligible, but current simulations do not establish their optimal strategic value.
- Clockwise fallback resolves the observed personal-deck shortages. It also moves cards across collections, so deck ownership is deliberately porous.

## Coverage and method

**7,000,000 independent uniform seven-card samples:** 2,000,000 each for Riichi and Legacy, plus 1,000,000 for each of three deck-removal controls. **510 simulated sessions, 7,599 recorded rounds.** Sessions include normal betting, a checkdown control, two through six players, and persistent multi-game tournaments.

The evaluator has 29 focused tests: 2,000 random Legacy hands against an independent oracle that expands wild assignments and uses the existing Riichi scorer; 1,000 ordinary Riichi hands against that scorer; all 1,716 and 3,432 seven-card subsets of two reduced decks; all 34 possible Quint identities and their one-card deletions; and targeted substitutions, compound-hand disjointness, privacy, search ordering, card/chip conservation, fallback, and Riichi reward cases. Exact probability helpers are checked against the reduced-deck exhaustive enumerations.

“Contains” asks whether a hand can form a category, independently of other categories. Categories overlap. “Best” uses the current ladder and therefore depends on its order. Opening rarity excludes Charleston, fishing, folding, and deck-building. Seven-card samples use uniform sampling without replacement. Five-player removal of two uniformly random setup cards leaves this unconditional opening distribution unchanged; a known particular reserve would condition it.

## Opening ladder frequencies

Percent of all seven-card hands. **E** marks exact combinatorial results; other values are Monte Carlo estimates. The last column is a marginal 95% Wilson interval for Legacy estimates, or “exact”. These intervals are not simultaneous confidence bounds.

| Category, current order    | Riichi contains | Legacy contains | Legacy / Riichi | Legacy 95% interval |
| -------------------------- | --------------: | --------------: | --------------: | ------------------: |
| Eyes                       |        30.6586% |        39.8788% |           1.30× |    39.8110–39.9467% |
| Chow                       |        11.1897% |        13.3191% |           1.19× |    13.2721–13.3663% |
| Two Eyes                   |         2.6480% |         4.8750% |           1.84× |      4.8452–4.9049% |
| Chow and Eyes              |         1.2326% |         2.0427% |           1.66× |      2.0231–2.0623% |
| Pung                       |         2.0101% |         2.9885% |           1.49× |      2.9649–3.0121% |
| Three Winds (E)            |         1.9694% |         2.5076% |           1.27× |               exact |
| Pung and Eyes              |         0.1835% |         0.3711% |           2.02× |      0.3628–0.3796% |
| Three Dragons (E)          |         0.8300% |         0.8767% |           1.06× |               exact |
| Twin Lotus (E)             |         0.3378% |         0.2429% |           0.72× |               exact |
| Long Chow                  |         0.1167% |         0.1726% |           1.48× |      0.1669–0.1784% |
| Three Dragons and Eyes (E) |         0.0864% |         0.1257% |           1.46× |               exact |
| Four Winds (E)             |         0.0920% |         0.1245% |           1.35× |               exact |
| Kong (E)                   |         0.0192% |         0.0483% |           2.52× |               exact |
| Quint (E)                  |       0.000000% |       0.000231% |             new |               exact |

A lone Lotus occurs in 11.79% of Riichi samples and 10.12% of Legacy samples. Such hands cannot win a contested showdown under the retained Lotus rule. The table counts raw patterns; `eligibleBest` in the JSON separately excludes lone-Lotus hands.

### Exact rare-hand checks

There are 34 five-card Quint supports: 27 numbered identities, three Dragons, and four Winds. A suited/Dragon Quint uses its three natural copies, matching Joker, and fixed-rank wild; a Wind Quint uses four natural copies and the black Joker. Two Quints cannot fit in seven cards. Thus P(Quint) = 34 × C(127, 2) / C(132, 7). The two million Legacy samples contained only two Quints; the exact result is the reliable estimate.

Kong counting sums each identity’s four-or-five-card hypergeometric probability, subtracting overlapping two-Kong hands that share one substitute. No triple intersection fits in seven cards. Honor calculations enumerate multiplicities and substitute availability. Three Dragons and Eyes enumerates Dragon-capable subsets and counts pair-free subsets of the remaining deck, preventing reuse of a wild in both parts.

Three Dragons and Eyes: **0.125711%**; Four Winds: **0.124487%**. Four Winds is only 0.97% less frequent. Ordinary Riichi instead has 0.086392% versus 0.091962%. Do not infer a meaningful gameplay strength gap from this narrow opening difference.

### Current rarity inversions

| Lower-ranked category | Higher-ranked category | Legacy difference (lower minus higher, percentage points) | Paired-sample 95% interval |
| --------------------- | ---------------------- | --------------------------------------------------------: | -------------------------: |
| Chow and Eyes         | Pung                   |                                                   -0.9458 |         [-0.9746, -0.9170] |
| Chow and Eyes         | Three Winds            |                                                   -0.4519 |         [-0.4814, -0.4224] |
| Pung and Eyes         | Three Dragons          |                                                   -0.4959 |         [-0.5111, -0.4806] |

These differences exceed sampling noise. If the goal is a strictly opening-rarity ladder, the relevant middle order would be **Two Eyes → Pung → Three Winds → Chow and Eyes → Three Dragons → Pung and Eyes → Twin Lotus**. I would test that as a separate variant before adopting it. Compound hands are easier for these bots to develop through selection, and the scoring ladder itself drives their decisions. Initial rarity alone cannot settle balance.

## Which added cards cause the changes?

Each removal control changes both available patterns and total deck size; it is not a same-size replacement experiment. One million samples per control, with exact values below where available.

| Deck                                       | Cards |     Eyes | Pung and Eyes | Three Winds (E) | Four Winds (E) | Kong (E) | Quint (E) |
| ------------------------------------------ | ----: | -------: | ------------: | --------------: | -------------: | -------: | --------: |
| Full Legacy                                |   132 | 39.8788% |       0.3711% |         2.5076% |        0.1245% |  0.0483% | 0.000231% |
| Remove ten wilds                           |   122 | 28.9585% |       0.1541% |         3.1079% |        0.1686% |  0.0198% | 0.000041% |
| Remove four extra Winds                    |   128 | 39.8151% |       0.3827% |         1.3559% |        0.0546% |  0.0496% | 0.000238% |
| Remove two extra Blanks and four Treasures |   126 | 43.0932% |       0.4718% |         2.8471% |        0.1489% |  0.0583% | 0.000292% |

Wilds are the main driver of the higher Kong rate and create the suited/Dragon Quints. Extra Winds make Wind patterns much more accessible and permit four Wind Quints even without wilds. Extra utility cards dilute scored patterns in random hands; their fishing abilities can compensate during play. Keeping Riichi sticks means there is no additional Riichi-card dilution. Changing Treasure use and removing its payout changes play, not the 132-card opening composition.

## Bot play with Treasure searches

The main comparison uses 150 four-player sessions per arm, four dealer orbits, 32 sampled hidden worlds per decision, and matched setup seeds `legacy-v2:0` through `legacy-v2:149`. The control keeps all 132 cards but disables Treasure search and its policy value. Actions, deck trajectories, and later random events diverge; this is not a per-action causal estimate.

| Arm             | Completed | Rounds | Contested showdowns | Contender hands | Searches | Clockwise fallback draws | Final collection range |
| --------------- | --------: | -----: | ------------------: | --------------: | -------: | -----------------------: | ---------------------: |
| Search enabled  |   150/150 |   2181 |                 645 |            1577 |     1750 |                        3 |                   7–69 |
| Search disabled |   150/150 |   2203 |                 668 |            1622 |        0 |                        8 |                   7–78 |

Bots searched in **1,750/2,135 eligible decisions (81.97%)**. 768 searches (43.89%) immediately improved scored hand strength, including tie-breaks. 34.51% targeted the actor's own deck. These are policy observations, not probabilities that using a Treasure wins more chips. Opportunities exclude folds, locked hands, and actions that did not offer fishing; repeated decisions are correlated.

| Street | Eligible decisions | Searches | Use rate |
| ------ | -----------------: | -------: | -------: |
| 1      |               1656 |     1321 |   79.77% |
| 2      |                379 |      340 |   89.71% |
| 3      |                 76 |       69 |   90.79% |
| 4      |                 24 |       20 |   83.33% |

The new mechanic removes the old 1/7, 1/4, or 1/3 private-hand disruption gamble. Its value is selection and collection transfer: replace an otherwise unscored Treasure with the best of three unseen cards. If a searched deck has N cards with K useful hits, a three-card search hits at least one with probability **1 − C(N−K, 3)/C(N, 3)**, before accounting for remembered cards or competing fishing options. For example, 4 useful cards in a 20-card deck gives 50.9%, versus 20% for one blind draw. Use the actual smaller offer size when fewer than three remain.

Searching another deck takes a useful card from its future draws; the Treasure you discard feeds a neighbor’s lane and may be fished back into circulation. Leaving unchosen cards in order also creates information: the searcher can know upcoming draws. This makes Treasures interact naturally with persistent decks, lane access, and sticks. The bots model short-term selection and remembered tops, but only shallowly value future denial and collection curation.

## Achieved hands and selection effects

Raw “contains” frequencies after Charleston and among contested-showdown contenders in the search-enabled arm; best-category counts for both arms are also shown. Different denominators and folding make these descriptive, not a controlled rarity ranking.

| Category               | After Charleston contains | Showdown contains | Best at showdown: search | Best at showdown: control |
| ---------------------- | ------------------------: | ----------------: | -----------------------: | ------------------------: |
| High Card              |                   100.00% |           100.00% |                       18 |                        16 |
| Eyes                   |                    63.85% |            88.40% |                       42 |                        45 |
| Chow                   |                    27.58% |            52.31% |                       61 |                        82 |
| Two Eyes               |                    17.46% |            52.89% |                      193 |                       211 |
| Chow and Eyes          |                     9.73% |            40.58% |                      399 |                       410 |
| Pung                   |                     9.85% |            32.91% |                      111 |                       120 |
| Three Winds            |                     5.37% |            10.91% |                      140 |                       150 |
| Pung and Eyes          |                     3.35% |            23.21% |                      339 |                       323 |
| Three Dragons          |                     2.31% |             5.83% |                       26 |                        22 |
| Twin Lotus             |                     0.31% |             0.25% |                        4 |                         0 |
| Long Chow              |                     1.14% |             8.94% |                      141 |                       157 |
| Three Dragons and Eyes |                     0.82% |             4.19% |                       66 |                        42 |
| Four Winds             |                     0.95% |             1.33% |                       21 |                        27 |
| Kong                   |                     0.50% |             1.01% |                       16 |                        17 |
| Quint                  |                     0.03% |             0.00% |                        0 |                         0 |

Denominators: 7,969 post-Charleston hands, 1,577 search-arm contenders, and 1,622 control contenders. Lone-Lotus disqualification remains part of settlement; these raw category counts include such contenders. The raw files also record fractional pot wins, but wins conditional on a category do not establish its intrinsic value.

Compound hands appear much more often after fishing than their opening rarity suggests. Twin Lotus is especially uncommon among these bots’ finished hands because a single Lotus is dangerous and often discarded. This argues for human testing of the middle ladder and Lotus incentives, not automatically sorting the entire ladder by showdown counts. No Quint reached a contested showdown in the main four-player arms, but two post-Charleston hands in search-enabled session 131 did contain Quints. Replaying that session confirmed that the holder won rounds 12 and 13 uncontested. Across the five- and six-player stress runs, seven contender hands contained Quints. Repeated strong collections make random-deal rarity an incomplete description of long-term attainability.

### Matched-session uncertainty

The mean change in the per-session proportion of showdown contenders whose best hand is Long Chow or higher is estimated by resampling whole paired sessions (5,000 bootstrap repetitions). This preserves within-session correlations; it measures this policy comparison, not optimal Treasure value.

Search minus control: **+0.09 percentage points**, 95% bootstrap interval **[-2.85, +3.01]**, across 150 pairs with at least one contender in each arm. Pairs with no showdown are excluded from this particular statistic. This exploratory interval is not adjusted for multiple comparisons.

## Stress tests and policy sensitivity

| Configuration                    | Completed sessions | Rounds | Searches | Fallback draws (deal / fish) | Final collection range |
| -------------------------------- | -----------------: | -----: | -------: | ---------------------------: | ---------------------: |
| 2 players, four orbits           |              30/30 |    240 |       95 |                        0 / 0 |                  52–80 |
| 3 players, four orbits           |              30/30 |    355 |      237 |                        0 / 0 |                  28–59 |
| 5 players, four orbits           |              30/30 |    479 |      368 |                       16 / 8 |                   6–66 |
| 6 players, four orbits           |              30/30 |    540 |      431 |                     159 / 84 |                   7–57 |
| 4 players, three two-orbit games |              30/30 |    689 |      567 |                        0 / 1 |                   7–62 |
| 4 players, 96 decision samples   |              30/30 |    432 |      330 |                        0 / 0 |                  11–72 |
| 4 players, no bets or folds      |              30/30 |    480 |      539 |                        0 / 0 |                  12–52 |

For the same first 30 setup seeds, 32-world decisions searched 357/433 times (82.45%); 96-world decisions searched 330/398 times (82.91%). This checks sensitivity to sampling noise, not convergence or optimality.

All moves are checked for 132 unique physical cards including the five-player reserve. Targeted tests additionally check chip conservation and unchanged Riichi settlement. No seed-skipping or free-fish-forfeiting exception from v1 remains. All-decks-empty is still an explicit failure rather than invented recycling; the completed sessions establish only that it was not encountered in this sample.

## Interpretation and limits

- The deck-building loop works: Charleston exchanges cards, fishing transfers them, and unclaimed lane cards become the destination owner’s next deck. An opponent can influence your future collection by choosing where to discard.
- Clockwise borrowing keeps small collections playable, but reduces control over a supposedly personal deck. Watch whether players deliberately thin their decks and rely on neighbors for supply.
- Without payouts or scoring sets, Treasures are action resources. Search selection and knowledge of leftovers now provide the incentive to keep them; there is no reserve-chip inflation.
- The heuristic gives concealed Treasures a small development value and currently discards spent Treasures left. It does not optimize both discard destinations, long-term collection quality, or sophisticated betting-conditioned opponent ranges. High use is evidence of utility to these bots, not proof of balance.
- This experiment does not compare win rates between an optimal search policy and an optimal alternative. Normal fishing can use known lane cards; Treasure search must be committed before seeing offers.
- Quints remain uncommon, but can recur after the required cards concentrate in a persistent collection. The consecutive uncontested wins demonstrate that mechanism; these few cases cannot estimate a stable long-term Quint rate. No additional copies are created by collection transfer.
- Keep the tested ladder for the first human prototype, while explicitly testing the proposed middle reorder separately. The top Four Winds/Kong/Quint order is supported; the whole ladder is not calibrated solely by rarity.
- There is no browser option, production card schema, save compatibility, or `legacy` name gate yet. No publishing or deployment was performed.

## Verification

All 236 unit tests and 13 Worker integration tests passed, including the 29 Legacy cases. Lint, unused-code checks, and TypeScript checks passed. Changed files pass formatting; the repository-wide format check still reports pre-existing files in `docs/twin-lotus-2026-09-27`. A rerun of search-enabled session 131 reproduces its stored result exactly.

## Reproduction and provenance

See [current rules and commands](../legacy-prototype.md). Every JSON records options and seeds. `legacy-a/b` and `riichi-a/b` contain the two-million-hand pooled comparisons; the three removal files contain one million each. `exact-*` files use zero Monte Carlo samples and calculate the exact results added after the large samples completed. Simulator JSON contains action counts, searches, fallback events, opening/achieved categories, and example private-search audits for offline analysis only.

`python3 scripts/legacy/report.py` rebuilds this report from the checked-in JSON. The v1 [report and source archive](../legacy-2026-09-28/README.md) preserve the superseded rules. Current source and outputs are listed in `manifest.json`; `prototype-source.tar.gz` preserves this version independently of later changes.
