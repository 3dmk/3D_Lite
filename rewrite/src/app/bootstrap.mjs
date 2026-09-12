import { ThreeDLiteMainCore } from '../core/main-core.mjs';
import { RenderScenePort } from '../ports/render-scene-port.mjs';
import { ViewportPort } from '../ports/viewport-port.mjs';
import { UIController } from './ui-controller.mjs';

export const core = new ThreeDLiteMainCore({ validator:value => value && typeof value === 'object' });
export const renderScene = new RenderScenePort(core);
export const viewport = new ViewportPort(core, renderScene);
export const ui = new UIController(core, viewport);

const geometry = core.createGeometry({
  id:'startup-cube-geometry',
  name:'Startup Cube',
  positions:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
  faces:[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]
});
const material = core.createMaterial({ id:'startup-gray', name:'Startup Gray', baseColor:[0.54,0.54,0.54,1], roughness:0.55, metallic:0 });
const cube = core.createEntity({ id:'startup-cube', type:'mesh', geometry, material, visible:true });
core.setSelection([cube]);

const status = document.querySelector('#status');
const output = document.querySelector('#core-output');
const canvas = document.querySelector('#viewport');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = Math.max(1, devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  draw();
}

function draw() {
  const frame = viewport.frame();
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#202020'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#343434'; ctx.lineWidth = 1;
  for (let x=0;x<w;x+=32){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y=0;y<h;y+=32){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  if (frame.scene.objects.length) {
    ctx.fillStyle = '#8a8a8a';
    const size = Math.min(w,h)*0.18;
    const x = w/2-size/2, y = h/2-size/2;
    ctx.fillRect(x,y,size,size);
    if (frame.selection.length) { ctx.strokeStyle = '#ff8a00'; ctx.lineWidth = 2; ctx.strokeRect(x,y,size,size); }
  }
}

function refresh() {
  const compiled = renderScene.compile();
  status.textContent = `Main Core online • ${compiled.objects.length} entity • tool ${ui.tools.active} • render-scene generation ${compiled.stamp.renderScene}`;
  output.textContent = JSON.stringify({ ui:ui.snapshot(), state:core.state, generations:core.generations.stamp(), renderScene:compiled }, null, 2);
  draw();
}

window.addEventListener('resize', resize);
document.querySelector('#rename').addEventListener('click', () => {
  ui.intents.emit('scene.rename', { name:core.state.sceneName === 'Untitled' ? 'Clean Rewrite Scene' : 'Untitled' });
  refresh();
});
document.querySelector('#move').addEventListener('click', () => {
  const current = core.entities.get(cube).transform.position;
  ui.intents.emit('property.transform', { position:[current[0]+0.25,current[1],current[2]] });
  refresh();
});

resize();
refresh();
