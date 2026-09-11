import fs from 'fs';import vm from 'vm';import assert from 'assert';
const files=['litepix/core2-scene-acceleration.js','litepix/core3-raster-guide.js','litepix/core4-hierarchical-gi.js','litepix/core5-ray-reuse.js','litepix/core6-materials-color.js','litepix/core7-production.js','litepix/core8-telemetry-optimization.js','litepix/runtime-v4.08.js'];
const ctx={console,performance:{now:()=>Date.now()},Math,Date,Map,Set,Float32Array,Uint32Array,Uint8Array,Array,Object,JSON,Number,String,Boolean,Infinity,Promise,setTimeout,clearTimeout};ctx.globalThis=ctx;vm.createContext(ctx);for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const LP=ctx.LitePixNative;assert(LP&&LP.AllCores&&LP.AllCores.version==='4.08.0');for(let i=2;i<=8;i++)assert(LP['Core'+i],'missing Core'+i);
// Core2
const bvh=new LP.Core2.SAHBVH({maxLeaf:1});bvh.build([{bounds:{min:[0,0,0],max:[1,1,1]}},{bounds:{min:[3,0,0],max:[4,1,1]}}]);assert(bvh.stats().primitives===2&&bvh.stats().nodes>=1);
const sc=new LP.Core2.SceneCompiler();sc.compile({meshes:[{id:'m',primitives:[{bounds:{min:[0,0,0],max:[1,1,1]}}]}],instances:[{id:'i',bounds:{min:[0,0,0],max:[1,1,1]}}]});assert(sc.snapshot().staticMeshes===1);
// Core3
const gb=new LP.Core3.GBuffer(4,4);gb.write(1,1,{depth:1,normal:[0,1,0],materialId:2});assert(gb.sample(1,1).valid);
// Core4
const gi=new LP.Core4.HierarchicalGI(32,32,{startBlock:16,maxLevel:3});gi.runPass(()=>({radiance:[1,1,1],variance:.1,error:.1,confidence:.2}),()=>1);assert(gi.stats().refinedBlocks>0);
// Core5
const r=new LP.Core5.Reservoir();r.update({id:1},1,()=>0);assert(r.sample.id===1&&r.finalWeight()>0);
// Core6
const mat=LP.Core6.MaterialValidator.validate({baseColor:[.5,.5,.5],colorSpace:'srgb',roughness:2});assert(mat.colorSpace==='linear'&&mat.roughness===1&&mat.baseColor[0]<.5);
// Core7
const tiles=new LP.Core7.TilePlanner(512,512,256,8).plan();assert(tiles.length===4);const healed=new LP.Core7.FrameHealer({minBytes:100}).group([1,2,4]);assert(healed.length===2);
// Core8
const tel=new LP.Core8.LitePixTelemetryV2();tel.rays.add('camera',10);assert(tel.snapshot().rays.camera===10);
// Runtime integration
const runtime=LP.runtime.initialize(32,32);runtime.compileScene({meshes:[],instances:[]});runtime.beginFrame();const snap=runtime.endFrame();assert(snap.meta.version==='4.08.0');assert(ctx.__LitePixAllCores408===true);
console.log(JSON.stringify({passed:true,modules:LP.AllCores.modules,bvh:bvh.stats(),gi:gi.stats(),tiles:tiles.length,runtime:snap.meta},null,2));
