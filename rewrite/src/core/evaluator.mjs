function handleKey(handle) { return `${handle.index}:${handle.generation}`; }

export class DerivedGeometryEvaluator {
  #core;
  #cache = new Map();
  #operators = new Map();
  #hits = 0;
  #misses = 0;

  constructor(core) { this.#core = core; }

  registerOperator(type, evaluate) {
    if (!type || typeof evaluate !== 'function') throw new TypeError('Evaluation operator requires type and function');
    this.#operators.set(String(type), evaluate);
  }

  evaluate(handle, stack = []) {
    const source = this.#core.geometry.compile(handle);
    if (!source) return null;
    const stamp = this.#core.generations.stamp(['geometry','topology','evaluation']);
    const signature = `${handleKey(handle)}|${JSON.stringify(stamp)}|${JSON.stringify(stack)}`;
    const cached = this.#cache.get(signature);
    if (cached) { this.#hits++; return cached; }

    this.#misses++;
    let result = source;
    for (const operation of stack) {
      if (operation?.enabled === false) continue;
      const evaluator = this.#operators.get(String(operation?.type ?? ''));
      if (!evaluator) throw new Error(`Unknown evaluation operator: ${operation?.type}`);
      result = evaluator(result, operation.params ?? {}, { core:this.#core, sourceHandle:handle });
      if (!result || typeof result !== 'object') throw new Error(`Evaluation operator ${operation.type} returned invalid geometry`);
    }
    result = deepFreeze(structuredClone(result));
    this.#cache.clear();
    this.#cache.set(signature, result);
    return result;
  }

  invalidate() { this.#cache.clear(); }
  stats() { return Object.freeze({ entries:this.#cache.size, hits:this.#hits, misses:this.#misses }); }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
