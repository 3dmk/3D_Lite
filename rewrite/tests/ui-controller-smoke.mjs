import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { RenderScenePort } from '../src/ports/render-scene-port.mjs';
import { ViewportPort, createEntityPick } from '../src/ports/viewport-port.mjs';
import { UIController } from '../src/app/ui-controller.mjs';

const core = new ThreeDLiteMainCore();
const render = new RenderScenePort(core);
const viewport = new ViewportPort(core, render);
const ui = new UIController(core, viewport);

const geometry = core.createGeometry({
  id:'ui-quad', positions:[[0,0,0],[1,0,0],[1,1,0],[0,1,0]], faces:[[0,1,2,3]]
});
const material = core.createMaterial({ id:'ui-mat', baseColor:[0.5,0.5,0.5,1] });
const entity = core.createEntity({ id:'ui-mesh', type:'mesh', geometry, material });

ui.intents.emit('selection.pick', { result:createEntityPick(entity) });
assert.equal(core.state.selection.length, 1);

ui.intents.emit('tool.activate', { name:'move' });
assert.equal(ui.tools.active, 'move');
assert.equal(viewport.state.tool, 'move');

ui.intents.emit('property.transform', { position:[2,3,4] });
assert.deepEqual(core.entities.get(entity).transform.position, [2,3,4]);
ui.intents.emit('undo');
assert.deepEqual(core.entities.get(entity).transform.position, [0,0,0]);
ui.intents.emit('redo');
assert.deepEqual(core.entities.get(entity).transform.position, [2,3,4]);

ui.intents.emit('property.material', { roughness:0.2 });
assert.equal(core.materials.get(material).roughness, 0.2);

const beforePanel = ui.panels.state.propertiesOpen;
ui.intents.emit('panel.toggle', { name:'propertiesOpen' });
assert.equal(ui.panels.state.propertiesOpen, !beforePanel);

ui.intents.emit('tool.cancel');
assert.equal(ui.tools.active, 'select');
assert.equal(viewport.state.tool, 'select');

const snapshot = ui.snapshot();
assert.equal(snapshot.selection.length, 1);
assert.equal(snapshot.tool, 'select');
console.log('3D Lite UI/tool-controller smoke: PASS');
