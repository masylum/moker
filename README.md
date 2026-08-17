# Mahjong Poker Lab

A deterministic TypeScript implementation of Mahjong Poker for rules testing, balance simulation, bot play, and human playtesting.

## What is included

- A framework-independent game library in `src/game` with the 110-card deck, legal transitions, seeded PRNG, exact showdown optimizer, all basic combinations, and all 15 Special Hand Cards.
- A statistical player that evaluates draw sources, discards, bets, calls, raises, folds, Riichi, Blank claims, future blue-stick liability, and Monte Carlo score outcomes.
- Replayable simulations whose events, decisions, state, and seed can be inspected later.
- One Cloudflare Durable Object per game session, with SQLite event snapshots and synchronized current state.
- A Cloudflare Think agent using OpenRouter tools to inspect legal information, compare the heuristic baseline, commit a validated move, and persist model-exposed reasoning/tool/usage artifacts plus a concise strategic summary.
- A responsive SolidJS SPA for human, heuristic, and LLM turns, replay inspection, and persisted balance batches.
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
npm run build
npm run simulate -- 10 balance-seed
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
SolidJS SPA
  └─ Cloudflare Worker API
      ├─ GameSession (Cloudflare Agent / Durable Object)
      │   ├─ deterministic game engine
      │   └─ SQLite transition + snapshot ledger
      └─ MahjongPlayer (Cloudflare Think / Durable Object)
          ├─ OpenRouter model
          ├─ game inspection + statistical tools
          └─ persisted decision and reasoning artifacts
```

See `docs/implementation-notes.md` for deterministic rulings where the supplied rules do not specify procedure.
