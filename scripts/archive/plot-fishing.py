from pathlib import Path
import json, math
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[1]/'docs/fishing-experiment-2026-09-25'
data=json.loads((ROOT/'catchup.json').read_text())
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False,'axes.labelcolor':'#334155','text.color':'#0f172a'})
fig,axes=plt.subplots(2,2,figsize=(13,8),constrained_layout=True)
for row,mode in enumerate(['basic','riichi']):
 for col,(metric,title) in enumerate([('leaderFinalWin','Leader entering orbit'),('liveTrailerFinalWin','Live trailer entering orbit')]):
  ax=axes[row,col]
  for variant,color,offset,label in [('current','#64748b',-.055,'Current rules'),('proposed','#0891b2',.055,'Proposed fishing')]:
   points=[data[mode]['orbits'][str(o)][variant]['metrics'][metric] for o in [2,3,4]]
   ys=[100*p['rate'] for p in points]
   ax.errorbar([o+offset for o in [2,3,4]],ys,yerr=[[100*(p['rate']-p['lower']) for p in points],[100*(p['upper']-p['rate']) for p in points]],color=color,label=label,marker='o',linewidth=2,capsize=4)
  ax.set(title=f'{mode.capitalize()} · {title}',xticks=[2,3,4],xlabel='Orbit about to begin',ylabel='Eventual tournament win credit (%)',ylim=(0,100 if col==0 else min(100,max(20,10*math.ceil(max(data[mode]["orbits"][str(o)][v]["metrics"][metric]["upper"]*100 for o in [2,3,4] for v in ["current","proposed"])/10)))))
  ax.grid(axis='y',alpha=.18)
  ax.legend(frameon=False,fontsize=10)
fig.suptitle('Among surviving players: eventual tournament winners\nConditional on reaching each orbit · 24 samples · approximate 95% intervals',fontsize=17,fontweight='bold')
fig.supxlabel('Unique leaders/trailers only; survivor populations differ between variants.', fontsize=9, color='#475569')
fig.savefig(ROOT/'catchup.png',dpi=180,facecolor='white')
fig.savefig(ROOT/'catchup.svg',facecolor='white')
fig,axes=plt.subplots(1,2,figsize=(12,4.6),constrained_layout=True)
for ax,mode in zip(axes,['basic','riichi']):
 for variant,color,offset,label in [('current','#64748b',-.045,'Current rules'),('proposed','#0891b2',.045,'Proposed fishing')]:
  ps=[data[mode]['checkpoints'][str(o)][variant]['championWasBehind'] for o in [1,2,3]]
  ax.errorbar([o+offset for o in [1,2,3]],[100*p['rate'] for p in ps],yerr=[[100*(p['rate']-p['lower']) for p in ps],[100*(p['upper']-p['rate']) for p in ps]],label=label,color=color,marker='o',linewidth=2,capsize=4)
 ax.set(title=f'{mode.capitalize()} · {data[mode]["gamesPerVariant"]} tournaments per variant',xticks=[1,2,3],xlabel='Standings after orbit',ylabel='Tournament win credit from a trailing player (%)',ylim=(0,min(100,max(20,10*math.ceil(max(data[mode]["checkpoints"][str(o)][v]["championWasBehind"]["upper"]*100 for o in [1,2,3] for v in ["current","proposed"])/10)))))
 ax.grid(axis='y',alpha=.18);ax.legend(frameon=False)
for ax in axes: ax.set_ylim(0,70)
fig.supxlabel('Error bars: approximate 95% intervals · 24 samples per equity projection',fontsize=9,color='#475569')
fig.suptitle('How often does someone come back to win?\nAll tournaments included · terminal standings retained after early endings',fontsize=15,fontweight='bold')
fig.savefig(ROOT/'comebacks.png',dpi=180,facecolor='white')
fig.savefig(ROOT/'comebacks.svg',facecolor='white')
