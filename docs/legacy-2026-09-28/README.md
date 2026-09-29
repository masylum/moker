# Legacy: simulation and ladder report

Historical v1 experiment. Superseded by the v2 rules and report. The source used for this report is preserved in `prototype-source.tar.gz`; current working scripts implement v2.

Candidate: player-owned lanes, personal persistent decks, rank-fixed wilds, Quints above Kongs, and four distinct Treasures. The requested Treasure payout is 4× ante per card at contested showdown. This is a headless branch prototype, not a deployed or browser-playable expansion.

## Findings

- The 4× payout makes Treasures chiefly worth keeping. Exchanges still have tactical uses, especially in larger pots and later streets. Reducing the payout increases exchange use substantially in these bots.
- Start with payout-only Treasures. Adding scoring sets changes relatively little in these runs, adds another hoarding reward, and places Three Treasures below substantially more common combinations.
- Quints correctly outrank Kongs. Their initial-deal frequency is extremely low; their long-term attainability should be judged separately from ordinary random deals.
- Persistent collection sizes can reach seven cards. Mandatory eight-card setup then fails; the seven-card seed exception is tested below as a separate proposed rule.
- These results establish behavior of the specified heuristic policies, not optimal play or a statistically decisive policy ranking.

## Matched-seed payout comparison

Each arm uses 100 four-player sessions, two dealer orbits (up to eight rounds), 24 sampled worlds per decision, and seeds `legacy-v1:0` through `legacy-v1:99`. Initial deck allocations match across arms. Game trajectories diverge after different actions. Folds, Riichi, loans, all-ins, and Lotus rules use the existing betting engine.

| Treasure rule      | Completed sessions | Rounds |   Showdowns | Exchanges / eligible fishing decisions | Exchange rate | Reserve chips / round |
| ------------------ | -----------------: | -----: | ----------: | -------------------------------------: | ------------: | --------------------: |
| No payout, no sets |            100/100 |    793 | 215 (27.1%) |                               889/1360 |         65.4% |                  0.00 |
| 2× ante, no sets   |            100/100 |    797 | 247 (31.0%) |                               252/1380 |         18.3% |                  2.67 |
| 4× ante, no sets   |            100/100 |    795 | 311 (39.1%) |                               110/1472 |          7.5% |                  8.28 |
| 4× ante + sets     |            100/100 |    795 | 305 (38.4%) |                               103/1435 |          7.2% |                  8.05 |

An eligible fishing decision means the acting bot has a concealed Treasure, has an allowed target, and actually receives a fishing action. It excludes folds, locked hands, and bets without fishing. Repeated opportunities within a game are correlated.

In the 4× candidate, 39 of 110 exchanges (35.5%) reduced the target's evaluated hand strength, including tie-break changes. Only 12 (10.9%) immediately improved the giver's own evaluated hand strength. Those measures exclude Lotus disqualification, the lost/gained reserve payout, and future deck effects; they are not net-profit measures.

## Why 1/n is not the whole disruption probability

There can be several concealed cards whose removal weakens the target. A particular-card probability of 1/7 becomes 3/7 if three different cards are essential. Conversely, redundant cards and public anchors can make the useful-hit probability zero. The existing reveal schedule leaves 7, 4, 3, then 2 concealed cards.

| Street | Eligible decisions | Treasure exchanges | Exchange rate | Mean true damage chance for the bot's preferred exchange target |
| ------ | -----------------: | -----------------: | ------------: | --------------------------------------------------------------: |
| 1      |                894 |                 13 |          1.5% |                                                           40.8% |
| 2      |                382 |                 46 |         12.0% |                                                           21.9% |
| 3      |                138 |                 34 |         24.6% |                                                           21.5% |
| 4      |                 58 |                 17 |         29.3% |                                                           26.7% |

The damage column is a diagnostic computed after the decision by trying each possible concealed target card. It never supplies the bot with hidden information. It includes opportunities where the bot chose another action. Revealing made-hand anchors helps explain why later streets need not have higher damage probability despite fewer hidden cards.

At a 5-chip ante, keeping one Treasure is worth 20 reserve chips if you reach showdown. Ignoring replacement Treasures and future effects, giving it away must increase expected pot winnings by more than that lost payout. In a 100-chip pot this requires roughly a 20-percentage-point equity improvement; a stronger alternative normal fish raises that threshold further. It is therefore naturally a late/large-pot option under the 4× rule.

A separate checkdown control (40 sessions, 320 rounds, no bets or folds) made **0 exchanges in 750 eligible decisions** at 4×. Average reserve injection was 28.38 chips per round. Keeping the pot at its initial 20 chips makes the 20-chip Treasure payout particularly hard to sacrifice. This control is not representative normal betting play.

## Sampling sensitivity and policy comparison

For the same first 40 starting seeds, increasing decision samples from 24 to 96 changed exchange use from 49/581 (8.4%) to 41/570 (7.2%). This is a sensitivity check on Monte Carlo noise, not a convergence proof.

In 120 mixed-policy sessions, each table had two strategic bots, one bot that never exchanges a Treasure, and one that exchanges whenever an eligible fishing opportunity exists. Policies rotate across seats. All share the same other heuristics. Scores include loan penalties; these are net score changes from the 200-point start.

| Policy    | Player-seats | Mean net score |
| --------- | -----------: | -------------: |
| strategic |          240 |         -34.62 |
| hold      |          120 |         +15.10 |
| exchange  |          120 |          +7.56 |

| Within-table comparison | Mean score difference | Game-bootstrap 95% interval |
| ----------------------- | --------------------: | --------------------------: |
| strategic-minus-hold    |                -49.73 |           [-122.27, +23.69] |
| exchange-minus-hold     |                 -7.54 |            [-89.56, +76.25] |

Bootstrap intervals resample whole games (5,000 repetitions), preserving correlations among seats. A policy preference or raw average is not evidence that one strategy is optimal. In particular, the payout-comparison table measures willingness to exchange, not the causal win value of exchanging.

## Ladder validation

200,000 uniformly shuffled seven-card deals from the full 132-card deck. “Contains” checks every category independently; categories overlap. “Best” selects the strongest category. These are before Charleston or fishing, not achieved-hand rates. Single-Lotus disqualification is counted separately in the raw output.

| Hand              | Contains / 200,000 | Contains frequency |  Best | Without wilds or Jokers: contains |
| ----------------- | -----------------: | -----------------: | ----: | --------------------------------: |
| high-card         |             200000 |          100.0000% | 98510 |                            199998 |
| eye               |              79360 |           39.6800% | 56040 |                             50250 |
| chow              |              26467 |           13.2335% | 20938 |                              8761 |
| two-eyes          |               9685 |            4.8425% |  8084 |                              3416 |
| chow-eye          |               4021 |            2.0105% |  3164 |                               683 |
| pung              |               5965 |            2.9825% |  4824 |                               846 |
| three-winds       |               4963 |            2.4815% |  4720 |                              3699 |
| pung-eye          |                778 |            0.3890% |   738 |                                61 |
| three-dragons     |               1736 |            0.8680% |  1484 |                               452 |
| twin-lotus        |                480 |            0.2400% |   480 |                               480 |
| long-chow         |                361 |            0.1805% |   361 |                                51 |
| three-treasures   |                 88 |            0.0440% |    86 |                                88 |
| three-dragons-eye |                252 |            0.1260% |   251 |                                35 |
| four-winds        |                213 |            0.1065% |   213 |                               125 |
| kong              |                105 |            0.0525% |   103 |                                 2 |
| four-treasures    |                  2 |            0.0010% |     2 |                                 2 |
| quint             |                  2 |            0.0010% |     2 |                                 0 |

The two rarest sample counts are too small for reliable frequency estimates. Exact initial-deal probabilities are **Quint: 0.000231% (about 1 in 433,220)** and **Four Treasures: 0.000290% (about 1 in 345,222)**. There are 34 possible five-card Quint sets; each requires all five physical cards, and two such sets cannot coexist within seven cards. Thus P(Quint) = 34 × C(127,2) / C(132,7). P(Four Treasures) = C(128,3) / C(132,7).

At least Three Treasures has exact probability 0.0365% (about 1 in 2,740). Its proposed position below Three Dragons and Eyes and Four Winds is not supported by simple rarity. Giving it a payout as well does not resolve that ordering issue; payout-only Treasures avoid it.

The existing ladder also has rarity inversions: Chow and Eyes is rarer than Pung, and Pung and Eyes is rarer than Three Dragons in these opening deals. This does not by itself prove the ladder is wrong: achievable progress and exchange opportunities matter. Preserve the existing order provisionally and do not describe the whole ladder as statistically calibrated.

The Legacy evaluator was checked against the existing Riichi evaluator on 1,000 ordinary random hands and against exhaustive suit assignments on 400 random hands. Targeted cases cover wild pairs, fixed ranks, wild Dragons, Wind and suited Quints, Joker pair restrictions, and preventing reuse of a wild card across a compound hand.

Achieved hands in the 4× payout-only arm:

| Best hand at contested showdown | Contender hands | Fractional pot wins |
| ------------------------------- | --------------: | ------------------: |
| high-card                       |               3 |                   0 |
| eye                             |              33 |                   0 |
| chow                            |              41 |                   0 |
| two-eyes                        |             123 |                  10 |
| chow-eye                        |             187 |                  62 |
| pung                            |              70 |                  28 |
| three-winds                     |              76 |                  25 |
| pung-eye                        |             123 |                  88 |
| three-dragons                   |              21 |                  14 |
| long-chow                       |              61 |                  48 |
| three-dragons-eye               |              25 |                  24 |
| four-winds                      |               8 |                   8 |
| kong                            |               4 |                   4 |
| quint                           |               0 |                   0 |

Contender hands include lone-Lotus losers. Win counts divide ties fractionally. These conditional outcomes are influenced by folding and bot choices; they are not an unbiased measure of category value.

## Persistent decks and the seven-card problem

Four-player collection sizes in the primary 4× arm ended between 18 and 50 cards, despite starting at 33 each. This follows the corrected destination-lane ownership rule: your discard feeds the neighbor's future collection, not your own. Exact card conservation was checked after moves.

| Stress configuration             | Completed sessions | Recorded rounds | Setup failures |
| -------------------------------- | -----------------: | --------------: | -------------: |
| 2 players, four orbits           |              12/12 |              96 |              0 |
| 3 players, four orbits           |              12/12 |             144 |              0 |
| 5 players, four orbits           |               6/12 |             191 |              6 |
| 6 players, four orbits           |               1/12 |             152 |             11 |
| 4 players, three two-orbit games |              11/12 |             280 |              1 |

Failed sessions stop and remain labelled unfinished; they are not counted as completed matches or silently repaired. The observed failures occurred at the next eight-card deal when a collection had seven cards.

Separate proposed rule: **when your collection has exactly seven cards, deal seven and skip your seed discard**. You still take part in Charleston and retain a seven-card hand. The following repeats use the same starting seeds with only that exception enabled:

| Configuration with seed exception | Completed sessions | Recorded rounds |                                                                                                                                     Remaining failures |
| --------------------------------- | -----------------: | --------------: | -----------------------------------------------------------------------------------------------------------------------------------------------------: |
| 5 players, four orbits            |              10/12 |             199 |                                                                                                                   Empty deck for p5; Empty deck for p4 |
| 6 players, four orbits            |               4/12 |             189 | Empty deck for p1; Empty deck for p3; Empty deck for p1; Empty deck for p2; Empty deck for p1; Empty deck for p1; Empty deck for p4; Empty deck for p3 |
| 4 players, three two-orbit games  |              12/12 |             282 |                                                                                                                                                   None |

Skipping the seed alone can expose a second gap: no legal fishing source. A further experimental exception forfeits the unavailable fish while allowing betting to continue. It does not let players choose to skip when any legal draw or exchange exists.

| Both recovery exceptions | Completed sessions | Recorded rounds | Remaining failures |
| ------------------------ | -----------------: | --------------: | -----------------: |
| 5 players, four orbits   |              12/12 |             203 |               None |
| 6 players, four orbits   |              12/12 |             221 |               None |

These exceptions are experimental and have not replaced the requested baseline. Fixed lanes belonging to eliminated players can also park cards outside active circulation.

## Scope and limitations

- The policy samples uniform unseen opponent cards, not fully inferred ranges conditioned on prior reveals and bets. It remembers public acquisitions and its own known returning deck cards, but future deck-building strategy is shallow.
- Fishing utility uses sampled current showdown equity, a conditional Treasure bonus, and a small development term. Earlier bonuses receive an explicit survival discount. This approximation can affect choices.
- Stick fishing after bets is supported by the policy; extra stick fishing after Check/Call is not optimized. The underlying betting rules remain Riichi.
- No public UI, production card schema, online save format, or browser name gate has been implemented. The headless adapter must not be loaded as a production game save.
- Single-Lotus players at contested showdown receive Treasure payouts, but folded players and uncontested winners do not. Riichi-locked players cannot be Treasure targets. These are explicit prototype interpretations.
- These experiments support a rules discussion and human playtest. They do not certify balance, solve the game, or establish a reliable optimal Treasure-exchange policy.

## Verification

227 unit tests and 13 Worker integration tests passed, including 20 Legacy tests. Repository lint, dead-code checks, and TypeScript checks passed. All changed files pass formatting and whitespace checks. The aggregate `npm run check` is blocked by existing formatting issues in unchanged `docs/twin-lotus-2026-09-27` archives; those files were left untouched.

## Reproduce

Run from the repository root. The exact options for each arm are saved in its JSON file. See [prototype rules](../legacy-prototype.md) for commands and card encoding. Additional examples:

```bash
node --import tsx scripts/legacy-simulate.ts --games 12 --players 6 --samples 24 --orbits 4 --short-deck skip-seed --output /tmp/legacy-six.json
node --import tsx scripts/legacy-simulate.ts --games 40 --samples 96 --orbits 2 --output /tmp/legacy-high-samples.json
python3 scripts/legacy/report.py
```

Source hashes are recorded in `source-hashes.json`. `summary.json` contains the report aggregates and policy confidence intervals. Raw per-session results are retained alongside this report.
