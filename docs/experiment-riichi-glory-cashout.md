# Riichi Glory-cashout experiment

> Status: the seeded 2× cashout was adopted as the canonical economy after this experiment. The 1× and legacy reward-mode branches have been removed.

## Rule tested

This experiment treats persistent Glory as a latent Riichi pot represented by the players' markers rather than chips in the center.

- Every player begins the game with 1 Glory.
- Bet and Raise continue to create Hand Glory; the Hand winner takes that Glory normally.
- After a successful Riichi, every other non-eliminated player pays the winner:

  `their persistent Glory × current Orbit Value × multiplier`

- After paying, those opponents discard all their Glory.
- The Riichi winner keeps their own Glory and then receives the Hand Glory they won.
- Failed or folded Riichi declarations neither transfer chips nor discard Glory.
- Folded opponents still owe the reward after a successful Riichi.
- Normal Loans cover payment shortfalls up to the existing two-Loan limit.
- Crown remains observable for analysis, but neither Crown nor a center Riichi Pot has an economic effect in these arms.

Two multipliers were tested:

| Orbit | 1× per opponent Glory | 2× per opponent Glory |
| ----: | --------------------: | --------------------: |
|     1 |                     5 |                    10 |
|     2 |                    15 |                    30 |
|     3 |                    20 |                    40 |

For opponents holding 5, 3, and 12 Glory, a successful Riichi therefore transfers 100 / 300 / 400 chips at 1×, or 200 / 600 / 800 at 2×, depending on the Orbit. All three opponents then return their Glory to the supply. The Riichi winner's Glory is untouched.

The initial marker seed makes a first-Hand Riichi worth at least 15 chips at 1× or 30 chips at 2× in a four-player game, before any Hand Glory has accumulated.

## Method

Each cashout arm used 1,000 games and 12,000 Hands over four matched 250-game seed families, with four rollout samples and the same bot policy. The canonical comparison is the established 2,000-game 3× Crown-maintenance/Riichi-Pot baseline. The earlier persistent-steal arm also used 2,000 games.

The bots valued only rewards opponents could actually pay, including unused Loan capacity. Unit tests cover 1× and 2× payment, marker discharge, winner retention, failed Riichi, folded Riichi, and Loan-funded shortfalls. All 2,000 experimental games completed without transition failures or invalid showdown shapes. A separate sample of games was inspected Hand by Hand.

## Headline comparison

| Metric                            | Canonical 3× Pot | Persistent steal | Cashout 1× | Cashout 2× |
| --------------------------------- | ---------------: | ---------------: | ---------: | ---------: |
| Hand-8 trailer wins game          |             5.2% |             7.1% |       5.3% |       9.0% |
| 1,000+ deficit trailer wins       |             2.5% |             3.4% |       2.9% |       6.6% |
| Hand-8 leader wins game           |            58.8% |            57.6% |      60.1% |      53.3% |
| Trailer leads at least once later |             8.1% |             9.4% |       7.5% |      12.0% |
| Mean final-score spread           |            1,272 |            1,480 |      1,459 |      1,515 |
| Lead changes per game             |             2.54 |             2.35 |       2.30 |       2.43 |
| Games with elimination            |            6.35% |            7.55% |       6.6% |       7.8% |
| Loans per game                    |             1.56 |             1.70 |       1.65 |       1.77 |
| Riichi declarations per Hand      |            0.193 |            0.186 |      0.203 |      0.217 |
| Riichi success rate               |            60.6% |            61.4% |      61.6% |      61.2% |
| Mean successful Riichi reward     |              128 |              183 |        134 |        262 |
| Maximum successful Riichi reward  |              405 |              780 |        680 |      1,360 |
| Glory discarded per game          |                — |                — |       14.5 |       14.9 |
| Final total Glory                 |                — |         about 26 |       15.4 |       14.9 |

Cashout 1× is effectively neutral on comeback health. Cashout 2× nearly doubles the overall Hand-8 trailer win rate relative to canonical and cuts the Hand-8 leader's conversion by 5.5 percentage points. It also removes the persistent-steal flaw: paid Glory disappears, so historical success cannot be harvested repeatedly.

## Comebacks by Hand-8 deficit

| Deficit | Canonical win | Cashout 1× games | Cashout 1× win | Cashout 2× games | Cashout 2× win |
| ------: | ------------: | ---------------: | -------------: | ---------------: | -------------: |
|   0–249 |         10.3% |                5 |          40.0% |                7 |          28.6% |
| 250–499 |         15.5% |               71 |          12.7% |               63 |          19.0% |
| 500–749 |          5.9% |              186 |           5.4% |              189 |           9.5% |
| 750–999 |          4.5% |              248 |           7.3% |              228 |          10.5% |
|  1,000+ |          2.5% |              490 |           2.9% |              513 |           6.6% |

The two smallest buckets have few observations and should not be read precisely. The 2× effect is nevertheless broad: it improves every meaningful deficit band and is especially valuable from 750 or more behind. It reaches the desired 20% region only for the 250–499 band. A deeply buried trailer still wins just 6.6% of games, so this is a strong catch-up mechanism rather than a reset button.

## Last-orbit dynamics

| Metric, per player-Hand | Canonical leader | Cashout 1× leader | Cashout 2× leader | Canonical trailer | Cashout 1× trailer | Cashout 2× trailer |
| ----------------------- | ---------------: | ----------------: | ----------------: | ----------------: | -----------------: | -----------------: |
| Mean score change       |            -34.1 |             -12.7 |             -35.5 |              -2.0 |               -3.8 |              +13.1 |
| Direct Riichi tax paid  |                — |              18.4 |              42.3 |                 — |                2.5 |                4.6 |
| Glory discarded         |                — |              0.92 |              1.06 |                 — |               0.13 |               0.12 |
| Riichi reward received  |              6.7 |               4.6 |               8.5 |               9.9 |               13.4 |               30.0 |
| Riichi declaration rate |             5.3% |              4.0% |              4.0% |              8.0% |               9.8% |               9.8% |

The 2× rule produces the intended shape:

- Leaders again face approximately the same late economic headwind as canonical maintenance.
- Trailers receive the transfer only when they take and win the Riichi risk, giving them agency rather than an automatic subsidy.
- A late trailer gains 13 chips per Hand on average instead of slowly losing ground.
- Ordinary Hand equity remains broadly intact; the improvement comes from the special reward, not from secretly favoring a weak stack in hand evaluation.

The leader still opens the last Orbit with much more Glory than the trailer (roughly 8.5 versus 1.0). This is intentional: Glory measures prior aggression and success. At 2×, that visible marker lead becomes a meaningful bounty rather than merely identifying the likely winner.

## Riichi and marker cadence

| Metric                             | Cashout 1× | Cashout 2× |
| ---------------------------------- | ---------: | ---------: |
| Declarations per game              |       2.44 |       2.60 |
| Chips transferred per game         |        201 |        416 |
| Glory discarded per game           |       14.5 |       14.9 |
| Successful reward median           |     80–100 |    160–200 |
| Successful reward P90              |    320–360 |    640–680 |
| Mean final total / maximum Glory   | 15.4 / 9.6 | 14.9 / 9.3 |
| Crown changes per game, analytical |       3.08 |       3.14 |

The 2× incentive causes only about 0.16 additional declarations per game and leaves the success rate near 61%. Bots are not firing Riichi indiscriminately; the extra declarations are marginal opportunities made worthwhile by the larger bounty.

Approximately 15 Glory leaves players' racks per game. That is enough to make cashouts visually consequential while still leaving Glory in circulation. The expected successful reward is 262 chips at 2×, smaller than the mean normal pot of 342 chips but large enough to alter a game.

## Inspected game stories

- A Hand-12 Riichi won a normal 540-chip pot, collected 680 chips, and cleared 17 opposing Glory. The winner moved into second place, 70 chips behind the leader. This was a dramatic final-Hand threat without automatically awarding the game.
- In another game, Hand-1 Riichi collected only 30 chips from the three seeded markers. Later successful cashouts paid 110, 80, and 280 as Glory accumulated and was cleared. The reward naturally grew with the game.
- A Hand-9 Four Winds Riichi collected 280 chips and cleared 7 Glory. Its normal pot was 380, so both the tile result and the latent bounty mattered.
- A Hand-12 trailer won a 500-chip normal pot plus a 320-chip cashout, clearing 8 Glory and climbing from pressure to second place. The previous Glory holders could not be charged again afterward.
- The largest observed 2× reward across the full simulation was 1,360 chips. This is rare but demonstrates that uncapped Glory can still create an exceptional jackpot if no earlier Riichi succeeds.

The inspected sequences were coherent: early cashouts were small, later unresolved markers became visible targets, and successful Riichi created a clear physical reset. No repeated charge against the same marker pile occurred.

## Health costs

The 2× arm improves comeback conversion but does not compress final scores. Mean final spread rises 19% over canonical, games with elimination rise 1.45 percentage points, and Loans rise 14%. This is not caused by larger ordinary pots—the mean normal pot remains approximately 342 chips in both cashout arms. It is caused by zero-sum special transfers that sometimes let a comeback overshoot into a new large lead.

This is the fundamental tradeoff. Discarding Glory solves repeat extraction, but a winner-take-all transfer from up to three opponents is still more volatile than small scheduled Crown payments into a shared pot. The marker cap is now temporal rather than numeric: the accumulated liability can be collected only once, but there is no maximum before it is collected.

The unique Glory leader is also the score leader about 80% of the time under 2×. Cashout weakens that player's stack, but the Riichi winner keeps their own Glory. A successful high-Glory player can therefore remain the largest future target. That preserves continuity and table narrative, though it does not fully decorrelate Glory from chip leadership.

## Player-experience assessment

The cashout version is easier to narrate than the persistent direct-steal version:

1. Bets and Raises build visible Glory on players.
2. More opposing Glory makes Riichi more tempting.
3. A successful Riichi collects the visible bounty.
4. Everyone who paid returns those markers; the winner keeps theirs.

It has no center Pot to maintain and the one-marker seed makes Riichi relevant immediately. Settlement still requires multiplying each opponent's markers and moving chips separately, but clearing the markers makes the transaction final and easy to audit.

## Recommendation

If this player experience is preferred, **2× is the serious candidate**. The 1× version adds table handling without materially improving the trailer's chance to win. The 2× version gives Riichi real urgency, nearly doubles overall trailer conversion, improves every substantial deficit bucket, and prevents repeated harvesting of the same Glory.

It should not yet replace the canonical default solely from this experiment: it also creates wider final spreads, slightly more Loans and eliminations, and a rare four-figure jackpot. Those are visible and understandable consequences rather than simulation defects. The cleanest human playtest question is whether one dramatic, marker-clearing 2× cashout feels earned and memorable or excessively swingy.

No further numeric cap is recommended before that playtest. A cap would make the physical marker display lie about the available bounty and recreate the earlier problem where accumulating Glory stopped increasing leader exposure.
