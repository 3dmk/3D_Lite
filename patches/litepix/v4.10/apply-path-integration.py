from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Public identity/version.
s,n=re.subn(r'<title>LitePix v4\.09\.0[^<]*</title>','<title>LitePix v4.10.0 Native Path Integration</title>',s,count=1)
if n!=1: raise SystemExit('release-blocking: v4.09 title anchor not found')
s,n=re.subn(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{name:'LitePix',version:'4\.09\.0'\}\);","const LitePixVersion=Object.freeze({name:'LitePix',version:'4.10.0'});",s,count=1)
if n!=1: raise SystemExit('release-blocking: v4.09 LitePixVersion anchor not found')

# Load native path bridge after optimized runtime.
loader='<script src="./litepix/path-integration-v4.10.js"></script>'
if loader not in s:
    anchor='<script src="./litepix/runtime-v4.09.js"></script>'
    if anchor not in s: raise SystemExit('release-blocking: v4.09 runtime loader anchor missing')
    s=s.replace(anchor,anchor+'\n'+loader,1)

# Instantiate the bridge inside the real Group 9 Path GI execution.
old="""    const primaryMask=new Uint8Array(width*height);\n    const perf16=RenderCoreH.attachPerformance(job);"""
new="""    const primaryMask=new Uint8Array(width*height);\n    const litePixPath410=(typeof LitePixPathExecution410==='function')?new LitePixPathExecution410(width,height,{startBlock:32,minBlock:1,maxLevel:6}):null;\n    job.litePixPath410=litePixPath410;\n    const perf16=RenderCoreH.attachPerformance(job);"""
if new not in s:
    if s.count(old)!=1: raise SystemExit(f'release-blocking: path bridge init anchor count={s.count(old)}')
    s=s.replace(old,new,1)

old2="""          accumulator.add(i,sample.radiance);\n          if(pass===0){\n            const ph=sample.primaryHitRecord;"""
new2="""          accumulator.add(i,sample.radiance);\n          const ph=sample.primaryHitRecord;\n          if(litePixPath410)litePixPath410.record(i,x,y,sample,ph,accumulator);\n          if(pass===0){"""
if new2 not in s:
    if s.count(old2)!=1: raise SystemExit(f'release-blocking: path sample hook anchor count={s.count(old2)}')
    s=s.replace(old2,new2,1)

old3="""      completedPasses=pass+1;\n      const rgba=accumulator.resolveRGBA(settings,primaryMask);"""
new3="""      completedPasses=pass+1;\n      const litePixPass410=litePixPath410?litePixPath410.completePass(accumulator):null;\n      job.litePixPathStats410=litePixPass410;\n      const rgba=accumulator.resolveRGBA(settings,primaryMask);"""
if new3 not in s:
    if s.count(old3)!=1: raise SystemExit(f'release-blocking: pass hook anchor count={s.count(old3)}')
    s=s.replace(old3,new3,1)

old4="""        performance:RenderCoreH.performance(job)\n      })\n    };"""
new4="""        performance:RenderCoreH.performance(job),\n        litePixNativePath:litePixPath410?.snapshot?.()||null\n      })\n    };"""
if new4 not in s:
    if s.count(old4)!=1: raise SystemExit(f'release-blocking: metadata hook anchor count={s.count(old4)}')
    s=s.replace(old4,new4,1)

# Keep the bridge alive on the job for diagnostics but free heavy transient storage after the final snapshot.
old5="""    RenderCoreH.markStage(job,'render',renderStart16);\n    if(LiteTraceExecutionContext.performance===perf16){LiteTraceExecutionContext.activeJob=null;LiteTraceExecutionContext.performance=null;}"""
new5="""    RenderCoreH.markStage(job,'render',renderStart16);\n    job.litePixPathStats410=litePixPath410?.snapshot?.()||job.litePixPathStats410||null;\n    if(litePixPath410)litePixPath410.dispose();\n    if(LiteTraceExecutionContext.performance===perf16){LiteTraceExecutionContext.activeJob=null;LiteTraceExecutionContext.performance=null;}"""
if new5 not in s:
    if s.count(old5)!=1: raise SystemExit(f'release-blocking: final path hook anchor count={s.count(old5)}')
    s=s.replace(old5,new5,1)

p.write_text(s,encoding='utf-8')
print('LitePix v4.10 native path integration patch applied')
