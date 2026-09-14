from pathlib import Path
import sys

VERSION='3.99.9'

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

    marker="""      if(previousGuide&&job.pathGuide){
        const w=Math.max(0,.2126*safeDirect[0]+.7152*safeDirect[1]+.0722*safeDirect[2]);
        job.pathGuide.record(previousGuide.position,previousGuide.normal,previousGuide.direction,w);
      }

      if(bounce>=1){"""
    replacement="""      if(previousGuide&&job.pathGuide){
        const w=Math.max(0,.2126*safeDirect[0]+.7152*safeDirect[1]+.0722*safeDirect[2]);
        job.pathGuide.record(previousGuide.position,previousGuide.normal,previousGuide.direction,w);
      }

      // Primary GI: Irradiance cache/probe estimate at the first diffuse-dominant hit.
      if(bounce===0&&job?.settings?.globalIllumination!==false&&job?.settings?.primaryGI==='Irradiance'&&LightCacheEstimator.cacheable(material)){
        const irradianceTail=LightCacheEstimator.estimate(job,acceleration,compiled,hit,n,material,pixelSeed^0x6D2B79F5,bounce);
        if(irradianceTail){
          radiance=RenderColor.add(radiance,RenderColor.mul(throughput,this.safeColor(irradianceTail)));
          const diffuseDominant=(material.metalness||0)<.5&&(material.transmission||0)<.05&&(material.roughness||1)>.18;
          if(diffuseDominant)break;
        }
      }

      if(bounce>=1){"""
    text=replace_required(text,marker,replacement,'primary Irradiance integrator')

    text=replace_required(text,
        "        secondaryGI:settings.secondaryGI,",
        "        primaryGI:settings.primaryGI,\n        secondaryGI:settings.secondaryGI,",
        'path metadata primary GI')
    text=replace_required(text,
        "      estimator:'Brute Force + direct NEE',",
        "      estimator:'Irradiance cache + direct NEE + Light Cache',",
        'path diagnostics estimator')

    text=replace_required(text,
        "job.progress.percent=Math.max(0,Math.min(95,Math.round(ratio*95)));",
        "job.progress.percent=Math.max(0,Math.min(20,Math.round(ratio*20)));",
        'geometry progress range')
    text=replace_required(text,
        "job.status=RenderJobStatus.PREPARING;job.progress.status=RenderJobStatus.PREPARING;job.progress.percent=96;this.onProgress(job.progress.snapshot());",
        "job.status=RenderJobStatus.PREPARING;job.progress.status=RenderJobStatus.PREPARING;job.progress.percent=20;this.onProgress(job.progress.snapshot());",
        'render handoff progress')
    text=replace_required(text,
        "job.progress.percent=96+Math.round(ratio*4);",
        "job.progress.percent=20+Math.round(Math.max(0,Math.min(1,ratio))*79);",
        'render progress range')

    old_queue="""      const workQueue16=RenderWorkQueue16.fromIndices(activePixels16,Math.max(32,RenderCoreH.tileSize(job)*4));
      await workQueue16.run(async batch=>{
        for(const i of batch){
          if(job.cancelled||job.controlToken16?.cancelled?.())throw Object.assign(new Error('Render job cancelled'),{cancelled:true});
          const x=i%width,y=(i/width)|0;
          const seed=((i+1)^Math.imul(pass+1,0x9E3779B1))>>>0;
          const jitterX=PathSampler.scalar(seed,pass,20)-.5;
          const jitterY=PathSampler.scalar(seed,pass,21)-.5;
          const ray=RenderPart5Core.ray(
            job.renderScene.camera,
            rr.x0+x+jitterX,rr.y0+y+jitterY,
            rr.fullW,rr.fullH
          );
          perf16.addRay(RenderRayType.CAMERA);
          const sample=RenderPart5Core.trace(job,acceleration,compiled,ray,seed);
          perf16.samples++;
          primaryMask[i]|=sample.primaryHit?1:0;
          accumulator.add(i,sample.radiance);
          const ph=sample.primaryHitRecord;
          if(litePixPath410)litePixPath410.record(i,x,y,sample,ph,accumulator);
          if(litePixCore3Production423)litePixCore3Production423.recordPrimary(i,x,y,ray,sample,ph,job,compiled,acceleration);
          if(litePixCores4to8Production443)litePixCores4to8Production443.record(i,x,y,sample,ph,accumulator);
          if(pass===0){
            if(ph?.hit)RenderAOVUtil.writePrimary(aovs,i,RenderAOVUtil.primary(job,acceleration,compiled,ray,ph,seed));
            else RenderAOVUtil.writePrimary(aovs,i,null);
          }
          sampledThisPass++;
        }
        perf16.yields++;
        await new Promise(r=>setTimeout(r,0));
      });"""
    new_queue="""      const workQueue16=RenderWorkQueue16.fromIndices(activePixels16,Math.max(32,RenderCoreH.tileSize(job)*4));
      const passPixelTotal16=Math.max(1,activePixels16.length);
      let passPixelDone16=0;
      await workQueue16.run(async batch=>{
        for(const i of batch){
          if(job.cancelled||job.controlToken16?.cancelled?.())throw Object.assign(new Error('Render job cancelled'),{cancelled:true});
          const x=i%width,y=(i/width)|0;
          const seed=((i+1)^Math.imul(pass+1,0x9E3779B1))>>>0;
          const jitterX=PathSampler.scalar(seed,pass,20)-.5;
          const jitterY=PathSampler.scalar(seed,pass,21)-.5;
          const ray=RenderPart5Core.ray(
            job.renderScene.camera,
            rr.x0+x+jitterX,rr.y0+y+jitterY,
            rr.fullW,rr.fullH
          );
          perf16.addRay(RenderRayType.CAMERA);
          const sample=RenderPart5Core.trace(job,acceleration,compiled,ray,seed);
          perf16.samples++;
          primaryMask[i]|=sample.primaryHit?1:0;
          accumulator.add(i,sample.radiance);
          const ph=sample.primaryHitRecord;
          if(litePixPath410)litePixPath410.record(i,x,y,sample,ph,accumulator);
          if(litePixCore3Production423)litePixCore3Production423.recordPrimary(i,x,y,ray,sample,ph,job,compiled,acceleration);
          if(litePixCores4to8Production443)litePixCores4to8Production443.record(i,x,y,sample,ph,accumulator);
          if(pass===0){
            if(ph?.hit)RenderAOVUtil.writePrimary(aovs,i,RenderAOVUtil.primary(job,acceleration,compiled,ray,ph,seed));
            else RenderAOVUtil.writePrimary(aovs,i,null);
          }
          sampledThisPass++;
        }
        passPixelDone16+=batch.length;
        const passRatio16=Math.min(1,passPixelDone16/passPixelTotal16);
        const overallRatio16=Math.min(1,(pass+passRatio16)/Math.max(1,passLimit));
        job.progress.currentSamples=pass;
        job.progress.maximumSamples=maxSamples;
        job.progress.inPassPercent=Math.round(passRatio16*100);
        job.progress.tracedPixels=passPixelDone16;
        job.progress.activePixels=passPixelTotal16;
        onProgress(overallRatio16);
        perf16.yields++;
        await new Promise(r=>setTimeout(r,0));
      });"""
    text=replace_required(text,old_queue,new_queue,'path in-pass progress')

    text=replace_required(text,
        "job.progress.gi=(job.settings.engine==='path'&&job.settings.globalIllumination)\n        ? `Path GI • ${PathIntegrator.maxDepth(job)} bounces`\n        : 'Direct';",
        "job.progress.gi=(job.settings.engine==='path'&&job.settings.globalIllumination)\n        ? `${job.settings.primaryGI||'Irradiance'} + ${job.settings.secondaryGI||'Light Cache'} • ${PathIntegrator.maxDepth(job)} bounces`\n        : 'Direct';",
        'controller GI label')

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
      "'Brute Force + Light Cache'",
      "job.progress.percent=96+Math.round(ratio*4)",
      "job.progress.percent=96;this.onProgress"
    ]
    for token in critical:
        if token in text:
            raise RuntimeError(f'legacy renderer token remains in critical runtime: {token}')

    if text==original:
        raise RuntimeError('patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} Irradiance + Light Cache + live path progress')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
        if p.exists(): patch(p)
