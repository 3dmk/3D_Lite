import { GenerationRegistry } from './generation-registry.mjs';
import { ResourceStore } from './resource-store.mjs';
import { CommandStack } from './command-stack.mjs';

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
    this.#validator = validator ?? (() => true);
    this.#state = Object.freeze({
      sceneName: 'Untitled',
      activeCamera: null,
      selection: Object.freeze([]),
      metadata: Object.freeze({ schema: 1 })
    });
  }

  get state() { return this.#state; }

  snapshot() {
    return Object.freeze({
      state: this.#state,
      generations: this.generations.stamp(),
      entities: Object.freeze(this.entities.values().slice())
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

  createEntity(entity) {
    const handle = this.entities.create(deepFreeze(structuredClone(entity)));
    this.generations.bumpMany(['scene','renderScene']);
    return handle;
  }

  updateEntity(handle, updater, dirtyDomains = ['scene','renderScene']) {
    const current = this.entities.get(handle);
    if (!current) return false;
    const next = structuredClone(current);
    updater(next);
    if (!this.#validator(next, { label: 'updateEntity', core: this, handle })) {
      throw new Error('Entity validation failed');
    }
    this.entities.update(handle, deepFreeze(next));
    this.generations.bumpMany(dirtyDomains);
    return true;
  }

  destroyEntity(handle) {
    const destroyed = this.entities.destroy(handle);
    if (destroyed) this.generations.bumpMany(['scene','renderScene','selection']);
    return destroyed;
  }

  setSelection(handles) {
    const valid = handles.filter(handle => this.entities.has(handle));
    return this.transact('setSelection', draft => {
      draft.selection = valid.map(handle => ({ ...handle }));
    }, ['selection']);
  }

  renderSceneStamp() {
    return this.generations.stamp(['scene','geometry','topology','transform','material','renderScene']);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
