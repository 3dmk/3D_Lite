import { ResourceStore } from './resource-store.mjs';

const TEXTURE_SLOTS = ['baseColor','metallicRoughness','normal','emissive','opacity'];

export class MaterialStore {
  #resources = new ResourceStore();
  #assets;

  constructor(assetStore) { this.#assets = assetStore; }

  create(input = {}) {
    return this.#resources.create(normalizeMaterial(input, this.#assets));
  }

  has(handle) { return this.#resources.has(handle); }
  get(handle) { return this.#resources.get(handle); }
  entries() { return this.#resources.entries(); }

  update(handle, updater) {
    const current = this.get(handle);
    if (!current) return false;
    if (typeof updater !== 'function') throw new TypeError('Material updater must be a function');
    const draft = structuredClone(current);
    updater(draft);
    return this.#resources.update(handle, normalizeMaterial(draft, this.#assets));
  }

  destroy(handle) { return this.#resources.destroy(handle); }

  compile(handle) {
    const material = this.get(handle);
    if (!material) return null;
    return material;
  }
}

export function normalizeMaterial(input = {}, assets) {
  const id = String(input.id ?? makeId('material'));
  const name = String(input.name ?? id);
  const textures = {};
  const sourceTextures = input.textures && typeof input.textures === 'object' ? input.textures : {};
  for (const slot of TEXTURE_SLOTS) {
    const handle = sourceTextures[slot] ?? null;
    if (handle && !assets?.has(handle)) throw new Error(`Material ${slot} texture references stale asset`);
    textures[slot] = handle ? { ...handle } : null;
  }

  return deepFreeze({
    schema: 1,
    id,
    name,
    model: 'pbr-metallic-roughness',
    baseColor: normalizeColor(input.baseColor, [0.5,0.5,0.5,1]),
    metallic: clamp01(input.metallic ?? 0),
    roughness: clamp01(input.roughness ?? 0.5),
    emissive: normalizeColor(input.emissive, [0,0,0,1]),
    opacity: clamp01(input.opacity ?? 1),
    doubleSided: input.doubleSided === true,
    textures
  });
}

function normalizeColor(value, fallback) {
  if (!Array.isArray(value)) return fallback.slice();
  const out = fallback.slice();
  for (let i=0;i<Math.min(4,value.length);i++) {
    const n = Number(value[i]);
    out[i] = Number.isFinite(n) ? clamp01(n) : out[i];
  }
  return out;
}

function clamp01(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
