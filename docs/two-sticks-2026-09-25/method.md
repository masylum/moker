# Two starting Riichi sticks: experiment design

Both arms use the calibrated Riichi ladder applied on 2026-09-25. Only the initial allowance changes: three versus two sticks per player, reset at the start of every constituent game. Successful Riichi still awards two sticks. The existing bots, all-in and declared-Riichi fishing locks, loans and betting rules are unchanged.

- Continuous format: 100 matched seed pairs, one four-orbit game per run, 200 starting chips and ante 5.
- Reset format: 40 matched seed pairs, four one-orbit games per run, chips 200/300/400/500 and antes 5/10/15/20.
- Four heuristic players; 24 joint equity trials per decision; ten worker processes.
- 280 analyzed runs / 520 constituent games. Same seed in each pair; action differences can change later random draws.
- Compare paired whole-run bootstrap intervals (4,000 replicates, fixed seed), preserving dependence between games of the same tournament. These intervals describe sampling uncertainty under this bot policy, not human-play guarantees.
- Sticks are fungible: remaining means all unspent sticks, including earned rewards. It cannot identify which physical starting sticks went unused.
- Resource records preserve initial, earned, spent and remaining sticks and loans for every constituent game, plus each player's ending stock.
- Fishing event metrics count ordinary draw/discards; Blank exchanges are excluded. Stick-spending totals include all paid uses.
- Production starts with three sticks while this two-stick proposal is tested in isolated snapshots. Production ladder updated; Basic order retained.

A runner bug placed relative output paths inside its disposable snapshot. The first 100-run three-stick batch was discarded during cleanup; it is rerun with the identical seeds and counted only once in analysis. The two-stick batch was preserved using filesystem hard links before cleanup. The runner now passes an absolute output path to its child. Total execution therefore includes 100 duplicate baseline runs beyond the 280 analyzed runs.

Each JSONL has a manifest recording the rank order, sample budget, seed and engine/bot/rule hashes. Two full sample traces are saved per arm/format. Run `python3 scripts/analyze-stick-experiment.py docs/two-sticks-2026-09-25` to reproduce the paired analysis.

Reproduce a batch with `npx tsx scripts/ladder-experiment.ts --mode riichi --order high-card,eye,chow,two-eyes,chow-eye,pung,three-winds,pung-eye,three-dragons,three-dragons-eye,four-winds,kong --count 100 --workers 10 --orbits 4 --games 1 --starting-sticks 2 --seed sticks-20260925-continuous --out docs/two-sticks-2026-09-25/continuous-2.jsonl`. Use sticks 3 for its control. For reset tournaments use count 40, orbits 1, games 4, seed `sticks-20260925-reset`, and a separate output path.
