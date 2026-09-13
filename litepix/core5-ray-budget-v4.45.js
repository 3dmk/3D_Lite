(function(root){'use strict';
const VERSION='4.48.0',TITLE='3D Lite — LitePix v4.48.0 L3N Rendering Evidence';
const AREA_TYPES=new Set(['rectangle','disc','sphere','mesh']);
const finite=v=>Number.isFinite(v)?v:0;
const clamp01=v=>Math.max(0,Math.min(1,finite(v)));
const smoothstep=(a,b,x)=>{if(a===b)return x>=b?1:0;const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);};
const luminance=c=>{if(Array.isArray(c))return Math.max(0,.2126*finite(c[0])+.7152*finite(c[1])+.0722*finite(c[2]));return Math.max(0,.2126*finite(c?.r)+.7152*finite(c?.g)+.0722*finite(c?.b));};
const safeCall=(name,...args)=>{try{const f=root[name];if(typeof f==='function')return f(...args);}catch(_){}return undefined;};
class LitePixRayBudget445{
  constructor(job,acceleration,compiled,width,height){
    this.job=job;this.acceleration=acceleration;this.compiled=compiled;this.width=width|0;this.height=height|0;
    this.quality=String(job?.settings?.quality||'Preview');this.enabled=root.__LitePixRayBudget445Enabled!==false;
    this.cache=new Map();this.requestedShadowTests=0;this.tracedShadowRays=0;this.reusedShadowTests=0;this.requestedLightSamples=0;this.selectedLightSamples=0;this.cacheRejects=0;this.maxEntries=262144;
    this.sceneScale=this._sceneScale(acceleration);const divisor=this.quality==='Ultra'?384:this.quality==='High'?192:this.quality==='Draft'?64:96;
    this.cellSize=Math.max(1e-5,this.sceneScale/divisor);this.directionBins=this.quality==='Ultra'?128:this.quality==='High'?96:this.quality==='Draft'?32:64;
    this.vl={enabled:root.__LitePixVarianceLumaEnabled!==false,varianceScale:8,lumaDark:0.04,lumaMid:0.5,minWeight:.15,maxExtra:this.quality==='Ultra'?7:this.quality==='High'?5:this.quality==='Draft'?2:3};
    this.vlStats={queries:0,converged:0,extraSamples:0,shadowBoosts:0,reflectionBoosts:0,giBoosts:0,refractionBoosts:0,continuations:0,terminations:0,importanceSum:0,varianceSum:0,lumaSum:0};
    this.shadowVerify={enabled:root.__LitePixShadowVerificationEnabled!==false,every:Math.max(256,(root.__LitePixShadowVerificationEvery|0)||4096),checks:0,mismatches:0,lastMismatch:null};
  }
  _sceneScale(acc){try{const r=acc?.bvh?.root,n=(r!=null&&r>=0)?acc.bvh.nodes[r]:null;if(n?.min&&n?.max){const dx=n.max[0]-n.min[0],dy=n.max[1]-n.min[1],dz=n.max[2]-n.min[2];return Math.max(1e-3,Math.hypot(dx,dy,dz));}}catch(_){}return 100;}
  _signal(ctx={}){const variance=Math.max(0,finite(ctx.variance??ctx.noiseVariance??ctx.noise));const L=luminance(ctx.hdrColor??ctx.color??ctx.radiance??ctx.throughput??[0,0,0]);const V=clamp01(variance*this.vl.varianceScale);const dark=1-smoothstep(this.vl.lumaDark,this.vl.lumaMid,L);const highlight=smoothstep(1,4,L);const lumaWeight=Math.max(this.vl.minWeight,clamp01(.35+.5*dark+.15*highlight));const edge=clamp01(finite(ctx.normalEdge)+finite(ctx.depthEdge)+finite(ctx.materialEdge));const path=ctx.throughput==null?1:clamp01(Math.max(.05,luminance(ctx.throughput)));const importance=clamp01(V*(.72+.18*edge+.10*path)*lumaWeight+edge*.18);this.vlStats.queries++;this.vlStats.importanceSum+=importance;this.vlStats.varianceSum+=variance;this.vlStats.lumaSum+=L;return{variance,L,V,dark,edge,path,importance};}
  budgetFor(kind,base=1,ctx={}){const b=Math.max(0,base|0);if(!this.enabled||!this.vl.enabled)return b;const s=this._signal(ctx);const converged=ctx.converged===true||((ctx.sampleCount|0)>1&&s.V<.035&&s.edge<.08);if(converged){this.vlStats.converged++;return Math.max(kind==='sample'?0:1,Math.min(b,1));}let gain=1;switch(kind){case'shadow':gain=1.0;break;case'reflection':gain=1.15;this.vlStats.reflectionBoosts++;break;case'refraction':gain=1.05;this.vlStats.refractionBoosts++;break;case'gi':case'diffuse':gain=1.2;this.vlStats.giBoosts++;break;default:gain=1;}
    const extra=Math.round(this.vl.maxExtra*s.importance*gain);if(kind==='shadow'&&extra>0)this.vlStats.shadowBoosts++;this.vlStats.extraSamples+=extra;return Math.max(kind==='sample'?0:1,b+extra);
  }
  shouldContinue(throughput,bounce,rng=Math.random,ctx={}){if((bounce|0)<3)return true;const energy=clamp01(luminance(throughput));const s=this._signal({...ctx,throughput});const survival=Math.max(.05,Math.min(.95,.10+.62*energy+.28*s.importance));const keep=rng()<survival;if(keep)this.vlStats.continuations++;else this.vlStats.terminations++;safeCall('__3DLiteL3NRoulette',keep);return keep;}
  denoiseWeight(ctx={}){const s=this._signal(ctx);return clamp01(.65*s.V+.25*s.dark+.10*s.edge);}
  samplesFor(light,requested,ctx){const n=Math.max(1,requested|0);this.requestedLightSamples+=n;if(!this.enabled){this.selectedLightSamples+=n;return n;}let cap=n;if(AREA_TYPES.has(light?.type))cap=this.quality==='Ultra'?Math.min(n,4):this.quality==='High'?Math.min(n,2):1;else cap=1;if(ctx&&this.vl.enabled)cap=Math.min(n,this.budgetFor('shadow',cap,ctx));this.selectedLightSamples+=cap;return cap;}
  _lightId(light,li){return String(light?.id??light?.uuid??light?.name??li??light?.type??'light');}_objectId(hit){return String(hit?.objectId??hit?.object?.uuid??hit?.meshId??hit?.instanceId??hit?.materialId??'surface');}_q(v,s){return Math.round(finite(v)/s);}_dirKey(d){const bins=this.directionBins;return `${Math.round(finite(d?.[0])*bins)},${Math.round(finite(d?.[1])*bins)},${Math.round(finite(d?.[2])*bins)}`;}
  _key(position,direction,distance,light,li,hit){const cs=this.cellSize,p=position||[0,0,0],base=`${this._lightId(light,li)}|${this._objectId(hit)}|${this._q(p[0],cs)},${this._q(p[1],cs)},${this._q(p[2],cs)}`;if(AREA_TYPES.has(light?.type))return `${base}|${this._dirKey(direction)}|${this._q(distance,cs*4)}`;if(light?.type==='sun')return `${base}|${this._dirKey(direction)}`;return base;}
  visible(acceleration,position,direction,distance,light,li,hit,traceFn){
    this.requestedShadowTests++;safeCall('__3DLiteL3NCache','shadowVisibility','lookup',1);
    if(!this.enabled||typeof traceFn!=='function'){
      this.tracedShadowRays++;safeCall('__3DLiteL3NRay','shadow',1);safeCall('__3DLiteL3NCache','shadowVisibility','miss',1);
      return typeof traceFn==='function'?traceFn():false;
    }
    const key=this._key(position,direction,distance,light,li,hit);
    if(this.cache.has(key)){
      this.reusedShadowTests++;safeCall('__3DLiteL3NCache','shadowVisibility','hit',1);
      const cached=!!this.cache.get(key);
      if(this.shadowVerify.enabled&&(this.requestedShadowTests%this.shadowVerify.every)===0){
        this.shadowVerify.checks++;this.tracedShadowRays++;safeCall('__3DLiteL3NRay','shadow',1);safeCall('__3DLiteL3NCache','shadowVisibility','verify',1);
        const actual=!!traceFn();
        if(actual!==cached){
          this.shadowVerify.mismatches++;this.shadowVerify.lastMismatch={at:Date.now(),key,cached,actual,lightId:this._lightId(light,li),objectId:this._objectId(hit)};
          this.cache.set(key,actual);safeCall('__3DLiteL3NCache','shadowVisibility','verify-fail',1);
          return actual;
        }
      }
      return cached;
    }
    this.tracedShadowRays++;safeCall('__3DLiteL3NRay','shadow',1);safeCall('__3DLiteL3NCache','shadowVisibility','miss',1);
    const value=!!traceFn();if(this.cache.size<this.maxEntries)this.cache.set(key,value);else this.cacheRejects++;return value;
  }
  snapshot(){const req=this.requestedShadowTests,tr=this.tracedShadowRays,re=this.reusedShadowTests,q=this.vlStats.queries||1;return Object.freeze({version:VERSION,provider:'LitePix Core5 variance+luma adaptive ray budget + verified visibility reuse',enabled:this.enabled,quality:this.quality,requestedShadowTests:req,tracedShadowRays:tr,reusedShadowTests:re,cacheEntries:this.cache.size,cacheRejects:this.cacheRejects,cacheHitRate:req?re/req:0,shadowReductionRatio:tr?req/tr:1,requestedLightSamples:this.requestedLightSamples,selectedLightSamples:this.selectedLightSamples,lightSampleReductionRatio:this.selectedLightSamples?this.requestedLightSamples/this.selectedLightSamples:1,cellSize:this.cellSize,directionBins:this.directionBins,shadowVerification:{...this.shadowVerify,errorRate:this.shadowVerify.checks?this.shadowVerify.mismatches/this.shadowVerify.checks:0},varianceLuma:{enabled:this.vl.enabled,...this.vlStats,meanImportance:this.vlStats.importanceSum/q,meanVariance:this.vlStats.varianceSum/q,meanLuma:this.vlStats.lumaSum/q}});}
}
try{root.__LitePixTitleObserver444?.disconnect?.();root.__LitePixTitleObserver445?.disconnect?.();root.__LitePixTitleObserver447?.disconnect?.();}catch(_){}
const enforceTitle=()=>{try{if(typeof document!=='undefined'&&document.title!==TITLE)document.title=TITLE;}catch(_){}};
if(typeof document!=='undefined'){enforceTitle();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enforceTitle,{once:true});setTimeout(enforceTitle,0);setTimeout(enforceTitle,1100);setTimeout(enforceTitle,2200);try{const target=document.querySelector('title')||document.head;if(target&&typeof MutationObserver==='function'){const observer=new MutationObserver(enforceTitle);observer.observe(target,{childList:true,subtree:true,characterData:true});root.__LitePixTitleObserver448=observer;}}catch(_){}}
root.LitePixRayBudget445=LitePixRayBudget445;root.__LitePixRayBudget445=true;root.__LitePixVarianceLumaRayBudgetVersion=VERSION;root.__LitePixShadowVerificationVersion=VERSION;
})(typeof globalThis!=='undefined'?globalThis:window);
