# Legacy balance study: decks, ladder, and tournament health

690 four-game tournaments; 13,736 completed hands; 4, 5, and 6 players. Twenty-three arms, ten tournaments per player count per arm. The ten prespecified case studies cover 193 individual hands. Production defaults and production bot decisions have not been changed by this study.

## Recommendation

The strongest next playtest candidate is **14 starting personal cards, alternating 5 personal + 2 central and 6 personal + 1 central, with one blind equal-size card exchange per player between games**, using ladder C below. This is a research prototype, not a claim that balance or fun has been proven. The fixed exchange is an explicit additional rule being proposed; it is not part of the current game.

Keep seven-card hands and normal Charleston. Each game starts with 5+2, then alternates by hand number. Between games 1→2, 2→3, and 3→4, exchange one random card from each complete personal collection for one random central card and shuffle both decks. Take the incoming card before returning the outgoing one, so a player cannot immediately redraw their own outgoing card. This retains deck sizes and most of each collection.

Why this direction: 5+2 alone can dilute collections and drain central; 6+1 alone concentrates recurring winning cores too strongly. Smaller starts accelerate early concentration, while larger starts reserve too many cards away from central. One exchanged card interrupts some recurring cores without the substantial loss of accumulated synergy seen with two or three exchanges. It may still feel frustrating to lose a carefully collected card; that trade-off needs a human playtest.

## Frozen comparison on unused seeds

The final candidate was selected using seeds 0–9 and 100–109, then frozen before running seeds 200–209 against the live configuration. Both final arms use 24 hidden-world samples per decision, matching the browser default. The live configuration is 5+2 at four/five players and 6+1 at six. All other engine rules, bankrolls, and ante progression are unchanged.

| Players | Rule set | Completed hands | Central exhaustion | Final personal deck, mean | Hands won with Kong | Weak openings winning a pot | Most wins with the same core in one tournament |
|---|---|---:|---:|---:|---:|---:|---:|
| 4 | Current | 160 | 0/10 | 11.5 | 23/160 (14.4%) | 23/225 (10.22%) | 6 |
| 4 | Prototype | 160 | 0/10 | 9.4 | 43/160 (26.9%) | 24/234 (10.26%) | 7 |
| 5 | Current | 200 | 0/10 | 14.3 | 17/200 (8.5%) | 17/211 (8.06%) | 3 |
| 5 | Prototype | 200 | 0/10 | 10.9 | 52/200 (26.0%) | 33/244 (13.52%) | 7 |
| 6 | Current | 239 | 0/10 | 8.8 | 95/239 (39.7%) | 28/466 (6.01%) | 18 |
| 6 | Prototype | 240 | 0/10 | 11.37 | 64/240 (26.7%) | 33/508 (6.5%) | 5 |

“Same core” means the same player wins using the same selected card faces, regardless of the other cards in their hand. This is more useful for detecting repetitive play than counting identical seven-card hands. The prototype is not better on every axis: at four/five players it deliberately increases deckbuilding and also increases recurring combinations. Kong winning-hand rates become about 27% at all three table sizes, instead of 14% / 9% / 40%. At six players the most repeated core drops from 18 wins to five, but the fresh-seed weak-opening win rate barely changes (6.0% to 6.5%); the larger comeback improvement in the tuning sample did not replicate. A tournament can complete fewer than 4×N hands without exhausting central if elimination leaves only one active player and ends a game early. A win includes tied and side-pot wins; the metrics appendix also reports whether weak openings made a positive chip profit.

## Does deckbuilding survive?

| Players | Prototype strong opening rate, games 1 → 2 → 3 → 4 | Personal collection synergy, games 1 → 2 → 3 → 4 |
|---|---|---|
| 4 | 1.88% → 9.38% → 8.92% → 9.49% | 0.33% → 8.2% → 24.85% → 23.88% |
| 5 | 1.6% → 5.22% → 6.88% → 9.64% | 0.48% → 10.94% → 11.04% → 14.44% |
| 6 | 1.67% → 6.39% → 6.96% → 6.18% | 0.65% → 8.85% → 10.57% → 10.65% |

Strong means a fixed reference group: Pung and Eyes, Twin Lotus, Long Chow, Three Dragons and Eyes, Four Winds, Kong, or Quint, without a singleton Lotus. The definition stays constant across ladders. The second column measures real opening deals before Charleston. The third draws seven hypothetical cards from each personal collection 100 times at the start of each game. It isolates retained synergy; it does not predict actual mixed-source deals. Individual decks can improve, weaken, or change direction even when the average improves.

## Ladder C, weakest to strongest

High Card → Eyes → Chow → Two Eyes → Pung → Chow and Eyes → Pung and Eyes → Three Winds → Three Dragons → Kong → Long Chow → Four Winds → Three Dragons and Eyes → Twin Lotus → Quint.

The changes reward Three Winds and Three Dragons above the common Pung-and-Eyes route; put the readily recycled Kong below the harder mixed-card collections; and move the unique Twin Lotus pair near the top. Quint stays above Kong. The scorer still requires distinct physical cards for each role, retains colored Joker restrictions, and permits natural four-of-a-kind Kongs.

This is a gameplay-calibrated candidate, not an exact ordering of intrinsic probabilities. A higher category attracts pursuit, can make opponents fold, changes what gets exposed, and changes betting/Riichi decisions. Once built, a Kong or Wind collection can recur much more easily than it was originally assembled. Sorting one showdown-frequency table cannot resolve all of those effects.

We also tested ladder B, which makes the same upper-ladder changes but leaves Three Winds in its original low position. B often reduced Kong dominance, but Three Winds continued to win very few hands. C makes that route relevant; the full appendix shows the trade-offs instead of presenting one ladder as mathematically unique.

## Why Dragons and Twin Lotus looked strange

**Dragons were under-pursued by the original bot.** With the current ladder and 5+2, hands opening with two natural Dragon types but no completed Dragon trio finished with a trio 24/209 times (11.5%). A patient policy that values incomplete Dragon collections finished 127/311 (40.8%). This policy keeps the original exposure, betting, and loan behavior, but also treats a singleton Lotus less harshly. These are policy-dependent conversion rates, not universal probabilities or a pure isolated Dragon-only treatment.

**Zero Twin Lotus showdowns did not mean zero Twin Lotus hands.** In the 30-tournament baseline, 14 finished player-hands held both Lotuses: 11 won uncontested and three folded. None reached showdown. With the collector sensitivity policy, 12 of 15 pair holders reached showdown. That policy conceals made combinations as well as valuing incomplete hands and taking optional loans, so its effects cannot all be attributed to one change.

Raising Twin Lotus also changed incentives: under the collector policy, the raised-ladder arm produced 23 pair-holding endings, 19 at showdown, compared with 15 and 12 under the current ladder. These small, clustered counts support exploring a higher reward; they do not establish an exact optimal rank.

“Contains Three Dragons” includes Three Dragons and Eyes and any stronger selected category containing a trio. “Best Three Dragons” counts only the selected category. The appendix keeps both measurements and counts folds/uncontested wins separately.

## Loans, sticks, comeback, and opening cards

| Players | Current → prototype loans | Current → prototype elimination episodes | Last after game 1 wins tournament, current → prototype | Prototype sticks used / supplied |
|---|---|---|---|---|
| 4 | 13 → 10 | 1 → 3 | 5/10 → 3/10 | 331/360 |
| 5 | 20 → 24 | 1 → 3 | 0/10 → 1/10 | 445/458 |
| 6 | 99 → 29 | 50 → 3 | 3/10 → 1/10 | 544/554 |

An elimination episode is one player eliminated in one game; players return for the next game. Loans in the main comparisons are automatic rescue loans. Optional borrowing is tested only in the collector policy arms. Four games use the engine’s existing 200/300/400/500-chip banks and 5/10/15/20 antes. Tournament points include the 250-point loan penalty.

Ten tournaments per seat count are not enough to estimate a reliable tournament-comeback probability. Later bankrolls and antes are larger, so a late large pot already provides a comeback mechanism. The ten case studies show both successful comebacks and failed recoveries; no change to loans or stakes is justified by these samples alone.

The appendix gives every individual card face’s opening-hand win rate, with numerators and denominators, plus grouped Joker, Blank, Treasure, Lotus, and Dragon-start rates. Jokers remain strongly associated with winning. That association includes repeatedly drawing a Joker in an already strong personal collection. Treasures provide search and loss insurance, so a lower raw win rate is not by itself evidence that they need a buff. Riichi success is also selected: bots declare on strong hands.

## The remaining central-deck problem

No tested initial size/deal ratio guarantees four games under the current cleanup rules. Every central setup card moves into a personal collection; fishing from personal decks returns cards to central through shared discards. If players fold early, that return flow can be too small. A size-preserving between-game exchange cannot fix the net flow.

In the adversarial “everyone folds immediately” alternating-deal test, 14-card starts lasted 15/16 hands at four players, 10/20 at five, and 7/24 at six. This is an extreme legal behavior, not a prediction of ordinary play. In the normal 5+2 exploratory arm, however, three of ten six-player tournaments also exhausted central, so the issue is not merely theoretical. Larger 18-card starts also exhausted in three of ten six-player tournaments.

The agreed exhaustion rule remains the correct fallback: stop and score completed hands, without adding cards or silently changing the deal. A hard guarantee of four complete games would require an explicit additional circulation rule. The proposed prototype improves ordinary-play balance; it does not supply that guarantee.

## Ten reviewed tournaments

[Read all ten case reviews and all 193 hand outcomes](ten-tournaments.md). The cases were selected before reading results: four 4-player, three 5-player, and three 6-player tournaments. They expose repeated Kong/Wind cores, large late pots, both kinds of comeback, Twin Lotus wins hidden by showdown-only accounting, and an actual central exhaustion. Full winning-card lists make the core-repetition claims auditable.

## Scope and reproducibility

Initial exploration uses seeds `health:<players>:0` through `:9`, eight hidden-world samples, starts of 10/14/18, 5+2/6+1/alternating deals, and four ladders (current, raised Dragons/Lotus, B, C). Seeds 100–109 with 24 samples were initially reserved for validation, then reused to tune fixed between-game exchanges. Seeds 200–209 were reserved until the final rule bundle was frozen. All simulations use the real 152-card engine, Charleston, legal fishing, exposures, betting, side pots, stick rewards, loans, hand cleanup, and tournament scoring. Each run uses a fresh process; ladder overrides happen before any score cache is populated.

Bots act from the redacted player view. The base bot is greedy: it optimizes near-term hand value and does not maintain a learned belief about its personal collection across hands. Patient and collector sensitivity policies expose this limitation, but neither is an optimal human model. The frozen final comparison uses the same base bot on both rule sets. Human willingness to fold, hide cards, speculate, borrow, or value future deck improvement may change outcomes. [Paired uncertainty estimates](uncertainty.md) resample entire tournaments rather than treating correlated hands as independent.

Card conservation is asserted after every completed hand in the later arms, including rotation and confirmation arms: exactly 152 distinct physical cards. The existing evaluator tests include independent scoring checks. Full validation after adding the research hooks: 284 tests passed; build, typecheck, and lint passed. No rule or ladder override is installed in the live game.

Commands (run each simulation variant in a separate process):

```sh
npx tsx scripts/legacy-health.ts 14-0-current 10 24 200 confirmation-current
npx tsx scripts/legacy-health.ts 14-56-rarity-rotate1 10 24 200 confirmation-prototype
npx tsx scripts/legacy-health.ts 14-5-current-patient 10 8
npx tsx scripts/legacy-passive-stress.ts 56 docs/legacy-152/health/passive-alternating.json
python3 scripts/legacy-health-report.py
python3 scripts/legacy-health-cases.py
python3 scripts/legacy-health-metrics.py
python3 scripts/legacy-health-overview.py
```

CLI arguments: variant, runs per player count, hidden-world samples, seed offset, optional output name. Personal count `0` selects production behavior; `56` alternates by hand. Archives are gzip-compressed JSON containing all tournament outcomes, deck probes, event counts, seeds, configuration, and per-player opening/end features. `summary.json` and [the complete metrics appendix](metrics.md) are generated from those archives.

