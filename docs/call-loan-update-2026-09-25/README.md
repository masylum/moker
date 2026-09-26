# Call decisions and one loan per game

`previous` freezes the prior policy and engine. `baseline` adapts that policy to the shared v6 one-loan rules. `candidate-v1` freezes the development candidate; `final` freezes the policy used for final simulations.

Completed budget: **40 games**, four orbits, four players, 200 initial chips, **24 joint equity trials per projection**. The final policy considers up to four feasible concealed completions per opponent inside each trial, based on public hand-building opportunities.

Development: five old-policy Riichi audit games, five candidate-v1 Riichi audit games, twelve mixed Riichi games and six mixed Basic games (28 total). Final validation: five final-policy Riichi audit games, six mixed Riichi games (one fresh seed with all six seat assignments), and one Basic smoke game (12 total). No further games were run. All games check chip/stick conservation and the one-loan cap.

The old and final homogeneous Riichi audits share five seeds and the same one-loan rule. Competitive tables use the current engine for both policies. The final policy won two of six mixed games; this small, correlated sample does not establish superiority. Full decision logs and readable traces are under `results`.

Simulation hashes remain in `manifest.json`; delivered hashes separately identify the equivalent loop-guard lint cleanup after simulation. See the parent report for interpretation.
