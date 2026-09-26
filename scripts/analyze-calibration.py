"""Analyze the frozen played calibration without launching simulations."""
import argparse
from collections import Counter
import json
import math
from pathlib import Path
import random

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--uncertainty', action='store_true')
args = parser.parse_args()

def total(records, scope='all'):
    rows = {}
    for record in records:
        for kind, counts in record[scope]['rows'].items():
            rows.setdefault(kind, Counter()).update(counts)
    counts = {key: sum(r[scope][key] for r in records) for key in ['deals', 'hands', 'allIns', 'street4', 'showdowns', 'twins']}
    for kind, row in rows.items():
        for key, numerator, denominator in [('buildPct','contains',counts['deals']),('openingPct','opening',counts['deals']),('openingContainsPct','openingContains',counts['deals']),('openingWinPct','openingWins',row['opening']),('showWinPct','showWins',row['show'])]:
            row[key] = 100 * row[numerator] / denominator if denominator else None
    return dict(counts, rows=rows)

def pairs(summary, order, field='contains'):
    return [dict(lower=a, higher=b, lowerN=summary['rows'][a][field], higherN=summary['rows'][b][field], ratio=(summary['rows'][b][field]+.5)/(summary['rows'][a][field]+.5)) for a,b in zip(order[1:-1],order[2:])]

def interval(values, alpha=.05):
    values = sorted(v for v in values if v is not None)
    if not values: return None
    return [values[int(len(values)*alpha/2)],values[min(len(values)-1,int(len(values)*(1-alpha/2)))]]

output = {}
for path in sorted(args.directory.glob('*.jsonl')):
    mp = Path(str(path)+'.manifest.json')
    if not mp.exists(): continue
    manifest = json.loads(mp.read_text())
    try: records = [json.loads(l) for l in path.read_text().splitlines()]
    except json.JSONDecodeError: continue
    if len(records) != manifest['count']: continue
    assert len({r['seed'] for r in records}) == len(records)
    assert len({r['index'] for r in records}) == len(records)
    assert manifest['samples'] == 24
    for r in records:
        assert sum(v['opening'] for v in r['all']['rows'].values()) == r['all']['deals']
        assert sum(v['end'] for v in r['all']['rows'].values()) == r['all']['deals']
        assert abs(sum(v['openingWins'] for v in r['all']['rows'].values()) - r['all']['hands']) < 1e-7
        expected = 4*sum(200+100*i for i in range(manifest['games']))-50*r['loans']
        assert abs(sum(r['scores'].values())-expected) < 1e-7
    summary = dict(manifest=manifest, all=total(records), nonterminal=total(records,'nonterminal'))
    for scope in ['all','nonterminal']:
        summary[scope]['pairs'] = pairs(summary[scope],manifest['order'])
        summary[scope]['mismatch'] = sum(max(0,math.log(p['ratio'])) for p in summary[scope]['pairs'])
    summary['ordinaryPairs'] = pairs(summary['all'],manifest['order'],'ordinaryContains')
    n = summary['all']['hands']; games = len(records)*manifest['games']
    summary['health'] = {k: 100*summary['all'][k]/n for k in ['allIns','street4','showdowns']}
    summary['health'].update({k:sum(r[k] for r in records)/games for k in ['loans','sticks','declarations','eliminated']})
    summary['health']['remainingSticksPerGame'] = sum(g['remaining'] for r in records for g in r['resources'])/games
    if args.uncertainty and path.stem.startswith(('validation-','format-')):
        order=manifest['order']; adjacent=list(zip(order[1:-1],order[2:])); rng=random.Random(260926)
        traces = {scope:{f'{a}/{b}':[] for a,b in adjacent} for scope in ['all','nonterminal']}
        row_traces={k:{m:[] for m in ['buildPct','showWinPct','openingWinPct']} for k in order}
        # Sum only the fields used by the bootstrap, avoiding expensive full metric reconstruction.
        vectors={scope:[[r[scope]['rows'][k]['contains'] for k in order] for r in records] for scope in traces}
        rowvec=[[[r['all']['rows'][k][m] for m in ['contains','showWins','show','openingWins','opening']] for k in order] for r in records]
        for _ in range(4000):
            indices=rng.choices(range(len(records)),k=len(records))
            for scope in traces:
                sums=[sum(vectors[scope][i][j] for i in indices) for j in range(len(order))]
                for j,(a,b) in enumerate(adjacent,1):traces[scope][f'{a}/{b}'].append((sums[j+1]+.5)/(sums[j]+.5))
            deals=sum(records[i]['all']['deals'] for i in indices)
            for j,k in enumerate(order):
                sums=[sum(rowvec[i][j][m] for i in indices) for m in range(5)]
                row_traces[k]['buildPct'].append(100*sums[0]/deals)
                row_traces[k]['showWinPct'].append(100*sums[1]/sums[2] if sums[2] else None)
                row_traces[k]['openingWinPct'].append(100*sums[3]/sums[4] if sums[4] else None)
        summary['pairIntervals']={scope:{k:dict(ci95=interval(v),simultaneous95=interval(v,.05/len(adjacent))) for k,v in trace.items()} for scope,trace in traces.items()}
        summary['rowIntervals']={k:{m:interval(v) for m,v in trace.items()} for k,trace in row_traces.items()}
    output[path.stem] = summary
    inv=[f"{p['lower']}<{p['higher']} {p['lowerN']}:{p['higherN']}" for p in summary['all']['pairs'] if p['ratio']>1]
    print(path.stem,len(records),'mismatch',round(summary['all']['mismatch'],3),'nonterminal',round(summary['nonterminal']['mismatch'],3),'inversions',inv)
(args.directory/'analysis.json').write_text(json.dumps(output,indent=2)+'\n')
