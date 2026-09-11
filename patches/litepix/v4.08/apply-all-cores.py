from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
# Promote public identity while preserving the established 3DLite compatibility bridge.
s,n=re.subn(r'<title>[^<]*(?:LitePix|3DLite)[^<]*</title>','<title>LitePix v4.08.0 All Cores</title>',s,count=1)
if n!=1: raise SystemExit('release-blocking: title anchor not found')
pat=r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{name:'LitePix',version:'[^']+'[^;]*\}\);"
rep="const LitePixVersion=Object.freeze({name:'LitePix',version:'4.08.0',legacyName:'3DLite',legacyVersion:'3.99.6',architecture:'All Cores'});"
s,n=re.subn(pat,rep,s,count=1)
if n!=1: raise SystemExit('release-blocking: LitePixVersion anchor not found')
marker='<!-- LITEPIX V4.08 ALL CORES -->'
block='''\n<!-- LITEPIX V4.08 ALL CORES -->\n<script src="./litepix/core2-scene-acceleration.js"></script>\n<script src="./litepix/core3-raster-guide.js"></script>\n<script src="./litepix/core4-hierarchical-gi.js"></script>\n<script src="./litepix/core5-ray-reuse.js"></script>\n<script src="./litepix/core6-materials-color.js"></script>\n<script src="./litepix/core7-production.js"></script>\n<script src="./litepix/core8-telemetry-optimization.js"></script>\n<script src="./litepix/runtime-v4.08.js"></script>\n'''
if marker not in s:
    if '</body>' not in s: raise SystemExit('release-blocking: </body> anchor missing')
    s=s.replace('</body>',block+'</body>',1)
if 'root.__LitePixAllCores408=true;' not in Path('litepix/runtime-v4.08.js').read_text(encoding='utf-8'):
    raise SystemExit('release-blocking: runtime marker missing')
p.write_text(s,encoding='utf-8')
print('LitePix v4.08 all-core integration applied')
