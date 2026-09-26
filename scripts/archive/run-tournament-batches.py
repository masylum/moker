"""Resumable bounded process queue; fixed seeds, rules and 24-sample budget."""
import subprocess,time,json,hashlib
from pathlib import Path
root=Path('docs/tournament-bots-2026-09-25');jobs=[]
for offset in range(0,600,30):
 for mode in ['basic','riichi']:jobs.append(('holdout',mode,'mixed',offset,30,'tournament-validation-v10'))
for offset in range(0,100,25):
 for mode in ['basic','riichi']:
  for gen in ['old','new']:jobs.append((f'health-{gen}',mode,gen,offset,25,'tournament-health-v10'))
hashes={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in Path('src/game').glob('*.ts')}
manifestFile=root/'manifest.json'
manifest=json.loads(manifestFile.read_text()) if manifestFile.exists() else {'selected':'final (v10)','samples':24,'orbits':4,'players':4,'startingChips':200,'holdoutGames':1200,'healthGames':400,'hashes':hashes,'jobs':jobs}
assert manifest['hashes']==hashes,'Source changed after freeze'
manifest.update(status='running',maxProcesses=8)
manifestFile.write_text(json.dumps(manifest,indent=2))
active={};reported=set();lastProgress=None

def output(job):
 cohort,mode,_,offset,_,_=job
 return root/'results'/f'{cohort}-{mode}-{offset:04d}.json'
while True:
 lines=subprocess.check_output(['ps','-axo','command'],text=True).splitlines()
 processes=[line for line in lines if line.startswith('/opt/') and '/tsx/dist/preflight.cjs' in line and 'scripts/archive/tournament-bots.ts' in line]
 for job,(proc,log) in list(active.items()):
  code=proc.poll()
  if code is None:continue
  log.close();del active[job]
  if code:raise RuntimeError(f'Batch failed {job}: {code}')
 completed=[job for job in jobs if output(job).exists()]
 for job in completed:
  if job not in reported:print('DONE',job,'completed',len(completed),flush=True);reported.add(job)
 running=[job for job in jobs if job in active or any(f'--output {output(job)}' in line for line in processes)]
 pending=[job for job in jobs if job not in completed and job not in running]
 count=len(processes)
 for job in pending[:max(0,8-count)]:
  assert all(hashlib.sha256(Path('src/game',f).read_bytes()).hexdigest()==sha for f,sha in hashes.items()),'Source changed after freeze'
  if Path(str(output(job))+'.jsonl').exists():raise RuntimeError(f'Orphan incomplete checkpoint: {job}; inspect before resuming')
  cohort,mode,gen,offset,n,seed=job
  log=open(output(job).with_suffix('.log'),'w')
  proc=subprocess.Popen(['node','node_modules/tsx/dist/cli.mjs','scripts/archive/tournament-bots.ts','--games',str(n),'--mode',mode,'--generation',gen,'--offset',str(offset),'--seed',seed,'--output',str(output(job))],stdout=log,stderr=subprocess.STDOUT)
  active[job]=(proc,log);running.append(job);pending.remove(job);print('START',job,flush=True)
 progress={'completed':completed,'running':running,'pending':len(pending)}
 if progress!=lastProgress:(root/'batch-progress.json').write_text(json.dumps(progress,indent=2));lastProgress=progress
 if len(completed)==len(jobs):break
 time.sleep(2)
manifest.update(status='complete',completedJobs=jobs)
manifestFile.write_text(json.dumps(manifest,indent=2));print('ALL COMPLETE',flush=True)
