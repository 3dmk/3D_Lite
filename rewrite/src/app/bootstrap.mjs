import { ThreeDLiteMainCore } from '../core/main-core.mjs';
import { RenderScenePort } from '../ports/render-scene-port.mjs';

const core = new ThreeDLiteMainCore({
  validator(value) {
    return value && typeof value === 'object';
  }
});

const renderScene = new RenderScenePort(core);

const cube = core.createEntity({
  id: 'startup-cube',
  type: 'mesh',
  transform: { position: [0,0,0], rotation: [0,0,0], scale: [1,1,1] },
  geometry: { primitive: 'box', size: [1,1,1] },
  material: { baseColor: [0.54,0.54,0.54], roughness: 0.55, metallic: 0 },
  visible: true
});
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
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#202020'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#343434'; ctx.lineWidth = 1;
  for (let x=0;x<w;x+=32){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y=0;y<h;y+=32){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  ctx.fillStyle = '#8a8a8a';
  const size = Math.min(w,h)*0.18;
  ctx.fillRect(w/2-size/2,h/2-size/2,size,size);
  ctx.strokeStyle = '#ff8a00'; ctx.lineWidth = 2;
  ctx.strokeRect(w/2-size/2,h/2-size/2,size,size);
}

function refresh() {
  const compiled = renderScene.compile();
  status.textContent = `Main Core online • ${compiled.objects.length} entity • render-scene generation ${compiled.stamp.renderScene}`;
  output.textContent = JSON.stringify({ state: core.state, generations: core.generations.stamp(), renderScene: compiled }, null, 2);
}

window.addEventListener('resize', resize);
document.querySelector('#rename').addEventListener('click', () => {
  core.transact('rename scene', draft => { draft.sceneName = draft.sceneName === 'Untitled' ? 'Clean Rewrite Scene' : 'Untitled'; }, ['scene']);
  refresh();
});
document.querySelector('#move').addEventListener('click', () => {
  core.updateEntity(cube, entity => { entity.transform.position[0] += 0.25; }, ['transform','renderScene']);
  refresh();
});

resize();
refresh();
globalThis.ThreeDLiteRewrite = Object.freeze({ core, renderScene });
