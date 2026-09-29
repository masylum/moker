"""Exact seven-card inclusion probabilities for honors and matching sets.
Distinct physical cards; colored Jokers retain their allowed identities; no Wilds.
"""
from math import comb
from itertools import combinations
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'docs/legacy-shadow'
def multiply(a,b):
 out=[0]*8
 for i,x in enumerate(a):
  for j,y in enumerate(b):
   if i+j<8:out[i+j]+=x*y
 return out
def present(n):return [0]+[comb(n,k) if k<=n else 0 for k in range(1,8)]
def outside(n):return [comb(n,k) for k in range(8)]
def groups_at_least(sizes,required,other,cards):
 count=0
 for n in range(required,len(sizes)+1):
  for chosen in combinations(sizes,n):
   poly=outside(other)
   for size in chosen:poly=multiply(poly,present(size))
   count+=poly[cards]
 return count
def calculate(N,shadow,flex=True):
 denominator=comb(N,7)
 ds=[5,5,5]+([5 if flex else 4] if shadow else [])
 out={'three-dragons':groups_at_least(ds,3,N-sum(ds),7)}
 if shadow:out['four-dragons']=groups_at_least(ds,4,N-sum(ds),7)
 for k in [3,4]:out[f'{"three" if k==3 else "four"}-winds']=sum(groups_at_least([4]*4,k-joker,N-17,7-joker) for joker in [0,1])
 joker_faces=[10,10,10,14 if shadow and flex else 4]
 eligible=sum(joker_faces);unassisted=10 if shadow and not flex else 0
 out['kong']=eligible*(5*comb(N-5,3)+comb(N-5,2))+unassisted*comb(N-4,3)-sum(comb(k,2)*16 for k in joker_faces)
 out['quint']=eligible*comb(N-5,2)
 out['twin-lotus']=comb(N-2,5)
 return {k:{'hands':v,'totalHands':denominator,'percent':v/denominator*100} for k,v in out.items()}
result={k:calculate(*args) for k,args in {'control':(152,False,True),'shadow':(192,True,True),'shadow-restricted':(192,True,False)}.items()}
(root/'exact-rarity.json').write_text(json.dumps(result,indent=2)+'\n')
for variant,rows in result.items():print(variant,{k:round(r['percent'],6) for k,r in rows.items()})
