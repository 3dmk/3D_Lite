from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
if '<title>LitePix v4.23.0 Core3 Production Raster Guide</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.19\.0[^<]*</title>','<title>LitePix v4.23.0 Core3 Production Raster Guide</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.19 title anchor missing')
if "version:'4.23.0'" not in s:
    m=re.search(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.19\.0'[^;]*?)\}\);",s)
    if not m: raise SystemExit('release-blocking: v4.19 version anchor missing')
    body=m.group('body').replace("version:'4.19.0'","version:'4.23.0'",1);s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]
anchor='<script src="./litepix/core3-raster-guide.js"></script>'
loaders=anchor+'\n<script src="./litepix/core3-gbuffer-v4.20.js"></script>\n<script src="./litepix/core3-pyramid-v4.21.js"></script>\n<script src="./litepix/core3-temporal-v4.22.js"></script>\n<script src="./litepix/core3-production-v4.23.js"></script>'
if 'core3-production-v4.23.js' not in s:
    if anchor not in s: raise SystemExit('release-blocking: Core3 base loader missing')
    s=s.replace(anchor,loaders,1)
ctor="const litePixPath410=(typeof LitePixPathExecution410==='function')?new LitePixPathExecution410(width,height,{startBlock:32,minBlock:1,maxLevel:6}):null;"
ctor2=ctor+"\n    const litePixCore3Production423=(window.__LitePixCore3Production423Enabled!==false&&typeof window.LitePixCore3Production423==='function')?new window.LitePixCore3Production423(width,height):null;\n    if(litePixCore3Production423)litePixCore3Production423.beginFrame();\n    job.litePixCore3Production423=litePixCore3Production423;"
if 'job.litePixCore3Production423=litePixCore3Production423' not in s:
    if ctor not in s: raise SystemExit('release-blocking: Path Core3 constructor anchor missing')
    s=s.replace(ctor,ctor2,1)
rec="if(litePixPath410)litePixPath410.record(i,x,y,sample,ph,accumulator);"
rec2=rec+"\n          if(litePixCore3Production423)litePixCore3Production423.recordPrimary(i,x,y,ray,sample,ph,job,compiled,acceleration);"
if 'litePixCore3Production423.recordPrimary' not in s:
    if rec not in s: raise SystemExit('release-blocking: Path primary record anchor missing')
    s=s.replace(rec,rec2,1)
pass_anchor="const litePixPass410=litePixPath410?litePixPath410.completePass(accumulator):null;"
pass2=pass_anchor+"\n      if(litePixCore3Production423)job.litePixCore3Pass423=litePixCore3Production423.completePass();"
if 'job.litePixCore3Pass423=litePixCore3Production423.completePass()' not in s:
    if pass_anchor not in s: raise SystemExit('release-blocking: Path pass anchor missing')
    s=s.replace(pass_anchor,pass2,1)
final_anchor="job.litePixPathStats410=litePixPath410?.snapshot?.()||job.litePixPathStats410||null;"
final2="job.litePixCore3Stats423=litePixCore3Production423?.endFrame?.()||job.litePixCore3Pass423||null;\n    "+final_anchor
if 'job.litePixCore3Stats423=litePixCore3Production423?.endFrame?.()' not in s:
    if final_anchor not in s: raise SystemExit('release-blocking: Path finalization anchor missing')
    s=s.replace(final_anchor,final2,1)
meta="        litePixNativePath:litePixPath410?.snapshot?.()||null,"
meta2=meta+"\n        litePixCore3Production:job.litePixCore3Stats423||litePixCore3Production423?.snapshot?.()||null,"
if 'litePixCore3Production:job.litePixCore3Stats423' not in s:
    if meta not in s: raise SystemExit('release-blocking: Path metadata anchor missing')
    s=s.replace(meta,meta2,1)
p.write_text(s,encoding='utf-8')
print('LitePix v4.20-v4.23 Core3 production pass applied')
