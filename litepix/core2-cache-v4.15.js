(function(root){'use strict';
const Scene413=root.LitePixSceneAcceleration413, LocalBLAS413=root.LitePixLocalBLAS413;
if(typeof Scene413!=='function'||typeof LocalBLAS413!=='function')throw new Error('LitePix v4.15 requires v4.13 scene + exported local BLAS');
const now=()=>root.performance?.now?.()??Date.now();
const sameTransform=(a,b)=>{if(!a||!b||a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;};
const copyTransform=o=>o?.transform?Array.from(o.transform):null;
function fnvBytes(h,view){const b=new Uint8Array(view.buffer,view.byteOffset,view.byteLength);for(let i=0;i<b.length;i++){h^=b[i];h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function meshHash(mesh){if(!mesh)return'missing';let h=2166136261>>>0;for(const a of [mesh.positions,mesh.normals,mesh.uvs,mesh.indices,mesh.materialIndices]){if(!a){h^=255;h=Math.imul(h,16777619)>>>0;continue;}h^=a.length>>>0;h=Math.imul(h,16777619)>>>0;h=fnvBytes(h,a);}return h.toString(16).padStart(8,'0');}
function describe(scene){const objects=[],parts=[];for(let i=0;i<(scene?.objects?.length||0);i++){const o=scene.objects[i],rec={id:String(o?.id??i),geometryId:String(o?.geometryId??'missing'),materialSlots:o?.materialIds?.length||0,meshHash:meshHash(o?.localMesh)};objects.push(rec);parts.push(rec.id+'|'+rec.geometryId+'|'+rec.materialSlots);}return{topology:parts.join(';;'),objects};}
class LitePixPartialBLASCache415{
 constructor(){this.entry=null;this.builds=0;this.refits=0;this.cleanReuses=0;this.partialBLASUpdates=0;this.blasRebuilds=0;this.invalidations=0;this.lastMode='cold';this.lastDirtyTransforms=0;this.lastDirtyGeometry=[];this.lastPrepareMs=0;this.totalPrepareMs=0;}
 reset(){this.entry=null;this.lastMode='reset';this.lastDirtyTransforms=0;this.lastDirtyGeometry=[];}
 _newEntry(base,job,desc){const inner=Scene413.wrap(base,job),transforms=(job?.renderScene?.objects||[]).map(copyTransform);this.entry={topology:desc.topology,descriptor:desc.objects,inner,transforms};this.builds++;this.lastMode='rebuild';job.litePixCore2Scene413=inner;return inner;}
 _partialGeometry(scene,changed){const inner=this.entry?.inner;if(!inner||inner.fallback||!inner.blasByKey||!inner.instances)return false;try{for(const gid of changed){const oi=scene.objects.findIndex(o=>String(o?.geometryId??'missing')===gid);if(oi<0||!scene.objects[oi]?.localMesh)return false;const b=new LocalBLAS413(scene.objects[oi].localMesh,gid);inner.blasByKey.set(gid,b);this.blasRebuilds++;}for(const inst of inner.instances){const gid=String(scene.objects[inst.objectIndex]?.geometryId??'missing');if(changed.has(gid))inst.blas=inner.blasByKey.get(gid);}if(inner.updateTransforms?.(scene)!==true)return false;return true;}catch(_){return false;}}
 prepare(base,job){const t0=now(),scene=job?.renderScene,desc=describe(scene);let inner,mode='rebuild',dirtyTransforms=0,dirtyGeometry=[];
 if(this.entry&&this.entry.topology===desc.topology){const prev=this.entry.descriptor,changed=new Set();for(let i=0;i<desc.objects.length;i++)if(desc.objects[i].meshHash!==prev[i]?.meshHash)changed.add(desc.objects[i].geometryId);dirtyGeometry=[...changed];inner=this.entry.inner;inner.base=base;inner.store=base?.store;inner.job=job;inner.traceRays=0;inner.shadowRays=0;const next=(scene?.objects||[]).map(copyTransform);for(let i=0;i<next.length;i++)if(!sameTransform(next[i],this.entry.transforms[i]))dirtyTransforms++;
   if(changed.size){if(this._partialGeometry(scene,changed)){this.partialBLASUpdates++;mode='partial-blas';this.entry.descriptor=desc.objects;this.entry.transforms=next;this.refits++;}else{this.invalidations++;inner=this._newEntry(base,job,desc);mode='rebuild-fallback';dirtyTransforms=next.length;}}
   else if(dirtyTransforms){if(inner.updateTransforms?.(scene)===true){this.refits++;mode='refit';this.entry.transforms=next;}else{this.invalidations++;inner=this._newEntry(base,job,desc);mode='rebuild-fallback';dirtyTransforms=next.length;}}
   else{this.cleanReuses++;mode='reuse-clean';}
   job.litePixCore2Scene413=inner;
 }else{if(this.entry)this.invalidations++;inner=this._newEntry(base,job,desc);dirtyTransforms=scene?.objects?.length||0;dirtyGeometry=[...new Set(desc.objects.map(o=>o.geometryId))];mode='rebuild';}
 const ms=now()-t0;this.lastPrepareMs=ms;this.totalPrepareMs+=ms;this.lastMode=mode;this.lastDirtyTransforms=dirtyTransforms;this.lastDirtyGeometry=dirtyGeometry;return new LitePixCore2PartialAcceleration415(inner,base,job,this,mode,dirtyTransforms,dirtyGeometry,ms);}
 snapshot(){const s=this.entry?.inner?.snapshot?.()||null;return{version:'4.15.0',provider:'LitePix Core2 partial BLAS cache',mode:this.lastMode,dirtyTransforms:this.lastDirtyTransforms,dirtyGeometry:this.lastDirtyGeometry,builds:this.builds,refits:this.refits,cleanReuses:this.cleanReuses,partialBLASUpdates:this.partialBLASUpdates,blasRebuilds:this.blasRebuilds,invalidations:this.invalidations,lastPrepareMs:+this.lastPrepareMs.toFixed(3),totalPrepareMs:+this.totalPrepareMs.toFixed(3),instances:s?.instances??0,uniqueBLAS:s?.uniqueBLAS??0,tlasNodes:s?.tlasNodes??0};}
}
class LitePixCore2PartialAcceleration415{
 constructor(inner,base,job,cache,mode,dirtyTransforms,dirtyGeometry,prepareMs){this.inner=inner;this.base=base;this.store=base?.store||inner?.store;this.job=job;this.cache=cache;this.mode=mode;this.dirtyTransforms=dirtyTransforms;this.dirtyGeometry=dirtyGeometry;this.prepareMs=prepareMs;}
 static wrap(base,job){if(base instanceof LitePixCore2PartialAcceleration415)return base;if(job?.litePixCore2Partial415?.base===base)return job.litePixCore2Partial415;const a=LitePixCore2PartialCache415.prepare(base,job);if(job)job.litePixCore2Partial415=a;return a;}
 trace(ray){return this.inner.trace(ray);} occluded(ray){return this.inner.occluded(ray);}
 snapshot(){const s=this.inner?.snapshot?.()||{};return{...s,version:'4.15.0',provider:'LitePix Core2 partial BLAS cache',cacheMode:this.mode,dirtyTransforms:this.dirtyTransforms,dirtyGeometry:this.dirtyGeometry,prepareMs:+this.prepareMs.toFixed(3),cache:this.cache.snapshot()};}
}
const LitePixCore2PartialCache415=new LitePixPartialBLASCache415();
root.LitePixCore2PartialCache415=LitePixCore2PartialCache415;root.LitePixCore2PartialAcceleration415=LitePixCore2PartialAcceleration415;root.__LitePixCore2Partial415=true;
})(typeof globalThis!=='undefined'?globalThis:window);