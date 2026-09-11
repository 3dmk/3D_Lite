(function(root){'use strict';
const Scene413=root.LitePixSceneAcceleration413;
if(typeof Scene413!=='function')throw new Error('LitePix v4.14 requires LitePixSceneAcceleration413');
const now=()=>root.performance?.now?.()??Date.now();
const sameTransform=(a,b)=>{if(!a||!b||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;};
const copyTransform=o=>o?.transform?Array.from(o.transform):null;
function fnvBytes(h,view){const b=new Uint8Array(view.buffer,view.byteOffset,view.byteLength);for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function meshHash(mesh){if(!mesh)return 'missing';let h=2166136261>>>0;for(const a of [mesh.positions,mesh.normals,mesh.uvs,mesh.indices,mesh.materialIndices]){if(!a){h^=0xff;h=Math.imul(h,16777619)>>>0;continue;}h^=a.length>>>0;h=Math.imul(h,16777619)>>>0;h=fnvBytes(h,a);}return h.toString(16).padStart(8,'0');}
function topologyDescriptor(scene){if(!scene?.objects?.length)return{signature:'empty',objects:[]};const geometryHashes=new Map(),parts=[],objects=[];for(let i=0;i<scene.objects.length;i++){const o=scene.objects[i],g=String(o?.geometryId??'missing');let hash=geometryHashes.get(g);if(hash===undefined){hash=meshHash(o?.localMesh);geometryHashes.set(g,hash);}const rec={id:String(o?.id??i),geometryId:g,meshHash:hash,materialSlots:o?.materialIds?.length||0};objects.push(rec);parts.push(rec.id+'|'+rec.geometryId+'|'+rec.meshHash+'|'+rec.materialSlots);}return{signature:parts.join(';;'),objects};}
class LitePixPersistentSceneCache414{
 constructor(){this.entry=null;this.builds=0;this.refits=0;this.cleanReuses=0;this.invalidations=0;this.lastMode='cold';this.lastDirtyTransforms=0;this.lastPrepareMs=0;this.totalPrepareMs=0;}
 reset(){this.entry=null;this.lastMode='reset';this.lastDirtyTransforms=0;}
 _newEntry(base,job,desc){const inner=Scene413.wrap(base,job);const transforms=(job?.renderScene?.objects||[]).map(copyTransform);this.entry={signature:desc.signature,descriptor:desc.objects,inner,transforms};this.builds++;this.lastMode='rebuild';this.lastDirtyTransforms=transforms.length;job.litePixCore2Scene413=inner;return inner;}
 prepare(base,job){const t0=now(),scene=job?.renderScene,desc=topologyDescriptor(scene);let inner=null,mode='rebuild',dirty=0;if(this.entry&&this.entry.signature===desc.signature){inner=this.entry.inner;inner.base=base;inner.store=base?.store;inner.job=job;inner.traceRays=0;inner.shadowRays=0;const next=(scene?.objects||[]).map(copyTransform);for(let i=0;i<next.length;i++)if(!sameTransform(next[i],this.entry.transforms[i]))dirty++;if(dirty){const ok=inner.updateTransforms?.(scene)===true;if(ok){this.refits++;mode='refit';this.entry.transforms=next;}else{this.invalidations++;inner=this._newEntry(base,job,desc);mode='rebuild-fallback';dirty=next.length;}}else{this.cleanReuses++;mode='reuse-clean';}job.litePixCore2Scene413=inner;}else{if(this.entry)this.invalidations++;inner=this._newEntry(base,job,desc);dirty=scene?.objects?.length||0;mode='rebuild';}
 const ms=now()-t0;this.lastPrepareMs=ms;this.totalPrepareMs+=ms;this.lastMode=mode;this.lastDirtyTransforms=dirty;return new LitePixCore2PersistentAcceleration414(inner,base,job,this,mode,dirty,ms);}
 snapshot(){const inner=this.entry?.inner?.snapshot?.()||null;return{version:'4.14.0',provider:'LitePix Core2 persistent BLAS/TLAS cache',mode:this.lastMode,dirtyTransforms:this.lastDirtyTransforms,builds:this.builds,refits:this.refits,cleanReuses:this.cleanReuses,invalidations:this.invalidations,lastPrepareMs:+this.lastPrepareMs.toFixed(3),totalPrepareMs:+this.totalPrepareMs.toFixed(3),cachedTopology:!!this.entry,instances:inner?.instances??0,uniqueBLAS:inner?.uniqueBLAS??0,tlasNodes:inner?.tlasNodes??0};}
}
class LitePixCore2PersistentAcceleration414{
 constructor(inner,base,job,cache,mode,dirty,prepareMs){this.inner=inner;this.base=base;this.store=base?.store||inner?.store;this.job=job;this.cache=cache;this.mode=mode;this.dirtyTransforms=dirty;this.prepareMs=prepareMs;}
 static wrap(base,job){if(base instanceof LitePixCore2PersistentAcceleration414)return base;if(job?.litePixCore2Persistent414?.base===base)return job.litePixCore2Persistent414;const a=LitePixCore2PersistentCache414.prepare(base,job);if(job)job.litePixCore2Persistent414=a;return a;}
 trace(ray){return this.inner.trace(ray);}
 occluded(ray){return this.inner.occluded(ray);}
 snapshot(){const s=this.inner?.snapshot?.()||{};return{...s,version:'4.14.0',provider:'LitePix Core2 persistent BLAS/TLAS cache',cacheMode:this.mode,dirtyTransforms:this.dirtyTransforms,prepareMs:+this.prepareMs.toFixed(3),cache:this.cache.snapshot()};}
}
const LitePixCore2PersistentCache414=new LitePixPersistentSceneCache414();
root.LitePixCore2PersistentCache414=LitePixCore2PersistentCache414;
root.LitePixCore2PersistentAcceleration414=LitePixCore2PersistentAcceleration414;
root.__LitePixCore2Persistent414=true;
})(typeof globalThis!=='undefined'?globalThis:window);