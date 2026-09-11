from pathlib import Path
import re
p=Path('index.html'); s=p.read_text(encoding='utf-8')
s,n=re.subn(r'<title>LitePix v4\.08\.0[^<]*</title>','<title>LitePix v4.09.0 Optimized All Cores</title>',s,count=1)
if n!=1: raise SystemExit('release-blocking: v4.08 title anchor missing')
pat=r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{name:'LitePix',version:'4\.08\.0'[^;]*\}\);"
rep="const LitePixVersion=Object.freeze({name:'LitePix',version:'4.09.0',legacyName:'3DLite',legacyVersion:'3.99.6',architecture:'All Cores Optimized'});"
s,n=re.subn(pat,rep,s,count=1)
if n!=1: raise SystemExit('release-blocking: v4.08 version owner anchor missing')
if './litepix/runtime-v4.08.js' not in s: raise SystemExit('release-blocking: v4.08 runtime script anchor missing')
s=s.replace('./litepix/runtime-v4.08.js','./litepix/runtime-v4.09.js',1)
if "colorSpace:'linear'" not in s: raise SystemExit('release-blocking: material linear color fix missing')
p.write_text(s,encoding='utf-8')
print('LitePix v4.09 optimization integration applied')
