from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
lines=s.splitlines()
out=[]
i=0
removed=False
while i < len(lines):
    if i+2 < len(lines) and lines[i].lstrip().startswith('if(type===') and "obj.rotation.x=-Math.PI*.25;" in lines[i+1] and lines[i+2].strip()=='}':
        # Light viewport/render direction already uses local -Z. Do not silently tilt newly-created lights.
        removed=True
        i+=3
        continue
    out.append(lines[i]); i+=1
s='\n'.join(out)+'\n'
if not removed:
    # Spot-only fix may already have altered the condition; remove any remaining legacy tilt conservatively.
    if 'obj.rotation.x=-Math.PI*.25;' in s:
        raise SystemExit('legacy light tilt found in unexpected form')
marker="window.__3DLiteLightDefaultDirection3983=true;\n"
anchor="window.__3DLiteLightEnergy3983=true;\n"
if marker not in s:
    if anchor not in s: raise SystemExit('energy marker missing')
    s=s.replace(anchor,anchor+marker,1)
p.write_text(s,encoding='utf-8')
print('normalized default light direction to local -Z')
