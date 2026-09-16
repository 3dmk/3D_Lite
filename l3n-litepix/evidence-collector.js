(function(root){'use strict';
const VERSION='0.1.0';
const now=()=>root.performance?.now?.()??Date.now();
class LitePixEvidenceCollector{
 constructor(){this.reset();}
 reset(){this.startedAt=now();this.events=[];this.counters=Object.create(null);this.timings=Object.create(null);this.meta={};}
 setMeta(k,v){this.meta[k]=v;return v;}
 count(k,n=1){this.counters[k]=(this.counters[k]||0)+n;return this.counters[k];}
 mark(stage,detail={}){const e={stage,at:now(),detail};this.events.push(e);return e;}
 measure(stage,fn){const t=now();try{return fn();}finally{const ms=now()-t;const s=this.timings[stage]||(this.timings[stage]={calls:0,totalMs:0,maxMs:0});s.calls++;s.totalMs+=ms;s.maxMs=Math.max(s.maxMs,ms);}}
 snapshot(){const timings={};for(const [k,v] of Object.entries(this.timings))timings[k]={...v,meanMs:v.calls?v.totalMs/v.calls:0};return Object.freeze({schema:1,version:VERSION,startedAt:this.startedAt,capturedAt:now(),meta:{...this.meta},counters:{...this.counters},timings,events:this.events.slice()});}
}
const collector=new LitePixEvidenceCollector();
root.L3NLitePixEvidence=collector;
root.__L3NLitePixEvidenceSnapshot=()=>collector.snapshot();
})(typeof globalThis!=='undefined'?globalThis:window);
