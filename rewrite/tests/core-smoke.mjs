import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';

const core = new ThreeDLiteMainCore();
const render = new RenderScenePort(core);

const root = core.createEntity({ id:'root', name:'Root', type:'group' });
const handle = core.createEntity({ id:'a', name:'Mesh A', type:'mesh', transform:{ position:[0,0,0] } }, { parent: root });
assert.equal(core.entities.has(handle), true);
assert.deepEqual(core.scene.parentOf(handle), root);
assert.equal(core.scene.childrenOf(root).length, 1);

const first = render.compile();
assert.equal(first.schema, 2);
assert.equal(first.objects.length, 2);
assert.equal(first.roots.length, 1);
const firstStamp = first.stamp.renderScene;

core.updateEntity(handle, entity => { entity.transform.position[0] = 1; }, ['transform','renderScene']);
const second = render.compile();
assert.notEqual(second.stamp.renderScene, firstStamp);
assert.equal(second.objects.find(object => object.id === 'a').transform.position[0], 1);

const camera = core.createEntity({ id:'camera-main', type:'camera' });
core.setActiveCamera(camera);
assert.deepEqual(core.state.activeCamera, camera);
assert.deepEqual(render.compile().activeCamera, camera);

core.setSelection([handle, handle]);
assert.equal(core.state.selection.length, 1);

assert.throws(() => core.reparentEntity(root, handle), /cycle/i);
core.reparentEntity(handle, null);
assert.equal(core.scene.parentOf(handle), null);
core.reparentEntity(handle, root);

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

const child = core.createEntity({ id:'child', type:'mesh' }, { parent: handle });
assert.equal(core.scene.descendantsOf(root).length, 2);
core.destroyEntity(handle);
assert.equal(core.entities.has(handle), false);
assert.equal(core.entities.has(child), false);
assert.equal(core.state.selection.length, 0);
assert.equal(render.compile().objects.some(object => object.id === 'a'), false);

assert.throws(() => core.setActiveCamera(root), /camera/i);
assert.equal(core.snapshot().hierarchy.length, 2);

console.log('3D Lite Clean Rewrite scene/core smoke: PASS');
