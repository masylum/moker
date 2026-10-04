# Moker

A browser and terminal card game for 2–6 players, with a shared deterministic TypeScript engine, heuristic opponents, and persisted Cloudflare game sessions.

The [attached rules](public/rules.md) are the source of truth for rules version 7 (streamlined branch). Each hand has six cards, three streets (0/2/2 newly revealed cards), and combinations of at most four cards. Long Chow now uses four consecutive cards; Lotuses and five-card compound hands are removed. See [variant health and ladder](docs/streamlined-2026-10-04/README.md).

Basic play starts with 200 chips, a 5-chip ante, a 102-card deck, and one dealer orbit by default. Browser setup also allows 2–4 continuous orbits, with chips carried over. The Riichi Expansion adds Charleston, Jokers, Blanks, fishing sticks, one automatic ante loan per player per game, and the advanced ladder. Three- and four-game tournaments reset each game and sum adjusted scores.

The browser uses original cards, logo, and illustrations exported from the supplied Figma file, its chip palette, and Gelica/Dela Gothic One typography. See [asset provenance](docs/design-assets.md) for sources and font loading.

## Local setup

```bash
npm install
npm run dev
```

Browser play uses heuristic opponents and needs no API keys. Choose more than one human seat to create an online room at `/rooms/<ULID>`. Enter your name, copy the invite link, and share it with friends. Each visitor claims the next human seat; once all seats are occupied, new visitors can observe. Play begins when all human seats are filled. Human players have forest-spirit avatars and robots have mechanical faces.

Rooms retain seat ownership in a browser cookie, so refreshing or reopening the same link in the same browser restores your seat. Use separate browsers/devices (or a private browser window) to test multiple people. Seats stay reserved when someone disconnects; clearing cookies loses access to that seat. The host deals subsequent rounds. The table refreshes once per second, and Durable Object alarms run robot turns independently of connected browsers. Choose your name during setup or when joining a room.

The server authorizes each room action and filters private cards for the current player or observer. Room seeds and RNG state stay private, and legacy debug/event endpoints are blocked for rooms. Single-human games and CLI simulations retain their existing behavior. Old rules-v6 and earlier sessions cannot be resumed under the new engine.

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

See [architecture](docs/architecture.md) and [implementation notes](docs/implementation-notes.md).

## Parallel simulation

`simulate` uses the current engine and bots, with four continuous orbits per game and 24 equity trials per projection. By default it starts one persistent CPU process per available core, capped at the number of games. Use `--workers 8` to leave some capacity free on a ten-core machine, or `--workers 1` for serial execution. The browser and server do not spawn these processes.

```bash
npm run simulate -- 20 health-v6 --riichi --workers auto --output /tmp/health.md --jsonl /tmp/health.jsonl --logs /tmp/health-logs
```

The summary includes all-ins, Street 3, eliminations, loans and showdown hand win rates. JSONL retains each completed game's full state and events, including hands for subsequent catch-up analysis. `--logs` additionally saves decision alternatives for the first ten seed indices; change this with `--log-count`. Logs increase disk usage, so omit them for throughput-only runs. Aggregate runs discard decision alternatives after use and do not retain all completed games in memory.

`--orbits 1` runs shorter smoke checks; `--offset 20` starts at seed index 20. Each game's result is independent of worker count. JSONL completion order can differ: compare by `index` or `seed`, not line position. Progress reports every ten seconds. Ctrl-C terminates workers and leaves completed JSONL records; incomplete games are not recorded. A new invocation replaces its outputs, so choose another path when extending a run. There is no automatic resume. `--help` lists all options.

Simulation reports are generated on demand; dated experiments and frozen source copies are kept in Git history.

## Code organization and performance checks

Current CLI tools live in `scripts/`, with reusable simulation helpers in `scripts/lib/`. All tools run against the current rules and engine.

`npm run check` enforces formatting, type-aware lint, dead-code analysis, TypeScript and both unit/integration tests. There is no catch-all game export barrel: consumers import the modules they use. Shared hand evaluation is in `scoring.ts`, `melds.ts` and `hand-progress.ts`; bot count-only projections reuse the same pattern definitions as UI explanations.

For a small single-core performance regression check (six games, 24 samples):

```bash
node --import tsx scripts/benchmark-simulator.ts --output /tmp/simulator-timing.json
```

Run it in fresh processes for repeatable comparisons. `--module /path/to/snapshot/src/game/simulation.ts` selects an earlier implementation. The output includes hashes of full results, including decisions, so timing changes can be checked against behavior.

## Cloudflare deployment

The Worker is named `moker`. In Cloudflare Builds, use `npm run build` as the build command, `npx wrangler deploy` as the deploy command, and `/` as the root directory. For a local deployment check, run `npm run deploy:dry`; `npm run deploy` publishes the app.

Wrangler configures the static assets and the SQLite-backed `GAME_SESSION` Durable Object. No runtime secrets or external model services are required. `GET /api/health` returns `{ "ok": true }`.

Keep the existing migration history: `v2` removes the retired player namespace, while `GameSession` keeps its identity and saved games. On first access, sessions created by the previous storage implementation recover their latest committed snapshot from the event ledger. The retired namespace's data is deleted when the migration is deployed.
