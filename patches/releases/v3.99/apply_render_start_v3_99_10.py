from pathlib import Path
import sys

VERSION='3.99.10'

def replace_required(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing patch target: {label}')
    return text.replace(old,new)

def patch(path: Path):
    text=path.read_text(encoding='utf-8')
    original=text
    text=replace_required(text,"const maxDepth=this.maxDepth(job);","const maxDepth=(job?.__renderPass16===0)?Math.min(1,this.maxDepth(job)):this.maxDepth(job);",'first-pass shallow depth')
    text=replace_required(text,"if(bounce===0&&job?.settings?.globalIllumination!==false&&job?.settings?.primaryGI==='Irradiance'&&LightCacheEstimator.cacheable(material)){","if(bounce===0&&(job?.__renderPass16||0)>0&&job?.settings?.globalIllumination!==false&&job?.settings?.primaryGI==='Irradiance'&&LightCacheEstimator.cacheable(material)){",'defer irradiance until after first-light pass')
    text=replace_required(text,"const workQueue16=RenderWorkQueue16.fromIndices(activePixels16,Math.max(32,RenderCoreH.tileSize(job)*4));\n      const passPixelTotal16=Math.max(1,activePixels16.length);","job.__renderPass16=pass;\n      const startupBatch16=pass===0?8:Math.max(16,RenderCoreH.tileSize(job)*2);\n      const workQueue16=RenderWorkQueue16.fromIndices(activePixels16,startupBatch16);\n      const passPixelTotal16=Math.max(1,activePixels16.length);\n      if(pass===0){job.progress.status='First light';job.progress.inPassPercent=0;job.progress.tracedPixels=0;onProgress(0);await new Promise(r=>setTimeout(r,0));}",'first-light batch scheduling')
    text=replace_required(text,"job.progress.currentSamples=pass;\n        job.progress.maximumSamples=maxSamples;","job.progress.currentSamples=pass;\n        job.progress.maximumSamples=maxSamples;\n        if(pass===0&&passPixelDone16>0)job.progress.status='Rendering first rays';",'first-ray progress status')
    text=text.replace('3.99.9', VERSION)
    for token in ["const maxDepth=this.maxDepth(job);","const workQueue16=RenderWorkQueue16.fromIndices(activePixels16,Math.max(32,RenderCoreH.tileSize(job)*4));"]:
        if token in text: raise RuntimeError(f'old startup token remains: {token}')
    if text==original: raise RuntimeError('startup patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} fast first-light startup')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
        if p.exists(): patch(p)
