# Bot upgrade experiment — 25 September 2026

The source and holdout files in this directory preserve the first candidate. Its Basic improvement was accepted; its Riichi version was rejected after the expanded holdout showed only 51.4% wins and a negative mean-score difference. Later candidates and final selection are documented separately.

The opponent in `baseline.ts` is the unmodified pre-upgrade heuristic, with relative imports redirected to the current game modules. The original heuristic SHA-256 is `55e900858ae3b6a21c8de8e5592d6e87e171871b365872fa420e6cd1403d1a77`; it is also preserved in the earlier health study. Both generations run on the same engine, scoring rules, and legal-action definitions.

The application configuration is **24 samples**. This is the budget for each equity projection, not four-sample screening. The old bot also samples 24 possible deck draws for fishing potential. The candidate can additionally evaluate a visible one-draw or two-draw continuation with 24 equity samples each; known Twin Lotus needs no simulation. Thus the candidate does more planning work while retaining the app's 24-sample uncertainty calibration. There is no hidden-card or hidden-deck access in planning.

Basic comparisons use **four continuous orbits**, 200 starting chips, with no stack reset. Riichi comparisons use one orbit and 200 chips. This differs from the previous health report's four reset-game Basic tournaments. The current chip unit is five; it changed during preliminary tuning. One-chip tuning results are exploratory and must not be pooled with five-chip results.

Mixed matches place two candidates and two legacy bots at the table. Each independent deal seed is repeated for all six possible candidate seat pairs. Bots play individually; there is no team information or collaboration. Win credit is the fraction of tied game winners belonging to the candidate generation. The neutral expectation is 50%. Score advantage is candidate mean score per seat minus legacy mean score per seat, including loan penalties. Reported intervals use the independent seed as the cluster, not each seat rotation as an independent observation.

Self-play controls compare four new bots with four legacy bots on the same seed family. Street 4 means a hand actually opened Street 4, including hands ending uncontested there. Blank counts are completed exchanges. Stick counts are actual paid actions, not merely proposed actions. A two-step dig takes two successive cards from the same lane; a Blank chain draws a visible Blank and then exchanges it. Basic elimination counts use final player state, since the engine does not emit a separate elimination event.

Re-run live comparisons with:

```sh
npx tsx scripts/benchmark-bots.ts --games 240 --mode basic --seed YOUR-FRESH-SEEDS --output /tmp/basic.json
npx tsx scripts/benchmark-bots.ts --games 240 --mode riichi --seed YOUR-FRESH-SEEDS --output /tmp/riichi.json
```

Use `--generation new` or `--generation old` for self-play controls. Mixed game counts must be divisible by six. Every run records source hashes and checks chip and stick conservation. Tuning seeds and final holdout seeds are separate.

For the exact archived engine and bots, run the same commands from `docs/bot-upgrade-2026-09-25/source` instead of the repository root. That directory contains a standalone copy of the benchmark and its game dependencies. `manifest.json` records their hashes; the result files also identify the game sources used.

The first candidate’s competitive cohorts contain 240 Basic matches (40 independent seeds) and 720 Riichi matches (120 independent seeds). The Riichi cohort was extended from 240 to 720 after its initial 55% result remained uncertain; the bot was frozen throughout the extension. Controls contain 100 old and 100 new games per mode. An additional 720 games were used for tuning, separate from the holdout seeds. First-stage retained experiment records: 2,080 games/tournaments, all configured for 24 samples. Infrastructure retries and smoke tests are excluded.

`python3 scripts/summarize-bot-benchmark.py` aggregates the final cohorts from the repository root. The mixed-match intervals are approximate 95% intervals over seed-level means. Pacing differences use a paired bootstrap over the 100 control seeds. No result treats the six seat assignments for one deal seed as six independent experiments.

## Later revisions

`v5-cautious/` preserves the second Riichi evaluation: 720 mixed games and 100 new-bot self-play games, with the accepted Basic and legacy controls reused. That policy scored 51.8% wins, essentially equal mean scores, but brought Street 4 to 43.25% of self-play hands and reduced borrowing to 0.63 loans per game. Its competitive superiority was not established.

The subsequent tuning records `tune-riichi-v8-jokers.json` and `tune-riichi-v9-*.json` compare Joker reserve value, guaranteed final-lead protection, and wager settings on 120 matches each. All use 24 samples and the same 20 tuning seeds with six seat rotations. `candidate-v9/source` preserves the experimental decision code before selecting calibration 0.65; the selected default and all dependencies are frozen under `final/source`.

The final Riichi holdout uses six new seed families, `bot-final-v9-a-20260925` through `bot-final-v9-f-20260925`, 120 matches each. The paired 100-game self-play control uses `bot-control-20260925`, with offsets 0, 25, 50, and 75 for the candidate. Basic remains the earlier accepted decision path, whose source hashes are recorded with its results. See the main report for final statistics and uncertainty.
