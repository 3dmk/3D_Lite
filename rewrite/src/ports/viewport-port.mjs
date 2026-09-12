import { createTranslateEntityCommand } from '../core/entity-commands.mjs';

const PROJECTIONS = new Set(['perspective','orthographic']);
const TOOLS = new Set(['select','move','rotate','scale']);

export class ViewportPort {
  #core;
  #render;
  #state;

  constructor(core, renderScenePort) {
    this.#core = core;
    this.#render = renderScenePort;
    this.#state = freezeState({
      projection: 'perspective',
      position: [4,3,6],
      target: [0,0,0],
      up: [0,1,0],
      fov: 45,
      orthoScale: 10,
      near: 0.01,
      far: 10000,
      tool: 'select',
      gizmoSpace: 'world'
    });
  }

  get state() { return this.#state; }

  setView(patch = {}) {
    const next = { ...structuredClone(this.#state), ...structuredClone(patch) };
    next.projection = PROJECTIONS.has(next.projection) ? next.projection : 'perspective';
    next.position = vec3(next.position, this.#state.position);
    next.target = vec3(next.target, this.#state.target);
    next.up = vec3(next.up, this.#state.up);
    next.fov = finite(next.fov, this.#state.fov, 1, 179);
    next.orthoScale = finite(next.orthoScale, this.#state.orthoScale, 0.0001, Infinity);
    next.near = finite(next.near, this.#state.near, 0.000001, Infinity);
    next.far = finite(next.far, this.#state.far, next.near + 0.000001, Infinity);
    next.tool = TOOLS.has(next.tool) ? next.tool : this.#state.tool;
    next.gizmoSpace = next.gizmoSpace === 'local' ? 'local' : 'world';
    this.#state = freezeState(next);
    return this.#state;
  }

  setTool(tool) {
    if (!TOOLS.has(tool)) throw new Error(`Unsupported viewport tool: ${tool}`);
    return this.setView({ tool });
  }

  frame() {
    const scene = this.#render.compile();
    return Object.freeze({
      schema: 1,
      view: this.#state,
      scene,
      selection: this.#core.state.selection,
      editSelection: this.#core.state.editSelection,
      generations: this.#core.generations.stamp(['viewport','selection','transform','renderScene'])
    });
  }

  applyPick(result, { additive = false, toggle = false } = {}) {
    if (!result) return this.#core.setSelection([]);
    if (result.kind === 'component') {
      const edit = this.#core.state.editSelection;
      if (!sameHandle(edit.geometry, result.geometry)) throw new Error('Viewport component pick does not match active edit geometry');
      const current = edit.elements;
      const index = result.index;
      const next = toggle
        ? (current.includes(index) ? current.filter(value => value !== index) : [...current,index])
        : (additive ? [...current,index] : [index]);
      return this.#core.setComponentSelection(next);
    }
    if (result.kind !== 'entity') return this.#core.setSelection([]);
    const handle = result.handle;
    if (!this.#core.entities.has(handle)) throw new Error('Viewport pick references stale entity');
    const current = this.#core.state.selection;
    if (toggle) {
      const exists = current.some(item => sameHandle(item, handle));
      return this.#core.setSelection(exists ? current.filter(item => !sameHandle(item, handle)) : [...current, handle]);
    }
    return this.#core.setSelection(additive ? [...current, handle] : [handle]);
  }

  translateSelection(delta) {
    if (this.#state.tool !== 'move') throw new Error('Move tool is required');
    const selected = this.#core.state.selection;
    if (selected.length !== 1) throw new Error('Viewport transform currently requires one selected entity');
    return this.#core.execute(createTranslateEntityCommand(selected[0], delta));
  }
}

export function createEntityPick(handle, distance = 0, position = null) {
  const d = Number(distance);
  if (!handle || !Number.isInteger(handle.index) || !Number.isInteger(handle.generation)) throw new TypeError('Pick requires entity handle');
  if (!Number.isFinite(d) || d < 0) throw new RangeError('Pick distance must be non-negative');
  return Object.freeze({ kind:'entity', handle:Object.freeze({ ...handle }), distance:d, position:position ? Object.freeze(vec3(position,[0,0,0])) : null });
}

export function createComponentPick(geometry, index, distance = 0) {
  if (!geometry || !Number.isInteger(geometry.index) || !Number.isInteger(geometry.generation)) throw new TypeError('Component pick requires geometry handle');
  const i = Number(index);
  const d = Number(distance);
  if (!Number.isInteger(i) || i < 0) throw new RangeError('Component index must be non-negative integer');
  if (!Number.isFinite(d) || d < 0) throw new RangeError('Pick distance must be non-negative');
  return Object.freeze({ kind:'component', geometry:Object.freeze({ ...geometry }), index:i, distance:d });
}

function sameHandle(a,b){ return !!a && !!b && a.index === b.index && a.generation === b.generation; }
function vec3(value,fallback){ if(!Array.isArray(value)||value.length!==3)return fallback.slice(); const out=value.map(Number); return out.every(Number.isFinite)?out:fallback.slice(); }
function finite(value,fallback,min,max){ const n=Number(value); return Number.isFinite(n) ? Math.min(max,Math.max(min,n)) : fallback; }
function freezeState(value){ for(const key of ['position','target','up']) Object.freeze(value[key]); return Object.freeze(value); }
