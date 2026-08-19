# Mahjong Poker Lab

A deterministic TypeScript implementation of Mahjong Poker for rules testing, balance simulation, bot play, and human playtesting.

## What is included

- A framework-independent game library in `src/game` with a 114-tile Flower deck, four Texas Hold'em-style streets, `rand-seed` determinism, and the fixed 16-rank five-card Hand ladder.
- A statistical player that estimates multiway showdown equity, pot odds, call EV, draw sources, discards, legal wagers, Riichi, buried-discard Blank exchanges, and distance from every Hand. Rollouts retain opponents' publicly Fished tiles, narrow ranges from betting action, and gate aggression on the resulting equity before considering blue-stick strategy.
- Replayable simulations whose events, decisions, state, and seed can be inspected later.
- One Cloudflare Durable Object per game session, with SQLite event snapshots and synchronized current state.
- A Cloudflare Think agent using OpenRouter tools to inspect legal information, compare the heuristic baseline, commit a validated move, and persist model-exposed reasoning/tool/usage artifacts plus a concise strategic summary.
- A responsive SolidJS SPA and a colored Unicode terminal client for human play against heuristic players, with complete hand-result reveals and an opt-in compact table view combining each seat's hidden hand, current/next Hand, draw, and poker math.
- Oxlint, Oxfmt, and Knip checks, with no-semicolon formatting and unused-code detection.
- Node unit tests plus Workers-runtime integration tests.

## Local setup

Requirements: a current supported Node LTS release and an OpenRouter API key for LLM turns.

```bash
npm install
cp .dev.vars.example .dev.vars
# edit .dev.vars and add your key
npm run dev
```

The heuristic player, scoring library, simulations, and non-LLM UI work without an API key.

## Commands

```bash
npm test                 # game/rules/scoring/determinism tests
npm run test:worker      # Worker + Durable Object integration tests
npm run typecheck
npm run lint
npm run format:check
npm run knip
npm run check              # all static checks and tests
npm run build
npm run simulate -- 1000 balance-seed --samples 64 --workers 9
npm run play -- --seed jade-table --players 4 --samples 48
npm run play -- --seed jade-table --debug  # reveal all hands, equity, odds, edge, and EV
npm run play -- --auto --seed demo  # visible non-interactive heuristic game
npm run deploy:dry
npm run deploy
```

Set the production secret before deployment:

```bash
npx wrangler secret put OPENROUTER_API_KEY
```

`OPENROUTER_MODEL` defaults to `x-ai/grok-4.6`, matching the requested OpenRouter model. It remains a non-secret configuration value, so you can switch models without changing code.

## Architecture

```text
                       deterministic game library
                      /                          \
colored terminal client                     Cloudflare Worker API
                                             ├─ SolidJS SPA client
                                             ├─ GameSession
                                             └─ MahjongPlayer / Think / Grok
```

The terminal and server use the same `GameEngine`, scoring ladder, heuristic, and automated-step functions; only transport and presentation differ. See `docs/architecture.md` for module and persistence ownership, and `docs/implementation-notes.md` for deterministic rulings.
