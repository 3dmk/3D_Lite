from pathlib import Path
import sys

VERSION='3.99.18'

def patch(path:Path):
    text=path.read_text(encoding='utf-8')
    original=text
    old="camera.position.set(270,-390,230);if(controls?.target){controls.target.set(0,10,42);controls.update();}else camera.lookAt(0,10,42);"
    new="camera.position.set(270,-390,230);if(orbit?.target){orbit.target.set(0,10,42);orbit.update();}else camera.lookAt(0,10,42);"
    if old not in text: raise RuntimeError('v3.99.17 camera target line missing')
    text=text.replace(old,new,1)
    text=text.replace("for(const old of [...objects]) if(old?.userData?.defaultRenderScene39915||old?.userData?.defaultRenderScene39916)","for(const old of [...objects]) if(old?.userData?.defaultRenderScene39915||old?.userData?.defaultRenderScene39916||old?.userData?.defaultRenderScene39917)",1)
    text=text.replace("window.__3DLiteDefaultRenderScene39917", "window.__3DLiteDefaultRenderScene39918")
    text=text.replace("defaultRenderScene39917:true", "defaultRenderScene39918:true")
    text=text.replace("bootDefaultRenderScene39917", "bootDefaultRenderScene39918")
    text=text.replace("v3.99.17 reliable render-ready default scene", "v3.99.18 render-ready default scene camera fix")
    text=text.replace("v3.99.17 default scene failed", "v3.99.18 default scene failed")
    text=text.replace('3.99.17',VERSION)
    if 'controls?.target' in text: raise RuntimeError('stale controls camera target remains')
    for token in ['orbit?.target','defaultRenderScene39918','Render Ground','Render Box','Render Sphere','Render Pyramid','Fast Clean Key','Fast Clean Fill','3.99.18']:
        if token not in text: raise RuntimeError('missing marker '+token)
    if text==original: raise RuntimeError('patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION}')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
