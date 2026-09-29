"""Publish all hands from ten predetermined baseline tournaments, with reviewed observations."""
import json, pathlib, gzip
root=pathlib.Path('docs/legacy-152/health')
data=json.loads(gzip.decompress(root.joinpath('14-5-current.json.gz').read_bytes()))
notes={
'health:4:0':'Variety without a runaway deck: six winning categories, and every player wins. p0 wins the tournament, but different players lead the individual games. Several High Card openings improve enough to win. Deck strength is not monotonically increasing for each player.',
'health:4:1':'p3 leads after game one and wins overall, helped by a 410-chip Long Chow win at the end. p0 wins multiple hands but finishes far behind: winning-hand count and tournament success are different measures. p3\'s deck grows to 22 cards; a large collection does not guarantee a strong opening.',
'health:4:2':'A repetition warning even at 5+2: p0 shrinks to seven cards and repeatedly uses the 3 Dots set in game three. That does not secure the tournament: p1 wins all four hands in game two and later gains 575 chips in the final hand. Deck concentration and betting swings both matter.',
'health:4:3':'A clear tournament comeback: p1 is last after game one (170 points versus the leader\'s 250), then gains 610 chips with Three Dragons and Eyes in game two and eventually wins. Meanwhile p2 wins four of the last six hands but still finishes behind p1.',
'health:5:0':'p2 starts fourth, builds a strong middle tournament, and wins overall. Pung and Eyes wins often here, but Four Winds, Dragons and Eyes, Kong, Long Chow, and Chow and Eyes also win. Initial weak hands regularly improve. p1 wins two consecutive Four Winds hands: repeated themes already exist at 5+2.',
'health:5:1':'p1 repeatedly assembles Four Winds, including a Black Joker, and wins nine hands. The final margin is only 75 points over the next players; many wins collect only antes. The Wind streak ends in game four. Winning-category frequency alone overstates economic dominance.',
'health:5:2':'p0 recovers from a negative first-game score with two substantial game-two wins, but does not win overall. p1\'s 570-chip Long Chow win in game four is decisive. A game-one setback is recoverable, although a large late pot remains highly influential.',
'health:6:0':'The strongest repetition warning: p4 wins game-two hands 1–4 using an 8 Characters Kong (three natural cards plus Red Joker). In game four p4 wins four more hands with a 1 Characters Kong. p2 temporarily challenges with a 925-chip win, but p4 finishes on 3,900 points. Fresh filler cards do not prevent repeated winning cores.',
'health:6:1':'Twin Lotus is actually assembled: p1 wins game-four hand one uncontested with both Lotuses. A showdown-only table would miss it completely. p1 wins more hands than p2 but p2 wins the tournament 1,935–1,850. There is both hand variety and meaningful late competition.',
'health:6:2':'A comeback and a supply failure in the same tournament: p2 is last after game one (90 points), then wins overall. The central deck cannot fund game-four hand four, so only 21 of 24 scheduled hands complete. Several personal decks have grown beyond 20 cards. This case directly contradicts any claim that 5+2 is safe for six players.'}
lines=['# Ten reviewed Legacy tournaments','',
'These cases were selected before inspecting outcomes: seeds health:4:0–3, health:5:0–2, and health:6:0–2. All use 14 starting personal cards, 5+2 for every player count, the current ladder, four games, and eight hidden-world samples. Six-player 5+2 is an experimental control, not the live default. All 193 completed hands were reviewed. Player IDs are zero-based. “Net” excludes loan principal; score includes the end-of-game loan penalty. A win means winning at least one pot, including ties and side pots, following the engine’s winner list.','']
for t in data['tournaments']:
 if not t['detailed']: continue
 lines+=['## '+t['seed'],'',notes[t['seed']],'',
 'Final points: '+', '.join(f'{p}: {v:g}' for p,v in t['final'].items())+'.',
 '', '| Game / hand | Winner: opening → finish | Outcome | Winner net chips | Central after cleanup | Personal deck sizes |',
 '|---|---|---|---:|---:|---|']
 for h in t['hands']:
  w=[p for p in h['seats'] if p['won']]
  lines.append('| '+ ' | '.join([f"{h['game']}/{h['hand']}",'; '.join(f"{p['id']}: {p['opening']['kind']} → {p['end']['kind']}" for p in w),h['reason'],' / '.join(f"{p['net']:g}" for p in w),str(h['central']),', '.join(map(str,h['decks']))])+' |')
 lines+=['']
 lines+=['### Winning card evidence','']
 # Include every winning full hand, so claims about repeated cores can be audited.
 for h in t['hands']:
  for p in h['seats']:
   if p['won']:lines.append(f"- {h['game']}/{h['hand']} {p['id']}: "+', '.join(p['endCards'])+'.')
 lines+=['']
root.joinpath('ten-tournaments.md').write_text('\n'.join(lines)+'\n')
