# Paired uncertainty check

Final frozen arms, seeds 200–209. Resample the ten whole tournament pairs per player count, not individual hands, to preserve within-tournament dependence. 10,000 bootstrap resamples, RNG seed 19. Intervals describe this small bot experiment and are not bounds on human play. Negative differences mean fewer repeated cores or fewer eliminations with the prototype.

| Players | Change in maximum same-core wins per tournament, mean [95% bootstrap interval] | Change in elimination episodes per tournament, mean [95% bootstrap interval] |
|---|---|---|
| 4 | +1.20 [-0.50, +2.80] | +0.20 [-0.20, +0.70] |
| 5 | +1.90 [+1.10, +2.80] | +0.20 [-0.20, +0.70] |
| 6 | -3.70 [-7.40, -0.60] | -4.70 [-6.80, -2.70] |
