# Architecture and ownership

## Game library

The library is split by responsibility so rules do not leak into unrelated modules:

- `types.ts` contains serializable domain shapes and discriminated unions. Every `CardFace` carries its Mahjong color; Blanks use `null`.
- `cards.ts` owns deck construction, face factories, labels, identity, and Joker substitution.
- `rules.ts` owns lifecycle and economy constants, the fixed ladder ranks, and game configuration validation. It contains no card-matching algorithms.
- `melds.ts` recognizes every completed Hand in the fixed ladder, including compound five-card Hands, Joker restrictions, descriptions, and defining-card tie vectors.
- `hand-progress.ts` declares the corresponding Hand requirements and measures the current best Hand and distance to every stronger Hand. It uses the scorer to identify the current completed Hand, so the table cannot report a different winner.
- `information.ts` reconstructs publicly known private tiles from Fishing, Blank exchanges, and later discards without exposing hidden deck draws.
- `scoring.ts` tests completed candidates from the highest fixed rank down and resolves defining-card tie breaks. It never adds several Hands or requires a fixed private/community split.
- `rulebook.ts` renders the complete canonical rules and ladder for non-code consumers, including the LLM player.
- `heuristic.ts` performs seeded multiway rollouts, pins publicly known opponent tiles, weights opponent ranges by public betting actions, and exposes the shared showdown-equity, pot-odds, expected-value, and pattern-distance analysis used by decisions and debug clients. It does not contain a second list of special-hand conditions.
- `automation.ts` applies one heuristic transition. Simulations, the terminal client, and `GameSession` all call it.
- `engine.ts` owns legal state transitions and invariants.

## Cloudflare state

`GameSession` is the authority for a single game. Cloudflare Agents persists its current `game` state. The explicit `game_events` SQLite table is an append-only replay/audit view with state snapshots; it is not a second rules engine.

`MahjongPlayer` does not store the rules or game state in its SQL tables. Before deciding, it receives:

1. The complete canonical rulebook and fixed ladder generated from `rulebook.ts`.
2. A player-visible position from `GameEngine.publicView()`.
3. Current/next Hand and full pattern progress from the shared matchers.
4. A deterministic heuristic baseline.

Cloudflare Think already uses the Agent's local SQLite-backed storage for durable chat messages. The additional `llm_decisions` and `reasoning_artifacts` tables are deliberately narrow audit indexes: they let the HTTP API retrieve the committed legal operation, concise strategic summary, model-exposed reasoning, tool calls, tool results, and usage after a durable turn. They contain no hidden opponent cards and no independent copy of the rules.

## Clients

The SolidJS client talks to the Worker API, whose `GameSession` applies engine methods. Its opt-in debug endpoint reveals current private hands but not the future deck order, and calculates each seat's view independently from information available to that player. Hands, chip commitments, current/next Hands, and poker math are rendered together at each seat. The terminal client runs the same library locally and exposes the equivalent compact view through `--debug`. Both clients render state and collect choices; neither implements scoring or legal transitions.
