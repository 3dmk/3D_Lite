import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';
import { LitePixSceneAdapter } from '../src/ports/litepix-scene-adapter.mjs';
import { LitePixRendererPort } from '../src/ports/litepix-renderer-port.mjs';

const core = new ThreeDLiteMainCore();
const renderScene = new RenderScenePort(core);
const geometry = core.createGeometry({
  id:'tri', positions:[[0,0,0],[1,0,0],[0,1,0]], faces:[[0,1,2]]
});
const material = core.createMaterial({ id:'mat', baseColor:[0.8,0.2,0.1,1], roughness:0.3 });
const entity = core.createEntity({
  id:'mesh-a', type:'mesh', geometry, material,
  transform:{ position:[2,0,0], rotation:[0,0,0], scale:[2,2,2] }
});

const adapter = new LitePixSceneAdapter(renderScene);
const scene = adapter.compile();
assert.equal(scene.schema, 1);
assert.equal(scene.meshes.length, 1);
assert.equal(scene.meshes[0].primitives.length, 1);
assert.equal(scene.instances.length, 1);
assert.equal(scene.materials.length, 1);
assert.deepEqual(scene.instances[0].bounds.min, [2,0,0]);
assert.deepEqual(scene.instances[0].bounds.max, [4,2,0]);
assert.equal(core.entities.get(entity).transform.position[0], 2, 'adapter must not mutate Main Core');

let compileCalls = 0;
let lastScene = null;
const runtime = {
  name:'mock-litepix',
  compileScene(input) { compileCalls++; lastScene=input; return Object.freeze({ id:`compiled-${compileCalls}`, input }); },
  submit(compiled, job) { return Object.freeze({ compiled, job }); },
  snapshot() { return { compileCalls }; }
};
const renderer = new LitePixRendererPort(renderScene, runtime);
const first = renderer.compile();
const second = renderer.compile();
assert.equal(first, second, 'unchanged render-scene stamp should reuse LitePix compilation');
assert.equal(compileCalls, 1);
assert.equal(lastScene.meshes.length, 1);

core.updateEntity(entity, draft => { draft.transform.position[0] = 5; }, ['transform','renderScene']);
const third = renderer.compile();
assert.notEqual(third, first);
assert.equal(compileCalls, 2);
assert.equal(third.input.instances[0].bounds.min[0], 5);

const submitted = renderer.submit({ id:'job-1' });
assert.equal(submitted.job.id, 'job-1');
assert.equal(renderer.snapshot().provider, 'mock-litepix');
console.log('3D Lite Clean Rewrite LitePix renderer port smoke: PASS');
