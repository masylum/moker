# Results: Twin Lotus at the proposed rank

256 simulations, 640 constituent games, 4,096 table hands. Each arm: 128 simulations / 2,048 hands, half continuous stacks and half four-game stack resets. **24 samples per decision; 10 workers.** Long Chow is included. These are actual played games, not random-hand frequency samples.

| Twin Lotus measure | Automatic-win control | Ranked below Three Dragons |
|---|---:|---:|
| Opening holdings | 26 | 26 |
| Retained holdings (including folds) | 160 | 148 |
| Built after opening | 134 | 122 |
| Folded while retaining Twins | 0 | 21 |
| Uncontested wins | 133 | 102 |
| Showdown appearances, including stronger ordinary combinations | 27 | 25 |
| Showdown win credit, including stronger ordinary combinations | 27 | 15.5 |
| Both Lotuses public at end of hand | 0 | 63 |

## Showdown performance by format

These rows count **Twin Lotus itself as the scoring category**. A holding with both Lotuses and a stronger ordinary combination is reported under that ordinary combination instead. Split pots use fractional win credit.

| Format | Control Twin wins / showdowns | Ranked Twin wins / showdowns | Ranked uncontested Twin-holding wins |
|---|---:|---:|---:|
| continuous | 10/10 (100.0%) | 4/9 (44.4%) | 51 |
| reset | 17/17 (100.0%) | 11/15 (73.3%) | 51 |

## Whole Advanced ladder under the ranked rule

Retained frequency uses all 8,192 dealt player-hands as the denominator, counting the strongest category at hand end, including folds but excluding single-Lotus disqualified holdings. It is not opening rarity and reflects strategic choices. Showdown entrants exclude folds and disqualified players.

| Category, low to high | Eligible retained | Frequency | Showdown win credit / appearances | Win rate |
|---|---:|---:|---:|---:|
| high-card | 1554 | 19.0% | 2/103 | 1.9% |
| eye | 1478 | 18.0% | 6/226 | 2.7% |
| chow | 970 | 11.8% | 19/189 | 10.1% |
| two-eyes | 1027 | 12.5% | 51/359 | 14.2% |
| chow-eye | 898 | 11.0% | 133/328 | 40.5% |
| pung | 429 | 5.2% | 57/129 | 44.2% |
| three-winds | 458 | 5.6% | 74/161 | 46.0% |
| pung-eye | 394 | 4.8% | 100/153 | 65.4% |
| twin-lotus | 147 | 1.8% | 15/24 | 62.5% |
| three-dragons | 202 | 2.5% | 38/52 | 73.1% |
| long-chow | 211 | 2.6% | 57/68 | 83.8% |
| three-dragons-eye | 125 | 1.5% | 42/47 | 89.4% |
| four-winds | 83 | 1.0% | 22/23 | 95.7% |
| kong | 19 | 0.2% | 4/4 | 100.0% |

## Table-level effects

| Measure | Control continuous | Ranked continuous | Control reset | Ranked reset |
|---|---:|---:|---:|---:|
| All-in hands | 10.8% | 8.8% | 9.7% | 6.5% |
| Showdown hands | 33.9% | 36.3% | 25.5% | 24.2% |
| Hands with street-four betting | 33.4% | 35.3% | 26.1% | 26.5% |
| Loans across constituent games | 14 | 16 | 3 | 1 |
| Total net chips in Twin-holding hands | 4260 | 2325 | 15765 | 8800 |

Chip totals pool differently sized pots and exclude opportunity costs from unsuccessful singleton attempts. They are not a causal estimate of how much a Lotus card is worth. Paired per-tournament bootstrap intervals are saved in `paired-effects.json`; use those before treating small whole-table differences as established. Continuous and reset formats reuse seed labels, so pooled counts are descriptive, not independent replications.
## Assessment

**Making Twin Lotus beatable looks promising. The proposed slot is playable, but not yet convincing as its final calibrated rank.** It remained valuable: 122 retained Twin holdings were built after the opening, versus 134 in the control, and it won 102 pots uncontested. All-in frequency fell by 2.05 percentage points in continuous games and 3.13 points in reset games; paired bootstrap intervals excluded zero for both. There was no similarly consistent increase in street-four play.

At showdown, its 62.5% win rate sits close to Pung + Eyes (65.4%) and below Three Dragons (73.1%). That is broadly compatible with the neighborhood, but it does not prove the exact ordering is right. There were only 24 actual Twin-category showdowns; the format-specific estimates span 44.4% to 73.3%. Those differences should not be interpreted as established format effects. Nine losses were to Three Dragons (2), Long Chow (4), and Three Dragons + Eyes (3).

The stronger reservation is rarity: Twin Lotus was the best eligible retained category in 1.79% of player-hands, compared with 2.47% for Three Dragons, 2.58% for Long Chow, and 1.53% for Three Dragons + Eyes. Under a rarity-based calibration objective, **between Long Chow and Three Dragons + Eyes is a sensible next candidate to test**. That higher position was NOT simulated here, and moving it could change retention, betting, and opposition; these observations are not sufficient to ship that alternative either.

This experiment changes information disclosure as well as betting valuation. The existing exposure policy locks the scoring combination's cards. Once Twin Lotus is a normal scoring combination, that policy selects its flowers: both were public by hand end in 63/148 Twin holdings, versus 0/160 in the control. This is a meaningful consequence of the existing bot strategy, not proof all humans would expose Twins the same way. Only 9/25 Twin-holding showdowns had both flowers public before settlement, so disclosure alone does not explain every showdown loss. Weak opponents folding out also selects stronger opposition at showdown.

## Sample-log review

Saved full traces cover seeds 0–4 in each format, in both arms. Reviewed Twin holdings and decision alternatives in these ten ranked simulations, plus the aggregate settlement records:

- Continuous seed 0, hand 5: p3 spent a stick while raising to fish the second Lotus from discard B, then called the stronger player's re-raise and lost 85 chips to Three Dragons + Eyes. The call's estimated equity was 72%, against 22% pot odds. It was coherent under the bot's estimate, but the estimate was optimistic against the actual hidden hand. The bot was no longer using 100% certainty. This is an example of residual opponent-model limitations, not a scoring failure.
- Continuous seed 1, hand 4: p1 bet 60 and declared Riichi on street two with estimated equity 63%; the table folded and the Twin holding netted 40 chips. This demonstrates that removing automatic victory did not eliminate profitable pressure.
- Continuous seed 2, hand 9: p4 bet 85 with Riichi on street two, estimated equity 83%, and won 40 chips uncontested. The same category has different estimates as visible cards, lanes and opponents change.
- Additional retained-hand logs: seed 8, hand 6 showed repeated raises with Twins against Dragons followed by a fold after investing heavily; seed 18, hand 11 called once then folded to pressure from Long Chow. These are evidence that the variant can release Twins, but not proof that every earlier investment was optimal.
- Continuous seed 12, final hand: a Twin holder folded to an all-in that actually held a Chow. Calling this a scoring mistake would be incorrect: the weaker hidden hand was unknown to the actor and the policy includes tournament risk. It illustrates why final cards alone cannot establish decision quality.

## Validation and scope

Independent settlement recomputation using the unchanged ordinary evaluator plus the proposed Twin rule matched **all 620 ranked-arm showdowns**, checking 1,866 eligible holdings. Direct rule checks, Joker exclusion, 1,000 randomized ordinary/Basic comparisons, and the experimental simulation TypeScript check passed. Source hashes confirmed the live game engine did not change during the experiment.

Simulation wall times: control 260.8 seconds, ranked 254.4 seconds, about **8.6 minutes total** with ten workers. The live app and production rules were not modified. Reproducible frozen sources, runners, full retained-hand data and selected full traces are in the experiment archive; protocol and limitations are in README.md.
