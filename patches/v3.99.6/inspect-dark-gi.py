from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
needles=['LightCache','lightCache','secondaryGI','DirectLightingIntegrator','RenderToneMapper13','ShadowVisibility','PathIntegrator','RadianceCache','IrradianceCache']
out=[]
for n in needles:
    hits=[i+1 for i,l in enumerate(lines) if n in l]
    out.append(f'{n}: {hits[:80]}')
# exact source windows for critical sections
for a,b,label in [(7380,7460,'DIRECT'),(9155,9182,'TONEMAP')]:
    out.append('\n### '+label)
    out.extend(f'{i}: {lines[i-1]}' for i in range(a,min(b,len(lines))+1))
Path('patches/v3.99.6/dark-gi-inspection.txt').write_text('\n'.join(out),encoding='utf-8')
