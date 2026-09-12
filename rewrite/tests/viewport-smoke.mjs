import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';
import { ViewportPort, createEntityPick, createComponentPick } from '../src/ports/viewport-port.mjs';
import { ViewportSceneAdapter } from '../src/ports/viewport-scene-adapter.mjs';

const core = new ThreeDLiteMainCore();
const render = new RenderScenePort(core);
const viewport = new ViewportPort(core, render);
const adapter = new ViewportSceneAdapter(viewport);

const geometry = core.createGeometry({
  id:'viewport-quad',
  positions:[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],
  faces:[[0,1,2,3]]
});
const entity = core.createEntity({ id:'viewport-mesh', type:'mesh', geometry });

const beforeCore = core.snapshot();
viewport.setView({ position:[8,4,8], target:[0,0,0], fov:60 });
assert.deepEqual(viewport.state.position,[8,4,8]);
assert.equal(core.state.metadata.schema,beforeCore.state.metadata.schema,'viewport camera must not become Main Core application state');
assert.equal(core.entities.get(entity).transform.position[0],0);

viewport.applyPick(createEntityPick(entity,2));
assert.equal(core.state.selection.length,1);
let scene = adapter.compile();
assert.equal(scene.objects.length,1);
assert.equal(scene.objects[0].selected,true);
assert.deepEqual(scene.view.position,[8,4,8]);

viewport.setTool('move');
viewport.translateSelection([2,0,0]);
assert.equal(core.entities.get(entity).transform.position[0],2);
assert.equal(core.undo(),true);
assert.equal(core.entities.get(entity).transform.position[0],0);
assert.equal(core.redo(),true);
assert.equal(core.entities.get(entity).transform.position[0],2);

core.setEditMode('vertex',geometry);
viewport.applyPick(createComponentPick(geometry,1));
assert.deepEqual(core.state.editSelection.elements,[1]);
viewport.applyPick(createComponentPick(geometry,2),{additive:true});
assert.deepEqual(core.state.editSelection.elements,[1,2]);
viewport.applyPick(createComponentPick(geometry,1),{toggle:true});
assert.deepEqual(core.state.editSelection.elements,[2]);

assert.throws(() => viewport.applyPick(createEntityPick({index:999,generation:1})),/stale entity/i);
assert.throws(() => viewport.setTool('paint'),/unsupported viewport tool/i);

const frame = viewport.frame();
assert.equal(frame.scene.schema,6);
assert.deepEqual(frame.scene.entityHandles[0],entity);
assert.equal(frame.scene.objects[0].id,'viewport-mesh');

console.log('3D Lite Clean Rewrite viewport boundary smoke: PASS');
