from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('3.97.4','3.97.5')

marker='__3DLiteL3NRenderDebugger3975'
if marker not in s:
    layer=r'''
<script id="__3DLiteL3NRenderDebugger3975">
/* 3DLite v3.97.5 — L3N Rendering Debugger + permanent RND error-code registry */
(()=>{
  const VERSION='3.97.5';
  const STALL_MS=8000;
  const MAX_REPORTS=120;
  const CODES=Object.freeze({
    'RND-0001':Object.freeze({name:'Render failure',severity:'high',category:'rendering'}),
    'RND-0101':Object.freeze({name:'Render stalled',severity:'high',category:'rendering'}),
    'RND-0102':Object.freeze({name:'Render progress frozen',severity:'medium',category:'rendering'}),
    'RND-0201':Object.freeze({name:'Invalid ray',severity:'high',category:'rays'}),
    'RND-0202':Object.freeze({name:'Ray self-intersection',severity:'medium',category:'rays'}),
    'RND-0203':Object.freeze({name:'BVH/intersection failure',severity:'high',category:'rays'}),
    'RND-0301':Object.freeze({name:'Reflection recursion limit',severity:'high',category:'rendering'}),
    'RND-0302':Object.freeze({name:'Refraction recursion limit',severity:'high',category:'rendering'}),
    'RND-0303':Object.freeze({name:'Excessive ray count',severity:'high',category:'rays'}),
    'RND-0401':Object.freeze({name:'Shadow noise',severity:'medium',category:'lighting'}),
    'RND-0402':Object.freeze({name:'GI noise',severity:'medium',category:'rendering'}),
    'RND-0501':Object.freeze({name:'Material index out of range',severity:'medium',category:'materials'}),
    'RND-0502':Object.freeze({name:'Missing material',severity:'high',category:'materials'}),
    'RND-0601':Object.freeze({name:'Texture missing in render',severity:'medium',category:'materials'}),
    'RND-0701':Object.freeze({name:'Missing light contribution',severity:'medium',category:'lighting'}),
    'RND-0702':Object.freeze({name:'Light leak',severity:'medium',category:'lighting'}),
    'RND-0801':Object.freeze({name:'NaN/Infinity render value',severity:'critical',category:'rendering'}),
    'RND-0802':Object.freeze({name:'Black-pixel anomaly',severity:'medium',category:'rendering'}),
    'RND-0901':Object.freeze({name:'Render pass failure',severity:'high',category:'rendering'}),
    'RND-0902':Object.freeze({name:'Pass compositing failure',severity:'high',category:'rendering'}),
    'RND-1001':Object.freeze({name:'Renderer resource/memory failure',severity:'critical',category:'performance'}),
    'RND-1101':Object.freeze({name:'Render snapshot failure',severity:'high',category:'rendering'}),
    'RND-1102':Object.freeze({name:'Geometry compile failure',severity:'high',category:'model'}),
    'RND-1103':Object.freeze({name:'Render worker failure',severity:'high',category:'rendering'}),
    'RND-1104':Object.freeze({name:'Render execution failure',severity:'high',category:'rendering'}),
    'RND-1201':Object.freeze({name:'Viewport/render mismatch',severity:'medium',category:'viewport'}),
    'RND-1301':Object.freeze({name:'Denoiser failure',severity:'medium',category:'rendering'})
  });
  const state={version:VERSION,reports:[],active:null,last:null,lastCode:null,monitor:null};
  const safe=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return null;}};
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const perf=()=>performance.now();
  const now=()=>Date.now();
  const getJobs=()=>window.RenderFramework?.jobs||null;
  const getActive=()=>getJobs()?.activeJob||null;

  function classify(errorOrMessage,stage='render'){
    const msg=String(errorOrMessage?.message||errorOrMessage||'').toLowerCase();
    const st=String(errorOrMessage?.stage||stage||'render').toLowerCase();
    if(/material index out of range/.test(msg))return 'RND-0501';
    if(/missing material/.test(msg))return 'RND-0502';
    if(/texture/.test(msg)&&/missing|not found|unavailable|failed/.test(msg))return 'RND-0601';
    if(/nan|infinity|non-finite|nonfinite/.test(msg))return 'RND-0801';
    if(/out of memory|allocation|resource exhausted|gpu memory/.test(msg))return 'RND-1001';
    if(/reflection/.test(msg)&&/recurs|bounce|depth|limit/.test(msg))return 'RND-0301';
    if(/refraction|transmission/.test(msg)&&/recurs|bounce|depth|limit/.test(msg))return 'RND-0302';
    if(/ray/.test(msg)&&/count|budget|limit|excess/.test(msg))return 'RND-0303';
    if(/self[- ]?intersect/.test(msg))return 'RND-0202';
    if(/bvh|intersection/.test(msg))return 'RND-0203';
    if(/invalid ray|ray.*nan|ray.*infinity/.test(msg))return 'RND-0201';
    if(/shadow/.test(msg)&&/noise|noisy/.test(msg))return 'RND-0401';
    if(/\bgi\b|global illumination/.test(msg)&&/noise|noisy/.test(msg))return 'RND-0402';
    if(/denois/.test(msg))return 'RND-1301';
    if(/composit/.test(msg))return 'RND-0902';
    if(/pass/.test(msg))return 'RND-0901';
    if(st==='snapshot'||/snapshot/.test(msg))return 'RND-1101';
    if(st==='geometry'||/geometry compile/.test(msg))return 'RND-1102';
    if(st==='worker'||/worker/.test(msg))return 'RND-1103';
    if(st==='render'||st==='execution')return 'RND-1104';
    return 'RND-0001';
  }

  function jobEvidence(job){
    const p=job?.progress||{};
    const ps=job?.performanceState||job?.performance||{};
    return {
      renderId:job?.id??null,
      mode:job?.mode??null,
      status:job?.status??p.status??null,
      progressPercent:num(p.percent),
      currentSamples:num(p.currentSamples),
      maximumSamples:num(p.maximumSamples),
      resolution:Array.isArray(p.resolution)?p.resolution.slice(0,2):null,
      elapsedMs:num(p.elapsedMs),
      raysPerSecond:num(p.raysPerSecond??ps.raysPerSecond??ps.estimatedRaysPerSecond),
      bvhBuildMs:num(p.bvhBuildMs??ps.bvhBuildMs),
      raysCast:num(ps.rays??ps.rayCount??ps.totalRays),
      primaryRays:num(ps.primaryRays),secondaryRays:num(ps.secondaryRays),shadowRays:num(ps.shadowRays),
      reflectionRays:num(ps.reflectionRays),refractionRays:num(ps.refractionRays),
      intersections:num(ps.intersections),misses:num(ps.misses),bvhTests:num(ps.bvhTests),
      invalidRays:num(ps.invalidRays),bounceDepth:num(ps.maxBounce??ps.bounceDepth),noise:num(p.noise),
      engine:job?.settings?.engine??null,maxBounces:num(job?.settings?.maxBounces),
      error:job?.error?String(job.error.message||job.error):null,errorStage:job?.error?.stage||null
    };
  }

  function learn(report){
    try{window.ThreeDLiteL3NDebugRegistry?.register?.({
      category:CODES[report.code]?.category||'rendering',subtype:report.code.toLowerCase(),severity:report.severity,
      subsystem:'l3n-rendering-debugger',source:'render-debugger',message:report.code+' '+report.name+(report.message?': '+report.message:''),
      reproduced:true,regression:report.severity==='critical'||report.severity==='high',evidence:report,status:report.status||'open'
    });}catch(_){}
    try{window.ThreeDLiteL3NTargetLearning?.record?.(15,'learning','render debugger '+report.code+' '+report.name);}catch(_){}
  }

  function record(code='RND-0001',input={}){
    if(!CODES[code])code='RND-0001';
    const meta=CODES[code];
    const report={schema:1,version:VERSION,code,name:meta.name,severity:String(input.severity||meta.severity),category:meta.category,
      detectedAt:now(),renderId:input.renderId??input.evidence?.renderId??state.active?.renderId??null,
      stage:String(input.stage||input.evidence?.errorStage||'render'),message:String(input.message||''),status:String(input.status||'open'),
      evidence:safe(input.evidence||{}),recommendedAction:String(input.recommendedAction||''),lastSuccessfulStage:String(input.lastSuccessfulStage||'')};
    state.reports.push(report);if(state.reports.length>MAX_REPORTS)state.reports.shift();state.last=report;state.lastCode=code;learn(report);renderPanel();return Object.freeze({...report});
  }

  function begin(job){
    state.active={renderId:job?.id??null,startedAt:perf(),startedWall:now(),lastProgressAt:perf(),lastPercent:num(job?.progress?.percent)||0,lastStatus:String(job?.status||''),stallReported:false,freezeReported:false};
    state.lastCode=null;renderPanel();
  }
  function finish(job){
    if(!state.active||state.active.renderId!==(job?.id??null))return;
    state.last={schema:1,version:VERSION,code:null,name:'Render completed',severity:'info',category:'rendering',detectedAt:now(),renderId:job?.id??null,stage:'complete',message:'Render completed successfully',status:'resolved',evidence:jobEvidence(job)};
    state.active=null;renderPanel();
  }
  function fail(job){
    const e=job?.error;const code=classify(e,e?.stage||'render');
    record(code,{renderId:job?.id,stage:e?.stage||'render',message:String(e?.message||e||'Render failed'),evidence:jobEvidence(job),lastSuccessfulStage:state.active?.lastStatus||''});
    state.active=null;
  }

  function tick(){
    const job=getActive();
    if(job&&!state.active)begin(job);
    if(!job){renderPanel();return;}
    if(state.active&&state.active.renderId!==(job.id??null))begin(job);
    const a=state.active;if(!a)return;
    const status=String(job.status||job.progress?.status||'');
    const pct=num(job.progress?.percent)||0;
    if(pct>a.lastPercent+0.0001||status!==a.lastStatus){a.lastPercent=pct;a.lastStatus=status;a.lastProgressAt=perf();}
    const age=perf()-a.lastProgressAt;
    if(/rendering/i.test(status)&&age>=STALL_MS&&!a.stallReported){
      a.stallReported=true;record('RND-0101',{renderId:job.id,stage:'render',message:'Render made no measurable progress for '+Math.round(age)+' ms',evidence:jobEvidence(job),recommendedAction:'Inspect current pass, ray counts, recursion and material/light state.'});
    }
    if(job.error||/error/i.test(status)){fail(job);return;}
    if(job.finished||/finished|complete/i.test(status)){finish(job);return;}
    renderPanel();
  }

  function snapshot(){return Object.freeze({version:VERSION,codes:CODES,active:safe(state.active),last:safe(state.last),lastCode:state.lastCode,reports:Object.freeze(state.reports.map(r=>Object.freeze({...r})))});}
  function clear(){state.reports.length=0;state.last=null;state.lastCode=null;renderPanel();return true;}
  function exportReport(){return JSON.stringify(snapshot(),null,2);}

  function ensureUI(){
    const win=document.getElementById('renderFrameWindow');if(!win||document.getElementById('l3nRenderDebugPanel'))return;
    const title=win.querySelector('.render-title');
    const btn=document.createElement('button');btn.type='button';btn.id='l3nRenderDebugBtn';btn.textContent='Debug';btn.title='L3N Rendering Debugger';
    title?.insertBefore(btn,title.querySelector('[data-render-close="frame"]'));
    const panel=document.createElement('div');panel.id='l3nRenderDebugPanel';panel.style.cssText='display:none;position:absolute;right:8px;top:42px;width:330px;max-height:52%;overflow:auto;z-index:12;background:rgba(24,24,24,.96);border:1px solid #555;padding:8px;font:11px/1.35 monospace;color:#ddd;box-shadow:0 6px 18px rgba(0,0,0,.45)';
    panel.innerHTML='<div style="font:bold 12px sans-serif;margin-bottom:6px">L3N Rendering Debugger <span id="l3nRenderDebugVersion"></span></div><div id="l3nRenderDebugStatus"></div><pre id="l3nRenderDebugText" style="white-space:pre-wrap;margin:6px 0 0;color:#ccc"></pre>';
    win.appendChild(panel);
    btn.addEventListener('click',()=>{panel.style.display=panel.style.display==='none'?'block':'none';renderPanel();});
    renderPanel();
  }
  function renderPanel(){
    const panel=document.getElementById('l3nRenderDebugPanel');if(!panel)return;
    const v=document.getElementById('l3nRenderDebugVersion');if(v)v.textContent='v'+VERSION;
    const st=document.getElementById('l3nRenderDebugStatus');const txt=document.getElementById('l3nRenderDebugText');
    const job=getActive();const ev=job?jobEvidence(job):(state.last?.evidence||{});
    const code=state.lastCode||state.last?.code||'—';
    if(st)st.innerHTML='<b>Code:</b> '+code+' &nbsp; <b>Status:</b> '+String(ev.status||state.last?.status||'idle')+' &nbsp; <b>Progress:</b> '+String(ev.progressPercent??'—')+'%';
    if(txt)txt.textContent=[
      'Render ID: '+String(ev.renderId??'—'),'Stage: '+String(ev.errorStage||state.last?.stage||ev.status||'—'),
      'Resolution: '+(Array.isArray(ev.resolution)?ev.resolution.join('×'):'—'),'Samples: '+String(ev.currentSamples??'—')+'/'+String(ev.maximumSamples??'—'),
      'Rays: '+String(ev.raysCast??'—'),'Rays/s: '+String(ev.raysPerSecond??'—'),'Bounce: '+String(ev.bounceDepth??'—'),
      'Shadow rays: '+String(ev.shadowRays??'—'),'Reflection rays: '+String(ev.reflectionRays??'—'),'Refraction rays: '+String(ev.refractionRays??'—'),
      'Intersections: '+String(ev.intersections??'—'),'Misses: '+String(ev.misses??'—'),'Invalid rays: '+String(ev.invalidRays??'—'),
      state.last?.message?('Last: '+state.last.message):''
    ].filter(Boolean).join('\n');
  }

  function start(){ensureUI();if(!state.monitor)state.monitor=setInterval(tick,250);return true;}
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(start,0);setTimeout(ensureUI,1000);});
  window.ThreeDLiteRenderErrorCodes=CODES;
  window.ThreeDLiteL3NRenderDebugger=Object.freeze({version:VERSION,codes:CODES,classify,record,snapshot,clear,exportReport,start,jobEvidence});
  window.__3DLiteRenderDebugSnapshot=()=>window.ThreeDLiteL3NRenderDebugger.snapshot();
})();
</script>
'''
    pos=s.lower().rfind('</body>')
    if pos<0: raise SystemExit('missing </body>')
    s=s[:pos]+layer+s[pos:]

required=['3DLite v3.97.5','__3DLiteL3NRenderDebugger3975','ThreeDLiteL3NRenderDebugger','ThreeDLiteRenderErrorCodes','RND-0001','RND-0101','RND-0501','RND-1104','l3nRenderDebugPanel']
for x in required:
    if x not in s: raise SystemExit('missing marker '+x)
if s.lower().count('<script') != s.lower().count('</script>'):
    raise SystemExit('script tag imbalance')
p.write_text(s,encoding='utf-8')
print('patched v3.97.5 L3N Rendering Debugger')
