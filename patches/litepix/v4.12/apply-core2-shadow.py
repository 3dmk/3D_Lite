from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

if '<title>LitePix v4.12.0 Large Scene BVH + Shadow</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.11\.0[^<]*</title>','<title>LitePix v4.12.0 Large Scene BVH + Shadow</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.11 title anchor not found')
if "version:'4.12.0'" not in s:
    pat=r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.11\.0'[^;]*?)\}\);"
    m=re.search(pat,s)
    if not m: raise SystemExit('release-blocking: v4.11 LitePixVersion anchor not found')
    body=m.group('body').replace("version:'4.11.0'","version:'4.12.0'",1)
    s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]

oldloader='<script src="./litepix/core2-path-v4.11.js"></script>'
newloader='<script src="./litepix/core2-path-v4.12.js"></script>'
if newloader not in s:
    if oldloader not in s: raise SystemExit('release-blocking: v4.11 Core2 loader missing')
    s=s.replace(oldloader,newloader,1)

# Replace both primary and bounce adapters.
s=s.replace("window.__LitePixCore2Path411Enabled!==false&&typeof window.LitePixCore2PathAcceleration411==='function'","window.__LitePixCore2Path412Enabled!==false&&typeof window.LitePixCore2PathAcceleration412==='function'")
s=s.replace('window.LitePixCore2PathAcceleration411.wrap(acceleration,job)','window.LitePixCore2PathAcceleration412.wrap(acceleration,job)')
s=s.replace("window.__LitePixCore2Path411Enabled!==false&&typeof LitePixCore2PathAcceleration411==='function'","window.__LitePixCore2Path412Enabled!==false&&typeof LitePixCore2PathAcceleration412==='function'")
s=s.replace('LitePixCore2PathAcceleration411.wrap(acceleration,job)','LitePixCore2PathAcceleration412.wrap(acceleration,job)')
s=s.replace('job.litePixCore2Acceleration411?.snapshot?.()||null','job.litePixCore2Acceleration412?.snapshot?.()||null')

# Ensure the real shared shadow visibility path is explicitly tracked by v4.12.
old="""const ShadowVisibility=Object.freeze({\n  visible(acceleration,origin,direction,maxDistance){\n    try{LiteTraceExecutionContext.performance?.addRay?.(RenderRayType.SHADOW);}catch(_){}"""
new="""const ShadowVisibility=Object.freeze({\n  visible(acceleration,origin,direction,maxDistance){\n    try{LiteTraceExecutionContext.performance?.addRay?.(RenderRayType.SHADOW);}catch(_){}\n    try{if(acceleration instanceof window.LitePixCore2PathAcceleration412)window.__LitePixCore2ShadowVisibility412=(window.__LitePixCore2ShadowVisibility412||0)+1;}catch(_){}"""
if new not in s:
    if s.count(old)!=1: raise SystemExit(f'release-blocking: ShadowVisibility anchor count={s.count(old)}')
    s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
print('LitePix v4.12 large-scene BVH + shadow integration applied')
