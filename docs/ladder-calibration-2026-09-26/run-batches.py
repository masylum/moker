import json,subprocess,sys,time
from pathlib import Path
root=Path(__file__).resolve().parent
modules=root/'source/node_modules'
if not modules.exists(): modules.symlink_to(root.parents[1]/'node_modules',target_is_directory=True)
plan=json.loads(Path(sys.argv[1]).read_text())
for job in plan:
 out=root/(job['label']+'.jsonl')
 if out.exists() and len(out.read_text().splitlines())==job['count']:
  print('COMPLETE',job['label'],flush=True);continue
 command=['node','--import','tsx',str(root/'source/scripts/ladder-experiment.ts'),'--mode',job['mode'],'--order',','.join(job['order']),'--count',str(job['count']),'--workers','10','--orbits',str(job['orbits']),'--games',str(job['games']),'--starting-sticks','3','--saved-samples',str(job.get('samples',2)),'--seed',job['seed'],'--out',str(out)]
 if job['mode']=='riichi':command.append('--long-chow')
 print('START',job['label'],flush=True);start=time.monotonic()
 subprocess.run(command,cwd=root/'source',check=True)
 with (root/'timings.jsonl').open('a') as f:f.write(json.dumps({'label':job['label'],'seconds':time.monotonic()-start,'count':job['count']})+'\n')
 print('DONE',job['label'],round(time.monotonic()-start,1),flush=True)
