from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
s,n=re.subn(r'<title>LitePix v4\.12\.0[^<]*</title>','<title>LitePix v4.13.0 BLAS TLAS + Transform Refit</title>',s,count=1)
if n!=1: raise SystemExit('release-blocking: v4.12 title anchor missing')
if "version:'4.13.0'" not in s:
 m=re.search(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.12\.0'[^;]*?)\}\);",s)
 if not m: raise SystemExit('release-blocking: v4.12 version anchor missing')
 body=m.group('body').replace("version:'4.12.0'","version:'4.13.0'",1);s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]
anchor='<script src="./litepix/core2-path-v4.12.js"></script>'
loader=anchor+'\n<script src="./litepix/core2-instance-v4.13.js"></script>'
if 'core2-instance-v4.13.js' not in s:
 if anchor not in s: raise SystemExit('release-blocking: Core2 v4.12 loader missing')
 s=s.replace(anchor,loader,1)
p.write_text(s,encoding='utf-8');print('LitePix v4.13 BLAS/TLAS loader applied')