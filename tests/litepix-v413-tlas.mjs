import fs from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';

globalThis.performance=performance;
class StubAcceleration412{}
globalThis.LitePixCore2PathAcceleration412=StubAcceleration412;
vm.runInThisContext(fs.readFileSync('litepix/core2-instance-v4.13.js','utf8'),{filename:'core2-instance-v4.13.js'});

const makeBLAS=()=>({
  acceleration:{nodeCount:1,nMinX:new Float64Array([-1]),nMinY:new Float64Array([-1]),nMinZ:new Float64Array([-0.01]),nMaxX:new Float64Array([1]),nMaxY:new Float64Array([1]),nMaxZ:new Float64Array([0.01])},
  trace(r){
    const dz=r.direction[2]; if(Math.abs(dz)<1e-12)return {hit:false,t:Infinity};
    const t=-r.origin[2]/dz; if(t<(r.tMin??1e-5)||t>(r.tMax??Infinity))return {hit:false,t:Infinity};
    const x=r.origin[0]+r.direction[0]*t,y=r.origin[1]+r.direction[1]*t;
    if(Math.abs(x)>1||Math.abs(y)>1)return {hit:false,t:Infinity};
    return {hit:true,t,u:.25,v:.25,objectIndex:0,triangleIndex:0,materialIndex:0,position:[x,y,0],geometricNormal:[0,0,1],orientedGeometricNormal:[0,0,-1],frontFace:false};
  },
  occluded(r){return this.trace(r).hit;}
});
const T=globalThis.LitePixTLAS413;
if(typeof T!=='function')throw new Error('TLAS class missing');
const blas=makeBLAS();
const transforms=[];
for(let i=0;i<1024;i++){const x=(i%32)*4,y=Math.floor(i/32)*4;transforms.push([1,0,0,0,1,0,0,0,1,x,y,20]);}
const t0=performance.now();
const tlas=new T(transforms.map((transform,i)=>({blas,transform,id:i})));
const buildMs=performance.now()-t0;
let hit=tlas.trace({origin:[0,0,0],direction:[0,0,1],tMin:1e-5,tMax:100});
if(!hit.hit||hit.instanceId!==0||Math.abs(hit.t-20)>1e-6)throw new Error('initial instance hit failed');
if(!tlas.occluded({origin:[0,0,0],direction:[0,0,1],tMin:1e-5,tMax:100}))throw new Error('instance shadow any-hit failed');
const moved=[1,0,0,0,1,0,0,0,1,200,0,20];
tlas.updateTransform(0,moved);
const r0=performance.now();tlas.refit();const refitMs=performance.now()-r0;
hit=tlas.trace({origin:[0,0,0],direction:[0,0,1],tMin:1e-5,tMax:100});
if(hit.hit&&hit.instanceId===0)throw new Error('refit left moved instance at stale bounds');
hit=tlas.trace({origin:[200,0,0],direction:[0,0,1],tMin:1e-5,tMax:100});
if(!hit.hit||hit.instanceId!==0)throw new Error('refit did not move instance bounds');
const snap=tlas.snapshot();
if(snap.instances!==1024||snap.uniqueBLAS!==1||snap.refitCount!==1)throw new Error('BLAS sharing/refit telemetry failed');
console.log(JSON.stringify({passed:true,buildMs:+buildMs.toFixed(3),refitMs:+refitMs.toFixed(3),snapshot:snap},null,2));