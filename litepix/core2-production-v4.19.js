(function(root){'use strict';
const Dyn=root.LitePixCore2DynamicAcceleration417;
if(typeof Dyn!=='function')throw new Error('LitePix v4.19 requires Core2 v4.17');
class Core2Production419{
 constructor(inner,base,job){this.inner=inner;this.base=base;this.store=inner.store;this.job=job;this.started=(root.performance?.now?.()??Date.now());this.traceRays=0;this.shadowRays=0;}
 static wrap(base,job){if(base instanceof Core2Production419)return base;if(job?.litePixCore2Production419?.base===base)return job.litePixCore2Production419;const inner=Dyn.wrap(base,job),a=new Core2Production419(inner,base,job);if(job)job.litePixCore2Production419=a;return a;}
 trace(ray){this.traceRays++;return this.inner.trace(ray);}
 occluded(ray){this.shadowRays++;return this.inner.occluded(ray);}
 snapshot(){const now=root.performance?.now?.()??Date.now(),worker=root.LitePixCore2Worker418?.snapshot?.()||null,tlas=root.LitePixCore2TLASCache416?.snapshot?.()||null,dynamic=root.LitePixCore2DynamicCache417?.snapshot?.()||null,partial=root.LitePixCore2PartialCache415?.snapshot?.()||null;return{version:'4.19.0',provider:'LitePix Core2 production consolidated',architecture:'packed SAH BLAS + partial BLAS invalidation + selective TLAS + static/dynamic split + worker BVH prewarm',traceRays:this.traceRays,shadowRays:this.shadowRays,elapsedMs:+(now-this.started).toFixed(3),worker,tlas,dynamic,partial,inner:this.inner.snapshot?.()||null};}
}
root.LitePixCore2Production419=Core2Production419;root.__LitePixCore2Production419=true;
})(typeof globalThis!=='undefined'?globalThis:window);