"""Aggregate current simulator health records. No game simulation occurs here."""
import collections, json, math, statistics, sys
from pathlib import Path
root = Path(sys.argv[1] if len(sys.argv)>1 else 'docs/health-v6-2026-09-25')
records = json.loads((root/'derived.json').read_text())
groups = collections.defaultdict(list)
for r in records: groups[r['cohort']].append(r)
def avg(xs): return statistics.mean(xs) if xs else None
def dist(xs):
 xs=sorted(xs)
 if not xs:return {'n':0}
 def q(p):
  x=p*(len(xs)-1);i=int(x);return xs[i]+(xs[min(i+1,len(xs)-1)]-xs[i])*(x-i)
 return {'n':len(xs),'mean':avg(xs),'min':xs[0],'p10':q(.1),'median':q(.5),'p90':q(.9),'max':xs[-1]}
def rate(pairs):
 pairs=list(pairs);den=sum(y for x,y in pairs);n=len(pairs)
 if not den:return {'n':0,'value':None,'ci95':None}
 value=sum(x for x,y in pairs)/den
 se=math.sqrt(sum((x-value*y)**2 for x,y in pairs)*n/max(1,n-1))/den
 ci=[max(0,value-1.96*se),min(1,value+1.96*se)]
 eligible=sum(y>0 for x,y in pairs)
 if value==0:ci=[0,1-.025**(1/eligible)]
 if value==1:ci=[.025**(1/eligible),1]
 return {'n':den,'credit':sum(x for x,y in pairs),'value':value,'ci95':ci,'independentRuns':eligible}
def leaders(s):return {p for p,x in s.items() if abs(x-max(s.values()))<1e-7}
def credit(p,ws):return float(p in ws)/len(ws)
def sum_maps(rows,key):
 c=collections.Counter()
 for r in rows:c.update(r.get(key,{}))
 return dict(c)
def catchup(rs,reset=False):
 count=rs[0]['config']['tournamentGames'] if reset else rs[0]['config']['orbits']
 output=[]
 for checkpoint in range(1,count):
  obs=[]
  for r in rs:
   scores={p:0 for p in r['scores']}
   if reset:
    for g in r['settlements'][:checkpoint]:
     for p,v in g['scores'].items():scores[p]+=v
    live=list(scores);finished=False
   else:
    snaps=[s for s in r['snapshots'] if s['orbit']<=checkpoint]
    snap=snaps[-1];scores=snap['scores'];finished=max(s['orbit'] for s in r['snapshots'])<=checkpoint
    if finished:scores=r['scores']
    live=[p for p in scores if p not in snap['eliminated'] and (snap['chips'][p]>=5 or (r['mode']=='riichi' and (snap['chips'][p]-scores[p])/250<.5))]
   final=leaders(r['scores']);top=leaders(scores);bottom={p for p,v in scores.items() if v==min(scores.values()) and p not in top}
   if reset:
    next_scores=r['settlements'][checkpoint]['scores']
   else:
    next_snaps=[s for s in r['snapshots'] if s['orbit']==checkpoint+1]
    next_scores={p:next_snaps[-1]['scores'][p]-scores[p] for p in scores} if next_snaps else None
   next_winners=leaders(next_scores) if next_scores is not None else None
   livebottom={p for p in live if scores[p]==min(scores[q] for q in live)} if live else set()
   if livebottom==set(live):livebottom=set()
   locked=False
   if not reset and r['mode']=='basic' and len(top)==1:
    p=next(iter(top));reserve=(count-checkpoint)*4*5
    locked=scores[p]-reserve>sum(scores.values())-scores[p]+reserve
   obs.append({'leading':sum(credit(p,final) for p in top),'last':sum(credit(p,final) for p in bottom),'nextLeader':sum(credit(p,next_winners) for p in top) if next_winners else None,'nextLast':sum(credit(p,next_winners) for p in bottom) if next_winners else None,'liveLast':sum(credit(p,final) for p in livebottom) if livebottom else None,'uniqueLeader':credit(next(iter(top)),final) if len(top)==1 else None,'uniqueLast':credit(next(iter(bottom)),final) if len(bottom)==1 else None,'finished':finished,'locked':locked,'ranks':[(1+sum(v>scores[p]+1e-7 for v in scores.values()),credit(p,final)) for p in scores]})
  output.append({'after':checkpoint,'championWasLeading':rate((o['leading'],1) for o in obs),'championWasLast':rate((o['last'],1) for o in obs),'liveLastChampionCredit':rate((o['liveLast'],1) for o in obs if o['liveLast'] is not None),'uniqueLeaderConverts':rate((o['uniqueLeader'],1) for o in obs if o['uniqueLeader'] is not None),'uniqueLastConverts':rate((o['uniqueLast'],1) for o in obs if o['uniqueLast'] is not None),'alreadyFinished':sum(o['finished'] for o in obs),'basicFoldLocked':sum(o['locked'] for o in obs),'byRank':{k:rate((sum(v for rank,v in o['ranks'] if rank==k),sum(rank==k for rank,v in o['ranks'])) for o in obs) for k in [1,2,3,4]}})
  output[-1]['leaderWinsNext']=rate((o['nextLeader'],1) for o in obs if o['nextLeader'] is not None)
  output[-1]['lastWinsNext']=rate((o['nextLast'],1) for o in obs if o['nextLast'] is not None)
 return output

def summarize(rs):
 rs.sort(key=lambda r:r['index']);assert len({r['index'] for r in rs})==len(rs)
 hs=[h for r in rs for h in r['hands']];ps=[p for h in hs for p in h['players']];show=[p for p in ps if p['show']]
 ev=sum_maps(rs,'eventCounts');settles=[g for r in rs for g in r['settlements']];scores=[v for r in rs for v in r['scores'].values()]
 row={'runs':len(rs),'games':len(settles),'hands':len(hs),'playerHands':len(ps),'showdownParticipants':len(show),'issues':[(r['seed'],r['issues']) for r in rs if r['issues']],'config':rs[0]['config'],'events':ev,'draws':sum_maps(rs,'draws'),'stickActions':sum_maps(rs,'stickActions'),'lotusMoves':sum_maps(rs,'lotusMoves'),'allInRate':rate((sum(bool(h['allIn']) for h in r['hands']),len(r['hands'])) for r in rs),'street4Rate':rate((sum(h['street']==4 for h in r['hands']),len(r['hands'])) for r in rs),'showdownRate':rate((sum(h['reason']=='showdown' for h in r['hands']),len(r['hands'])) for r in rs),'eliminationRate':rate((sum(p['eliminated'] for g in r['settlements'] for p in g['players']),4*len(r['settlements'])) for r in rs),'pot':dist([h['pot'] for h in hs]),'scores':dist(scores),'negativePlayers':sum(x<0 for x in scores),'scoreSpread':dist([max(r['scores'].values())-min(r['scores'].values()) for r in rs]),'winnerMargin':dist([sorted(r['scores'].values())[-1]-sorted(r['scores'].values())[-2] for r in rs]),'belowAnteAtEnd':sum(p['chips']<g['gameNumber']*5 for g in settles for p in g['players']),'seatCredit':{p:sum(credit(p,leaders(r['scores'])) for r in rs) for p in rs[0]['scores']},'loansPerRun':dist([r['eventCounts'].get('loan-taken',0) for r in rs]),'loanGames':sum(any(p['loans'] for p in g['players']) for g in settles),'loanRuns':sum(r['eventCounts'].get('loan-taken',0)>0 for r in rs),'actions':dict(collections.Counter(a['type'] for h in hs for a in h['actions']))}
 row['startingHands']={}
 for kind in sorted({p['openingKind'] for p in ps}):
  bucket=[p for p in ps if p['openingKind']==kind];sh=[p for p in bucket if p['show']]
  first=[p for r in rs for h in r['hands'] if h['game']==1 and h['number']==1 for p in h['players'] if p['openingKind']==kind]
  row['startingHands'][kind]={'n':len(bucket),'frequency':len(bucket)/len(ps),'improved':sum(p['improved'] for p in bucket),'showdowns':len(sh),'winCredit':sum(p['winCredit'] for p in bucket),'wins':sum(p['won'] for p in bucket),'handWinRate':rate((sum(p['winCredit'] for h in r['hands'] for p in h['players'] if p['openingKind']==kind),sum(p['openingKind']==kind for h in r['hands'] for p in h['players'])) for r in rs),'showdownWinCredit':sum(p['winCredit'] for p in sh),'net':dist([p['net'] for p in bucket]),'firstDealPlayers':len(first),'firstDealChampionCredit':sum(p['tournamentWinCredit'] for p in first),'flowers':sum(p['openingFlowers']>0 for p in bucket)}
 row['showdownHands']={}
 for kind in sorted({p['finalKind'] for p in show}):
  bucket=[p for p in show if p['finalKind']==kind]
  row['showdownHands'][kind]={'n':len(bucket),'frequency':len(bucket)/len(show),'wins':sum(p['won'] for p in bucket),'winCredit':sum(p['winCredit'] for p in bucket),'winRate':rate((sum(p['winCredit'] for h in r['hands'] for p in h['players'] if p['show'] and p['finalKind']==kind),sum(p['show'] and p['finalKind']==kind for h in r['hands'] for p in h['players'])) for r in rs),'improvedFromDeal':sum(p['improved'] for p in bucket),'net':dist([p['net'] for p in bucket])}
 row['transitions']=dict(collections.Counter(f"{p['openingKind']} -> {p['finalKind']}" for p in show))
 row['jokers']={}
 for name,predicate in [('none',lambda p:p['jokers']==0),('any',lambda p:p['jokers']>0)]+[(c,lambda p,c=c:c in p['jokerColors']) for c in ['green','blue','red','black']]:
  bucket=[p for p in show if predicate(p)]
  row['jokers'][name]={'n':len(bucket),'winCredit':sum(p['winCredit'] for p in bucket),'wins':sum(p['won'] for p in bucket),'selected':sum(bool(p['selectedJokerColors']) if name in ['none','any'] else name in p['selectedJokerColors'] for p in bucket),'meanRankGain':avg([p['jokerRankGain'] for p in bucket]),'rankImproved':sum(p['jokerRankGain']>0 for p in bucket),'decisive':sum(p['jokerDecisive'] for p in bucket),'winCreditGain':sum(p['jokerWinCreditGain'] for p in bucket)}
 row['lotus']={'openingSingles':sum(p['openingFlowers']==1 for p in ps),'openingTwins':sum(p['openingFlowers']==2 for p in ps),'finalSingles':sum(p['flowers']==1 for p in ps),'finalTwins':sum(p['flowers']==2 for p in ps),'singleShowdowns':sum(p['flowers']==1 for p in show),'twinShowdowns':sum(p['flowers']==2 for p in show),'twinFolds':sum(p['flowers']==2 and p['folded'] for p in ps),'bonusHands':sum(h['lotusBonus']>0 for h in hs),'bonusChips':sum(h['lotusBonus'] for h in hs)}
 row['blanks']={'openingPlayerHands':sum(p['openingBlanks']>0 for p in ps),'exchanges':ev.get('blank-exchanged',0)}
 row['riichi']={'declarations':ev.get('riichi-declared',0),'soleWins':sum(h['riichi']['won'] for h in hs),'withdrawals':ev.get('riichi-withdrawn',0),'sticksMinted':sum(r['minted'] for r in rs),'sticksSpent':ev.get('riichi-stick-spent',0),'remainingPerGame':dist([sum(p['riichiSticks'] for p in g['players']) for g in settles])}
 first=[]
 for r in rs:
  seen=set()
  for x in r['allIns']:
   key=(x['game'],x['hand'])
   if key not in seen:first.append(x);seen.add(key)
 row['allInInitiators']={'n':len(first),'reasons':dict(collections.Counter(x['reason'] for x in first)),'streets':dict(collections.Counter(x['street'] for x in first)),'hands':dict(collections.Counter(x['rank'] for x in first)),'early':sum(x['street']<4 for x in first),'beforeFinalHand':sum(x['hand']<rs[0]['config']['orbits']*4 for x in first),'voluntaryEarly':sum(x['reason']!='opening-charge' and x['street']<4 and x['hand']<rs[0]['config']['orbits']*4 for x in first)}
 row['perGame']=[]
 for game in range(1,rs[0]['config']['tournamentGames']+1):
  gs=[g for g in settles if g['gameNumber']==game];hands=[h for h in hs if h['game']==game]
  minted=sum(h['riichi']['sticksAwarded'] for h in hands);remaining=sum(p['riichiSticks'] for g in gs for p in g['players'])
  row['perGame'].append({'game':game,'n':len(gs),'hands':len(hands),'loans':sum(p['loans'] for g in gs for p in g['players']),'borrowers':sum(p['loans']>0 for g in gs for p in g['players']),'eliminated':sum(p['eliminated'] for g in gs for p in g['players']),'riichiDeclarations':sum(bool(a.get('riichi')) for h in hands for a in h['actions']),'riichiSoleWins':sum(h['riichi']['won'] for h in hands),'sticksMinted':minted,'sticksRemaining':remaining,'sticksSpent':(12*len(gs) if rs[0]['mode']=='riichi' else 0)+minted-remaining,'scores':dist([v for g in gs for v in g['scores'].values()])})
 row['catchup']=catchup(rs,rs[0]['config']['tournamentGames']>1)
 return row
summary={name:summarize(rs) for name,rs in sorted(groups.items())}
paired={}
for mode in ['basic','riichi']:
 if mode not in groups or mode+'-400' not in groups:continue
 low={r['index']:r for r in groups[mode]};pairs=[(low[r['index']],r) for r in groups[mode+'-400']]
 metrics={'eliminationsPerPlayer':lambda r:sum(p['eliminated'] for g in r['settlements'] for p in g['players'])/4,'allInHandRate':lambda r:sum(bool(h['allIn']) for h in r['hands'])/len(r['hands']),'street4Rate':lambda r:sum(h['street']==4 for h in r['hands'])/len(r['hands']),'loansPerGame':lambda r:r['eventCounts'].get('loan-taken',0),'winnerGap':lambda r:max(r['scores'].values())-min(r['scores'].values())}
 paired[mode]={}
 for name,fn in metrics.items():
  diffs=[fn(b)-fn(a) for a,b in pairs];delta=avg(diffs);se=statistics.stdev(diffs)/math.sqrt(len(diffs)) if len(diffs)>1 else 0
  paired[mode][name]={'n':len(pairs),'before':avg([fn(a) for a,b in pairs]),'after':avg([fn(b) for a,b in pairs]),'difference':delta,'ci95':[delta-1.96*se,delta+1.96*se]}
(root/'summary.json').write_text(json.dumps({'cohorts':summary,'pairedChips':paired},indent=2)+'\n')
print(json.dumps({name:{k:s[k] for k in ['runs','hands','allInRate','street4Rate','eliminationRate']} for name,s in summary.items()},indent=2))
