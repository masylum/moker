"""Produce human-readable metrics and tournament-cluster bootstrap intervals."""
import json,gzip,pathlib,statistics,random
root=pathlib.Path(__file__).resolve().parents[1]/'docs/legacy-shadow'
s=json.load(open(root/'summary.json'))
d={v:json.load(gzip.open(root/(v+'.json.gz'))) for v in s}
f=lambda x:f'{x:.2f}'
rng=random.Random(42)
def ci(xs):
 z=sorted(statistics.mean(rng.choices(xs,k=len(xs))) for _ in range(4000))
 return [round(z[100],3),round(z[3900],3)]
uncertainty={}
for n in [4,5,6]:
 a=[t for t in d['control']['tournaments'] if t['players']==n];b=[t for t in d['shadow']['tournaments'] if t['players']==n]
 def kw(t):return 100*sum(any(p['won'] and p['end']['kind']=='kong' for p in h['seats']) for h in t['hands'])/len(t['hands'])
 diffs=[kw(y)-kw(x) for x,y in zip(a,b)]
 growth=[statistics.mean(p['strong'] for p in t['probes'][3]['players'])-statistics.mean(p['strong'] for p in t['probes'][0]['players']) for t in b]
 uncertainty[n]={'kongChangePoints':statistics.mean(diffs),'kongInterval':ci(diffs),'probeChangePoints':statistics.mean(growth),'probeInterval':ci(growth)}
root.joinpath('uncertainty.json').write_text(json.dumps(uncertainty,indent=2)+'\n')
lines=['# Shadow study: metrics','','All results are bot tournaments, not human balance measurements. Each complete arm has 20 seeds at each of 4, 5 and 6 players, four games per tournament, 24 hidden-world samples per bot decision. Same seed labels are used across arms; changed deck sizes and decisions cause paths to diverge. See README for the exact circulation rule and limitations.','']
for v,x in s.items():
 lines += [f'## {v} ({x["total"]} cards)','','| Players | Tournaments / hands | Finished | Smallest collection at hand boundary | Minimum undrawn | Empty deck episodes | Mean private draws / player-hand |','|---|---|---|---|---|---|---|']
 for n,g in x['byPlayers'].items():lines.append(f"| {n} | {g['tournaments']} / {g['hands']} | {g['tournaments']-g['failures']}/{g['tournaments']} | {g['minimumCollection']} | {g['minimumUndrawn']} | {g['emptyOwnEpisodes']} | {f(g['drawsPerPlayerHand'])} |")
 lines+=['','| Players | Showdowns / hands | Kong winning hands | Mean successive opening overlap / 7 | Maximum same winning core | Mean distinct physical cards held |','|---|---|---|---|---|---|']
 for n,g in x['byPlayers'].items():lines.append(f"| {n} | {g['showdowns']}/{g['hands']} | {g['rows']['kong']['winningHands']}/{g['hands']} ({f(100*g['rows']['kong']['winningHands']/g['hands'])}%) | {g['repeatOpening']} | {max(g['coreMaxima'])} | {g['distinctHeld']} |")
 lines+=['','A core is the selected winning faces, including the particular Joker color, held by the same player. Repeated category names with different cards are not repeated cores. Winning hands include uncontested wins and any awarded pot; category percentages need not sum to 100% when pots are split.','','| Players | Strong-deal probe game 1 → 4 | Original collection retained at game 4 | Weak opening → any pot | Last after game 1 → tournament winner |','|---|---|---|---|---|']
 for n,g in x['byPlayers'].items():
  games=g['games'];w=g['weak']
  lines.append(f"| {n} | {f(games[0]['probeStrong'])}% → {f(games[-1]['probeStrong'])}% | {f(100*games[-1]['originalRetention'])}% | {w['wins']}/{w['count']} ({f(100*w['wins']/w['count'])}%) | {g['lastAfterOneWins']}/{g['tournaments']} |")
 lines+=['','“Strong” means containing Pung and Eyes, Twin Lotus, Long Chow, Three Dragons and Eyes, Four Dragons, Four Winds, Kong or Quint, excluding hands with exactly one Lotus. Each player collection is sampled 100 times at the start of each game. It is a fixed basket across ladder variants, not a rank threshold. It excludes standalone Dragon/Wind trios. “Weak” means at least half the table size (rounded up) has a strictly higher opening category; this excludes many tied weak starts. “Last” and tournament wins include ties. These are descriptive comeback measures, not equal-opportunity probabilities.','','| Players | Sticks spent | Riichi declared / won | Sticks awarded | Loans | Player-game eliminations | Treasure payout, chips |','|---|---|---|---|---|---|---|']
 for n,g in x['byPlayers'].items():
  e=g['events'];lines.append(f"| {n} | {e.get('riichi-stick-spent',0)} | {e.get('riichi-declared',0)} / {g['riichiWin']} | {g['sticksAwarded']} | {e.get('loan-taken',0)} | {g['eliminations']} | {g['treasurePayout']} |")
 gs=list(x['byPlayers'].values());rows={k:{field:sum(g['rows'][k][field] for g in gs) for field in ['opening','endContains','sdContains','sdBest','winningHands']} for k in gs[0]['rows']}
 lines+=['','### Ladder: all player counts combined','',f"Denominators: {sum(g['playerHands'] for g in gs)} dealt player-hands; {sum(g['sdPlayers'] for g in gs)} non-folded showdown participants; {sum(g['hands'] for g in gs)} table hands. Contains counts overlap and include combinations hidden by a stronger one. End-of-hand includes folded hands. Single-Lotus disqualification is separate from category detection.",'','| Kind | Opening contains | End contains | Showdown contains | Showdown best | Winning table hands |','|---|---|---|---|---|---|']
 for k,row in rows.items():lines.append('| '+k+' | '+' | '.join(str(row[field]) for field in ['opening','endContains','sdContains','sdBest','winningHands'])+' |')
 lines+=['','### Cards in the opening hand','','These are associations with receiving any pot, not causal card values. Several card types can coexist in the same hand; pursuit, position, opponents, exposure, and folds confound these rates. Physical copies are grouped by face.','','| Face | Opening holders | Any-pot winners | Rate |','|---|---|---|---|']
 for face in sorted({k for g in gs for k in g['openingFaces']}):
  held=sum(g['openingFaces'].get(face,{}).get('held',0) for g in gs);wins=sum(g['openingFaces'].get(face,{}).get('wins',0) for g in gs)
  lines.append(f'| {face} | {held} | {wins} | {f(100*wins/held)}% |')
 lines.append('')
lines+=['## Uncertainty for the main 192 vs 152 comparison','','95% percentile bootstrap intervals, 4,000 resamples of whole tournaments (paired seeds for Kong comparison). Not individual hands: hands within a tournament are dependent. The growth intervals measure the defined bot probe, not how much fun humans will have.','','| Players | Change in Kong win rate, percentage points | 95% interval | Strong-probe game 4 minus game 1, points | 95% interval |','|---|---|---|---|---|']
for n,u in uncertainty.items():lines.append(f"| {n} | {f(u['kongChangePoints'])} | {u['kongInterval']} | {f(u['probeChangePoints'])} | {u['probeInterval']} |")
root.joinpath('metrics.md').write_text('\n'.join(lines)+'\n')
