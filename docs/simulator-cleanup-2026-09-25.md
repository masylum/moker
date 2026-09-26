# Simulator optimization and cleanup — 25 September 2026

The simulator is **1.85× faster on one CPU core** in the repeated benchmark, with **46% less elapsed time**. This gain comes from evaluating the same hands more efficiently; neither the bot policy nor the 24-sample budget was reduced. The existing multi-core pool uses these same improvements. Combined ten-core throughput was not measured again, so the earlier multi-core multiplier should not simply be multiplied by this result.

## Measured performance

Apple M2 Pro, Node v23.11.0. Six fixed games per repetition: three Basic and three Riichi, one orbit each, 24 equity trials, full decision collection. Each repetition starts a fresh process. Three repetitions per version; no concurrent simulation batches or tests during measured repetitions. Other desktop activity was not controlled. The timers cover simulation and result hashing, excluding module startup; both versions use the same harness.

| Workload | Before median | After median | Speedup | Less time |
|---|---:|---:|---:|---:|
| Three Basic games | 12.86s | 7.42s | 1.73× | 42.3% |
| Three Riichi games | 14.35s | 7.29s | 1.97× | 49.2% |
| All six games | 27.27s | 14.71s | **1.85×** | **46.1%** |

Combined before runs: 27.50s, 26.95s, 27.27s. After runs: 14.68s, 14.76s, 14.71s. After the final dead-code cleanup, the delivered version completed the same workload in **14.44s** and again matched every original result hash. Per-mode measurements exclude hashing between games; combined measurements include it.

All measured repetitions have identical full-result hashes: final state, event ledger, decisions, alternatives and rationales. These are small performance workloads, not new health/balance estimates. Including profiling, an intermediate candidate and the final verification, this work evaluated 50 short games outside the unit suite, mostly repetitions of the same six seeds.

Raw results, source fingerprints and validation output are in [the evidence directory](simulator-cleanup-2026-09-25/summary.json).

## What made it faster

The initial CPU profile spent about 3.55 of 10.93 seconds in the hand-progress alternative matcher. Meld enumeration, identity checks and object copying occupied much of the remaining time.

- Pattern definitions now precompute matching-slot bitmasks. Natural tiles retain priority for natural-only pair slots, and Jokers retain their exact color restrictions. The evaluator avoids repeatedly scanning the same static requirements.
- Bot projections calculate only distances to stronger hands. They reuse the already calculated score and skip constructing card-ID explanations for every rank. The UI still gets complete explanations from the same definitions.
- Meld evaluation reuses subset index combinations and Wind targets. It avoids cloning card faces merely to ignore their IDs, and constructs compound-hand main groups only after finding a valid natural pair. Candidate order and tie resolution are preserved.

No alternative scorer with different rules was introduced. The reusable subset cache is limited to normal hand sizes, and compiled patterns are static data rather than saved player state.

## Code cleanup

The game core went from **4,686 to 4,503 lines**, a net reduction of **183 lines**, while gaining the optimized matcher.

Removed the forwarding `strength.ts` layer, unused game barrel, always-zero voluntary-loan policy stub, three unused client API helpers, unused rule constants, unused scoring helpers and unused exported types. Necessary implementation types are now local rather than exposed as an accidental API.

Removed unreachable Curse utility/action code from bots and the engine, dead Curse prompts/output from the CLI, and redundant server validation branches. Legacy Curse-shaped input fields still receive an explicit rejection; silently stripping them could execute a different action than requested. Zero/empty serialized Curse fields remain for v6 save compatibility. The obsolete single-card exposure wrapper was also removed. No save-version change is required.

Moved **seven TypeScript and fourteen Python historical tools** into `scripts/archive/`. Their dated reports and source snapshots remain available as research evidence. Active orbit accounting now imports the current rules, and the current simulator remains the health-check entry point. The previous-generation comparison runner deliberately retains its frozen opponent.

The dead export barrel had hidden unused exports from analysis. Removing it made those exports visible to Knip. Active app, server, tools and tests now pass the configured checks; immutable research snapshots and archived tools are explicitly outside that scope. A clean static analysis result is not a proof that every dynamically reachable path has a caller.

The worker pool's asynchronous result handler now satisfies the full repository promise rules. CLI and architecture documentation describe the active tools and archive boundary.

## Verification

- `npm run check` passed: formatting, type-aware lint, Knip, TypeScript, **140 unit tests and four worker integration tests**.
- `npm run build` passed.
- New golden regressions compare **1,024 seeded hands**, spanning sizes 0–8 in both modes, against pre-optimization scores, tie resolution and matched-card explanations. Frozen input cards also catch mutation.
- Bot count-only projections match the full progress analyzer, including the no-stronger-hand case.
- The loan regression now exercises the real engine rather than testing a function that always returned zero.
- Complete benchmark replay hashes match before and after, including the final delivered cleanup.

The server change was limited to simplifying rejection of unsupported input; bindings, storage and deployment configuration were unchanged. Workers guidance was checked against the [current Cloudflare reference](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/). Changes are local; nothing was deployed.

## Running it

Existing parallel commands automatically use the faster evaluator:

```bash
npm run simulate -- 20 health-v6 --riichi --workers auto --samples 24 --orbits 4
```

To repeat the small single-core timing workload:

```bash
node --import tsx scripts/benchmark-simulator.ts --output /tmp/simulator-timing.json
```

Use fresh processes for timing comparisons. The benchmark's `--module` option can point at a previous implementation; compare its result hashes as well as timings. Short-game timing does not establish an exact speedup for every four-orbit tournament or hardware configuration.
