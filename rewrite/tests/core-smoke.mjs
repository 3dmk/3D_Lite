import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';

const core = new ThreeDLiteMainCore();
const render = new RenderScenePort(core);

const handle = core.createEntity({ id:'a', type:'mesh', transform:{ position:[0,0,0] } });
assert.equal(core.entities.has(handle), true);
const first = render.compile();
assert.equal(first.objects.length, 1);
const firstStamp = first.stamp.renderScene;

core.updateEntity(handle, entity => { entity.transform.position[0] = 1; }, ['transform','renderScene']);
const second = render.compile();
assert.notEqual(second.stamp.renderScene, firstStamp);
assert.equal(second.objects[0].transform.position[0], 1);

core.setSelection([handle]);
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

core.destroyEntity(handle);
assert.equal(core.entities.has(handle), false);
assert.equal(render.compile().objects.length, 0);

console.log('3D Lite Clean Rewrite core smoke: PASS');
