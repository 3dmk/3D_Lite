export class SceneGraph {
  #nodes = new Map();
  #isAlive;

  constructor(isAlive = () => true) {
    this.#isAlive = isAlive;
  }

  register(handle, parent = null) {
    this.#requireLive(handle);
    const key = keyOf(handle);
    if (this.#nodes.has(key)) throw new Error('SceneGraph handle already registered');
    this.#nodes.set(key, { handle: cloneHandle(handle), parent: null, children: new Set() });
    if (parent) this.reparent(handle, parent);
    return handle;
  }

  has(handle) {
    return !!handle && this.#nodes.has(keyOf(handle)) && this.#isAlive(handle);
  }

  parentOf(handle) {
    const node = this.#node(handle);
    return node?.parent ? cloneHandle(node.parent) : null;
  }

  childrenOf(handle) {
    const node = this.#node(handle);
    if (!node) return [];
    return [...node.children].map(key => cloneHandle(this.#nodes.get(key).handle));
  }

  roots() {
    return [...this.#nodes.values()]
      .filter(node => !node.parent && this.#isAlive(node.handle))
      .map(node => cloneHandle(node.handle));
  }

  reparent(handle, newParent = null) {
    const node = this.#requireNode(handle);
    if (newParent) {
      this.#requireNode(newParent);
      if (sameHandle(handle, newParent)) throw new Error('SceneGraph cannot parent an entity to itself');
      if (this.#wouldCreateCycle(handle, newParent)) throw new Error('SceneGraph cycle rejected');
    }

    if (node.parent) {
      this.#nodes.get(keyOf(node.parent))?.children.delete(keyOf(handle));
    }

    node.parent = newParent ? cloneHandle(newParent) : null;
    if (newParent) this.#nodes.get(keyOf(newParent)).children.add(keyOf(handle));
    return true;
  }

  unregister(handle, { reparentChildren = true } = {}) {
    const node = this.#node(handle);
    if (!node) return false;
    const parent = node.parent ? cloneHandle(node.parent) : null;
    const children = this.childrenOf(handle);

    if (node.parent) this.#nodes.get(keyOf(node.parent))?.children.delete(keyOf(handle));
    for (const child of children) {
      if (reparentChildren) this.reparent(child, parent);
      else this.reparent(child, null);
    }
    this.#nodes.delete(keyOf(handle));
    return true;
  }

  descendantsOf(handle) {
    this.#requireNode(handle);
    const result = [];
    const stack = this.childrenOf(handle);
    while (stack.length) {
      const current = stack.pop();
      result.push(current);
      stack.push(...this.childrenOf(current));
    }
    return result;
  }

  snapshot() {
    return Object.freeze([...this.#nodes.values()]
      .filter(node => this.#isAlive(node.handle))
      .map(node => Object.freeze({
        handle: Object.freeze(cloneHandle(node.handle)),
        parent: node.parent ? Object.freeze(cloneHandle(node.parent)) : null,
        children: Object.freeze(this.childrenOf(node.handle).map(child => Object.freeze(child)))
      })));
  }

  #wouldCreateCycle(handle, parent) {
    let cursor = parent;
    while (cursor) {
      if (sameHandle(cursor, handle)) return true;
      cursor = this.parentOf(cursor);
    }
    return false;
  }

  #node(handle) {
    if (!handle) return null;
    const node = this.#nodes.get(keyOf(handle));
    return node && this.#isAlive(handle) ? node : null;
  }

  #requireNode(handle) {
    const node = this.#node(handle);
    if (!node) throw new Error('SceneGraph handle is not registered or is stale');
    return node;
  }

  #requireLive(handle) {
    if (!handle || !this.#isAlive(handle)) throw new Error('SceneGraph requires a live entity handle');
  }
}

function keyOf(handle) {
  return `${handle.index}:${handle.generation}`;
}

function cloneHandle(handle) {
  return { index: handle.index, generation: handle.generation };
}

function sameHandle(a, b) {
  return !!a && !!b && a.index === b.index && a.generation === b.generation;
}
