import { GenerationRegistry } from './generation-registry.mjs';
import { ResourceStore } from './resource-store.mjs';
import { CommandStack } from './command-stack.mjs';
import { SceneGraph } from './scene-graph.mjs';
import { createSceneEntity, validateSceneEntity, normalizeTransform } from './scene-entity.mjs';

const DOMAINS = [
  'scene','geometry','topology','transform','selection','material','evaluation','renderScene','viewport'
];

export class ThreeDLiteMainCore {
  #state;
  #validator;

  constructor({ validator } = {}) {
    this.generations = new GenerationRegistry(DOMAINS);
    this.entities = new ResourceStore();
    this.commands = new CommandStack();
    this.scene = new SceneGraph(handle => this.entities.has(handle));
    this.#validator = validator ?? (() => true);
    this.#state = Object.freeze({
      sceneName: 'Untitled',
      activeCamera: null,
      selection: Object.freeze([]),
      metadata: Object.freeze({ schema: 2 })
    });
  }

  get state() { return this.#state; }

  snapshot() {
    return Object.freeze({
      state: this.#state,
      generations: this.generations.stamp(),
      entities: Object.freeze(this.entities.values().slice()),
      hierarchy: this.scene.snapshot()
    });
  }

  transact(label, mutator, dirtyDomains = ['scene']) {
    if (typeof mutator !== 'function') throw new TypeError('mutator must be a function');
    const before = this.#state;
    const draft = structuredClone(before);
    mutator(draft, this);
    if (!this.#validator(draft, { label, core: this })) {
      throw new Error(`Main Core validation failed: ${label}`);
    }
    this.#state = deepFreeze(draft);
    this.generations.bumpMany(dirtyDomains);
    return this.#state;
  }

  execute(command) {
    return this.commands.execute(command, this);
  }

  undo() { return this.commands.undo(this); }
  redo() { return this.commands.redo(this); }

  createEntity(entity = {}, { parent = null } = {}) {
    const normalized = createSceneEntity(entity);
    if (!validateSceneEntity(normalized)) throw new Error('Invalid scene entity');
    if (!this.#validator(normalized, { label: 'createEntity', core: this })) {
      throw new Error('Entity validation failed');
    }
    const handle = this.entities.create(deepFreeze(normalized));
    try {
      this.scene.register(handle, parent);
    } catch (error) {
      this.entities.destroy(handle);
      throw error;
    }
    this.generations.bumpMany(['scene','renderScene']);
    return handle;
  }

  updateEntity(handle, updater, dirtyDomains = ['scene','renderScene']) {
    const current = this.entities.get(handle);
    if (!current) return false;
    if (typeof updater !== 'function') throw new TypeError('updater must be a function');
    const next = structuredClone(current);
    updater(next);
    next.transform = normalizeTransform(next.transform);
    if (!validateSceneEntity(next)) throw new Error('Invalid scene entity update');
    if (!this.#validator(next, { label: 'updateEntity', core: this, handle })) {
      throw new Error('Entity validation failed');
    }
    this.entities.update(handle, deepFreeze(next));
    this.generations.bumpMany(dirtyDomains);
    return true;
  }

  reparentEntity(handle, parent = null) {
    this.scene.reparent(handle, parent);
    this.generations.bumpMany(['scene','transform','renderScene']);
    return true;
  }

  destroyEntity(handle, { recursive = true } = {}) {
    if (!this.entities.has(handle)) return false;
    const descendants = recursive ? this.scene.descendantsOf(handle).reverse() : [];
    const removedKeys = new Set([handleKey(handle), ...descendants.map(handleKey)]);

    for (const child of descendants) {
      this.scene.unregister(child, { reparentChildren: false });
      this.entities.destroy(child);
    }
    this.scene.unregister(handle, { reparentChildren: !recursive });
    const destroyed = this.entities.destroy(handle);

    if (destroyed) {
      const selection = this.#state.selection.filter(selected => !removedKeys.has(handleKey(selected)));
      this.#state = deepFreeze({ ...structuredClone(this.#state), selection });
      this.generations.bumpMany(['scene','renderScene','selection']);
    }
    return destroyed;
  }

  setSelection(handles) {
    const valid = dedupeHandles(handles.filter(handle => this.entities.has(handle)));
    return this.transact('setSelection', draft => {
      draft.selection = valid.map(handle => ({ ...handle }));
    }, ['selection']);
  }

  setActiveCamera(handle = null) {
    if (handle) {
      const entity = this.entities.get(handle);
      if (!entity || entity.type !== 'camera') throw new Error('Active camera must reference a live camera entity');
    }
    return this.transact('setActiveCamera', draft => {
      draft.activeCamera = handle ? { ...handle } : null;
    }, ['scene','viewport','renderScene']);
  }

  renderSceneStamp() {
    return this.generations.stamp(['scene','geometry','topology','transform','material','renderScene']);
  }
}

function handleKey(handle) {
  return `${handle.index}:${handle.generation}`;
}

function dedupeHandles(handles) {
  const seen = new Set();
  return handles.filter(handle => {
    const key = handleKey(handle);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
