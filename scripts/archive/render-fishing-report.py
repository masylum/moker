from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'docs/fishing-experiment-2026-09-25'
health=json.loads((D/'summary.json').read_text());catchup=json.loads((D/'catchup.json').read_text())
pct=lambda x:f'{100*x:.2f}%'
number=lambda x:f'{x:.2f}'
lines=['# Fishing rules: hand building and catch-up','',
'25 September 2026. **2,400 retained completed simulations, covering 19,369 hands. All bots use 24 samples per equity projection.**','',
'This experiment compares the current upgraded bots and rules with bots adapted to the proposed fishing rules. The app remains on the current rules; the experimental engine and bots are preserved separately.','',
'**Recommendation:** do not adopt the Basic version as written with these bots and settings. Riichi delivers more hand building, but this experiment does not demonstrate a tournament catch-up improvement.','',
'Basic’s share of tournament wins coming from someone behind after Orbit 1 falls from **35.20% to 21.00%**: −14.20 percentage points, with an approximate 95% paired interval of −19.28 to −9.12. By that checkpoint, **22.80%** of proposed-rule tournaments have already ended, versus **3.40%** under current rules.','',
'Riichi’s corresponding four-orbit figure is **53.25% → 53.50%**. The change is +0.25 points with an interval of −9.54 to +10.04, so this sample cannot establish a benefit or rule out moderate effects. Its last-place survivor entering Orbit 2 wins about **11.9%** under either rule set.','',
'## Rules and comparison','',
'- Basic: a free fishing step after Check, Call, and Bet/Raise.',
'- Riichi: a free step after Check or Call; a stick buys a second step after either, or a fishing step after Bet/Raise.',
'- Existing all-in and declared-Riichi locks remain, as requested. A hand that has already ended uncontested has no fishing step.',
'- Main cohorts: 500 paired deal seeds per variant in Basic (four continuous orbits) and Riichi (one orbit), with 200 initial chips and no resets between orbits.',
'- Extra catch-up cohort: 200 paired four-orbit Riichi tournaments per variant. Its results are separate from the one-orbit health comparison.','',
'## Hand building and table activity','',
'| Measure | Basic: current → proposed | Riichi, one orbit: current → proposed |','| --- | ---: | ---: |']
metrics=[('Hands reaching Street 4','street4Rate',pct),('Fishing steps per hand','drawsPerHand',number),('Deck draws per hand','deckDrawsPerHand',number),('Lane draws/exchanges per hand','laneDrawsPerHand',number),('Cards in both lanes at a betting decision','averageLaneCards',number),('Fold rate when facing a wager','foldToWagerRate',pct),('Hands ending uncontested','uncontestedRate',pct),('Hands ending during Street 1','street1EndRate',pct),('Ante-triggered immediate showdowns','street0EndRate',pct),('Hands with an all-in','allInHandRate',pct),('Strongest initial hand’s eventual win credit','openingLeaderWinRate',pct),('Showdown players improving on initial hand','improvedShowdownRate',pct),('Betting actions per hand','actionsPerHand',number),('Hands per tournament/game','handsPerGame',number),('Players eliminated','eliminatedPerPlayer',pct),('Loans per tournament/game','loansPerGame',number),('Negative final scores','negativePerPlayer',pct)]
for title,key,fmt in metrics:
 values=[' → '.join(fmt(health[m][v]['metrics'][key]) for v in ['current','proposed']) for m in ['basic','riichi']]
 lines.append(f'| {title} | {values[0]} | {values[1]} |')
lines+=['','Selected paired changes (approximate 95% bootstrap intervals, resampling whole games):','', '| Measure | Basic change | Riichi change |','| --- | ---: | ---: |']
for key,title,scale,unit in [('street4Rate','Street 4 reach',100,'pp'),('drawsPerHand','Fishing steps per hand',1,''),('openingLeaderWinRate','Initial strongest-hand win credit',100,'pp'),('foldToWagerRate','Fold rate facing wager',100,'pp')]:
 vals=[]
 for mode in ['basic','riichi']:
  c=health[mode]['pairedChanges'][key];vals.append(f"{c['difference']*scale:+.2f} {unit} [{c['lower']*scale:+.2f}, {c['upper']*scale:+.2f}]")
 lines.append(f'| {title} | {vals[0]} | {vals[1]} |')
lines+=['','## Catch-up across orbits','',
'Positions are measured **entering each orbit**, after the previous settlement and before the next ante/loan. Leader and live trailer mean unique first and last place among players still able to play. Ties are excluded from these two groups; final tied wins split credit. Riichi standings deduct 250 points per loan. Everyone starts the first orbit tied, so the informative checkpoints begin at Orbit 2.','',
'![Tournament comebacks](fishing-experiment-2026-09-25/comebacks.png)', '', '![Conditional catch-up by orbit](fishing-experiment-2026-09-25/catchup.png)','']
for mode in ['basic','riichi']:
 lines += [f'### {mode.capitalize()}: recovery across all tournaments', '',
 'This table keeps every tournament in the denominator. If play ended early, its terminal standings are carried forward. It measures how often the eventual champion came from behind at a fixed checkpoint, without selecting only tournaments that survived longer.', '',
 '| After orbit | Champion was behind: current → proposed | Champion was last: current → proposed | Already finished: current → proposed | Change in champion-from-behind share, 95% interval |',
 '| --- | ---: | ---: | ---: | --- |']
 for checkpoint in [1,2,3]:
  c=catchup[mode]['checkpoints'][str(checkpoint)]
  cells=[' → '.join(pct(c[v][key]['rate']) for v in ['current','proposed']) for key in ['championWasBehind','championWasLast','alreadyFinished']]
  delta=c['pairedChanges']['championWasBehind']
  interval="— (boundary rate)" if delta is None else f"{100*delta['difference']:+.1f} pp [{100*delta['lower']:+.1f}, {100*delta['upper']:+.1f}]"
  lines.append(f'| {checkpoint} | {cells[0]} | {cells[1]} | {cells[2]} | {interval} |')
 lines += ['', f'### {mode.capitalize()}: eventual tournament winner','', '| Entering orbit | Tournaments reaching checkpoint, current / proposed | Leader win credit, current → proposed | Live trailer win credit, current → proposed | Eligible live trailers, current / proposed |','| --- | ---: | ---: | ---: | ---: |']
 for orbit in [2,3,4]:
  o=catchup[mode]['orbits'][str(orbit)]
  get=lambda variant,key:o[variant]['metrics'].get(key,{'rate':None,'observations':0})
  fmt=lambda p:'—' if p['rate'] is None else pct(p['rate'])
  leader=' → '.join(fmt(get(v,'leaderFinalWin')) for v in ['current','proposed'])
  trailer=' → '.join(fmt(get(v,'liveTrailerFinalWin')) for v in ['current','proposed'])
  ns=' / '.join(str(get(v,'liveTrailerFinalWin')['observations']) for v in ['current','proposed'])
  reached=' / '.join(str(o[v]['tournamentsReachingOrbit']) for v in ['current','proposed'])
  lines.append(f'| {orbit} | {reached} | {leader} | {trailer} | {ns} |')
 lines+=['','| Entering orbit | Live trailer reaches/shares lead during orbit | Live trailer ends orbit leading (shared credit) | Live trailer wins largest orbit gain (shared credit) | Final-win-rate change, approximate 95% interval |','| --- | ---: | ---: | ---: | --- |']
 for orbit in [2,3,4]:
  o=catchup[mode]['orbits'][str(orbit)];vals=[]
  for key in ['liveTrailerEverLeadsInOrbit','liveTrailerEndsOrbitLeading','liveTrailerWinsOrbitGain']:
   vals.append(' → '.join(pct(o[v]['metrics'][key]['rate']) if o[v]['metrics'][key]['rate'] is not None else '—' for v in ['current','proposed']))
  c=o['pairedChanges']['liveTrailerFinalWin'];diff='—' if c is None else f"{100*c['difference']:+.1f} pp [{100*c['lower']:+.1f}, {100*c['upper']:+.1f}]"
  lines.append(f'| {orbit} | {vals[0]} | {vals[1]} | {vals[2]} | {diff} |')
 lines+=['', f'### {mode.capitalize()}: deficit entering Orbit 2', '',
 'Live players behind the leader, conditional on reaching Orbit 2. Deficits are net-score points; counts are player observations clustered by tournament.', '',
 '| Deficit | Current: eventual win credit (observations) | Proposed: eventual win credit (observations) |',
 '| --- | ---: | ---: |']
 for bucket in ['up to 50','>50–150','>150–300','>300']:
  vals=[]
  for variant in ['current','proposed']:
   d=catchup[mode]['orbits']['2'][variant]['deficits'].get(bucket,{'rate':None,'observations':0})
   vals.append('— (0)' if d['rate'] is None else f"{pct(d['rate'])} ({d['observations']})")
  lines.append(f'| {bucket} | {vals[0]} | {vals[1]} |')
 lines+=['']
lines+=['### Four-orbit Riichi health context','',
 '| Measure | Current → proposed |','| --- | ---: |']
for key,title,fmt in [('street4Rate','Street 4 reach',pct),('drawsPerHand','Fishing steps per hand',number),('allInHandRate','Hands with an all-in',pct),('loansPerGame','Loans per four-orbit tournament',number),('negativePerPlayer','Negative final scores',pct)]:
 lines.append(f"| {title} | "+' → '.join(fmt(catchup['riichi']['health'][v][key]) for v in ['current','proposed'])+' |')
lines+=['','## Economy and score spread','', '| Mode | Variant | Score p10 / median / p90 | Median winner–last gap |','| --- | --- | ---: | ---: |']
for mode in ['basic','riichi']:
 for variant in ['current','proposed']:
  d=health[mode][variant];scores=' / '.join(f"{d['scores'][str(p)]:.1f}" for p in [.1,.5,.9]);lines.append(f"| {mode} | {variant} | {scores} | {d['medianWinnerLastGap']:.1f} |")
lines+=['','## Interpretation and limits','',
'Basic does reduce folding under pressure (41.17% → 20.66%) and increases the fraction of showdown players who improved their hand (62.97% → 74.04%). Those gains come with more all-in hands (33.55% → 49.76%), fewer completed hands per tournament (10.87 → 7.07), and more formal eliminations (48.80% → 64.40%). The all-in lock still ends fishing. This is consistent with additional fishing feeding larger confrontations, rather than preserving recovery opportunities; the experiment does not isolate each causal component.', '',
'The conditional Basic trailer figures look better among survivors: entering Orbit 2, their final win credit rises from 12.27% to 17.37%. That group is smaller and faces a different surviving field. It does not overturn the all-tournament result: many more tournaments and players have already lost the chance for a comeback.', '',
'Riichi increases fishing from 7.17 to 8.85 steps per hand (+23.5%), raises average combined lane occupancy from 5.22 to 5.72 cards, and reduces the strongest initial hand’s eventual win credit from 52.48% to 48.58%. Street 4 rises from 47.95% to 49.95%, but its +2.0-point interval spans −0.3 to +4.3 points. Loans are almost unchanged (0.728 → 0.744 per one-orbit game; 4.98 → 5.035 over four orbits). The activity gains are clearer than the pacing or recovery gains.', '',
'The next Basic variant worth testing is free fishing after Check/Call while betting gives up that free draw. That has not been tested in this experiment. It would directly test whether allowing defenders to build, without also giving aggressors a free improvement, better serves the catch-up goal while retaining the requested locks.', '',
'This is a rules-plus-bot comparison at a fixed planning budget, not a head-to-head win-rate test between rule systems. Opponent-response estimates remain heuristic. More draws or bigger lanes do not by themselves establish better balance; catch-up and survival must be considered alongside activity.',
'', 'The live-player catch-up rates are conditional on the tournament reaching that orbit and on a unique eligible leader/trailer existing. Changes in who survives can change those populations. The all-tournament checkpoint analysis retains the full cohort, including early endings. The raw data also retain absolute-last-place recovery, rank transitions, and deficit buckets. Approximate intervals resample or cluster by tournament, not by treating hands or repeated player observations as independent. They are exploratory comparisons without multiple-comparison adjustment.',
'', 'Initial-hand strength is measured after Charleston and before betting, except ante-triggered showdowns, which use the dealt cards. Improving at showdown includes tie-break improvement and is conditional on reaching showdown. Lane occupancy is observed at betting decisions. These are descriptive measures, not causal proofs of bullying or player enjoyment.',
'', '## Reproduction and validation','',
'- [Experiment design, definitions, and commands](fishing-experiment-2026-09-25/README.md)',
'- [Frozen source hashes and configuration](fishing-experiment-2026-09-25/manifest.json)',
'- [Main health data and intervals](fishing-experiment-2026-09-25/summary.json)',
'- [Catch-up data, sample counts, rank transitions, and deficits](fishing-experiment-2026-09-25/catchup.json)',
'- [Simulation runner](../scripts/archive/experiment-fishing.ts)',
'- [Rule and orbit-checkpoint tests](../tests/fishing-experiment.test.ts)',
'', 'Validation passed all 97 unit tests, strict TypeScript checking of the experiment, and targeted lint/format checks. The runner checks chip and stick conservation and retains each completed game. Rule tests cover the action/mode matrix, paid second draws after Call, locked hands, a two-step Twin Lotus retrieval, net-score orbit checkpoints, and hidden-information invariance for the new Basic forecasts. Interrupted exploratory batches and deterministic fixtures are excluded from the 2,400-game count.', '']
(ROOT/'docs/fishing-experiment-2026-09-25.md').write_text('\n'.join(lines))
