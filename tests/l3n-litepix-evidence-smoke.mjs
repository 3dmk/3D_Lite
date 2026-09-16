import fs from 'node:fs';import vm from 'node:vm';
const src=fs.readFileSync(new URL('../l3n-litepix/evidence-collector.js',import.meta.url),'utf8');
const ctx={performance:{now:(()=>{let t=0;return()=>++t;})()}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(src,ctx);
const e=ctx.L3NLitePixEvidence;e.setMeta('scene','smoke');e.count('primaryRays',4);e.mark('compile');const v=e.measure('trace',()=>42);const s=e.snapshot();
if(v!==42||s.counters.primaryRays!==4||s.meta.scene!=='smoke'||s.timings.trace.calls!==1||s.timings.trace.totalMs!==1||s.events.length!==1)throw new Error('evidence collector failed');
console.log(JSON.stringify({passed:true,version:s.version,counters:s.counters,timings:s.timings,events:s.events.length},null,2));
