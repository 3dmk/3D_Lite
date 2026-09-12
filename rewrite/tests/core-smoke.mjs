import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';

const core = new ThreeDLiteMainCore();
const render = new RenderScenePort(core);

const geometry = core.createGeometry({
  id: 'quad-geo',
  name: 'Quad',
  positions: [[0,0,0],[1,0,0],[1,1,0],[0,1,0]],
  faces: [[0,1,2,3]]
});
assert.equal(core.geometry.has(geometry), true);
assert.equal(core.geometry.get(geometry).topology.halfEdges.length, 4);
assert.equal(core.geometry.get(geometry).triangles.length, 6);

const handle = core.createEntity({
  id:'a',
  type:'mesh',
  geometry,
  transform:{ position:[0,0,0] }
});
assert.equal(core.entities.has(handle), true);
const first = render.compile();
assert.equal(first.objects.length, 1);
assert.equal(first.objects[0].geometry.topology.faceCount, 1);
assert.equal(first.objects[0].geometry.triangles.length, 6);
const firstStamp = first.stamp.renderScene;

core.updateEntity(handle, entity => { entity.transform.position[0] = 1; }, ['transform','renderScene']);
const second = render.compile();
assert.notEqual(second.stamp.renderScene, firstStamp);
assert.equal(second.objects[0].transform.position[0], 1);

const geometryStamp = second.stamp.geometry;
core.updateGeometry(geometry, mesh => { mesh.positions[0] = [-1,0,0]; });
const third = render.compile();
assert.notEqual(third.stamp.geometry, geometryStamp);
assert.equal(third.objects[0].geometry.positions[0][0], -1);
assert.equal(core.destroyGeometry(geometry), false, 'referenced geometry must not be destroyed');

core.setSelection([handle, handle]);
assert.equal(core.state.selection.length, 1);

let value = 0;
const command = {
  do(){ value += 1; },
  undo(){ value -= 1; }
};
core.execute(command);
assert.equal(value, 1);
assert.equal(core.undo(), true);
assert.equal(value, 0);
assert.equal(core.redo(), true);
assert.equal(value, 1);

assert.throws(() => core.createGeometry({
  positions: [[0,0,0],[1,0,0],[0,1,0]],
  faces: [[0,1,4]]
}), /invalid vertex indices/i);

core.assignGeometry(handle, null);
assert.equal(core.destroyGeometry(geometry), true);
core.destroyEntity(handle);
assert.equal(core.entities.has(handle), false);
assert.equal(render.compile().objects.length, 0);

console.log('3D Lite Clean Rewrite core + geometry smoke: PASS');
