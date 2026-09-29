> Latest: [690-tournament balance study, including a frozen comparison and ten detailed cases](health/README.md). Earlier reports below are historical measurements, not the current recommendation.

# Legacy 152-card ladder audit

Deck: 108 numbered cards, 16 Winds, 12 Dragons, five Blanks, four Jokers, two Lotuses, five Treasures. No Wilds.

Five million uniformly sampled seven-card hands without replacement, seed `legacy-152-final`, using the production deck and evaluator. Exact combinatorial results replace sampled estimates where available. Containment means the pattern is present, including inside stronger hands; best-hand frequency depends on the current ladder. These are fresh-deck probabilities, not frequencies after Charleston, fishing, and persistent deck building.

| Category (current weak → strong) | Contains | Best hand (sampled) | Method for contains |
|---|---:|---:|---|
| high-card | 99.999980% | 58.018140% | Sampled |
| eye | 32.606860% | 25.765820% | Sampled |
| chow | 9.498560% | 7.983320% | Sampled |
| two-eyes | 3.017560% | 2.748800% | Sampled |
| pung | 1.977720% | 1.577460% | Sampled |
| three-winds | 1.699766% | 1.622980% | Exact |
| chow-eye | 1.104960% | 1.070240% | Sampled |
| three-dragons | 0.646921% | 0.576840% | Exact |
| pung-eye | 0.193780% | 0.191280% | Sampled |
| twin-lotus | 0.182991% | 0.185900% | Exact |
| long-chow | 0.086880% | 0.086880% | Sampled |
| three-dragons-eye | 0.071279% | 0.072200% | Exact |
| four-winds | 0.072102% | 0.073280% | Exact |
| kong | 0.027385% | 0.026760% | Exact |
| quint | 0.000113% | 0.000100% | Exact |

## Interpretation

Retain the current ladder for playtesting. Most adjacent categories are in decreasing containment frequency. The small exception is Three Dragons + Eyes versus Four Winds: the former is slightly rarer (0.071279% versus 0.072102%), a relative difference of only 1.15%. A strictly rarity-sorted ladder would put Three Dragons + Eyes above Four Winds. This is too small a distinction to justify automatic reordering on fresh-deck rarity alone, particularly with persistent deck building; no rank change was applied.

Quint is exactly 0.00011285% (one in 886,095), versus Kong at 0.027385%. Each of the 34 identities has four natural copies plus its matching Joker. There are 34 Quint support sets; P(Quint) = 34 × C(147, 2) / C(152, 7). Quints necessarily contain Kongs and remain above them.

Compared with the earlier 132-card Wild deck, exact Kong frequency falls from 0.048318% to 0.027385%, and Quint from 0.00023083% to 0.00011285%. Removing flexible Wilds and increasing deck size outweigh the extra natural copies for these categories. This comparison concerns deck composition, not the earlier lane or Treasure mechanics.

Sampled results should not be used to estimate Quint: even five million samples expect only about 5.6 occurrences. Exact results are authoritative for rare categories. A rough 95% sampling margin for other containment rates is ±1.96 × sqrt(p(1−p)/5,000,000).

## Validation

- Full suite: 272 tests passed before the added independent oracle test; the updated Legacy suite passes all 37 tests (273 total tests across the suites).
- 14 multiplayer/worker integration tests passed.
- 10,000 current-deck hands match historical prototype contained categories and production ranking.
- 5,000 current-deck hands match independent subset enumeration, extended for natural Kongs and Quints.
- Every one of the 34 regular faces tested as a natural Kong, a matching-Joker Quint, and with a wrong-color Joker.
- Exact deck composition/unique IDs; selected tournament lengths 1–4; game-play and persistence tests across player counts 2–6.
- Build, typecheck, lint, and whitespace checks passed.

Reproduce: `npx tsx scripts/legacy-ladder.ts --samples 5000000 --seed legacy-152-final --output docs/legacy-152/rarity.json`
