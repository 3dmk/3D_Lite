const MODES = new Set(['object','vertex','edge','polygon']);

export function createEditSelection(input = {}) {
  const mode = MODES.has(input.mode) ? input.mode : 'object';
  return deepFreeze({
    mode,
    geometry: mode === 'object' ? null : cloneHandle(input.geometry),
    elements: Object.freeze(normalizeIndices(input.elements ?? []))
  });
}

export function validateEditSelection(selection, geometryStore) {
  if (!selection || !MODES.has(selection.mode)) return false;
  if (selection.mode === 'object') {
    return selection.geometry === null && Array.isArray(selection.elements) && selection.elements.length === 0;
  }
  if (!selection.geometry || !geometryStore.has(selection.geometry)) return false;
  const mesh = geometryStore.get(selection.geometry);
  const limit = elementLimit(selection.mode, mesh);
  return Array.isArray(selection.elements)
    && selection.elements.every(index => Number.isInteger(index) && index >= 0 && index < limit)
    && new Set(selection.elements).size === selection.elements.length;
}

export function normalizeEditSelection(mode, geometry, elements, geometryStore) {
  if (!MODES.has(mode)) throw new Error(`Unsupported edit mode: ${mode}`);
  if (mode === 'object') return createEditSelection();
  if (!geometry || !geometryStore.has(geometry)) throw new Error('Edit mode requires live geometry');
  const mesh = geometryStore.get(geometry);
  const limit = elementLimit(mode, mesh);
  const normalized = normalizeIndices(elements ?? []);
  if (normalized.some(index => index >= limit)) throw new RangeError(`${mode} selection index out of range`);
  return createEditSelection({ mode, geometry, elements: normalized });
}

function elementLimit(mode, mesh) {
  if (mode === 'vertex') return mesh.positions.length;
  if (mode === 'edge') return mesh.topology.edges.length;
  if (mode === 'polygon') return mesh.faces.length;
  return 0;
}

function normalizeIndices(values) {
  return [...new Set(values.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
}

function cloneHandle(handle) {
  return handle ? Object.freeze({ index: handle.index, generation: handle.generation }) : null;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
