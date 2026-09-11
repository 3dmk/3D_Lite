(function(root){'use strict';
const LP=root.LitePixNative=root.LitePixNative||{};
const Core2=LP.Core2;
if(!Core2||typeof Core2.SAHBVH!=='function')throw new Error('LitePix v4.12 requires Core2 SAHBVH');
const now=()=>root.performance?.now?.()??Date.now();
const miss=()=>({hit:false,t:Infinity,u:0,v:0,objectIndex:-1,triangleIndex:-1,position:null,geometricNormal:null,orientedGeometricNormal:null,frontFace:true,materialIndex:0});
function boxEntryScalar(ox,oy,oz,dx,dy,dz,tMin,tMax,minx,miny,minz,maxx,maxy,maxz){
  let a,b;
  if(Math.abs(dx)<1e-12){if(ox<minx||ox>maxx)return Infinity;}else{a=(minx-ox)/dx;b=(maxx-ox)/dx;if(a>b){const q=a;a=b;b=q;}if(a>tMin)tMin=a;if(b<tMax)tMax=b;if(tMax<tMin)return Infinity;}
  if(Math.abs(dy)<1e-12){if(oy<miny||oy>maxy)return Infinity;}else{a=(miny-oy)/dy;b=(maxy-oy)/dy;if(a>b){const q=a;a=b;b=q;}if(a>tMin)tMin=a;if(b<tMax)tMax=b;if(tMax<tMin)return Infinity;}
  if(Math.abs(dz)<1e-12){if(oz<minz||oz>maxz)return Infinity;}else{a=(minz-oz)/dz;b=(maxz-oz)/dz;if(a>b){const q=a;a=b;b=q;}if(a>tMin)tMin=a;if(b<tMax)tMax=b;if(tMax<tMin)return Infinity;}
  return tMin;
}
class LitePixCore2PathAcceleration412{
  constructor(base,job){
    this.base=base;this.store=base?.store;
    if(!this.store)throw new Error('LitePix Core2 v4.12 requires RenderAccelerationSet.store');
    this.jobId=job?.id??null;
    this.vertexCount=base.vertexCount??this.store.positions.length/3;
    this.triangleCount=base.triangleCount??this.store.triangleCount();
    const primitives=new Array(this.triangleCount);
    for(let i=0;i<this.triangleCount;i++){const b=this.store.triangleBounds(i);primitives[i]={bounds:{min:b.min,max:b.max},triangleIndex:i};}
    const tb=now();
    this.bvh=new Core2.SAHBVH({maxLeaf:4,bins:24}).build(primitives);
    this.buildMs=now()-tb;
    this.nodeCount=this.bvh.nodes.length;
    this._packNodes();
    this._packTriangles();
    this.stack=new Int32Array(Math.max(64,this.nodeCount+8));
    this.counters={traceRays:0,shadowRays:0,nodeTests:0,triangleTests:0,hits:0,anyHits:0,traceMs:0,shadowMs:0};
    this.stats=Object.freeze({geometry:this.store.stats,bvh:this.bvh.stats(),provider:'LitePix Core2 SAH BVH v4.12 packed traversal'});
  }
  static wrap(base,job){
    if(base instanceof LitePixCore2PathAcceleration412)return base;
    if(job?.litePixCore2Acceleration412?.base===base)return job.litePixCore2Acceleration412;
    const a=new LitePixCore2PathAcceleration412(base,job);if(job)job.litePixCore2Acceleration412=a;return a;
  }
  _packNodes(){
    const n=this.nodeCount;
    this.nMinX=new Float64Array(n);this.nMinY=new Float64Array(n);this.nMinZ=new Float64Array(n);
    this.nMaxX=new Float64Array(n);this.nMaxY=new Float64Array(n);this.nMaxZ=new Float64Array(n);
    this.nLeft=new Int32Array(n);this.nRight=new Int32Array(n);this.nStart=new Int32Array(n);this.nCount=new Int32Array(n);this.nLeaf=new Uint8Array(n);
    for(let i=0;i<n;i++){
      const x=this.bvh.nodes[i],b=x.bounds;
      this.nMinX[i]=b.min[0];this.nMinY[i]=b.min[1];this.nMinZ[i]=b.min[2];
      this.nMaxX[i]=b.max[0];this.nMaxY[i]=b.max[1];this.nMaxZ[i]=b.max[2];
      this.nLeft[i]=x.left??-1;this.nRight[i]=x.right??-1;this.nStart[i]=x.start??0;this.nCount[i]=x.count??0;this.nLeaf[i]=x.leaf?1:0;
    }
    const len=this.bvh.indices.length;
    this.triOrder=new Uint32Array(len);
    for(let i=0;i<len;i++)this.triOrder[i]=this.bvh.primitives[this.bvh.indices[i]].triangleIndex;
  }
  _packTriangles(){
    const n=this.triangleCount,s=this.store;
    this.p0x=new Float64Array(n);this.p0y=new Float64Array(n);this.p0z=new Float64Array(n);
    this.e1x=new Float64Array(n);this.e1y=new Float64Array(n);this.e1z=new Float64Array(n);
    this.e2x=new Float64Array(n);this.e2y=new Float64Array(n);this.e2z=new Float64Array(n);
    this.gnx=new Float64Array(n);this.gny=new Float64Array(n);this.gnz=new Float64Array(n);
    this.obj=new Int32Array(n);this.mat=new Int32Array(n);
    const pos=s.positions,idx=s.triangles;
    for(let t=0;t<n;t++){
      const k=t*3,ia=idx[k]*3,ib=idx[k+1]*3,ic=idx[k+2]*3;
      const ax=pos[ia],ay=pos[ia+1],az=pos[ia+2],bx=pos[ib],by=pos[ib+1],bz=pos[ib+2],cx=pos[ic],cy=pos[ic+1],cz=pos[ic+2];
      const e1x=bx-ax,e1y=by-ay,e1z=bz-az,e2x=cx-ax,e2y=cy-ay,e2z=cz-az;
      this.p0x[t]=ax;this.p0y[t]=ay;this.p0z[t]=az;this.e1x[t]=e1x;this.e1y[t]=e1y;this.e1z[t]=e1z;this.e2x[t]=e2x;this.e2y[t]=e2y;this.e2z[t]=e2z;
      let nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x,l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
      this.gnx[t]=nx;this.gny[t]=ny;this.gnz[t]=nz;this.obj[t]=s.objectIndices[t]??-1;this.mat[t]=s.materialIndices[t]??0;
    }
  }
  _tri(t,ox,oy,oz,dx,dy,dz,tMin,tMax){
    const e1x=this.e1x[t],e1y=this.e1y[t],e1z=this.e1z[t],e2x=this.e2x[t],e2y=this.e2y[t],e2z=this.e2z[t];
    const pvx=dy*e2z-dz*e2y,pvy=dz*e2x-dx*e2z,pvz=dx*e2y-dy*e2x;
    const det=e1x*pvx+e1y*pvy+e1z*pvz;if(Math.abs(det)<1e-12)return null;
    const inv=1/det,tvx=ox-this.p0x[t],tvy=oy-this.p0y[t],tvz=oz-this.p0z[t];
    const u=(tvx*pvx+tvy*pvy+tvz*pvz)*inv;if(u<0||u>1)return null;
    const qx=tvy*e1z-tvz*e1y,qy=tvz*e1x-tvx*e1z,qz=tvx*e1y-tvy*e1x;
    const v=(dx*qx+dy*qy+dz*qz)*inv;if(v<0||u+v>1)return null;
    const ht=(e2x*qx+e2y*qy+e2z*qz)*inv;if(ht<tMin||ht>tMax)return null;
    return [ht,u,v];
  }
  trace(ray){
    const t0=now();this.counters.traceRays++;
    if(!this.nodeCount){this.counters.traceMs+=now()-t0;return miss();}
    const ox=ray.origin[0],oy=ray.origin[1],oz=ray.origin[2],dx=ray.direction[0],dy=ray.direction[1],dz=ray.direction[2],tMin=ray.tMin??1e-5,rayMax=ray.tMax??Infinity;
    let bestT=rayMax,bestTri=-1,bestU=0,bestV=0,sp=0;this.stack[sp++]=0;
    while(sp){
      const ni=this.stack[--sp];this.counters.nodeTests++;
      if(!Number.isFinite(boxEntryScalar(ox,oy,oz,dx,dy,dz,tMin,bestT,this.nMinX[ni],this.nMinY[ni],this.nMinZ[ni],this.nMaxX[ni],this.nMaxY[ni],this.nMaxZ[ni])))continue;
      if(this.nLeaf[ni]){
        const end=this.nStart[ni]+this.nCount[ni];for(let i=this.nStart[ni];i<end;i++){
          const ti=this.triOrder[i];this.counters.triangleTests++;const h=this._tri(ti,ox,oy,oz,dx,dy,dz,tMin,bestT);if(h){bestT=h[0];bestU=h[1];bestV=h[2];bestTri=ti;}
        }
      }else{
        const l=this.nLeft[ni],r=this.nRight[ni];
        const le=boxEntryScalar(ox,oy,oz,dx,dy,dz,tMin,bestT,this.nMinX[l],this.nMinY[l],this.nMinZ[l],this.nMaxX[l],this.nMaxY[l],this.nMaxZ[l]);
        const re=boxEntryScalar(ox,oy,oz,dx,dy,dz,tMin,bestT,this.nMinX[r],this.nMinY[r],this.nMinZ[r],this.nMaxX[r],this.nMaxY[r],this.nMaxZ[r]);
        if(le<re){if(Number.isFinite(re))this.stack[sp++]=r;if(Number.isFinite(le))this.stack[sp++]=l;}else{if(Number.isFinite(le))this.stack[sp++]=l;if(Number.isFinite(re))this.stack[sp++]=r;}
      }
    }
    this.counters.traceMs+=now()-t0;
    if(bestTri<0)return miss();
    this.counters.hits++;
    const nx=this.gnx[bestTri],ny=this.gny[bestTri],nz=this.gnz[bestTri],front=(dx*nx+dy*ny+dz*nz)<0;
    const gn=[nx,ny,nz],ogn=front?gn:[-nx,-ny,-nz];
    return{hit:true,t:bestT,u:bestU,v:bestV,objectIndex:this.obj[bestTri],triangleIndex:bestTri,position:[ox+dx*bestT,oy+dy*bestT,oz+dz*bestT],geometricNormal:gn,orientedGeometricNormal:ogn,frontFace:front,materialIndex:this.mat[bestTri]};
  }
  occluded(ray){
    const t0=now();this.counters.shadowRays++;
    if(!this.nodeCount){this.counters.shadowMs+=now()-t0;return false;}
    const ox=ray.origin[0],oy=ray.origin[1],oz=ray.origin[2],dx=ray.direction[0],dy=ray.direction[1],dz=ray.direction[2],tMin=ray.tMin??1e-5,tMax=ray.tMax??Infinity;
    let sp=0;this.stack[sp++]=0;
    while(sp){
      const ni=this.stack[--sp];this.counters.nodeTests++;
      if(!Number.isFinite(boxEntryScalar(ox,oy,oz,dx,dy,dz,tMin,tMax,this.nMinX[ni],this.nMinY[ni],this.nMinZ[ni],this.nMaxX[ni],this.nMaxY[ni],this.nMaxZ[ni])))continue;
      if(this.nLeaf[ni]){
        const end=this.nStart[ni]+this.nCount[ni];for(let i=this.nStart[ni];i<end;i++){
          const ti=this.triOrder[i];this.counters.triangleTests++;if(this._tri(ti,ox,oy,oz,dx,dy,dz,tMin,tMax)){this.counters.anyHits++;this.counters.shadowMs+=now()-t0;return true;}
        }
      }else{this.stack[sp++]=this.nLeft[ni];this.stack[sp++]=this.nRight[ni];}
    }
    this.counters.shadowMs+=now()-t0;return false;
  }
  snapshot(){
    const c=this.counters,total=Math.max(1,c.traceRays+c.shadowRays);
    return{version:'4.12.0',provider:'LitePix Core2 SAH BVH packed traversal',triangles:this.triangleCount,nodes:this.nodeCount,buildMs:+this.buildMs.toFixed(3),traceRays:c.traceRays,shadowRays:c.shadowRays,nodeTests:c.nodeTests,triangleTests:c.triangleTests,hits:c.hits,anyHits:c.anyHits,avgNodeTests:+(c.nodeTests/total).toFixed(3),avgTriangleTests:+(c.triangleTests/total).toFixed(3),traceMs:+c.traceMs.toFixed(3),shadowMs:+c.shadowMs.toFixed(3),packedNodes:true,packedTriangles:true,sah:this.bvh.stats()};
  }
}
root.LitePixCore2PathAcceleration412=LitePixCore2PathAcceleration412;
root.__LitePixCore2Path412=true;
})(typeof globalThis!=='undefined'?globalThis:window);
