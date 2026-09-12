(function(root){'use strict';
const VERSION='4.47.0',now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const clamp01=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
const lum=c=>Array.isArray(c)?Math.max(0,.2126*(c[0]||0)+.7152*(c[1]||0)+.0722*(c[2]||0)):Math.max(0,.2126*(c?.r||0)+.7152*(c?.g||0)+.0722*(c?.b||0));
class L3NRendering447{
  constructor(){this.reset();}
  reset(){this.started=now();this.pass=0;this.history=[];this.classes={shadow:0,gi:0,reflection:0,refraction:0,sample:0,continue:0,terminate:0};this.last=null;this.recommendations=[];this.lastObservedKey='';}
  observe(input={}){const variance=Math.max(0,Number(input.variance??input.noise??0)||0),luma=lum(input.hdrColor??input.color??[0,0,0]),rays=Math.max(0,Number(input.rays??input.totalRays??0)||0),ms=Math.max(0,Number(input.elapsedMs??0)||0),sample=Math.max(0,Number(input.sample??input.currentSamples??0)||0),noiseTarget=Math.max(0,Number(input.noiseTarget??0)||0),renderId=String(input.renderId??'');
    const key=`${renderId}|${sample}|${Math.round(ms/250)}|${variance.toFixed(6)}`;if(key===this.lastObservedKey)return this.snapshot();this.lastObservedKey=key;
    const entry={pass:++this.pass,time:Date.now(),renderId,variance,luma,rays,elapsedMs:ms,sample,noiseTarget,status:String(input.status??'')};this.history.push(entry);if(this.history.length>128)this.history.shift();this.last=entry;this._learn();return this.snapshot();}
  recordDecision(kind,n=1){if(this.classes[kind]==null)this.classes[kind]=0;this.classes[kind]+=Math.max(0,n|0);}
  _learn(){const h=this.history;if(h.length<2){this.recommendations=[];return;}const a=h[h.length-2],b=h[h.length-1],dv=b.variance-a.variance,dr=b.rays-a.rays,dt=Math.max(1,b.elapsedMs-a.elapsedMs),rps=dr>0?dr/(dt/1000):0;const rec=[];
    if(b.variance>.10&&dv>=-.002)rec.push('variance plateau: redirect budget to responsible ray class instead of global SPP');
    if(b.variance<.02&&dr>0)rec.push('converged region: reduce future samples and prefer reuse');
    if(rps>0&&rps<15000)rec.push('low ray throughput: favor reuse/cache before adding rays');
    if(b.luma<.06&&b.variance>.04)rec.push('dark noisy region: prioritize GI/shadow refinement and feature-aware denoise');
    if(b.luma>2&&b.variance>.04)rec.push('bright unstable region: preserve highlight/reflection detail; avoid aggressive blur');
    this.recommendations=rec;
  }
  score(ctx={}){const variance=Math.max(0,Number(ctx.variance??0)||0),L=lum(ctx.hdrColor??ctx.color??[0,0,0]),v=clamp01(variance*8),dark=1-clamp01((L-.04)/.46),edge=clamp01((ctx.normalEdge||0)+(ctx.depthEdge||0)+(ctx.materialEdge||0));return clamp01(v*(.55+.30*dark)+.15*edge);}
  observeHealth(){try{if(typeof root.__3DLiteRenderHealth!=='function')return;const h=root.__3DLiteRenderHealth()||{},r=h.render||h.lifecycle||h,s=h.sampling||h.convergence||{},ray=h.rays||h.rayGeneration||{},color=h.color||{};this.observe({renderId:r.renderId??h.renderId,status:r.status??h.status,currentSamples:s.currentSamples??h.currentSamples,noise:s.noise??h.noise,noiseTarget:s.noiseTarget??h.noiseTarget,totalRays:ray.total??ray.totalRays??h.totalRays,elapsedMs:r.elapsedMs??h.elapsedMs,hdrColor:color.meanHdr??color.hdrMean});}catch(_){} }
  snapshot(){const h=this.history,n=h.length,last=this.last;let varianceTrend=0;if(n>1)varianceTrend=h[n-1].variance-h[n-2].variance;return Object.freeze({version:VERSION,provider:'L3N Rendering variance+luma feedback',active:true,passes:n,last,varianceTrend,decisions:{...this.classes},recommendations:[...this.recommendations],elapsedMs:now()-this.started});}
  text(){const s=this.snapshot(),l=s.last||{};return [`L3N RENDERING v${VERSION}`,`passes: ${s.passes}`,`render: ${l.renderId||'-'} ${l.status||''}`,`variance: ${Number(l.variance||0).toFixed(6)}`,`luma: ${Number(l.luma||0).toFixed(6)}`,`varianceTrend: ${Number(s.varianceTrend||0).toFixed(6)}`,`decisions: ${JSON.stringify(s.decisions)}`,`recommendations: ${s.recommendations.length?s.recommendations.join(' | '):'none'}`].join('\n');}
}
const inst=root.__3DLiteL3NRendering instanceof L3NRendering447?root.__3DLiteL3NRendering:new L3NRendering447();
root.L3NRendering447=L3NRendering447;root.__3DLiteL3NRendering=inst;root.__3DLiteL3NRenderingVersion=VERSION;root.__3DLiteL3NRenderingSnapshot=()=>inst.snapshot();root.__3DLiteL3NRenderingText=()=>inst.text();root.__3DLiteL3NRenderingObserve=x=>inst.observe(x);root.__3DLiteL3NRenderingReset=()=>inst.reset();
if(typeof setInterval==='function'){try{if(root.__3DLiteL3NRenderingTimer)clearInterval(root.__3DLiteL3NRenderingTimer);root.__3DLiteL3NRenderingTimer=setInterval(()=>inst.observeHealth(),1000);}catch(_){}}
})(typeof globalThis!=='undefined'?globalThis:window);
