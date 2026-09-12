import assert from 'node:assert/strict';
import { LitePixIncrementalPlanner } from '../src/ports/litepix-incremental-plan.mjs';
import { createBrowserLitePixRuntime } from '../src/ports/litepix-renderer-port.mjs';

function scene(overrides = {}) {
  return {
    meshes:[{ id:'mesh:a', dynamic:false, primitives:[{ positions:[[0,0,0],[1,0,0],[0,1,0]], bounds:{min:[0,0,0],max:[1,1,0]} }] }],
    instances:[{ id:'instance:a', meshId:'mesh:a', materialId:'material:0', transform:{position:[0,0,0],rotation:[0,0,0],scale:[1,1,1]}, bounds:{min:[0,0,0],max:[1,1,0]} }],
    materials:[{ id:'material:0', roughness:0.5 }],
    lights:[],
    activeCamera:{ id:'camera:a' },
    ...overrides
  };
}

const planner = new LitePixIncrementalPlanner();
let current = scene();
let plan = planner.analyze(current);
assert.equal(plan.mode, 'rebuild');
planner.commit(current);
assert.equal(planner.analyze(current).mode, 'reuse');

current = scene({ instances:[{ ...scene().instances[0], transform:{position:[2,0,0],rotation:[0,0,0],scale:[1,1,1]}, bounds:{min:[2,0,0],max:[3,1,0]} }] });
plan = planner.analyze(current);
assert.equal(plan.mode, 'refit');
planner.commit(current);

current = scene({ instances:[...current.instances,{ id:'instance:b',meshId:'mesh:a',materialId:'material:0',transform:{position:[4,0,0],rotation:[0,0,0],scale:[1,1,1]},bounds:{min:[4,0,0],max:[5,1,0]} }] });
plan = planner.analyze(current);
assert.equal(plan.mode, 'tlas-rebuild');
planner.commit(current);

current = { ...current, materials:[{ id:'material:0', roughness:0.2 }] };
plan = planner.analyze(current);
assert.equal(plan.mode, 'metadata');
planner.commit(current);

current = { ...current, meshes:[{ id:'mesh:a', dynamic:false, primitives:[{ positions:[[0,0,0],[2,0,0],[0,1,0]], bounds:{min:[0,0,0],max:[2,1,0]} }] }] };
assert.equal(planner.analyze(current).mode, 'rebuild');

class MockCompiler {
  constructor(){ this.instances=[]; this.materials=[]; this.lights=[]; this.compileCalls=0; this.refitCalls=0; this.tlas={ primitives:[], builds:0, build:values=>{ this.tlas.primitives=values; this.tlas.builds++; } }; }
  compile(input){ this.compileCalls++; this.instances=input.instances.map(x=>({...x})); this.materials=[...input.materials]; this.lights=[...input.lights]; this.tlas.build(this.instances.map(instance=>({bounds:instance.bounds,instance}))); return this; }
  refitTLAS(){ this.refitCalls++; return this; }
  snapshot(){ return { compileCalls:this.compileCalls, refitCalls:this.refitCalls, tlasBuilds:this.tlas.builds }; }
}
const root = { LitePixSceneCompiler:MockCompiler };
const runtime = createBrowserLitePixRuntime(root);
const base = scene();
runtime.compileScene(base,{mode:'rebuild'});
const moved = scene({ instances:[{ ...base.instances[0], transform:{position:[3,0,0],rotation:[0,0,0],scale:[1,1,1]}, bounds:{min:[3,0,0],max:[4,1,0]} }] });
runtime.compileScene(moved,{mode:'refit'});
const expanded = scene({ instances:[...moved.instances,{id:'instance:b',meshId:'mesh:a',materialId:'material:0',transform:{position:[5,0,0],rotation:[0,0,0],scale:[1,1,1]},bounds:{min:[5,0,0],max:[6,1,0]}}] });
runtime.compileScene(expanded,{mode:'tlas-rebuild'});
runtime.compileScene({...expanded,materials:[{id:'material:0',roughness:0.1}]},{mode:'metadata'});
const runtimeStats = runtime.snapshot().incremental;
assert.equal(runtimeStats.rebuilds,1);
assert.equal(runtimeStats.refits,1);
assert.equal(runtimeStats.tlasRebuilds,1);
assert.equal(runtimeStats.metadataUpdates,1);

await import('../../litepix/core5-ray-budget-v4.45.js');
const budget = new globalThis.LitePixRayBudget445({settings:{quality:'Preview',shadowVisibilityCacheEntries:1024}},null,null,64,64);
for(let i=0;i<1100;i++) budget.visible(null,[i*3,0,0],[0,1,0],10,{id:'light',type:'point'},0,{objectId:'surface'},()=>true);
const budgetStats = budget.snapshot();
assert.ok(budgetStats.cacheEntries <= 1024);
assert.ok(budgetStats.cacheEvictions > 0);

class TelemetryV2 {
  constructor(){ this.rays={values:[],add:(type,count)=>this.rays.values.push([type,count])}; this.noise={add() {}}; }
  setMeta(v){this.meta=v;} setMemory(v){this.memory=v;} setBlocks(v){this.blocks=v;}
  snapshot(){return { rays:this.rays.values.slice(), meta:this.meta };}
}
globalThis.LitePixNative = { Core8:{
  LitePixTelemetryV2:TelemetryV2,
  QualityComparator:{mse:()=>0,psnr:()=>Infinity},
  OptimizationAdvisor:{fromSnapshot:()=>[]},
  HardwareBenchmark:class { constructor(){this.results={};} async run(){return this.results;} }
} };
await import('../../litepix/core8-production-v4.43.js');
const telemetry = new globalThis.LitePixCore8Production443();
telemetry.capture({ performance:{actualRays:1000}, progress:{noise:0.1} }, { rayBudget:budgetStats, incremental:runtimeStats });
const telemetryStats = telemetry.snapshot().telemetry.optimization;
assert.equal(telemetryStats.rayBudget.tracedShadowRays,budgetStats.tracedShadowRays);
assert.equal(telemetryStats.incremental.refits,1);

console.log(JSON.stringify({passed:true, planner:'incremental', runtime:runtimeStats, rayBudget:{entries:budgetStats.cacheEntries,evictions:budgetStats.cacheEvictions}, telemetry:telemetryStats},null,2));
