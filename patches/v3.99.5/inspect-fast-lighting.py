from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
needles=['RenderPart4Core=','const RenderPart4Core','var RenderPart4Core','evaluate(job,acceleration,compiled','DirectLightSampler=','const DirectLightSampler','var DirectLightSampler','PhysicalBSDF=','const PhysicalBSDF','SurfaceInterpolator=','const SurfaceInterpolator','acceleration.trace(','traceShadow','visibility']
out=[]
for n in needles:
    out.append('\n### '+n)
    start=0; hits=0
    while True:
        i=s.find(n,start)
        if i<0: break
        hits+=1
        line=s.count('\n',0,i)+1
        out.append(f'-- hit {hits} line {line} --')
        out.append(s[max(0,i-1300):min(len(s),i+len(n)+4300)])
        start=i+len(n)
        if hits>=8: break
    out.append('hits '+str(hits))
Path('patches/v3.99.5/fast-lighting-inspection.txt').write_text('\n'.join(out),encoding='utf-8')
