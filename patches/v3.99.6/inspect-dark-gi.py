from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
out=[]
for a,b,label in [(6520,6615,'BSDF'),(7890,8295,'LIGHTCACHE_PATH'),(8380,8545,'GI_INTEGRATION'),(11200,11380,'PATH_RENDERER'),(11620,11890,'PATH_PROGRESSIVE')]:
    out.append('\n### '+label)
    out.extend(f'{i}: {lines[i-1]}' for i in range(a,min(b,len(lines))+1))
Path('patches/v3.99.6/dark-gi-inspection.txt').write_text('\n'.join(out),encoding='utf-8')
