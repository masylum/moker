"""Run Shadow experiments in a temporary copy; never patch the playable game.
Usage: python3 scripts/legacy-shadow-study.py VARIANT [RUNS=20] [SAMPLES=24] [OFFSET=0]
Variants: control, shadow, shadow-above, shadow-restricted, shadow-original-three, shadow-ladder, shadow-ladder-policy.
"""
import pathlib, tempfile, shutil, subprocess, sys, difflib, json
ROOT=pathlib.Path(__file__).resolve().parents[1]
variant=sys.argv[1] if len(sys.argv)>1 else 'shadow'
assert variant in ['control','shadow','shadow-above','shadow-restricted','shadow-original-three','shadow-ladder','shadow-ladder-policy']
shadow=variant!='control'
out=ROOT/'docs/legacy-shadow';out.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='moker-shadow-') as tmp:
 lab=pathlib.Path(tmp);shutil.copytree(ROOT/'src/game',lab/'src/game')
 (lab/'scripts').mkdir()
 for name in ['legacy-shadow-study.ts','legacy-shadow-oracle.ts']:shutil.copy(ROOT/'scripts'/name,lab/'scripts'/name)
 (lab/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
 (lab/'package.json').write_text('{"type":"module"}')
 def edit(name,fn):
  p=lab/'src/game'/name;p.write_text(fn(p.read_text()))
 def replace(s,a,b):
  assert a in s, f'Patch drift: {a[:100]}'
  return s.replace(a,b)
 edit('engine.ts',lambda s:replace(replace(s,'    legacy.searchedPlayerIds = []','    legacy.searchedPlayerIds = []\n    this.redistributeDiscardPool()'),'  protected createRoundDeck(): Card[] {','  protected redistributeDiscardPool(): void {}\n\n  protected createRoundDeck(): Card[] {'))
 if shadow:
  edit('types.ts',lambda s:replace(replace(replace(s,'["bamboo", "dots", "characters"]','["bamboo", "dots", "characters", "shadow"]'),'["red", "green", "white"]','["red", "green", "white", "black"]'),'  | "quint"','  | "four-dragons"\n  | "quint"'))
  def cards(s):
   s=replace(s,'for (const suit of SUITS)','for (const suit of SUITS.filter(s => s !== "shadow"))')
   s=replace(s,'for (const dragon of DRAGONS)','for (const dragon of DRAGONS.filter(d => d !== "black"))')
   s=replace(s,'  return cards\n}', '''  if (mode === "legacy") {
    for (let rank=1;rank<=9;rank++) for(let copy=1;copy<=4;copy++)
      cards.push({...numberedFace("shadow",rank as NumberedRank),id:`shadow-${rank}-${copy}`})
    for(let copy=1;copy<=4;copy++) cards.push({...dragonFace("black"),id:`dragon-black-${copy}`})
  }
  return cards
}''')
   s=replace(s,'const color = dragon === "green"','const color = dragon === "black" ? "black" : dragon === "green"')
   s=replace(s,'return suit === "bamboo" ? "green"','return suit === "shadow" ? "black" : suit === "bamboo" ? "green"')
   s=replace(s,'"Bams" | "Dots" | "Craks"','"Bams" | "Dots" | "Craks" | "Shadow"')
   s=replace(s,'return suit === "bamboo" ? "Bams"','return suit === "shadow" ? "Shadow" : suit === "bamboo" ? "Bams"')
   return s
  edit('cards.ts',cards)
  def ladder(s):
   s=replace(s,'  "four-winds": "Four Winds",','  "four-winds": "Four Winds",\n  "four-dragons": "Four Dragons",')
   # Only the Legacy list; leave the normal ranks object unchanged except the new type entry.
   s=replace(s,'  "four-winds": 13,','  "four-winds": 13,\n  "four-dragons": 13,')
   if variant=='shadow-above':s=replace(s,'  "four-winds",\n  "kong",','  "four-winds",\n  "four-dragons",\n  "kong",')
   else:s=replace(s,'  "four-winds",\n  "kong",','  "four-dragons",\n  "four-winds",\n  "kong",')
   if variant.startswith('shadow-ladder'):
    s=replace(s,'  "three-winds",\n  "chow-eye",\n  "three-dragons",','  "three-dragons",\n  "three-winds",\n  "chow-eye",')
    s=replace(s,'  "long-chow",\n  "three-dragons-eye",','  "three-dragons-eye",\n  "long-chow",')
   return s
  edit('hand-ranks.ts',ladder)
  if variant=='shadow-ladder-policy':
   def policy(s):
    s=replace(s,'current.total >= 8','["three-dragons","pung-eye","twin-lotus","long-chow","three-dragons-eye","four-dragons","four-winds","kong","quint"].includes(current.kind)')
    return replace(s,'current.total >= 12','["three-dragons-eye","four-dragons","four-winds","kong","quint"].includes(current.kind)')
   edit('legacy-bot.ts',policy)
 # One generic scorer for both 152 and 192; control parity checked against the original.
 (lab/'src/game/legacy-identities.ts').write_text('''import { DRAGONS, SUITS, WINDS, type Card } from "./types"
const dragonStart=SUITS.length*9, windStart=dragonStart+DRAGONS.length
export function identities(card: Card, allowJoker: boolean): number[] {
 if(card.kind==="wild") return card.rank==="dragon" ? DRAGONS.map((_,i)=>dragonStart+i) : SUITS.map((_,i)=>i*9+Number(card.rank)-1)
 if(card.kind==="numbered") return [SUITS.indexOf(card.suit)*9+card.rank-1]
 if(card.kind==="dragon") return [dragonStart+DRAGONS.indexOf(card.dragon)]
 if(card.kind==="wind") return [windStart+WINDS.indexOf(card.wind)]
 if(card.kind!=="joker" || !allowJoker) return []
 const winds=WINDS.map((_,i)=>windStart+i)
 if(card.color==="black") return '''+('winds' if variant=='shadow-restricted' else '(SUITS.length===4 ? [...Array.from({length:9},(_,i)=>27+i),dragonStart+3,...winds] : winds)')+'''
 const suit=card.color==="green"?0:card.color==="blue"?1:2
 const dragon=card.color==="green"?1:card.color==="blue"?2:0
 return [...Array.from({length:9},(_,i)=>suit*9+i),dragonStart+dragon]
}
export const identityValue=(id:number):number=>id>=windStart?11:id>=dragonStart?10:(id%9)+1
''')
 def scorer(s):
  s=replace(s,'import type { Card, HandScore } from "./types"','import { SUITS, DRAGONS, type Card, type HandScore } from "./types"\nconst dragonStart=SUITS.length*9, windStart=dragonStart+DRAGONS.length\nconst dragonIds=DRAGONS.map((_,i)=>dragonStart+i), windIds=[0,1,2,3].map(i=>windStart+i)')
  s=replace(s,'Array<number>(34)','Array<number>(windStart+4)')
  s=replace(s,'target < 34','target < windStart+4')
  s=replace(s,'suit < 3','suit < SUITS.length')
  s=replace(s,'for (const mask of match([27, 28, 29], masks)) {', 'for (const trio of '+('[dragonIds.slice(0,3)]' if variant=='shadow-original-three' else '(dragonIds.length===3?[dragonIds]:dragonIds.map(omitted=>dragonIds.filter(t=>t!==omitted)))')+') for (const mask of match(trio, masks)) {')
  s=replace(s,'for (let omitted = 30; omitted < 34; omitted++)','for (let omitted = windStart; omitted < windStart+4; omitted++)')
  s=replace(s,'[30, 31, 32, 33]','windIds')
  if shadow:s=replace(s,'  const lotusMask =','  for (const mask of match(dragonIds,masks)) offer("four-dragons",mask,[10,10,10,10])\n  const lotusMask =')
  return s
 edit('legacy-scoring.ts',scorer)
 patches=[]
 for f in sorted((lab/'src/game').glob('*.ts')):
  original=(ROOT/'src/game'/f.name).read_text();changed=f.read_text()
  if original!=changed:patches.extend(difflib.unified_diff(original.splitlines(True),changed.splitlines(True),fromfile='a/src/game/'+f.name,tofile='b/src/game/'+f.name))
 (out/(variant+'.patch')).write_text(''.join(patches))
 command=[str(ROOT/'node_modules/.bin/tsx'),str(lab/'scripts/legacy-shadow-study.ts'),variant,*sys.argv[2:5],str(ROOT)]
 if len(sys.argv)<3:command=[*command[:3],'20','24','0',str(ROOT)]
 elif len(sys.argv)<5:raise SystemExit('Pass runs, samples, offset together')
 subprocess.run(command,cwd=lab,check=True)
