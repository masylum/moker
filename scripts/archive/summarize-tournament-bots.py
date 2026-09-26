"""Tournament-cluster summaries; no treating players/rotated seats as independent."""
import json, math, statistics, random
from pathlib import Path
root=Path('docs/tournament-bots-2026-09-25')
def mean(xs): return statistics.mean(xs) if xs else 0

def ci(xs,bounded=True):
 m=mean(xs)
 if len(xs)<2:return {'mean':m,'n':len(xs),'low':None,'high':None}
 if bounded and max(xs)==min(xs):
  n=len(xs);z=1.96;center=(m+z*z/(2*n))/(1+z*z/n);radius=z*math.sqrt(m*(1-m)/n+z*z/(4*n*n))/(1+z*z/n)
  return {'mean':m,'n':n,'low':max(0,center-radius),'high':min(1,center+radius)}
 margin=1.96*statistics.stdev(xs)/math.sqrt(len(xs))
 return {'mean':m,'n':len(xs),'low':max(0,m-margin) if bounded else m-margin,'high':min(1,m+margin) if bounded else m+margin}

def recover(rows):
 result=[]
 for orbit in range(1,4):
  behind=[]; last=[]; finished=[]
  for row in rows:
   checkpoint=next((o for o in row['orbits'] if o['orbit']==orbit),None)
   # Retain terminal scores after early endings; fixed tournament denominator.
   scores=checkpoint['endScores'] if checkpoint else row['scores']
   winners=[p for p,s in row['scores'].items() if s==max(row['scores'].values())]
   high,low=max(scores.values()),min(scores.values())
   behind.append(sum(scores[p]<high for p in winners)/len(winners))
   last.append(sum(scores[p]==low and low<high for p in winners)/len(winners))
   finished.append(not any(o['orbit']>orbit for o in row['orbits']))
  result.append({'afterOrbit':orbit,'behindChampion':ci(behind),'lastChampion':ci(last),'ended':mean(finished)})
 return result

def conditional(rows):
 out=[]
 for orbit in [2,3,4]:
  leader=[];trailer=[];gain=[];ever=[];eligible=0
  for row in rows:
   checkpoint=next((o for o in row['orbits'] if o['orbit']==orbit),None)
   if not checkpoint:continue
   eligible+=1
   # Basic has no loans; the mode is passed in via the cohort by the caller.
   live=[p for p,c in checkpoint['startChips'].items() if row.get('_mode')=='riichi' or c>=5]
   scores=checkpoint['startScores']; winners=[p for p,v in row['scores'].items() if v==max(row['scores'].values())]
   top=[p for p in live if scores[p]==max(scores[q] for q in live)]
   low=[p for p in live if scores[p]==min(scores[q] for q in live)]
   if len(top)==1:leader.append((top[0] in winners)/len(winners))
   if len(low)==1 and scores[low[0]]<max(scores[q] for q in live):
    p=low[0];trailer.append((p in winners)/len(winners))
    changes={q:checkpoint['endScores'][q]-scores[q] for q in scores}
    best=max(changes.values());gain.append((changes[p]==best)/sum(v==best for v in changes.values()))
    ever.append(any(h[p]==max(h.values()) for h in checkpoint['handScores']))
  out.append({'enteringOrbit':orbit,'tournamentsReaching':eligible,'leaderFinalWin':ci(leader),'liveTrailerFinalWin':ci(trailer),'liveTrailerBestOrbitGain':ci(gain),'liveTrailerEverLeads':ci(ever)})
 return out

def summary(rows):
 sums=lambda k:sum(r.get(k,0) for r in rows)
 hands=sums('hands')
 for r in rows:r['earlyAllInHands']=r.get('allInInitiators',{}).get('ante',0)+len({t['hand'] for t in r['allInTriggers'] if t['street']<4})
 return {'games':len(rows),'hands':hands,'street4':sums('street4')/hands,'allInHands':sums('allInHands')/hands,'earlyAllInHands':sums('earlyAllInHands')/hands,'drawsPerHand':sums('draws')/hands,'betsPerHand':sums('bets')/hands,'blankExchangesPerHand':sums('blanks')/hands,'sticksPerHand':sums('sticks')/hands,'riichiesPerHand':sums('riichies')/hands,'scoreQuartiles':statistics.quantiles([v for r in rows for v in r['scores'].values()],n=4),'medianWinnerLastGap':statistics.median(max(r['scores'].values())-min(r['scores'].values()) for r in rows),'eliminations':sums('eliminated')/(4*len(rows)),'loansPerGame':sums('loans')/len(rows),'negativeFinishes':sums('negativeFinishes')/(4*len(rows)),'uncontested':sums('uncontested')/hands,'allInInitiators':{k:sum(r.get('allInInitiators',{}).get(k,0) for r in rows) for k in ['bet','call','ante']},'catchup':recover(rows),'conditionalCatchup':conditional(rows)}

def matchup(rows):
 clusters={c:[r for r in rows if r['cluster']==c] for c in {r['cluster'] for r in rows}}
 assert all(len(rs)==6 for rs in clusters.values()),'Incomplete seat rotation'
 return {'games':len(rows),'seeds':len(clusters),'winCredit':ci([mean([r['win'] for r in rs]) for rs in clusters.values()]),'scoreAdvantage':ci([mean([r['delta'] for r in rs]) for rs in clusters.values()],bounded=False),'health':summary(rows)}

def main():
 result={}
 for mode in ['basic','riichi']:
  for cohort in ['holdout','health-old','health-new']:
   files=sorted((root/'results').glob(f'{cohort}-{mode}-*.json'))
   if not files:continue
   docs=[json.loads(f.read_text()) for f in files]
   rows=[dict(r,_mode=mode) for d in docs for r in d['rows']]
   assert len({r['index'] for r in rows})==len(rows),'Duplicate indices'
   assert len({json.dumps(d['hashes'],sort_keys=True) for d in docs})==1,'Source changed within cohort'
   result[f'{cohort}-{mode}']=matchup(rows) if cohort=='holdout' else summary(rows)
 for mode in ['basic','riichi']:
  cohorts=[]
  for gen in ['old','new']:
   files=sorted((root/'results').glob(f'health-{gen}-{mode}-*.json'))
   cohorts.append({r['index']:r for f in files for r in json.loads(f.read_text())['rows']})
  old,new=cohorts
  if not old or old.keys()!=new.keys():continue
  for cohort in [old,new]:
   for row in cohort.values():
    for orbit in [1,2,3]:
     checkpoint=next((o for o in row['orbits'] if o['orbit']==orbit),None)
     scores=checkpoint['endScores'] if checkpoint else row['scores']
     winners=[p for p,s in row['scores'].items() if s==max(row['scores'].values())]
     row[f'behindAfter{orbit}']=sum(scores[p]<max(scores.values()) for p in winners)/len(winners)
  indices=sorted(old);rng=random.Random(20260925)
  keys={'street4':('street4','hands'),'allInHands':('allInHands','hands'),'drawsPerHand':('draws','hands'),'eliminations':('eliminated',4),'loansPerGame':('loans',1)}
  keys.update({f'catchupOrbit{o}':(f'behindAfter{o}',1) for o in [1,2,3]})
  def metric(cohort,sample,num,den):
   return sum(cohort[i][num] for i in sample)/(sum(cohort[i][den] for i in sample) if isinstance(den,str) else len(sample)*den)
  differences={key:[] for key in keys}
  for _ in range(5000):
   sample=rng.choices(indices,k=len(indices))
   for key,(num,den) in keys.items():differences[key].append(metric(new,sample,num,den)-metric(old,sample,num,den))
  result[f'pairedHealth-{mode}']={key:{'change':metric(new,indices,*keys[key])-metric(old,indices,*keys[key]),'low':sorted(values)[124],'high':sorted(values)[4874]} for key,values in differences.items()}
 (root/'summary.json').write_text(json.dumps(result,indent=2))
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
