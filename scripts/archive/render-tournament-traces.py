import json
from pathlib import Path
root=Path('docs/tournament-bots-2026-09-25/logs')
def card(c):
    return str(c.get('rank',c.get('wind',c.get('dragon',c.get('flower',c.get('family',c['kind']))))))+(' '+c['suit'] if 'suit' in c else '')
def action(a):
    return a['type']+(' '+str(a['amount']) if 'amount' in a else '')+(' +stick' if a.get('useRiichiStick') else '')+(' +Riichi' if a.get('riichi') else '')+(' '+a['drawSource'] if 'drawSource' in a else '')+(' Blank swap' if a.get('blankExchange') else '')
for f in sorted(root.glob('*.json.logs/*.json')):
 d=json.loads(f.read_text());lines=[f"# {d['seed']} — {d['generation']}", '', '24 samples per equity projection. All four players use the indicated generation. Opponents’ hidden cards were not available to the bot. Alternatives are ordered by its utility, not by realized outcome.', '', f"Final scores: {d['scores']}", '']
 for h in d['hands']:
  lines += [f"## Hand {h['handNumber']} · orbit {h['orbit']}", '', f"{h['reason']}; pot {h['pot']}; winners {h['winnerIds']}; all-in players {h['allInPlayerIds']}.", '', '| Player | Ending chips | Loans | Hand |', '|---|---:|---:|---|']
  for p in h['players']:lines.append(f"| {p['playerId']} | {p['chips']} | {p['loans']} | {', '.join(card(c) for c in p['cards'])} |")
  lines+=['','| Street · player | Stack · pot | Decision | Reason | Best alternative |','|---|---|---|---|---|']
  for x in d['decisions']:
   if x['hand']!=h['handNumber']:continue
   alt=x['evaluations'][1] if len(x['evaluations'])>1 else None
   other=f"{action(alt['action'])}; utility {alt['utility']:.1f}; chip EV {alt['expectedChipDelta']:.1f}" if alt else '—'
   lines.append(f"| S{x['street']} {x['id']} | {x['chips']} · {x['pot']} | {action(x['action'])} | {x['rationale']} | {other} |")
  lines+=['']
 f.with_suffix('.md').write_text('\n'.join(lines))
