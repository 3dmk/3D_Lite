import { ResourceStore } from './resource-store.mjs';

const ASSET_TYPES = new Set(['texture','image','environment','binary']);

export class AssetStore {
  #resources = new ResourceStore();

  create(input = {}) {
    return this.#resources.create(normalizeAsset(input));
  }

  has(handle) { return this.#resources.has(handle); }
  get(handle) { return this.#resources.get(handle); }
  entries() { return this.#resources.entries(); }

  update(handle, updater) {
    const current = this.get(handle);
    if (!current) return false;
    if (typeof updater !== 'function') throw new TypeError('Asset updater must be a function');
    const draft = structuredClone(current);
    updater(draft);
    return this.#resources.update(handle, normalizeAsset(draft));
  }

  destroy(handle) { return this.#resources.destroy(handle); }
}

export function normalizeAsset(input = {}) {
  const type = ASSET_TYPES.has(input.type) ? input.type : 'texture';
  const id = String(input.id ?? makeId('asset'));
  const name = String(input.name ?? id);
  const uri = input.uri == null ? null : String(input.uri);
  const colorSpace = normalizeColorSpace(input.colorSpace);
  const wrap = normalizeWrap(input.wrap);
  return deepFreeze({
    schema: 1,
    id,
    name,
    type,
    uri,
    colorSpace,
    wrap,
    metadata: input.metadata && typeof input.metadata === 'object' ? structuredClone(input.metadata) : {}
  });
}

function normalizeColorSpace(value) {
  const colorSpace = String(value ?? 'srgb').toLowerCase();
  return ['srgb','linear','raw'].includes(colorSpace) ? colorSpace : 'srgb';
}

function normalizeWrap(value = {}) {
  const allowed = new Set(['repeat','clamp','mirror']);
  const u = allowed.has(value.u) ? value.u : 'repeat';
  const v = allowed.has(value.v) ? value.v : 'repeat';
  return { u, v };
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
