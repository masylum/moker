"""Readable denominators for the balance study, generated from summary.json."""
import json, pathlib, statistics
root=pathlib.Path('docs/legacy-152/health'); data=json.loads((root/'summary.json').read_text())
percent=lambda a,b:f'{100*a/b:.1f}%' if b else '—'
lines=['# Legacy health metrics','',
'Each row below covers ten four-game tournaments of the given player count unless its tournament count says otherwise. A “win” means winning at least one pot, including tied and side-pot wins. It need not mean a positive chip profit. Opening cards are the seven cards dealt **before Charleston**. Conditional card win rates are associations, not causal card values: the same card can recur in a strong player’s collection.','',
'Configurations: **validation-current** uses the live deal (5+2 for 4–5 players; 6+1 for six) and current ladder. **validation-candidate** alternates 5+2 and 6+1, using ladder B. **validation-rarity** also raises Three Winds above Pung and Eyes (ladder C). **rotation-one/two/three** add that many random, equal-size card exchanges with central between games to B. **final-prototype** adds the one-card exchange to C. The validation and rotation arms use seeds 100–109 and 24 hidden-world samples. The final frozen comparison, confirmation-current versus confirmation-prototype, uses previously unused seeds 200–209, also with 24 samples. Confirmation uses the same rules as validation-current and final-prototype respectively.','',
'Exchanges are research-only: select the replacement from central before returning the outgoing random personal card; shuffle both decks. Process players in seat order. Personal and central deck sizes do not change. There is no cap, trimming, additional card creation, or exchange during a hand.','',
'“Weak opening” means its combination category is below at least half of the active seats (ties do not manufacture a bottom half); kickers are ignored. “Eliminations” counts player/game episodes, so one person eliminated in three games counts three times. “Repeated core” uses the same player, winning category, and multiset of selected card faces; a Joker substitution with different selected faces counts as a different core.','']
variants=[v for v in ['validation-current','validation-candidate','validation-rarity','rotation-one','rotation-two','rotation-three','final-prototype','confirmation-current','confirmation-prototype'] if v in data]
for variant in variants:
 by=data[variant]
 lines+=['## '+variant,'', '| Players | Tournaments | Hands | Showdowns | Central exhaustion | Minimum central | Final personal deck, mean (range) | Personal fallback draws / tournament | Same physical cards as preceding opening |', '|---|---:|---:|---:|---:|---:|---|---:|---:|']
 for n,g in by.items():
  lines.append(f"| {n} | {g['tournaments']} | {g['hands']} | {g['showdowns']} | {g['exhausted']} | {g['central_min']} | {g['final_deck_mean']} ({g['final_deck_range'][0]}–{g['final_deck_range'][1]}) | {g['fallback_per_tournament']} | {g['repeated_cards_mean']}/7 |")
 lines+=['','| Players | Weak openings winning a pot | Weak openings making a chip profit | Last after game 1 → tournament winner | Game-1 leader → tournament winner | Eliminations / player-games | Loans taken | Optional loan opportunities |','|---|---|---|---|---|---|---:|---:|']
 for n,g in by.items():
  lines.append(f"| {n} | {g['weak_opening_wins']}/{g['weak_opening_hands']} ({g['weak_opening_win_pct']}%) | {g['weak_opening_profitable']}/{g['weak_opening_hands']} | {g['last_after_game_one_wins']}/{g['tournaments']} | {g['leader_after_game_one_wins']}/{g['tournaments']} | {g['eliminated_player_games']}/{int(n)*4*g['tournaments']} | {g['events'].get('loan-taken',0)} | {g['loan_offers']} |")
 lines+=['','Loans in these policies are the engine’s automatic rescue loans. The separate collector sensitivity arms also take discretionary loans below 100 chips. “Optional loan opportunities” counts eligible player-hand episodes, not loans actually requested. Tied last/first positions count in the tournament comeback columns. Ten tournaments per cell are too few for precise comeback probabilities.','', '| Players | Sticks spent / available | Riichi declarations (events) | Sole wins earning stick reward | Treasure searches | Treasure bank payout (chips) | Singleton Lotus showdown disqualifications | Max same-core wins per tournament |', '|---|---|---:|---:|---:|---:|---:|---|']
 for n,g in by.items():
  available=int(n)*8*g['tournaments']+g['riichi_sticks_awarded']
  lines.append(f"| {n} | {g['events'].get('riichi-stick-spent',0)}/{available} | {g['events'].get('riichi-declared',0)} | {g['riichi_wins']} | {g['events'].get('treasure-chosen',0)} | {g['treasure_payout']} | {g['disqualified_showdown']} | {', '.join(map(str,g['same_winning_core_maxima']))} |")
 lines+=['','Available sticks = initial two + two at each of three subsequent games, for every seat, plus actual sole-Riichi-win rewards. Declarations withdrawn by folding are included in event totals. A high Riichi win rate is partly selection: this bot declares on already strong combinations.','', '| Players | Strong openings, game 1 → 2 → 3 → 4 | Personal-collection probe, game 1 → 2 → 3 → 4 |', '|---|---|---|']
 for n,g in by.items():
  lines.append(f"| {n} | "+' → '.join(f"{r['opening_strong_pct']}%" for r in g['games'])+' | '+' → '.join(f"{r['own_deck_probe_strong_pct']}%" for r in g['games'])+' |')
 lines+=['','For comparability across reordered ladders, “strong” always means the **original** Pung-and-Eyes category or above, with no singleton Lotus. This fixed yardstick excludes standalone Dragons and Three Winds even when a candidate raises them. The collection probe draws seven random cards 100 times from the personal collection at each game’s first opening; it is a diagnostic of retained deck synergy, **not** a prediction of the actual mixed-source deal. Collections smaller than seven are excluded.','']
 for n,g in by.items():
  lines+=['### '+str(n)+' players: ladder','',f"Denominators: {g['player_hands']} dealt player-hands; {g['showdown_players']} nonfolded showdown participants. Folded end hands are frozen at folding, so their contained-pattern rate is not an equal-effort rarity estimate.",'', '| Category | Opening contains | All endings contain | Showdown contains | Best at showdown | Hands with a winning player in this category |','|---|---:|---:|---:|---:|---:|']
  for k,r in g['rows'].items():
   lines.append(f"| {k} | {r['opening_contains']}/{g['player_hands']} | {r['end_contains']}/{g['player_hands']} | {r['showdown_contains']}/{g['showdown_players']} | {r['showdown_best']}/{g['showdown_players']} | {r['winning_hands']}/{g['hands']} |")
  lines+=['','### '+str(n)+' players: opening-card associations','', '| Opening feature | Wins with feature | Win rate with | Wins without feature | Win rate without |','|---|---:|---:|---:|---:|']
  for label,r in g['feature_rates'].items():
   lines.append(f"| {label} | {r['with_wins']}/{r['with']} | {percent(r['with_wins'],r['with'])} | {r['without_wins']}/{r['without']} | {percent(r['without_wins'],r['without'])} |")
  if g['opening_faces']:
   lines+=['','| Individual face in opening hand | Wins / openings holding it | Conditional win rate |','|---|---:|---:|']
   for face,r in g['opening_faces'].items():
    lines.append(f"| {face} | {r['wins']}/{r['hands']} | {percent(r['wins'],r['hands'])} |")
  lines+=['']
root.joinpath('metrics.md').write_text('\n'.join(lines)+'\n')
