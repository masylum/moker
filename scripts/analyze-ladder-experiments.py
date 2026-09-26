"""Played-game ladder metrics, paired candidate deltas, and run-bootstrap uncertainty."""
import argparse, collections, json, math, random
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('directory',type=Path)
args=parser.parse_args()
def metrics(records,order,scope='all'):
 totals=collections.defaultdict(collections.Counter)
 for r in records:
  for k,v in r[scope]['rows'].items():totals[k].update(v)
 hands=sum(r[scope]['hands'] for r in records);deals=sum(r[scope]['deals'] for r in records)
 rows={k:dict(v,buildRate=v['contains']/deals,openingWin=v['openingWins']/v['opening'] if v['opening'] else None,showWin=v['showWins']/v['show'] if v['show'] else None) for k,v in totals.items()}
 # Structural supersets must remain above their components even if selected frequencies differ.
 rarity=[];wins=[]
 for a,b in zip(order[1:-1],order[2:]):
  low,high=rows[a],rows[b]
  rarity.append({'lower':a,'higher':b,'logRatio':math.log((high['contains']+.5)/(low['contains']+.5)),'lowerN':low['contains'],'higherN':high['contains']})
  if min(low['show'],high['show'])>=20:
   wins.append({'lower':a,'higher':b,'difference':high['showWin']-low['showWin'],'lowerN':low['show'],'higherN':high['show']})
 return {'runs':len(records),'hands':hands,'deals':deals,'rows':rows,'rarityInversion':sum(max(0,x['logRatio']) for x in rarity),'showdownInversion':sum(max(0,-x['difference']) for x in wins),'rarityPairs':rarity,'winPairs':wins,'allIn':sum(r[scope]['allIns'] for r in records)/hands,'street4':sum(r[scope]['street4'] for r in records)/hands,'showdowns':sum(r[scope]['showdowns'] for r in records)/hands}

summaries={};data={}
for path in sorted(args.directory.glob('*.jsonl')):
 manifest=json.loads(Path(str(path)+'.manifest.json').read_text())
 try: records=[json.loads(line) for line in path.read_text().splitlines() if line]
 except json.JSONDecodeError:continue
 if len(records)!=manifest['count']:continue
 data[path.stem]=(records,manifest)
 summaries[path.stem]={'manifest':manifest,'all':metrics(records,manifest['order']),'early':metrics(records,manifest['order'],'early')}
for label,(records,m) in data.items():
 if not label.startswith(('validation-','reset-')):continue
 rng=random.Random(9107);ratios=collections.defaultdict(list);differences=collections.defaultdict(list)
 for trial in range(500):
  batch=metrics(rng.choices(records,k=len(records)),m['order'])
  for p in batch['rarityPairs']:ratios[p['lower']+' / '+p['higher']].append(p['logRatio'])
  for a,b in zip(m['order'][:-1],m['order'][1:]):
   x,y=batch['rows'][a],batch['rows'][b]
   if x['show'] and y['show']:differences[a+' / '+b].append(y['showWin']-x['showWin'])
 def interval(xs):
  xs=sorted(xs);return [xs[int(.025*len(xs))],xs[min(len(xs)-1,int(.975*len(xs)))]]
 summaries[label]['pairUncertainty']={key:{'logRarityRatioCI95':interval(ratios[key]) if key in ratios else None,'showWinDifferenceCI95':interval(differences[key]) if key in differences else None} for key in sorted(set(ratios)|set(differences))}
for label,(records,m) in data.items():
 prefix=label.split('-'+m['mode']+'-')[0]
 base=data.get(prefix+'-'+m['mode']+'-baseline')
 if not base or 'baseline'==label.split('-'+m['mode']+'-')[1]:continue
 original,bm=base
 if m['seed']!=bm['seed'] or len(records)!=len(original):continue
 original=sorted(original,key=lambda r:r['index']);records=sorted(records,key=lambda r:r['index'])
 assert [r['seed'] for r in original]==[r['seed'] for r in records]
 rng=random.Random(3711);stats=collections.defaultdict(list)
 for trial in range(500):
  indices=rng.choices(range(len(records)),k=len(records))
  left=metrics([original[i] for i in indices],bm['order']);right=metrics([records[i] for i in indices],m['order'])
  for k in ['rarityInversion','showdownInversion','allIn','street4']:stats[k].append(right[k]-left[k])
 summaries[label]['pairedBaseline']={k:{'delta':summaries[label]['all'][k]-summaries[prefix+'-'+m['mode']+'-baseline']['all'][k],'ci95':[sorted(v)[12],sorted(v)[487]]} for k,v in stats.items()}
(args.directory/'analysis.json').write_text(json.dumps(summaries,indent=2)+'\n')
for label,s in summaries.items():
 a=s['all'];print(label,a['runs'],'rarity',round(a['rarityInversion'],3),'win',round(a['showdownInversion'],3),'early rarity',round(s['early']['rarityInversion'],3))
 print('  inversions',[(p['lower'],p['higher'],p['lowerN'],p['higherN']) for p in a['rarityPairs'] if p['logRatio']>0])
 print('  win inversions',[(p['lower'],p['higher'],round(p['difference'],3)) for p in a['winPairs'] if p['difference']<0])
 if 'pairedBaseline' in s: print('  paired',s['pairedBaseline'])
