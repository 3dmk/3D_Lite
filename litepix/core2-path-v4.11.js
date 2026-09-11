(function(root){'use strict';
const LP=root.LitePixNative=root.LitePixNative||{};
const Core2=LP.Core2;
if(!Core2||typeof Core2.SAHBVH!=='function')throw new Error('LitePix v4.11 requires Core2 SAHBVH');
const now=()=>root.performance?.now?.()??Date.now();
const miss=()=>({hit:false,t:Infinity,u:0,v:0,objectIndex:-1,triangleIndex:-1,position:null,geometricNormal:null,orientedGeometricNormal:null,frontFace:true,materialIndex:0});
function boxEntry(ray,b,tLimit){
  const o=ray.origin,d=ray.direction,mn=b.min,mx=b.max;
  let t0=ray.tMin??1e-5,t1=Math.min(ray.tMax??Infinity,tLimit),a,c,q;
  let dv=d[0];if(Math.abs(dv)<1e-12){if(o[0]<mn[0]||o[0]>mx[0])return Infinity;}else{a=(mn[0]-o[0])/dv;c=(mx[0]-o[0])/dv;if(a>c){q=a;a=c;c=q;}if(a>t0)t0=a;if(c<t1)t1=c;if(t1<t0)return Infinity;}
  dv=d[1];if(Math.abs(dv)<1e-12){if(o[1]<mn[1]||o[1]>mx[1])return Infinity;}else{a=(mn[1]-o[1])/dv;c=(mx[1]-o[1])/dv;if(a>c){q=a;a=c;c=q;}if(a>t0)t0=a;if(c<t1)t1=c;if(t1<t0)return Infinity;}
  dv=d[2];if(Math.abs(dv)<1e-12){if(o[2]<mn[2]||o[2]>mx[2])return Infinity;}else{a=(mn[2]-o[2])/dv;c=(mx[2]-o[2])/dv;if(a>c){q=a;a=c;c=q;}if(a>t0)t0=a;if(c<t1)t1=c;if(t1<t0)return Infinity;}
  return t0;
}
function triHit(store,ti,ray,bestT=Infinity,anyOnly=false){
  const tk=ti*3,tris=store.triangles,pos=store.positions;
  const ia=tris[tk]*3,ib=tris[tk+1]*3,ic=tris[tk+2]*3;
  const ax=pos[ia],ay=pos[ia+1],az=pos[ia+2];
  const e1x=pos[ib]-ax,e1y=pos[ib+1]-ay,e1z=pos[ib+2]-az;
  const e2x=pos[ic]-ax,e2y=pos[ic+1]-ay,e2z=pos[ic+2]-az;
  const dx=ray.direction[0],dy=ray.direction[1],dz=ray.direction[2];
  const pvx=dy*e2z-dz*e2y,pvy=dz*e2x-dx*e2z,pvz=dx*e2y-dy*e2x;
  const det=e1x*pvx+e1y*pvy+e1z*pvz;if(Math.abs(det)<1e-12)return null;
  const inv=1/det,tx=ray.origin[0]-ax,ty=ray.origin[1]-ay,tz=ray.origin[2]-az;
  const u=(tx*pvx+ty*pvy+tz*pvz)*inv;if(u<0||u>1)return null;
  const qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x;
  const v=(dx*qx+dy*qy+dz*qz)*inv;if(v<0||u+v>1)return null;
  const t=(e2x*qx+e2y*qy+e2z*qz)*inv;
  if(t<(ray.tMin??1e-5)||t>(ray.tMax??Infinity)||t>=bestT)return null;
  if(anyOnly)return true;
  let nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x;
  const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
  const front=dx*nx+dy*ny+dz*nz<0,gn=[nx,ny,nz],ogn=front?gn:[-nx,-ny,-nz];
  return{hit:true,t,u,v,objectIndex:store.objectIndices[ti]??-1,triangleIndex:ti,position:[ray.origin[0]+dx*t,ray.origin[1]+dy*t,ray.origin[2]+dz*t],geometricNormal:gn,orientedGeometricNormal:ogn,frontFace:front,materialIndex:store.materialIndices[ti]??0};
}
class LitePixCore2PathAcceleration411{
  constructor(base,job){
    this.base=base;this.store=base?.store;if(!this.store)throw new Error('LitePix Core2 path adapter requires RenderAccelerationSet.store');
    this.jobId=job?.id??null;this.vertexCount=base.vertexCount??this.store.positions.length/3;this.triangleCount=base.triangleCount??this.store.triangleCount();
    const primitives=new Array(this.triangleCount);for(let i=0;i<this.triangleCount;i++){const b=this.store.triangleBounds(i);primitives[i]={bounds:{min:b.min,max:b.max},triangleIndex:i};}
    const t=now();this.bvh=new Core2.SAHBVH({maxLeaf:4,bins:16}).build(primitives);this.buildMs=now()-t;this.nodeCount=this.bvh.nodes.length;
    const cap=Math.max(1,this.nodeCount);this.nodeStack=new Int32Array(cap);this.entryStack=new Float64Array(cap);
    this.counters={traceRays:0,shadowRays:0,nodeTests:0,triangleTests:0,hits:0,anyHits:0,traceMs:0};this.stats=Object.freeze({geometry:this.store.stats,bvh:this.bvh.stats(),provider:'LitePix Core2 SAH BVH v4.11'});
  }
  static wrap(base,job){if(base instanceof LitePixCore2PathAcceleration411)return base;if(job?.litePixCore2Acceleration411?.base===base)return job.litePixCore2Acceleration411;const a=new LitePixCore2PathAcceleration411(base,job);if(job)job.litePixCore2Acceleration411=a;return a;}
  trace(ray){
    const t0=now(),c=this.counters;c.traceRays++;let best=miss();const nodes=this.bvh.nodes;if(!nodes.length){c.traceMs+=now()-t0;return best;}
    const ns=this.nodeStack,es=this.entryStack;let sp=0;c.nodeTests++;const rootEntry=boxEntry(ray,nodes[0].bounds,best.t);if(rootEntry===Infinity){c.traceMs+=now()-t0;return best;}ns[sp]=0;es[sp++]=rootEntry;
    while(sp){sp--;const ni=ns[sp],entry=es[sp];if(entry>=best.t)continue;const n=nodes[ni];
      if(n.leaf){for(let i=n.start,e=n.start+n.count;i<e;i++){const pi=this.bvh.indices[i],ti=this.bvh.primitives[pi].triangleIndex;c.triangleTests++;const h=triHit(this.store,ti,ray,best.t,false);if(h)best=h;}}
      else{
        const li=n.left,ri=n.right,l=nodes[li],r=nodes[ri];c.nodeTests+=2;const le=boxEntry(ray,l.bounds,best.t),re=boxEntry(ray,r.bounds,best.t);
        if(le<re){if(re!==Infinity){ns[sp]=ri;es[sp++]=re;}if(le!==Infinity){ns[sp]=li;es[sp++]=le;}}
        else{if(le!==Infinity){ns[sp]=li;es[sp++]=le;}if(re!==Infinity){ns[sp]=ri;es[sp++]=re;}}
      }
    }
    if(best.hit)c.hits++;c.traceMs+=now()-t0;return best;
  }
  occluded(ray){
    const c=this.counters;c.shadowRays++;const nodes=this.bvh.nodes;if(!nodes.length)return false;const ns=this.nodeStack,es=this.entryStack;let sp=0;c.nodeTests++;const rootEntry=boxEntry(ray,nodes[0].bounds,ray.tMax??Infinity);if(rootEntry===Infinity)return false;ns[sp]=0;es[sp++]=rootEntry;
    while(sp){sp--;const ni=ns[sp],n=nodes[ni];if(n.leaf){for(let i=n.start,e=n.start+n.count;i<e;i++){const pi=this.bvh.indices[i],ti=this.bvh.primitives[pi].triangleIndex;c.triangleTests++;if(triHit(this.store,ti,ray,Infinity,true)){c.anyHits++;return true;}}}else{const li=n.left,ri=n.right;c.nodeTests+=2;const le=boxEntry(ray,nodes[li].bounds,ray.tMax??Infinity),re=boxEntry(ray,nodes[ri].bounds,ray.tMax??Infinity);if(le!==Infinity){ns[sp]=li;es[sp++]=le;}if(re!==Infinity){ns[sp]=ri;es[sp++]=re;}}}return false;
  }
  snapshot(){const c=this.counters,total=Math.max(1,c.traceRays+c.shadowRays);return{version:'4.11.0',provider:'LitePix Core2 SAH BVH',triangles:this.triangleCount,nodes:this.nodeCount,buildMs:+this.buildMs.toFixed(3),traceRays:c.traceRays,shadowRays:c.shadowRays,nodeTests:c.nodeTests,triangleTests:c.triangleTests,hits:c.hits,anyHits:c.anyHits,avgNodeTests:+(c.nodeTests/total).toFixed(3),avgTriangleTests:+(c.triangleTests/total).toFixed(3),traceMs:+c.traceMs.toFixed(3),sah:this.bvh.stats()};}
}
root.LitePixCore2PathAcceleration411=LitePixCore2PathAcceleration411;
root.__LitePixCore2Path411=true;
})(typeof globalThis!=='undefined'?globalThis:window);
