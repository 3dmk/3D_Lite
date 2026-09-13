(function(root){
'use strict';
const VERSION='4.48.0';
const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const safe=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const luma=c=>{ if(Array.isArray(c)) return .2126*safe(c[0])+.7152*safe(c[1])+.0722*safe(c[2]); if(c&&typeof c==='object') return .2126*safe(c.r)+.7152*safe(c.g)+.0722*safe(c.b); return safe(c); };

class Stats {
  constructor(){this.n=0;this.sum=0;this.sumSq=0;this.min=Infinity;this.max=-Infinity;this.samples=[];}
  add(v){v=safe(v,NaN);if(!Number.isFinite(v))return;this.n++;this.sum+=v;this.sumSq+=v*v;this.min=Math.min(this.min,v);this.max=Math.max(this.max,v);if(this.samples.length<2048)this.samples.push(v);}
  snapshot(){const a=this.samples.slice().sort((x,y)=>x-y),q=p=>a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*p))]:null;const mean=this.n?this.sum/this.n:null;return{count:this.n,min:this.n?this.min:null,max:this.n?this.max:null,mean,variance:this.n?Math.max(0,this.sumSq/this.n-mean*mean):null,p50:q(.5),p90:q(.9),p99:q(.99)};}
}

class L3NRenderingWorkflow {
  constructor(){this.reset();}
  reset(){
    this.version=VERSION;this.renderId=null;this.startedAt=0;this.finishedAt=0;this.completionReason='NOT_STARTED';
    this.stages=new Map();this.stageStack=[];this.rays={primary:0,shadow:0,diffuse:0,glossy:0,reflection:0,refraction:0,transmission:0,secondary:0,auxiliary:0,invalid:0,total:0};
    this.bvh={nodeTests:0,leafVisits:0,primitiveTests:0,hits:0,misses:0,reuse:0,refit:0,partialRebuild:0,fullRebuild:0};
    this.rr={attempted:0,survived:0,terminated:0,estimatedSaved:0};this.bounces={};
    this.luminance={raw:new Stats(),exposed:new Stats(),display:new Stats()};
    this.lights={};this.visibility={requested:0,traced:0,reused:0,verified:0,mismatch:0};
    this.passes=[];this.aovVariance={direct:0,shadow:0,gi:0,reflection:0,refraction:0,emission:0,unresolved:0};
    this.pixels={active:0,total:0,converged:0,varianceMean:null,lumaMean:null};
    this.memory={ramBytes:null,vramBytes:null,geometryBytes:0,textureBytes:0,bvhBytes:0,cacheBytes:0,uploadBytes:0};
    this.backend={name:'unknown',device:null,workers:0,threads:null,gpuAvailable:!!(typeof navigator!=='undefined'&&navigator.gpu)};
    this.experiments=[];this.learning={history:[],recommendations:[],verdict:'INSUFFICIENT_EVIDENCE',confidence:'LOW'};
    this.settings={noiseTarget:null,maxSamples:null,minSamples:null,timeLimitMs:null};
    return this;
  }
  beginRender(meta={}){this.reset();this.renderId=meta.renderId??Date.now();this.startedAt=now();Object.assign(this.settings,meta.settings||{});Object.assign(this.backend,meta.backend||{});this.beginStage('render.total');return this.renderId;}
  endRender(reason='FINISHED',meta={}){if(this.stageStack.includes('render.total'))this.endStage('render.total');this.finishedAt=now();this.completionReason=this.normalizeCompletion(reason,meta);const snap=this.snapshot();this.learning=this.analyze(snap);return snap;}
  normalizeCompletion(reason,meta={}){const r=String(reason||'').toUpperCase();if(r.includes('ERROR'))return'ERROR';if(r.includes('CANCEL')||r.includes('STOP'))return'CANCELLED';if(r.includes('MEMORY'))return'MEMORY_LIMIT';if(r.includes('TIME'))return'TIME_LIMIT';const n=safe(meta.noise,NaN),target=safe(meta.noiseTarget??this.settings.noiseTarget,NaN),samples=safe(meta.samples,NaN),max=safe(meta.maxSamples??this.settings.maxSamples,NaN);if(Number.isFinite(n)&&Number.isFinite(target)&&n<=target)return'CONVERGED';if(Number.isFinite(samples)&&Number.isFinite(max)&&samples>=max)return'MAX_SAMPLES';return r||'FINISHED';}
  beginStage(name,meta={}){const t=now();let s=this.stages.get(name);if(!s)s={name,count:0,totalMs:0,minMs:Infinity,maxMs:0,lastMs:0,open:[],meta:{}};s.open.push(t);s.count++;s.meta={...s.meta,...meta};this.stages.set(name,s);this.stageStack.push(name);return t;}
  endStage(name,meta={}){const s=this.stages.get(name);if(!s||!s.open.length)return null;const t0=s.open.pop(),dt=Math.max(0,now()-t0);s.totalMs+=dt;s.lastMs=dt;s.minMs=Math.min(s.minMs,dt);s.maxMs=Math.max(s.maxMs,dt);s.meta={...s.meta,...meta};const i=this.stageStack.lastIndexOf(name);if(i>=0)this.stageStack.splice(i,1);return dt;}
  addRay(type='auxiliary',n=1){type=this.rays[type]!=null?type:'auxiliary';n=Math.max(0,safe(n));this.rays[type]+=n;if(type!=='total')this.rays.total+=n;}
  recordBVH(v={}){for(const k of Object.keys(this.bvh))this.bvh[k]+=Math.max(0,safe(v[k]));}
  recordBounce(depth,{rays=1,contribution=0,timeMs=0,varianceReduction=0}={}){const k=String(depth);const b=this.bounces[k]||(this.bounces[k]={rays:0,contribution:0,timeMs:0,varianceReduction:0});b.rays+=safe(rays);b.contribution+=safe(contribution);b.timeMs+=safe(timeMs);b.varianceReduction+=safe(varianceReduction);}
  recordRR({attempted=0,survived=0,terminated=0,estimatedSaved=0}={}){this.rr.attempted+=safe(attempted);this.rr.survived+=safe(survived);this.rr.terminated+=safe(terminated);this.rr.estimatedSaved+=safe(estimatedSaved);}
  recordLuminance(stage,value){const s=this.luminance[stage];if(s)s.add(luma(value));}
  recordLight(id,data={}){id=String(id??'unknown');const d=this.lights[id]||(this.lights[id]={samples:0,accepted:0,occluded:0,contribution:0,distanceAttenuation:new Stats(),cone:new Stats(),ndotl:new Stats(),bsdf:new Stats(),lightPdf:new Stats(),bsdfPdf:new Stats(),mis:new Stats()});d.samples+=safe(data.samples,1);d.accepted+=safe(data.accepted);d.occluded+=safe(data.occluded);d.contribution+=safe(data.contribution);for(const k of ['distanceAttenuation','cone','ndotl','bsdf','lightPdf','bsdfPdf','mis'])if(data[k]!=null)d[k].add(data[k]);}
  recordVisibility({requested=0,traced=0,reused=0,verified=0,mismatch=0}={}){for(const k of Object.keys(this.visibility))this.visibility[k]+=safe(arguments[0]?.[k]);}
  recordPass(p={}){const before=safe(p.varianceBefore,NaN),after=safe(p.varianceAfter,NaN),rays=safe(p.rays),ms=safe(p.timeMs);const gain=Number.isFinite(before)&&Number.isFinite(after)?Math.max(0,before-after):null;this.passes.push({...p,index:p.index??this.passes.length+1,qualityGain:gain,qualityPerRay:gain!=null&&rays>0?gain/rays:null,qualityPerMs:gain!=null&&ms>0?gain/ms:null});}
  setPixelMetrics(m={}){Object.assign(this.pixels,m);}
  setAOVVariance(m={}){for(const k of Object.keys(this.aovVariance))if(m[k]!=null)this.aovVariance[k]=Math.max(0,safe(m[k]));}
  setMemory(m={}){Object.assign(this.memory,m);}
  setBackend(m={}){Object.assign(this.backend,m);}
  experiment(name,baseline,candidate,metrics={}){const q0=safe(metrics.baselineQuality,NaN),q1=safe(metrics.candidateQuality,NaN),t0=safe(metrics.baselineMs,NaN),t1=safe(metrics.candidateMs,NaN);let verdict='INCONCLUSIVE';if(Number.isFinite(q0)&&Number.isFinite(q1)){if(q1>q0&&(!Number.isFinite(t0)||!Number.isFinite(t1)||t1<=t0*1.10))verdict='KEEP';else if(q1<q0*0.98)verdict='REJECT';else verdict='HOLD';}const e={name,baseline,candidate,metrics,verdict,at:Date.now()};this.experiments.push(e);return e;}
  dominantVarianceSource(){return Object.entries(this.aovVariance).sort((a,b)=>b[1]-a[1])[0]?.[0]||'unresolved';}
  analyze(s){const rec=[],warnings=[];const totalMs=(s.finishedAt&&s.startedAt)?s.finishedAt-s.startedAt:null;const last=s.passes.at(-1);if(s.completionReason==='MAX_SAMPLES')warnings.push('Render stopped at the sample ceiling rather than convergence.');if(last&&safe(last.noise,0)>safe(last.noiseTarget??s.settings.noiseTarget,Infinity))warnings.push('Residual noise is above target.');if(s.pixels.total>0&&s.pixels.active/s.pixels.total>.95&&last?.skipStablePixels)warnings.push('Stable-pixel skipping is enabled but almost all pixels remain active.');const reuse=s.visibility.requested? s.visibility.reused/s.visibility.requested:0;if(reuse>.98){warnings.push('Visibility reuse is extremely aggressive; verify with real shadow rays.');rec.push('Run visibility-cache A/B validation.');}const mismatch=s.visibility.verified?s.visibility.mismatch/s.visibility.verified:0;if(mismatch>.01)warnings.push('Visibility-cache verification mismatch exceeds 1%.');const raw=s.luminance.raw.mean,disp=s.luminance.display.mean;if(raw!=null&&disp!=null&&raw>0.05&&disp<raw*.15)rec.push('Investigate exposure/tone/display transform: HDR energy exists before display.');if(raw!=null&&raw<0.02)rec.push('Investigate light radiance/attenuation/visibility/BSDF: raw HDR is dark.');const dom=this.dominantVarianceSource();if(this.aovVariance[dom]>0)rec.push(`Prioritize ${dom} ray budget; it is the dominant measured variance source.`);if(totalMs&&s.rays.total){const rps=s.rays.total/(totalMs/1000);if(rps<10000)warnings.push(`Low ray throughput (${Math.round(rps)} rays/s).`);}if(s.backend.name==='unknown')warnings.push('Renderer backend is unknown.');if(s.backend.workers===0&&s.backend.threads==null)warnings.push('Worker/thread utilization is not measured.');const evidence=(s.passes.length>1?2:0)+(s.rays.total>0?2:0)+(s.luminance.raw.count>0?2:0)+(Object.values(s.aovVariance).some(v=>v>0)?2:0)+(s.visibility.requested>0?1:0)+(s.stages.length>3?1:0);const confidence=evidence>=8?'HIGH':evidence>=5?'MEDIUM':'LOW';let verdict=warnings.length?'PASS_WITH_WARNINGS':'PASS';if(s.completionReason==='ERROR')verdict='FAIL';return{verdict,confidence,warnings,recommendations:rec,dominantVarianceSource:dom};}
  snapshot(){return{schema:2,version:VERSION,renderId:this.renderId,startedAt:this.startedAt,finishedAt:this.finishedAt,completionReason:this.completionReason,settings:{...this.settings},backend:{...this.backend},stages:[...this.stages.values()].map(s=>({name:s.name,count:s.count,totalMs:s.totalMs,minMs:Number.isFinite(s.minMs)?s.minMs:null,maxMs:s.maxMs,lastMs:s.lastMs,meta:s.meta})),rays:{...this.rays},bvh:{...this.bvh},rr:{...this.rr},bounces:JSON.parse(JSON.stringify(this.bounces)),luminance:{raw:this.luminance.raw.snapshot(),exposed:this.luminance.exposed.snapshot(),display:this.luminance.display.snapshot()},lights:Object.fromEntries(Object.entries(this.lights).map(([k,v])=>[k,{samples:v.samples,accepted:v.accepted,occluded:v.occluded,contribution:v.contribution,distanceAttenuation:v.distanceAttenuation.snapshot(),cone:v.cone.snapshot(),ndotl:v.ndotl.snapshot(),bsdf:v.bsdf.snapshot(),lightPdf:v.lightPdf.snapshot(),bsdfPdf:v.bsdfPdf.snapshot(),mis:v.mis.snapshot()}])),visibility:{...this.visibility,hitRate:this.visibility.requested?this.visibility.reused/this.visibility.requested:null,verificationError:this.visibility.verified?this.visibility.mismatch/this.visibility.verified:null},passes:this.passes.slice(),pixels:{...this.pixels},aovVariance:{...this.aovVariance},memory:{...this.memory},experiments:this.experiments.slice(),learning:this.learning};}
  text(){const s=this.snapshot(),L=[];L.push(`3DLite / LitePix L3N Rendering Workflow v${VERSION}`);L.push(`Render ${s.renderId??'-'} | ${s.completionReason}`);L.push(`Backend ${s.backend.name} | Rays ${s.rays.total}`);L.push(`Dominant variance: ${this.dominantVarianceSource()}`);L.push(`L3N: ${s.learning.verdict} | confidence ${s.learning.confidence}`);for(const w of s.learning.warnings||[])L.push(`WARNING: ${w}`);for(const r of s.learning.recommendations||[])L.push(`NEXT: ${r}`);return L.join('\n');}
}

const instance=new L3NRenderingWorkflow();
root.L3NRenderingWorkflow=L3NRenderingWorkflow;
root.__3DLiteL3NRendering=instance;
root.__3DLiteL3NRenderBegin=m=>instance.beginRender(m);
root.__3DLiteL3NRenderEnd=(r,m)=>instance.endRender(r,m);
root.__3DLiteL3NStageBegin=(n,m)=>instance.beginStage(n,m);
root.__3DLiteL3NStageEnd=(n,m)=>instance.endStage(n,m);
root.__3DLiteL3NRenderSnapshot=()=>instance.snapshot();
root.__3DLiteL3NRenderText=()=>instance.text();
root.__3DLiteL3NRenderingVersion=VERSION;
})(typeof window!=='undefined'?window:globalThis);
