export function normalizeModifier(input = {}, fallbackId = 0) {
  const type = String(input.type ?? '').trim();
  if (!type) throw new Error('Modifier type is required');
  const id = String(input.id ?? `modifier-${fallbackId}`);
  if (!id) throw new Error('Modifier id is required');
  const params = input.params && typeof input.params === 'object' && !Array.isArray(input.params)
    ? structuredClone(input.params)
    : {};
  return Object.freeze({
    id,
    type,
    enabled: input.enabled !== false,
    params: deepFreeze(params)
  });
}

export function normalizeModifierStack(stack = []) {
  if (!Array.isArray(stack)) throw new TypeError('Modifier stack must be an array');
  const ids = new Set();
  return Object.freeze(stack.map((modifier, index) => {
    const normalized = normalizeModifier(modifier, index);
    if (ids.has(normalized.id)) throw new Error(`Duplicate modifier id: ${normalized.id}`);
    ids.add(normalized.id);
    return normalized;
  }));
}

export function validateModifierStack(stack) {
  if (!Array.isArray(stack)) return false;
  const ids = new Set();
  for (const modifier of stack) {
    if (!modifier || typeof modifier !== 'object') return false;
    if (typeof modifier.id !== 'string' || modifier.id.length === 0 || ids.has(modifier.id)) return false;
    if (typeof modifier.type !== 'string' || modifier.type.length === 0) return false;
    if (typeof modifier.enabled !== 'boolean') return false;
    if (!modifier.params || typeof modifier.params !== 'object' || Array.isArray(modifier.params)) return false;
    ids.add(modifier.id);
  }
  return true;
}

export function modifierStackSignature(stack = []) {
  return JSON.stringify(stack.map(modifier => ({
    id: modifier.id,
    type: modifier.type,
    enabled: modifier.enabled,
    params: modifier.params
  })));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
