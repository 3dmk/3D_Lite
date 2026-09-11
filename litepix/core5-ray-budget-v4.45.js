(function(root){'use strict';
const VERSION='4.45.0',TITLE='3D Lite — LitePix v4.45.0 Adaptive Ray Budget';
const AREA_TYPES=new Set(['rectangle','disc','sphere','mesh']);
const finite=v=>Number.isFinite(v)?v:0;
class LitePixRayBudget445{
  constructor(job,acceleration,compiled,width,height){
    this.job=job;this.acceleration=acceleration;this.compiled=compiled;this.width=width|0;this.height=height|0;
    this.quality=String(job?.settings?.quality||'Preview');
    this.enabled=root.__LitePixRayBudget445Enabled!==false;
    this.cache=new Map();this.requestedShadowTests=0;this.tracedShadowRays=0;this.reusedShadowTests=0;
    this.requestedLightSamples=0;this.selectedLightSamples=0;this.cacheRejects=0;this.maxEntries=262144;
    this.sceneScale=this._sceneScale(acceleration);
    const divisor=this.quality==='Ultra'?512:this.quality==='High'?384:this.quality==='Draft'?160:256;
    this.cellSize=Math.max(1e-5,this.sceneScale/divisor);
    this.directionBins=this.quality==='Ultra'?128:this.quality==='High'?96:this.quality==='Draft'?32:64;
  }
  _sceneScale(acc){
    try{const r=acc?.bvh?.root,n=(r!=null&&r>=0)?acc.bvh.nodes[r]:null;if(n?.min&&n?.max){const dx=n.max[0]-n.min[0],dy=n.max[1]-n.min[1],dz=n.max[2]-n.min[2];return Math.max(1e-3,Math.hypot(dx,dy,dz));}}catch(_){}
    return 100;
  }
  samplesFor(light,requested){
    const n=Math.max(1,requested|0);this.requestedLightSamples+=n;
    if(!this.enabled){this.selectedLightSamples+=n;return n;}
    let cap=n;
    if(AREA_TYPES.has(light?.type))cap=this.quality==='Ultra'?Math.min(n,4):this.quality==='High'?Math.min(n,2):1;
    else cap=1;
    this.selectedLightSamples+=cap;return cap;
  }
  _lightId(light,li){return String(light?.id??light?.uuid??light?.name??li??light?.type??'light');}
  _objectId(hit){return String(hit?.objectId??hit?.object?.uuid??hit?.meshId??hit?.instanceId??hit?.materialId??'surface');}
  _q(v,s){return Math.round(finite(v)/s);}
  _dirKey(d){const bins=this.directionBins;return `${Math.round(finite(d?.[0])*bins)},${Math.round(finite(d?.[1])*bins)},${Math.round(finite(d?.[2])*bins)}`;}
  _key(position,direction,distance,light,li,hit){
    const cs=this.cellSize,p=position||[0,0,0];
    const base=`${this._lightId(light,li)}|${this._objectId(hit)}|${this._q(p[0],cs)},${this._q(p[1],cs)},${this._q(p[2],cs)}`;
    if(AREA_TYPES.has(light?.type))return `${base}|${this._dirKey(direction)}|${this._q(distance,cs*4)}`;
    if(light?.type==='sun')return `${base}|${this._dirKey(direction)}`;
    return base;
  }
  visible(acceleration,position,direction,distance,light,li,hit,traceFn){
    this.requestedShadowTests++;
    if(!this.enabled||typeof traceFn!=='function'){this.tracedShadowRays++;return traceFn();}
    const key=this._key(position,direction,distance,light,li,hit);
    if(this.cache.has(key)){this.reusedShadowTests++;return this.cache.get(key);}
    this.tracedShadowRays++;
    const value=!!traceFn();
    if(this.cache.size<this.maxEntries)this.cache.set(key,value);else this.cacheRejects++;
    return value;
  }
  snapshot(){
    const req=this.requestedShadowTests,tr=this.tracedShadowRays,re=this.reusedShadowTests;
    return Object.freeze({version:VERSION,provider:'LitePix Core5 adaptive ray budget',enabled:this.enabled,quality:this.quality,
      requestedShadowTests:req,tracedShadowRays:tr,reusedShadowTests:re,cacheEntries:this.cache.size,cacheRejects:this.cacheRejects,
      cacheHitRate:req?re/req:0,shadowReductionRatio:tr?req/tr:1,requestedLightSamples:this.requestedLightSamples,
      selectedLightSamples:this.selectedLightSamples,lightSampleReductionRatio:this.selectedLightSamples?this.requestedLightSamples/this.selectedLightSamples:1,
      cellSize:this.cellSize,directionBins:this.directionBins});
  }
}
try{root.__LitePixTitleObserver444?.disconnect?.();}catch(_){}
const enforceTitle=()=>{try{if(typeof document!=='undefined'&&document.title!==TITLE)document.title=TITLE;}catch(_){}};
if(typeof document!=='undefined'){enforceTitle();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enforceTitle,{once:true});setTimeout(enforceTitle,0);}
root.LitePixRayBudget445=LitePixRayBudget445;
root.__LitePixRayBudget445=true;
})(typeof globalThis!=='undefined'?globalThis:window);
