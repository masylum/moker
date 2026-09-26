# Three Dragons audit — 25 September 2026

**The Dragon/Joker implementation passes the audit. The bots can fish and use Blanks correctly, but two observed planning weaknesses justify keeping the ladder provisional.** Neither weakness establishes that Three Dragons should move down; both mean that construction frequencies are conditional on imperfect strategy.

## Rules and recognition

The deck contains three copies of each Dragon. Three Dragons requires one Red, one Green and one Blue, not merely any three Dragon cards. Blue is internally named `white` (白); its color is correctly blue. Red/green/blue Jokers cover only the corresponding Dragon; the black Joker cannot cover a Dragon. Blanks have no scoring value and must first be exchanged. These match the user's confirmed play rules.

An independent color-coverage oracle checked **all 286 triples** from the nine Dragons and four Jokers. Exactly **64** are valid: four physical options per color, cubed. Scoring and hand-progress matching agreed on every triple, including duplicates, wrong-color Jokers and black Jokers. All eight natural/Joker substitution patterns work, including two or three matching Jokers. Three Dragons + Eyes accepts a natural pair; a Joker cannot supply that pair.

## Actual bot choices

**21 controlled tactical scenarios pass using the normal bot policy and 24 samples**, without forcing a passive policy:

- Three Basic cases: fish the missing natural Dragon, one case per color.
- Twelve Riichi cases: each missing color, completed by either its natural Dragon or Joker, reached through a top-lane fish or a buried-card Blank exchange.
- Three Riichi cases: spend a stick to fish through an obstructing lane card and take the missing Dragon on the second fish.
- Three Riichi cases: call a modest bet and exchange a Blank for the buried missing Dragon.

The tests execute the engine action and resulting discards, then check the completed holding, rather than inspecting only the proposed action.

I also replayed **ten existing four-orbit Riichi seeds / 160 hands at 24 samples**, recording decisions rather than running another large balance batch. All ten final score maps match the prior saved games. An independent Dragon oracle agreed with candidate generation on all **1,280 opening/final holdings**.

There were 140 betting decisions with two distinct natural Dragons and no completed Dragon set. Six had an immediately available lane/Blank completion with fishing unlocked and enough chips to avoid a mandatory all-in call. The bots took five; three involved betting or raising with a stick. The exception is below. These are repeated decisions within ten games, not 140 independent starting hands.

## Two concrete strategy limitations

**1. The final-hand objective overlooks later streets.** Seed 0, hand 16, player 4 held Blue + Green Dragons, Wind Eyes and a Blank; Red Dragon was on a lane. The bot explicitly valued fishing into Three Dragons + Eyes at about **88% estimated equity**, but shoved 225 chips with about **1% estimated equity** instead. Its tournament objective assigned essentially no championship value to the smaller pot available immediately after fishing. `finalHandWinCredit` settles the current proposed wager; it does not project fishing first and building a larger pot on later streets. The shove locked fishing and lost to a numbered Pung. That is an observed planning failure, not failure to recognize the Dragon completion. A single losing outcome alone would not prove the action was wrong; the missing continuation in the objective is the relevant limitation.

**2. A secondary Dragon route can be discarded needlessly.** Seed 4, hand 8, player 2's Charleston holding was Black Joker, Red Dragon, Green Dragon, Green Joker, 1 Dots, East and North. It passed both natural Dragons and retained 1 Dots. Keeping Red Dragon instead of 1 Dots preserves the same made Three Winds, the same one-card Four Winds target and both Jokers, while adding a one-card Three Dragons target through the Green Joker. The bot's potential function treats these cores equally because it only records the best next category/missing-card count. This was the only one of 52 relevant Charleston decisions to lose two-color Dragon coverage after accounting for retained Jokers.

These should be addressed before declaring the ladder final. The secondary-route issue is especially relevant to the user's point about strategic construction. The final-hand issue cannot explain the whole rarity gap: the old calibration's first-three-orbit data, excluding the final orbit, still contains Pungs in **12.62%** of retained player-hands versus Three Dragons in **3.84%**.

## Reconciling the frequency impression

The old showdown table split Three Dragons from Three Dragons + Eyes. Its **43** ordinary Three Dragons showdowns becomes **87** when all Dragon-containing showdowns are counted. Pungs were also split among Pung, Pung + Eyes and Kong; all Pung-containing showdowns total **420**. The calibration's overlapping `contains` measure already included these components, so its rarity calculation did not omit Dragons inside Three Dragons + Eyes.

From the existing 160-game held-out Riichi candidate batch:

| Measure | Three Dragons | Pung |
|---|---:|---:|
| Best standalone category at showdown | 43 | 158 |
| Any contained combination at showdown | 87 | 420 |
| Any retained combination, including folded/uncontested holdings | 383 / 10,236 (3.74%) | 1,229 / 10,236 (12.01%) |

Thus “3.74%” means player-holdings, not the fraction of four-player table hands in which someone has Dragons. In the ten inspected games, **24 of 160 hands (15%)** ended with a player holding Three Dragons, versus **57 (35.6%)** with a Pung. These include holdings that were not shown. One individual game had Dragons in **7 of 16 hands**, compared with Pungs in **4**—so the user's experience is entirely plausible in a short session.

Conditional on already holding two distinct natural Dragons, there are up to **four** completing cards in Riichi: three copies of the missing Dragon and its Joker. A natural identical pair has only **two** Pung completions: its last natural copy and matching Joker. Known unavailable cards reduce these counts. But Pungs have **34 possible faces**, while Three Dragons is one specific three-color set.

An independent exact combinatorial calculation on uniformly dealt seven-card openings gives:

| Mode | Contains Three Dragons | Contains any Pung |
|---|---:|---:|
| Basic | 0.486% | 0.693% |
| Riichi | 0.830% | 2.010% |

This calculation includes legal Jokers and overlapping higher combinations, before Charleston/fishing. It validates recognition and explains the aggregate opportunity difference; it does **not** determine the ladder on its own. Human targeting and discard choices can change the played frequencies.

## Recommendation and evidence

Keep the ladder **provisional**, rather than changing Dragon ranks based on this audit alone. The scoring rules, deck and immediate Dragon tactics are sound. Improve secondary-target retention and final-hand continuation planning, then run a focused matched ladder check. We have not established how large those strategy changes would make the frequency difference.

No production rule or bot-policy changes were made during this audit. **175 unit tests pass**, along with lint, unused-code checking and type checking. New files: `tests/dragons-audit.test.ts`, `scripts/audit-dragons.ts` and `scripts/analyze-dragon-frequencies.py`.

[Summary and missed-decision evaluations](dragons-audit-2026-09-25/summary.json), [all recorded opportunities](dragons-audit-2026-09-25/opportunities.json), [secondary-route comparison](dragons-audit-2026-09-25/secondary-route.json), [exact and played frequencies](dragons-audit-2026-09-25/frequencies.json), and [ten replay summaries](dragons-audit-2026-09-25/replays.json).
