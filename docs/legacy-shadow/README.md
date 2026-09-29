# Shadow Legacy: circulation and ladder experiment

The 192-card proposal is a promising playtest candidate, especially at five and six players. It produces thick collections, considerable card turnover, and fewer Kong wins than the 152-card circulation control. It does **not** prove that the game is balanced, or that adding cards corrects unequal deck thinning. At four players, measurable deck improvement is weak.

This study changes temporary engine copies only. The browser game remains unchanged.

## Rules tested

- 192 cards: four copies of 1–9 in four suits (144), four copies of four Dragons (16), four copies of four Winds (16), five Blanks, four Jokers, two Lotuses and five Treasures.
- Black Joker represents Shadow numbers, Black Dragon or Winds. Other Joker restrictions remain unchanged; Jokers cannot make Eyes.
- Three Dragons uses any three distinct Dragons. Four Dragons uses all four distinct Dragons. Repeated copies of one Dragon cannot fill different roles.
- Reserve two shared discard seeds; distribute every other card among personal decks, round-robin from the dealer. Initial collections: 47–48 / 38 / 31–32 cards at 4 / 5 / 6 players.
- Deal seven personal cards; normal Charleston. There is no hidden central draw supply. Fish a pile when the personal deck is empty. Treasures search other players' decks, with the existing equal-size exchange and losing-showdown payout.
- Return complete hands, including folded and public cards, to their owners. Shuffle the shared discards, reserve two seeds, and distribute the rest dealer-first among all seated players. Shuffle personal collections. The dealer then advances normally.
- Four games, one dealer orbit per game. Existing bankrolls 200/300/400/500 and antes 5/10/15/20; existing loans, Riichi and stick rules. Eliminated seats retain collections and receive redistributed cards; players return next game under existing rules.

Treasures **do not shrink decks** under the equal-size exchange. Private draw-and-discard moves a card from the owner's collection into the communal pool. Charleston and pile fishing preserve collection sizes, although they change card ownership/content.

## What was compared

Six arms, each with 20 tournaments at each player count: **360 tournaments, 7,200 table hands**. Seeds `circulation:N:0` through `circulation:N:19`; four-game tournaments; production Legacy bots with 24 hidden-world samples per decision.

1. **control:** 152 cards with the same circulation rules.
2. **shadow:** 192 cards, Four Dragons immediately below Four Winds; otherwise current Legacy ladder.
3. **shadow-above:** Four Dragons immediately above Four Winds.
4. **shadow-restricted:** Black Joker represents only Winds, isolating sensitivity to its flexibility.
5. **shadow-ladder:** the proposed refined ladder below.
6. **shadow-ladder-policy:** that refined ladder with the same _named categories_ eligible to bet and declare Riichi as in the main Shadow arm, avoiding accidental policy changes from numeric rank thresholds.

There are also 18 scripted stress tournaments: everyone folds, everyone draws privately, or one player draws privately while everyone else fishes; each at 4/5/6 players with both deck sizes. These test card flow, not optimal strategies.

## Collections, rotation and inflation

The following compares the 152 and 192 main arms, **both using redistribution**, not the previous thin-deck game.

| Players | Smallest collection, 152 → 192 | Kong wins, 152 → 192 | Shared cards between successive openings, 192 |
| ------- | ------------------------------ | -------------------- | --------------------------------------------- |
| 4       | 26 → 38                        | 5.94% → 3.44%        | 0.52 of 7                                     |
| 5       | 20 → 27                        | 5.75% → 4.75%        | 0.64 of 7                                     |
| 6       | 11 → 20                        | 8.33% → 7.08%        | 0.78 of 7                                     |

Both main arms completed all 60 tournaments without an empty personal draw deck. The 192-card arm never fell below 28/18/10 undrawn cards at 4/5/6 players (see generated metrics for exact minima). There is no central-depletion failure in this model because the two reserved cards seed the piles; players do not draw from a hidden center.

Players made approximately 2.60/2.31/2.08 private draws per dealt hand. The same player won with the same selected combination at most 2/2/3 times in a whole tournament. A repeated category with different ranks/suits is not the same core. Early collection retention at the start of game four was 40%/29%/20%: cards are moving substantially.

The Kong reduction is statistically clear at four players in this sample; the five- and six-player uncertainty intervals include no change. Do not read those point estimates as precise effects. See tournament-cluster bootstrap intervals in [metrics](metrics.md).

To measure improvement separately from turnover, we sampled 100 seven-card deals from each personal collection at the beginning of each game. The chance of containing a fixed basket of strong combinations changed:

- Four players: **0.58% → 0.53%**, no detected improvement.
- Five players: **0.37% → 0.90%**, a modest absolute improvement.
- Six players: **0.38% → 1.03%**, a modest absolute improvement.

These are opening-deal chances, not eventual win rates. The basket excludes standalone Dragon/Wind trios and disqualifies a single Lotus. It is deliberately held constant across ladders. Five/six players show subtle building with substantial variation; four players may be too diluted. These bots optimize the immediate hand and do not deliberately train a personal deck across rounds, so this cannot measure the full human deckbuilding potential.

## Why the ladder needs an adjustment

These exact seven-card **contains** probabilities are mathematical checks on the full shuffled deck. They are not showdown rates or the sole basis for a ladder.

| Combination   | 152 cards | 192 cards  |
| ------------- | --------- | ---------- |
| Three Dragons | 0.647%    | **1.220%** |
| Three Winds   | 1.700%    | **0.883%** |
| Four Dragons  | —         | 0.0350%    |
| Four Winds    | 0.0721%   | 0.0290%    |
| Kong          | 0.0274%   | 0.0139%    |
| Quint         | 0.000113% | 0.0000448% |
| Twin Lotus    | 0.1830%   | 0.1145%    |

The extra suit dilutes Winds and matching sets, but **any three of four Dragons creates four possible trios**. Three Dragons becomes almost twice as common, not scarcer. In the main tournament arm it appeared in 371 final player-hands, versus 214 Three Winds; the 152 control had 207 versus 443 respectively. The reversal persists during play.

Four Dragons has four independent color-compatible Jokers; Four Winds shares one Black Joker. Exact enumeration finds 625 valid minimal Four-Dragon subsets versus 512 Four-Wind subsets. Four Dragons is slightly easier in fresh deals, supporting its placement **below Four Winds**. Tournament counts are too small to precisely rank them by observed showdown frequency: the main arm has only five Four-Dragon and eight Four-Wind showdown holders.

The **candidate** order tested, weakest to strongest:

1. High Card
2. Eyes
3. Chow
4. Two Eyes
5. Pung
6. **Three Dragons**
7. **Three Winds**
8. Chow and Eyes
9. Pung and Eyes
10. Twin Lotus
11. **Three Dragons and Eyes**
12. **Long Chow**
13. **Four Dragons**
14. Four Winds
15. Kong
16. Quint

The numeric-threshold version of this ladder produced fewer showdowns (404 versus 557 out of 1,200 hands), more loans (69 versus 35) and more player-game eliminations (11 versus 3). Promoting Chow and Eyes crossed the bot betting threshold; swapping Long Chow and Three Dragons and Eyes changed which category triggers Riichi. Those are material behavior changes, not evidence of better balance. The `shadow-ladder-policy` arm checks the same ordering while preserving those named-category eligibility rules.

With named-category betting eligibility held consistent, the refined ladder completed all 60 tournaments with no empty personal draw decks. Showdowns rose to **634/1,200** (from 557), Three Dragons winning hands fell **149 → 82**, and Pung and Eyes stayed essentially unchanged (**398 → 397**). This avoided the accidental Chow-and-Eyes betting surge. However, loans increased **35 → 55**; eliminations were **3 → 2**. Smallest collections were 38/24/17 at 4/5/6 players. The revised order is a plausible playtest candidate, not an unqualified improvement in financial balance. Dragon trios still formed more often than Wind trios (379 versus 231 final hands), supporting their lower relative position even after incentives changed.

This lowers Three Dragons below Three Winds and Chow and Eyes, and puts Long Chow above Three Dragons and Eyes. The latter formed in 129 final hands versus 104 Long Chows in the main arm, and the random-deal diagnostic also finds Long Chow rarer. Keep Kong high: its earlier inflation under tiny personal decks is not reproduced here. Keep Quint highest. The refined order is tested as `shadow-ladder`; see its complete outcomes in [metrics](metrics.md). It is a candidate, not an exact rarity sorting: bot pursuit changes when rewards change, and composites require more committed cards.

### Twin Lotus and showdown bias

Twin Lotus did not disappear: the main 192-card arm produced **44** end-of-hand holders. **41 won without showdown, one reached showdown, and two folded.** These bots expose their best cards and fold against visible stronger hands. That filters precisely the powerful hands out of showdown statistics. Raising Twin Lotus solely because the showdown table shows one occurrence would mistake folding behavior for formation difficulty. Keep it unchanged for this playtest.

Black Joker has meaningfully more uses. In the main arm, opening hands containing it received a pot 93/211 times (44.1%), versus 53/217 (24.4%) in the Winds-only control. The other colored Jokers were at 30.2–37.5% in the main arm. This is a watch item, not enough to call it overpowered. The restricted-Joker arm helps show sensitivity, but opening-card win rates are associations, not causal strength estimates. Small samples, co-occurring cards and different tournament paths prevent declaring it overpowered. Full per-face opening win counts are in the metrics.

## Financial health is still provisional

In the main Shadow arm, loans were taken 1/8/26 times at 4/5/6 players, with 0/0/3 player-game eliminations. Players tied or solely last after game one won 5/20, 2/20 and 1/20 tournaments respectively. The six-player comeback result deserves further playtesting; twenty tournaments cannot establish a reliable recovery rate. Sticks were actively used, and 148 of 154 Riichi declarations won, reflecting the bots declaring mainly when already very strong. That high success rate is a policy characteristic, not proof the Riichi reward is balanced. See all denominators and opening-card associations in the metrics.

## The remaining thinning risk

In the deliberately asymmetric stress test, one player always chose their own deck and everyone else fished. That player's final collection was **seven cards at all three player counts**, with either deck size. The 192-card version merely delayed it; forced pile draws still occurred 11/40/67 times at 4/5/6 players. All tournaments nevertheless finished.

Collections cannot shrink below seven under these rules: the complete seven-card hand returns at cleanup. My earlier warning about falling below the next hand's seven-card deal was incorrect. But reaching seven leaves no private draw stock and can preserve a concentrated opening core. Extra cards are a buffer, not a self-correcting size-balancing mechanism. This stress policy is not proof that thinning is a winning exploit; it demonstrates that the rule permits it.

I would playtest this 192-card version with the candidate ladder before adding any further cards or changing deck sizes. Specifically watch whether four-player building feels too faint and whether humans deliberately drive one collection toward seven. A floor or a different redistribution rule would be a separate design change, not something this experiment silently introduces.

## Ten tournament reviews

[Ten full traces](ten-tournaments.md) use predetermined first seeds, not selected success stories. Findings from reviewing their individual trajectories:

- **4p seed 0:** no repeated winning core, despite multiple late Three Dragons and Eyes wins. The tournament winner was not the game-one leader.
- **4p seed 1:** late changes in winner and combination; no repeated core. Deck sizes finish 45–49.
- **4p seed 2:** one collection thins to 40, but never repeats a winning core. A large final-game swing and a loan show that stability of decks does not imply stability of finances.
- **4p seed 3:** the last hand is legitimately won by an ordinary pair of Black Dragons against lower pairs and High Card. This is evidence of a low-end tail, not a scoring failure.
- **5p seed 0:** the player last after game one rebounds in game two but does not win the tournament; Twin Lotus wins through folds.
- **5p seed 1:** the same 5–9 Bamboo Long Chow wins twice, while other rounds vary. This is the kind of limited recurrence worth retaining.
- **5p seed 2:** a late score reversal, one loan, and no repeated core; no runaway deck concentration.
- **6p seed 0:** one player wins three times with Black/Red/White Dragons, while another wins twice with the same Pung-and-Eyes core. This is a concrete reason to reduce the Dragon trio's reward.
- **6p seed 1:** Twin Lotus wins repeatedly through folds and transfers between players; a player tied last after game one ultimately wins. Showdown-only reporting would miss this story.
- **6p seed 2:** three loans and major swings across games, but no repeated winning core. Varied cards can still produce financially volatile tournaments.

## Verification and limitations

- 152/192 distinct physical cards conserved after every state transition and cleanup; two seeds preserved after every hand.
- All 34/44 natural faces tested for Kong and their eligible Quint; Joker Eyes and wrong-color substitutions rejected.
- Exhaustive minimal Dragon/Wind subset checks, plus 3,000 random hands per arm against an independent assignment/subset oracle.
- The generalized 152-card scorer matched the original scorer's category and tiebreak on 3,000 hands.
- 100,000 random seven-card diagnostics per arm; exact combinatorics for the rare categories above. The random counts alone are much too noisy for Quint.
- Existing repository tests: 284 passing. Type-aware lint and build checked separately.

Twenty tournaments per player count per arm are useful for mechanics and common patterns, not enough to establish rare-hand rankings or comeback fairness. Financial outcomes are retained, including loans, eliminations, weak-opening recovery, sticks and opening-card associations. Bots use numeric betting/Riichi thresholds, so ladder changes also affect willingness to bet/declare. Their immediate-hand objective and public exposure policy are substantial limitations. Human bluffing, concealment, opponent-specific Treasure use, strategic deck memory and aggressive thinning may differ.

## Reproduction

From the repository root:

```sh
python3 scripts/legacy-shadow-study.py control 20 24 0
python3 scripts/legacy-shadow-study.py shadow 20 24 0
python3 scripts/legacy-shadow-study.py shadow-above 20 24 0
python3 scripts/legacy-shadow-study.py shadow-restricted 20 24 0
python3 scripts/legacy-shadow-study.py shadow-ladder 20 24 0
python3 scripts/legacy-shadow-study.py shadow-ladder-policy 20 24 0
LEGACY_SHADOW_STRESS_ONLY=1 python3 scripts/legacy-shadow-study.py control 0 1 0
LEGACY_SHADOW_STRESS_ONLY=1 python3 scripts/legacy-shadow-study.py shadow 0 1 0
python3 scripts/legacy-shadow-exact.py
python3 scripts/legacy-shadow-report.py
python3 scripts/legacy-shadow-metrics.py
python3 scripts/legacy-shadow-cases.py
```

Each `.patch` records the temporary production-engine changes for that arm. `.json.gz` files contain full tournament telemetry; `summary.json` contains all grouped counts. These study artifacts are on the existing `codex/legacy-prototype` branch. No browser assets or gameplay rules were changed by this study.
