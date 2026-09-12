export class EvaluationGraph {
  #nodes = new Map();
  #revision = 0;

  get revision() { return this.#revision; }

  register(id, dependencies = []) {
    const key = String(id);
    if (!key) throw new Error('Evaluation node id is required');
    const deps = [...new Set(dependencies.map(String))];
    if (deps.includes(key)) throw new Error('Evaluation node cannot depend on itself');
    this.#nodes.set(key, Object.freeze({ id:key, dependencies:Object.freeze(deps) }));
    this.#assertAcyclic();
    this.#revision++;
    return key;
  }

  unregister(id) {
    const key = String(id);
    if (!this.#nodes.delete(key)) return false;
    for (const [nodeId,node] of this.#nodes) {
      if (!node.dependencies.includes(key)) continue;
      this.#nodes.set(nodeId, Object.freeze({ ...node, dependencies:Object.freeze(node.dependencies.filter(dep => dep !== key)) }));
    }
    this.#revision++;
    return true;
  }

  dependenciesOf(id) { return this.#nodes.get(String(id))?.dependencies ?? Object.freeze([]); }

  order(targets = [...this.#nodes.keys()]) {
    const visited = new Set();
    const result = [];
    const visit = id => {
      if (visited.has(id)) return;
      const node = this.#nodes.get(id);
      if (!node) return;
      for (const dependency of node.dependencies) visit(dependency);
      visited.add(id);
      result.push(id);
    };
    for (const target of targets.map(String)) visit(target);
    return Object.freeze(result);
  }

  snapshot() {
    return Object.freeze({ revision:this.#revision, nodes:Object.freeze([...this.#nodes.values()]) });
  }

  #assertAcyclic() {
    const visiting = new Set();
    const visited = new Set();
    const visit = id => {
      if (visiting.has(id)) throw new Error(`Evaluation dependency cycle at ${id}`);
      if (visited.has(id)) return;
      const node = this.#nodes.get(id);
      if (!node) return;
      visiting.add(id);
      for (const dep of node.dependencies) visit(dep);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of this.#nodes.keys()) visit(id);
  }
}
