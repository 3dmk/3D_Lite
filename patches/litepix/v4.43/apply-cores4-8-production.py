from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
if '<title>LitePix v4.43.0 All 8 Cores Production</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.23\.0[^<]*</title>','<title>LitePix v4.43.0 All 8 Cores Production</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.23 title anchor missing')
if "version:'4.43.0'" not in s:
    m=re.search(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.23\.0'[^;]*?)\}\);",s)
    if not m: raise SystemExit('release-blocking: v4.23 version anchor missing')
    body=m.group('body').replace("version:'4.23.0'","version:'4.43.0'",1);s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]
load_map=[
('<script src="./litepix/core4-hierarchical-gi.js"></script>','<script src="./litepix/core4-hierarchical-gi.js"></script>\n<script src="./litepix/core4-production-v4.27.js"></script>'),
('<script src="./litepix/core5-ray-reuse.js"></script>','<script src="./litepix/core5-ray-reuse.js"></script>\n<script src="./litepix/core5-production-v4.31.js"></script>'),
('<script src="./litepix/core6-materials-color.js"></script>','<script src="./litepix/core6-materials-color.js"></script>\n<script src="./litepix/core6-production-v4.35.js"></script>'),
('<script src="./litepix/core7-production.js"></script>','<script src="./litepix/core7-production.js"></script>\n<script src="./litepix/core7-production-v4.39.js"></script>'),
('<script src="./litepix/core8-telemetry-optimization.js"></script>','<script src="./litepix/core8-telemetry-optimization.js"></script>\n<script src="./litepix/core8-production-v4.43.js"></script>')]
for old,new in load_map:
    if new.split('\n')[-1] not in s:
        if old not in s: raise SystemExit('release-blocking: loader missing '+old)
        s=s.replace(old,new,1)
anchor='<script src="./litepix/core8-production-v4.43.js"></script>'
orch=anchor+'\n<script src="./litepix/cores4-8-production-v4.43.js"></script>'
if 'cores4-8-production-v4.43.js' not in s:
    if anchor not in s: raise SystemExit('release-blocking: Core8 production loader missing')
    s=s.replace(anchor,orch,1)
ctor="job.litePixCore3Production423=litePixCore3Production423;"
ctor2=ctor+"\n    const litePixCores4to8Production443=(window.__LitePixCores4to8Production443Enabled!==false&&typeof window.LitePixCores4to8Production443==='function')?new window.LitePixCores4to8Production443(width,height,job,compiled):null;\n    job.litePixCores4to8Production443=litePixCores4to8Production443;"
if 'job.litePixCores4to8Production443=litePixCores4to8Production443' not in s:
    if ctor not in s: raise SystemExit('release-blocking: Core3 constructor anchor missing')
    s=s.replace(ctor,ctor2,1)
rec="if(litePixCore3Production423)litePixCore3Production423.recordPrimary(i,x,y,ray,sample,ph,job,compiled,acceleration);"
rec2=rec+"\n          if(litePixCores4to8Production443)litePixCores4to8Production443.record(i,x,y,sample,ph,accumulator);"
if 'litePixCores4to8Production443.record(i,x,y,sample,ph,accumulator)' not in s:
    if rec not in s: raise SystemExit('release-blocking: Core3 record anchor missing')
    s=s.replace(rec,rec2,1)
pass_anchor="if(litePixCore3Production423)job.litePixCore3Pass423=litePixCore3Production423.completePass();"
pass2=pass_anchor+"\n      if(litePixCores4to8Production443)job.litePixCores4to8Pass443=litePixCores4to8Production443.completePass(accumulator);"
if 'job.litePixCores4to8Pass443=litePixCores4to8Production443.completePass(accumulator)' not in s:
    if pass_anchor not in s: raise SystemExit('release-blocking: Core3 pass anchor missing')
    s=s.replace(pass_anchor,pass2,1)
final_anchor="job.litePixCore3Stats423=litePixCore3Production423?.endFrame?.()||job.litePixCore3Pass423||null;"
final2=final_anchor+"\n    job.litePixCores4to8Stats443=litePixCores4to8Production443?.finalize?.(job)||job.litePixCores4to8Pass443||null;"
if 'job.litePixCores4to8Stats443=litePixCores4to8Production443?.finalize?.(job)' not in s:
    if final_anchor not in s: raise SystemExit('release-blocking: Core3 finalization anchor missing')
    s=s.replace(final_anchor,final2,1)
meta="        litePixCore3Production:job.litePixCore3Stats423||litePixCore3Production423?.snapshot?.()||null,"
meta2=meta+"\n        litePixCores4to8Production:job.litePixCores4to8Stats443||litePixCores4to8Production443?.snapshot?.()||null,"
if 'litePixCores4to8Production:job.litePixCores4to8Stats443' not in s:
    if meta not in s: raise SystemExit('release-blocking: Core3 metadata anchor missing')
    s=s.replace(meta,meta2,1)
p.write_text(s,encoding='utf-8')
print('LitePix v4.24-v4.43 Cores 4-8 production pass applied')