# Call decisions and one loan per game — 25 September 2026

Implemented both changes. The bots make fewer speculative Calls, and each Riichi player can receive one automatic loan per game. In the small paired audit, all-in hands fell from 50% to 11.3%, with more hands reaching Street 4. However, uncontested pots increased substantially, and the final bots won only two of six mixed games. This is a pacing improvement, not evidence of a stronger policy.

## What changed

**Calls:** large raises, Riichi declarations and public hand-building opportunities now imply stronger opponent hands. Opponent projections consider feasible alternative concealed completions after Charleston/fishing, keeping the strongest candidate while respecting known cards and card availability. The model uses public information only. Its uncertainty adjustment no longer invents winning equity when none of the sampled outcomes win; exact known Twin Lotus handling remains separate.

A Call or Bet also pays an incremental continuation-risk cost when losing would jeopardize the next ante. Before the first loan, this reflects the 50-chip net loan penalty (200 received, 250 deducted); after the loan is used, it reflects a bounded reserve for continued participation. It avoids charging for a shortfall already inevitable by folding, respects uncalled Bet refunds, and stops charging at the last hand before stacks reset. This is a one-step approximation, not a full tournament rollout.

**Loans:** one automatic loan per player per game. If a player subsequently cannot pay an ante, they are eliminated from that game; their existing debt still counts. Paying an ante remains legal after using the loan if enough cash remains. The allowance resets at the next tournament game, not between orbits. This applies regardless of whether the original loss came from an all-in.

Rules/save version is now **6**. Start a new game for these rules; old saves are incompatible. The UI and rulebook explain loan availability. Fishing/all-in/Riichi locks and the tournament stack schedule were preserved.

## Fixed validation budget

Exactly **40 games**, four players, four orbits and 200 initial chips. No large balance batch:

- 28 development games: five old-policy Riichi audits, five first-candidate Riichi audits, twelve mixed Riichi games and six mixed Basic games.
- 12 final-validation games: five final Riichi audits, six mixed Riichi games and one Basic smoke game.

All use the actual app setting: **24 joint equity trials per projection**. The final model considers up to **four concealed completions per opponent within each trial**; its extra range work should not be confused with a four-sample equity budget. All completed games assert chip/stick conservation and at most one loan per player.

Both generations use the same one-loan engine in comparisons. Audit seeds are `tournament-audit:riichi:0` through `4`. The final competitive test uses one fresh seed with all six assignments of two new bots versus two old bots. Those six outcomes are correlated, not six independent seeds. Policy snapshots, hashes, complete logs and readable traces are in [the artifact directory](call-loan-update-2026-09-25/README.md). The delivered heuristic differs from its simulation snapshot only by an equivalent loop-guard lint cleanup, recorded separately in the manifest.

## Five old games versus five final games

These results isolate policy behavior under the shared loan cap. They do not separately measure the effect of the cap versus unlimited loans. Different decisions change subsequent random paths, even with matched seeds.

| Measure | Previous bots | Final bots |
|---|---:|---:|
| Hands played | 70 | 80 |
| Hands containing an all-in | 35 (50%) | 9 (11.3%) |
| Hands reaching Street 4 | 14 (20%) | 26 (32.5%) |
| Automatic loans | 15 | 3 |
| Eliminated players, out of 20 | 8 (40%) | 0 |
| Uncontested hands | 21 (30%) | 56 (70%) |
| Fishing steps per hand | 4.10 | 6.13 |
| Bets per hand | 3.11 | 1.53 |

The cap alone does not cure the previous bots: they still have all-ins in half their hands and eliminate eight players. The new policy reduces costly continuations and leaves players alive to build more hands. The important downside is **70% uncontested pots**. More fishing and Street 4 play coexist with more folding; this is not an unqualified increase in interaction.

Among the nine final-policy all-in hands, the first all-in came from four antes, four Bets and one Call. All four Bets occurred in the final hand. The one earlier voluntary Call was a short-stack Pung, described below.

## Individual game review

Reviewed the five old and five final audit logs, including action rationales, alternatives and outcomes. Outcomes alone do not establish whether a decision was rational.

| Seed suffix | Previous-policy behavior | Final-policy behavior and assessment |
|---|---|---|
| 0 | H5: P1 Calls its final 35 on Street 1, estimating 65% equity against 30% price, and loses. The game ends after 13 hands with two eliminations. | Three all-in hands, five Street 4 hands, one loan. H12: P3 Calls its final 10 with a natural Pung, estimating 76% against 25% price; P1's concealed Twin Lotus wins. A defensible short-stack Call despite losing. H16's weak shove takes an uncontested pot but cannot catch the leader. |
| 1 | H2: P2 successively Calls from stacks 165, 140 and 55. Its estimates decline from 66% to 46% to 31%, yet it keeps paying and loses with an ordinary hand score of 4. This illustrates cumulative exposure that individual pot-odds comparisons conceal. | One all-in, five Street 4 hands, no loans. H16: P3 shoves 295 with only 18% estimated showdown equity but 61% estimated foldout, takes 335 uncontested and wins 335–320. The final-hand bluff has a clear tournament purpose; its foldout estimate remains heuristic. |
| 2 | H2: P2 Calls 55 on Street 1 with a hand score of 9 and wins. This particular all-in is not evidence of recklessness, although the game eventually has eight all-in hands and two eliminations. | Two all-ins, both forced by antes; eight Street 4 hands, one loan. Several substantial pots still develop: H2 reaches 280 and H10 reaches 320. This is the strongest example of the intended pacing. |
| 3 | H5: P1 Bets 25, Calls another 60, then Calls its last 25 on Street 2 at an estimated 81% against a 9% price; it loses. The initial commitment matters more than merely forbidding the final small Call. | Two all-ins: an ante and H16's final shove. P3 wins the final 230-chip pot but finishes at −20 after its loan deduction, far behind P2's 505. Survival improves, but a late pot does not erase debt or guarantee catch-up. |
| 4 | H3: P2 Calls its last 10 with hand score 11 and wins. Again, a reasonable-looking short-stack all-in exists alongside a poor overall pattern: seven all-in hands and one elimination. | One all-in, on H16; four Street 4 hands and no loans. P1's final shove wins 95 uncontested but fails to catch the leader. Many earlier folds conserve chips; whether some are too cautious needs further calibration. |

Saved historical decision states provide a more direct regression check than different game trajectories. In the old Chow+Eye example against a raise plus Riichi, the estimated equity for the large Call falls from approximately **81% to 32%**, and the new bot folds after accounting for risk. The old final-20-chip Call with approximately 10% artificial equity now has zero sampled winning equity and folds. These comparisons replay and verify the historical hand, stack, pot and cards; states already containing a second loan are excluded because the new rules cannot reach them. See [decision rechecks](call-loan-update-2026-09-25/decision-reviews.json).

## Competitive result and limits

The final version won **2/6 mixed Riichi games** against the previous generation. That neither demonstrates superiority nor establishes inferiority with one seed. The earlier candidate won 8/12 development Riichi games and 2/6 Basic games; those are development results, not final-policy evidence. The final Basic run is only a smoke check.

The remaining weakness is calibration: stronger opponent projections may now overstate danger in some spots, while the foldout model can still encourage aggressive final-hand bluffs. Survival costs approximate future opportunity. None of this proves optimal tournament play. A subsequent small, independently seeded comparison should target excessive folds and exploitability, rather than selecting a policy merely because it minimizes all-ins. No additional games were run for this report.

## Checks

- 135 unit tests passed across 10 files, including seven new call/loan tests and the archived large-Call regression.
- Four worker integration tests passed after the engine/rule change.
- Final production build (including TypeScript), targeted type-aware lint and formatting checks passed.
- Regression coverage includes one loan across orbits, elimination and sole-survivor settlement, reset between games, zero-equity Calls, response to pressure, hidden-information invariance, next-ante risk and refunds.

Changes are local; nothing was deployed.
