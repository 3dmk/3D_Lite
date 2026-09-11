from pathlib import Path
p=Path('index.html');s=p.read_text(encoding='utf-8')
old='<script src="./3dlite/main-core-v1.js"></script>'
new=old+'\n<script src="./3dlite/main-core-v2.js"></script>'
if 'main-core-v2.js' not in s:
    if old not in s: raise SystemExit('release-blocking: Main Core v1 loader missing')
    s=s.replace(old,new,1)
meta='threeDLiteMainCore:window.ThreeDLiteMainCore?.renderStamp?.()||null,'
meta2=meta+'\n        threeDLiteArchitecture:window.ThreeDLiteMainCore?.status?.()||null,'
if 'threeDLiteArchitecture:window.ThreeDLiteMainCore' not in s:
    if meta not in s: raise SystemExit('release-blocking: Main Core metadata anchor missing')
    s=s.replace(meta,meta2,1)
p.write_text(s,encoding='utf-8')
print('3D Lite DCAMP Main Core v2 integrated')
