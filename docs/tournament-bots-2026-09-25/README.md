# Tournament bot revision — 25 September 2026

The app now gives one free fishing step after Check or Call in both modes. Bet/Raise gives no free fishing; Riichi sticks buy one fish after a bet or a second fish after Check/Call. All-in and declared-Riichi locks are retained.

`previous/src/game` freezes the pre-change app. `baseline/src/game` freezes that generation with only the new fishing entitlements and their forecasts adapted. Head-to-head comparisons use the same new engine rules for both generations. This avoids beating an opponent that misunderstands which actions can fish.

All games use four players, 200 starting chips, four continuous orbits, five-chip antes, and **24 actual samples per equity projection**. Reweighting sampled deals for opponents' public aggression can reduce their effective sample size; the new bot's uncertainty shrinkage accounts for this. Planning can make multiple 24-sample projections per decision. No opposing hidden cards or actual deck order enter decisions.

Mixed tables have two new and two baseline players. Each seed runs all six placements of the two new players. Tournament ties split winner credit; a 50% share is the null expectation. Confidence intervals cluster the six rotations of each seed. These are competitive individuals, not cooperating teams. Net-score advantage is supplementary, not the win-rate objective.

Development runs and the ten fixed audit seeds (`tournament-audit:MODE:0..4`) are separate from final holdout seeds. Each candidate snapshot and completed-game checkpoint is retained. Interrupted games do not count. No tuning claim should be read as an independent validation claim.

The audit preserves complete engine events and every betting decision with alternatives in JSON, plus readable Markdown traces. Five Basic and five Riichi seeds were chosen before looking at outcomes. Earlier candidate traces are retained separately; the final report identifies the selected generation's traces. Judgments consider what the player knew and the available alternatives, rather than calling a losing gamble automatically irrational.

The new tournament logic is a heuristic, not a solved tournament strategy. It accounts for previous game scores, loan penalties, dealer progress and skipped eliminated seats, protects secured leads, and values last-hand actions by approximate final winner credit. It does not perform a full multi-hand rollout. Final-hand loss branches average over potential opposing winners; split pots and future betting/draw responses are approximated. Opponent-range and fold-probability models are heuristics, not empirically calibrated probabilities.

Run a batch with:

```sh
npx tsx scripts/tournament-bots.ts --games 60 --mode basic --generation mixed --seed your-seed --output /tmp/batch.json
```

Mixed batches require complete six-seat rotations and offsets divisible by six. `--generation old` and `--generation new` run homogeneous tables. `--logs` writes full traces adjacent to the result. Completed games are checkpointed to `.jsonl` before the batch-level JSON is written. Every game checks chip and stick conservation. The output includes source hashes, configuration, score results, orbit checkpoints, and all-in triggers.

All-tournament catch-up means the share of tournament winner credit belonging to players who were behind at an orbit checkpoint. Early-ended tournaments retain terminal standings so eliminating players cannot artificially improve the recovery rate by removing them from the denominator. This is different from an individual trailing player's conditional chance of recovery.

In Basic, the guaranteed-lead safeguard reserves all possible future antes before comparing the leader's minimum final score against an opponent's maximum. With 800 total chips and no prior game scores, an uncommitted stack above `400 + 5 × remaining hands` can already guarantee victory by folding. Riichi uses a final-hand-only guarantee because loans can expand the chip supply.

The public-information fix removes a fished card from known concealed cards once it is exposed. Previously, exposure history was processed before the complete draw history, which could reintroduce that same physical card and manufacture combinations or Twin Lotus in an opponent forecast.

Three interrupted validation prefixes are archived separately. Version 7 was stopped when the independent audit found duplicate public/known cards. Version 8 was stopped to add the conservative early secured-lead safeguard in Basic. Version 9 was stopped to reserve possible Single Lotus fees in final-hand guarantees and reject fishing against known Twin Lotus. None of these prefixes is included in the final validation statistics; the final version uses the fresh `tournament-validation-v10` and `tournament-health-v10` seed families.

All-in hands count the event and lock, not a zero-chip finish: shorter calls can reduce the contribution cap and refund earlier payers. The first cause per hand is classified as Bet, Call, or ante. Fishing steps include Blank exchanges, each of which replaces one normal draw/discard step.

The row fields `win`, `delta`, and `seats` are competitive-generation metrics only for mixed tables. Homogeneous health summaries ignore them and use final scores, hand events, resources, and orbit histories.

The user stopped the final run for time. It completed 600 Basic and 548 Riichi competitive games. Analysis uses all 600 Basic and 540 Riichi games in complete six-seat rotations; eight partial-rotation games are excluded. Twelve homogeneous Basic health games completed (seven old, five new), with no homogeneous Riichi cohort completed. Those tiny partial cohorts are not used for population comparisons. Run `python3 scripts/finalize-tournament-stopped.py` followed by `python3 scripts/render-tournament-report.py` to reproduce the stopped-run analysis. The ten-game audit is labeled separately from independent competitive validation.
