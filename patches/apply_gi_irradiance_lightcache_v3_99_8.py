from pathlib import Path
import sys

VERSION='3.99.8'

def replace_required(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing patch target: {label}')
    return text.replace(old, new)

def patch(path: Path):
    text=path.read_text(encoding='utf-8')
    original=text

    text=replace_required(text,
        '<div class="render-row"><label>Primary GI</label><select id="rsPrimaryGI"><option>Brute Force</option></select></div>',
        '<div class="render-row"><label>Primary GI</label><select id="rsPrimaryGI"><option selected>Irradiance</option></select></div>',
        'primary GI UI')
    text=replace_required(text,
        '<div class="render-row"><label>Secondary GI</label><select id="rsSecondaryGI"><option>None</option><option>Brute Force</option><option selected>Light Cache</option></select></div>',
        '<div class="render-row"><label>Secondary GI</label><select id="rsSecondaryGI"><option>None</option><option selected>Light Cache</option></select></div>',
        'secondary GI UI')

    text=replace_required(text,
        "this.globalIllumination=true;this.primaryGI='Brute Force';this.secondaryGI='Brute Force';",
        "this.globalIllumination=true;this.primaryGI='Irradiance';this.secondaryGI='Light Cache';",
        'settings defaults')
    text=replace_required(text,
        "x.primaryGI=value('rsPrimaryGI')||'Brute Force';",
        "x.primaryGI=value('rsPrimaryGI')||'Irradiance';",
        'settings read primary')
    text=replace_required(text,
        "x.primaryGI='Brute Force';x.secondaryGI=['None','Brute Force','Light Cache'].includes(x.secondaryGI)?x.secondaryGI:'Brute Force';",
        "x.primaryGI='Irradiance';x.secondaryGI=['None','Light Cache'].includes(x.secondaryGI)?x.secondaryGI:'Light Cache';",
        'settings sanitizer')

    text=replace_required(text,
        "  const deferred=['rsPrimaryGI'];\n  for(const id of deferred){\n    const el=document.getElementById(id);\n    if(el){el.disabled=true;el.title='Deferred to a later renderer group';}\n  }\n  for(const id of ['rsGI','rsSecondaryGI','rsBounces','rsProgressive','rsAdaptive','rsMinSamples','rsMaxSamples','rsNoise','rsDenoise','rsToneMap','rsExposure','rsLightTree','rsPathGuiding']){",
        "  const deferred=[];\n  for(const id of deferred){\n    const el=document.getElementById(id);\n    if(el){el.disabled=true;el.title='Deferred to a later renderer group';}\n  }\n  for(const id of ['rsGI','rsPrimaryGI','rsSecondaryGI','rsBounces','rsProgressive','rsAdaptive','rsMinSamples','rsMaxSamples','rsNoise','rsDenoise','rsToneMap','rsExposure','rsLightTree','rsPathGuiding']){",
        'GI control enabled state')

    text=replace_required(text,
        "job.lightCache=LightCacheEstimator.enabled(job)?new RenderLightCache(job,acceleration):null;",
        "job.lightCache=(settings.primaryGI==='Irradiance'||LightCacheEstimator.enabled(job))?new RenderLightCache(job,acceleration):null;",
        'cache creation')
    text=replace_required(text,
        "job.progress.gi=settings.secondaryGI==='Light Cache'?'Brute Force + Light Cache':settings.secondaryGI;",
        "job.progress.gi=settings.globalIllumination===false?'Off':(settings.secondaryGI==='Light Cache'?'Irradiance + Light Cache':'Irradiance');",
        'progress GI label')

    marker="""      if(previousGuide&&job.pathGuide){\n        const w=Math.max(0,.2126*safeDirect[0]+.7152*safeDirect[1]+.0722*safeDirect[2]);\n        job.pathGuide.record(previousGuide.position,previousGuide.normal,previousGuide.direction,w);\n      }\n\n      if(bounce>=1){"""
    replacement="""      if(previousGuide&&job.pathGuide){\n        const w=Math.max(0,.2126*safeDirect[0]+.7152*safeDirect[1]+.0722*safeDirect[2]);\n        job.pathGuide.record(previousGuide.position,previousGuide.normal,previousGuide.direction,w);\n      }\n\n      // Primary GI: Irradiance cache/probe estimate at the first diffuse-dominant hit.\n      // This replaces the former brute-force-only primary GI policy while preserving\n      // specular/transmission continuation for materials that require path transport.\n      if(bounce===0&&job?.settings?.globalIllumination!==false&&job?.settings?.primaryGI==='Irradiance'&&LightCacheEstimator.cacheable(material)){\n        const irradianceTail=LightCacheEstimator.estimate(job,acceleration,compiled,hit,n,material,pixelSeed^0x6D2B79F5,bounce);\n        if(irradianceTail){\n          radiance=RenderColor.add(radiance,RenderColor.mul(throughput,this.safeColor(irradianceTail)));\n          const diffuseDominant=(material.metalness||0)<.5&&(material.transmission||0)<.05&&(material.roughness||1)>.18;\n          if(diffuseDominant)break;\n        }\n      }\n\n      if(bounce>=1){"""
    text=replace_required(text,marker,replacement,'primary Irradiance integrator')

    text=replace_required(text,
        "        secondaryGI:settings.secondaryGI,",
        "        primaryGI:settings.primaryGI,\n        secondaryGI:settings.secondaryGI,",
        'path metadata primary GI')
    text=replace_required(text,
        "      estimator:'Brute Force + direct NEE',",
        "      estimator:'Irradiance cache + direct NEE + Light Cache',",
        'path diagnostics estimator')

    text=text.replace(
        "expect(LightCacheEstimator.enabled({settings:{globalIllumination:true,secondaryGI:'Brute Force'}})===false,\n      'Brute Force incorrectly enabled Light Cache');",
        "expect(LightCacheEstimator.enabled({settings:{globalIllumination:true,secondaryGI:'None'}})===false,\n      'Secondary GI None incorrectly enabled Light Cache');")
    text=text.replace(
        "'Fast mode is direct-only; Path mode is brute-force GI plus direct NEE.',",
        "'Fast mode is direct-only; Path mode uses Irradiance primary GI, Light Cache secondary GI, and direct NEE.',")

    text=text.replace("legacyVersion:'3.99.6'", f"legacyVersion:'{VERSION}'")
    text=text.replace("const VERSION='3.99.6';", f"const VERSION='{VERSION}';")
    text=text.replace("window.ThreeDLiteVersion.version='3.99.1'", f"window.ThreeDLiteVersion.version='{VERSION}'")
    text=text.replace("ThreeDLiteRenderDataCode3991={version:'3.99.1'", f"ThreeDLiteRenderDataCode3991={{version:'{VERSION}'")
    text=text.replace("// 3DLite Compiled Render Data v3.99.1", f"// 3DLite Compiled Render Data v{VERSION}")

    critical=[
      "<option>Brute Force</option>",
      "this.primaryGI='Brute Force'",
      "x.primaryGI='Brute Force'",
      "'Brute Force + Light Cache'"
    ]
    for token in critical:
        if token in text:
            raise RuntimeError(f'legacy GI token remains in critical runtime: {token}')

    if text==original:
        raise RuntimeError('patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} Irradiance + Light Cache')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
        if p.exists(): patch(p)
