import { normalizeModifierStack, validateModifierStack } from './modifier-stack.mjs';

const TYPES = new Set(['object','group','mesh','camera','light','helper']);

export function createSceneEntity(input = {}) {
  const type = TYPES.has(input.type) ? input.type : 'object';
  const id = String(input.id ?? cryptoId());
  const name = String(input.name ?? id);
  return {
    id,
    name,
    type,
    visible: input.visible !== false,
    transform: normalizeTransform(input.transform),
    geometry: input.geometry ?? null,
    modifiers: type === 'mesh' ? normalizeModifierStack(input.modifiers ?? []) : Object.freeze([]),
    material: input.material ?? null,
    components: input.components && typeof input.components === 'object'
      ? structuredClone(input.components)
      : {}
  };
}

export function validateSceneEntity(entity) {
  if (!entity || typeof entity !== 'object') return false;
  if (typeof entity.id !== 'string' || entity.id.length === 0) return false;
  if (typeof entity.name !== 'string') return false;
  if (!TYPES.has(entity.type)) return false;
  if (typeof entity.visible !== 'boolean') return false;
  if (!validVec3(entity.transform?.position)) return false;
  if (!validVec3(entity.transform?.rotation)) return false;
  if (!validVec3(entity.transform?.scale)) return false;
  if (!validateModifierStack(entity.modifiers ?? [])) return false;
  if (entity.type !== 'mesh' && (entity.modifiers?.length ?? 0) !== 0) return false;
  return entity.transform.scale.every(Number.isFinite);
}

export function normalizeTransform(transform = {}) {
  return {
    position: vec3(transform.position, [0, 0, 0]),
    rotation: vec3(transform.rotation, [0, 0, 0]),
    scale: vec3(transform.scale, [1, 1, 1])
  };
}

function vec3(value, fallback) {
  if (!Array.isArray(value) || value.length !== 3) return fallback.slice();
  return value.map((component, index) => Number.isFinite(Number(component)) ? Number(component) : fallback[index]);
}

function validVec3(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function cryptoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `entity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
