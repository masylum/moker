"""Summarize all Shadow experiments; keep raw counts and per-tournament outcomes."""
import json,gzip,pathlib,collections,statistics
root=pathlib.Path(__file__).resolve().parents[1]/'docs/legacy-shadow'
mean=lambda a:round(statistics.mean(a),3) if a else None
pct=lambda a,b:round(100*a/b,3) if b else None
summary={}
for f in sorted(root.glob('*.json.gz')):
 data=json.loads(gzip.decompress(f.read_bytes()));by={}
 for n in [4,5,6]:
  ts=[t for t in data['tournaments'] if t['players']==n]
  if not ts:continue
  hs=[h for t in ts for h in t['hands']];ps=[p for h in hs for p in h['seats']];sd=[p for h in hs if h['reason']=='showdown' for p in h['seats'] if not p['folded']]
  events=collections.Counter();sources=collections.Counter()
  for t in ts:events.update(t['events']);sources.update(t['sources'])
  rows={}
  for k in data['ladder']:
   rows[k]={'opening':sum(k in p['opening']['contains'] for p in ps),'endContains':sum(k in p['end']['contains'] for p in ps),'sdContains':sum(k in p['end']['contains'] for p in sd),'sdBest':sum(k==p['end']['kind'] for p in sd),'winningHands':sum(any(p['won'] and p['end']['kind']==k for p in h['seats']) for h in hs)}
  pairs=[(h,p) for h in hs for p in h['seats'] if p['end']['lotus']==2]
  coreMax=[]
  for t in ts:
   c=collections.Counter((p['id'],p['end']['kind'],p['end']['core']) for h in t['hands'] for p in h['seats'] if p['won']);coreMax.append(max(c.values(),default=0))
  games=[]
  for game in [1,2,3,4]:
   gp=[p for h in hs if h['game']==game for p in h['seats']]; probes=[p for t in ts for probe in t['probes'] if probe['game']==game for p in probe['players']]
   games.append({'game':game,'openingStrong':pct(sum(p['opening']['strong'] for p in gp),len(gp)),'openingThreeDragons':pct(sum('three-dragons' in p['opening']['contains'] for p in gp),len(gp)),'openingRank':mean([p['opening']['rank'] for p in gp]),'openingKong':pct(sum('kong' in p['opening']['contains'] for p in gp),len(gp)),'probeStrong':mean([p['strong'] for p in probes]),'probeKong':mean([p['kong'] for p in probes]),'originalRetention':mean([p['original'] for p in probes])})
  faces={}
  for face in sorted({f for p in ps for f in p['opening']['faces']}):
   held=[p for p in ps if face in p['opening']['faces']]
   faces[face]={'held':len(held),'wins':sum(p['won'] for p in held),'rate':pct(sum(p['won'] for p in held),len(held))}
  weak=[p for p in ps if p['weak']]
  by[n]={'tournaments':len(ts),'hands':len(hs),'playerHands':len(ps),'showdowns':sum(h['reason']=='showdown' for h in hs),'sdPlayers':len(sd),'failures':sum(not t['completed'] for t in ts),'minimumCollection':min(min(t['minimumCollection'],*(min(r['after']) for r in t['redistribution'])) for t in ts),'maximumCollection':max(max(t['maximumCollection'],*(max(r['after']) for r in t['redistribution'])) for t in ts),'minimumUndrawn':min(t['minimumUndrawn'] for t in ts),'emptyOwnEpisodes':sum(t['emptyOwn'] for t in ts),'finalSizes':[v for t in ts for v in t['finalDecks']],'finalSizeRange':[min(v for t in ts for v in t['finalDecks']),max(v for t in ts for v in t['finalDecks'])],'finalSpread':mean([max(t['finalDecks'])-min(t['finalDecks']) for t in ts]),'drawsPerPlayerHand':sum(sum(t['deckDraws']) for t in ts)/len(ps),'distinctHeld':mean([v for t in ts for v in t['seen']]),'repeatOpening':mean([v for t in ts for v in t['repeat']]),'coreMaxima':coreMax,'rows':rows,'games':games,'events':dict(events),'sources':dict(sources),'weak':{'count':len(weak),'wins':sum(p['won'] for p in weak),'profitable':sum(p['net']>0 for p in weak)},'lastAfterOneWins':sum(bool(set(t['winnerIds'])&set(t['lastAfterOne'])) for t in ts),'eliminations':sum(t['eliminated'] for t in ts),'sticksAwarded':sum(h['riichi']['sticksAwarded'] for h in hs),'riichiWin':sum(h['riichi']['won'] for h in hs),'treasurePayout':sum(p['treasurePayout'] for p in ps),'disqualified':sum(p['disqualified'] for p in sd),'lotusPairs':{'all':len(pairs),'folded':sum(p['folded'] for h,p in pairs),'uncontested':sum(p['won'] and h['reason']=='uncontested' for h,p in pairs),'showdown':sum(not p['folded'] and h['reason']=='showdown' for h,p in pairs)},'openingFaces':faces,'blackSelectedWins':sum(p['won'] and p['end']['usedBlackJoker'] for p in ps),'blackSelected':sum(p['end']['usedBlackJoker'] for p in ps)}
 summary[data['variant']]={'total':data['total'],'runs':data['runs'],'samples':data['samples'],'checks':data['checks'],'randomSamples':data['randomSamples'],'randomContains':data['randomCounts'],'randomBest':data['randomBest'],'byPlayers':by}
root.joinpath('summary.json').write_text(json.dumps(summary,indent=2)+'\n')
for v,data in summary.items():
 print('\n',v,data['checks'])
 for n,g in data['byPlayers'].items():
  print(n,'T',g['tournaments'],'H',g['hands'],'min',g['minimumCollection'],'range',g['finalSizeRange'],'empty',g['emptyOwnEpisodes'],'Kongwins%',pct(g['rows']['kong']['winningHands'],g['hands']),'coremax',max(g['coreMaxima']),'power',[x['openingStrong'] for x in g['games']])
