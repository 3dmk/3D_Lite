(function(root){'use strict';
const now=()=>root.performance?.now?.()??Date.now();
function hashView(h,a){if(!a)return Math.imul(h^255,16777619)>>>0;const v=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);h=Math.imul(h^(a.length>>>0),16777619)>>>0;for(let i=0;i<v.length;i++){h^=v[i];h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function meshSig(key,m){let h=2166136261>>>0;for(const a of [m?.positions,m?.indices])h=hashView(h,a);return String(key)+'|'+h.toString(16).padStart(8,'0')+'|'+(m?.positions?.length||0)+'|'+(m?.indices?.length||0);}
class AsyncBVH418{
 constructor(){this.worker=null;this.pending=new Map();this.cache=new Map();this.seq=1;this.prewarmRuns=0;this.workerBuilds=0;this.cacheHits=0;this.failures=0;this.totalWorkerMs=0;this.lastPrewarmMs=0;}
 _ensure(){if(this.worker)return this.worker;if(typeof Worker!=='function')return null;try{const w=new Worker('./litepix/core2-worker-v4.18.js');w.onmessage=e=>{const d=e.data||{},p=this.pending.get(d.id);if(!p)return;this.pending.delete(d.id);if(d.ok){this.workerBuilds++;this.totalWorkerMs+=d.buildMs||0;this.cache.set(d.key,{bvh:d.bvh,buildMs:d.buildMs||0});p.resolve(d);}else{this.failures++;p.reject(new Error(d.error||'LitePix worker build failed'));}};w.onerror=()=>{this.failures++;};this.worker=w;return w;}catch(_){this.failures++;return null;}}
 _sig(o){return meshSig(o?.geometryId??'missing',o?.localMesh);}
 async _build(o){const w=this._ensure();if(!w)return null;const key=this._sig(o);if(this.cache.has(key)){this.cacheHits++;return this.cache.get(key);}const m=o.localMesh,id=this.seq++,positions=new Float32Array(m.positions),indices=new Uint32Array(m.indices);const promise=new Promise((resolve,reject)=>this.pending.set(id,{resolve,reject}));w.postMessage({type:'build',id,key,positions:positions.buffer,indices:indices.buffer,maxLeaf:4,bins:16},[positions.buffer,indices.buffer]);try{await promise;return this.cache.get(key)||null;}catch(_){return null;}}
 async prewarm(scene){const t=now();this.prewarmRuns++;const uniq=new Map();for(const o of scene?.objects||[])if(o?.localMesh&&o?.geometryId&&!uniq.has(String(o.geometryId)))uniq.set(String(o.geometryId),o);await Promise.all([...uniq.values()].map(o=>this._build(o)));this.lastPrewarmMs=now()-t;return this.snapshot();}
 consume(key,mesh){const c=this.cache.get(meshSig(key,mesh));if(!c)return null;const primitives=new Array(c.bvh.triangleCount);for(let i=0;i<primitives.length;i++)primitives[i]={triangleIndex:i};return{nodes:c.bvh.nodes,indices:c.bvh.indices,primitives,workerBuilt:true,workerBuildMs:c.buildMs};}
 snapshot(){return{version:'4.18.0',provider:'LitePix Core2 worker BVH prewarm',supported:typeof Worker==='function',prewarmRuns:this.prewarmRuns,workerBuilds:this.workerBuilds,cacheHits:this.cacheHits,failures:this.failures,cachedBLAS:this.cache.size,lastPrewarmMs:+this.lastPrewarmMs.toFixed(3),totalWorkerMs:+this.totalWorkerMs.toFixed(3)};}
 dispose(){try{this.worker?.terminate?.();}catch(_){}this.worker=null;this.pending.clear();}
}
const LitePixCore2Worker418=new AsyncBVH418();
root.LitePixCore2Worker418=LitePixCore2Worker418;root.__LitePixCore2Worker418=true;
})(typeof globalThis!=='undefined'?globalThis:window);