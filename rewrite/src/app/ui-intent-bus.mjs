export class UIIntentBus {
  #handlers = new Map();

  on(type, handler) {
    if (!type || typeof handler !== 'function') throw new TypeError('UI intent subscription requires type and handler');
    const key = String(type);
    const set = this.#handlers.get(key) ?? new Set();
    set.add(handler);
    this.#handlers.set(key, set);
    return () => set.delete(handler);
  }

  emit(type, payload = {}) {
    const key = String(type);
    const event = Object.freeze({ type:key, payload:structuredClone(payload) });
    const results = [];
    for (const handler of this.#handlers.get(key) ?? []) results.push(handler(event));
    return results;
  }
}
