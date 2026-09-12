export class PanelController {
  #state;

  constructor(initial = {}) {
    this.#state = freeze({
      outlinerOpen: initial.outlinerOpen !== false,
      propertiesOpen: initial.propertiesOpen !== false,
      modifierOpen: initial.modifierOpen !== false,
      materialOpen: initial.materialOpen !== false,
      activeTab: String(initial.activeTab ?? 'properties')
    });
  }

  get state() { return this.#state; }

  set(patch = {}) {
    const next = { ...structuredClone(this.#state), ...structuredClone(patch) };
    this.#state = freeze(next);
    return this.#state;
  }

  toggle(name) {
    if (!(name in this.#state) || typeof this.#state[name] !== 'boolean') throw new Error(`Unknown panel toggle: ${name}`);
    return this.set({ [name]: !this.#state[name] });
  }
}

function freeze(value) { return Object.freeze(value); }
