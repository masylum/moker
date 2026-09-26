"""Independent face-count oracle for saved calibration holdings and pot winners."""
from collections import Counter
import itertools
import json
from pathlib import Path
import sys

root=Path(sys.argv[1])
suits={'bamboo':'green','characters':'red','dots':'blue'}
faces=[(s,n) for s in suits for n in range(1,10)]+[('dragon',c) for c in ['red','green','white']]+[('wind',w) for w in ['east','south','west','north']]
color=lambda f:suits[f[0]] if f[0] in suits else ('black' if f[0]=='wind' else {'red':'red','green':'green','white':'blue'}[f[1]])
value=lambda f:f[1] if f[0] in suits else (11 if f[0]=='wind' else 10)
dragon=[('dragon',c) for c in ['red','green','white']]
wind=[('wind',w) for w in ['east','south','west','north']]

def evaluate(cards,order):
    natural=Counter((c['suit'],c['rank']) if c['kind']=='numbered' else (c['kind'],c[c['kind']]) for c in cards if c['kind'] in ['numbered','dragon','wind'])
    jokers=Counter(c['color'] for c in cards if c['kind']=='joker')
    def matches(targets,available=natural):
        deficits=Counter()
        for f,n in Counter(targets).items():deficits[color(f)]+=max(0,n-available[f])
        return all(n<=jokers[c] for c,n in deficits.items())
    found={}
    def add(kind,tie):
        if kind in order:found[kind]=max(found.get(kind,[]),tie)
    pairs=[f for f in faces if natural[f]>=2]
    for f in pairs:add('eye',[value(f)]*2)
    for a,b in itertools.combinations(pairs,2):add('two-eyes',sorted([value(a)]*2+[value(b)]*2,reverse=True))
    for f in faces:
        if matches([f]*3):add('pung',[value(f)]*3)
        if matches([f]*4):add('kong',[value(f)]*4)
    for length,kind in [(3,'chow'),(5,'long-chow')]:
        for s in suits:
            for start in range(1,11-length):
                if matches([(s,n) for n in range(start,start+length)]):add(kind,list(range(start+length-1,start-1,-1)))
    if matches(dragon):add('three-dragons',[10]*3)
    for target in itertools.combinations(wind,3):
        if matches(target):add('three-winds',[11]*3)
    if matches(wind):add('four-winds',[11]*4)
    for pair in pairs:
        remaining=natural.copy();remaining[pair]-=2
        for s in suits:
            for start in range(1,8):
                if matches([(s,n) for n in range(start,start+3)],remaining):add('chow-eye',list(range(start+2,start-1,-1))+[value(pair)]*2)
        for f in faces:
            if f!=pair and matches([f]*3,remaining):add('pung-eye',[value(f)]*3+[value(pair)]*2)
        if matches(dragon,remaining):add('three-dragons-eye',[10]*3+[value(pair)]*2)
    best=max(found,key=order.index) if found else 'high-card'
    tie=found[best] if found else [max((value(f) for f,n in natural.items() if n),default=0)]
    if not natural and not found:tie=[]
    return set(found),best,(order.index(best)+1,tuple(tie))

output=[]
for path in sorted(root.glob('*.sample-*.json')):
    stem=path.name.split('.jsonl.sample-')[0]
    manifest=json.loads((root/(stem+'.jsonl.manifest.json')).read_text());order=manifest['order']
    raw=json.loads(path.read_text());records=[json.loads(l) for l in (root/(stem+'.jsonl')).read_text().splitlines()]
    record=next(r for r in records if r['seed']==raw['seed'])
    holdings=0;pots=0;score_checks=0
    assert len(raw['state']['handResults'])==len(record['handDiagnostics'])
    for h,d in zip(raw['state']['handResults'],record['handDiagnostics']):
        active=[p for p in h['players'] if p['openingCards']]
        for field in ['openingCards','cards']:
            ids=[c['id'] for p in active for c in p[field]]
            assert len(ids)==len(set(ids)),(path,h['handNumber'],'duplicate physical card',field)
            assert all(len(p[field])==7 for p in active),(path,h['handNumber'],'hand size',field)
        scores={};lotuses={}
        for p,dp in zip(h['players'],d['players']):
            if not p['openingCards']:continue
            for label in ['openingCards','cards']:
                contains,best,score=evaluate(p[label],order);holdings+=1
                if label=='openingCards':assert best==dp['openingKind'],(path,h['handNumber'],p['playerId'],'opening',best,dp['openingKind'])
                else:
                    assert contains==set(dp['contains']),(path,h['handNumber'],p['playerId'],contains,dp['contains'])
                    assert best==dp['kind']
                    scores[p['playerId']]=score
                    lotuses[p['playerId']]=sum(c['kind']=='flower' for c in p['cards'])
                    if not p['folded'] and lotuses[p['playerId']]==0:
                        assert score==(p['score']['total'],tuple(p['score']['tieBreak'])),(path,h['handNumber'],p['playerId'],'score',score,p['score'])
                        score_checks+=1
        if h['reason']=='showdown':
            for pot in h['pots']:
                eligible=pot['eligiblePlayerIds']
                twins=[p for p in eligible if lotuses[p]==2]
                ordinary=[p for p in eligible if lotuses[p]!=1]
                pool=ordinary or eligible
                winners=twins or [p for p in pool if scores[p]==max(scores[q] for q in pool)]
                # When only single Lotuses remain, the engine treats them as tied.
                if not twins and not ordinary:winners=eligible
                assert set(winners)==set(pot['winnerIds']),(path,h['handNumber'],'pot',winners,pot)
                assert abs(sum(pot['payouts'].values())-pot['amount'])<1e-7
                pots+=1
    output.append(dict(file=path.name,seed=raw['seed'],hands=len(raw['state']['handResults']),holdings=holdings,scoreChecks=score_checks,pots=pots,decisions=len(raw['decisions'])))
(root/'oracle-audit.json').write_text(json.dumps(output,indent=2)+'\n')
print(json.dumps(dict(traces=len(output),holdings=sum(r['holdings'] for r in output),scoreChecks=sum(r['scoreChecks'] for r in output),pots=sum(r['pots'] for r in output)),indent=2))
