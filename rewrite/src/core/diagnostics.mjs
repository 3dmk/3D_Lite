export const DiagnosticSeverity = Object.freeze({ INFO:'info', WARNING:'warning', ERROR:'error', FATAL:'fatal' });

export class DiagnosticsRegistry {
  #checks = new Map();
  #history = [];
  #maxHistory;

  constructor({ maxHistory = 128 } = {}) {
    this.#maxHistory = Math.max(8, Number(maxHistory) || 128);
  }

  register(id, check, { severity = DiagnosticSeverity.ERROR, releaseBlocking = false } = {}) {
    id = String(id ?? '').trim();
    if (!id) throw new Error('Diagnostic check requires an id');
    if (typeof check !== 'function') throw new TypeError('Diagnostic check must be a function');
    if (this.#checks.has(id)) throw new Error(`Diagnostic check already registered: ${id}`);
    this.#checks.set(id, Object.freeze({ id, check, severity, releaseBlocking: !!releaseBlocking }));
    return id;
  }

  unregister(id) { return this.#checks.delete(String(id)); }

  async run(context = {}) {
    const startedAt = Date.now();
    const results = [];
    for (const spec of this.#checks.values()) {
      let passed = false;
      let message = '';
      let details = null;
      try {
        const value = await spec.check(context);
        if (value === true || value == null) {
          passed = true;
        } else if (value === false) {
          message = `${spec.id} failed`;
        } else if (typeof value === 'object') {
          passed = value.passed !== false;
          message = String(value.message ?? '');
          details = value.details == null ? null : structuredClone(value.details);
        } else {
          passed = !!value;
        }
      } catch (error) {
        message = String(error?.message ?? error);
        details = { name: error?.name ?? 'Error' };
      }
      results.push(Object.freeze({
        id: spec.id,
        passed,
        severity: spec.severity,
        releaseBlocking: spec.releaseBlocking,
        message,
        details: details ? deepFreeze(details) : null
      }));
    }
    const blockers = results.filter(result => !result.passed && result.releaseBlocking);
    const report = deepFreeze({
      schema: 1,
      startedAt,
      finishedAt: Date.now(),
      passed: blockers.length === 0,
      releaseBlockingFailures: blockers.map(result => result.id),
      results
    });
    this.#history.push(report);
    if (this.#history.length > this.#maxHistory) this.#history.shift();
    return report;
  }

  history() { return Object.freeze(this.#history.slice()); }
  latest() { return this.#history[this.#history.length - 1] ?? null; }
}

export function createCoreDiagnostics(core) {
  const registry = new DiagnosticsRegistry();
  registry.register('main-core.state', () => ({
    passed: !!core?.state && typeof core.state === 'object',
    message: 'Main Core state must exist'
  }), { releaseBlocking: true });
  registry.register('main-core.selection-handles', () => ({
    passed: (core?.state?.selection ?? []).every(handle => core.entities.has(handle)),
    message: 'Selection contains stale entity handles'
  }), { releaseBlocking: true });
  registry.register('main-core.active-camera', () => ({
    passed: !core?.state?.activeCamera || core.entities.has(core.state.activeCamera),
    message: 'Active camera handle is stale'
  }), { releaseBlocking: true });
  registry.register('scene.hierarchy', () => {
    const nodes = core.scene.snapshot();
    const live = new Set(core.entities.entries().map(entry => keyOf(entry.handle)));
    const ok = nodes.every(node => live.has(keyOf(node.handle)) && (!node.parent || live.has(keyOf(node.parent))));
    return { passed: ok, message: 'Scene hierarchy references stale entities', details: { nodes: nodes.length, entities: live.size } };
  }, { releaseBlocking: true });
  registry.register('scene.unique-entity-ids', () => {
    const ids = core.entities.values().map(entity => entity.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    return {
      passed: duplicates.length === 0,
      message: 'Scene contains duplicate entity ids',
      details: { duplicates:[...new Set(duplicates)] }
    };
  }, { releaseBlocking: true });
  registry.register('geometry.references', () => ({
    passed: core.entities.values().every(entity => !entity.geometry || core.geometry.has(entity.geometry)),
    message: 'Entity references stale geometry'
  }), { releaseBlocking: true });
  registry.register('material.references', () => ({
    passed: core.entities.values().every(entity => !entity.material || core.materials.has(entity.material)),
    message: 'Entity references stale material'
  }), { releaseBlocking: true });
  registry.register('material.asset-references', () => {
    const stale = [];
    for (const { handle, value } of core.materials.entries()) {
      for (const [slot, asset] of Object.entries(value.textures ?? {})) {
        if (asset && !core.assets.has(asset)) stale.push({ material:keyOf(handle), slot, asset:keyOf(asset) });
      }
    }
    return { passed:stale.length === 0, message:'Material references stale texture assets', details:{ stale } };
  }, { releaseBlocking: true });
  registry.register('evaluation.cache-bounds', () => {
    const stats = core.evaluator?.stats?.() ?? null;
    return {
      passed: !stats || stats.entries <= stats.maxEntries,
      message: 'Derived geometry evaluator cache exceeded configured bound',
      details: stats
    };
  }, { releaseBlocking: true });
  return registry;
}

function keyOf(handle) { return `${handle.index}:${handle.generation}`; }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; for (const child of Object.values(value)) deepFreeze(child); return Object.freeze(value); }
