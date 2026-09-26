"""Aggregate health-check.ts shards; stdlib only. Counts ties as wins and splits win credit."""
import collections, gzip, json, math, pathlib, statistics, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'docs/health-2026-09-25')
groups = collections.defaultdict(list)
for path in sorted([*root.glob('*.jsonl'), *root.glob('*.jsonl.gz')]):
    content = gzip.open(path, 'rt').read() if path.suffix == '.gz' else path.read_text()
    for line in content.splitlines():
        r=json.loads(line)
        for orbit in r['orbits']:
            orbit['lastAttemptedHand']=orbit.get('lastAttemptedHand',orbit['hands'])
            orbit['hands']=sum(h['game']==orbit['game'] for h in r['hands'])
        groups[(r['mode'],r['samples'],r['chips'])].append(r)

def mean(xs): return statistics.mean(xs) if xs else 0

def dist(xs):
    xs=sorted(xs)
    def quantile(p):
        if not xs: return 0
        t=(len(xs)-1)*p; a=int(t); b=min(a+1,len(xs)-1)
        return xs[a]*(1-(t-a))+xs[b]*(t-a)
    return dict(n=len(xs),mean=mean(xs),min=min(xs,default=0),p10=quantile(.1),p25=quantile(.25),median=quantile(.5),p75=quantile(.75),p90=quantile(.9),p95=quantile(.95),max=max(xs,default=0))

def counts(records,key): return dict(collections.Counter(r[key] for r in records))
def totalmaps(rs,key):
    out=collections.Counter()
    for r in rs: out.update(r.get(key,{}))
    return dict(out)

def ratio_ci(pairs):
    # Clustered by independently seeded complete tournament/game.
    n=len(pairs); den=sum(y for x,y in pairs)
    if not den: return {'rate':0,'ci95':[0,0],'denominator':0}
    rate=sum(x for x,y in pairs)/den
    se=math.sqrt(sum((x-rate*y)**2 for x,y in pairs)*n/max(1,n-1))/den
    return {'rate':rate,'ci95':[max(0,rate-1.96*se),min(1,rate+1.96*se)],'denominator':den}

def report(rs):
    rs.sort(key=lambda r:int(r['seed'].rsplit('-',1)[1]))
    assert len({r['seed'] for r in rs})==len(rs), 'Duplicate seeds'
    hs=[h for r in rs for h in r['hands']]
    os=[o for r in rs for o in r['orbits']]
    ps=[p for h in hs for p in h['players']]
    show=[p for h in hs if h['reason']=='showdown' for p in h['players'] if not p['folded']]
    events=totalmaps(rs,'eventCounts')
    result={'runs':len(rs),'steps':sum(r['steps'] for r in rs),'hands':len(hs),'playerHands':len(ps),'showdownHands':sum(h['reason']=='showdown' for h in hs),'showdownPlayers':len(show),'violations':[(r['seed'],r['violations']) for r in rs if r['violations']], 'events':events,'draws':totalmaps(rs,'draws'),'riichiStreets':totalmaps(rs,'riichiStreets'),'allInReasons':totalmaps(rs,'allInReasons'),'actions':totalmaps(hs,'actions'),'pot':dist([h['pot'] for h in hs]),'allInHandRate':mean([h['allIn']>0 for h in hs]),'endingStreets':counts(hs,'street'),'finalScores':dist([s for r in rs for s in r['scores'].values()]),'scoreSpread':dist([max(r['scores'].values())-min(r['scores'].values()) for r in rs]),'winnerMargin':dist([sorted(r['scores'].values())[-1]-sorted(r['scores'].values())[-2] for r in rs]),'negativeScores':sum(s<0 for r in rs for s in r['scores'].values()),'tiedFinals':sum(list(r['scores'].values()).count(max(r['scores'].values()))>1 for r in rs)}
    result['rankings']={rank:{'appearances':len(pp),'appearanceRate':len(pp)/max(1,len(show)),'wins':sum(p['won'] for p in pp),'winRate':mean([p['won'] for p in pp]),'winCredit':sum(p['share'] for p in pp),'net':dist([p['net'] for p in pp])} for rank in sorted({p['rank'] for p in show}) for pp in [[p for p in show if p['rank']==rank]]}
    result['eliminations']={'events':sum(len(o['eliminated']) for o in os),'uniquePlayerTournaments':sum(len(set(p for o in r['orbits'] for p in o['eliminated'])) for r in rs),'tournamentsAffected':sum(any(o['eliminated'] for o in r['orbits']) for r in rs),'perTournamentDistribution':dict(collections.Counter(sum(len(o['eliminated']) for o in r['orbits']) for r in rs)), 'byOrbit':{str(i):{'orbits':len(oo),'actual':sum(len(o['eliminated']) for o in oo),'belowAnteAtEnd':sum(len(o['belowAnte']) for o in oo),'shortOrbits':sum(o['hands']<4 for o in oo),'hands':dist([o['hands'] for o in oo]),'scores':dist([v for o in oo for v in o['scores'].values()])} for i in sorted({o['game'] for o in os}) for oo in [[o for o in os if o['game']==i]]},'clusterRate':ratio_ci([(sum(len(o['eliminated']) for o in r['orbits']),4*len(r['orbits'])) for r in rs])}
    result['seatWins']={p:sum((1/sum(v==max(r['scores'].values()) for v in r['scores'].values())) if r['scores'][p]==max(r['scores'].values()) else 0 for r in rs)/len(rs) for p in ['p1','p2','p3','p4']}
    result['loans']={'total':events.get('loan-taken',0),'gamesWithLoans':sum(r['eventCounts'].get('loan-taken',0)>0 for r in rs),'playersWithLoans':sum(x>0 for o in os for x in o['loans']),'playerLoanDistribution':dict(collections.Counter(x for o in os for x in o['loans'])),'loansPerGame':dist([r['eventCounts'].get('loan-taken',0) for r in rs])}
    result['riichi']={'declarations':events.get('riichi-declared',0),'wins':sum(h['riichiWon'] for h in hs),'withdrawals':events.get('riichi-withdrawn',0),'minted':sum(r['minted'] for r in rs),'spent':events.get('riichi-stick-spent',0),'remaining':dist([sum(o['sticks']) for o in os]),'conversion':ratio_ci([(sum(h['riichiWon'] for h in r['hands']),r['eventCounts'].get('riichi-declared',0)) for r in rs])}
    result['jokers']={str(j):{'appearances':len(pp),'wins':sum(p['won'] for p in pp),'winRate':mean([p['won'] for p in pp]),'meanRank':mean([p['strength'] for p in pp]),'rankGain':mean([p['jokerRankGain'] for p in pp]),'selected':sum(p['selectedJokers']>0 for p in pp),'decisive':sum(p['jokerDecisive'] for p in pp),'rankImproved':sum(p['jokerRankGain']>0 for p in pp)} for j in sorted({p['jokers'] for p in show}) for pp in [[p for p in show if p['jokers']==j]]}
    result['jokerWinRateCI']={name:ratio_ci([(sum(p['won'] for h in r['hands'] if h['reason']=='showdown' for p in h['players'] if not p['folded'] and test(p)),sum(1 for h in r['hands'] if h['reason']=='showdown' for p in h['players'] if not p['folded'] and test(p))) for r in rs]) for name,test in [('with',lambda p:p['jokers']>0),('without',lambda p:p['jokers']==0)]}
    result['jokerColors']={c:{'appearances':len(pp),'wins':sum(p['won'] for p in pp),'winRate':mean([p['won'] for p in pp]),'selected':sum(c in p.get('selectedJokerColors',[]) for p in pp)} for c in ['green','blue','red','black'] for pp in [[p for p in show if c in p.get('jokerColors',[])]]}
    result['stickActions']=totalmaps(rs,'stickActions')
    result['lotusMoves']=totalmaps(rs,'lotusMoves')
    result['lotus']={'openingPlayerHands':sum(p['openingFlowers']>0 for p in ps),'acquiredPlayerHands':sum(p['acquiredFlowers']>0 for p in ps),'finalSinglePlayerHands':sum(p['flowers']==1 for p in ps),'finalTwinPlayerHands':sum(p['flowers']==2 for p in ps),'singleFolded':sum(p['flowers']==1 and p['folded'] for p in ps),'singleShowdowns':sum(p['flowers']==1 for p in show),'singleShowdownWins':sum(p['flowers']==1 and p['won'] for p in show),'twinShowdowns':sum(p['flowers']==2 for p in show),'twinShowdownWins':sum(p['flowers']==2 and p['won'] for p in show),'twinFolded':sum(p['flowers']==2 and p['folded'] for p in ps),'gamesWithTwinShowdown':sum(any(h['reason']=='showdown' and any(p['flowers']==2 and not p['folded'] for p in h['players']) for h in r['hands']) for r in rs),'bonusHands':sum(h['lotusBonus']>0 for h in hs),'bonusChips':sum(h['lotusBonus'] for h in hs),'bluffBetDecisions':sum(r['lotusAttempts'] for r in rs),'openingLotusStillHoldingAny':sum(p['openingFlowers']>0 and p['flowers']>0 for p in ps)}
    result['comeback']={}
    for point in [1,2,3]:
        pairs=[]
        for r in rs:
            if len(r['orbits'])<=point: continue
            cumulative={p:sum(o['scores'][p] for o in r['orbits'][:point]) for p in r['scores']}
            winners={p for p,v in r['scores'].items() if v==max(r['scores'].values())}
            leaders={p for p,v in cumulative.items() if v==max(cumulative.values())}
            trailers={p for p,v in cumulative.items() if v==min(cumulative.values())}
            pairs.append((bool(winners&leaders),bool(winners&trailers)))
        if pairs: result['comeback'][str(point)]={'leaderWins':mean([p[0] for p in pairs]),'trailerWins':mean([p[1] for p in pairs]),'n':len(pairs)}
    # Accounting identities independently rechecked on saved records.
    assert sum(x['appearances'] for x in result['rankings'].values())==len(show)
    assert abs(sum(x['winCredit'] for x in result['rankings'].values())-result['showdownHands'])<1e-7
    for r in rs:
        for h in r['hands']: assert abs(sum(p['net'] for p in h['players']))<1e-7, (r['seed'], h['game'], h['number'], 'hand net accounting')
        for p in r['scores']: assert abs(r['scores'][p]-sum(o['scores'][p] for o in r['orbits']))<1e-7
        initial=sum(4*(r['chips'] if o['game']==1 else 100+100*o['game']) for o in r['orbits'])
        assert abs(sum(r['scores'].values())-(initial-50*r['eventCounts'].get('loan-taken',0)))<1e-7
    return result
summary={f'{mode}-s{samples}-c{chips}':report(rs) for (mode,samples,chips),rs in groups.items()}
# Paired game-level differences preserve common-seed comparisons.
summary['paired']={}
for mode in ['basic','riichi']:
    base={r['seed']:r for r in groups.get((mode,4,200),[])}
    for label,key in [('samples12',(mode,12,200)),('samples24',(mode,24,200)),('chips400',(mode,4,400)),('default-chips400',(mode,24,400))]:
        if label=='default-chips400': base={r['seed']:r for r in groups.get((mode,24,200),[])}
        pairs=[(base[r['seed']],r) for r in groups.get(key,[]) if r['seed'] in base]
        if not pairs: continue
        if mode=='basic' and label.endswith('chips400'):
            pairs=[(dict(a,hands=[h for h in a['hands'] if h['game']==1],orbits=[a['orbits'][0]],scores=a['orbits'][0]['scores']),b) for a,b in pairs]
        metrics={'loans':lambda r:r['eventCounts'].get('loan-taken',0),'allInRate':lambda r:mean([h['allIn']>0 for h in r['hands']]),'spread':lambda r:max(r['scores'].values())-min(r['scores'].values()),'negativeScoreRate':lambda r:mean([v<0 for v in r['scores'].values()]),'eliminationRate':lambda r:sum(len(o['eliminated']) for o in r['orbits'])/(4*len(r['orbits'])),'firstOrbitBelowAnte':lambda r:len(r['orbits'][0]['belowAnte'])/4,'firstOrbitEliminated':lambda r:len(r['orbits'][0]['eliminated'])/4,'riichiPerHand':lambda r:r['eventCounts'].get('riichi-declared',0)/len(r['hands'])}
        summary['paired'][f'{mode}-{label}']={'n':len(pairs),'metrics':{}}
        for name,fn in metrics.items():
            deltas=[fn(b)-fn(a) for a,b in pairs]; delta=mean(deltas); se=statistics.stdev(deltas)/math.sqrt(len(deltas)) if len(deltas)>1 else 0
            summary['paired'][f'{mode}-{label}']['metrics'][name]={'baseline':mean([fn(a) for a,b in pairs]),'variant':mean([fn(b) for a,b in pairs]),'difference':delta,'ci95':[delta-1.96*se,delta+1.96*se]}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k: {'runs':v.get('runs'),'hands':v.get('hands'),'violations':len(v.get('violations',[]))} for k,v in summary.items() if k!='paired'},indent=2))
