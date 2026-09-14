from pathlib import Path
import sys

VERSION='3.99.11'

def replace_optional(text, old, new):
    return text.replace(old,new) if old in text else text

def patch(path: Path):
    text=path.read_text(encoding='utf-8')
    original=text

    # UI defaults: low sample adaptive quality profile.
    text=replace_optional(text,'id="rsMinSamples" type="number" min="1" max="4096" value="8"','id="rsMinSamples" type="number" min="1" max="4096" value="2"')
    text=replace_optional(text,'id="rsMaxSamples" type="number" min="1" max="4096" value="64"','id="rsMaxSamples" type="number" min="1" max="4096" value="8"')
    text=replace_optional(text,'id="rsNoise" type="number" min="0" max="1" step=".001" value="0.03"','id="rsNoise" type="number" min="0" max="1" step=".001" value="0.035"')
    text=replace_optional(text,'id="rsBounces" type="number" min="1" max="64" value="5"','id="rsBounces" type="number" min="1" max="64" value="4"')
    text=replace_optional(text,'<select id="rsDenoise"><option selected>Off</option><option>Fast</option><option>Quality</option></select>','<select id="rsDenoise"><option>Off</option><option>Fast</option><option selected>Quality</option></select>')

    # Settings model defaults.
    text=replace_optional(text,
        "this.progressive=true;this.adaptive=true;this.minSamples=8;this.maxSamples=64;this.noiseThreshold=.03;\n    this.maxBounces=5;this.denoise='Off';",
        "this.progressive=true;this.adaptive=true;this.minSamples=2;this.maxSamples=8;this.noiseThreshold=.035;\n    this.maxBounces=4;this.denoise='Quality';")

    # UI read fallbacks.
    text=replace_optional(text,"x.minSamples=Math.max(1,Number(value('rsMinSamples'))||8);","x.minSamples=Math.max(1,Number(value('rsMinSamples'))||2);")
    text=replace_optional(text,"x.maxSamples=Math.max(x.minSamples,Number(value('rsMaxSamples'))||256);","x.maxSamples=Math.max(x.minSamples,Number(value('rsMaxSamples'))||8);")
    text=replace_optional(text,"x.noiseThreshold=Math.max(0,Number(value('rsNoise'))||.025);","x.noiseThreshold=Math.max(0,Number(value('rsNoise'))||.035);")
    text=replace_optional(text,"x.maxBounces=Math.max(1,Number(value('rsBounces'))||5);","x.maxBounces=Math.max(1,Number(value('rsBounces'))||4);")
    text=replace_optional(text,"x.denoise=value('rsDenoise')||'Off';","x.denoise=value('rsDenoise')||'Quality';")

    # Path guiding becomes useful in low-sample renders instead of warming up after they finish.
    text=replace_optional(text,'minSamples:8,\n  maxMix:.45,','minSamples:2,\n  maxMix:.35,')

    # Prefer guiding by default; keep Light Tree opt-in because its build cost only pays off in multi-light scenes.
    text=replace_optional(text,'this.lightTree=false;this.pathGuiding=false;','this.lightTree=false;this.pathGuiding=true;')

    # Preserve detail by making adaptive convergence slightly stricter at very low samples.
    text=replace_optional(text,
        'return this.noise(index)>settings.noiseThreshold;',
        'const lowSampleThreshold=this.samples[index]<4?settings.noiseThreshold*.75:settings.noiseThreshold;\n    return this.noise(index)>lowSampleThreshold;')

    # Version surfaces.
    text=text.replace("legacyVersion:'3.99.9'",f"legacyVersion:'{VERSION}'")
    text=text.replace("legacyVersion:'3.99.10'",f"legacyVersion:'{VERSION}'")
    text=text.replace("const VERSION='3.99.9';",f"const VERSION='{VERSION}';")
    text=text.replace("const VERSION='3.99.10';",f"const VERSION='{VERSION}';")
    text=text.replace("window.ThreeDLiteVersion.version='3.99.9'",f"window.ThreeDLiteVersion.version='{VERSION}'")
    text=text.replace("window.ThreeDLiteVersion.version='3.99.10'",f"window.ThreeDLiteVersion.version='{VERSION}'")
    text=text.replace('// 3DLite Compiled Render Data v3.99.9',f'// 3DLite Compiled Render Data v{VERSION}')
    text=text.replace('// 3DLite Compiled Render Data v3.99.10',f'// 3DLite Compiled Render Data v{VERSION}')

    if text==original:
        raise RuntimeError('low-sample patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} low-sample quality profile')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
        if p.exists(): patch(p)
