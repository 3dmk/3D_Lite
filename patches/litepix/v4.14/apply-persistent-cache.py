from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
# Idempotent title migration.
if '<title>LitePix v4.14.0 Persistent Core2 Cache</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.13\.0[^<]*</title>','<title>LitePix v4.14.0 Persistent Core2 Cache</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.13 title anchor missing')
# Idempotent central version migration.
if "version:'4.14.0'" not in s:
    m=re.search(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.13\.0'[^;]*?)\}\);",s)
    if not m: raise SystemExit('release-blocking: v4.13 version anchor missing')
    body=m.group('body').replace("version:'4.13.0'","version:'4.14.0'",1)
    s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]
anchor='<script src="./litepix/core2-instance-v4.13.js"></script>'
loader=anchor+'\n<script src="./litepix/core2-cache-v4.14.js"></script>'
if 'core2-cache-v4.14.js' not in s:
    if anchor not in s: raise SystemExit('release-blocking: v4.13 Core2 loader missing')
    s=s.replace(anchor,loader,1)
old="if(window.__LitePixCore2Scene413Enabled!==false&&typeof window.LitePixSceneAcceleration413==='function'){\n      acceleration=window.LitePixSceneAcceleration413.wrap(acceleration,job);\n    }else if(window.__LitePixCore2Path412Enabled!==false&&typeof window.LitePixCore2PathAcceleration412==='function'){"
new="if(window.__LitePixCore2Persistent414Enabled!==false&&typeof window.LitePixCore2PersistentAcceleration414==='function'){\n      acceleration=window.LitePixCore2PersistentAcceleration414.wrap(acceleration,job);\n    }else if(window.__LitePixCore2Scene413Enabled!==false&&typeof window.LitePixSceneAcceleration413==='function'){\n      acceleration=window.LitePixSceneAcceleration413.wrap(acceleration,job);\n    }else if(window.__LitePixCore2Path412Enabled!==false&&typeof window.LitePixCore2PathAcceleration412==='function'){"
if 'LitePixCore2PersistentAcceleration414.wrap(acceleration,job)' not in s:
    c=s.count(old)
    if c!=2: raise SystemExit(f'release-blocking: expected 2 v4.13 Path routing anchors, found {c}')
    s=s.replace(old,new)
meta='        litePixCore2Scene:job.litePixCore2Scene413?.snapshot?.()||null,'
meta_new='        litePixCore2Persistent:job.litePixCore2Persistent414?.snapshot?.()||null,\n'+meta
if 'litePixCore2Persistent:job.litePixCore2Persistent414?.snapshot?.()||null' not in s:
    if meta not in s: raise SystemExit('release-blocking: v4.13 metadata anchor missing')
    s=s.replace(meta,meta_new,1)
p.write_text(s,encoding='utf-8')
print('LitePix v4.14 persistent Core2 cache integration applied')