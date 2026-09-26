# Parallel simulator — 25 September 2026

The current CLI now uses a persistent process pool. Your Apple M2 Pro exposes ten available cores; `--workers auto` uses ten concurrent games when at least ten games are requested. Each process has its own engine and RNG, and immediately takes the next pending seed when it finishes. This accelerates batches; it does not parallelize the decisions within a single game.

```bash
npm run simulate -- 20 health-v6 --riichi --workers auto --samples 24 --output /tmp/health.md --jsonl /tmp/health.jsonl --logs /tmp/health-logs
```

Omit `--riichi` for Basic. Default runs use four continuous orbits, four players and 200 initial chips. The normal 24-trial budget is unchanged. Use `--workers 8` to leave some CPU capacity free, or `--workers 1` for a serial comparison.

## Timing check

Ten identical Riichi seeds, one orbit per game, 24 equity trials per projection; Node v23.11.0. Both runs wrote full state/event JSONL. No detailed decision logs were retained.

| Workers | Wall time | Games/minute |
|---|---:|---:|
| 1 | 51.32 s | 11.69 |
| 10 | 10.53 s | 56.97 |

Observed speedup: **4.87×**. These are single local timing observations, including process startup and output, not repeated controlled benchmarks. Infrastructure tests overlapped the beginning of the serial measurement; background load, heterogeneous cores, game lengths and warm caches can change the ratio. Longer batches may have different throughput. This timing check played ten seeds twice, not thousands of games, and is not balance evidence.

Every complete game state and event ledger matched exactly after sorting by seed index. The [verification record](simulator-performance-2026-09-25/verification.json) contains result/source hashes; the adjacent summaries preserve the measurements. Worker-count changes affect completion order, not seed assignment or game behavior.

## Memory, outputs and failure handling

Aggregate runs stop retaining decision alternatives after use. Completed games are reduced into the report and released instead of accumulating a batch-sized array. The engine still retains the current game's events and hands; each worker also has its own scoring caches. During the timing check, active workers used roughly 95–110 MB RSS each in one process snapshot, so concurrency increases total memory.

`--jsonl` writes completed games immediately, including hands/events for later health and catch-up analysis. `--logs DIR` retains detailed decisions only for the first ten seed indices by default (`--log-count` changes this). JSONL lines arrive in completion order; use their `index` or `seed` when comparing runs. Progress appears every ten seconds.

Worker failures fail the batch and terminate its workers. Ctrl-C retains already written JSONL records and terminates workers; unfinished games are omitted. New invocations replace the requested output files. There is no automatic resume; use new paths and explicit offsets for subsequent batches.

The Markdown report checks chip, payout and stick conservation and the one-loan limit, and reports all-ins, Street 4, eliminations, loans and showdown hand win rates. This is a current-engine entry point; the dated `scripts/health-check.ts` still imports a historical snapshot and should not be used for a new balance assessment.

## Verification

New process-pool tests compare full serial and parallel results across Basic and Riichi, verify that dropping decision history leaves behavior unchanged, and exercise simulation failures, output failures and invalid worker counts. Production heuristic logic and sample budgets were not changed.

Validation passed: 138 unit tests across eleven files, TypeScript checking, targeted type-aware lint and formatting. The three pool tests passed again after the spawn-failure cleanup guard. No workers remained after completion.
