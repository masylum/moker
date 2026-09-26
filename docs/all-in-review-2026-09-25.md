# Why Riichi ends all-in, and what a 200/400/600/800 schedule changes

No new games were simulated. This review reads the five saved **new-bot Riichi games: 80 hands**, extracts every all-in and inspects the betting sequences of specific cases. It also checks the engine and bot formulas and uses four saved Basic games for an explicitly limited scoring illustration. All saved decisions used **24 equity samples**.

## 1. The all-in concern is justified

The earlier **55.0%** was from mixed tables containing two old and two new bots. **53.6% of all hands** ended with an all-in triggered before Street 4: **97.4% of all-in hands**. Street 4 itself still leaves two cards concealed. Among first all-in triggers in that dataset, 76.9% were Calls, 15.6% Bets, and 7.5% antes. These are existing results, not another simulation batch.

The five all-new sample games were worse on this measure: **50/80 hands contained an all-in; 49 of those 50 started before Street 4**. A small sample does not estimate the population rate precisely, but it provides no reason to dismiss the concern as an old-bot artifact.

### What they actually held

This table counts the **first** all-in in each sampled hand. Six later all-in Calls are excluded so a hand is not counted twice.

| Trigger | Count | Hand at the decision |
|---|---:|---|
| Call | 36 | 8 Eyes; 6 Chow; 5 Two Eyes; 7 Chow + Eye; 3 Three Winds; 2 Pung; 2 Pung + Eye; 1 Three Dragons; 1 Three Dragons + Eye; 1 Kong |
| Bet | 7 | 3 Twin Lotus; 1 Three Winds; 1 Chow + Eye; 2 High Card |
| Ante | 7 | Forced payment, without a betting decision |

**All three non-final-hand shoves held Twin Lotus. The other four shoves occurred on the final hand.** The weak-hand problem predominantly concerns Calls, including the earlier decisions that made the final Call cheap.

Of the 36 first all-in Calls:

- Median remaining cash was **35**; 21 callers had **40 or less**.
- 21 callers already had at least one loan.
- 26 held only Eyes, Chow, Two Eyes, or Chow + Eye.
- 20 were at the minimum tournament risk multiplier of **0.50**.
- Average quoted equity was **52.6%**, but realized showdown winner credit was **31.9%**: 11.5 wins including split credit, versus 18.94 implied by their forecasts. Five correlated games are not a formal calibration study; this discrepancy is a warning, not proof that every losing Call was wrong.

### Four decisions worth examining

| Saved game / hand | Decision and evidence | Assessment |
|---|---|---|
| Riichi 0 / H9 | P2 shoves 430 with Twin Lotus. P4 has only 40 to call. The cap refunds 390 to P2; the final pot is 150. | Sensible for P2: unbeatable hand, and the apparent 430-chip exposure is largely refunded. P4's Two Eyes Call at 73% quoted equity is much harder to justify against that betting signal, though P4 did not know the concealed Lotuses. |
| Riichi 0 / H7 | P4 calls its last 20 with a pair of 8s. After refunds, the pot including the Call is 460: the chip break-even rate is 4.35%. P3 wins with a Pung. Earlier, P4 had called 140 from a 160 stack on Street 1. | The final cheap Call could be reasonable if its 10% estimate were credible. The earlier commitment and the credibility of that estimate are the more useful questions. Losing this particular showdown does not itself prove the Call was wrong. |
| Riichi 4 / H12 | P4 calls its last 140 on Street 1 with 1–2–3 Dots plus two West Winds. It quotes **81%** after P2 raises and declares Riichi. The resulting pot is 465; P2 holds Three Dragons using a Joker and wins. | A particularly suspicious forecast. P4 needs about 30% equity, so this cannot be defended merely as paying one chip into a huge pot. The source model inadequately incorporates the strength implied by the action sequence. |
| Riichi 1 / H8 | P1 raises with a pair of South Winds, then calls its last 180 after two opponents re-raise. It quotes 50% equity. P4 wins with Two Eyes. | The problem develops through the whole betting sequence. It is not simply an unlucky, already-depleted player with a five-chip decision. |

[Complete extracted decisions and actual opposing hands](all-in-review-2026-09-25/decisions.json). Actual opposing hands are used here for retrospective diagnosis, not information available to the acting bot. The original [five Riichi traces](tournament-bots-2026-09-25/selected-audit.md) retain all preceding decisions.

## 2. Risk aversion exists, but important parts of the model are wrong or too crude

The bot penalizes risk using the new cost, total hand exposure, estimated loss probability, and tournament position. Its tournament multiplier ranges from 0.5 to 3.5; a late trailer is deliberately less protective. However:

1. **The opponent model is too weak.** It samples unknown cards and reweights them by the number of opposing Bets, capped at two. That reweighting does not directly use Bet size or a Riichi declaration. It also does not model the full selection process by which opponents keep improving and betting their hands. A hand facing repeated raises is not facing an ordinary random hand. In the sample, every early shove was Twin Lotus, yet some callers still regarded Two Eyes or Three Winds as strong favorites.
2. **The uncertainty prior invents too much equity for weak hands.** The adjustment is `(sampled equity × effective samples + equal-share equity × 8) / (effective samples + 8)`. Heads-up, even zero wins in 24 samples becomes 12.5%, then **8.67% after the Riichi calibration**. Lower effective sample size can pull a zero estimate even farther toward equal share. Proven known losses bypass this, but unproven, highly unlikely wins do not. Against a sufficiently cheap Call, that generous prior can overwhelm the risk penalty. The appropriate prior should reflect the hand and betting evidence, rather than assume equal shares.
3. **The 70% hand budget limits raise candidates, not Calls.** A positive evaluated Call can consume the rest of the stack. With inflated 81% equity, the estimated loss penalty is small. In the Chow + Eye example, the quoted chip EV is about +236 and the risk deduction is only about 13.
4. **Future survival is approximated.** The bot uses existing loan penalties and tournament standings, but does not explicitly roll out the next mandatory loan, future fishing opportunities, or the value of preserving a playable stack. On the final hand it optimizes first-place credit rather than expected score, allowing desperation shoves with weak hands. Some depend on a secured leader making a mistake.

Therefore, “the bot chose positive EV” is not a sufficient defense. The input probabilities and future consequences need to be credible. **Winning against the old bots did not validate these estimates.** More simulated tournaments would not repair the assumptions.

Source: [action valuation](../src/game/heuristic.ts:347), [tournament risk](../src/game/heuristic.ts:707), [raise budget](../src/game/heuristic.ts:782), [opponent-range weighting](../src/game/heuristic.ts:1037), [uncertainty adjustment](../src/game/heuristic.ts:1184).

## 3. Why this differs from ordinary Hold'em, particularly with Riichi

- **An all-in stops development.** The seven cards already exist, and fishing ceases for the table when anyone goes all-in. In Hold'em, remaining community cards still run out after an all-in; a current favorite cannot use its shove to prevent that runout. Here, a strong current hand benefits from ending future improvement.
- **One small stack controls the table's endpoint.** Its Call can end everyone's fishing, even if the others have ample chips. Contribution caps and refunds mean an apparent large shove need not remain a large investment.
- **Riichi keeps depleted players in circulation.** Basic eliminates a player who cannot ante; Riichi automatically lends 200 and records a 250 deduction at game end. Repeated loans sustain short stacks and create loan-adjusted trailers. An exact last-chip ante triggers an immediate showdown without a bot choice.
- **Riichi adds both real strength and misleading estimates.** Jokers and fishing sticks can genuinely make stronger hands. Twin Lotus is unbeatable. But opponents' acquired strength and their betting signals need appropriate inference; those special cards do not make weak Calls automatically rational.

The 55% rate is thus a mixture of structural rules and bot weaknesses. It should not be treated as a demonstrated equilibrium of rational play.

## 4. Would 200 / 400 / 600 / 800 help catch-up?

**Yes, it gives later reset games more scoring weight and preserves stack depth relative to the ante. It does not eliminate a secured lead in the final game.**

First, an important correction to the earlier framing: the reported catch-up rates came from **one four-orbit game** (`tournamentGames: 1`), with chips carried continuously and no reset. They were not measurements of the app's three- or four-game tournament. In an actual multi-game tournament, chips and elimination status reset between games and recorded scores are added. A locked win in Game 1 therefore does not automatically lock the whole tournament. The bot's guaranteed-lead safeguard is restricted to the last tournament game.

The engine currently gives 200/300/400/500 chips and antes of 5/10/15/20. Your proposal gives:

| Game | Ante | Current stack / antes | Proposed stack / antes | Current / proposed share of total starting-chip allocation |
|---|---:|---:|---:|---:|
| 1 | 5 | 200 / 40 | 200 / 40 | 14.3% / 10% |
| 2 | 10 | 300 / 30 | 400 / 40 | 21.4% / 20% |
| 3 | 15 | 400 / 26.7 | 600 / 40 | 28.6% / 30% |
| 4 | 20 | 500 / 25 | 800 / 40 | 35.7% / 40% |

For the same fractional gain or loss of a starting stack, Game 4 would count **four times Game 1**, compared with **2.5 times** today. Later games would also be less compressed by antes than they are under the current schedule. These are accounting and stack-depth effects, not measured comeback probabilities.

As a small accounting check, I treated saved Basic games 0–3 as four consecutive reset games and held each finishing stack fraction fixed. P2 won the first game, but P3 won the combined tournament under both schedules: 2,510 under the current schedule and 3,785 under the proposal. This illustrates later-game weighting; it does **not** establish a higher comeback frequency. Actual decisions would change with different stacks and cumulative standings. [Exact calculation](all-in-review-2026-09-25/schedule-illustration.json).

### What higher chips do not solve

With four players, starting stack `S`, ante `A`, and `r` remaining hands, a sufficient conservative lock condition with equal prior scores is:

`leader's uncommitted cash > 2S + A × r`

If `A = S/40`, that threshold is the same fraction of the total chip pool at any scale. For example, with 13 hands left, it is above **465 of 800 total chips** at a 200 stack, and above **1,860 of 3,200** at an 800 stack. Both are 58.125% of the table's chips. Merely multiplying chips and antes does not remove the folding incentive.

With a prior cumulative-score lead `D` over the strongest rival, the sufficient final-game threshold becomes `2S + A × r − D/2`. Larger later stacks make a fixed earlier lead less dominant, which is precisely the useful part of your proposal. A player can still secure the final tournament late enough or with a sufficiently large cumulative lead.

If applied to Riichi too, its fixed 200 loan / 250 penalty and fixed five-chip minimum raise would not scale with the stack schedule; constant stack-to-ante ratio is not complete economic scale invariance.

Source: [game reset and ante schedule](../src/game/engine.ts:149), [cumulative scoring](../src/game/engine.ts:1030), [current tournament rules](../public/rules.md:154).

## Assessment

The proposed schedule is a sensible improvement to **multi-game weighting and later-game stack depth**. It is not a cure for a final-game mathematically secured lead. For Riichi all-ins, the highest-priority bot work is better inference from raises/Riichi and a more appropriate uncertainty prior, followed by valuing the survival and loan consequences of Calls. Simply adding stronger generic risk aversion would also suppress some correctly priced cheap Calls and guaranteed Twin Lotus plays.
