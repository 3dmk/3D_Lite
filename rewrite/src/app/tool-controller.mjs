export class ToolController {
  #viewport;
  #active = 'select';
  #sessions = new Map();

  constructor(viewport) {
    this.#viewport = viewport;
    this.#viewport.setTool(this.#active);
  }

  get active() { return this.#active; }

  register(name, lifecycle = {}) {
    const key = String(name);
    if (!key) throw new Error('Tool name is required');
    this.#sessions.set(key, {
      activate: typeof lifecycle.activate === 'function' ? lifecycle.activate : null,
      deactivate: typeof lifecycle.deactivate === 'function' ? lifecycle.deactivate : null,
      cancel: typeof lifecycle.cancel === 'function' ? lifecycle.cancel : null
    });
    return key;
  }

  activate(name) {
    const key = String(name);
    if (key === this.#active) return this.#active;
    const previous = this.#active;
    this.#sessions.get(previous)?.deactivate?.({ previous, next:key });
    this.#viewport.setTool(key);
    this.#active = key;
    this.#sessions.get(key)?.activate?.({ previous, next:key });
    return this.#active;
  }

  cancel() {
    this.#sessions.get(this.#active)?.cancel?.({ active:this.#active });
    if (this.#active !== 'select') this.activate('select');
    return this.#active;
  }
}
