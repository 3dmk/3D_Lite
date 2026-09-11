from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
out=[]
for a,b,label in [(6000,6225,'MATERIAL_BSDF'),(8000,8090,'DIRECT_MIS'),(8220,8335,'PATH_THROUGHPUT'),(8420,8545,'PATH_RENDER_LOOP')]:
    out.append('\n### '+label)
    out.extend(f'{i}: {lines[i-1]}' for i in range(a,min(b,len(lines))+1))
Path('patches/v3.99.6/dark-gi-inspection.txt').write_text('\n'.join(out),encoding='utf-8')
