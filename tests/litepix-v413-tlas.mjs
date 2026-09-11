import fs from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';

globalThis.performance=performance;
vm.runInThisContext(fs.readFileSync('litepix/core2-scene-acceleration.js','utf8'),{filename:'core2-scene-acceleration.js'});
class Fallback412{static wrap(){return{trace(){return{hit:false,t:Infinity}},occluded(){return false}}}}
globalThis.LitePixCore2PathAcceleration412=Fallback412;
vm.runInThisContext(fs.readFileSync('litepix/core2-instance-v4.13.js','utf8'),{filename:'core2-instance-v4.13.js'});

const mesh={
 positions:new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,1,0]),
 normals:new Float32Array([0,0,1,0,0,1,0,0,1,0,0,1]),
 uvs:new Float32Array([0,0,1,0,1,1,0,1]),
 indices:new Uint32Array([0,1,2,0,2,3]),
 materialIndices:new Uint16Array([0,0]),
 bounds:{min:[-1,-1,0],max:[1,1,0]}
};
const objects=[];
for(let i=0;i<1024;i++){
 const x=(i%32)*4,y=Math.floor(i/32)*4;
 objects.push({id:'inst-'+i,geometryId:'shared-quad',transform:[1,0,0,0,1,0,0,0,1,x,y,20],localMesh:mesh,mesh,materialIds:['m']});
}
const scene={objects,materials:[],lights:[]};
const job={id:'v413-test',renderScene:scene};
const base={store:{},trace(){return{hit:false,t:Infinity}},occluded(){return false}};
const A=globalThis.LitePixSceneAcceleration413;
if(typeof A!=='function')throw new Error('scene acceleration class missing');
const t0=performance.now();const accel=A.wrap(base,job);const buildMs=performance.now()-t0;
let hit=accel.trace({origin:[0,0,0],direction:[0,0,1],tMin:1e-5,tMax:100});
if(!hit.hit||hit.instanceId!=='inst-0'||hit.objectIndex!==0||Math.abs(hit.t-20)>1e-6)throw new Error('initial TLAS hit failed');
if(!hit.shadingNormal||!hit.uv)throw new Error('TLAS shading attributes missing');
if(!accel.occluded({origin:[0,0,0],direction:[0,0,1],tMin:1e-5,tMax:100}))throw new Error('TLAS shadow any-hit failed');
objects[0]={...objects[0],transform:[1,0,0,0,1,0,0,0,1,200,0,20]};
const r0=performance.now();if(!accel.updateTransforms(scene))throw new Error('transform refit rejected');const refitMs=performance.now()-r0;
hit=accel.trace({origin:[0,0,0],direction:[0,0,1],tMin:1e-5,tMax:100});
if(hit.hit&&hit.instanceId==='inst-0')throw new Error('refit left stale instance bounds');
hit=accel.trace({origin:[200,0,0],direction:[0,0,1],tMin:1e-5,tMax:100});
if(!hit.hit||hit.instanceId!=='inst-0')throw new Error('refit did not move instance');
const snap=accel.snapshot();
if(snap.instances!==1024||snap.uniqueBLAS!==1||snap.refitCount!==1||snap.fallback)throw new Error('scene BLAS sharing/refit telemetry failed');
console.log(JSON.stringify({passed:true,buildMs:+buildMs.toFixed(3),refitMs:+refitMs.toFixed(3),snapshot:snap},null,2));