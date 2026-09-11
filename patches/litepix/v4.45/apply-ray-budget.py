from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
# identity
s=s.replace('<title>3D Lite — LitePix v4.44.0 Legacy Migration</title>','<title>3D Lite — LitePix v4.45.0 Adaptive Ray Budget</title>',1)
s,n=re.subn(r"(const\s+LitePixVersion=Object\.freeze\(\{name:'LitePix',version:)'4\.44\.0'",r"\g<1>'4.45.0'",s,count=1)
if n!=1 and "version:'4.45.0'" not in s: raise SystemExit('release-blocking: central LitePix version anchor missing')
# load v4.45 after v4.44, so it takes title ownership from the compatibility bridge
old='<script src="./litepix/legacy-migration-v4.44.js"></script>'
new=old+'\n<script src="./litepix/core5-ray-budget-v4.45.js"></script>'
if 'core5-ray-budget-v4.45.js' not in s:
    if old not in s: raise SystemExit('release-blocking: v4.44 loader missing')
    s=s.replace(old,new,1)
# patch only the current Group9 direct-MIS implementation
start=s.find('const Group9DirectMIS=Object.freeze')
end=s.find('const LightCachePolicy=Object.freeze',start)
if start<0 or end<0: raise SystemExit('release-blocking: Group9DirectMIS anchors missing')
g=s[start:end]
old_count='const count=DirectLightingIntegrator.samplesFor(light,job.settings);'
new_count="const requestedCount=DirectLightingIntegrator.samplesFor(light,job.settings);\n      const count=job.litePixRayBudget445?.samplesFor?.(light,requestedCount)??requestedCount;"
if 'requestedCount=DirectLightingIntegrator.samplesFor' not in g:
    if g.count(old_count)!=1: raise SystemExit('release-blocking: Group9 sample-count anchor mismatch')
    g=g.replace(old_count,new_count,1)
old_vis='if(!ShadowVisibility.visible(acceleration,hit.position,sample.direction,sample.distance))continue;'
new_vis="const visible445=job.litePixRayBudget445?.visible?.(acceleration,hit.position,sample.direction,sample.distance,light,li,hit,()=>ShadowVisibility.visible(acceleration,hit.position,sample.direction,sample.distance))??ShadowVisibility.visible(acceleration,hit.position,sample.direction,sample.distance);\n          if(!visible445)continue;"
if 'const visible445=job.litePixRayBudget445' not in g:
    if g.count(old_vis)!=1: raise SystemExit('release-blocking: Group9 shadow visibility anchor mismatch')
    g=g.replace(old_vis,new_vis,1)
s=s[:start]+g+s[end:]
# Path renderer always owns the budget object so baseline/off runs retain telemetry.
anchor='job.pathGuide=RenderCoreH.createPathGuide(job,acceleration);'
insert=anchor+"\n    const litePixRayBudget445=(typeof window.LitePixRayBudget445==='function')?new window.LitePixRayBudget445(job,acceleration,compiled,width,height):null;\n    job.litePixRayBudget445=litePixRayBudget445;"
if 'job.litePixRayBudget445=litePixRayBudget445' not in s:
    if anchor not in s: raise SystemExit('release-blocking: Path guide anchor missing')
    s=s.replace(anchor,insert,1)
# expose telemetry in final Path metadata
meta='litePixLegacyMigration:window.LitePixLegacyMigration444?.audit?.()||null,'
meta2=meta+'\n        litePixRayBudget:job.litePixRayBudget445?.snapshot?.()||null,'
if 'litePixRayBudget:job.litePixRayBudget445' not in s:
    if meta not in s: raise SystemExit('release-blocking: Path metadata anchor missing')
    s=s.replace(meta,meta2,1)
p.write_text(s,encoding='utf-8')
print('3D Lite / LitePix v4.45 adaptive ray budget applied')
