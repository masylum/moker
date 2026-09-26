# Played-game ladder convergence protocol

The primary target is a ladder consistent with **difficulty of obtaining a combination during strategic play**, with increasing realized showdown performance as a secondary check. A higher rank mechanically increases wins, so wins alone cannot calibrate rank.

All candidates use four-player, four-orbit games, 200 chips, 24 joint equity trials per bot projection and 10 CPU workers. A later reset-format sensitivity check may reuse the selected candidates. Lotus and all non-ranking rules remain fixed.

Each ladder runs in a temporary copy of the game engine. Scoring, meld selection, hand-progress targeting and bot projections all read the candidate ranks. The original engine files remain unchanged. Opponent assumptions, risk aversion and declaration thresholds remain the same policy; this tests adaptive heuristic play, not bots trained to equilibrium.

## Measurements

- Opening best combination, subsequent hand wins and final best combination.
- Every contained combination at the end of each dealt player-hand, including folded holdings, even if another combination outranks it. This avoids mistaking best-category suppression for rarity.
- Newly built combinations absent from the original pre-Charleston hand.
- Best-category and contained-combination frequencies among showdown participants.
- Fractional showdown win credit (ties split), excluding Single/Twin Lotus participants from ordinary categories.
- All-in, Street 4, elimination, loan and stick-use guardrails.
- Repeat ladder measurements on the first three orbits to check sensitivity to terminal gambling.

The rarity discrepancy is the sum of positive log ratios between adjacent higher/lower ranked combination counts. Zero means no adjacent rarity inversion in the observed retained combinations. High Card is excluded from this statistic because it is absence of a meld rather than a contained combination. The showdown discrepancy sums negative adjacent win-rate differences where both categories have at least 20 showdown observations. Neither discrepancy is a universal utility function or proof of fairness.

## Search and stopping

1. Screen the current ladder and targeted adjacent swaps, 40 matched seeds each. Basic probes Chow/Two Eyes, Chow + Eye/Three Winds and Three Winds/Pung. Riichi probes Chow/Two Eyes, Chow + Eye/Three Winds and Three Dragons/Pung + Eye.
2. Combine supported changes and test the resulting order on another seed block, rather than assuming independent swap effects add together. Probe remaining inversions where sample size and game logic justify it.
3. Lock the selected orders, then compare against the original on fresh held-out seeds. Do not repeatedly tune against that validation block.
4. Stop when the common-rank order is stable across rounds and no well-supported remaining inversion admits a sensible swap, or explicitly report cycling/unresolved uncertainty. Rare ranks cannot be declared converged from a handful of observations.

Keep structural improvements above their ingredients: pairs below two pairs, Chow below Chow + Eye, Pung below Pung + Eye/Kong, Three Winds below Four Winds, Three Dragons below Three Dragons + Eye. Do not demote a composite simply because it suppresses its component in the best-category counts. Approximate paired bootstrap intervals resample whole runs, preserving matched seed pairs.

Production deployment is not part of the search. A final report must distinguish a recommended candidate from a statistically established global equilibrium, and document the exact game count, sample budget, changed order, remaining inversions and rule/strategy tradeoffs.

Two additional Riichi single-swap screens were added from independently collected previous-health retained-combination counts: Pung / Three Winds and Four Winds / Three Dragons + Eye. The locked candidate was then tested on 160 fresh games per Riichi arm, 160 Basic games, and a 40-tournament-per-arm four-game reset sensitivity check. No ranking was changed after locking.
