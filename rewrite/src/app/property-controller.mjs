import { createSetEntityTransformCommand } from '../core/entity-commands.mjs';
import { createUpdateMaterialCommand } from '../core/material-commands.mjs';

export class PropertyController {
  #core;

  constructor(core) { this.#core = core; }

  setSelectedTransform(patch = {}) {
    const selection = this.#core.state.selection;
    if (selection.length !== 1) throw new Error('Property transform editing requires exactly one selected entity');
    const handle = selection[0];
    const entity = this.#core.entities.get(handle);
    if (!entity) throw new Error('Selected entity is stale');
    const next = structuredClone(entity.transform);
    for (const key of ['position','rotation','scale']) {
      if (patch[key] !== undefined) next[key] = normalizeVec3(patch[key], key === 'scale' ? [1,1,1] : [0,0,0]);
    }
    return this.#core.execute(createSetEntityTransformCommand(handle, next));
  }

  setSelectedVisibility(visible) {
    const selection = this.#core.state.selection;
    if (selection.length !== 1) throw new Error('Visibility editing requires exactly one selected entity');
    const handle = selection[0];
    return this.#core.updateEntity(handle, draft => { draft.visible = !!visible; }, ['scene','renderScene','viewport']);
  }

  updateSelectedMaterial(patch = {}) {
    const selection = this.#core.state.selection;
    if (selection.length !== 1) throw new Error('Material editing requires exactly one selected entity');
    const entity = this.#core.entities.get(selection[0]);
    if (!entity?.material) throw new Error('Selected entity has no material');
    return this.#core.execute(createUpdateMaterialCommand(entity.material, patch));
  }
}

function normalizeVec3(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError('Expected vec3');
  const out = value.map(Number);
  if (!out.every(Number.isFinite)) return fallback.slice();
  return out;
}
