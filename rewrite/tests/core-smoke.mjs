import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';

const core = new ThreeDLiteMainCore();
const render = new RenderScenePort(core);
const geometry = core.createGeometry({
  id:'quad-geo', name:'Quad',
  positions:[[0,0,0],[1,0,0],[1,1,0],[0,1,0]],
  faces:[[0,1,2,3]]
});

assert.equal(core.geometry.has(geometry), true);
assert.equal(core.geometry.get(geometry).topology.halfEdges.length, 4);
assert.equal(core.geometry.get(geometry).triangles.length, 6);

core.evaluator.registerOperator('offset', (input, params) => ({
  ...input,
  positions: input.positions.map(p => [p[0] + (params.x ?? 0), p[1], p[2]])
}));
core.evaluator.registerOperator('scaleX', (input, params) => ({
  ...input,
  positions: input.positions.map(p => [p[0] * (params.value ?? 1), p[1], p[2]])
}));

const evaluatedA = core.evaluateGeometry(geometry, [{ type:'offset', params:{x:3} }]);
const evaluatedB = core.evaluateGeometry(geometry, [{ type:'offset', params:{x:3} }]);
assert.equal(evaluatedA.positions[0][0], 3);
assert.equal(evaluatedA, evaluatedB);
assert.equal(core.geometry.get(geometry).positions[0][0], 0, 'evaluation must not mutate authoring geometry');

core.evaluationGraph.register('authoring');
core.evaluationGraph.register('modifier', ['authoring']);
core.evaluationGraph.register('render', ['modifier']);
assert.deepEqual(core.evaluationGraph.order(['render']), ['authoring','modifier','render']);
assert.throws(() => core.evaluationGraph.register('authoring', ['render']), /cycle/i);

const handle = core.createEntity({ id:'a', type:'mesh', geometry, transform:{position:[0,0,0]} });
const secondHandle = core.createEntity({ id:'b', type:'mesh', geometry, transform:{position:[2,0,0]} });
assert.equal(core.entities.has(handle), true);
const first = render.compile();
assert.equal(first.objects.length, 2);
assert.equal(first.objects[0].geometry.topology.faceCount, 1);

const secondRevisionBeforeModifier = core.evaluationRevision(secondHandle);
const firstRevisionBeforeModifier = core.evaluationRevision(handle);
core.addModifier(handle, { id:'offset-a', type:'offset', params:{x:2} });
assert.equal(core.entities.get(handle).modifiers.length, 1);
assert.ok(core.evaluationRevision(handle) > firstRevisionBeforeModifier);
assert.equal(core.evaluationRevision(secondHandle), secondRevisionBeforeModifier, 'unrelated object must not become evaluation-dirty');
let modified = render.compile();
assert.equal(modified.objects[0].geometry.positions[0][0], 2);
assert.equal(core.geometry.get(geometry).positions[0][0], 0, 'modifier must leave authoring geometry unchanged');

const revisionBeforeUpdate = core.evaluationRevision(handle);
core.updateModifier(handle, 'offset-a', { params:{x:4} });
assert.ok(core.evaluationRevision(handle) > revisionBeforeUpdate);
modified = render.compile();
assert.equal(modified.objects[0].geometry.positions[0][0], 4);
assert.equal(core.undo(), true);
assert.equal(render.compile().objects[0].geometry.positions[0][0], 2);
assert.equal(core.redo(), true);
assert.equal(render.compile().objects[0].geometry.positions[0][0], 4);

core.addModifier(handle, { id:'scale-a', type:'scaleX', params:{value:2} });
assert.deepEqual(core.entities.get(handle).modifiers.map(m => m.id), ['offset-a','scale-a']);
assert.equal(render.compile().objects[0].geometry.positions[0][0], 8);
core.moveModifier(handle, 'scale-a', 0);
assert.deepEqual(core.entities.get(handle).modifiers.map(m => m.id), ['scale-a','offset-a']);
assert.equal(render.compile().objects[0].geometry.positions[0][0], 4, 'modifier order must affect evaluated output');
core.removeModifier(handle, 'scale-a');
assert.deepEqual(core.entities.get(handle).modifiers.map(m => m.id), ['offset-a']);
assert.equal(core.undo(), true);
assert.deepEqual(core.entities.get(handle).modifiers.map(m => m.id), ['scale-a','offset-a']);
assert.equal(core.redo(), true);
assert.deepEqual(core.entities.get(handle).modifiers.map(m => m.id), ['offset-a']);

const graphTarget = `entity:${handle.index}:${handle.generation}:render`;
const graphOrder = core.evaluationGraph.order([graphTarget]);
assert.ok(graphOrder.some(id => id.includes(':modifier:offset-a')));
assert.equal(graphOrder.at(-1), graphTarget);

const firstStamp = render.compile().stamp.renderScene;
core.updateEntity(handle, entity => { entity.transform.position[0] = 1; }, ['transform','renderScene']);
const second = render.compile();
assert.notEqual(second.stamp.renderScene, firstStamp);
assert.equal(second.objects[0].transform.position[0], 1);

const firstRevisionBeforeGeometry = core.evaluationRevision(handle);
const secondRevisionBeforeGeometry = core.evaluationRevision(secondHandle);
const geometryStamp = second.stamp.geometry;
core.updateGeometry(geometry, mesh => { mesh.positions[0] = [-1,0,0]; });
const third = render.compile();
assert.notEqual(third.stamp.geometry, geometryStamp);
assert.equal(third.objects[0].geometry.positions[0][0], 3);
assert.ok(core.evaluationRevision(handle) > firstRevisionBeforeGeometry);
assert.ok(core.evaluationRevision(secondHandle) > secondRevisionBeforeGeometry);
assert.equal(core.destroyGeometry(geometry), false, 'referenced geometry must not be destroyed');

core.setSelection([handle, handle]);
assert.equal(core.state.selection.length, 1);
core.setEditMode('vertex', geometry);
core.setComponentSelection([0,1,1]);
assert.deepEqual(core.state.editSelection.elements, [0,1]);
const beforeMove = core.geometry.get(geometry).positions.map(p => p.slice());
core.moveSelectedVertices([0,0,2]);
assert.equal(core.geometry.get(geometry).positions[0][2], beforeMove[0][2] + 2);
assert.equal(core.undo(), true);
assert.deepEqual(core.geometry.get(geometry).positions, beforeMove);
assert.equal(core.redo(), true);

core.setEditMode('edge', geometry);
core.setComponentSelection([0,2]);
assert.throws(() => core.setComponentSelection([999]), /out of range/i);
core.setEditMode('polygon', geometry);
core.setComponentSelection([0]);
core.setEditMode('object');

assert.throws(() => core.createGeometry({
  positions:[[0,0,0],[1,0,0],[0,1,0]], faces:[[0,1,4]]
}), /invalid vertex indices/i);

core.assignGeometry(handle, null);
core.assignGeometry(secondHandle, null);
assert.equal(core.destroyGeometry(geometry), true);
core.destroyEntity(handle);
core.destroyEntity(secondHandle);
assert.equal(render.compile().objects.length, 0);

console.log('3D Lite Clean Rewrite modifier stack + per-object evaluation smoke: PASS');
