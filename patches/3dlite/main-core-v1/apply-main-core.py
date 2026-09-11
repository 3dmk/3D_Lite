from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
loader='<script src="./litepix/core5-ray-budget-v4.45.js"></script>'
core_loader='<script src="./3dlite/main-core-v1.js"></script>'
if core_loader not in s:
    if loader not in s:
        raise SystemExit('release-blocking: LitePix v4.45 loader anchor missing')
    s=s.replace(loader,loader+'\n'+core_loader,1)
# Attach Main Core generation stamp to real Path render metadata without changing radiance.
meta='litePixRayBudget:job.litePixRayBudget445?.snapshot?.()||null,'
main_meta=meta+'\n        threeDLiteMainCore:window.ThreeDLiteMainCore?.renderStamp?.()||null,'
if 'threeDLiteMainCore:window.ThreeDLiteMainCore?.renderStamp?.()||null' not in s:
    if meta not in s:
        raise SystemExit('release-blocking: Path metadata anchor missing')
    s=s.replace(meta,main_meta,1)
# Synchronize legacy revision evidence at the real Path-render job boundary.
job_anchor='job.litePixRayBudget445=litePixRayBudget445;'
sync=job_anchor+'\n    window.ThreeDLiteMainCore?.syncLegacyRevisions?.();'
if 'window.ThreeDLiteMainCore?.syncLegacyRevisions?.();' not in s:
    if job_anchor not in s:
        raise SystemExit('release-blocking: Path job anchor missing')
    s=s.replace(job_anchor,sync,1)
p.write_text(s,encoding='utf-8')
print('3D Lite Main Core v1 integration applied')
