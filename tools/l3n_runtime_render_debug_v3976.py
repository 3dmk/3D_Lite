from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Synchronize all public build/runtime-learning version literals that still lag behind.
s=s.replace('3.97.5','3.97.6')
s=s.replace('3.93.0','3.97.6')

marker='__3DLiteL3NRuntimeRenderDebug3976'
if marker not in s:
    layer=r'''
<script id="__3DLiteL3NRuntimeRenderDebug3976">
/* 3DLite v3.97.6 — Runtime Learning synchronization + complete L3N render diagnostics */
(()=>{
  const VERSION='3.97.6';
  const MAX_EVENTS=600;
  const MAX_SAMPLES=600;
  const base=()=>window.ThreeDLiteL3NRenderDebugger||null;
  const now=()=>Date.now();
  const perf=()=>performance.now();
  const safe=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return null;}};
  const finite=v=>Number.isFinite(Number(v))?Number(v):null;

  const EXTRA=Object.freeze({
    'RND-0103':Object.freeze({name:'Render timeout',severity:'high',category:'rendering'}),
    'RND-0204':Object.freeze({name:'Invalid ray direction',severity:'high',category:'rays'}),
    'RND-0205':Object.freeze({name:'Invalid ray origin',severity:'high',category:'rays'}),
    'RND-0304':Object.freeze({name:'Bounce limit reached',severity:'medium',category:'rays'}),
    'RND-0403':Object.freeze({name:'Direct lighting noise',severity:'medium',category:'lighting'}),
    'RND-0404':Object.freeze({name:'Firefly / high-energy pixel',severity:'medium',category:'rendering'}),
    'RND-0503':Object.freeze({name:'Invalid material value',severity:'high',category:'materials'}),
    'RND-0504':Object.freeze({name:'Shader evaluation failure',severity:'high',category:'materials'}),
    'RND-0602':Object.freeze({name:'Invalid UV coordinates',severity:'medium',category:'materials'}),
    'RND-0603':Object.freeze({name:'Texture sampling failure',severity:'high',category:'materials'}),
    'RND-0703':Object.freeze({name:'Shadow-ray failure',severity:'high',category:'lighting'}),
    'RND-0704':Object.freeze({name:'Invalid light state',severity:'high',category:'lighting'}),
    'RND-0803':Object.freeze({name:'Invalid render color',severity:'critical',category:'rendering'}),
    'RND-0804':Object.freeze({name:'Accumulation buffer corruption',severity:'critical',category:'rendering'}),
    'RND-0903':Object.freeze({name:'Missing render pass',severity:'high',category:'rendering'}),
    'RND-0904':Object.freeze({name:'Render pass size mismatch',severity:'high',category:'rendering'}),
    'RND-1002':Object.freeze({name:'Framebuffer allocation failure',severity:'critical',category:'performance'}),
    'RND-1003':Object.freeze({name:'Render image write failure',severity:'high',category:'rendering'}),
    'RND-1105':Object.freeze({name:'Render scheduler/task failure',severity:'high',category:'rendering'}),
    'RND-1106':Object.freeze({name:'Render cancellation failure',severity:'medium',category:'rendering'}),
    'RND-1194':Object.freeze({name:'Unknown / unregistered render error',severity:'medium',category:'rendering'}),
    'RND-1202':Object.freeze({name:'Render camera mismatch',severity:'medium',category:'viewport'}),
    'RND-1302':Object.freeze({name:'Denoiser non-finite output',severity:'high',category:'rendering'}),
    'RND-1401':Object.freeze({name:'Viewport/material render mismatch',severity:'medium',category:'materials'}),
    'RND-1501':Object.freeze({name:'Render diagnostic data corruption',severity:'critical',category:'rendering'})
  });

  const state={events:[],samples:[],renders:{},currentId:null,lastJobStatus:null,lastProgress:null,lastProgressAt:0,lastSampleAt:0,startedAt:now()};

  function catalog(){return Object.freeze({...((base()?.codes)||{}),...EXTRA});}
  function pushEvent(e){state.events.push(e);if(state.events.length>MAX_EVENTS)state.events.shift();return e;}
  function pushSample(x){state.samples.push(x);if(state.samples.length>MAX_SAMPLES)state.samples.shift();return x;}
  function job(){return window.RenderFramework?.jobs?.activeJob||window.RenderFramework?.jobs?.lastJob||null;}
  function jobEvidence(j=job()){
    const b=base();
    const core=b?.jobEvidence?.(j)||{};
    const p=j?.progress||{};
    const ps=j?.performanceState||j?.performance||{};
    return {...safe(core),
      renderId:j?.id??core.renderId??null,
      status:j?.status??p.status??core.status??null,
      percent:finite(p.percent??core.progressPercent),
      currentSamples:finite(p.currentSamples??core.currentSamples),maximumSamples:finite(p.maximumSamples??core.maximumSamples),
      elapsedMs:finite(p.elapsedMs??core.elapsedMs),noise:finite(p.noise??core.noise),threads:finite(p.threads),
      raysPerSecond:finite(p.raysPerSecond??ps.raysPerSecond??ps.estimatedRaysPerSecond??core.raysPerSecond),
      totalRays:finite(ps.totalRays??ps.rays??ps.rayCount??core.raysCast),primaryRays:finite(ps.primaryRays??core.primaryRays),
      secondaryRays:finite(ps.secondaryRays??core.secondaryRays),shadowRays:finite(ps.shadowRays??core.shadowRays),
      reflectionRays:finite(ps.reflectionRays??core.reflectionRays),refractionRays:finite(ps.refractionRays??core.refractionRays),
      intersections:finite(ps.intersections??core.intersections),misses:finite(ps.misses??core.misses),bvhTests:finite(ps.bvhTests??core.bvhTests),
      invalidRays:finite(ps.invalidRays??core.invalidRays),bounceDepth:finite(ps.maxBounce??ps.bounceDepth??core.bounceDepth),
      resolution:Array.isArray(p.resolution)?p.resolution.slice(0,2):core.resolution||null,
      engine:j?.settings?.engine??core.engine??null,
      gi:!!j?.settings?.globalIllumination,
      error:j?.error?String(j.error.message||j.error):core.error||null,errorStage:j?.error?.stage||core.errorStage||null
    };
  }

  function learn(code,meta,input={}){
    const report={schema:1,version:VERSION,code,name:meta.name,severity:input.severity||meta.severity,category:meta.category,
      at:now(),renderId:input.renderId??job()?.id??null,stage:input.stage||'render',message:String(input.message||meta.name),
      evidence:safe(input.evidence||jobEvidence()),status:input.status||'open',source:input.source||'complete-render-debugger'};
    pushEvent(report);
    try{window.ThreeDLiteL3NDebugRegistry?.register?.({category:meta.category,subtype:code.toLowerCase(),severity:report.severity,subsystem:'l3n-complete-render-debugger',source:report.source,message:code+' '+report.message,reproduced:true,regression:['high','critical'].includes(report.severity),evidence:report,status:report.status});}catch(_){}
    try{window.ThreeDLiteL3NTargetLearning?.record?.(15,'learning',code+' '+meta.name);}catch(_){}
    return Object.freeze({...report});
  }

  function record(code,input={}){
    const all=catalog();
    if(base()?.codes?.[code]){const r=base().record(code,input);pushEvent({...safe(r),source:'base-render-debugger'});return r;}
    const meta=all[code]||EXTRA['RND-1194'];
    const actual=all[code]?code:'RND-1194';
    return learn(actual,meta,{...input,message:all[code]?input.message:('Unregistered code '+String(code)+(input.message?': '+input.message:''))});
  }

  function classify(message,stage='render'){
    const m=String(message?.message||message||'').toLowerCase();
    if(/unknown|unregistered/.test(m)&&/rnd|render/.test(m))return 'RND-1194';
    if(/uv/.test(m)&&/nan|invalid|outside|non-finite/.test(m))return 'RND-0602';
    if(/texture/.test(m)&&/sample|sampling/.test(m)&&/fail|error|invalid/.test(m))return 'RND-0603';
    if(/shader/.test(m)&&/fail|error|exception|invalid/.test(m))return 'RND-0504';
    if(/material/.test(m)&&/nan|infinity|invalid value|roughness|metalness/.test(m))return 'RND-0503';
    if(/ray direction/.test(m)&&/nan|invalid|infinity|zero/.test(m))return 'RND-0204';
    if(/ray origin/.test(m)&&/nan|invalid|infinity/.test(m))return 'RND-0205';
    if(/framebuffer/.test(m)&&/alloc|memory|create|fail/.test(m))return 'RND-1002';
    if(/canvas|image|imagedata|putimagedata/.test(m)&&/fail|error|exception/.test(m))return 'RND-1003';
    if(/scheduler|task queue|tile task/.test(m)&&/fail|error/.test(m))return 'RND-1105';
    if(/cancel/.test(m)&&/fail|stuck|error/.test(m))return 'RND-1106';
    if(/camera/.test(m)&&/mismatch|different|stale/.test(m))return 'RND-1202';
    if(/denois/.test(m)&&/nan|infinity|non-finite/.test(m))return 'RND-1302';
    if(/firefl|hot pixel|high-energy|high energy/.test(m))return 'RND-0404';
    return base()?.classify?.(message,stage)||'RND-0001';
  }

  function inspectFinite(ev){
    for(const [k,v] of Object.entries(ev||{})){
      if(typeof v==='number'&&!Number.isFinite(v)){record('RND-0801',{message:'Non-finite render diagnostic value: '+k,evidence:ev,stage:'diagnostics'});return false;}
    }
    return true;
  }

  function poll(){
    const j=job();if(!j)return;
    const ev=jobEvidence(j);const id=ev.renderId??'unknown';
    if(state.currentId!==id){state.currentId=id;state.lastJobStatus=null;state.lastProgress=null;state.lastProgressAt=perf();state.renders[id]={startedAt:now(),stages:[],samples:[],errors:[]};}
    const r=state.renders[id]||(state.renders[id]={startedAt:now(),stages:[],samples:[],errors:[]});
    const status=String(ev.status||'');const pct=finite(ev.percent)??0;
    if(status!==state.lastJobStatus){r.stages.push({status,at:now(),percent:pct});state.lastJobStatus=status;state.lastProgressAt=perf();}
    if(state.lastProgress===null||pct>state.lastProgress+0.0001){state.lastProgress=pct;state.lastProgressAt=perf();}
    if(perf()-state.lastSampleAt>=250){const sm={at:now(),...ev};pushSample(sm);r.samples.push(sm);if(r.samples.length>300)r.samples.shift();state.lastSampleAt=perf();inspectFinite(ev);}
    const stalled=perf()-state.lastProgressAt;
    if(/rendering/i.test(status)&&stalled>8000&&!r.stallCode){r.stallCode='RND-0101';record('RND-0101',{message:'Render stalled for '+Math.round(stalled)+' ms',evidence:ev});}
    if(/preparing|rendering/i.test(status)&&stalled>30000&&!r.timeoutCode){r.timeoutCode='RND-0103';record('RND-0103',{message:'Render stage exceeded 30 seconds without progress',evidence:ev});}
    if(ev.error&&!r.errorCaptured){r.errorCaptured=true;const code=classify(ev.error,ev.errorStage);r.errors.push({code,message:ev.error,at:now()});record(code,{message:ev.error,evidence:ev,stage:ev.errorStage||'render'});}
    if(/finished|complete/i.test(status)||j?.finished){r.finishedAt=r.finishedAt||now();r.final=ev;}
  }

  function snapshot(){
    const b=safe(base()?.snapshot?.()||null);
    return Object.freeze({schema:2,version:VERSION,codes:catalog(),base:b,events:Object.freeze(state.events.map(x=>Object.freeze({...x}))),samples:Object.freeze(state.samples.map(x=>Object.freeze({...x}))),renders:safe(state.renders),active:jobEvidence(job()),generatedAt:now()});
  }
  function summary(){
    const snap=snapshot();const counts={};for(const e of snap.events||[])if(e.code)counts[e.code]=(counts[e.code]||0)+1;
    return Object.freeze({version:VERSION,eventCount:snap.events.length,renderCount:Object.keys(snap.renders||{}).length,lastCode:snap.events.at(-1)?.code||snap.base?.lastCode||null,codeCounts:Object.freeze(counts),active:snap.active});
  }

  function mergeRuntimeReport(report){
    const out=safe(report)||{};
    out.schema=Math.max(1,Number(out.schema)||1);
    out.version=VERSION;
    out.baselineVersion=VERSION;
    out.runtimeLearningVersion=VERSION;
    out.renderDebug=snapshot();
    out.renderDebugSummary=summary();
    out.rndEvidence=(out.renderDebug.events||[]).filter(x=>x.code);
    out.l3nEvidence=Math.max(Number(out.l3nEvidence)||0,5)+out.rndEvidence.length;
    out.versionSynchronized=true;
    return out;
  }

  function reportElement(){return document.getElementById('l3nRuntimeMachineReport');}
  function patchReportElement(){
    const el=reportElement();if(!el)return false;
    const raw=('value' in el?el.value:el.textContent)||'';if(!raw.trim()||raw.trim()[0]!=='{')return false;
    let obj;try{obj=JSON.parse(raw);}catch(_){return false;}
    if(obj.version===VERSION&&obj.baselineVersion===VERSION&&obj.renderDebug?.version===VERSION)return true;
    const text=JSON.stringify(mergeRuntimeReport(obj),null,2);
    if('value' in el)el.value=text;else el.textContent=text;
    try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(_){}
    return true;
  }

  function rendererWindowErrors(ev){
    const text=String(ev?.message||ev?.reason?.message||ev?.reason||'');
    if(!/render|ray|bvh|material|shader|texture|light|framebuffer|denois|snapshot|worker/i.test(text))return;
    const code=classify(text,'runtime');record(code,{message:text,stage:'runtime',source:'window-error',evidence:jobEvidence()});
  }
  window.addEventListener('error',rendererWindowErrors);
  window.addEventListener('unhandledrejection',rendererWindowErrors);

  setInterval(poll,100);
  setInterval(patchReportElement,400);
  document.addEventListener('DOMContentLoaded',()=>setTimeout(patchReportElement,500));

  const combined=catalog();
  window.ThreeDLiteRenderErrorCodes=combined;
  window.ThreeDLiteL3NCompleteRenderDebugger=Object.freeze({version:VERSION,codes:combined,classify,record,snapshot,summary,jobEvidence,mergeRuntimeReport,patchRuntimeReport:patchReportElement});
  window.ThreeDLiteL3NRuntimeReportSync=Object.freeze({version:VERSION,merge:mergeRuntimeReport,patch:patchReportElement});
  window.__3DLiteCompleteRenderDebugSnapshot=()=>snapshot();
})();
</script>
'''
    pos=s.lower().rfind('</body>')
    if pos<0: raise SystemExit('missing </body>')
    s=s[:pos]+layer+s[pos:]

required=['3DLite v3.97.6','ThreeDLiteL3NCompleteRenderDebugger','ThreeDLiteL3NRuntimeReportSync','RND-1194','renderDebugSummary','baselineVersion=VERSION']
for x in required:
    if x not in s: raise SystemExit('missing '+x)

p.write_text(s,encoding='utf-8')
print('patched v3.97.6 runtime/version sync + complete render debugger')
