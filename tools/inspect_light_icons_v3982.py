from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
terms=['EditorLightSystem','iconGeometry','updateIcon','__3DLiteLightGizmo3981','LineBasicMaterial','LineSegments','3.98.1']
lines=s.splitlines()
out=[]
seen=set()
for term in terms:
    for i,line in enumerate(lines):
        if term in line:
            a=max(0,i-18); b=min(len(lines),i+55)
            key=(a,b)
            if key in seen: continue
            seen.add(key)
            out.append(f'===== {term} around {i+1} =====')
            out.extend(f'{j+1}: {lines[j]}' for j in range(a,b))
            out.append('')
Path('tmp').mkdir(exist_ok=True)
Path('tmp/v3982_light_icon_context.txt').write_text('\n'.join(out),encoding='utf-8')
print('matches',len(out))