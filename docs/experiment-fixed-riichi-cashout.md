# Fixed Riichi cashout experiment

## Question

Would a fixed 20 or 25 chips per opposing Glory produce a healthier and simpler game than the canonical Orbit-scaled schedule?

The matched arms were:

| Schedule   | Orbit 1 | Orbit 2 | Orbit 3 |
| ---------- | ------: | ------: | ------: |
| Escalating |      10 |      20 |      40 |
| Fixed 20   |      20 |      20 |      20 |
| Fixed 25   |      25 |      25 |      25 |

All other rules and bot parameters remained identical. Bots evaluated the actual collectible Riichi reward under each schedule.

## Method

Each arm used the same 500 game seeds, divided between two 250-game shards: 1,500 games and 18,000 Hands in total, with four hidden-information rollout samples per decision. All games completed without transition failures. Fifteen additional matched seeds per arm were inspected Hand by Hand.

## Headline results

| Metric                            | Escalating 10/20/40 | Fixed 20 | Fixed 25 |
| --------------------------------- | ------------------: | -------: | -------: |
| Hand-8 trailer wins game          |                8.8% |     4.8% |     4.6% |
| 1,000+ deficit trailer wins       |                6.0% |     2.9% |     2.8% |
| Hand-8 leader wins game           |               54.4% |    60.6% |    64.0% |
| Trailer leads at least once later |               13.2% |     7.6% |     7.0% |
| Mean final-score spread           |               1,542 |    1,480 |    1,488 |
| Lead changes per game             |                2.36 |     2.28 |     2.24 |
| Games with elimination            |                9.4% |     7.6% |     8.2% |
| Loans per game                    |                1.84 |     1.69 |     1.74 |
| Mean normal pot                   |                 342 |      344 |      343 |
| Hands with voluntary all-in       |               15.3% |    15.6% |    15.4% |
| Riichi declarations per Hand      |               0.214 |    0.215 |    0.217 |
| Riichi success rate               |               59.7% |    61.2% |    62.0% |
| Mean successful Riichi cashout    |                 270 |      189 |      232 |
| Riichi cashout chips per game     |                 413 |      299 |      373 |
| Glory discarded per game          |                14.6 |     14.9 |     14.9 |

The fixed schedules slightly reduce spread, Loans, and eliminations, but approximately halve the chance that the Hand-8 trailer wins. Fixed 25 performs no better than fixed 20 on comeback conversion and gives the Hand-8 leader the highest final win rate.

Betting, all-ins, showdowns, Riichi frequency, and Glory discharge barely change. This isolates the result to when chips are transferred, not a broad bot-policy change.

## Where the money moves

| Orbit | Escalating cashout / Hand | Fixed-20 cashout / Hand | Fixed-25 cashout / Hand |
| ----: | ------------------------: | ----------------------: | ----------------------: |
|     1 |                       6.6 |                    13.2 |                    16.7 |
|     2 |                      23.4 |                    23.5 |                    29.7 |
|     3 |                      73.5 |                    38.0 |                    46.9 |

| Orbit | Escalating successful cashout | Fixed-20 successful cashout | Fixed-25 successful cashout |
| ----: | ----------------------------: | --------------------------: | --------------------------: |
|     1 |                            54 |                         107 |                         135 |
|     2 |                           196 |                         194 |                         237 |
|     3 |                           513 |                         254 |                         305 |

Fixed values do not create enough early negative feedback to compensate for the lost late pressure. Glory is still shallow in Orbit 1, so doubling or multiplying its price by 2.5 produces only a 50–135 chip successful reward. That transfer also occurs before standings have meaningfully separated, making it closer to extra early variance than targeted leader erosion.

By Orbit 3, the Glory leader is strongly correlated with the chip leader and several Hands of markers may be unresolved. This is precisely when a per-marker value of 40 targets accumulated success. Fixed 20 removes half that late liability; fixed 25 removes 37.5%.

## Comeback by Hand-8 deficit

| Deficit | Escalating games | Escalating win | Fixed-20 games | Fixed-20 win | Fixed-25 games | Fixed-25 win |
| ------: | ---------------: | -------------: | -------------: | -----------: | -------------: | -----------: |
|   0–249 |                7 |          28.6% |              5 |        20.0% |              5 |        20.0% |
| 250–499 |               32 |          25.0% |             29 |        17.2% |             27 |        18.5% |
| 500–749 |               79 |           8.9% |             74 |         9.5% |             71 |         2.8% |
| 750–999 |              116 |           9.5% |            117 |         2.6% |            115 |         6.1% |
|  1,000+ |              266 |           6.0% |            275 |         2.9% |            282 |         2.8% |

The smallest band has few observations, but the overall pattern is broad. Escalating wins in four of the five bands and is substantially better from 750 or more behind. Fixed 20's narrow advantage in the 500–749 band is small and inconsistent with the adjacent bands.

## Last-orbit roles

| Metric per player-Hand | Escalating leader | Fixed-20 leader | Fixed-25 leader | Escalating trailer | Fixed-20 trailer | Fixed-25 trailer |
| ---------------------- | ----------------: | --------------: | --------------: | -----------------: | ---------------: | ---------------: |
| Mean score change      |             -40.2 |           -22.3 |           -19.5 |              +14.5 |             +0.4 |             +9.6 |
| Riichi cashout paid    |              42.9 |            21.9 |            27.0 |                4.5 |              2.2 |              2.3 |
| Riichi chips received  |               7.7 |             4.5 |             5.5 |               28.5 |             13.1 |             20.7 |

Fixed 25 gives trailers a positive late average, but it still converts to fewer game wins. It begins Orbit 3 after having injected more variance earlier, while its remaining bounties are too small to bridge the accumulated deficit. The escalating arm both erodes the leader twice as strongly and gives a successful trailer a much larger discrete jump.

## Inspected moments

- In one matched game, 25 opposing Glory remained on Hand 12. Escalating paid 1,000 chips; fixed 20 would value the same markers at 500 and fixed 25 at 625.
- Another Orbit-3 Bird Migration Riichi cleared 15 Glory for 600 chips under escalating. The fixed equivalents are 300 and 375.
- Early fixed cashouts were commonly only 60–120 chips because opponents had few markers. They changed a Hand result but did not prevent later stack separation.
- Fixed schedules produced slightly tighter final spreads, but the inspected close games came from smaller transfers rather than additional reversals by trailers.

## Verdict

Keep **10/20/40** as the canonical schedule.

Fixed 20 and 25 are easier to state, but they work against the system's purpose. They spend more redistribution before there is a meaningful leader and remove it when a late trailer needs a credible comeback. The escalating schedule makes Glory feel like a latent pot whose stakes naturally mature with the game, nearly doubles trailer conversion, and produces more lead changes.

The cost is modestly greater volatility: roughly 60 more points of final spread, 0.1–0.15 additional Loans per game, and 1–2 percentage points more games with elimination. Given the stated priority of keeping the final Orbit live, that is the better tradeoff.
