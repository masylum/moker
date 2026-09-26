# Riichi declaration-Street pricing experiment

> Historical experiment. The subsequent design decision selected fixed 60/40/20 pricing and
> paired it with an expected-value bot model. See
> [the canonical validation](experiment-riichi-60-40-20.md).

## Question

Would making a successful Riichi cashout more valuable on earlier Streets improve late-game
comebacks without creating unhealthy transfers?

The canonical rule pays each opponent's Glory at `2 × Orbit Value`: 10 chips in Orbit 1,
20 in Orbit 2, and 40 in Orbit 3, regardless of declaration Street. Street 4 remains ineligible
for Riichi in every treatment.

## Method

- 300 matched four-player, 12-Hand games per treatment
- 8 rollout samples per bot decision
- Identical seed prefix (`street-screen`) and canonical bot policy
- 2,100 games / 25,200 Hands across seven treatments
- The declaration Street was recorded when Riichi was taken and retained through settlement
- No changes to betting, Glory generation, loans, elimination, or hand ranking

The first three treatments used absolute chip prices per opposing Glory. The remaining three
multiplied Orbit Value by a Street-specific factor.

## Results

| Cashout schedule (Streets 1/2/3)    | Hand-8 trailer wins | 1,000+ deficit wins | Trailer led later | Hand-8 leader wins | Mean / p90 / max successful cashout | Loans / game | Games with elimination | Final spread |
| ----------------------------------- | ------------------: | ------------------: | ----------------: | -----------------: | ----------------------------------: | -----------: | ---------------------: | -----------: |
| Canonical: 2× Orbit on every Street |                8.7% |                7.2% |             12.7% |              60.3% |                   197 / 480 / 1,160 |         2.80 |                  22.0% |        1,720 |
| Fixed 40 / 30 / 20                  |                5.3% |                3.3% |              7.3% |              61.0% |                   187 / 360 / 1,160 |         2.86 |                  19.7% |        1,749 |
| Fixed 60 / 40 / 20                  |                3.0% |                1.8% |              4.7% |              58.3% |                   224 / 460 / 1,740 |         2.98 |                  22.7% |        1,803 |
| Fixed 80 / 40 / 20                  |                4.0% |                3.0% |              4.7% |              58.3% |                   234 / 480 / 2,320 |         2.97 |                  21.7% |        1,784 |
| 4× / 3× / 2× Orbit Value            |               10.0% |                8.8% |             13.7% |              55.0% |                   247 / 600 / 2,320 |         2.94 |                  24.0% |        1,784 |
| 6× / 4× / 2× Orbit Value            |               12.0% |               10.5% |             16.0% |              51.0% |                   294 / 720 / 3,480 |         3.00 |                  24.3% |        1,837 |
| 8× / 4× / 2× Orbit Value            |               13.7% |               12.1% |             17.3% |              53.3% |                   304 / 760 / 3,800 |         3.07 |                  25.0% |        1,872 |

The canonical declaration split was 6.9% / 36.4% / 56.7% across Streets 1/2/3. Even the
8×/4×/2× treatment moved it only to 8.3% / 38.4% / 53.3%. The stronger schedule therefore
mostly amplified early Riichis rather than moving declarations dramatically earlier.

In the last Orbit, the canonical system moved 31 chips per trailer player-Hand on average and
61.5 from a leader player-Hand. The scaled treatments increased negative feedback:

| Schedule     | Leader mean score change / Hand | Trailer mean score change / Hand | Leader cashout paid / Hand | Trailer Riichi chips won / Hand |
| ------------ | ------------------------------: | -------------------------------: | -------------------------: | ------------------------------: |
| Canonical    |                           -29.0 |                            +31.1 |                       61.5 |                            43.8 |
| 4× / 3× / 2× |                           -56.5 |                            +33.5 |                       86.0 |                            50.0 |
| 6× / 4× / 2× |                           -78.5 |                            +42.7 |                      109.6 |                            63.3 |
| 8× / 4× / 2× |                           -76.5 |                            +44.1 |                      110.9 |                            64.9 |

## Interpretation

Absolute Street prices are harmful because most declarations occur on Street 3. In Orbit 3,
fixed 40/30/20 cuts the common Street-3 price from the canonical 40 to 20. It also moves more
money in early Orbits, before a meaningful leader and trailer have emerged. The result is more
early separation and less useful late negative feedback.

Orbit-scaled Street prices work. They preserve the 40-chip Street-3 floor in Orbit 3 while
rewarding players for accepting uncertainty earlier. The improvement is monotonic, but so is
the settlement tail. The 8×/4×/2× treatment gets closest to the desired comeback rate, yet a
single successful cashout reached 3,800 chips and elimination-bearing games rose by three
percentage points.

Concrete traces contained good dramatic reversals, including a Hand-11 Street-1 Riichi that
let a Hand-8 trailer finish only 330 chips behind. They also contained 1,040- and 1,210-chip
Riichi settlements that effectively decided the game. This is memorable, but not gentle.

## Verdict

- Do not use a fixed 40/30/20 schedule. Street pricing must retain Orbit escalation.
- `4× / 3× / 2× Orbit Value` is the safest tested improvement, but only raises trailer wins
  from 8.7% to 10.0%.
- `6× / 4× / 2× Orbit Value` is the best compromise if stronger catch-up is the priority:
  12.0% trailer wins and 10.5% from 1,000+ behind, at the cost of a much heavier tail.
- `8× / 4× / 2× Orbit Value` is not recommended as the default. Its extra comeback gain is
  small relative to the 3,800-chip maximum cashout.

This experiment does not justify silently replacing the canonical rule. The temporary schedule
switches were removed after measurement; the default remains `2 × Orbit Value` until a curve is
explicitly selected.
