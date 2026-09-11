from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
terms=['LiteTrace','litetrace','fastStats','rayBudget','sampleBudget','hitCount','secondaryRays','shadowRays','reflectionRays','refractionRays']
lines=s.splitlines()
for term in terms:
 print('\n===',term,'===')
 hits=[i for i,l in enumerate(lines) if term in l]
 print('hits',len(hits))
 for i in hits[:40]:
  lo=max(0,i-3); hi=min(len(lines),i+5)
  print(f'--- {i+1} ---')
  for j in range(lo,hi): print(f'{j+1}: {lines[j][:500]}')
