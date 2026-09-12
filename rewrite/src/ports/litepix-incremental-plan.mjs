export class LitePixIncrementalPlanner {
  #previous = null;

  analyze(scene) {
    const next = fingerprintScene(scene);
    const prev = this.#previous;
    if (!prev) return freezePlan('rebuild', 'initial scene compile', next);

    const meshesChanged = prev.meshes !== next.meshes;
    const instanceTopologyChanged = prev.instanceTopology !== next.instanceTopology;
    const instanceStateChanged = prev.instanceState !== next.instanceState;
    const metadataChanged = prev.materials !== next.materials || prev.lights !== next.lights || prev.camera !== next.camera;

    if (meshesChanged) return freezePlan('rebuild', 'render geometry changed', next);
    if (instanceTopologyChanged) return freezePlan('tlas-rebuild', 'instance topology changed', next, { metadataChanged });
    if (instanceStateChanged) return freezePlan('refit', 'instance transforms or bounds changed', next, { metadataChanged });
    if (metadataChanged) return freezePlan('metadata', 'materials, lights, or camera changed', next, { metadataChanged:true });
    return freezePlan('reuse', 'render scene unchanged', next);
  }

  commit(scene) {
    this.#previous = fingerprintScene(scene);
    return this.snapshot();
  }

  reset() { this.#previous = null; }
  snapshot() { return this.#previous ? Object.freeze({ ...this.#previous }) : null; }
}

export function fingerprintLitePixScene(scene) { return Object.freeze(fingerprintScene(scene)); }

function fingerprintScene(scene = {}) {
  return {
    meshes: hashValue((scene.meshes ?? []).map(mesh => ({ id:mesh.id, dynamic:!!mesh.dynamic, primitives:mesh.primitives }))),
    instanceTopology: hashValue((scene.instances ?? []).map(instance => ({ id:instance.id, meshId:instance.meshId }))),
    instanceState: hashValue((scene.instances ?? []).map(instance => ({ id:instance.id, transform:instance.transform, bounds:instance.bounds }))),
    materials: hashValue(scene.materials ?? []),
    lights: hashValue(scene.lights ?? []),
    camera: hashValue(scene.activeCamera ?? null)
  };
}

function hashValue(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function freezePlan(mode, reason, fingerprints, extra = {}) {
  return Object.freeze({ mode, reason, ...extra, fingerprints:Object.freeze({ ...fingerprints }) });
}
