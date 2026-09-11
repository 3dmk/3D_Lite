from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
needles=['const LightEnergyPolicy','const Tone','ToneMap','toneMap(', 'const ShadowVisibility','ShadowVisibility=', 'evaluateSurfaceDirect','const DirectLightingIntegrator','class LightCache','const LightCache','lightCache.sample','lightCache.lookup','secondaryGI','PhysicalBSDF.evaluate']
out=[]
for n in needles:
    out.append('\n### '+n)
    hits=[]
    for i,line in enumerate(lines):
        if n in line:
            hits.append(i)
            a=max(0,i-12); b=min(len(lines),i+85)
            out.append(f'-- line {i+1} --')
            out.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
            if len(hits)>=8: break
    out.append('hits '+str(len(hits)))
Path('patches/v3.99.6/dark-gi-inspection.txt').write_text('\n'.join(out),encoding='utf-8')
