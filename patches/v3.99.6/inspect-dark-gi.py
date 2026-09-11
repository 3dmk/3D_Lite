from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
out=[]
for a,b,label in [(4420,4635,'SNAPSHOT_MATERIALS'),(5970,6055,'COLOR_CONVERSION'),(6980,7065,'LIGHT_SERIALIZE')]:
    out.append('\n### '+label)
    out.extend(f'{i}: {lines[i-1]}' for i in range(a,min(b,len(lines))+1))
Path('patches/v3.99.6/dark-gi-inspection.txt').write_text('\n'.join(out),encoding='utf-8')
