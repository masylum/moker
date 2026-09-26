# Riichi Glory-steal experiment

> Historical experiment: this persistent-steal form was superseded by the canonical seeded 2× cashout, which clears opponents' paid Glory.

## Rule tested

The canonical 3× Crown maintenance and stored Riichi Pot were disabled. Persistent Glory and Crown tracking remained, but the Crown had no economic effect.

When a player won after declaring Riichi, every other non-eliminated player paid:

`their persistent Glory × current Orbit Value`

The Riichi winner received the sum. Glory was not spent. Folded players still paid. If an opponent lacked the chips, normal Loans supplied liquidity up to the two-Loan limit; a player still unable to pay surrendered their remaining chips and was then eliminated if eligible.

For opponents holding 5, 3, and 12 Glory, the total reward is therefore 100 / 200 / 400 chips in Orbits 1 / 2 / 3.

## Method

The experiment used 2,000 games and 24,000 Hands, divided across the same four 500-game seed families and four rollout samples as the canonical 3× baseline. The bots were taught to value the amount opponents could actually pay, including unused Loan capacity, rather than an impossible theoretical claim.

An additional 15 games were inspected Hand by Hand. Both arms completed without transition failures or invalid showdown shapes.

## Headline comparison

| Metric                      | Canonical 3× Pot | Direct Glory steal |   Change |
| --------------------------- | ---------------: | -----------------: | -------: |
| Hand-8 trailer wins game    |             5.2% |               7.1% |  +1.9 pp |
| 1,000+ deficit trailer wins |             2.5% |               3.4% |  +0.9 pp |
| Hand-8 leader wins game     |            58.8% |              57.6% |  -1.2 pp |
| Trailer leads later         |             8.1% |               9.4% |  +1.3 pp |
| Mean final-score spread     |            1,272 |              1,480 |   +16.3% |
| Lead changes per game       |             2.54 |               2.35 |    -7.5% |
| Games with elimination      |            6.35% |              7.55% | +1.20 pp |
| Loans per game              |             1.56 |               1.70 |    +9.0% |
| Mean normal pot             |              337 |                344 |    +2.0% |
| Orbit-3 mean normal pot     |              395 |                416 |    +5.2% |
| Hands with voluntary all-in |            14.7% |              15.0% |  +0.3 pp |

Direct stealing improves trailer conversion, especially from medium-to-large deficits, but makes the game more polarized overall.

## Comebacks by Hand-8 deficit

| Deficit | Canonical games | Canonical win | Direct games | Direct win |
| ------: | --------------: | ------------: | -----------: | ---------: |
|   0–249 |              29 |         10.3% |           30 |      13.3% |
| 250–499 |             206 |         15.5% |          134 |      14.9% |
| 500–749 |             425 |          5.9% |          337 |      11.6% |
| 750–999 |             516 |          4.5% |          502 |       9.0% |
|  1,000+ |             824 |          2.5% |          997 |       3.4% |

The middle bands approximately double their comeback rate. The deeply buried trailer improves only modestly, and the experiment itself produces more games with a 1,000-chip Hand-8 gap: 49.9% versus 41.2%. It creates more successful reversals from 500–999 behind while also creating more extreme deficits in the first place.

The 1,000+ improvement is small enough to be sampling noise at this size. The improvements in the 500–749 and 750–999 bands are much larger and consistent across the aggregate.

## Riichi behavior

| Metric                                | Canonical 3× Pot | Direct Glory steal |
| ------------------------------------- | ---------------: | -----------------: |
| Declarations per Hand / game          |     0.193 / 2.32 |       0.186 / 2.23 |
| Win rate per declaration              |            60.6% |              61.4% |
| Successful reward mean                |              128 |                183 |
| Successful reward median              |              105 |   120–140 by shard |
| Successful reward P90                 |          285–300 |            400–420 |
| Maximum reward                        |              405 |                780 |
| Chips transferred to winners per game |        about 180 |                251 |

The direct rule produces slightly fewer Riichis but makes each success 43% larger on average. It therefore feels more like a jackpot and less like a steadily growing public objective.

The canonical system removes approximately 225 unclaimed Riichi-Pot chips per game at the end. Direct stealing is zero-sum, so no chips leave the table. Nevertheless, Loans and eliminations increase because the payment is sudden, compulsory, and charged to several stacks at once.

## Who pays and who benefits in Orbit 3

| Pre-Hand standing | Canonical maintenance paid | Canonical Riichi received | Direct tax paid | Direct Riichi received |
| ----------------- | -------------------------: | ------------------------: | --------------: | ---------------------: |
| Leader            |                       39.3 |                       6.7 |            23.5 |                    7.7 |
| Middle            |                        9.3 |                       6.8 |            10.5 |                   11.1 |
| Trailer           |                        2.3 |                       9.9 |             4.2 |                   18.9 |

All values are chips per player-Hand. Direct stealing is much better targeted: the trailer's net Riichi flow improves from roughly +7.6 to +14.7 chips per Hand. But the leader's net headwind falls from roughly -32.6 to -15.8 because payment is contingent on somebody else's successful Riichi rather than guaranteed Crown maintenance.

That produces the central tradeoff:

- Canonical maintenance erodes the leader more strongly and predictably.
- Direct stealing routes more of the transferred money specifically to trailers who take the Riichi risk.
- The weaker total headwind lets Glory and chip leadership align more strongly.

The unique Glory leader was also the chip leader 82.3% of the time under direct stealing, versus 78.2% canonically. In Orbit 3, the Crown/Glory leader was the chip leader about 72.4% of player-Hand observations, versus 65.4% canonically.

## Last-orbit behavior

| Metric                   | Canonical leader | Direct leader | Canonical trailer | Direct trailer |
| ------------------------ | ---------------: | ------------: | ----------------: | -------------: |
| Fold rate                |            29.7% |         31.7% |             43.6% |          44.3% |
| Hand win rate            |            26.8% |         26.0% |             22.4% |          23.0% |
| Mean score change / Hand |            -34.1 |         -19.3 |              -2.0 |           +4.9 |
| Riichi declaration rate  |             5.3% |          5.2% |              8.0% |           9.1% |

The direct rule gives trailers an actual positive average trajectory in the last orbit. It does not substantially change their ordinary Hand odds. The improvement comes from targeted Riichi transfers.

Leaders win approximately 65% of the Riichis they declare, versus 52% for trailers. This is rational selection: a leader can collect only from opponents with relatively little Glory, so the reward lowers their threshold less. A trailer sees a large reward from the high-Glory leader and rationally declares with a wider, weaker range.

## Inspected moments

- One player trailed by 190 after Hand 8, then won consecutive Riichis worth 500 chips each. They finished with 2,160 chips and a 2,625-point lead. This is exactly the intended comeback fantasy, followed by a very large overshoot.
- Another game paid direct Riichi rewards of 340, 300, and 460 across the final four Hands. The transfers repeatedly changed which stack was under pressure without touching the normal pot.
- A 400-chip Riichi reward on Hand 11 accompanied a normal 470-chip pot. The special reward was almost as large as the entire betting contest.
- Because Glory is persistent, the same 13-Glory player funded two consecutive 500-chip rewards. The liability does not discharge after payment.

## Complexity at the table

This removes the persistent center Pot, but it does not remove arithmetic. On every successful Riichi, the table must inspect every opponent's Glory, multiply three separate values by the Orbit Value, make up to three chip transfers, and possibly resolve Loans. The canonical system requires one fixed 15/30/60 payment before a Hand and one Pot pickup after a successful Riichi.

Direct stealing therefore has less persistent state but more settlement handling. Whether it feels simpler is a physical-play question, not an implementation question.

## Assessment

This is a viable mechanism, but it is not a clean health improvement over the canonical 3× Pot.

It meaningfully improves comeback odds from 500–999 behind and gives trailers more direct agency. In exchange, it increases score spread, extreme early deficits, Loans, eliminations, late normal pots, and maximum Riichi rewards. It also erodes leaders less overall because the tax happens only after an opponent's successful Riichi.

The canonical Pot remains the better default if the priorities are gentle negative feedback, controlled swings, and a visible shared objective. Direct stealing is better if the priority is a rarer but much more dramatic usurpation moment and the group accepts larger overshoots.

The strongest design warning is repeated extraction from unchanged Glory. It creates the desired miracle comeback, but a player can win successive Riichis against the same historical Glory and jump from trailer to runaway leader. That is the principal reason the mean final spread rises even as trailer victories improve.
