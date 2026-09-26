# Fishing-rule and catch-up experiment — 25 September 2026

This is an isolated experiment. `current/src/game` freezes the app's upgraded bots and current rules; `proposed/src/game` contains the proposed rules and bots adapted to those fishing entitlements. The application source is not switched to the proposal.

## Rules under test

- Basic: Check, Call, and Bet/Raise each provide one free draw-and-discard or Blank exchange.
- Riichi: Check and Call each provide one free fishing step. A stick buys a second step after either action, or a single fishing step after Bet/Raise.
- The user explicitly retained the all-in and declared-Riichi locks. No fishing occurs after the hand has already ended uncontested. An omitted free-draw choice defaults to the deck.
- Four players, 200 initial chips, five-chip wager unit. No stack reset between orbits. All configurations use 24 Monte Carlo samples per equity projection; planning may evaluate multiple projections at that budget.

Adapted bots attach draw choices to newly eligible actions, evaluate their post-fishing equity, plan two-step Call fishing, and distinguish free draws from stick-funded draws. Basic deck fishing now receives the same kind of post-draw equity forecast used in Riichi. The bot avoids selecting an exhausted deck. Existing policy weights are frozen; this experiment does not tune policies on the comparison seeds.

## Cohorts

The main paired comparison has 500 games per variant in each mode: Basic four-orbit tournaments, and Riichi one-orbit games (2,000 completed games planned). A separate 200-game-per-variant, four-orbit Riichi comparison measures recovery across orbits (400 more tournaments). Main seeds are `fishing-holdout-20260925:MODE:INDEX`; extended Riichi seeds are `fishing-long-20260925:riichi:INDEX`. Both variants receive the same index set. Interrupted batches and short fixtures are excluded from the retained sample count.

This compares **current rules/current upgraded bots** against **proposed rules/adapted upgraded bots**. It estimates the combined change, rather than isolating a pure rule effect independently of bot behavior. It is not a head-to-head win-rate test between rule systems.

## Catch-up definitions

Orbit checkpoints use settled scores before the next ante or automatic loan. Riichi score is cash minus 250 points per loan. The initial orbit begins tied, so it cannot identify a unique leader or trailer.

- **Leader:** the unique highest-scoring live player entering an orbit.
- **Live trailer:** the unique lowest-scoring live player, strictly behind the leader. In Basic, a player must have at least five chips to play the next hand. Riichi loans keep all four players eligible.
- **Absolute trailer:** unique last place including eliminated players; reported separately to avoid disguising elimination as a failure of live catch-up.
- **Final win:** tournament winner credit. Tied winners split one win credit.
- **Ends orbit leading:** share of the end-of-orbit lead belonging to the original live trailer; ties split credit.
- **Ever leads in orbit:** the trailer reaches or shares first place after at least one hand in the orbit.
- **Wins orbit gain:** the trailer has the best net-score change during that orbit (the smallest loss if every player loses points), splitting credit for ties. This is distinct from finishing first.

The all-tournament checkpoint analysis asks whether the eventual champion was behind (or last) after each orbit, carrying terminal standings forward after an early ending. This retains a fixed denominator and exposes lost recovery opportunities. Separately, the conditional live-player analysis does not invent played orbits after a tournament ended early. Tables show tournaments reaching each orbit and eligible leader/trailer counts. Rank transitions and deficit buckets are retained alongside the headline rates. Conditional recovery rates can change because the populations of surviving trailers change; they are descriptive rather than a causal guarantee for a particular player.

Other health measures include completed fishing steps, deck versus lane sources, observed lane occupancy, folding when facing a wager, Street 4 reach, ante-triggered Street 0 showdowns, all-in hands, eliminations, loans, final score distributions, showdown improvement, and whether the strongest hand at the start of betting ultimately wins. Initial-hand strength is measured after Charleston when it occurs; immediate ante showdowns use the dealt hand. That last metric describes initial-hand dependence, not the causal effect of bullying.

## Reproduction

From the repository root:

```sh
npx tsx scripts/experiment-fishing.ts --games 250 --mode basic --variant current --offset 0 --output /tmp/basic-current.json
npx tsx scripts/experiment-fishing.ts --games 250 --mode basic --variant proposed --offset 0 --output /tmp/basic-proposed.json
npx tsx scripts/experiment-fishing.ts --games 100 --mode riichi --orbits 4 --variant proposed --seed fishing-long-20260925 --offset 0 --output /tmp/riichi-long.json
```

The main cohort uses offsets 0 and 250; extended Riichi uses 0 and 100. Change the mode/variant accordingly. Every completed game is checkpointed to an adjacent JSONL file; the final JSON includes source hashes and the complete cohort. Chip and stick conservation are checked throughout the batch. Source hashes and experiment settings are in `manifest.json`.

`python3 scripts/summarize-fishing.py` aggregates the main health cohorts with paired game-level bootstrap intervals. `python3 scripts/summarize-fishing-catchup.py` aggregates orbit recovery; its approximate confidence intervals use tournament-level influence values, including the varying conditional denominators. Individual hands, players, or repeated orbit checkpoints are not treated as independent tournament samples.

The final execution was rebalanced from completed-game checkpoints into smaller disjoint chunks. `execution-checkpoints.json` records preserved prefix counts and resumed index ranges. This changes scheduling only: seeds, source hashes, policy, and the 24-sample configuration remain fixed. The merged cohort files assert complete index sets with no duplicates. These preserved games are counted once; unfinished games at interruption are excluded.

Raw rank transitions use competition ranking: tied positions share the rank after all strictly higher scores. The headline recovery measures use score comparisons rather than treating such ordinal changes as gains.

At zero/one observed recovery rates, component intervals use conservative bounds over eligible independent tournaments; very small groups use score bounds. Normal paired-difference intervals are omitted at those boundaries rather than displaying a misleading zero-width interval.

Formal elimination counts use the engine’s eliminated flag. Live eligibility at orbit checkpoints separately uses the cash required to meet the next Basic ante. Optional chart reproduction requires Matplotlib: run `python3 scripts/plot-fishing.py` after the two aggregate scripts, then `python3 scripts/render-fishing-report.py`.
