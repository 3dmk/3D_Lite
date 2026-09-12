import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { serializeProject, serializeProjectJSON, deserializeProject } from '../src/core/project-serializer.mjs';
import { createDefaultProjectMigrations } from '../src/core/project-migrations.mjs';

const core = new ThreeDLiteMainCore();
const texture = core.createAsset({ id:'tex-a', name:'Albedo', type:'texture', uri:'textures/a.png', colorSpace:'srgb', wrap:{u:'repeat',v:'clamp'} });
const material = core.createMaterial({ id:'mat-a', name:'Paint', baseColor:[0.8,0.2,0.1,1], metallic:0.25, roughness:0.6, textures:{baseColor:texture} });
const geometry = core.createGeometry({ id:'geo-a', name:'Quad', positions:[[0,0,0],[1,0,0],[1,1,0],[0,1,0]], faces:[[0,1,2,3]] });
const group = core.createEntity({ id:'group-a', name:'Root Group', type:'group' });
const mesh = core.createEntity({ id:'mesh-a', name:'Quad Mesh', type:'mesh', geometry, material, modifiers:[{id:'offset-a',type:'offset',enabled:true,params:{x:2}}] }, { parent:group });
const camera = core.createEntity({ id:'camera-a', name:'Camera', type:'camera', transform:{position:[4,3,6],rotation:[0,0,0],scale:[1,1,1]} });
core.setActiveCamera(camera);
core.setSelection([mesh]);
core.setEditMode('vertex', geometry);
core.setComponentSelection([0,2]);
core.transact('nameProject', draft => { draft.sceneName='Serialization Test'; }, ['scene']);

const saved = serializeProject(core, { metadata:{ app:'3D Lite Clean Rewrite', test:true } });
assert.equal(saved.format, '3dlite-project');
assert.equal(saved.version, 1);
assert.equal(saved.assets.length, 1);
assert.equal(saved.materials.length, 1);
assert.equal(saved.geometries.length, 1);
assert.equal(saved.entities.length, 3);
assert.equal(saved.hierarchy.find(link => link.entityRef === 'entity:1').parentRef, 'entity:0');
assert.equal(saved.materials[0].value.textures.baseColor, 'asset:0');
assert.equal(saved.entities[1].value.geometryRef, 'geometry:0');
assert.equal(saved.entities[1].value.materialRef, 'material:0');
assert.equal(saved.state.activeCameraRef, 'entity:2');
assert.deepEqual(saved.state.selectionRefs, ['entity:1']);
assert.deepEqual(saved.state.editSelection.elements, [0,2]);

const json = serializeProjectJSON(core, { metadata:{ app:'3D Lite Clean Rewrite', test:true } });
const loaded = deserializeProject(json, () => new ThreeDLiteMainCore());
const resaved = serializeProject(loaded.core, { metadata:{ app:'3D Lite Clean Rewrite', test:true } });
assert.deepEqual(resaved, saved, 'save-load-save must be structurally stable');
assert.equal(loaded.core.state.sceneName, 'Serialization Test');
assert.equal(loaded.core.state.selection.length, 1);
assert.equal(loaded.core.state.editSelection.mode, 'vertex');
assert.deepEqual(loaded.core.state.editSelection.elements, [0,2]);

const loadedMesh = loaded.core.entities.entries().find(entry => entry.value.id === 'mesh-a');
assert.ok(loadedMesh);
const loadedParent = loaded.core.scene.parentOf(loadedMesh.handle);
assert.equal(loaded.core.entities.get(loadedParent).id, 'group-a');
assert.equal(loaded.core.materials.get(loadedMesh.value.material).name, 'Paint');

const v0 = structuredClone(saved);
v0.version = 0;
const migrated = createDefaultProjectMigrations().migrate(v0);
assert.equal(migrated.version, 1);
assert.throws(() => deserializeProject({ ...structuredClone(saved), version:999 }, () => new ThreeDLiteMainCore()), /newer than supported/i);
const broken = structuredClone(saved);
broken.entities[1].value.geometryRef = 'geometry:missing';
assert.throws(() => deserializeProject(broken, () => new ThreeDLiteMainCore()), /missing geometry/i);

console.log('3D Lite project serialization + migration smoke: PASS');
