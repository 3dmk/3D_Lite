from pathlib import Path
import sys

VERSION='3.99.13'

def replace_required(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing patch target: {label}')
    return text.replace(old,new,1)

def patch(path: Path):
    text=path.read_text(encoding='utf-8')
    original=text
    text=replace_required(text,"      let passPixelDone16=0;\n      await workQueue16.run(async batch=>{","      let passPixelDone16=0;\n      let previewLastMs16=0;\n      let previewFirst16=true;\n      await workQueue16.run(async batch=>{",'live preview state')
    text=replace_required(text,"        job.progress.inPassPercent=Math.round(passRatio16*100);\n        job.progress.tracedPixels=passPixelDone16;\n        job.progress.activePixels=passPixelTotal16;\n        onProgress(overallRatio16);","        job.progress.inPassPercent=Math.round(passRatio16*100);\n        job.progress.tracedPixels=passPixelDone16;\n        job.progress.activePixels=passPixelTotal16;\n        const previewNow16=performance.now();\n        if(previewFirst16||previewNow16-previewLastMs16>=120||passPixelDone16>=passPixelTotal16){\n          previewFirst16=false;\n          previewLastMs16=previewNow16;\n          const previewRGBA16=accumulator.resolveRGBA(settings,primaryMask);\n          job.previewFrame={\n            width,height,rgba:previewRGBA16,\n            metadata:Object.freeze({renderer:'Group 9 Progressive Path GI',livePreview:true,partialPass:true,samplesPerPixel:accumulator.averageSamples(),currentPass:pass+passRatio16,maxSamples,adaptive:!!settings.adaptive,noise:accumulator.averageNoise(),activePixels:accumulator.active,tracedPixels:passPixelDone16,passPixels:passPixelTotal16})\n          };\n        }\n        onProgress(overallRatio16);",'batch live preview')
    text=text.replace('3.99.12', VERSION)
    if 'livePreview:true' not in text or 'partialPass:true' not in text: raise RuntimeError('live pass preview markers missing')
    if text==original: raise RuntimeError('live preview patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} live progressive pass preview')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
        if p.exists(): patch(p)
