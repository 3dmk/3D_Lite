(function(root){'use strict';
const LP=root.LitePixNative=root.LitePixNative||{};
const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
class MetricAccumulator{constructor(){this.values=[];}add(v){if(Number.isFinite(v))this.values.push(v);}summary(){if(!this.values.length)return{count:0,min:0,max:0,mean:0,p50:0,p95:0};const a=[...this.values].sort((x,y)=>x-y),n=a.length,q=p=>a[Math.min(n-1,Math.floor((n-1)*p))];const sum=a.reduce((s,v)=>s+v,0);return{count:n,min:a[0],max:a[n-1],mean:sum/n,p50:q(.5),p95:q(.95)};}}
class StageTimer{constructor(){this.open=new Map();this.metrics=new Map();}begin(name){this.open.set(name,now());}end(name){const t=this.open.get(name);if(t==null)return 0;const d=now()-t;this.open.delete(name);if(!this.metrics.has(name))this.metrics.set(name,new MetricAccumulator());this.metrics.get(name).add(d);return d;}snapshot(){const out={};for(const[k,v]of this.metrics)out[k]=v.summary();return out;}}
class RayTelemetry{constructor(){this.reset();}reset(){this.counts={camera:0,path:0,shadow:0,probe:0,reflection:0,refraction:0};this.started=now();}add(type,n=1){this.counts[type]=(this.counts[type]||0)+n;}snapshot(){const ms=Math.max(1,now()-this.started),total=Object.values(this.counts).reduce((a,b)=>a+b,0);return{...this.counts,total,raysPerSecond:total/(ms/1000),elapsedMs:ms};}}
class CacheTelemetry{constructor(){this.hits=0;this.misses=0;this.inserts=0;this.refinements=0;}hit(n=1){this.hits+=n;}miss(n=1){this.misses+=n;}insert(n=1){this.inserts+=n;}refine(n=1){this.refinements+=n;}snapshot(){const q=this.hits+this.misses;return{hits:this.hits,misses:this.misses,inserts:this.inserts,refinements:this.refinements,hitRate:q?this.hits/q:0};}}
class NoiseTelemetry{constructor(){this.samples=new MetricAccumulator();}add(v){this.samples.add(Math.max(0,v));}snapshot(){return this.samples.summary();}}
class LitePixTelemetryV2{constructor(){this.stage=new StageTimer();this.rays=new RayTelemetry();this.cache=new CacheTelemetry();this.noise=new NoiseTelemetry();this.memory={};this.blocks={active:0,finalized:0,refined:0};this.meta={};}setMemory(m){this.memory={...m};}setBlocks(b){this.blocks={...this.blocks,...b};}setMeta(m){Object.assign(this.meta,m);}snapshot(){return{meta:{...this.meta},stages:this.stage.snapshot(),rays:this.rays.snapshot(),cache:this.cache.snapshot(),noise:this.noise.snapshot(),memory:{...this.memory},blocks:{...this.blocks},time:Date.now()};}}
class QualityComparator{static mse(a,b){if(!a||!b||a.length!==b.length||!a.length)return Infinity;let e=0;for(let i=0;i<a.length;i++){const d=a[i]-b[i];e+=d*d;}return e/a.length;}static psnr(a,b,maxValue=1){const mse=QualityComparator.mse(a,b);if(mse===0)return Infinity;if(!Number.isFinite(mse))return 0;return 10*Math.log10((maxValue*maxValue)/mse);}static compare(base,next){const out={};for(const k of Object.keys(base||{})){if(typeof base[k]==='number'&&typeof next?.[k]==='number'&&base[k]!==0)out[k]={before:base[k],after:next[k],changePct:(next[k]-base[k])/Math.abs(base[k])*100};}return out;}}
class HardwareBenchmark{constructor(){this.results={};}async run(opts={}){const loops=opts.loops||200000,t0=now();let x=0.1234567;for(let i=0;i<loops;i++)x=Math.sin(x+i*.00001)*.99991+.00003;const cpuMs=now()-t0;let workerScore=null;if(typeof navigator!=='undefined'&&navigator.hardwareConcurrency)workerScore=navigator.hardwareConcurrency;let gpu='unknown';if(typeof navigator!=='undefined'&&navigator.gpu)gpu='webgpu';this.results={cpuMs,loops,hardwareConcurrency:workerScore,gpu,score:loops/Math.max(1,cpuMs)};return this.results;}recommend(){const s=this.results.score||0,h=this.results.hardwareConcurrency||2;return s>50000&&h>=8?'final':s>20000&&h>=4?'balanced':'interactive';}}
class OptimizationAdvisor{static fromSnapshot(s){const actions=[];if((s.cache?.hitRate||0)<.55)actions.push('increase cache locality or improve compatibility thresholds');if((s.rays?.shadow||0)>(s.rays?.total||1)*.3)actions.push('enable stronger shadow visibility reuse');if((s.rays?.probe||0)>(s.rays?.total||1)*.35)actions.push('reduce probe density or increase hierarchical reuse');if((s.noise?.p95||0)>.05)actions.push('refine high-variance blocks before global SPP increase');if((s.memory?.usedBytes||0)>(s.memory?.limitBytes||Infinity)*.85)actions.push('reduce tile/cache resolution before continuing');return actions;}}

/* 3DLite / LitePix v4.46.0 — Full Render Health Debugger
   Reports GOOD / WARNING / BAD / NOT ACTIVE / NOT MEASURED for every major render subsystem.
   The debugger never treats a legitimate inactive feature (for example refraction in an opaque scene)
   as a renderer failure, and it separately validates telemetry consistency. */
const HEALTH_VERSION='4.46.0';
const H=Object.freeze({GOOD:'GOOD',WARNING:'WARNING',BAD:'BAD',NOT_ACTIVE:'NOT ACTIVE',NOT_MEASURED:'NOT MEASURED'});
const S=Object.freeze({PASS:'PASS',INFO:'INFO',WARNING:'WARNING',ERROR:'ERROR',CRITICAL:'CRITICAL'});
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const bool=v=>typeof v==='boolean'?v:null;
const pick=(...v)=>v.find(x=>x!==undefined&&x!==null);
const activeStatus=s=>/render|running|progress|trace|sampling/i.test(String(s||''));
const completeStatus=s=>/complete|finished|done|cancel/i.test(String(s||''));
const fmt=v=>v==null?'—':typeof v==='number'?(Number.isInteger(v)?String(v):String(Math.round(v*1000)/1000)):String(v);

class RenderHealthDebugger{
  constructor(){this.last=null;this.history=[];this.maxHistory=32;}
  _job(){return root.RenderFramework?.jobs?.activeJob||root.RenderFramework?.jobs?.lastJob||root.RenderFramework?.jobs?.completedJob||null;}
  _perf(job){try{return root.RenderCoreH?.performance?.(job)||job?.performance||null;}catch(_){return job?.performance||null;}}
  _legacyEvidence(){
    const candidates=[root.__3DLiteRenderEvidence,root.__3DLiteCurrentRenderEvidence,root.__3DLiteLastRenderEvidence,root.ThreeDLiteRenderEvidence,root.LiteTraceDiagnostics?.snapshot?.(),root.LiteTraceDiagnostics?.active?.()];
    return candidates.find(x=>x&&typeof x==='object')||{};
  }
  collect(){
    const job=this._job(),p=job?.progress||{},perf=this._perf(job)||{},legacy=this._legacyEvidence()||{};
    const ps=perf?.performance||perf||{};
    const settings=job?.settings||{};
    const rayBudget=job?.litePixRayBudget445?.snapshot?.()||root.__LitePixRayBudget445Snapshot||null;
    const core8=root.__LitePixTelemetrySnapshot||root.LitePixTelemetry?.snapshot?.()||null;
    const workers=root.RenderFramework?.jobs?.workerStats?.()||root.RenderPerformanceMetrics?.workerStats?.()||null;
    const lights=job?.renderScene?.lights||job?.scene?.lights||job?.compiled?.lights||legacy?.lights||[];
    const materials=job?.renderScene?.materials||job?.scene?.materials||[];
    const status=pick(job?.status,p.status,legacy.status,'idle');
    const totalRays=finite(pick(ps.totalRays,ps.rays,ps.rayCount,legacy.totalRays,legacy.raysCast));
    const primaryRays=finite(pick(ps.primaryRays,ps.cameraRays,legacy.primaryRays));
    const secondaryRays=finite(pick(ps.secondaryRays,ps.pathRays,legacy.secondaryRays));
    const shadowRays=finite(pick(ps.shadowRays,legacy.shadowRays,rayBudget?.tracedShadowRays));
    const reflectionRays=finite(pick(ps.reflectionRays,legacy.reflectionRays));
    const refractionRays=finite(pick(ps.refractionRays,legacy.refractionRays));
    const intersections=finite(pick(ps.intersections,ps.surfaceHits,legacy.intersections));
    const misses=finite(pick(ps.misses,ps.rayMisses,legacy.misses));
    const bvhTests=finite(pick(ps.bvhTests,ps.bvhNodeTests,legacy.bvhTests));
    const primitiveTests=finite(pick(ps.primitiveTests,legacy.primitiveTests));
    const invalidRays=finite(pick(ps.invalidRays,legacy.invalidRays));
    const currentSamples=finite(pick(p.currentSamples,ps.samples,legacy.currentSamples));
    const maximumSamples=finite(pick(p.maximumSamples,settings.maxSamples,settings.samples,legacy.maximumSamples));
    const noise=finite(pick(p.noise,legacy.noise,core8?.noise?.p95));
    const targetNoise=finite(pick(settings.targetNoise,settings.noiseThreshold,settings.adaptiveThreshold,legacy.targetNoise));
    const elapsedMs=finite(pick(p.elapsedMs,ps.totalMs,legacy.elapsedMs));
    const rps=finite(pick(p.raysPerSecond,ps.raysPerSecond,ps.estimatedRaysPerSecond,legacy.raysPerSecond));
    const resolution=pick(p.resolution,legacy.resolution,job?.beautyFrame?[job.beautyFrame.width,job.beautyFrame.height]:null);
    const bounceDepth=finite(pick(ps.maxBounce,ps.bounceDepth,legacy.bounceDepth));
    const stageMs=ps.stageMs||perf.stageMs||core8?.stages||{};
    const lightArray=Array.isArray(lights)?lights:[];
    const enabledLights=lightArray.filter(l=>l?.enabled!==false);
    const byType=t=>enabledLights.filter(l=>String(l?.type||'').toLowerCase()===t).length;
    const transparentMaterial=Array.isArray(materials)&&materials.some(m=>(finite(m?.transmission)||0)>.001||(finite(m?.opacity)!=null&&finite(m.opacity)<.999)||(finite(m?.refraction)||0)>.001);
    const exposure=finite(pick(settings.exposureEV,settings.exposure,p.exposureEV,legacy.exposureEV));
    const toneMapper=pick(settings.toneMapper,settings.tonemapper,legacy.toneMapper,root.__3DLiteToneMapper);
    const displayTransform=pick(settings.displayTransform,legacy.displayTransform,root.__3DLiteDisplayTransform);
    const engine=pick(settings.engine,legacy.engine,'unknown');
    const backend=pick(settings.backend,job?.backend,legacy.backend,root.LitePixNative?.backend,'unknown');
    const mem=pick(core8?.memory,root.LitePixNative?.memory?.snapshot?.(),legacy.memory,null);
    return {time:Date.now(),job,status,settings,engine,backend,resolution,currentSamples,maximumSamples,noise,targetNoise,elapsedMs,rps,totalRays,primaryRays,secondaryRays,shadowRays,reflectionRays,refractionRays,intersections,misses,bvhTests,primitiveTests,invalidRays,bounceDepth,stageMs,workers,rayBudget,lights:enabledLights,lightCounts:{total:enabledLights.length,point:byType('point'),spot:byType('spot'),rectangle:byType('rectangle'),disc:byType('disc'),sphere:byType('sphere'),sun:byType('sun'),dome:byType('dome'),mesh:byType('mesh')},transparentMaterial,exposure,toneMapper,displayTransform,mem,legacy};
  }
  _item(name,value,status,severity,reason){return Object.freeze({name,value,status,severity,reason:reason||''});}
  _measured(name,v,goodFn,warningFn,reasonGood='Measured and valid',reasonWarn='Outside preferred range',reasonBad='Invalid value'){
    if(v==null)return this._item(name,v,H.NOT_MEASURED,S.INFO,'No authoritative value is exposed by the active renderer');
    if(!Number.isFinite(Number(v)))return this._item(name,v,H.BAD,S.ERROR,reasonBad);
    if(goodFn&&goodFn(Number(v)))return this._item(name,v,H.GOOD,S.PASS,reasonGood);
    if(warningFn&&warningFn(Number(v)))return this._item(name,v,H.WARNING,S.WARNING,reasonWarn);
    return this._item(name,v,H.BAD,S.ERROR,reasonBad);
  }
  evaluate(raw=this.collect()){
    const groups=[];const add=(name,items)=>groups.push(Object.freeze({name,items:Object.freeze(items)}));
    const running=activeStatus(raw.status),done=completeStatus(raw.status);
    const progress=finite(pick(raw.job?.progress?.percent,raw.legacy?.progressPercent,raw.legacy?.percent));
    add('Render Lifecycle',[
      this._item('Render ID',pick(raw.job?.id,raw.legacy?.renderId),pick(raw.job?.id,raw.legacy?.renderId)!=null?H.GOOD:H.NOT_MEASURED,pick(raw.job?.id,raw.legacy?.renderId)!=null?S.PASS:S.INFO,pick(raw.job?.id,raw.legacy?.renderId)!=null?'Render job identity is available':'No render job identity exposed'),
      this._item('Status',raw.status,raw.status?H.GOOD:H.BAD,raw.status?S.PASS:S.ERROR,raw.status?'Lifecycle state is available':'Missing lifecycle state'),
      progress==null?this._item('Progress',null,H.NOT_MEASURED,S.INFO,'No progress value exposed'):this._item('Progress',progress+'%',progress>=0&&progress<=100?H.GOOD:H.BAD,progress>=0&&progress<=100?S.PASS:S.ERROR,progress>=0&&progress<=100?'Progress is inside 0–100%':'Progress is outside the valid range'),
      this._measured('Elapsed ms',raw.elapsedMs,v=>v>=0,null,'Elapsed time is valid',null,'Elapsed time is invalid'),
      this._item('Engine',raw.engine,raw.engine&&raw.engine!=='unknown'?H.GOOD:H.NOT_MEASURED,raw.engine&&raw.engine!=='unknown'?S.PASS:S.INFO,'Active rendering algorithm')
    ]);
    const sampleItems=[this._measured('Current samples',raw.currentSamples,v=>v>=0,null),this._measured('Maximum samples',raw.maximumSamples,v=>v>0,null)];
    if(raw.currentSamples!=null&&raw.maximumSamples!=null)sampleItems.push(this._item('Sample limit consistency',raw.currentSamples+'/'+raw.maximumSamples,raw.currentSamples<=raw.maximumSamples?H.GOOD:H.BAD,raw.currentSamples<=raw.maximumSamples?S.PASS:S.ERROR,raw.currentSamples<=raw.maximumSamples?'Current samples do not exceed the configured maximum':'Current samples exceed maximumSamples'));
    sampleItems.push(raw.noise==null?this._item('Noise',null,H.NOT_MEASURED,S.INFO,'No convergence estimator exposed'):this._item('Noise',raw.noise,raw.targetNoise==null?(raw.noise<=.05?H.GOOD:H.WARNING):(raw.noise<=raw.targetNoise?H.GOOD:H.WARNING),raw.targetNoise==null?(raw.noise<=.05?S.PASS:S.WARNING):(raw.noise<=raw.targetNoise?S.PASS:S.WARNING),raw.targetNoise==null?'Noise measured; no explicit target available':raw.noise<=raw.targetNoise?'Noise target reached':'Noise remains above target'));
    sampleItems.push(raw.targetNoise==null?this._item('Target noise',null,H.NOT_MEASURED,S.INFO,'No explicit target exposed'):this._item('Target noise',raw.targetNoise,H.GOOD,S.PASS,'Adaptive convergence target is available'));
    add('Sampling / Convergence',sampleItems);

    const lc=raw.lightCounts;
    const lighting=[this._item('Active lights',lc.total,lc.total>0?H.GOOD:H.NOT_ACTIVE,lc.total>0?S.PASS:S.INFO,lc.total>0?'Scene has enabled lights':'No enabled scene lights; environment-only lighting may still be intentional')];
    for(const t of ['point','spot','rectangle','disc','sphere','sun','dome','mesh'])lighting.push(this._item(t[0].toUpperCase()+t.slice(1)+' lights',lc[t],lc[t]>0?H.GOOD:H.NOT_ACTIVE,lc[t]>0?S.PASS:S.INFO,lc[t]>0?'Enabled in this render':'Not used by this scene'));
    const badLights=raw.lights.filter(l=>!Number.isFinite(Number(l?.intensity))||Number(l?.intensity)<0||!Array.isArray(l?.color)&&typeof l?.color!=='string');
    lighting.push(this._item('Light data validity',badLights.length,badLights.length?H.BAD:H.GOOD,badLights.length?S.ERROR:S.PASS,badLights.length?badLights.length+' enabled light(s) have invalid intensity/color data':'Enabled light data is finite'));
    const badSpots=raw.lights.filter(l=>String(l?.type).toLowerCase()==='spot'&&(!Number.isFinite(Number(l?.coneAngle))||Number(l?.coneAngle)<=0||Number(l?.coneAngle)>=180||!Array.isArray(l?.direction)));
    lighting.push(this._item('Spot cone/direction validity',badSpots.length,badSpots.length?H.BAD:(lc.spot?H.GOOD:H.NOT_ACTIVE),badSpots.length?S.ERROR:(lc.spot?S.PASS:S.INFO),badSpots.length?'Invalid Spot cone angle or direction':'Spot-light cone inputs are valid or no Spot is active'));
    add('Lighting',lighting);

    const rayItems=[];
    const rayState=(name,v,required)=>{if(v==null)return this._item(name,v,H.NOT_MEASURED,S.INFO,'Counter is not connected to the active renderer');if(v<0||!Number.isFinite(v))return this._item(name,v,H.BAD,S.ERROR,'Counter is invalid');if(required&&running&&v===0)return this._item(name,v,H.BAD,S.ERROR,'A running path render should have produced this ray class');if(v===0)return this._item(name,v,H.NOT_ACTIVE,S.INFO,'Zero is valid when this ray class is unused');return this._item(name,v,H.GOOD,S.PASS,'Counter is active and nonzero');};
    rayItems.push(rayState('Total rays',raw.totalRays,running));rayItems.push(rayState('Primary rays',raw.primaryRays,running&&/path|ray|trace/i.test(String(raw.engine))));rayItems.push(rayState('Secondary rays',raw.secondaryRays,false));rayItems.push(rayState('Shadow rays',raw.shadowRays,false));rayItems.push(rayState('Reflection rays',raw.reflectionRays,false));
    const refrRequired=raw.transparentMaterial;rayItems.push(rayState('Refraction rays',raw.refractionRays,refrRequired&&running));
    rayItems.push(raw.invalidRays==null?this._item('Invalid rays',null,H.NOT_MEASURED,S.INFO,'Invalid-ray counter is not exposed'):this._item('Invalid rays',raw.invalidRays,raw.invalidRays===0?H.GOOD:H.BAD,raw.invalidRays===0?S.PASS:S.ERROR,raw.invalidRays===0?'No NaN/Inf/invalid rays recorded':'Invalid rays were generated'));
    add('Ray Generation',rayItems);

    add('Traversal / Geometry',[
      raw.bvhTests==null?this._item('BVH tests',null,H.NOT_MEASURED,S.INFO,'BVH traversal counter unavailable'):this._item('BVH tests',raw.bvhTests,running&&raw.bvhTests===0?H.BAD:(raw.bvhTests>0?H.GOOD:H.NOT_ACTIVE),running&&raw.bvhTests===0?S.ERROR:(raw.bvhTests>0?S.PASS:S.INFO),running&&raw.bvhTests===0?'Renderer is active but reports zero BVH work':'BVH traversal telemetry'),
      raw.primitiveTests==null?this._item('Primitive tests',null,H.NOT_MEASURED,S.INFO,'Primitive-test counter unavailable'):this._item('Primitive tests',raw.primitiveTests,raw.primitiveTests>=0?H.GOOD:H.BAD,raw.primitiveTests>=0?S.PASS:S.ERROR,'Primitive intersection workload'),
      raw.intersections==null?this._item('Surface intersections',null,H.NOT_MEASURED,S.INFO,'Surface-hit counter unavailable'):this._item('Surface intersections',raw.intersections,raw.intersections>=0?H.GOOD:H.BAD,raw.intersections>=0?S.PASS:S.ERROR,'Successful ray/geometry hits'),
      raw.misses==null?this._item('Ray misses',null,H.NOT_MEASURED,S.INFO,'Miss counter unavailable'):this._item('Ray misses',raw.misses,raw.misses>=0?H.GOOD:H.BAD,raw.misses>=0?S.PASS:S.ERROR,'Rays that reached environment/background')
    ]);

    add('Path Tracing',[
      raw.bounceDepth==null?this._item('Max bounce reached',null,H.NOT_MEASURED,S.INFO,'Path-depth telemetry unavailable'):this._item('Max bounce reached',raw.bounceDepth,raw.bounceDepth>=0?H.GOOD:H.BAD,raw.bounceDepth>=0?S.PASS:S.ERROR,'Maximum recorded path depth'),
      this._item('GI mode',pick(raw.job?.progress?.gi,raw.settings?.secondaryGI,raw.legacy?.gi),'GOOD',S.PASS,'Current GI configuration'),
      this._item('Light Tree',raw.job?.lightTree?'active':'inactive',raw.job?.lightTree?H.GOOD:H.NOT_ACTIVE,raw.job?.lightTree?S.PASS:S.INFO,raw.job?.lightTree?'Light selection acceleration is active':'Not active for this render'),
      this._item('Path Guiding',raw.job?.pathGuide?'active':'inactive',raw.job?.pathGuide?H.GOOD:H.NOT_ACTIVE,raw.job?.pathGuide?S.PASS:S.INFO,raw.job?.pathGuide?'Indirect-direction guiding is active':'Not active for this render'),
      this._item('Light Cache',raw.job?.lightCache?'active':'inactive',raw.job?.lightCache?H.GOOD:H.NOT_ACTIVE,raw.job?.lightCache?S.PASS:S.INFO,raw.job?.lightCache?'Secondary GI light cache is active':'Not active for this render')
    ]);

    const rb=raw.rayBudget;
    add('Direct Light / Visibility',[
      rb?this._item('Adaptive shadow reuse',rb.enabled?'active':'disabled',rb.enabled?H.GOOD:H.NOT_ACTIVE,rb.enabled?S.PASS:S.INFO,'LitePix adaptive ray-budget visibility cache'):this._item('Adaptive shadow reuse',null,H.NOT_MEASURED,S.INFO,'Ray-budget telemetry unavailable'),
      rb?this._item('Requested shadow tests',rb.requestedShadowTests,H.GOOD,S.PASS,'Visibility requests issued'):this._item('Requested shadow tests',null,H.NOT_MEASURED,S.INFO,'Counter unavailable'),
      rb?this._item('Traced shadow rays',rb.tracedShadowRays,H.GOOD,S.PASS,'Actual visibility rays after reuse'):this._item('Traced shadow rays',raw.shadowRays,raw.shadowRays==null?H.NOT_MEASURED:(raw.shadowRays>0?H.GOOD:H.NOT_ACTIVE),raw.shadowRays==null?S.INFO:(raw.shadowRays>0?S.PASS:S.INFO),'Shadow-ray workload'),
      rb?this._item('Shadow cache hit rate',rb.cacheHitRate,rb.cacheHitRate>=0&&rb.cacheHitRate<=1?H.GOOD:H.BAD,rb.cacheHitRate>=0&&rb.cacheHitRate<=1?S.PASS:S.ERROR,'Visibility-reuse efficiency'):this._item('Shadow cache hit rate',null,H.NOT_MEASURED,S.INFO,'Counter unavailable')
    ]);

    const displayKnown=raw.displayTransform!=null||raw.toneMapper!=null||root.__3DLiteMaterialLinearColor3996===true;
    add('Color / Exposure',[
      raw.exposure==null?this._item('Exposure',null,H.NOT_MEASURED,S.INFO,'Exposure value unavailable'):this._item('Exposure',raw.exposure,H.GOOD,S.PASS,'Exposure is finite'),
      raw.toneMapper==null?this._item('Tone mapper',null,H.NOT_MEASURED,S.INFO,'Tone-mapper state unavailable'):this._item('Tone mapper',raw.toneMapper,H.GOOD,S.PASS,'Tone-mapping mode reported'),
      raw.displayTransform==null?this._item('Display transform',displayKnown?'linear-color pipeline detected':null,displayKnown?H.GOOD:H.NOT_MEASURED,displayKnown?S.PASS:S.INFO,displayKnown?'Linear-color pipeline markers are present':'Cannot prove linear-to-display conversion from current telemetry'):this._item('Display transform',raw.displayTransform,H.GOOD,S.PASS,'Display conversion mode reported')
    ]);

    const stageEntries=Object.entries(raw.stageMs||{}).map(([k,v])=>[k,typeof v==='object'?finite(v.mean):finite(v)]).filter(([,v])=>v!=null);
    const slow=stageEntries.sort((a,b)=>b[1]-a[1]).slice(0,3);
    add('Performance',[
      raw.rps==null?this._item('Rays per second',null,H.NOT_MEASURED,S.INFO,'Throughput unavailable'):this._item('Rays per second',raw.rps,raw.rps>0?H.GOOD:(running?H.BAD:H.NOT_ACTIVE),raw.rps>0?S.PASS:(running?S.ERROR:S.INFO),raw.rps>0?'Measured ray throughput':'Zero throughput while render is active'),
      this._item('Slowest stages',slow.length?slow.map(x=>x[0]+': '+Math.round(x[1])+'ms').join(', '):'—',slow.length?H.GOOD:H.NOT_MEASURED,slow.length?S.PASS:S.INFO,slow.length?'Stage timing data available':'No per-stage timings exposed'),
      raw.rayBudget?this._item('Shadow reduction ratio',raw.rayBudget.shadowReductionRatio,raw.rayBudget.shadowReductionRatio>=1?H.GOOD:H.WARNING,raw.rayBudget.shadowReductionRatio>=1?S.PASS:S.WARNING,'Requested shadow work divided by traced shadow work'):this._item('Shadow reduction ratio',null,H.NOT_MEASURED,S.INFO,'Ray-budget telemetry unavailable')
    ]);

    const mem=raw.mem;
    const used=finite(mem?.usedBytes),limit=finite(mem?.limitBytes),ratio=used!=null&&limit>0?used/limit:null;
    add('Memory',[
      ratio==null?this._item('Memory pressure',null,H.NOT_MEASURED,S.INFO,'Memory budget is not exposed'):this._item('Memory pressure',Math.round(ratio*100)+'%',ratio<.8?H.GOOD:ratio<.95?H.WARNING:H.BAD,ratio<.8?S.PASS:ratio<.95?S.WARNING:S.ERROR,ratio<.8?'Memory use is comfortably below limit':ratio<.95?'Memory use is approaching limit':'Memory use is near/exceeds safe budget')
    ]);

    const w=raw.workers;
    add('Threading / Backend',[
      this._item('Backend',raw.backend,raw.backend&&raw.backend!=='unknown'?H.GOOD:H.NOT_MEASURED,raw.backend&&raw.backend!=='unknown'?S.PASS:S.INFO,'Active CPU/GPU backend'),
      w?this._item('Workers',pick(w.active,w.workers,w.count,w.total),H.GOOD,S.PASS,'Worker-pool telemetry available'):this._item('Workers',typeof navigator!=='undefined'?navigator.hardwareConcurrency:null,typeof navigator!=='undefined'&&navigator.hardwareConcurrency?H.GOOD:H.NOT_MEASURED,typeof navigator!=='undefined'&&navigator.hardwareConcurrency?S.PASS:S.INFO,'Hardware concurrency fallback'),
      this._item('WebGPU available',typeof navigator!=='undefined'&&!!navigator.gpu,typeof navigator!=='undefined'&&navigator.gpu?H.GOOD:H.NOT_ACTIVE,typeof navigator!=='undefined'&&navigator.gpu?S.PASS:S.INFO,typeof navigator!=='undefined'&&navigator.gpu?'Browser exposes WebGPU':'WebGPU not exposed; CPU/WASM may still be valid')
    ]);

    const consistency=[];
    if(running&&raw.shadowRays!=null&&raw.shadowRays>0&&raw.primaryRays===0)consistency.push('Shadow rays are nonzero while primary rays are zero');
    if(running&&raw.totalRays===0&&(raw.shadowRays>0||raw.intersections>0))consistency.push('Total rays are zero while subordinate render work is nonzero');
    if(running&&raw.bvhTests===0&&(raw.intersections>0||raw.primaryRays>0))consistency.push('BVH tests are zero while rays/intersections are nonzero');
    if(raw.totalRays!=null&&raw.primaryRays!=null&&raw.secondaryRays!=null&&raw.shadowRays!=null){const subtotal=raw.primaryRays+raw.secondaryRays+raw.shadowRays+(raw.reflectionRays||0)+(raw.refractionRays||0);if(raw.totalRays>0&&subtotal>raw.totalRays*1.5)consistency.push('Ray subtype counters substantially exceed totalRays; counters may overlap or use incompatible semantics');}
    if(raw.currentSamples!=null&&raw.maximumSamples!=null&&raw.currentSamples>raw.maximumSamples)consistency.push('currentSamples exceeds maximumSamples');
    if(progress!=null&&progress>=95&&raw.currentSamples!=null&&raw.maximumSamples!=null&&raw.maximumSamples>0&&raw.currentSamples/raw.maximumSamples<.25)consistency.push('Progress is near completion while sample count is below 25% of maximum; progress semantics differ from sample progress or are wrong');
    add('Telemetry Integrity',[
      this._item('Counter consistency',consistency.length?consistency.join('; '):'consistent',consistency.length?H.BAD:H.GOOD,consistency.length?S.ERROR:S.PASS,consistency.length?'Renderer may be working, but one or more statistics are not authoritative':'No contradictory core counters detected'),
      this._item('Telemetry coverage',null,H.GOOD,S.PASS,'Coverage score is calculated below')
    ]);

    const all=groups.flatMap(g=>g.items);const measured=all.filter(i=>i.status!==H.NOT_MEASURED).length;const coverage=all.length?Math.round(measured/all.length*100):0;
    const weights={[H.GOOD]:1,[H.NOT_ACTIVE]:1,[H.NOT_MEASURED]:.55,[H.WARNING]:.55,[H.BAD]:0};
    const score=Math.round(all.reduce((s,i)=>s+(weights[i.status]??.5),0)/Math.max(1,all.length)*100);
    const bad=all.filter(i=>i.status===H.BAD),warn=all.filter(i=>i.status===H.WARNING);
    const overall=bad.some(i=>i.severity===S.CRITICAL)?'CRITICAL':bad.length?'BAD':warn.length?'WARNING':'GOOD';
    const categoryScores={};for(const g of groups){categoryScores[g.name]=Math.round(g.items.reduce((s,i)=>s+(weights[i.status]??.5),0)/Math.max(1,g.items.length)*100);}
    const recommendations=[];
    for(const i of [...bad,...warn].slice(0,8))recommendations.push(i.name+': '+i.reason);
    if(!recommendations.length)recommendations.push('No active render-health faults detected.');
    const result=Object.freeze({version:HEALTH_VERSION,time:raw.time,overall,score,coverage,categoryScores:Object.freeze(categoryScores),groups:Object.freeze(groups),recommendations:Object.freeze(recommendations),raw});
    this.last=result;this.history.push(result);if(this.history.length>this.maxHistory)this.history.shift();return result;
  }
  snapshot(){return this.evaluate(this.collect());}
  toText(report=this.last||this.snapshot()){
    const out=[];out.push('3DLite / LitePix RENDER HEALTH DEBUGGER v'+report.version);out.push('OVERALL: '+report.overall+' | Health '+report.score+'/100 | Telemetry coverage '+report.coverage+'%');out.push('');
    for(const g of report.groups){out.push('['+g.name+'] '+(report.categoryScores[g.name]??'—')+'/100');for(const i of g.items)out.push(i.status.padEnd(12)+' | '+i.name+': '+fmt(i.value)+(i.reason?' — '+i.reason:''));out.push('');}
    out.push('[AUTOMATIC DIAGNOSIS]');for(const r of report.recommendations)out.push('- '+r);return out.join('\n');
  }
  installUI(){
    if(typeof document==='undefined'||document.getElementById('litepixHealthDebuggerButton'))return;
    const style=document.createElement('style');style.id='litepixHealthDebuggerStyle';style.textContent='#litepixHealthDebuggerButton{position:fixed;right:12px;bottom:12px;z-index:2147483000;background:#2d2d2d;color:#eee;border:1px solid #666;border-radius:3px;padding:6px 10px;font:12px Segoe UI,Arial;cursor:pointer}#litepixHealthDebuggerButton:hover{background:#3b3b3b}#litepixHealthDebuggerPanel{position:fixed;right:12px;bottom:48px;width:min(720px,calc(100vw - 24px));height:min(78vh,760px);z-index:2147482999;background:#1f1f1f;color:#ddd;border:1px solid #666;box-shadow:0 8px 30px #000a;display:none;font:12px Segoe UI,Arial}#litepixHealthDebuggerPanel.open{display:flex;flex-direction:column}#litepixHealthDebuggerHead{display:flex;align-items:center;gap:6px;padding:7px;background:#2b2b2b;border-bottom:1px solid #555}#litepixHealthDebuggerHead b{flex:1}#litepixHealthDebuggerHead button{min-height:24px;padding:2px 7px}#litepixHealthDebuggerBody{padding:8px;overflow:auto;white-space:pre-wrap;font:11px Consolas,monospace;line-height:1.42}';document.head.appendChild(style);
    const b=document.createElement('button');b.id='litepixHealthDebuggerButton';b.textContent='Render Debug';b.title='Open full GOOD / WARNING / BAD render health status';document.body.appendChild(b);
    const p=document.createElement('div');p.id='litepixHealthDebuggerPanel';p.innerHTML='<div id="litepixHealthDebuggerHead"><b>Render Health Debugger v'+HEALTH_VERSION+'</b><button data-a="refresh">Refresh</button><button data-a="copy">Copy</button><button data-a="close">Close</button></div><pre id="litepixHealthDebuggerBody"></pre>';document.body.appendChild(p);
    const body=p.querySelector('#litepixHealthDebuggerBody');const render=()=>{const r=this.snapshot();body.textContent=this.toText(r);b.textContent='Render Debug: '+r.overall+' '+r.score;};
    b.addEventListener('click',()=>{p.classList.toggle('open');if(p.classList.contains('open'))render();});p.addEventListener('click',async e=>{const a=e.target?.dataset?.a;if(a==='close')p.classList.remove('open');else if(a==='refresh')render();else if(a==='copy'){render();try{await navigator.clipboard.writeText(body.textContent);}catch(_){const ta=document.createElement('textarea');ta.value=body.textContent;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(__){}ta.remove();}}});
    setInterval(()=>{if(p.classList.contains('open'))render();},1000);render();
  }
}
const RenderHealth=new RenderHealthDebugger();
LP.RenderHealthDebugger=RenderHealthDebugger;LP.RenderHealth=RenderHealth;
root.LitePixRenderHealthDebugger=RenderHealth;
root.__3DLiteRenderHealthSnapshot=()=>RenderHealth.snapshot();
root.__3DLiteRenderHealthText=()=>RenderHealth.toText(RenderHealth.snapshot());
root.__3DLiteRenderHealthVersion=HEALTH_VERSION;
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>RenderHealth.installUI(),{once:true});else setTimeout(()=>RenderHealth.installUI(),0);}

LP.Core8={MetricAccumulator,StageTimer,RayTelemetry,CacheTelemetry,NoiseTelemetry,LitePixTelemetryV2,QualityComparator,HardwareBenchmark,OptimizationAdvisor,RenderHealthDebugger,RenderHealth,version:'4.07.0',healthVersion:HEALTH_VERSION};
root.LitePixTelemetryV2=LitePixTelemetryV2;
})(typeof globalThis!=='undefined'?globalThis:window);
