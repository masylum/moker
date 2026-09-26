# Architecture

The SolidJS browser, terminal, simulations, Durable Object share the rules-v6 engine.

- `types.ts` defines serializable state and API shapes, including mode, player count, tournament progress, and score history.
- `cards.ts` builds the 102-card Basic or 112-card Expansion deck. `hand-ranks.ts`, `melds.ts`, and `scoring.ts` define the mode-specific ladders and comparisons.
- `engine.ts` owns phase transitions, simultaneous Charleston and reveals, betting, all-in refunds, fishing, special cards, loans, elimination, tournament resets, and settlement. Invalid betting actions roll back atomically.
- `information.ts` tracks knowledge from public fishing and exchanges. `publicView` conceals opponent cards, including folded and uncontested results. Debug views intentionally expose full state for local analysis.
- `heuristic.ts`, `scoring.ts`, `melds.ts`, and `hand-progress.ts` evaluate legal choices using mode-specific patterns. `automation.ts` executes bot operations, and `simulation.ts` drives whole games through the same engine.

`src/server/game-session.ts` implements `GameSession` using the native Cloudflare Durable Object base class. It writes the authoritative snapshot and event ledger in one synchronous SQLite transaction. A failed write rolls back both. On startup, it can recover pre-migration sessions from their latest ledger snapshot. `src/server/schemas.ts` validates HTTP inputs; `src/worker.ts` handles routing and delegates to the session. Clients collect choices and render state; the engine validates all moves.

The browser uses local Figma exports under `public/assets`, mapped by `src/client/assets.ts`. Setup supports 2–6 players, 1–4 dealer orbits, and Basic or Riichi play. Multiple humans use pass-and-play: the client loads a spectator view between turns and requests the next human’s private view only after they accept the handoff. Automatic steps only run for computer controllers. Card selection, fishing, betting, results, and the reference ladder adapt to the current phase. Local storage remembers only the session identifier.

## Evaluation and tooling

Meld evaluation reuses static subset indexes and Wind targets. Hand-progress definitions precompile target masks, preserving natural-pair priority and Joker colors. Bot projections request only the counts for stronger patterns; UI explanations retain matched card IDs from the same definitions.

`simulate.ts` schedules whole games through `scripts/lib/simulation-pool.ts`; each worker runs the same deterministic engine. `benchmark-simulator.ts` compares fixed 24-sample workloads and full-result hashes. The current app, tools and tests are checked by `npm run check`. Generated reports and retired experiments are available in Git history.
