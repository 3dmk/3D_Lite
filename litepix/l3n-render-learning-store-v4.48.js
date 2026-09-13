(function(root){'use strict';
const VERSION='4.48.0',SCHEMA=1,KEY='3dlite:l3n-render-learning:v4.48';
const copy=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return null;}};
class L3NRenderLearningStore{
 constructor(storage){this.storage=storage||((typeof localStorage!=='undefined')?localStorage:null);this.data={schema:SCHEMA,version:VERSION,baselines:[],evidence:[],patterns:[],experiments:[],referenceResults:[],updatedAt:Date.now()};this.load();}
 load(){if(!this.storage)return this.data;try{const raw=this.storage.getItem(KEY);if(!raw)return this.data;const d=JSON.parse(raw);if(d?.schema===SCHEMA&&Array.isArray(d.baselines)){this.data={...this.data,...d,version:VERSION};}}catch(_){}return this.data;}
 save(){this.data.updatedAt=Date.now();if(this.storage)try{this.storage.setItem(KEY,JSON.stringify(this.data));}catch(_){}return this.snapshot();}
 _push(k,v,max){this.data[k].push(copy(v));if(this.data[k].length>max)this.data[k].splice(0,this.data[k].length-max);return this.save();}
 recordEvidence(snapshot,meta={}){return this._push('evidence',{at:Date.now(),meta:copy(meta),snapshot:copy(snapshot)},64);}
 promoteBaseline(snapshot,meta={}){if(meta.verified!==true)throw new Error('L3N baseline promotion requires verified:true');return this._push('baselines',{at:Date.now(),meta:copy(meta),snapshot:copy(snapshot)},32);}
 recordPattern(type,change,expected,observed,verdict,confidence='MEDIUM'){return this._push('patterns',{at:Date.now(),type:String(type),change:String(change),expected:String(expected),observed:String(observed),verdict:String(verdict),confidence:String(confidence)},256);}
 recordExperiment(row){return this._push('experiments',{at:Date.now(),...copy(row)},128);}
 recordReference(id,result,meta={}){return this._push('referenceResults',{at:Date.now(),id:String(id),result:copy(result),meta:copy(meta)},128);}
 latestBaseline(predicate){for(let i=this.data.baselines.length-1;i>=0;i--){const b=this.data.baselines[i];if(!predicate||predicate(b))return copy(b);}return null;}
 compare(current,baseline=this.latestBaseline()){const b=baseline?.snapshot;if(!b||!current)return{available:false};const metrics={};const add=(k,a,z,lowerBetter=false)=>{if(!Number.isFinite(+a)||!Number.isFinite(+z))return;const before=+z,after=+a,delta=after-before,pct=before?delta/Math.abs(before)*100:0;metrics[k]={before,after,delta,percent:pct,status:Math.abs(pct)<3?'equivalent':(lowerBetter?after<before:after>before)?'improved':'regressed'};};add('quality',current.scores?.quality,b.scores?.quality);add('performance',current.scores?.performance,b.scores?.performance);add('efficiency',current.scores?.efficiency,b.scores?.efficiency);add('correctness',current.scores?.correctness,b.scores?.correctness);add('noise',current.convergence?.lastPass?.noise,b.convergence?.lastPass?.noise,true);add('elapsedMs',current.elapsedMs,b.elapsedMs,true);add('rays',current.rays?.total,b.rays?.total,true);return{available:true,baselineAt:baseline.at,metrics};}
 clearEvidence(){this.data.evidence=[];this.data.experiments=[];return this.save();}
 snapshot(){return copy(this.data);}
}
const store=new L3NRenderLearningStore();
root.L3NRenderLearningStore=L3NRenderLearningStore;root.__3DLiteL3NRenderLearningStore=store;root.__3DLiteL3NRenderLearningStoreVersion=VERSION;root.__3DLiteL3NRecordRenderEvidence=(meta={})=>store.recordEvidence(root.__3DLiteL3NRenderingSnapshot?.()||{},meta);root.__3DLiteL3NPromoteRenderBaseline=(meta={})=>store.promoteBaseline(root.__3DLiteL3NRenderingSnapshot?.()||{},meta);root.__3DLiteL3NCompareRenderBaseline=()=>store.compare(root.__3DLiteL3NRenderingSnapshot?.()||{});root.__3DLiteL3NRenderLearningSnapshot=()=>store.snapshot();
try{const old=root.__3DLiteL3NLearn;if(typeof old==='function'&&!old.__persistent448){const f=(change,expected,observed,verdict,confidence)=>{const r=old(change,expected,observed,verdict,confidence);store.recordPattern('runtime',change,expected,observed,verdict,confidence);return r;};f.__persistent448=true;root.__3DLiteL3NLearn=f;}}catch(_){}
})(typeof globalThis!=='undefined'?globalThis:window);
