import assert from 'node:assert/strict';
import { GenerationRegistry } from '../src/core/generation-registry.mjs';
import { AsyncTaskSystem } from '../src/core/task-system.mjs';
import { WorkerPool, InlineWorkerAdapter } from '../src/core/worker-pool.mjs';

const generations = new GenerationRegistry(['geometry','evaluation','renderScene']);
const tasks = new AsyncTaskSystem(generations, { concurrency:2 });
const pool = new WorkerPool([
  new InlineWorkerAdapter('geometry-worker-a', async payload => ({ ...payload, worker:'a' })),
  new InlineWorkerAdapter('geometry-worker-b', async payload => ({ ...payload, worker:'b' }))
]);

let applied = [];
const fresh = tasks.submit({
  type:'geometry-derive', domains:['geometry','evaluation'], input:{ value:2 },
  execute: payload => pool.run(payload),
  apply: result => { applied.push(result); }
});
await tasks.idle();
assert.equal(tasks.status(fresh.id).state, 'done');
assert.equal(applied.length, 1);
assert.equal(applied[0].value, 2);

let releaseStale;
const staleGate = new Promise(resolve => { releaseStale = resolve; });
const stale = tasks.submit({
  type:'bvh-build', domains:['geometry','renderScene'],
  execute: async () => { await staleGate; return { nodes:12 }; },
  apply: result => { applied.push(result); }
});
await new Promise(resolve => setTimeout(resolve,0));
generations.bump('geometry');
releaseStale();
await tasks.idle();
assert.equal(tasks.status(stale.id).state, 'stale');
assert.equal(applied.some(item => item.nodes === 12), false, 'stale async result must never apply');

let releaseCancelled;
const cancelGate = new Promise(resolve => { releaseCancelled = resolve; });
const cancelled = tasks.submit({
  type:'texture-decode', domains:['renderScene'],
  execute: async () => { await cancelGate; return 42; },
  apply: result => { applied.push(result); }
});
await new Promise(resolve => setTimeout(resolve,0));
assert.equal(tasks.cancel(cancelled.id), true);
releaseCancelled();
await tasks.idle();
assert.equal(tasks.status(cancelled.id).state, 'cancelled');
assert.equal(applied.includes(42), false);

let releaseApply;
const applyGate = new Promise(resolve => { releaseApply = resolve; });
const staleDuringApply = tasks.submit({
  type:'upload', domains:['renderScene'],
  execute: () => ({ bytes:64 }),
  apply: async result => { await applyGate; applied.push(result); }
});
await new Promise(resolve => setTimeout(resolve,0));
generations.bump('renderScene');
releaseApply();
await tasks.idle();
assert.equal(tasks.status(staleDuringApply.id).state, 'stale');

const snapshot = tasks.snapshot();
assert.equal(snapshot.completed, 1);
assert.equal(snapshot.stale, 2);
assert.equal(snapshot.cancelled, 1);
assert.equal(pool.size, 2);
console.log('3D Lite async task + worker generation safety smoke: PASS');
