"""Paired game-level uncertainty for the frozen fishing-rule experiment."""
from pathlib import Path
import json, random, statistics, math
ROOT=Path(__file__).resolve().parents[1]/'docs/fishing-experiment-2026-09-25'
METRICS={
 'street4Rate':('street4','hands'),
 'drawsPerHand':('draws','hands'),
 'deckDrawsPerHand':('deckDraws','hands'),
 'laneDrawsPerHand':('laneDraws','hands'),
 'averageLaneCards':('laneOccupancy','laneObservations'),
 'foldToWagerRate':('foldToWager','facingWager'),
 'uncontestedRate':('uncontested','hands'),
 'street1EndRate':('street1Ends','hands'),
 'street0EndRate':('street0Ends','hands'),
 'allInHandRate':('allInHands','hands'),
 'openingLeaderWinRate':('openingLeaderWinCredit','hands'),
 'improvedShowdownRate':('improvedShowdownPlayers','showdownPlayers'),
 'meanShowdownRank':('showdownRankSum','showdownPlayers'),
 'actionsPerHand':('actions','hands'),
 'loansPerGame':('loans',None),
 'eliminatedPerPlayer':('eliminations','players'),
 'negativePerPlayer':('negativeFinishes','players'),
 'handsPerGame':('hands',None),
}
def quantile(xs,p):
 xs=sorted(xs);x=(len(xs)-1)*p;lo=int(x);hi=math.ceil(x)
 return xs[lo]+(xs[hi]-xs[lo])*(x-lo)
def pair(row,num,den):return row[num],4 if den=='players' else 1 if den is None else row[den]
def aggregate(rows):
 totals={k:sum(r[k] for r in rows) for k in rows[0] if isinstance(rows[0][k],(int,float)) and k not in ['index','minDeck']}
 totals['minDeck']=min(r['minDeck'] for r in rows)
 metrics={key:sum(pair(r,n,d)[0] for r in rows)/max(1,sum(pair(r,n,d)[1] for r in rows)) for key,(n,d) in METRICS.items()}
 scores=[s for r in rows for s in r['scores'].values()]
 ranks={}
 for r in rows:
  for k,n in r['showdownRanks'].items():ranks[k]=ranks.get(k,0)+n
 return {'games':len(rows),'totals':totals,'metrics':metrics,'scores':{str(p):quantile(scores,p) for p in [.1,.5,.9]},'medianWinnerLastGap':statistics.median(max(r['scores'].values())-min(r['scores'].values()) for r in rows),'showdownRanks':ranks}
summary={}
for mode in ['basic','riichi']:
 cohorts={}
 for variant in ['current','proposed']:
  paths=[ROOT/'results'/f'{mode}-{variant}-{offset}.json' for offset in [0,250]]
  shards=[json.loads(p.read_text()) for p in paths]
  assert all(d['orbits']==(4 if mode=='basic' else 1) and d['samples']==24 and d['games']==250 and d['sourceHashes']==shards[0]['sourceHashes'] and d['prefix']=='fishing-holdout-20260925' for d in shards)
  rows=sorted([r for d in shards for r in d['rows']],key=lambda r:r['index'])
  assert [r['index'] for r in rows]==list(range(500))
  assert all(r['hands']>0 and r['street4']<=r['hands'] for r in rows)
  if mode=='riichi': assert all(r['hands']==4 for r in rows)
  cohorts[variant]=rows
 before,after=cohorts['current'],cohorts['proposed']
 stats={v:aggregate(rows) for v,rows in cohorts.items()}
 diffs={}
 # The game, not a hand/player/action, is the resampling unit.
 randomizer=random.Random(20260925)
 weights=[]
 for _ in range(5000):
  counts=[0]*500
  for i in randomizer.choices(range(500),k=500):counts[i]+=1
  weights.append(counts)
 for key,(num,den) in METRICS.items():
  bp=[pair(r,num,den) for r in before];ap=[pair(r,num,den) for r in after]
  samples=[]
  for counts in weights:
   bn=sum(c*x[0] for c,x in zip(counts,bp));bd=sum(c*x[1] for c,x in zip(counts,bp))
   an=sum(c*x[0] for c,x in zip(counts,ap));ad=sum(c*x[1] for c,x in zip(counts,ap))
   samples.append(an/max(1,ad)-bn/max(1,bd))
  diffs[key]={'difference':stats['proposed']['metrics'][key]-stats['current']['metrics'][key],'lower':quantile(samples,.025),'upper':quantile(samples,.975)}
 summary[mode]={**stats,'pairedChanges':diffs}
(ROOT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
