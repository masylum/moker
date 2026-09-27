# Twin Lotus placement experiment — 27 September 2026

Question: replace Advanced Twin Lotus automatic victory with a normal rank between Pung + Eyes and Three Dragons, with Long Chow present.

## Protocol

Two frozen copies of the current engine and bots, 64 seeds in each of two formats per arm (256 simulations total): four continuous orbits; four one-orbit games with stack resets. Both arms use identical seed labels and settings, 24 equity samples per decision, 10 worker processes, two starting Riichi sticks and carryover plus two sticks in subsequent games. Basic is not changed or simulated. The ordinary ladder and single-Lotus bluff reward remain unchanged.

Control retains automatic Twin Lotus victory and its existing bot certainty behavior. Ranked variant gives Twin Lotus rank 8.5, between existing ranks 8 and 9; using a fractional rank preserves all existing bot rank thresholds and ordinary score distances. This is an experimental implementation, not a proposed public score label. Scoring chooses a stronger ordinary combination when present. Single Lotus still disqualifies the hand at showdown; Jokers cannot substitute for flowers. Existing all-in and declared-Riichi fishing locks remain.

Variant bot adjustments remove automatic victory, automatic folding against a known Twin, and guaranteed fishing equity. Equity sampling, Riichi evaluation, discard/fishing potential and tournament projections use the actual ranked score. Twin Lotus is added to hand-progress targets. This compares bots aware of their own rules; it is not a head-to-head contest between incompatible rulesets.

Source hashes are in `source-hashes.json`; frozen runnable copies are `control/` and `ranked/` inside `experiment.tar.gz`. Extract the archive into a scratch directory, then link the project node_modules into each copy before running. The archive also includes the scripts. `setup.py` reproduces the variant from matching original sources. `run.ts` is copied into either frozen copy and run there using `node --import tsx run.ts 128`; `analyze.py` summarizes both outputs. Seeds determine initial deals, but divergent decisions change later draws and states. Thus matched seeds are not identical-hand counterfactuals.

## Verification and caveats

Direct checks cover relative ranking, stronger ordinary hands with both flowers, engine settlement, loss of certainty against Dragons, and Joker exclusion. 1,000 randomized holdings check unchanged ordinary and Basic scoring. The experiment measures these heuristic bots, not optimal human play. Showdown entrants are selected by folding decisions; showdown win rate is not the unconditional value of an opening hand. Retained hands include folds; opening Twins are pre-Charleston. “Built” means absent from the opening hand but present in the final retained holding, not necessarily built through fishing alone.
