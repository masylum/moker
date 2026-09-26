"""Aggregate the fixed holdout and paired self-play cohorts; no third-party dependencies."""
import json
import math
import random
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs/bot-upgrade-2026-09-25'
if '--initial' not in sys.argv:
    ROOT = ROOT / 'final'


def interval(values):
    mean = statistics.mean(values)
    se = statistics.stdev(values) / math.sqrt(len(values)) if len(values) > 1 else 0
    return {'mean': mean, 'lower': mean - 1.96 * se, 'upper': mean + 1.96 * se, 'clusters': len(values)}


def percentile(values, probability):
    values = sorted(values)
    position = probability * (len(values) - 1)
    lower = math.floor(position)
    upper = math.ceil(position)
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


if not (ROOT / 'control-riichi-new.json').exists():
    parts = [json.loads((ROOT / f'control-riichi-new-{offset}.json').read_text()) for offset in [0,25,50,75]]
    assert all(p['sourceHashes'] == parts[0]['sourceHashes'] for p in parts)
    rows = sorted([row for part in parts for row in part['rows']], key=lambda r:r['index'])
    assert [r['index'] for r in rows] == list(range(100))
    combined = {**parts[0], 'games':100, 'independentSeeds':100, 'offset':0, 'rows':rows,
                'totals':{k:sum(p['totals'][k] for p in parts) for k in parts[0]['totals']},
                'win':interval([r['win'] for r in rows]), 'delta':interval([r['delta'] for r in rows])}
    (ROOT / 'control-riichi-new.json').write_text(json.dumps(combined,indent=2))

summary = {}
for mode in ['basic', 'riichi']:
    shards = [json.loads((ROOT / f'holdout-{mode}-{part}.json').read_text()) for part in (['a', 'b'] if mode == 'basic' else ['a', 'b', 'c', 'd', 'e', 'f'])]
    assert all(s['samples'] == 24 and s['generation'] == 'mixed' for s in shards)
    assert all(s['sourceHashes'] == shards[0]['sourceHashes'] for s in shards)
    clusters = []
    for shard in shards:
        for cluster in sorted({r['cluster'] for r in shard['rows']}):
            group = [r for r in shard['rows'] if r['cluster'] == cluster]
            assert len(group) == 6
            clusters.append(group)
    mixed = {
        'games': sum(s['games'] for s in shards),
        'samples': 24,
        'win': interval([statistics.mean(r['win'] for r in c) for c in clusters]),
        'scoreAdvantage': interval([statistics.mean(r['delta'] for r in c) for c in clusters]),
        'totals': {k: sum(s['totals'][k] for s in shards) for k in shards[0]['totals']},
    }
    controls = {}
    control_rows = {}
    for generation in ['old', 'new']:
        data = json.loads((ROOT / f'control-{mode}-{generation}.json').read_text())
        assert data['samples'] == 24
        # Legacy-only controls do not execute the candidate heuristic or automation.
        ignored = {'heuristic.ts', 'automation.ts'} if generation == 'old' else set()
        assert all(value == shards[0]['sourceHashes'][key] for key, value in data['sourceHashes'].items() if key not in ignored)
        control_rows[generation] = data['rows']
        if generation == 'old':
            control_prefix = data['prefix']
        else:
            assert data['prefix'] == control_prefix, 'Paired controls must use identical seed families'
        scores = [score for row in data['rows'] for score in row['scores'].values()]
        controls[generation] = {
            'games': data['games'], 'totals': data['totals'],
            'street4Rate': data['totals']['street4'] / data['totals']['hands'],
            'loansPerGame': data['totals']['loans'] / data['games'],
            'negativePlayerRate': sum(s < 0 for s in scores) / len(scores),
            'eliminatedPlayerRate': data['totals']['eliminations'] / len(scores),
            'scores': {str(p): percentile(scores, p) for p in [0.1, 0.5, 0.9]},
            'medianWinnerLastGap': statistics.median(max(r['scores'].values()) - min(r['scores'].values()) for r in data['rows']),
        }
    old_rows, new_rows = control_rows['old'], control_rows['new']
    assert len(old_rows) == len(new_rows)
    rng = random.Random(20260925)
    differences = []
    for _ in range(5000):
        indices = rng.choices(range(len(old_rows)), k=len(old_rows))
        before = sum(old_rows[i]['street4'] for i in indices) / sum(old_rows[i]['hands'] for i in indices)
        after = sum(new_rows[i]['street4'] for i in indices) / sum(new_rows[i]['hands'] for i in indices)
        differences.append(after - before)
    pacing = {'difference': controls['new']['street4Rate'] - controls['old']['street4Rate'],
              'lower': percentile(differences, .025), 'upper': percentile(differences, .975)}
    loans = interval([new['loans'] - old['loans'] for old, new in zip(old_rows, new_rows)])
    summary[mode] = {'mixed': mixed, 'controls': controls, 'pairedStreet4Change': pacing, 'pairedLoansPerGameChange': loans}
(ROOT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
