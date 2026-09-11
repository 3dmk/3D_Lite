from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
# title/version
if '<title>LitePix v4.15.0 Partial BLAS Invalidation</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.14\.0[^<]*</title>','<title>LitePix v4.15.0 Partial BLAS Invalidation</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.14 title anchor missing')
if "version:'4.15.0'" not in s:
    m=re.search(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.14\.0'[^;]*?)\}\);",s)
    if not m: raise SystemExit('release-blocking: v4.14 version anchor missing')
    body=m.group('body').replace("version:'4.14.0'","version:'4.15.0'",1);s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]
# export v4.13 local BLAS constructor for selective rebuilding
q=Path('litepix/core2-instance-v4.13.js');js=q.read_text(encoding='utf-8')
old='root.LitePixSceneAcceleration413=LitePixSceneAcceleration413;root.__LitePixCore2Scene413=true;'
new='root.LitePixLocalBLAS413=LitePixLocalBLAS413;root.LitePixSceneAcceleration413=LitePixSceneAcceleration413;root.__LitePixCore2Scene413=true;'
if 'root.LitePixLocalBLAS413=LitePixLocalBLAS413;' not in js:
    if old not in js: raise SystemExit('release-blocking: v4.13 export anchor missing')
    js=js.replace(old,new,1);q.write_text(js,encoding='utf-8')
# loader
anchor='<script src="./litepix/core2-cache-v4.14.js"></script>'
loader=anchor+'\n<script src="./litepix/core2-cache-v4.15.js"></script>'
if 'core2-cache-v4.15.js' not in s:
    if anchor not in s: raise SystemExit('release-blocking: v4.14 loader missing')
    s=s.replace(anchor,loader,1)
# Path primary+bounce routing: prefer v4.15 above v4.14
oldroute="if(window.__LitePixCore2Persistent414Enabled!==false&&typeof window.LitePixCore2PersistentAcceleration414==='function'){\n      acceleration=window.LitePixCore2PersistentAcceleration414.wrap(acceleration,job);"
newroute="if(window.__LitePixCore2Partial415Enabled!==false&&typeof window.LitePixCore2PartialAcceleration415==='function'){\n      acceleration=window.LitePixCore2PartialAcceleration415.wrap(acceleration,job);\n    }else if(window.__LitePixCore2Persistent414Enabled!==false&&typeof window.LitePixCore2PersistentAcceleration414==='function'){\n      acceleration=window.LitePixCore2PersistentAcceleration414.wrap(acceleration,job);"
if 'LitePixCore2PartialAcceleration415.wrap(acceleration,job)' not in s:
    c=s.count(oldroute)
    if c!=2: raise SystemExit(f'release-blocking: expected 2 v4.14 routing anchors, found {c}')
    s=s.replace(oldroute,newroute)
meta='        litePixCore2Persistent:job.litePixCore2Persistent414?.snapshot?.()||null,'
meta2='        litePixCore2Partial:job.litePixCore2Partial415?.snapshot?.()||null,\n'+meta
if 'litePixCore2Partial:job.litePixCore2Partial415?.snapshot?.()||null' not in s:
    if meta not in s: raise SystemExit('release-blocking: v4.14 metadata anchor missing')
    s=s.replace(meta,meta2,1)
p.write_text(s,encoding='utf-8')
print('LitePix v4.15 partial BLAS integration applied')