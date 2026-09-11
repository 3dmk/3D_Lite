from pathlib import Path
p=Path('index.html')
s=p.read_text(errors='ignore')

s=s.replace("const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.98.3'});","const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.98.4'});",1)
s=s.replace('3DLite v3.98.3 — Central Public Version Synchronizer','3DLite v3.98.4 — Central Public Version Synchronizer',1)
s=s.replace('<title>3DLite v3.98.3 Light Energy Normalization</title>','<title>3DLite v3.98.4 Adaptive Render Code Export</title>',1)
if '<title>3DLite v3.98.4 Adaptive Render Code Export</title>' not in s:
    import re
    s=re.sub(r'<title>3DLite v[^<]+</title>','<title>3DLite v3.98.4 Adaptive Render Code Export</title>',s,count=1)

marker='window.__3DLiteAdaptiveRenderCodeExport3984=true;'
if marker not in s:
    block=r'''
<script id="__3DLiteAdaptiveRenderCodeExport3984">
(function(){
  'use strict';
  const VERSION='3.98.4';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
  const safe=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;

  const AdaptiveRenderLearningController=Object.freeze({
    version:VERSION,
    score(sample={}){
      const noise=clamp(safe(sample.noise,1),0,1);
      const uncertainty=clamp(safe(sample.uncertainty,1),0,1);
      const contribution=clamp(safe(sample.expectedContribution,1),0,1);
      const success=clamp(safe(sample.historicalSuccess,1),0,1);
      const visual=clamp(safe(sample.visualImportance,1),0,1);
      const material=clamp(safe(sample.materialNeed,1),0,1);
      const passNeed=clamp(safe(sample.passNeed,1),0,1);
      const cost=Math.max(.001,safe(sample.estimatedCost,1));
      return clamp((noise*uncertainty*contribution*success*visual*material*passNeed)/cost,0,1);
    },
    passDecay(pass=1,maxPasses=64){
      const p=Math.max(1,safe(pass,1)),m=Math.max(1,safe(maxPasses,64));
      const t=clamp((p-1)/Math.max(1,m-1),0,1);
      return clamp(1-(.9*Math.pow(t,.72)),.10,1);
    },
    nextStrategy(feedback={}){
      const pass=Math.max(1,safe(feedback.pass,1));
      const maxPasses=Math.max(pass,safe(feedback.maxPasses,64));
      const noise=clamp(safe(feedback.noise,1),0,1);
      const stable=clamp(safe(feedback.stablePixelRatio,0),0,1);
      const useful=clamp(safe(feedback.usefulRayRatio,1),0.05,1);
      const efficiency=Math.max(0,safe(feedback.efficiency,1));
      const decay=this.passDecay(pass,maxPasses);
      const unresolved=clamp(1-stable,0.02,1);
      const efficiencyScale=efficiency>0?clamp(.65+Math.min(.35,efficiency),.65,1):.65;
      const rayBudget=clamp(decay*(.35+.65*noise)*unresolved*(.65+.35*useful)*efficiencyScale,.05,1);
      return Object.freeze({
        pass, maxPasses, rayBudget,
        activePixelRatio:unresolved,
        tilePriority:'noise-descending',
        lightSampling:noise<.18?'importance-reservoir':'importance',
        shadowBudget:clamp(rayBudget*(noise>.25?1:.65),.05,1),
        bounceBudget:clamp(rayBudget*(useful<.35?.65:1),.05,1),
        reflectionBudget:clamp(rayBudget*(safe(feedback.reflectionNoise,noise)>.15?1:.55),.05,1),
        giBudget:clamp(rayBudget*(safe(feedback.giNoise,noise)>.15?1:.55),.05,1),
        reusePrimaryHits:true,
        reuseGBuffer:true,
        reuseLightVisibility:true,
        convergenceSkipThreshold:clamp(.0025+(pass/maxPasses)*.0125,.0025,.015),
        denoiseAssist:pass>=Math.max(4,Math.floor(maxPasses*.25)),
        learningMode:'quality-per-millisecond'
      });
    },
    capture(job=null){
      const j=job||window.RenderFramework?.jobs?.activeJob||window.RenderFramework?.jobs?.lastJob||null;
      const p=j?.progress||{};
      const perf=j?.performance||j?.metrics||{};
      const pass=safe(p.currentSamples||p.currentPass||perf.samples,1);
      const maxPasses=safe(p.maximumSamples||j?.settings?.samples,64);
      return Object.freeze({
        pass,maxPasses,
        noise:clamp(safe(p.noise,1),0,1),
        stablePixelRatio:clamp(safe(j?.adaptiveLearning?.stablePixelRatio,0),0,1),
        usefulRayRatio:clamp(safe(j?.adaptiveLearning?.usefulRayRatio,1),0,1),
        efficiency:safe(j?.adaptiveLearning?.efficiency,1),
        reflectionNoise:safe(j?.adaptiveLearning?.reflectionNoise,p.noise),
        giNoise:safe(j?.adaptiveLearning?.giNoise,p.noise)
      });
    },
    preview(job=null){const f=this.capture(job);return Object.freeze({feedback:f,strategy:this.nextStrategy(f)});}
  });
  window.L3NAdaptiveRenderLearningController=AdaptiveRenderLearningController;

  function compiledSource(){
    return `/* 3DLite v${VERSION} — L3N Adaptive Render Learning Controller\n   Copyable reference implementation for progressive self-optimization. */\n\n`+
`const L3NAdaptiveRenderLearningController = (() => {\n`+
`  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));\n`+
`  const safe=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;\n\n`+
`  function workScore(s={}) {\n`+
`    const cost=Math.max(.001,safe(s.estimatedCost,1));\n`+
`    return clamp((safe(s.noise,1)*safe(s.uncertainty,1)*safe(s.expectedContribution,1)*safe(s.historicalSuccess,1)*safe(s.visualImportance,1)*safe(s.materialNeed,1)*safe(s.passNeed,1))/cost,0,1);\n`+
`  }\n\n`+
`  function passDecay(pass=1,maxPasses=64) {\n`+
`    const t=clamp((Math.max(1,pass)-1)/Math.max(1,maxPasses-1),0,1);\n`+
`    return clamp(1-(.9*Math.pow(t,.72)),.10,1);\n`+
`  }\n\n`+
`  function analyzeConvergence(f){ return {noise:clamp(safe(f.noise,1),0,1), stable:clamp(safe(f.stablePixelRatio,0),0,1)}; }\n`+
`  function analyzeLights(f){ return {useful:clamp(safe(f.usefulLightRatio,1),.05,1), visibilityReuse:true, reservoir:true}; }\n`+
`  function analyzePaths(f){ return {useful:clamp(safe(f.usefulRayRatio,1),.05,1), reflectionNoise:safe(f.reflectionNoise,f.noise), giNoise:safe(f.giNoise,f.noise)}; }\n`+
`  function analyzeMaterials(f){ return {need:clamp(safe(f.materialNeed,1),.05,1)}; }\n`+
`  function analyzeEfficiency(f){ return {value:Math.max(0,safe(f.efficiency,1)), qualityPerMs:safe(f.qualityGain,0)/Math.max(1,safe(f.renderMs,1))}; }\n\n`+
`  function buildNextRenderStrategy(feedback={}) {\n`+
`    const pass=Math.max(1,safe(feedback.pass,1));\n`+
`    const maxPasses=Math.max(pass,safe(feedback.maxPasses,64));\n`+
`    const c=analyzeConvergence(feedback), l=analyzeLights(feedback), p=analyzePaths(feedback), m=analyzeMaterials(feedback), e=analyzeEfficiency(feedback);\n`+
`    const unresolved=clamp(1-c.stable,.02,1);\n`+
`    const decay=passDecay(pass,maxPasses);\n`+
`    const rayBudget=clamp(decay*(.35+.65*c.noise)*unresolved*(.65+.35*p.useful)*(.65+.35*clamp(e.value,0,1)),.05,1);\n`+
`    return {pass,maxPasses,rayBudget,activePixelRatio:unresolved,tilePriority:'noise-descending',lightSampling:c.noise<.18?'importance-reservoir':'importance',shadowBudget:clamp(rayBudget*(c.noise>.25?1:.65),.05,1),bounceBudget:clamp(rayBudget*(p.useful<.35?.65:1),.05,1),reflectionBudget:clamp(rayBudget*(p.reflectionNoise>.15?1:.55),.05,1),giBudget:clamp(rayBudget*(p.giNoise>.15?1:.55),.05,1),reusePrimaryHits:true,reuseGBuffer:true,reuseLightVisibility:true,convergenceSkipThreshold:clamp(.0025+(pass/maxPasses)*.0125,.0025,.015),denoiseAssist:pass>=Math.max(4,Math.floor(maxPasses*.25)),learningMode:'quality-per-millisecond'};\n`+
`  }\n\n`+
`  return Object.freeze({workScore,passDecay,analyzeConvergence,analyzeLights,analyzePaths,analyzeMaterials,analyzeEfficiency,buildNextRenderStrategy});\n`+
`})();\n`;
  }

  const state={panel:null,textarea:null};
  function ensureUI(){
    const win=document.getElementById('renderFrameWindow');
    if(!win)return false;
    let btn=document.getElementById('l3nAdaptiveCodeBtn3984');
    if(!btn){
      const title=win.querySelector('.render-title');
      btn=document.createElement('button');
      btn.id='l3nAdaptiveCodeBtn3984';btn.type='button';btn.textContent='Adaptive Code';btn.title='Open copyable L3N adaptive render controller code';
      btn.style.cssText='margin-left:4px;padding:2px 7px;font-size:11px;';
      const close=title?.querySelector('[data-render-close="frame"]');
      if(title)title.insertBefore(btn,close||null);
      btn.addEventListener('click',open);
    }
    let panel=document.getElementById('l3nAdaptiveCodePanel3984');
    if(!panel){
      panel=document.createElement('div');panel.id='l3nAdaptiveCodePanel3984';
      panel.style.cssText='display:none;position:absolute;left:12px;right:12px;top:44px;bottom:12px;z-index:45;background:#181818;border:1px solid #555;box-shadow:0 8px 28px rgba(0,0,0,.6);padding:8px;min-width:360px;min-height:180px;';
      panel.innerHTML='<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font:12px sans-serif;color:#ddd"><b style="margin-right:auto">L3N Adaptive Render Learning — Compiled Code v'+VERSION+'</b><button type="button" id="l3nAdaptiveCodeRefresh3984">Refresh</button><button type="button" id="l3nAdaptiveCodeSelect3984">Select All</button><button type="button" id="l3nAdaptiveCodeCopy3984">Copy All</button><button type="button" id="l3nAdaptiveCodeClose3984">Close</button></div><textarea id="l3nAdaptiveCodeText3984" spellcheck="false" readonly style="width:100%;height:calc(100% - 34px);resize:none;background:#101010;color:#d8d8d8;border:1px solid #444;padding:9px;font:11px/1.45 Consolas,monospace;user-select:text;white-space:pre;overflow:auto"></textarea>';
      win.appendChild(panel);
      document.getElementById('l3nAdaptiveCodeRefresh3984')?.addEventListener('click',refresh);
      document.getElementById('l3nAdaptiveCodeSelect3984')?.addEventListener('click',selectAll);
      document.getElementById('l3nAdaptiveCodeCopy3984')?.addEventListener('click',copyAll);
      document.getElementById('l3nAdaptiveCodeClose3984')?.addEventListener('click',close);
    }
    state.panel=panel;state.textarea=document.getElementById('l3nAdaptiveCodeText3984');
    if(state.textarea&&!state.textarea.value)state.textarea.value=compiledSource();
    return true;
  }
  function refresh(){ensureUI();if(state.textarea)state.textarea.value=compiledSource();return state.textarea?.value||'';}
  function open(){ensureUI();refresh();state.panel.style.display='block';state.textarea?.focus();return true;}
  function close(){ensureUI();state.panel.style.display='none';return true;}
  function selectAll(){ensureUI();state.textarea?.focus();state.textarea?.select();return state.textarea?.value||'';}
  async function copyAll(){
    const text=refresh();
    try{await navigator.clipboard.writeText(text);return true;}catch(_){selectAll();try{return document.execCommand('copy');}catch(__){return false;}}
  }
  function toggle(){ensureUI();return state.panel.style.display==='none'?open():close();}
  window.ThreeDLiteAdaptiveRenderCode3984=Object.freeze({version:VERSION,open,close,toggle,refresh,selectAll,copyAll,source:compiledSource,preview:(job=null)=>AdaptiveRenderLearningController.preview(job)});
  window.__3DLiteAdaptiveRenderCodeExport3984=true;
  const init=()=>{try{ensureUI();}catch(_){}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
</script>
'''
    if '</body>' not in s:
        raise SystemExit('missing </body> anchor')
    s=s.replace('</body>',block+'\n</body>',1)

assert "version:'3.98.4'" in s
assert 'l3nAdaptiveCodeBtn3984' in s
assert 'l3nAdaptiveCodeText3984' in s
assert 'buildNextRenderStrategy' in s
assert marker in s
p.write_text(s)
print('patched v3.98.4 adaptive render code export UI')
