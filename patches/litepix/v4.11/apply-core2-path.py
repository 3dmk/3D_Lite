from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Public identity/version: idempotent across gated reruns.
if '<title>LitePix v4.11.0 Core2 Path BVH</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.10\.0[^<]*</title>','<title>LitePix v4.11.0 Core2 Path BVH</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.10 title anchor not found')
if "version:'4.11.0'" not in s:
    pat=r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.10\.0'[^;]*?)\}\);"
    m=re.search(pat,s)
    if not m: raise SystemExit('release-blocking: v4.10 LitePixVersion anchor not found')
    body=m.group('body').replace("version:'4.10.0'","version:'4.11.0'",1)
    s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]

loader='<script src="./litepix/core2-path-v4.11.js"></script>'
if loader not in s:
    anchor='<script src="./litepix/path-integration-v4.10.js"></script>'
    if anchor not in s: raise SystemExit('release-blocking: v4.10 path integration loader missing')
    s=s.replace(anchor,anchor+'\n'+loader,1)

old="""  trace(job,acceleration,compiled,primaryRay,pixelSeed,initialHit=null){\n    let radiance=[0,0,0];"""
new="""  trace(job,acceleration,compiled,primaryRay,pixelSeed,initialHit=null){\n    if(window.__LitePixCore2Path411Enabled!==false&&typeof window.LitePixCore2PathAcceleration411==='function'){\n      acceleration=window.LitePixCore2PathAcceleration411.wrap(acceleration,job);\n    }\n    let radiance=[0,0,0];"""
legacy_new="""  trace(job,acceleration,compiled,primaryRay,pixelSeed,initialHit=null){\n    if(window.__LitePixCore2Path411Enabled!==false&&typeof LitePixCore2PathAcceleration411==='function'){\n      acceleration=LitePixCore2PathAcceleration411.wrap(acceleration,job);\n    }\n    let radiance=[0,0,0];"""
if new not in s:
    if legacy_new in s:
        s=s.replace(legacy_new,new,1)
    else:
        if s.count(old)!=1: raise SystemExit(f'release-blocking: PathIntegrator trace anchor count={s.count(old)}')
        s=s.replace(old,new,1)

old2="litePixNativePath:litePixPath410?.snapshot?.()||null"
new2="litePixNativePath:litePixPath410?.snapshot?.()||null,\n        litePixCore2BVH:job.litePixCore2Acceleration411?.snapshot?.()||null"
if new2 not in s:
    if s.count(old2)!=1: raise SystemExit(f'release-blocking: Path metadata anchor count={s.count(old2)}')
    s=s.replace(old2,new2,1)

p.write_text(s,encoding='utf-8')
print('LitePix v4.11 Core2 Path BVH patch applied')
