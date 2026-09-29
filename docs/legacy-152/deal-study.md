> Latest: [690-tournament balance study, including a frozen comparison and ten detailed cases](health/README.md). Earlier reports below are historical measurements, not the current recommendation.

# Legacy deal and Lotus audit

## What the previous showdown table did and did not say

The previous five-player, 14-card-start study recorded Three Dragons as a contained pattern in 33/766 showdown player-hands (4.31%), but as the best pattern in only 11/766 (1.44%). Most of the remaining Dragon sets belonged to Three Dragons + Eyes. The earlier six-player 4.21% figure specifically referred to Three Dragons + Eyes (73/1,735), not standalone Three Dragons (19/1,735 = 1.10%). These are conditional frequencies among showdown participants, not probabilities in a fresh random hand.

An audited example from seed `equilibrium:5:0` is 5 Dots, 7 Bams, 9 Bams, Treasure, Red Joker, Green Dragon, Blue Dragon. The Red Joker legally represents Red Dragon. This hand is correctly Three Dragons; it does not require three natural Dragon cards. See `dragon-examples.jsonl`. Scoring regression tests separately verify contained-versus-best categories and Twin Lotus recognition.

## Twin Lotus was selected out of the showdown sample

| Players | Deal | Completed hands holding both Lotuses | Folded | Won uncontested | Reached showdown | Initially dealt pairs | Single-Lotus discards |
|---|---|---:|---:|---:|---:|---:|---:|
| 4 | 5+2 | 7 | 1 | 6 | 0 | 3 | 65 |
| 4 | 6+1 | 1 | 0 | 1 | 0 | 0 | 41 |
| 5 | 5+2 | 10 | 0 | 10 | 0 | 3 | 107 |
| 5 | 6+1 | 7 | 2 | 5 | 0 | 4 | 68 |
| 6 | 5+2 | 20 | 2 | 13 | 5 | 8 | 162 |
| 6 | 6+1 | 3 | 0 | 2 | 1 | 1 | 97 |

Across all six arms, 48 completed hands included a holder of both Lotuses: 37 won uncontested, five folded, and six reached showdown. In the five-player 5+2 arm, all ten pair holders won uncontested. Zero Twin Lotus showdowns therefore did not mean no pairs occurred. These are end-of-hand occurrences, not unique pair formations; a pair can recur across hands in a persistent personal collection.

The bot policy also biases this result. Its immediate hand utility assigns zero to a single Lotus, without valuing the future chance of acquiring its partner or the bluff bonus. It passes a singleton in the controlled Charleston fixture but retains both Lotuses. It preferentially exposes its scored cards; opponents compare visible combinations and can fold when visibly beaten. Those decisions explain why showdown-only measurement cannot by itself rank this combination’s difficulty. They are not a proof that human players would behave the same way.

## Controlled 5+2 versus 6+1 study

120 four-game tournaments, 2,400 completed hands, 20 seeds for each combination of 4/5/6 players and 5+2/6+1. All start with 14 personal cards. Seeds `equilibrium:<players>:0` through `:19` and 12 hidden-world samples per decision are matched within player counts. Both arms use the current ladder and the same production bots and engine. Only the personal/central deal ratio changes. Six-player production games already use 6+1; 5+2 is the experimental control there. Browser defaults were not changed.

| Players | Deal | Central exhaustion | Minimum central cards | Personal fallback draws / tournament | Mean final personal collection | Distinct cards held / player | Shared cards between consecutive dealt opening hands |
|---|---|---:|---:|---:|---:|---:|---:|
| 4 | 5+2 | 0/20 | 71 | 1.85 | 13.21 | 78.91 | 1.40/7 |
| 4 | 6+1 | 0/20 | 88 | 24.95 | 8.01 | 64.60 | 2.66/7 |
| 5 | 5+2 | 0/20 | 37 | 0.85 | 15.06 | 92.01 | 1.21/7 |
| 5 | 6+1 | 0/20 | 71 | 19.70 | 8.82 | 73.94 | 2.35/7 |
| 6 | 5+2 | 0/20 | 11 | 2.95 | 17.67 | 100.35 | 1.24/7 |
| 6 | 6+1 | 0/20 | 60 | 31.35 | 9.18 | 79.47 | 2.48/7 |

6+1 protects central, but personal collections settle near 8–9 cards rather than 13–18. Players see fewer distinct cards and repeat more of each opening hand, although approximately four or five of seven cards still change. Personal fallback draws increase sharply. The observed tradeoff is greater central reserve and more concentrated personal collections, not an elimination of deck exhaustion.

### Showdown categories: best / contains

Each cell is a percentage of participating player-hands at showdown. “Contains” includes patterns inside stronger combinations; “best” assigns one category under the current ladder. Lotus-disqualified participants remain in the denominator. Neither count measures uncontested wins.

#### 4 players

| Category | 5+2: best / contains | 6+1: best / contains |
|---|---:|---:|
| high-card | 0.23% / 100.00% | 0.20% / 100.00% |
| eye | 4.21% / 88.08% | 0.98% / 88.58% |
| chow | 3.74% / 42.06% | 1.97% / 34.45% |
| two-eyes | 17.52% / 48.13% | 8.07% / 40.16% |
| pung | 3.27% / 37.62% | 1.38% / 57.48% |
| three-winds | 5.84% / 10.51% | 2.76% / 12.20% |
| chow-eye | 23.36% / 34.58% | 16.93% / 28.74% |
| three-dragons | 0.70% / 3.27% | 0.59% / 3.94% |
| pung-eye | 22.90% / 25.00% | 22.64% / 28.54% |
| twin-lotus | 0.00% / 0.00% | 0.00% / 0.00% |
| long-chow | 5.37% / 5.61% | 4.72% / 4.72% |
| three-dragons-eye | 2.57% / 2.57% | 3.35% / 3.35% |
| four-winds | 3.97% / 3.97% | 9.06% / 9.06% |
| kong | 6.07% / 6.31% | 26.38% / 27.36% |
| quint | 0.23% / 0.23% | 0.98% / 0.98% |

Denominators: 5+2: 428 player-hands in 128 showdowns; 6+1: 508 player-hands in 169 showdowns.

#### 5 players

| Category | 5+2: best / contains | 6+1: best / contains |
|---|---:|---:|
| high-card | 1.15% / 100.00% | 0.48% / 100.00% |
| eye | 4.60% / 86.78% | 1.44% / 81.70% |
| chow | 4.21% / 45.40% | 0.80% / 35.47% |
| two-eyes | 16.86% / 48.47% | 3.37% / 37.88% |
| pung | 2.49% / 34.29% | 0.96% / 55.70% |
| three-winds | 5.75% / 8.62% | 2.25% / 9.95% |
| chow-eye | 26.05% / 36.59% | 14.77% / 24.24% |
| three-dragons | 0.57% / 2.87% | 1.93% / 8.03% |
| pung-eye | 23.18% / 24.52% | 28.09% / 32.58% |
| twin-lotus | 0.00% / 0.00% | 0.00% / 0.00% |
| long-chow | 7.47% / 7.66% | 11.08% / 11.24% |
| three-dragons-eye | 2.11% / 2.30% | 5.94% / 6.10% |
| four-winds | 2.49% / 2.49% | 7.38% / 7.38% |
| kong | 3.07% / 3.07% | 18.94% / 21.51% |
| quint | 0.00% / 0.00% | 2.57% / 2.57% |

Denominators: 5+2: 522 player-hands in 144 showdowns; 6+1: 623 player-hands in 207 showdowns.

#### 6 players

| Category | 5+2: best / contains | 6+1: best / contains |
|---|---:|---:|
| high-card | 2.18% / 100.00% | 0.71% / 100.00% |
| eye | 3.32% / 84.42% | 1.95% / 83.08% |
| chow | 4.12% / 40.89% | 1.15% / 28.96% |
| two-eyes | 14.20% / 49.14% | 4.25% / 38.35% |
| pung | 1.83% / 37.00% | 2.21% / 59.08% |
| three-winds | 6.19% / 9.62% | 2.75% / 13.64% |
| chow-eye | 21.42% / 31.39% | 12.75% / 22.41% |
| three-dragons | 1.83% / 5.15% | 0.71% / 4.69% |
| pung-eye | 26.69% / 28.41% | 28.43% / 32.33% |
| twin-lotus | 0.57% / 0.57% | 0.09% / 0.09% |
| long-chow | 7.10% / 7.45% | 6.47% / 6.47% |
| three-dragons-eye | 3.32% / 3.32% | 3.99% / 3.99% |
| four-winds | 3.44% / 3.44% | 10.01% / 10.01% |
| kong | 3.78% / 3.78% | 23.65% / 24.53% |
| quint | 0.00% / 0.00% | 0.89% / 0.89% |

Denominators: 5+2: 873 player-hands in 228 showdowns; 6+1: 1129 player-hands in 312 showdowns.

## Advice after the audit

6+1 is worth human playtesting with 14-card starting decks and the current ladder. It strengthens the deck-building effect and preserves central supply, at the cost of smaller personal collections, more fallback draws, and more repeated cards. It is not merely a safer version of 5+2; it changes the pattern distribution materially.

The earlier six-player Kong spike is largely associated with deal ratio in this bot experiment: across all seat counts, 5+2 produces about 3–6% Kong best hands at showdown, versus 19–26% under 6+1. The previous recommendation to lower Kong specifically from six-player frequencies was premature. Settle the deal first, then compare candidate ladders using policies that play under each ladder. Do not promote Twin Lotus because it disappears from showdown-only data.

### Passive-play limit

With 14-card starts, repeated immediate folds complete 16/16 hands at four players under 6+1 (versus 11/16 under 5+2); five players improve to 16/20 (versus 8/20); six players, already using 6+1, remain at 11/24. Thus 6+1 improves reserve pressure but does not guarantee completing four games if fishing never replenishes central. Existing early-ending behavior remains unchanged.

## Measurement corrections and limits

- Old fallback counts checked personal-deck size at discard time, so drawing the last personal card could be misclassified as central fallback. This study uses the origin recorded before drawing.
- Old opening overlap averages included empty records for inactive players. This study compares only actual seven-card deals; after elimination, the next comparison is with that player’s previous actual deal.
- The corrections affect circulation metrics, not showdown category counts. The old report is explicitly marked as superseded for those metrics.
- Twenty seeds per arm are exploratory. Hands within a tournament are correlated, bots are greedy, and the browser default uses 24 hidden-world samples rather than 12. No-exhaustion observations are not a guarantee, as the legal passive-play stress test demonstrates.
- The production default ratio and ladder remain unchanged. A protected engine hook ensures both pre-deal exhaustion checks and actual dealing use the same experimental ratio.

## Reproduction

```sh
npx tsx scripts/legacy-tournaments.ts 20 14 12 docs/legacy-152/deal-4-5.json 4 5
npx tsx scripts/legacy-tournaments.ts 20 14 12 docs/legacy-152/deal-4-6.json 4 6
# Repeat for player counts 5 and 6.
npx tsx scripts/legacy-passive-stress.ts 6 docs/legacy-152/deal-passive-6.json
```
