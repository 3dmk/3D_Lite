(function(root){'use strict';
const LP=root.LitePixNative=root.LitePixNative||{};
const VERSION='4.46.1';
const H=Object.freeze({GOOD:'GOOD',WARNING:'WARNING',BAD:'BAD',NOT_ACTIVE:'NOT ACTIVE',NOT_MEASURED:'NOT MEASURED'});
const S=Object.freeze({PASS:'PASS',INFO:'INFO',WARNING:'WARNING',ERROR:'ERROR',CRITICAL:'CRITICAL'});
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const pick=(...v)=>v.find(x=>x!==undefined&&x!==null);
const fmt=v=>v==null?'—':typeof v==='number'?(Number.isInteger(v)?String(v):String(Math.round(v*1000)/1000)):String(v);
const running=s=>/render|running|progress|trace|sampling/i.test(String(s||''));
const finished=s=>/complete|finished|done/i.test(String(s||''));

class RenderStartupTracker{
  constructor(){this.reset();}
  reset(){this.renderId=null;this.startedAt=0;this.events=[];this.map=new Map();}
  begin(renderId=null){this.reset();this.renderId=renderId;this.startedAt=performance?.now?.()||Date.now();this.mark('render-request','GOOD','Render request accepted');return this;}
  mark(id,status='GOOD',detail=''){const e={id,status,detail,at:performance?.now?.()||Date.now()};this.map.set(id,e);this.events.push(e);return e;}
  fail(id,detail=''){return this.mark(id,'BAD',detail);}
  warn(id,detail=''){return this.mark(id,'WARNING',detail);}
  snapshot(){return Object.freeze({renderId:this.renderId,startedAt:this.startedAt,events:Object.freeze(this.events.slice()),stages:Object.freeze(Object.fromEntries(this.map))});}
}

const StartupOrder=Object.freeze([
 ['render-request','Render request'],
 ['settings-validation','Settings validation'],
 ['backend-selection','Backend selection'],
 ['telemetry-reset','Telemetry reset'],
 ['scene-snapshot','Scene snapshot'],
 ['geometry-compile','Geometry compile'],
 ['material-compile','Material / texture compile'],
 ['light-compile','Light compile'],
 ['acceleration','BLAS / TLAS / BVH build'],
 ['light-structures','Light distributions / Light Tree'],
 ['gi-structures','GI / Light Cache / Path Guiding preparation'],
 ['film-setup','Film / AOV setup'],
 ['workers','Workers / task queues'],
 ['progressive-loop','Progressive render loop'],
 ['primary-rays','Primary rays'],
 ['surface-shading','Surface / BSDF evaluation'],
 ['direct-light','Direct-light sampling'],
 ['shadow-visibility','Shadow visibility'],
 ['secondary-rays','Secondary / continuation rays'],
 ['bounce-loop','Bounce loop'],
 ['gi-evaluation','GI evaluation'],
 ['accumulation','HDR accumulation'],
 ['noise-check','Variance / noise check'],
 ['final-resolve','Final film / AOV resolve'],
 ['display-pipeline','Exposure / tone map / display transform'],
 ['debug-report','Final health report']
]);

class RenderHealthDebugger{
  constructor(){this.last=null;this.history=[];this.maxHistory=32;this.startup=new RenderStartupTracker();}
  _job(){return root.RenderFramework?.jobs?.activeJob||root.RenderFramework?.jobs?.lastJob||root.RenderFramework?.jobs?.completedJob||null;}
  _perf(j){try{return root.RenderCoreH?.performance?.(j)||j?.performance||{};}catch(_){return j?.performance||{};}}
  _legacy(){const c=[root.__3DLiteRenderEvidence,root.__3DLiteCurrentRenderEvidence,root.__3DLiteLastRenderEvidence,root.ThreeDLiteRenderEvidence,root.LiteTraceDiagnostics?.snapshot?.()];return c.find(x=>x&&typeof x==='object')||{};}
  collect(){
    const job=this._job(),p=job?.progress||{},perf=this._perf(job)||{},ps=perf?.performance||perf||{},legacy=this._legacy(),settings=job?.settings||{};
    const rb=job?.litePixRayBudget445?.snapshot?.()||root.__LitePixRayBudget445Snapshot||null;
    const core8=root.__LitePixTelemetrySnapshot||root.LitePixTelemetry?.snapshot?.()||null;
    const workers=root.RenderFramework?.jobs?.workerStats?.()||root.RenderPerformanceMetrics?.workerStats?.()||null;
    const lights=job?.renderScene?.lights||job?.scene?.lights||job?.compiled?.lights||legacy?.lights||[];
    const mats=job?.renderScene?.materials||job?.scene?.materials||[];
    const status=pick(job?.status,p.status,legacy.status,'idle');
    const total=finite(pick(ps.totalRays,ps.rays,ps.rayCount,legacy.totalRays,legacy.raysCast));
    const primary=finite(pick(ps.primaryRays,ps.cameraRays,legacy.primaryRays));
    const secondary=finite(pick(ps.secondaryRays,ps.pathRays,legacy.secondaryRays));
    const shadow=finite(pick(ps.shadowRays,legacy.shadowRays,rb?.tracedShadowRays));
    const reflection=finite(pick(ps.reflectionRays,legacy.reflectionRays));
    const refraction=finite(pick(ps.refractionRays,legacy.refractionRays));
    const bvh=finite(pick(ps.bvhTests,ps.bvhNodeTests,legacy.bvhTests));
    const primitive=finite(pick(ps.primitiveTests,legacy.primitiveTests));
    const hits=finite(pick(ps.intersections,ps.surfaceHits,legacy.intersections));
    const misses=finite(pick(ps.misses,ps.rayMisses,legacy.misses));
    const invalid=finite(pick(ps.invalidRays,legacy.invalidRays));
    const bounce=finite(pick(ps.maxBounce,ps.bounceDepth,legacy.bounceDepth));
    const currentSamples=finite(pick(p.currentSamples,ps.samples,legacy.currentSamples));
    const maximumSamples=finite(pick(p.maximumSamples,settings.maxSamples,settings.samples,legacy.maximumSamples));
    const noise=finite(pick(p.noise,legacy.noise,core8?.noise?.p95));
    const targetNoise=finite(pick(settings.targetNoise,settings.noiseThreshold,settings.adaptiveThreshold,legacy.targetNoise));
    const elapsed=finite(pick(p.elapsedMs,ps.totalMs,legacy.elapsedMs));
    const rps=finite(pick(p.raysPerSecond,ps.raysPerSecond,ps.estimatedRaysPerSecond,legacy.raysPerSecond));
    const lightArray=Array.isArray(lights)?lights.filter(l=>l?.enabled!==false):[];
    const byType=t=>lightArray.filter(l=>String(l?.type||'').toLowerCase()===t).length;
    const transparent=Array.isArray(mats)&&mats.some(m=>(finite(m?.transmission)||0)>.001||(finite(m?.refraction)||0)>.001||(finite(m?.opacity)!=null&&finite(m.opacity)<.999));
    const backend=pick(settings.backend,job?.backend,legacy.backend,root.LitePixNative?.backend,'unknown');
    const tone=pick(settings.toneMapper,settings.tonemapper,legacy.toneMapper,root.__3DLiteToneMapper);
    const display=pick(settings.displayTransform,legacy.displayTransform,root.__3DLiteDisplayTransform);
    const exposure=finite(pick(settings.exposureEV,settings.exposure,legacy.exposureEV));
    const mem=pick(core8?.memory,root.LitePixNative?.memory?.snapshot?.(),legacy.memory,null);
    return {job,p,ps,legacy,settings,status,total,primary,secondary,shadow,reflection,refraction,bvh,primitive,hits,misses,invalid,bounce,currentSamples,maximumSamples,noise,targetNoise,elapsed,rps,rb,workers,backend,tone,display,exposure,mem,transparent,lights:lightArray,lightCounts:{total:lightArray.length,point:byType('point'),spot:byType('spot'),rectangle:byType('rectangle'),disc:byType('disc'),sphere:byType('sphere'),sun:byType('sun'),dome:byType('dome'),mesh:byType('mesh')},stageMs:ps.stageMs||perf.stageMs||core8?.stages||{},engine:pick(settings.engine,legacy.engine,'unknown')};
  }
  _i(name,value,status,severity,reason){return Object.freeze({name,value,status,severity,reason});}
  _startupState(raw,id){
    const explicit=this.startup.map.get(id);if(explicit)return {status:explicit.status,severity:explicit.status==='BAD'?S.ERROR:explicit.status==='WARNING'?S.WARNING:S.PASS,reason:explicit.detail||'Explicit startup instrumentation'};
    const hasJob=!!raw.job,hasSamples=(raw.currentSamples||0)>0,hasPrimary=(raw.primary||0)>0,hasSecondary=(raw.secondary||0)>0,hasShadow=(raw.shadow||0)>0,done=finished(raw.status),run=running(raw.status);
    const evidence={
      'render-request':hasJob||done||run,
      'settings-validation':hasJob,
      'backend-selection':raw.backend&&raw.backend!=='unknown',
      'telemetry-reset':raw.total!=null||raw.primary!=null||raw.currentSamples!=null,
      'scene-snapshot':hasJob,
      'geometry-compile':hasPrimary||raw.bvh>0||raw.primitive>0,
      'material-compile':hasPrimary||hasSecondary,
      'light-compile':raw.lightCounts.total>0||hasShadow,
      'acceleration':hasPrimary||raw.bvh>0,
      'light-structures':raw.lightCounts.total>0,
      'gi-structures':!!(raw.job?.lightCache||raw.job?.pathGuide||raw.settings?.secondaryGI),
      'film-setup':hasSamples||done,
      'workers':raw.workers!=null,
      'progressive-loop':hasSamples||run||done,
      'primary-rays':hasPrimary,
      'surface-shading':hasPrimary&&((raw.hits||0)>0||hasSecondary),
      'direct-light':raw.lightCounts.total>0&&(hasShadow||hasSamples),
      'shadow-visibility':hasShadow||((raw.rb?.requestedShadowTests||0)>0),
      'secondary-rays':hasSecondary,
      'bounce-loop':hasSecondary||raw.bounce>0,
      'gi-evaluation':!!(raw.job?.lightCache||raw.job?.pathGuide||/GI|Brute|Cache/i.test(String(raw.p?.gi||raw.settings?.secondaryGI||''))),
      'accumulation':hasSamples,
      'noise-check':raw.noise!=null,
      'final-resolve':done,
      'display-pipeline':done&&(raw.display!=null||raw.tone!=null||root.__3DLiteMaterialLinearColor3996===true),
      'debug-report':true
    };
    if(evidence[id])return {status:H.GOOD,severity:S.PASS,reason:'Observed from active render evidence'};
    if(id==='backend-selection'&&hasJob)return {status:H.WARNING,severity:S.WARNING,reason:'Render exists but backend identity is unknown'};
    if(id==='workers'&&hasJob)return {status:H.NOT_ACTIVE,severity:S.INFO,reason:'No active worker pool observed; single-thread execution may be intentional'};
    if(done&&['final-resolve','debug-report'].includes(id))return {status:H.GOOD,severity:S.PASS,reason:'Finished render proves this stage completed'};
    return {status:H.NOT_MEASURED,severity:S.INFO,reason:'Stage is not explicitly instrumented yet'};
  }
  evaluate(raw=this.collect()){
    const groups=[],add=(n,a)=>groups.push({name:n,items:a});
    const startup=StartupOrder.map(([id,label],index)=>{const st=this._startupState(raw,id);return this._i(String(index+1).padStart(2,'0')+'. '+label,index+1,st.status,st.severity,st.reason);});
    add('Startup / Execution Order',startup);
    const progress=finite(pick(raw.p?.percent,raw.legacy?.progressPercent,raw.legacy?.percent));
    add('Render Lifecycle',[
      this._i('Render ID',pick(raw.job?.id,raw.legacy?.renderId),pick(raw.job?.id,raw.legacy?.renderId)!=null?H.GOOD:H.NOT_MEASURED,pick(raw.job?.id,raw.legacy?.renderId)!=null?S.PASS:S.INFO,'Render job identity'),
      this._i('Status',raw.status,H.GOOD,S.PASS,'Lifecycle state'),
      this._i('Progress',progress==null?'—':progress+'%',progress==null?H.NOT_MEASURED:(progress>=0&&progress<=100?H.GOOD:H.BAD),progress==null?S.INFO:(progress>=0&&progress<=100?S.PASS:S.ERROR),'Expected range 0–100%'),
      this._i('Elapsed ms',raw.elapsed,raw.elapsed==null?H.NOT_MEASURED:(raw.elapsed>=0?H.GOOD:H.BAD),raw.elapsed==null?S.INFO:(raw.elapsed>=0?S.PASS:S.ERROR),'Measured wall time'),
      this._i('Engine',raw.engine,raw.engine!=='unknown'?H.GOOD:H.NOT_MEASURED,raw.engine!=='unknown'?S.PASS:S.INFO,'Active rendering algorithm')
    ]);
    const s=[];
    s.push(this._i('Current samples',raw.currentSamples,raw.currentSamples==null?H.NOT_MEASURED:H.GOOD,raw.currentSamples==null?S.INFO:S.PASS,'Sample count'));
    s.push(this._i('Maximum samples',raw.maximumSamples,raw.maximumSamples==null?H.NOT_MEASURED:(raw.maximumSamples>0?H.GOOD:H.BAD),raw.maximumSamples==null?S.INFO:(raw.maximumSamples>0?S.PASS:S.ERROR),'Hard sample ceiling'));
    if(raw.currentSamples!=null&&raw.maximumSamples!=null)s.push(this._i('Sample limit consistency',raw.currentSamples+'/'+raw.maximumSamples,raw.currentSamples<=raw.maximumSamples?H.GOOD:H.BAD,raw.currentSamples<=raw.maximumSamples?S.PASS:S.ERROR,'Current samples must not exceed maximum'));
    if(raw.noise==null)s.push(this._i('Noise',null,H.NOT_MEASURED,S.INFO,'Noise estimator unavailable'));
    else {const visuallyClean=raw.noise<=.05,acceptable=raw.noise<=.10,configured=raw.targetNoise!=null&&raw.noise<=raw.targetNoise;s.push(this._i('Noise',raw.noise,visuallyClean?H.GOOD:(acceptable?H.WARNING:H.WARNING),visuallyClean?S.PASS:S.WARNING,configured&&!visuallyClean?'Configured target reached, but visual noise remains high':visuallyClean?'Low residual noise':'Noise remains visually significant'));}
    s.push(this._i('Target noise',raw.targetNoise,raw.targetNoise==null?H.NOT_MEASURED:(raw.targetNoise<=.10?H.GOOD:H.WARNING),raw.targetNoise==null?S.INFO:(raw.targetNoise<=.10?S.PASS:S.WARNING),raw.targetNoise==null?'No explicit target':'Targets above 0.10 are very loose for final-quality convergence'));
    add('Sampling / Convergence',s);
    const lc=raw.lightCounts,lighting=[this._i('Active lights',lc.total,lc.total>0?H.GOOD:H.NOT_ACTIVE,lc.total>0?S.PASS:S.INFO,'Enabled scene lights')];
    for(const t of ['point','spot','rectangle','disc','sphere','sun','dome','mesh'])lighting.push(this._i(t[0].toUpperCase()+t.slice(1)+' lights',lc[t],lc[t]>0?H.GOOD:H.NOT_ACTIVE,lc[t]>0?S.PASS:S.INFO,lc[t]>0?'Used by scene':'Not used'));
    add('Lighting',lighting);
    const rs=(n,v,req=false)=>this._i(n,v,v==null?H.NOT_MEASURED:(v<0?H.BAD:(req&&running(raw.status)&&v===0?H.BAD:(v===0?H.NOT_ACTIVE:H.GOOD))),v==null?S.INFO:(v<0||req&&running(raw.status)&&v===0?S.ERROR:(v===0?S.INFO:S.PASS)),v==null?'Counter unavailable':v===0?'No rays of this class':'Counter active');
    add('Ray Generation',[rs('Total rays',raw.total,running(raw.status)),rs('Primary rays',raw.primary,running(raw.status)),rs('Secondary rays',raw.secondary),rs('Shadow rays',raw.shadow),rs('Reflection rays',raw.reflection),rs('Refraction rays',raw.refraction,raw.transparent&&running(raw.status)),this._i('Invalid rays',raw.invalid,raw.invalid==null?H.NOT_MEASURED:(raw.invalid===0?H.GOOD:H.BAD),raw.invalid==null?S.INFO:(raw.invalid===0?S.PASS:S.ERROR),raw.invalid==null?'Counter unavailable':raw.invalid===0?'No invalid rays':'Invalid/NaN/Inf rays detected')]);
    add('Traversal / Geometry',[
      this._i('BVH tests',raw.bvh,raw.bvh==null?H.NOT_MEASURED:(raw.bvh>0?H.GOOD:H.NOT_ACTIVE),raw.bvh==null?S.INFO:(raw.bvh>0?S.PASS:S.INFO),'BVH traversal work'),
      this._i('Primitive tests',raw.primitive,raw.primitive==null?H.NOT_MEASURED:(raw.primitive>=0?H.GOOD:H.BAD),raw.primitive==null?S.INFO:(raw.primitive>=0?S.PASS:S.ERROR),'Primitive intersection work'),
      this._i('Surface intersections',raw.hits,raw.hits==null?H.NOT_MEASURED:H.GOOD,raw.hits==null?S.INFO:S.PASS,'Successful surface hits'),
      this._i('Ray misses',raw.misses,raw.misses==null?H.NOT_MEASURED:H.GOOD,raw.misses==null?S.INFO:S.PASS,'Environment/background misses')
    ]);
    add('Path Tracing',[
      this._i('Max bounce reached',raw.bounce,raw.bounce==null?H.NOT_MEASURED:H.GOOD,raw.bounce==null?S.INFO:S.PASS,'Path-depth telemetry'),
      this._i('GI mode',pick(raw.p?.gi,raw.settings?.secondaryGI,raw.legacy?.gi,'—'),H.GOOD,S.PASS,'Current GI mode'),
      this._i('Light Tree',raw.job?.lightTree?'active':'inactive',raw.job?.lightTree?H.GOOD:H.NOT_ACTIVE,raw.job?.lightTree?S.PASS:S.INFO,'Light-selection acceleration'),
      this._i('Path Guiding',raw.job?.pathGuide?'active':'inactive',raw.job?.pathGuide?H.GOOD:H.NOT_ACTIVE,raw.job?.pathGuide?S.PASS:S.INFO,'Indirect-direction guiding'),
      this._i('Light Cache',raw.job?.lightCache?'active':'inactive',raw.job?.lightCache?H.GOOD:H.NOT_ACTIVE,raw.job?.lightCache?S.PASS:S.INFO,'Secondary GI cache')
    ]);
    const rb=raw.rb,ratio=finite(rb?.shadowReductionRatio),hit=finite(rb?.cacheHitRate),aggressive=(ratio!=null&&ratio>100)||(hit!=null&&hit>.98);
    add('Direct Light / Visibility',[
      this._i('Adaptive shadow reuse',rb?(rb.enabled?'active':'disabled'):null,rb?(rb.enabled?H.GOOD:H.NOT_ACTIVE):H.NOT_MEASURED,rb?(rb.enabled?S.PASS:S.INFO):S.INFO,'Visibility reuse system'),
      this._i('Requested shadow tests',rb?.requestedShadowTests,rb?H.GOOD:H.NOT_MEASURED,rb?S.PASS:S.INFO,'Visibility requests'),
      this._i('Traced shadow rays',rb?.tracedShadowRays??raw.shadow,(rb?.tracedShadowRays??raw.shadow)!=null?H.GOOD:H.NOT_MEASURED,(rb?.tracedShadowRays??raw.shadow)!=null?S.PASS:S.INFO,'Physical shadow traces'),
      this._i('Shadow cache hit rate',hit,hit==null?H.NOT_MEASURED:(aggressive?H.WARNING:H.GOOD),hit==null?S.INFO:(aggressive?S.WARNING:S.PASS),aggressive?'Extremely aggressive visibility reuse; verify moving/soft-shadow quality':'Visibility reuse efficiency'),
      this._i('Shadow reduction ratio',ratio,ratio==null?H.NOT_MEASURED:(aggressive?H.WARNING:H.GOOD),ratio==null?S.INFO:(aggressive?S.WARNING:S.PASS),aggressive?'Reduction above 100× can hide stale visibility errors; quality check recommended':'Requested tests divided by traced rays')
    ]);
    add('Color / Exposure',[
      this._i('Exposure',raw.exposure,raw.exposure==null?H.NOT_MEASURED:H.GOOD,raw.exposure==null?S.INFO:S.PASS,'Exposure state'),
      this._i('Tone mapper',raw.tone,raw.tone==null?H.NOT_MEASURED:H.GOOD,raw.tone==null?S.INFO:S.PASS,'Tone-mapping mode'),
      this._i('Display transform',raw.display|| (root.__3DLiteMaterialLinearColor3996?'linear-color pipeline detected':null),raw.display||root.__3DLiteMaterialLinearColor3996?H.GOOD:H.NOT_MEASURED,raw.display||root.__3DLiteMaterialLinearColor3996?S.PASS:S.INFO,'Linear HDR to display conversion')
    ]);
    const stageEntries=Object.entries(raw.stageMs||{}).map(([k,v])=>[k,typeof v==='object'?finite(v.mean):finite(v)]).filter(([,v])=>v!=null).sort((a,b)=>b[1]-a[1]).slice(0,3);
    add('Performance',[
      this._i('Rays per second',raw.rps,raw.rps==null?H.NOT_MEASURED:(raw.rps<20000?H.WARNING:H.GOOD),raw.rps==null?S.INFO:(raw.rps<20000?S.WARNING:S.PASS),raw.rps==null?'Throughput unavailable':raw.rps<20000?'Low measured throughput; compare against scene complexity/backend':'Measured ray throughput'),
      this._i('Slowest stages',stageEntries.length?stageEntries.map(x=>x[0]+': '+Math.round(x[1])+'ms').join(', '):'—',stageEntries.length?H.GOOD:H.NOT_MEASURED,stageEntries.length?S.PASS:S.INFO,'Per-stage timing')
    ]);
    const used=finite(raw.mem?.usedBytes),limit=finite(raw.mem?.limitBytes),mr=used!=null&&limit>0?used/limit:null;
    add('Memory',[this._i('Memory pressure',mr==null?null:Math.round(mr*100)+'%',mr==null?H.NOT_MEASURED:(mr<.8?H.GOOD:mr<.95?H.WARNING:H.BAD),mr==null?S.INFO:(mr<.8?S.PASS:mr<.95?S.WARNING:S.ERROR),mr==null?'Memory budget unavailable':'Used memory versus configured limit')]);
    const wc=finite(pick(raw.workers?.active,raw.workers?.workers,raw.workers?.count,raw.workers?.total));
    add('Threading / Backend',[
      this._i('Backend',raw.backend,raw.backend&&raw.backend!=='unknown'?H.GOOD:H.WARNING,raw.backend&&raw.backend!=='unknown'?S.PASS:S.WARNING,raw.backend&&raw.backend!=='unknown'?'Active renderer backend':'Backend identity is required to interpret performance correctly'),
      this._i('Workers',wc,wc==null?H.NOT_MEASURED:(wc>0?H.GOOD:H.NOT_ACTIVE),wc==null?S.INFO:(wc>0?S.PASS:S.INFO),wc==null?'Worker telemetry unavailable':wc>0?'Worker pool active':'No active workers observed; single-thread execution may be intentional'),
      this._i('WebGPU available',typeof navigator!=='undefined'&&!!navigator.gpu,typeof navigator!=='undefined'&&navigator.gpu?H.GOOD:H.NOT_ACTIVE,typeof navigator!=='undefined'&&navigator.gpu?S.PASS:S.INFO,'Browser WebGPU capability')
    ]);
    const consistency=[];
    if(running(raw.status)&&raw.shadow>0&&raw.primary===0)consistency.push('shadow rays > 0 while primary rays = 0');
    if(running(raw.status)&&raw.total===0&&(raw.shadow>0||raw.hits>0))consistency.push('total rays = 0 while subordinate ray work exists');
    if(running(raw.status)&&raw.bvh===0&&(raw.hits>0||raw.primary>0))consistency.push('BVH tests = 0 while traced work exists');
    if(raw.currentSamples!=null&&raw.maximumSamples!=null&&raw.currentSamples>raw.maximumSamples)consistency.push('currentSamples exceeds maximumSamples');
    add('Telemetry Integrity',[this._i('Counter consistency',consistency.length?consistency.join('; '):'consistent',consistency.length?H.BAD:H.GOOD,consistency.length?S.ERROR:S.PASS,consistency.length?'Telemetry contradiction detected':'No contradictory core counters detected')]);
    const all=groups.flatMap(g=>g.items),weights={[H.GOOD]:1,[H.NOT_ACTIVE]:1,[H.NOT_MEASURED]:.55,[H.WARNING]:.55,[H.BAD]:0};
    const measured=all.filter(i=>i.status!==H.NOT_MEASURED).length,coverage=Math.round(measured/Math.max(1,all.length)*100),score=Math.round(all.reduce((a,i)=>a+(weights[i.status]??.5),0)/Math.max(1,all.length)*100);
    const bad=all.filter(i=>i.status===H.BAD),warn=all.filter(i=>i.status===H.WARNING),overall=bad.some(i=>i.severity===S.CRITICAL)?'CRITICAL':bad.length?'BAD':warn.length?'WARNING':'GOOD';
    const categoryScores={};for(const g of groups)categoryScores[g.name]=Math.round(g.items.reduce((a,i)=>a+(weights[i.status]??.5),0)/Math.max(1,g.items.length)*100);
    const rec=[...bad,...warn].slice(0,10).map(i=>i.name+': '+i.reason);if(!rec.length)rec.push('No active render-health faults detected.');
    return this.last={version:VERSION,time:Date.now(),overall,score,coverage,groups,categoryScores,recommendations:rec,raw};
  }
  snapshot(){const r=this.evaluate(this.collect());this.history.push(r);if(this.history.length>this.maxHistory)this.history.shift();return r;}
  toText(r=this.last||this.snapshot()){
    const out=['3DLite / LitePix RENDER HEALTH DEBUGGER v'+r.version,'OVERALL: '+r.overall+' | Health '+r.score+'/100 | Telemetry coverage '+r.coverage+'%',''];
    for(const g of r.groups){out.push('['+g.name+'] '+r.categoryScores[g.name]+'/100');for(const i of g.items)out.push(String(i.status).padEnd(12)+' | '+i.name+': '+fmt(i.value)+' — '+i.reason);out.push('');}
    out.push('[AUTOMATIC DIAGNOSIS]');for(const x of r.recommendations)out.push('- '+x);return out.join('\n');
  }
  installUI(){
    if(typeof document==='undefined'||document.getElementById('litepixHealthDebuggerButton'))return;
    const st=document.createElement('style');st.textContent='#litepixHealthDebuggerButton{position:fixed;right:12px;bottom:12px;z-index:2147483000;background:#2d2d2d;color:#eee;border:1px solid #666;border-radius:3px;padding:6px 10px;font:12px Segoe UI,Arial;cursor:pointer}#litepixHealthDebuggerPanel{position:fixed;right:12px;bottom:48px;width:min(780px,calc(100vw - 24px));height:min(82vh,820px);z-index:2147482999;background:#1f1f1f;color:#ddd;border:1px solid #666;display:none;font:12px Segoe UI,Arial}#litepixHealthDebuggerPanel.open{display:flex;flex-direction:column}#litepixHealthDebuggerHead{display:flex;gap:6px;align-items:center;padding:7px;background:#2b2b2b;border-bottom:1px solid #555}#litepixHealthDebuggerHead b{flex:1}#litepixHealthDebuggerBody{padding:8px;overflow:auto;white-space:pre-wrap;font:11px Consolas,monospace;line-height:1.42}';document.head.appendChild(st);
    const b=document.createElement('button');b.id='litepixHealthDebuggerButton';b.textContent='Render Debug';document.body.appendChild(b);
    const p=document.createElement('div');p.id='litepixHealthDebuggerPanel';p.innerHTML='<div id="litepixHealthDebuggerHead"><b>Render Health Debugger v'+VERSION+'</b><button data-a="refresh">Refresh</button><button data-a="copy">Copy</button><button data-a="close">Close</button></div><pre id="litepixHealthDebuggerBody"></pre>';document.body.appendChild(p);
    const body=p.querySelector('#litepixHealthDebuggerBody'),render=()=>{const r=this.snapshot();body.textContent=this.toText(r);b.textContent='Render Debug: '+r.overall+' '+r.score;};
    b.onclick=()=>{p.classList.toggle('open');if(p.classList.contains('open'))render();};p.onclick=async e=>{const a=e.target?.dataset?.a;if(a==='close')p.classList.remove('open');else if(a==='refresh')render();else if(a==='copy'){render();try{await navigator.clipboard.writeText(body.textContent);}catch(_){}}};
    setInterval(()=>{if(p.classList.contains('open'))render();},1000);render();
  }
}
const RenderHealth=new RenderHealthDebugger();
LP.RenderStartupTracker=RenderStartupTracker;LP.RenderHealthDebugger=RenderHealthDebugger;LP.RenderHealth=RenderHealth;
LP.Core8=Object.assign(LP.Core8||{},{RenderStartupTracker,RenderHealthDebugger,RenderHealth,healthVersion:VERSION});
root.LitePixRenderHealthDebugger=RenderHealth;
root.__3DLiteRenderStartupTracker=RenderHealth.startup;
root.__3DLiteRenderStartupOrder=StartupOrder;
root.__3DLiteRenderHealthSnapshot=()=>RenderHealth.snapshot();
root.__3DLiteRenderHealthText=()=>RenderHealth.toText(RenderHealth.snapshot());
root.__3DLiteRenderHealthVersion=VERSION;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>RenderHealth.installUI(),{once:true});else setTimeout(()=>RenderHealth.installUI(),0);}
})(typeof globalThis!=='undefined'?globalThis:window);
