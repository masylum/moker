import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter
r=Path('docs/tournament-bots-2026-09-25');d=json.loads((r/'summary.json').read_text())
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False})
fig,axs=plt.subplots(1,2,figsize=(11,4.8));fig.patch.set_facecolor('#faf9f5')
for ax in axs:ax.set_facecolor('#faf9f5')
for y,m in enumerate(['basic','riichi']):
 x=d[f'holdout-{m}'];w=x['winCredit'];axs[0].errorbar(w['mean'],y,xerr=[[w['mean']-w['low']],[w['high']-w['mean']]],fmt='o',color='#187d78',markersize=9,capsize=5);axs[0].text(w['mean'],y+.18,f"{w['mean']:.1%} · {x['games']} tournaments",ha='center')
axs[0].axvline(.5,color='#888',linestyle='--');axs[0].set_xlim(.4,.7);axs[0].set_ylim(-.4,1.55);axs[0].set_yticks([0,1],['Basic','Riichi']);axs[0].xaxis.set_major_formatter(PercentFormatter(1));axs[0].set_title('New generation wins',loc='left',fontweight='bold');axs[0].set_xlabel('Two new / two old bots · 50% is parity\nSeed-clustered 95% intervals')
for m,color in [('basic','#187d78'),('riichi','#b36b3e')]:
 vals=[x['behindChampion']['mean'] for x in d[f'holdout-{m}']['health']['catchup']];axs[1].plot([1,2,3],vals,marker='o',label=m.title(),color=color)
 for x,y in zip([1,2,3],vals):axs[1].annotate(f'{y:.1%}',(x,y),xytext=(0,9),textcoords='offset points',ha='center',color=color)
axs[1].set_xticks([1,2,3]);axs[1].set_ylim(0,.65);axs[1].yaxis.set_major_formatter(PercentFormatter(1));axs[1].set_xlabel('After orbit');axs[1].set_title('Champions who were behind',loc='left',fontweight='bold');axs[1].legend(frameon=False)
fig.suptitle('Tournament-aware bots · frozen validation',x=.045,ha='left',fontweight='bold',fontsize=17)
fig.text(.045,.025,'Four players · 200 chips · four continuous orbits · 24 samples per equity projection. Catch-up uses mixed tables.',fontsize=10)
fig.tight_layout(rect=(.02,.08,.99,.92));fig.savefig(r/'validation.png',dpi=160);fig.savefig(r/'validation.svg')
