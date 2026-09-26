"""Summarize the user-stopped run without inventing incomplete games or rotations."""
import importlib.util,json,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('summary','scripts/archive/summarize-tournament-bots.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
r=Path('docs/tournament-bots-2026-09-25');out={};counts={}
for mode in ['basic','riichi']:
 rows=[dict(json.loads(line),_mode=mode) for f in sorted((r/'results').glob(f'holdout-{mode}-*.json.jsonl')) for line in f.read_text().splitlines()]
 assert len({x['index'] for x in rows})==len(rows)
 clusters={c:[x for x in rows if x['cluster']==c] for c in {x['cluster'] for x in rows}}
 complete=[x for rs in clusters.values() if len(rs)==6 for x in rs]
 counts[mode]={'completedGames':len(rows),'analyzedGames':len(complete),'incompleteRotationGamesExcluded':len(rows)-len(complete)}
 out[f'holdout-{mode}']=mod.matchup(complete)
 for gen,prefix in [('old','old'),('new','selected')]:
  doc=json.loads((r/f'logs/{prefix}-{mode}.json').read_text());rows=[dict(x,_mode=mode) for x in doc['rows']]
  out[f'audit-{gen}-{mode}']=mod.summary(rows)
 for row in complete:assert sum(row['allInInitiators'].values())==row['allInHands']
(r/'summary.json').write_text(json.dumps(out,indent=2));(r/'analysis-counts.json').write_text(json.dumps(counts,indent=2))
m=json.loads((r/'manifest.json').read_text());assert all(hashlib.sha256(Path('src/game',f).read_bytes()).hexdigest()==h for f,h in m['hashes'].items());m['analysisCounts']=counts;m['baselineHashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (r/'baseline/src/game').glob('*.ts')};(r/'manifest.json').write_text(json.dumps(m,indent=2))
print(json.dumps({m:{'count':counts[m],'win':out[f'holdout-{m}']['winCredit'],'health':{k:out[f'holdout-{m}']['health'][k] for k in ['allInHands','street4','allInInitiators','loansPerGame']},'catchup':[x['behindChampion']['mean'] for x in out[f'holdout-{m}']['health']['catchup']]} for m in ['basic','riichi']},indent=2))
