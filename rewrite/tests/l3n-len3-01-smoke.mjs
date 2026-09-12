import assert from 'node:assert/strict';
import { CommandStack } from '../src/core/command-stack.mjs';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { DerivedGeometryEvaluator } from '../src/core/evaluator.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';
import { LitePixSceneAdapter } from '../src/ports/litepix-scene-adapter.mjs';
import { createCoreDiagnostics } from '../src/core/diagnostics.mjs';

// Gen3 pass 1: failed undo/redo must not corrupt command history.
const stack = new CommandStack();
const state = { value:0, failUndo:false, failRedo:false };
const command = {
  do(ctx) { if (ctx.failRedo && ctx.value === 0) throw new Error('redo failed'); ctx.value += 1; return ctx.value; },
  undo(ctx) { if (ctx.failUndo) throw new Error('undo failed'); ctx.value -= 1; return true; }
};
stack.execute(command, state);
state.failUndo = true;
assert.throws(() => stack.undo(state), /undo failed/);
assert.equal(stack.depth, 1);
assert.equal(stack.redoDepth, 0);
state.failUndo = false;
assert.equal(stack.undo(state), true);
assert.equal(stack.depth, 0);
assert.equal(stack.redoDepth, 1);
state.failRedo = true;
assert.throws(() => stack.redo(state), /redo failed/);
assert.equal(stack.depth, 0);
assert.equal(stack.redoDepth, 1);
state.failRedo = false;
assert.equal(stack.redo(state), 1);
assert.equal(stack.depth, 1);
assert.equal(stack.redoDepth, 0);

// Gen3 pass 2: evaluator cache must stay bounded and preserve valid results.
const core = new ThreeDLiteMainCore();
const geometry = core.createGeometry({ id:'l3n-geo', positions:[[0,0,0],[1,0,0],[0,1,0]], faces:[[0,1,2]] });
const evaluator = new DerivedGeometryEvaluator(core, { maxEntries:8 });
for (let i = 0; i < 20; i++) evaluator.evaluate(geometry, [], { scope:`scope-${i}`, revision:i });
const evalStats = evaluator.stats();
assert.equal(evalStats.entries, 8);
assert.ok(evalStats.evictions >= 12);

// Gen3 pass 3: render-scene semantics must carry light components through the LitePix boundary.
core.createEntity({
  id:'l3n-light',
  type:'light',
  components:{ light:{ kind:'point', intensity:12, color:[1,0.8,0.6] } },
  transform:{ position:[1,2,3], rotation:[0,0,0], scale:[1,1,1] }
});
const renderScene = new RenderScenePort(core);
const compiled = renderScene.compile();
assert.equal(compiled.schema, 7);
const lightObject = compiled.objects.find(object => object.id === 'l3n-light');
assert.equal(lightObject.components.light.kind, 'point');
assert.equal(Object.isFrozen(lightObject.components), true);
const litepixScene = new LitePixSceneAdapter(renderScene).compile();
assert.equal(litepixScene.lights.length, 1);
assert.equal(litepixScene.lights[0].data.light.intensity, 12);

// Gen3 pass 4: diagnostics must catch identity collisions while healthy scenes pass.
const healthyReport = await createCoreDiagnostics(core).run();
assert.equal(healthyReport.passed, true);
assert.ok(healthyReport.results.length >= 9);
const duplicateCore = new ThreeDLiteMainCore();
duplicateCore.createEntity({ id:'duplicate-id', type:'object' });
duplicateCore.createEntity({ id:'duplicate-id', type:'object' });
const duplicateReport = await createCoreDiagnostics(duplicateCore).run();
assert.equal(duplicateReport.passed, false);
assert.ok(duplicateReport.releaseBlockingFailures.includes('scene.unique-entity-ids'));

console.log(JSON.stringify({
  passed:true,
  method:'L3N',
  len3Iteration:1,
  gen3Passes:4,
  commandHistory:stack.snapshot(),
  evaluator:evalStats,
  renderSceneSchema:compiled.schema,
  diagnosticChecks:healthyReport.results.length
}, null, 2));
