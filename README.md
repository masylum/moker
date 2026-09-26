# Moker

A browser and terminal card game for 2–6 players, with a shared deterministic TypeScript engine, heuristic opponents, optional LLM opponents, and persisted Cloudflare game sessions.

The [attached rules](public/rules.md) are the source of truth for rules version 6. Basic play starts with 200 chips, a 5-chip ante, a 102-card deck, and one dealer orbit by default. Browser setup also allows 2–4 continuous orbits, with chips carried over. The Riichi Expansion adds Charleston, Jokers, Blanks, Lotuses, fishing sticks, one automatic ante loan per player per game, and the advanced ladder. Three- and four-game tournaments reset each game and sum adjusted scores.

The browser uses original cards, logo, and illustrations exported from the supplied Figma file, its chip palette, and local LINE Seed Sans fonts. See [asset provenance](docs/design-assets.md) for sources and the Gelica font fallback.

## Local setup

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

An OpenRouter key is needed only for LLM-controlled turns. Browser play uses heuristic opponents by default and works without a key. Choose multiple human players for pass-and-play on one device; a handoff screen conceals cards between players. Old rules-v5 and earlier sessions cannot be resumed under the new engine.

## Commands

```bash
npm run check
npm run build
npm run simulate -- 20 basic-health --samples 24 --workers auto
npm run simulate -- 20 riichi-health --samples 24 --workers auto --riichi
npm run play -- --seed jade-table --players 4
npm run play -- --riichi --games 3 --players 6
npm run play -- --auto --seed demo
```

See [architecture](docs/architecture.md) and [implementation notes](docs/implementation-notes.md). Existing experiment and health-report documents record earlier rules and are historical, not balance evidence for version 6.

## Parallel simulation

`simulate` uses the current engine and bots, with four continuous orbits per game and 24 equity trials per projection. By default it starts one persistent CPU process per available core, capped at the number of games. Use `--workers 8` to leave some capacity free on a ten-core machine, or `--workers 1` for serial execution. The browser and server do not spawn these processes.

```bash
npm run simulate -- 20 health-v6 --riichi --workers auto --output /tmp/health.md --jsonl /tmp/health.jsonl --logs /tmp/health-logs
```

The summary includes all-ins, Street 4, eliminations, loans and showdown hand win rates. JSONL retains each completed game's full state and events, including hands for subsequent catch-up analysis. `--logs` additionally saves decision alternatives for the first ten seed indices; change this with `--log-count`. Logs increase disk usage, so omit them for throughput-only runs. Aggregate runs discard decision alternatives after use and do not retain all completed games in memory.

`--orbits 1` runs shorter smoke checks; `--offset 20` starts at seed index 20. Each game's result is independent of worker count. JSONL completion order can differ: compare by `index` or `seed`, not line position. Progress reports every ten seconds. Ctrl-C terminates workers and leaves completed JSONL records; incomplete games are not recorded. A new invocation replaces its outputs, so choose another path when extending a run. There is no automatic resume. `--help` lists all options.

Use this command for new health checks. `scripts/archive/health-check.ts` and dated experiment runners retain historical policies/settings and are not the entry point for the current bots.

## Code organization and performance checks

Current CLI tools live in `scripts/`, reusable simulation/orbit helpers in `scripts/lib/`, and dated research tools in `scripts/archive/`. Historical source snapshots in `docs/` remain reproducibility artifacts, outside active lint/type/dead-code checks. Current runtime code imports its own rules, rather than research snapshots; the explicit previous-generation comparison runner retains its frozen opponent.

`npm run check` enforces formatting, type-aware lint, dead-code analysis, TypeScript and both unit/integration tests. There is no catch-all game export barrel: consumers import the modules they use. Shared hand evaluation is in `scoring.ts`, `melds.ts` and `hand-progress.ts`; bot count-only projections reuse the same pattern definitions as UI explanations.

For a small single-core performance regression check (six games, 24 samples):

```bash
node --import tsx scripts/benchmark-simulator.ts --output /tmp/simulator-timing.json
```

Run it in fresh processes for repeatable comparisons. `--module /path/to/snapshot/src/game/simulation.ts` selects an earlier implementation. The output includes hashes of full results, including decisions, so timing changes can be checked against behavior. See [the optimization report](docs/simulator-cleanup-2026-09-25.md).
