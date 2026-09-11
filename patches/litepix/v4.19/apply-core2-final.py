from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
# Final identity after cumulative v4.16-v4.19 stages.
if '<title>LitePix v4.19.0 Core2 Production Consolidated</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.15\.0[^<]*</title>','<title>LitePix v4.19.0 Core2 Production Consolidated</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.15 title anchor missing')
if "version:'4.19.0'" not in s:
    m=re.search(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.15\.0'[^;]*?)\}\);",s)
    if not m: raise SystemExit('release-blocking: v4.15 version anchor missing')
    body=m.group('body').replace("version:'4.15.0'","version:'4.19.0'",1)
    s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]
# Let v4.13 LocalBLAS consume worker-built BVHs when v4.18 prewarm has them.
q=Path('litepix/core2-instance-v4.13.js');js=q.read_text(encoding='utf-8')
old="const t0=now();this.bvh=new Core2.SAHBVH({maxLeaf:4,bins:24}).build(primitives);this.buildMs=now()-t0;this.rootBounds=this.bvh.nodes.length?this.bvh.nodes[0].bounds:{min:[0,0,0],max:[0,0,0]};"
new="const t0=now(),pre=root.LitePixCore2Worker418?.consume?.(key,mesh)||null;this.bvh=pre||new Core2.SAHBVH({maxLeaf:4,bins:24}).build(primitives);this.workerBuilt=!!pre;this.buildMs=pre?.workerBuildMs??(now()-t0);this.rootBounds=this.bvh.nodes.length?this.bvh.nodes[0].bounds:{min:[0,0,0],max:[0,0,0]};"
if 'this.workerBuilt=!!pre' not in js:
    if old not in js: raise SystemExit('release-blocking: v4.13 LocalBLAS build anchor missing')
    js=js.replace(old,new,1);q.write_text(js,encoding='utf-8')
# Load cumulative Core2 production stages. Worker script itself runs only inside Worker().
anchor='<script src="./litepix/core2-cache-v4.15.js"></script>'
loaders=anchor+'\n<script src="./litepix/core2-tlas-v4.16.js"></script>\n<script src="./litepix/core2-dynamic-v4.17.js"></script>\n<script src="./litepix/core2-async-v4.18.js"></script>\n<script src="./litepix/core2-production-v4.19.js"></script>'
if 'core2-production-v4.19.js' not in s:
    if anchor not in s: raise SystemExit('release-blocking: v4.15 loader missing')
    s=s.replace(anchor,loaders,1)
# Prewarm worker BVHs once at Path-render entry before any LocalBLAS can be requested.
if 'LitePixCore2Worker418.prewarm(job?.renderScene)' not in s:
    pat=r"(const\s+PathGIRenderer\s*=\s*Object\.freeze\(\{[\s\S]{0,400}?async\s+render\([^)]*\)\s*\{)"
    m=re.search(pat,s)
    if not m: raise SystemExit('release-blocking: PathGIRenderer async render anchor missing')
    ins=m.group(1)+"\n    if(window.__LitePixCore2Worker418Enabled!==false&&window.LitePixCore2Worker418?.prewarm)await window.LitePixCore2Worker418.prewarm(job?.renderScene);"
    s=s[:m.start()]+ins+s[m.end():]
# Path primary+bounce routing prefers consolidated Core2.
oldroute="if(window.__LitePixCore2Partial415Enabled!==false&&typeof window.LitePixCore2PartialAcceleration415==='function'){\n      acceleration=window.LitePixCore2PartialAcceleration415.wrap(acceleration,job);"
newroute="if(window.__LitePixCore2Production419Enabled!==false&&typeof window.LitePixCore2Production419==='function'){\n      acceleration=window.LitePixCore2Production419.wrap(acceleration,job);\n    }else if(window.__LitePixCore2Partial415Enabled!==false&&typeof window.LitePixCore2PartialAcceleration415==='function'){\n      acceleration=window.LitePixCore2PartialAcceleration415.wrap(acceleration,job);"
if 'LitePixCore2Production419.wrap(acceleration,job)' not in s:
    c=s.count(oldroute)
    if c!=2: raise SystemExit(f'release-blocking: expected 2 v4.15 routing anchors, found {c}')
    s=s.replace(oldroute,newroute)
# Production telemetry.
meta='        litePixCore2Partial:job.litePixCore2Partial415?.snapshot?.()||null,'
meta2='        litePixCore2Production:job.litePixCore2Production419?.snapshot?.()||null,\n'+meta
if 'litePixCore2Production:job.litePixCore2Production419?.snapshot?.()||null' not in s:
    if meta not in s: raise SystemExit('release-blocking: v4.15 metadata anchor missing')
    s=s.replace(meta,meta2,1)
p.write_text(s,encoding='utf-8')
print('LitePix v4.16-v4.19 Core2 final consolidation applied')