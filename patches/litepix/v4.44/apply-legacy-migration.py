from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
if '<title>3D Lite — LitePix v4.44.0 Legacy Migration</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.43\.0[^<]*</title>','<title>3D Lite — LitePix v4.44.0 Legacy Migration</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.43 title anchor missing')
if "version:'4.44.0'" not in s:
    m=re.search(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.43\.0'[^;]*?)\}\);",s)
    if not m: raise SystemExit('release-blocking: v4.43 version anchor missing')
    body=m.group('body').replace("version:'4.43.0'","version:'4.44.0'",1)
    s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]
anchor='<script src="./litepix/cores4-8-production-v4.43.js"></script>'
loader=anchor+'\n<script src="./litepix/legacy-migration-v4.44.js"></script>'
if 'legacy-migration-v4.44.js' not in s:
    if anchor not in s: raise SystemExit('release-blocking: v4.43 orchestrator loader missing')
    s=s.replace(anchor,loader,1)
meta='        litePixCores4to8Production:job.litePixCores4to8Stats443||litePixCores4to8Production443?.snapshot?.()||null,'
meta2=meta+'\n        litePixLegacyMigration:window.LitePixLegacyMigration444?.audit?.()||null,'
if 'litePixLegacyMigration:window.LitePixLegacyMigration444?.audit?.()' not in s:
    if meta not in s: raise SystemExit('release-blocking: v4.43 metadata anchor missing')
    s=s.replace(meta,meta2,1)
p.write_text(s,encoding='utf-8')
print('3D Lite / LitePix v4.44 legacy migration bridge applied')
