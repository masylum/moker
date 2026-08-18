# Architecture and ownership

## Game library

The library is split by responsibility so rules do not leak into unrelated modules:

- `types.ts` contains serializable domain shapes and discriminated unions. Every `CardFace` carries its Mahjong color; Blanks use `null`.
- `cards.ts` owns deck construction, face factories, labels, identity, and Joker substitution.
- `rules.ts` owns lifecycle and economy constants plus game configuration validation. It contains no pattern matching or scoring algorithms.
- `patterns.ts` is the declarative Special Hand Card catalog. Its compact notation (`123B`, `!EE`, `8x Even`) compiles into the same matcher used for both exact scoring and “tiles away” analysis. A leading `!` means natural-only.
- `melds.ts` recognizes basic Eyes, Chows, Pungs, Three Dragons, Four Winds, and Kongs.
- `scoring.ts` only coordinates scoring: inspect active special patterns from highest to lowest, otherwise optimize disjoint basic melds.
- `rulebook.ts` renders canonical rules and the pattern catalog for non-code consumers, including the LLM player.
- `heuristic.ts` performs seeded multiway rollouts and exposes the shared showdown-equity, pot-odds, expected-value, and pattern-distance analysis used by decisions and debug clients. It does not contain a second list of special-hand conditions.
- `automation.ts` applies one heuristic transition. Simulations, the terminal client, and `GameSession` all call it.
- `engine.ts` owns legal state transitions and invariants.

## Cloudflare state

`GameSession` is the authority for a single game. Cloudflare Agents persists its current `game` state. The explicit `game_events` SQLite table is an append-only replay/audit view with state snapshots; it is not a second rules engine.

`MahjongPlayer` does not store the rules or game state in its SQL tables. Before deciding, it receives:

1. The canonical rulebook generated from `rulebook.ts` and the active pattern catalog.
2. A player-visible position from `GameEngine.publicView()`.
3. Pattern progress from the shared matcher.
4. A deterministic heuristic baseline.

Cloudflare Think already uses the Agent's local SQLite-backed storage for durable chat messages. The additional `llm_decisions` and `reasoning_artifacts` tables are deliberately narrow audit indexes: they let the HTTP API retrieve the committed legal operation, concise strategic summary, model-exposed reasoning, tool calls, tool results, and usage after a durable turn. They contain no hidden opponent cards and no independent copy of the rules.

## Clients

The SolidJS client talks to the Worker API, whose `GameSession` applies engine methods. Its opt-in debug endpoint reveals current private hands but not the future deck order, and calculates each seat's view independently from information available to that player. The terminal client runs the same library locally and exposes the equivalent view through `--debug`. Both clients render state and collect choices; neither implements scoring or legal transitions.
