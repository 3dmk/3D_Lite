export class ResourceStore {
  #slots = [];
  #free = [];

  create(value) {
    const index = this.#free.length ? this.#free.pop() : this.#slots.length;
    const previous = this.#slots[index];
    const generation = previous ? previous.generation + 1 : 1;
    this.#slots[index] = { generation, alive: true, value };
    return Object.freeze({ index, generation });
  }

  has(handle) {
    const slot = handle && this.#slots[handle.index];
    return !!slot && slot.alive && slot.generation === handle.generation;
  }

  get(handle) {
    if (!this.has(handle)) return undefined;
    return this.#slots[handle.index].value;
  }

  update(handle, value) {
    if (!this.has(handle)) return false;
    this.#slots[handle.index].value = value;
    return true;
  }

  destroy(handle) {
    if (!this.has(handle)) return false;
    const slot = this.#slots[handle.index];
    slot.alive = false;
    slot.value = undefined;
    this.#free.push(handle.index);
    return true;
  }

  values() {
    return this.#slots.filter(slot => slot?.alive).map(slot => slot.value);
  }
}
