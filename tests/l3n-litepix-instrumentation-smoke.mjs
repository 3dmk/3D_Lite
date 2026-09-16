import fs from 'node:fs';import vm from 'node:vm';
const ctx={performance:{now:(()=>{let t=0;return()=>++t;})()}};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['evidence-collector.js','renderer-instrumentation.js'])vm.runInContext(fs.readFileSync(new URL('../l3n-litepix/'+f,import.meta.url),'utf8'),ctx);
const accel={trace(){return 'hit'},occluded(){return false},updateTransforms(){return true}};const I=ctx.L3NLitePixInstrumentation;
if(I.instrumentAcceleration(accel)!==3)throw new Error('instrumentation count');if(I.instrumentAcceleration(accel)!==0)throw new Error('double wrap');accel.trace({});accel.trace({});accel.occluded({});accel.updateTransforms({});
const s=ctx.L3NLitePixEvidence.snapshot();if(s.counters.traceRays!==2||s.counters.shadowRays!==1)throw new Error('ray counters');if(s.timings['acceleration.trace'].calls!==2||s.timings['acceleration.occluded'].calls!==1||s.timings['acceleration.updateTransforms'].calls!==1)throw new Error('timings');
console.log(JSON.stringify({passed:true,counters:s.counters,timings:s.timings,meta:s.meta},null,2));
