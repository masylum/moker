"""Rebuild the Legacy v2 report from checked-in simulation outputs (stdlib only)."""
from pathlib import Path
import json
import math
import random
import statistics

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs' / 'legacy-v2-2026-09-28'

def load(name):
    return json.loads((OUT / f'{name}.json').read_text())

def pool(names):
    data = [load(n) for n in names]
    rows = {k: {field: sum(d['rows'][k][field] for d in data) for field in ('contains', 'best', 'eligibleBest')} for k in data[0]['rows']}
    return {'samples': sum(d['samples'] for d in data), 'rows': rows,
        'singleLotus': sum(d['singleLotus'] for d in data),
        'cooccurrence': {a: {b: sum(d['cooccurrence'][a][b] for d in data) for b in rows} for a in rows}}

def pct(n, d=1, digits=2):
    return f'{100*n/d:.{digits}f}%'

def wilson(n, d):
    p, z = n / d, 1.95996398454
    center = (p + z*z/(2*d)) / (1+z*z/d)
    width = z*math.sqrt(p*(1-p)/d + z*z/(4*d*d))/(1+z*z/d)
    return f'{100*(center-width):.4f}–{100*(center+width):.4f}%'

def summarize(name):
    games = load(name)['results']
    searches = [s for g in games for s in g['searches']]
    return dict(games=games, n=len(games), finished=sum(g['finished'] for g in games),
        rounds=sum(g['rounds'] for g in games), showdown=sum(g['showdown'] for g in games),
        hands=sum(g['showdownHands'] for g in games), opportunities=sum(g['opportunities'] for g in games),
        searches=searches, fallbacks=[f for g in games for f in g['fallbacks']],
        low=min(min(g['finalCollectionSizes']) for g in games), high=max(max(g['finalCollectionSizes']) for g in games))

def aggregate(games, field, key, metric):
    return sum((g['charleston']['rows'] if field == 'charleston' else g['ranks'])[key][metric] for g in games)

riichi = pool(['riichi-a', 'riichi-b'])
legacy = pool(['legacy-a', 'legacy-b'])
exact = {name: load('exact-'+name)['exact'] for name in ['riichi','legacy','no-wilds','no-extra-winds','no-extra-utilities']}
main = summarize('search-on')
control = summarize('search-off')
extra = {name: summarize(name) for name in ['stress-2','stress-3','stress-5','stress-6','tournament','search-96','checkdown']}
all_runs = [main, control, *extra.values()]
labels = {'high-card':'High Card','eye':'Eyes','chow':'Chow','two-eyes':'Two Eyes','chow-eye':'Chow and Eyes','pung':'Pung','three-winds':'Three Winds','pung-eye':'Pung and Eyes','three-dragons':'Three Dragons','twin-lotus':'Twin Lotus','long-chow':'Long Chow','three-dragons-eye':'Three Dragons and Eyes','four-winds':'Four Winds','kong':'Kong','quint':'Quint'}
lines = ['# Legacy v2: ladder and bot experiment', '',
    'Current candidate: persistent personal decks and player-owned lanes; fixed-rank wilds; Quint above Kong; Treasure searches with no payout or scoring sets; clockwise fallback draws; existing Riichi sticks and rewards unchanged. This is a headless prototype on `codex/legacy-prototype`, not deployed or browser-playable.', '',
    '## Findings', '',
    '- Keep Quint above Kong. Its exact random seven-card probability is about one in 433,220; Kong is about one in 2,070.',
    '- Keep Four Winds above Three Dragons and Eyes. Their Legacy probabilities are almost equal, but exact counting supports that order. The extra Winds and wilds change the relationship from ordinary Riichi.',
    '- The ladder is not strictly ordered by initial rarity. Chow and Eyes is rarer than Pung and Three Winds; Pung and Eyes is rarer than Three Dragons. These are candidates for a separately tested reorder, not silent changes to this prototype.',
    '- Searches give Treasures a useful role without a payout. These bots usually spend them when eligible, but current simulations do not establish their optimal strategic value.',
    '- Clockwise fallback resolves the observed personal-deck shortages. It also moves cards across collections, so deck ownership is deliberately porous.', '',
    '## Coverage and method', '',
    f"**7,000,000 independent uniform seven-card samples:** 2,000,000 each for Riichi and Legacy, plus 1,000,000 for each of three deck-removal controls. **{sum(s['n'] for s in all_runs)} simulated sessions, {sum(s['rounds'] for s in all_runs):,} recorded rounds.** Sessions include normal betting, a checkdown control, two through six players, and persistent multi-game tournaments.", '',
    'The evaluator has 29 focused tests: 2,000 random Legacy hands against an independent oracle that expands wild assignments and uses the existing Riichi scorer; 1,000 ordinary Riichi hands against that scorer; all 1,716 and 3,432 seven-card subsets of two reduced decks; all 34 possible Quint identities and their one-card deletions; and targeted substitutions, compound-hand disjointness, privacy, search ordering, card/chip conservation, fallback, and Riichi reward cases. Exact probability helpers are checked against the reduced-deck exhaustive enumerations.', '',
    '“Contains” asks whether a hand can form a category, independently of other categories. Categories overlap. “Best” uses the current ladder and therefore depends on its order. Opening rarity excludes Charleston, fishing, folding, and deck-building. Seven-card samples use uniform sampling without replacement. Five-player removal of two uniformly random setup cards leaves this unconditional opening distribution unchanged; a known particular reserve would condition it.', '',
    '## Opening ladder frequencies', '',
    'Percent of all seven-card hands. **E** marks exact combinatorial results; other values are Monte Carlo estimates. The last column is a marginal 95% Wilson interval for Legacy estimates, or “exact”. These intervals are not simultaneous confidence bounds.', '',
    '| Category, current order | Riichi contains | Legacy contains | Legacy / Riichi | Legacy 95% interval |',
    '| --- | ---: | ---: | ---: | ---: |']
for kind in legacy['rows']:
    if kind == 'high-card': continue
    e = kind in exact['legacy']
    a = exact['riichi'][kind] if e else riichi['rows'][kind]['contains']/riichi['samples']
    b = exact['legacy'][kind] if e else legacy['rows'][kind]['contains']/legacy['samples']
    ratio = f'{b/a:.2f}×' if a else 'new'
    interval = 'exact' if e else wilson(legacy['rows'][kind]['contains'],legacy['samples'])
    lines.append(f"| {labels[kind]}{' (E)' if e else ''} | {pct(a,digits=6 if kind=='quint' else 4)} | {pct(b,digits=6 if kind=='quint' else 4)} | {ratio} | {interval} |")
lines += ['',
    f"A lone Lotus occurs in {pct(riichi['singleLotus'],riichi['samples'])} of Riichi samples and {pct(legacy['singleLotus'],legacy['samples'])} of Legacy samples. Such hands cannot win a contested showdown under the retained Lotus rule. The table counts raw patterns; `eligibleBest` in the JSON separately excludes lone-Lotus hands.", '',
    '### Exact rare-hand checks', '',
    'There are 34 five-card Quint supports: 27 numbered identities, three Dragons, and four Winds. A suited/Dragon Quint uses its three natural copies, matching Joker, and fixed-rank wild; a Wind Quint uses four natural copies and the black Joker. Two Quints cannot fit in seven cards. Thus P(Quint) = 34 × C(127, 2) / C(132, 7). The two million Legacy samples contained only two Quints; the exact result is the reliable estimate.', '',
    'Kong counting sums each identity’s four-or-five-card hypergeometric probability, subtracting overlapping two-Kong hands that share one substitute. No triple intersection fits in seven cards. Honor calculations enumerate multiplicities and substitute availability. Three Dragons and Eyes enumerates Dragon-capable subsets and counts pair-free subsets of the remaining deck, preventing reuse of a wild in both parts.', '',
    f"Three Dragons and Eyes: **{pct(exact['legacy']['three-dragons-eye'],digits=6)}**; Four Winds: **{pct(exact['legacy']['four-winds'],digits=6)}**. Four Winds is only {(1-exact['legacy']['four-winds']/exact['legacy']['three-dragons-eye'])*100:.2f}% less frequent. Ordinary Riichi instead has {pct(exact['riichi']['three-dragons-eye'],digits=6)} versus {pct(exact['riichi']['four-winds'],digits=6)}. Do not infer a meaningful gameplay strength gap from this narrow opening difference.", '',
    '### Current rarity inversions', '',
    '| Lower-ranked category | Higher-ranked category | Legacy difference (lower minus higher, percentage points) | Paired-sample 95% interval |',
    '| --- | --- | ---: | ---: |']
for a,b in [('chow-eye','pung'),('chow-eye','three-winds'),('pung-eye','three-dragons')]:
    n = legacy['samples']; pa=legacy['rows'][a]['contains']/n; pb=legacy['rows'][b]['contains']/n
    diff=pa-pb; joint=legacy['cooccurrence'][a][b]/n
    se=math.sqrt((pa+pb-2*joint-diff*diff)/n)
    lines.append(f'| {labels[a]} | {labels[b]} | {100*diff:+.4f} | [{100*(diff-1.96*se):+.4f}, {100*(diff+1.96*se):+.4f}] |')
lines += ['',
    'These differences exceed sampling noise. If the goal is a strictly opening-rarity ladder, the relevant middle order would be **Two Eyes → Pung → Three Winds → Chow and Eyes → Three Dragons → Pung and Eyes → Twin Lotus**. I would test that as a separate variant before adopting it. Compound hands are easier for these bots to develop through selection, and the scoring ladder itself drives their decisions. Initial rarity alone cannot settle balance.', '',
    '## Which added cards cause the changes?', '',
    'Each removal control changes both available patterns and total deck size; it is not a same-size replacement experiment. One million samples per control, with exact values below where available.', '',
    '| Deck | Cards | Eyes | Pung and Eyes | Three Winds (E) | Four Winds (E) | Kong (E) | Quint (E) |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for name,title in [('legacy','Full Legacy'),('no-wilds','Remove ten wilds'),('no-extra-winds','Remove four extra Winds'),('no-extra-utilities','Remove two extra Blanks and four Treasures')]:
    d=legacy if name=='legacy' else load(name)
    vals=[d['rows'][k]['contains']/d['samples'] for k in ['eye','pung-eye']]+[exact[name][k] for k in ['three-winds','four-winds','kong','quint']]
    size=132 if name=='legacy' else d['deckSize']
    lines.append(f"| {title} | {size} | "+' | '.join(pct(v,digits=6 if i==5 else 4) for i,v in enumerate(vals))+' |')
lines += ['',
    'Wilds are the main driver of the higher Kong rate and create the suited/Dragon Quints. Extra Winds make Wind patterns much more accessible and permit four Wind Quints even without wilds. Extra utility cards dilute scored patterns in random hands; their fishing abilities can compensate during play. Keeping Riichi sticks means there is no additional Riichi-card dilution. Changing Treasure use and removing its payout changes play, not the 132-card opening composition.', '',
    '## Bot play with Treasure searches', '',
    'The main comparison uses 150 four-player sessions per arm, four dealer orbits, 32 sampled hidden worlds per decision, and matched setup seeds `legacy-v2:0` through `legacy-v2:149`. The control keeps all 132 cards but disables Treasure search and its policy value. Actions, deck trajectories, and later random events diverge; this is not a per-action causal estimate.', '',
    '| Arm | Completed | Rounds | Contested showdowns | Contender hands | Searches | Clockwise fallback draws | Final collection range |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
for title,s in [('Search enabled',main),('Search disabled',control)]:
    lines.append(f"| {title} | {s['finished']}/{s['n']} | {s['rounds']} | {s['showdown']} | {s['hands']} | {len(s['searches'])} | {len(s['fallbacks'])} | {s['low']}–{s['high']} |")
searches=main['searches']
lines += ['',
    f"Bots searched in **{len(searches):,}/{main['opportunities']:,} eligible decisions ({pct(len(searches),main['opportunities'])})**. {sum(s['improved'] for s in searches):,} searches ({pct(sum(s['improved'] for s in searches),len(searches))}) immediately improved scored hand strength, including tie-breaks. {pct(sum(s['self'] for s in searches),len(searches))} targeted the actor's own deck. These are policy observations, not probabilities that using a Treasure wins more chips. Opportunities exclude folds, locked hands, and actions that did not offer fishing; repeated decisions are correlated.", '',
    '| Street | Eligible decisions | Searches | Use rate |', '| --- | ---: | ---: | ---: |']
for i in range(4):
    o=sum(g['byStreet'][i]['opportunities'] for g in main['games']); c=sum(g['byStreet'][i]['chosen'] for g in main['games'])
    lines.append(f'| {i+1} | {o} | {c} | {pct(c,o) if o else "—"} |')
lines += ['',
    'The new mechanic removes the old 1/7, 1/4, or 1/3 private-hand disruption gamble. Its value is selection and collection transfer: replace an otherwise unscored Treasure with the best of three unseen cards. If a searched deck has N cards with K useful hits, a three-card search hits at least one with probability **1 − C(N−K, 3)/C(N, 3)**, before accounting for remembered cards or competing fishing options. For example, 4 useful cards in a 20-card deck gives 50.9%, versus 20% for one blind draw. Use the actual smaller offer size when fewer than three remain.', '',
    'Searching another deck takes a useful card from its future draws; the Treasure you discard feeds a neighbor’s lane and may be fished back into circulation. Leaving unchosen cards in order also creates information: the searcher can know upcoming draws. This makes Treasures interact naturally with persistent decks, lane access, and sticks. The bots model short-term selection and remembered tops, but only shallowly value future denial and collection curation.', '',
    '## Achieved hands and selection effects', '',
    'Raw “contains” frequencies after Charleston and among contested-showdown contenders in the search-enabled arm; best-category counts for both arms are also shown. Different denominators and folding make these descriptive, not a controlled rarity ranking.', '',
    '| Category | After Charleston contains | Showdown contains | Best at showdown: search | Best at showdown: control |',
    '| --- | ---: | ---: | ---: | ---: |']
charhands=sum(g['charleston']['hands'] for g in main['games'])
for k in labels:
    a=aggregate(main['games'],'charleston',k,'contains'); b=aggregate(main['games'],'showdown',k,'contains')
    c=aggregate(main['games'],'showdown',k,'best'); d=aggregate(control['games'],'showdown',k,'best')
    lines.append(f'| {labels[k]} | {pct(a,charhands)} | {pct(b,main["hands"])} | {c} | {d} |')
lines += ['',
    f"Denominators: {charhands:,} post-Charleston hands, {main['hands']:,} search-arm contenders, and {control['hands']:,} control contenders. Lone-Lotus disqualification remains part of settlement; these raw category counts include such contenders. The raw files also record fractional pot wins, but wins conditional on a category do not establish its intrinsic value.", '',
    'Compound hands appear much more often after fishing than their opening rarity suggests. Twin Lotus is especially uncommon among these bots’ finished hands because a single Lotus is dangerous and often discarded. This argues for human testing of the middle ladder and Lotus incentives, not automatically sorting the entire ladder by showdown counts. No Quint reached a contested showdown in the main four-player arms, but two post-Charleston hands in search-enabled session 131 did contain Quints. Replaying that session confirmed that the holder won rounds 12 and 13 uncontested. Across the five- and six-player stress runs, seven contender hands contained Quints. Repeated strong collections make random-deal rarity an incomplete description of long-term attainability.', '',
    '### Matched-session uncertainty', '',
    'The mean change in the per-session proportion of showdown contenders whose best hand is Long Chow or higher is estimated by resampling whole paired sessions (5,000 bootstrap repetitions). This preserves within-session correlations; it measures this policy comparison, not optimal Treasure value.', '']
strong=list(labels)[list(labels).index('long-chow'):]
diffs=[]
for a,b in zip(main['games'],control['games']):
    if a['showdownHands'] and b['showdownHands']:
        diffs.append(sum(a['ranks'][k]['best'] for k in strong)/a['showdownHands']-sum(b['ranks'][k]['best'] for k in strong)/b['showdownHands'])
rng=random.Random('legacy-v2-report')
means=sorted(statistics.mean(rng.choices(diffs,k=len(diffs))) for _ in range(5000))
lines += [f"Search minus control: **{100*statistics.mean(diffs):+.2f} percentage points**, 95% bootstrap interval **[{100*means[125]:+.2f}, {100*means[4874]:+.2f}]**, across {len(diffs)} pairs with at least one contender in each arm. Pairs with no showdown are excluded from this particular statistic. This exploratory interval is not adjusted for multiple comparisons.", '',
    '## Stress tests and policy sensitivity', '',
    '| Configuration | Completed sessions | Rounds | Searches | Fallback draws (deal / fish) | Final collection range |',
    '| --- | ---: | ---: | ---: | ---: | ---: |']
for name,title in [('stress-2','2 players, four orbits'),('stress-3','3 players, four orbits'),('stress-5','5 players, four orbits'),('stress-6','6 players, four orbits'),('tournament','4 players, three two-orbit games'),('search-96','4 players, 96 decision samples'),('checkdown','4 players, no bets or folds')]:
    s=extra[name]; deal=sum(f['reason']=='deal' for f in s['fallbacks']); fish=len(s['fallbacks'])-deal
    lines.append(f"| {title} | {s['finished']}/{s['n']} | {s['rounds']} | {len(s['searches'])} | {deal} / {fish} | {s['low']}–{s['high']} |")
high=extra['search-96']; first=main['games'][:30]
low_s=sum(len(g['searches']) for g in first); low_o=sum(g['opportunities'] for g in first)
lines += ['',
    f"For the same first 30 setup seeds, 32-world decisions searched {low_s}/{low_o} times ({pct(low_s,low_o)}); 96-world decisions searched {len(high['searches'])}/{high['opportunities']} times ({pct(len(high['searches']),high['opportunities'])}). This checks sensitivity to sampling noise, not convergence or optimality.", '',
    'All moves are checked for 132 unique physical cards including the five-player reserve. Targeted tests additionally check chip conservation and unchanged Riichi settlement. No seed-skipping or free-fish-forfeiting exception from v1 remains. All-decks-empty is still an explicit failure rather than invented recycling; the completed sessions establish only that it was not encountered in this sample.', '',
    '## Interpretation and limits', '',
    '- The deck-building loop works: Charleston exchanges cards, fishing transfers them, and unclaimed lane cards become the destination owner’s next deck. An opponent can influence your future collection by choosing where to discard.',
    '- Clockwise borrowing keeps small collections playable, but reduces control over a supposedly personal deck. Watch whether players deliberately thin their decks and rely on neighbors for supply.',
    '- Without payouts or scoring sets, Treasures are action resources. Search selection and knowledge of leftovers now provide the incentive to keep them; there is no reserve-chip inflation.',
    '- The heuristic gives concealed Treasures a small development value and currently discards spent Treasures left. It does not optimize both discard destinations, long-term collection quality, or sophisticated betting-conditioned opponent ranges. High use is evidence of utility to these bots, not proof of balance.',
    '- This experiment does not compare win rates between an optimal search policy and an optimal alternative. Normal fishing can use known lane cards; Treasure search must be committed before seeing offers.',
    '- Quints remain uncommon, but can recur after the required cards concentrate in a persistent collection. The consecutive uncontested wins demonstrate that mechanism; these few cases cannot estimate a stable long-term Quint rate. No additional copies are created by collection transfer.',
    '- Keep the tested ladder for the first human prototype, while explicitly testing the proposed middle reorder separately. The top Four Winds/Kong/Quint order is supported; the whole ladder is not calibrated solely by rarity.',
    '- There is no browser option, production card schema, save compatibility, or `legacy` name gate yet. No publishing or deployment was performed.', '',
    '## Verification', '',
    'All 236 unit tests and 13 Worker integration tests passed, including the 29 Legacy cases. Lint, unused-code checks, and TypeScript checks passed. Changed files pass formatting; the repository-wide format check still reports pre-existing files in `docs/twin-lotus-2026-09-27`. A rerun of search-enabled session 131 reproduces its stored result exactly.', '',
    '## Reproduction and provenance', '',
    'See [current rules and commands](../legacy-prototype.md). Every JSON records options and seeds. `legacy-a/b` and `riichi-a/b` contain the two-million-hand pooled comparisons; the three removal files contain one million each. `exact-*` files use zero Monte Carlo samples and calculate the exact results added after the large samples completed. Simulator JSON contains action counts, searches, fallback events, opening/achieved categories, and example private-search audits for offline analysis only.', '',
    '`python3 scripts/legacy/report.py` rebuilds this report from the checked-in JSON. The v1 [report and source archive](../legacy-2026-09-28/README.md) preserve the superseded rules. Current source and outputs are listed in `manifest.json`; `prototype-source.tar.gz` preserves this version independently of later changes.', '']
(OUT/'README.md').write_text('\n'.join(lines))
