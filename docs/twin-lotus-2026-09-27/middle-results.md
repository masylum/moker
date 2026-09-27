# Twin Lotus between Three Dragons and Long Chow

**Recommendation: prefer this middle placement for the next playtest.** A two-card scoring core leaves five other cards available; rarity alone need not dictate a higher rank. The middle position gives Twins a meaningful reward while leaving Long Chow, Three Dragons + Eyes, Four Winds and Kong above it. The simulations support its usefulness, but are not a proof against optimal human strategies.

## Matched played-game comparison

128 new simulations / 2,048 table hands, using the same 64 seeds in each of two formats: four continuous orbits and four one-orbit games with stack resets. **24 samples per bot decision; 10 worker processes.** Prior automatic-win and lower-ranked results are reused, not rerun. All three arms use the same frozen rules and bot source, except the Twin rule and necessary bot awareness. Long Chow is present, starting sticks are two, and subsequent games add two to carried sticks. Production game rules were not changed.

| Measure | Automatic win | Below Three Dragons | Between Dragons and Long Chow |
|---|---:|---:|---:|
| Retained Twin holdings | 160 | 148 | 159 |
| Built after opening | 134 | 122 | 133 |
| Uncontested Twin wins | 133 | 102 | 117 |
| Twin folds | 0 | 21 | 9 |
| Twin holdings declaring Riichi | 57 | 43 | 59 |
| Net chips in Twin-holding hands | 20025 | 11125 | 16475 |
| Twin-category showdown wins | 27/27 (100.0%) | 15/24 (62.5%) | 26/33 (78.8%) |

Showdown counts refer to Twin as the scoring category; stronger ordinary combinations are classified separately. Retained holdings include folds. Uncontested wins must be considered alongside showdown wins because weak opponents often fold. Net-chip totals are descriptive, not a causal card-value estimate.

## Format breakdown

| Format | Lower Twin showdown wins | Middle Twin showdown wins | All-ins: automatic / lower / middle |
|---|---:|---:|---:|
| continuous | 4/9 | 9/14 | 10.8% / 8.8% / 7.8% |
| reset | 11/15 | 17/19 | 9.7% / 6.5% / 6.7% |

## Nearby ladder under the middle placement

| Category | Retained best category | Showdown win credit / appearances | Win rate |
|---|---:|---:|---:|
| pung-eye | 398 | 97/149 | 65.1% |
| three-dragons | 189 | 32/46 | 69.6% |
| twin-lotus | 159 | 26/33 | 78.8% |
| long-chow | 210 | 58/67 | 86.6% |
| three-dragons-eye | 126 | 45/51 | 88.2% |
| four-winds | 84 | 22/22 | 100.0% |
| kong | 17 | 3/3 | 100.0% |

## Optionality check

Tracked seven-card holdings throughout play, supplementing observations with terminal holdings when settlement occurred within one step. Bots reached Twins in 159 player-hands. We observed 0 transitions from Twin as the best hand into an eligible stronger ordinary hand, and 0 successful pivots that discarded both Lotuses. At settlement, 0 Twin holdings also scored a stronger ordinary combination.

Thus the five-card flexibility is a valid design consideration, but these bots did not demonstrate its upside in this batch. 59/159 retained Twin holdings declared Riichi, which locks further fishing; betting pressure also ends many hands early. This limits any claim that the simulations fully value human direction changes. It supports staying conservative about promoting Twins further, rather than treating rarity as the sole criterion.

## Implementation and validation

Experimental rank is 9.5, preserving ordinary rank values and bot thresholds. Best ordinary combinations still override Twin when stronger. Known Twin holdings no longer grant automatic victory, guaranteed draw equity or forced opponent folding. The hand-progress system recognizes the Twin target. Existing single-Lotus disqualification, bluff rewards, all-in locks and declared-Riichi locks are unchanged. The only rule difference from the lower-ranked snapshot is Twin rank 8.5 → 9.5; additional simulation telemetry does not draw random numbers or change game actions.

Direct tests confirm Twin beats Three Dragons, loses to Long Chow, and allows a stronger ordinary combination while retaining both flowers. Joker exclusion and 1,000 randomized unchanged-hand/Basic comparisons passed. The experimental simulation passes TypeScript checking. All ranked-arm showdowns were independently recomputed using the control ordinary evaluator plus the new Twin rule; see middle-settlement-audit.json.

The new cohort and prior cohorts share seed labels. Decisions can diverge, changing later deals and which opponents reach showdown. The formats also share their first game, so pooled observations are not independent replications. Small Twin showdown counts and policy-dependent selection prevent declaring convergence or optimal balance. Paired whole-table comparisons against the lower placement are in middle-paired-effects.json. Reproducible source, full data and ten full sample traces are in middle-experiment.tar.gz.

Seven observed Twin losses were to Long Chow (2), Three Dragons + Eyes (4), and Four Winds (1). Two format counts share an identical first-game loss, as explained above. Simulation time was 256 seconds (about 4.3 minutes).

To reproduce, extract middle-experiment.tar.gz into a scratch directory, place the prior experiment.tar.gz beside it, and link the project node_modules into ranked/. Run ranked/run.ts from ranked/ with Node and tsx. Run audit.ts from that same directory as ../audit.ts. Analysis scripts expect both archives/data in their extraction directory. Frozen source hashes and execution settings are in middle-manifest.json.
