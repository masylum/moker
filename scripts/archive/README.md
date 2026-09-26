# Historical experiment tools

These dated runners and report generators reproduce earlier research. They are archived, not current app entry points, and excluded from active TypeScript, lint, formatting and dead-code checks. Run from the repository root; relative module imports have been adjusted for this directory. Historical source snapshots and reports under `docs` remain unchanged.

For current-engine health checks use `npm run simulate -- --help`. For current policy comparisons against the previous generation use `scripts/call-loan-benchmark.ts`. For CPU timing comparisons use `scripts/benchmark-simulator.ts`.

The old fixed-batch scheduler still encodes a large historical run. Archiving it does not make it an appropriate default for a new health check.
