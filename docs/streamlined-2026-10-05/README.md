# Six-card game with banked fishing sticks (rules v8)

The browser, terminal, engine and bots now use the same six-card, three-street variant: reveal 0, then 2, then 2 cards; score combinations of up to four; no Lotuses. The [v7 ladder analysis](../streamlined-2026-10-04/README.md) still applies because the deck and scoring are unchanged.

Fishing expansion removes Riichi declaration, the declaration hand lock, and winner stick awards. Each participating player receives **four additional fishing sticks every round**. Unused sticks carry through all rounds and tournament games without a cap or expiry. One stick per turn remains the limit. Check/Call still includes a free fish; a stick buys an extra fish, including before a Bet. Basic has no sticks.

Bots no longer value or declare Riichi. Their optional-fishing evaluation prices saved sticks more highly before a higher-ante game and lowers that reserve value as their bank grows. This is a heuristic, not an optimized tournament strategy. The browser uses the engine's reveal schedule and labels the mode “Fishing expansion.” Version 7 and older sessions are rejected to avoid mixing economies.

## Measured health

| Sample                     |     Single game | Four-game tournament |
| -------------------------- | --------------: | -------------------: |
| Runs                       |              40 |                   20 |
| Rounds per game            |      16 maximum |                    4 |
| Total rounds               |             639 |                  320 |
| Showdowns                  |           37.7% |                38.8% |
| All-in rounds              |           13.0% |                 7.8% |
| Eliminations               | 2 / 160 players | 0 / 320 player-games |
| Loans                      |              23 |                    2 |
| Rule/inventory violations  |               0 |                    0 |
| Sticks spent / granted     |  1,053 / 10,216 |          550 / 5,120 |
| Mean final bank per player |           57.27 |                57.13 |

These are seeded bot samples, not human playtests or proof of balance. Full outputs: [single-game](single-game.md), [tournament](tournament.md). Tournament final banks ranged from 51 to 62; average banks after games 1–4 were 14.61, 28.84, 42.80, and 57.13. This verifies that the reserve survives into higher-ante games.

**Assessment:** mechanically sound in these tests, but the stick economy is oversupplied for the current bots. They spent only 10.7% of tournament grants. Banking works, yet four new sticks each round plus free Check/Call fishing means saving is rarely a scarce-resource decision. Keeping carryover while reducing the grant would be a useful future experiment; this implementation preserves the requested four-per-round rule. The bots may also undervalue extra fishing, so these results alone cannot establish the ideal grant.

For context, the first 40 matching seeds in the v7 sample had 39.8% showdowns, 8.8% all-ins and 13 loans, versus 37.7%, 13.0% and 23 here. Rules and bot policy both changed, so the difference is descriptive rather than a causal estimate. No new ladder reorder is justified by these samples.

## Reproduction and validation

```sh
npm run simulate -- 40 streamlined-health --riichi --workers 4 --jsonl /tmp/moker-banked-sticks.jsonl --output docs/streamlined-2026-10-05/single-game.md
npm run simulate -- 20 banked-sticks-tournament --riichi --tournament-games 4 --orbits 1 --workers 3 --jsonl /tmp/moker-banked-tournament.jsonl --output docs/streamlined-2026-10-05/tournament.md
```

The legacy `riichi` mode identifier and stick field/event names remain for API/report compatibility. The simulator checks grants minus spending against total saved inventory and rejects any declaration or winner-stick award. Regression tests cover carryover across rounds, tournament boundaries and serialized restoration, declaration rejection, and optional stick timing.
