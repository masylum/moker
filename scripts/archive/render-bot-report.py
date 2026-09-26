from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'docs/bot-upgrade-2026-09-25/final/summary.json').read_text())
b=data['basic']; r=data['riichi']
pct=lambda x:f'{100*x:.2f}%'
num=lambda x:f'{x:+.1f}'
ci=lambda x:f"{pct(x['lower'])}–{pct(x['upper'])}"
lines=['# Bot upgrade: competitive results and health check', '', '25 September 2026. **24 samples throughout.**', '',
'Implemented the fishing, all-in accounting, and Twin Lotus fixes, then tested multiple candidates against the frozen pre-upgrade decision logic. The selected Basic and Riichi policies are deliberately different: Riichi uses a higher shove threshold and a stronger discount when facing a wager.', '',
'## New bots versus the previous generation', '',
'Four players, two new bots and two old bots, playing individually. Every deal seed rotates through all six possible assignments of the two new seats. Neutral game-win credit is 50%; tied winners split credit. Scores include loan penalties.', '',
'| Mode | Matches | Independent deal seeds | New-bot win credit | Approx. 95% interval | Mean score advantage per player |',
'| --- | ---: | ---: | ---: | --- | ---: |']
for title,d in [('Basic, four continuous orbits',b),('Riichi, one orbit',r)]:
 m=d['mixed']; lines.append(f"| {title} | {m['games']} | {m['win']['clusters']} | {pct(m['win']['mean'])} | {ci(m['win'])} | {num(m['scoreAdvantage']['mean'])} |")
lines += ['',f"Basic score-advantage interval: {num(b['mixed']['scoreAdvantage']['lower'])} to {num(b['mixed']['scoreAdvantage']['upper'])}. Riichi: {num(r['mixed']['scoreAdvantage']['lower'])} to {num(r['mixed']['scoreAdvantage']['upper'])}.", '',
'Intervals use independent seeds as clusters; the six seat rotations are not treated as six independent observations. Both generations use the same current engine, five-chip wager unit, 200 starting chips, and 24-sample configuration. Basic runs four **continuous** orbits; it does not reset stacks between orbits. This differs from the older health report’s four reset-game tournaments.', '',
('The final Riichi win-rate interval narrowly clears 50%, supporting a modest match-win advantage over the frozen old bots in this holdout. Average score did not improve; its difference is statistically unresolved.' if r['mixed']['win']['lower'] > .5 else 'Riichi’s final win-rate interval includes 50%, so superiority over the old bots is not established by this comparison. The pacing and borrowing improvements are separate findings.'), '', '## Pacing and economy in self-play', '',
'Each entry below compares 100 all-old games with 100 all-new games on the same 100 deal seeds.', '',
'| Metric | Basic: old → new | Riichi: old → new |', '| --- | ---: | ---: |']
for label,fn in [
 ('Hands reaching Street 4',lambda c:pct(c['street4Rate'])),
 ('Hands completed per game',lambda c:f"{c['totals']['hands']/c['games']:.2f}"),
 ('Loans per game',lambda c:f"{c['loansPerGame']:.2f}"),
 ('Players eliminated by game end',lambda c:pct(c['eliminatedPlayerRate'])),
 ('Players finishing with a negative score',lambda c:pct(c['negativePlayerRate'])),
 ('Median winner-to-last score gap',lambda c:f"{c['medianWinnerLastGap']:.1f}"),
 ('Score p10 / median / p90',lambda c:' / '.join(f"{c['scores'][str(p)]:.1f}" for p in [.1,.5,.9])),
]:
 values=[' → '.join(fn(d['controls'][g]) for g in ['old','new']) for d in [b,r]]
 lines.append(f'| {label} | {values[0]} | {values[1]} |')
lines += ['',f"The paired Street 4 change is {100*b['pairedStreet4Change']['difference']:+.2f} percentage points in Basic (bootstrap interval {100*b['pairedStreet4Change']['lower']:+.2f} to {100*b['pairedStreet4Change']['upper']:+.2f}) and {100*r['pairedStreet4Change']['difference']:+.2f} points in Riichi ({100*r['pairedStreet4Change']['lower']:+.2f} to {100*r['pairedStreet4Change']['upper']:+.2f}).", '',
'Basic still has substantial elimination pressure over four continuous orbits with 200 chips. Riichi’s longer hands and lower borrowing rate support the combined strategy change, but do not establish that starting stacks or every card are balanced. Loans are automatic ante top-ups in these rules, rather than voluntary bot decisions.', '',
'## Fishing, Blanks, and Riichi', '',
'Actual uses in the 100 Riichi self-play games per generation:', '',
'| Mechanic | Old | New |', '| --- | ---: | ---: |']
for key,label in [('checkStick','Stick fishing after Check'),('callStick','Stick fishing after Call'),('betStick','Stick fishing alongside Bet / Raise'),('twoStepDig','Two successive draws into the same lane'),('blankChain','Fish a Blank, then exchange it'),('blanks','Completed Blank exchanges'),('riichies','Riichi declarations')]:
 lines.append(f"| {label} | {r['controls']['old']['totals'][key]} | {r['controls']['new']['totals'][key]} |")
lines += ['',f"The {r['mixed']['games']} final mixed Riichi matches also exercised {r['mixed']['totals']['twoStepDig']} two-step digs and {r['mixed']['totals']['blankChain']} Blank-retrieval chains. These are observed play sequences, in addition to the deterministic regression fixtures.", '',
'Blank exchanges are selective: the bot compares retrieval value with keeping the Blank available. Exchange count alone is not an effectiveness measure; these tests do not isolate a causal win-rate contribution for Blanks. Winning with the whole policy and executing the retrieval fixtures are separate pieces of evidence.', '',
'## What changed', '',
'- Short-call costs are capped by the caller’s chips. Pot estimates refund only excess commitments from the current street, retain earlier-street money, and account for short callers across possible response combinations.',
'- Twin Lotus remains a certain win through uncertainty shrinkage and caller-range adjustments. It can declare Riichi immediately even when its ordinary hand rank is low.',
'- Paid fishing has value after Check, Call, and Bet. A second Check draw is compared with the first draw’s value, so its benefit is incremental. Fishing receives no credit when all-in or Riichi rules disable it.',
'- Two-draw plans can uncover a buried card, combine visible lane draws, or fish a Blank and exchange it for a deeper target. Discards retain the required Blank and avoid burying the queued draw.',
'- Visible draws use post-draw equity. Riichi deck fishing jointly samples the drawn card and opponent cards without replacement. A smaller continuation bonus avoids treating development as free chip profit.',
'- A spare Joker receives reserve value, and a mathematically guaranteed final tournament lead is protected by folding. The lead bound uses public chips, loan penalties, and prior-game scores.',
'- Charleston passes are chosen as a two-card combination. Hand potential includes tie-break strength and consistently penalizes an unpaired Lotus.',
'- Riichi’s selected policy uses a 0.95 shove threshold and 0.65 wager-equity calibration. Basic retains its accepted 0.72 and 0.75 values. These are internal heuristic parameters, not claimed probabilities of real-world success.',
'- Application game creation, browser batch requests, worker batch fallback, simulation helpers, inspection scripts, and training stages now default to 24. The batch API returns the configured budget.', '',
'## Budget, validation, and limitations', '',
'The configuration is **24 Monte Carlo samples per equity projection**, plus the existing 24 draws used for deck-fishing potential. A decision can evaluate the current hand and additional one- or two-draw continuations at that same budget. This is extra planning work; it is not four-sample screening or a claim of 24 total scoring operations. Known Twin Lotus is resolved directly.', '',
'Across selection and evaluation, 4,920 retained games/tournaments were played at 24 samples: 1,920 tuning games, 960 accepted competitive matches, 400 accepted self-play controls, and 1,640 games evaluating earlier Riichi revisions. Reused Basic and legacy-control records are counted once. Retries and smoke tests are excluded.', '',
'The first Riichi candidate initially looked promising, but its expanded 720-match holdout fell to 51.4% wins with a negative mean-score difference. It was rejected. The next cautious revision scored 51.8% in a second 720-match holdout, essentially tied in mean score, while substantially improving pacing. Joker retention, final-lead protection, and wager calibration were then compared on tuning seeds; the selected revision was frozen for another 720 fresh Riichi matches. The Basic decision path was preserved; a six-seat replay reproduced its accepted results and behavior counters exactly. The older Basic cohort is identified by its own source hashes.', '',
'Validation includes ten targeted bot regressions, the complete unit suite, worker integration tests including an actual 24-sample persisted batch, TypeScript checks, lint/format checks for changed code, production build, and chip/stick accounting checks in the comparison harness. Tiny floating-point roundoff from split pots is checked with a 1e-7 tolerance.', '',
'The reported confidence intervals describe individual comparisons and are not adjusted for the repeated candidate-selection process. Opponent responses and continuation values remain heuristics. These results measure performance against the previous generation at four-player tables. They are not a proof of optimal play, human-play balance, or card-by-card causal effects.', '',
'## Reproducibility', '',
'- [Final aggregate data](bot-upgrade-2026-09-25/final/summary.json)',
'- [Selected source snapshot and hashes](bot-upgrade-2026-09-25/final/manifest.json)',
'- [Experiment design and earlier rejected candidate](bot-upgrade-2026-09-25/README.md)',
'- [Live comparison runner](../scripts/archive/benchmark-bots.ts)',
'- [Aggregate script](../scripts/archive/summarize-bot-benchmark.py)',
'- [Report renderer](../scripts/archive/render-bot-report.py)',
'- [Bot regression fixtures](../tests/bot-upgrade.test.ts)',
'', 'Run `python3 scripts/archive/summarize-bot-benchmark.py` from the repository root to regenerate the final aggregate; `--initial` reproduces the first-stage aggregate. The frozen final runner lives under `docs/bot-upgrade-2026-09-25/final/source`. Individual games, seed families, seat assignments, final scores, behavior counts, and source hashes are retained in the JSON records.', '']
(root/'docs/bot-upgrade-2026-09-25.md').write_text('\n'.join(lines))
