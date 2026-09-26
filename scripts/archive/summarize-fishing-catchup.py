"""Orbit standings and recovery, clustered by tournament/deal seed."""
from pathlib import Path
import json, statistics, math
ROOT=Path(__file__).resolve().parents[1]/'docs/fishing-experiment-2026-09-25'

def winners(scores):
 best=max(scores.values())
 return [p for p,s in scores.items() if abs(s-best)<1e-7]
def credit(player, ids):return float(player in ids)/len(ids)
def rank(player,scores):return 1+sum(s>scores[player]+1e-7 for s in scores.values())
def observations(row,mode,orbit):
 checkpoint=next((o for o in row['orbits'] if o['orbit']==orbit),None)
 if not checkpoint:return {},{},[]
 start,end=checkpoint['startScores'],checkpoint['endScores']
 live=[p for p in start if mode=='riichi' or checkpoint['startChips'][p]>=5]
 final=winners(row['scores']); end_leaders=winners(end)
 best=max(start[p] for p in live); worst=min(start[p] for p in live)
 leaders=[p for p in live if abs(start[p]-best)<1e-7]
 trailers=[p for p in live if abs(start[p]-worst)<1e-7 and start[p]<best-1e-7]
 absolute_last=[p for p in start if abs(start[p]-min(start.values()))<1e-7]
 delta={p:end[p]-start[p] for p in live}; gain_winners=winners(delta)
 obs={}
 if len(leaders)==1:obs['leaderFinalWin']=(credit(leaders[0],final),1)
 if len(trailers)==1:
  p=trailers[0]
  obs['liveTrailerFinalWin']=(credit(p,final),1)
  obs['liveTrailerEndsOrbitLeading']=(credit(p,end_leaders),1)
  obs['liveTrailerEverLeadsInOrbit']=(float(any(p in winners(s) for s in checkpoint['handScores'])),1)
  obs['liveTrailerWinsOrbitGain']=(credit(p,gain_winners),1)
 if len(absolute_last)==1:obs['absoluteTrailerFinalWin']=(credit(absolute_last[0],final),1)
 behind=[p for p in live if start[p]<best-1e-7]
 if behind:obs['behindPlayerFinalWin']=(sum(credit(p,final) for p in behind),len(behind))
 for p in live:
  key=f'rank{rank(p,start)}FinalWin'
  x,n=obs.get(key,(0,0));obs[key]=(x+credit(p,final),n+1)
 buckets={}
 for p in behind:
  deficit=best-start[p]
  key='up to 50' if deficit<=50 else '>50–150' if deficit<=150 else '>150–300' if deficit<=300 else '>300'
  x,n=buckets.get(key,(0,0));buckets[key]=(x+credit(p,final),n+1)
 transitions=[{'start':rank(p,start),'end':rank(p,end),'live':p in live} for p in start]
 return obs,buckets,transitions

def checkpoint_observations(row, after_orbit):
 # Carry terminal standings forward when a tournament ended early. This keeps
 # the denominator fixed and does not condition catch-up on surviving longer.
 previous=[o for o in row['orbits'] if o['orbit']<=after_orbit]
 scores=previous[-1]['endScores'] if previous else {p:200 for p in row['scores']}
 final=winners(row['scores']);best=max(scores.values());worst=min(scores.values())
 behind=sum(credit(p,final) for p in scores if scores[p]<best-1e-7)
 bottom=sum(credit(p,final) for p in scores if abs(scores[p]-worst)<1e-7 and scores[p]<best-1e-7)
 return {'championWasBehind':(behind,1),'championWasLast':(bottom,1),
 'championWasLeading':(1-behind,1),
 'alreadyFinished':(float(max(o['orbit'] for o in row['orbits'])<=after_orbit),1)}

def estimate(pairs):
 x=sum(a for a,b in pairs);n=sum(b for a,b in pairs)
 if not n:return {'winCredit':x,'observations':0,'rate':None}
 rate=x/n;mean_den=n/len(pairs)
 influence=[(a-rate*b)/mean_den for a,b in pairs]
 se=statistics.stdev(influence)/math.sqrt(len(pairs)) if len(pairs)>1 else 0
 lower,upper=max(0,rate-1.96*se),min(1,rate+1.96*se)
 eligible=sum(b>0 for a,b in pairs)
 # An observed zero is not evidence of an impossible comeback. At boundaries
 # use a conservative binomial bound over eligible independent tournaments.
 if rate==0:lower,upper=0,1-.025**(1/eligible)
 elif rate==1:lower,upper=.025**(1/eligible),1
 elif eligible<10:
  z=1.96;den=1+z*z/eligible;center=(rate+z*z/(2*eligible))/den
  half=z*math.sqrt(rate*(1-rate)/eligible+z*z/(4*eligible*eligible))/den
  lower,upper=max(0,center-half),min(1,center+half)
 return {'winCredit':x,'observations':n,'eligibleTournaments':eligible,'rate':rate,'lower':lower,'upper':upper}
def paired(before,after):
 a,b=estimate(before),estimate(after)
 if a['rate'] is None or b['rate'] is None or a['rate'] in [0,1] or b['rate'] in [0,1]:return None
 ma=sum(n for x,n in before)/len(before);mb=sum(n for x,n in after)/len(after)
 influence=[(xb-b['rate']*nb)/mb-(xa-a['rate']*na)/ma for (xa,na),(xb,nb) in zip(before,after)]
 difference=b['rate']-a['rate'];se=statistics.stdev(influence)/math.sqrt(len(influence))
 return {'difference':difference,'lower':difference-1.96*se,'upper':difference+1.96*se}
summary={}
for mode,tag,offsets,n in [('basic','basic',[0,250],500),('riichi','riichi-long',[0,100],200)]:
 cohorts={}
 for variant in ['current','proposed']:
  shards=[json.loads((ROOT/'results'/f'{tag}-{variant}-{o}.json').read_text()) for o in offsets]
  assert all(d['orbits']==4 and d['samples']==24 and d['sourceHashes']==shards[0]['sourceHashes'] and d['prefix']==('fishing-holdout-20260925' if mode=='basic' else 'fishing-long-20260925') for d in shards)
  rows=sorted([r for d in shards for r in d['rows']],key=lambda r:r['index'])
  assert [r['index'] for r in rows]==list(range(n))
  cohorts[variant]=rows
 orbits={}
 for orbit in [1,2,3,4]:
  collected={v:[observations(r,mode,orbit) for r in rows] for v,rows in cohorts.items()}
  keys=sorted({key for rows in collected.values() for obs,_,_ in rows for key in obs})
  bucket_keys=sorted({key for rows in collected.values() for _,buckets,_ in rows for key in buckets})
  estimates={}
  for v,observed in collected.items():
   transition={}
   for _,_,moves in observed:
    for move in moves:
     if move['live']:
      key=f"{move['start']}->{move['end']}";transition[key]=transition.get(key,0)+1
   estimates[v]={'tournamentsReachingOrbit':sum(bool(moves) for _,_,moves in observed),
    'metrics':{key:estimate([obs.get(key,(0,0)) for obs,_,_ in observed]) for key in keys},
    'deficits':{key:estimate([buckets.get(key,(0,0)) for _,buckets,_ in observed]) for key in bucket_keys},
    'liveRankTransitions':transition}
  differences={key:paired([obs.get(key,(0,0)) for obs,_,_ in collected['current']],[obs.get(key,(0,0)) for obs,_,_ in collected['proposed']]) for key in keys}
  orbits[orbit]={**estimates,'pairedChanges':differences}
 checkpoints={}
 for checkpoint in [1,2,3]:
  values={v:[checkpoint_observations(r,checkpoint) for r in rows] for v,rows in cohorts.items()}
  keys=values['current'][0].keys()
  checkpoints[checkpoint]={v:{key:estimate([r[key] for r in rs]) for key in keys} for v,rs in values.items()}
  checkpoints[checkpoint]['pairedChanges']={key:paired([r[key] for r in values['current']],[r[key] for r in values['proposed']]) for key in keys}
 health={}
 for variant,rs in cohorts.items():
  hands=sum(r['hands'] for r in rs)
  health[variant]={'hands':hands,'street4Rate':sum(r['street4'] for r in rs)/hands,
   'drawsPerHand':sum(r['draws'] for r in rs)/hands,'loansPerGame':sum(r['loans'] for r in rs)/len(rs),
   'negativePerPlayer':sum(r['negativeFinishes'] for r in rs)/(4*len(rs)),
   'allInHandRate':sum(r['allInHands'] for r in rs)/hands}
 summary[mode]={'gamesPerVariant':n,'orbits':orbits,'checkpoints':checkpoints,'health':health}
(ROOT/'catchup.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
