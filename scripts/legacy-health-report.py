"""Summarize process-isolated tournament experiments; percentages retain denominators."""
import json, pathlib, statistics, collections, gzip
ROOT=pathlib.Path('docs/legacy-152/health')
mean=lambda xs: round(statistics.mean(xs),2) if xs else None
pct=lambda a,b: round(100*a/b,2) if b else None
summary={}
for path in sorted([*ROOT.glob('*.json'), *ROOT.glob('*.json.gz')]):
 if path.name=='summary.json': continue
 d=json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_text())
 if 'tournaments' not in d: continue
 by={}
 for n in (4,5,6):
  ts=[t for t in d['tournaments'] if t['players']==n]
  if not ts: continue
  hs=[h for t in ts for h in t['hands']]
  ps=[p for h in hs for p in h['seats']]
  sd=[p for h in hs if h['reason']=='showdown' for p in h['seats'] if not p['folded']]
  wins=[p for p in ps if p['won']]
  events=collections.Counter()
  for t in ts: events.update(t['eventCounts'])
  rows={}
  for kind in d['ladder']:
   ends=[p for p in ps if kind in p['end']['contains']]
   rows[kind]={'opening_contains':sum(kind in p['opening']['contains'] for p in ps),
    'end_contains':len(ends),'end_best':sum(p['end']['kind']==kind for p in ps),
    'end_contains_wins':sum(p['won'] for p in ends),
    'showdown_best':sum(p['end']['kind']==kind for p in sd),
    'showdown_contains':sum(kind in p['end']['contains'] for p in sd),
    'winning_hands':sum(any(p['won'] and p['end']['kind']==kind for p in h['seats']) for h in hs),
    'winning_best':sum(p['end']['kind']==kind for p in wins)}
  feature_rates={}
  for label, test in [('joker',lambda f:f['joker']),('blank',lambda f:f['blank']),('treasure',lambda f:f['treasure']),('single_lotus',lambda f:f['lotus']==1),('twin_lotus',lambda f:f['lotus']==2),('two_dragon_types',lambda f:f['dragons']==2)]:
   yes=[p for p in ps if test(p['opening'])]; no=[p for p in ps if not test(p['opening'])]
   feature_rates[label]={'with':len(yes),'with_wins':sum(p['won'] for p in yes),'without':len(no),'without_wins':sum(p['won'] for p in no),'with_win_pct':pct(sum(p['won'] for p in yes),len(yes)),'without_win_pct':pct(sum(p['won'] for p in no),len(no))}
  weak=[p for p in ps if p['bottomOpening']]
  behind=[p for p in ps if p['behindChips']]
  core_maxima=[]
  for t in ts:
   cores=collections.Counter((p['id'],p['end']['kind'],p['end'].get('core')) for h in t['hands'] for p in h['seats'] if p['won'] and p['end'].get('core'))
   if cores: core_maxima.append(max(cores.values()))
  bygame=[]
  for game in range(1,5):
   gh=[h for h in hs if h['game']==game]
   gp=[p for h in gh for p in h['seats']]
   probes=[p for t in ts for probe in t['probes'] if probe['game']==game for p in probe['players'] if p['size']>=7]
   bygame.append({'game':game,'hands':len(gh),'opening_strong_pct':pct(sum(p['opening']['reference']>=9 and p['opening']['lotus']!=1 for p in gp),len(gp)),
    'own_deck_probe_strong_pct':mean([p['strong'] for p in probes]),'probe_players':len(probes),
    'end_strong_pct':pct(sum(p['end']['reference']>=9 and p['end']['lotus']!=1 for p in gp),len(gp)),
    'kong_wins_pct':pct(sum(p['won'] and p['end']['kind']=='kong' for p in gp),sum(p['won'] for p in gp)),
    'winning_kinds':dict(collections.Counter(p['end']['kind'] for p in gp if p['won']))})
  repeats=[v for t in ts for v in t['repeats']]
  pairs=[(h,p) for h in hs for p in h['seats'] if p['end']['lotus']==2]
  dragon_starts=[p for p in ps if p['opening']['dragons']==2 and 'three-dragons' not in p['opening']['contains']]
  by[n]={'tournaments':len(ts),'hands':len(hs),'player_hands':len(ps),'showdowns':sum(h['reason']=='showdown' for h in hs),'showdown_players':len(sd),
   'exhausted':sum(not t['completed'] for t in ts),'central_min':min(t['centralMinimum'] for t in ts),
   'final_deck_mean':mean([v for t in ts for v in t['finalDecks']]),'final_deck_range':[min(v for t in ts for v in t['finalDecks']),max(v for t in ts for v in t['finalDecks'])],
   'fallback_per_tournament':mean([t['fallback'] for t in ts]),'personal_draws_per_tournament':mean([t['personalDraws'] for t in ts]),
   'repeated_cards_mean':mean(repeats),'repeated_faces_mean':mean([v for t in ts for v in t['faceRepeats']]),'five_plus_repeat_pct':pct(sum(v>=5 for v in repeats),len(repeats)), 'identical_hands':sum(v==7 for v in repeats),
   'distinct_held_mean':mean([v for t in ts for v in t['seen']]),'rows':rows,'feature_rates':feature_rates,'games':bygame,
   'opening_faces':{face:{'hands':sum(face in p['opening'].get('faces',[]) for p in ps), 'wins':sum(p['won'] and face in p['opening'].get('faces',[]) for p in ps)} for face in sorted({f for p in ps for f in p['opening'].get('faces',[])})},
   'weak_opening_profitable':sum(p['net']>0 for p in weak),'weak_opening_wins':sum(p['won'] for p in weak),'weak_opening_hands':len(weak),'weak_opening_win_pct':pct(sum(p['won'] for p in weak),len(weak)),
   'behind_chips_win_pct':pct(sum(p['won'] for p in behind),len(behind)),
   'last_after_game_one_wins':sum(bool(set(t['lastAfterOne'])&set(t['winners'])) for t in ts),
   'leader_after_game_one_wins':sum(bool(set(t['leadersAfterOne'])&set(t['winners'])) for t in ts),
   'same_winning_core_maxima':core_maxima,'events':dict(events),'loan_offers':sum(t['loanOffers'] for t in ts),'eliminated_player_games':sum(t['eliminatedPlayerGames'] for t in ts),
   'riichi_sticks_awarded':sum(h['riichi']['sticksAwarded'] for h in hs),'riichi_declarations':sum(bool(h['riichi']['declaredPlayerId']) for h in hs),'riichi_wins':sum(h['riichi']['won'] for h in hs),
   'riichi_sticks_left_mean':mean([p['sticks'] for t in ts for p in t['hands'][-1]['seats']]),
   'disqualified_showdown':sum(p['disqualified'] for p in sd),
   'treasure_payout':sum(p['treasurePayout'] for p in ps),'lotus_bluffs':sum(bool(h['lotusBluff']) for h in hs),
   'lotus_pairs':{'all':len(pairs),'folded':sum(p['folded'] for h,p in pairs),'uncontested_wins':sum(h['reason']=='uncontested' and p['won'] for h,p in pairs),'showdown':sum(h['reason']=='showdown' and not p['folded'] for h,p in pairs)},
   'two_dragons_to_three':{'starts':len(dragon_starts),'finishes':sum('three-dragons' in p['end']['contains'] for p in dragon_starts)}}
 summary[d['variant']]=by
ROOT.joinpath('summary.json').write_text(json.dumps(summary,indent=2)+'\n')
for v,by in summary.items():
 for n,s in by.items():
  print(v,n,'tours',s['tournaments'],'exhaust',s['exhausted'],'deck',s['final_deck_mean'],'repeat',s['repeated_cards_mean'],'5+',s['five_plus_repeat_pct'],'growth',[g['own_deck_probe_strong_pct'] for g in s['games']],'kong SD%',pct(s['rows']['kong']['showdown_best'],s['showdown_players']))
