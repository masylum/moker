"""Ten predetermined Shadow tournament traces: seeds 0–3 (4p), 0–2 (5p/6p)."""
import gzip,json,pathlib,collections
root=pathlib.Path(__file__).resolve().parents[1]/'docs/legacy-shadow'
data=json.load(gzip.open(root/'shadow.json.gz'))
lines=['# Ten Shadow tournament traces','','Selected by seed before inspecting outcomes: four 4-player, three 5-player, three 6-player tournaments. These use the proposed Four Dragons placement and the existing remaining ladder. P0 is seat 1. Chips below are game scores, not cumulative tournament scores. Winning categories include uncontested wins.','','The compressed raw results retain every opening/end category, selected combination, deck size and financial outcome. Full card labels are retained for seeds 0 and 1 at each player count.','']
for t in data['tournaments']:
 if t['run'] >= (4 if t['players']==4 else 3):continue
 lines += [f"## {t['players']} players · seed {t['run']}",'',f"Tournament winner: {', '.join(t['winnerIds'])}. Last after game one: {', '.join(t['lastAfterOne'])}. Final personal sizes: {t['finalDecks']}. Empty personal decks: {t['emptyOwn']}.",'','| Game | Winner categories, in hand order | Collections after game | Game scores |','|---|---|---|---|']
 for game in range(1,5):
  hs=[h for h in t['hands'] if h['game']==game]
  wins=[' / '.join(p['id']+': '+p['end']['kind'] for p in h['seats'] if p['won'])+(' (folds)' if h['reason']=='uncontested' else '') for h in hs]
  lines.append(f"| {game} | {'; '.join(wins)} | {hs[-1]['decks']} | {t['gameScores'][game-1]} |")
 c=collections.Counter((p['id'],p['end']['kind'],p['end']['core']) for h in t['hands'] for p in h['seats'] if p['won'])
 repeated=[f'{k[0]} {k[1]} ({v} wins; {k[2]})' for k,v in c.items() if v>1]
 lines += ['', 'Repeated winning cores: '+('; '.join(repeated) or 'none')+'.',f"Loans: {t['events'].get('loan-taken',0)}. Sticks spent: {t['events'].get('riichi-stick-spent',0)}. Riichi declarations: {t['events'].get('riichi-declared',0)}. Showdowns: {sum(h['reason']=='showdown' for h in t['hands'])}/{len(t['hands'])}.",'']
root.joinpath('ten-tournaments.md').write_text('\n'.join(lines)+'\n')
