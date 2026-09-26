# Canonical 60/40/20 Riichi cashout and bot tuning

## Rule

A winning Riichi makes every opponent pay chips per Glory according to the Street where Riichi
was declared: 60 on Street 1, 40 on Street 2, and 20 on Street 3. Paying players discard all
Glory; the winner retains their own. Street 4 remains ineligible.

The declaration Street is retained through settlement. Reaching Street 4 does not reprice an
earlier declaration.

## Bot correction

The former heuristic valued Riichi as showdown equity times projected cashout, minus a flat five
chips per remaining Street. It omitted immediate fold equity and barely represented the loss of
Draw & Discard, Fishing, Blank, and Season opportunities.

The canonical heuristic now compares each Riichi Bet or Raise with its non-Riichi equivalent:

`P(immediate win or showdown win) × projected cashout − expected building value lost`

It may consider a Riichi-motivated aggressive action only when this incremental value is positive.
The trained equity gate was reduced from 65% to 50%; this permits positive-EV risks without
forcing them.

## Competitive validation

The expected-value model first beat the legacy valuation over 240 rotating two-versus-two games:
51.5% game-win credit and +37.7 final-score points per player-game.

A four-policy screen then selected a 50% Riichi equity gate. On a fresh 300-game, eight-rollout
holdout against the 65% incumbent:

| Metric                        |         50% candidate |         65% incumbent |
| ----------------------------- | --------------------: | --------------------: |
| Game-win credit               |                 57.0% |                 43.0% |
| Mean final score              |                 536.2 |                 442.2 |
| Riichis / player-game         |                 2.627 |                 1.090 |
| Riichi win rate               |                 45.2% |                 59.0% |
| Successful payout             |                 264.9 |                 219.5 |
| Declaration Streets 1 / 2 / 3 | 22.4% / 43.3% / 34.3% | 10.2% / 39.9% / 49.8% |

The stronger player declares more often and earlier while accepting lower raw win probability.
That is rational under 60/40/20 and confirms that the policy is exploiting the push-your-luck
tradeoff rather than merely waiting for near-certainty.

## Symmetric game health

The final policy was also run in all four seats for 300 matched games and 3,600 Hands. Relative
to the earlier 65% expected-value policy on identical deals:

| Metric                              |           65% policy |  Canonical 50% policy |
| ----------------------------------- | -------------------: | --------------------: |
| Riichi declarations / Hand          |                0.452 |                 0.724 |
| Declaration Streets 1 / 2 / 3       | 9.2% / 37.1% / 53.7% | 25.4% / 40.2% / 34.4% |
| Riichi win rate                     |                57.8% |                 47.8% |
| Cashout chips / game                |                680.6 |                 979.7 |
| Mean / p90 / max successful cashout |    217 / 440 / 1,215 |     236 / 520 / 1,500 |
| Mean normal pot                     |                418.2 |                 417.6 |
| Voluntary all-ins / Hand            |                0.304 |                 0.302 |
| Loans / game                        |                 2.94 |                  2.74 |
| Games with elimination              |                25.3% |                 21.7% |
| Lead changes / game                 |                 2.29 |                  2.69 |
| Final-score spread                  |                1,840 |                 1,727 |

The policy creates the intended race for Riichi without inflating ordinary pots or all-ins.
Earlier Glory clearing keeps accumulated racks smaller: final maximum Glory fell from 7.34 to
5.47 on average. The observed cashout tail grew moderately, but remained well below the
2,000–4,000 transfers produced by the rejected Orbit-scaled Street schedules.

The Hand-8 trailer won 6.3% of games and 2.8% from a 1,000+ deficit in this sample. This remains
below the aspirational 20% target and slightly below the older 2× Orbit baseline. The mechanism
meaningfully erodes leaders—last-Orbit leaders averaged -56.1 chips per player-Hand and trailers
averaged +15.8—but it does not make deep logical elimination disappear.
