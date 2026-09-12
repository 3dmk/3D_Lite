export function createSetVertexPositionsCommand(geometryHandle, changes) {
  const normalized = normalizeChanges(changes);
  let before = null;
  let after = null;

  return {
    name: 'Set Vertex Positions',
    do(core) {
      const mesh = core.geometry.get(geometryHandle);
      if (!mesh) throw new Error('Geometry command references stale geometry');
      if (!before) {
        before = normalized.map(change => ({ index: change.index, position: mesh.positions[change.index]?.slice() }));
        if (before.some(change => !change.position)) throw new RangeError('Vertex index out of range');
        after = normalized.map(change => ({ index: change.index, position: change.position.slice() }));
      }
      apply(core, geometryHandle, after);
      return true;
    },
    undo(core) {
      if (!before) return false;
      apply(core, geometryHandle, before);
      return true;
    }
  };
}

export function createMoveVerticesCommand(geometryHandle, indices, delta) {
  const unique = [...new Set(indices.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
  const d = normalizeVec3(delta);
  let inner = null;

  return {
    name: 'Move Vertices',
    do(core) {
      if (!inner) {
        const mesh = core.geometry.get(geometryHandle);
        if (!mesh) throw new Error('Geometry command references stale geometry');
        const changes = unique.map(index => {
          const source = mesh.positions[index];
          if (!source) throw new RangeError('Vertex index out of range');
          return { index, position: [source[0] + d[0], source[1] + d[1], source[2] + d[2]] };
        });
        inner = createSetVertexPositionsCommand(geometryHandle, changes);
      }
      return inner.do(core);
    },
    undo(core) {
      return inner?.undo(core) ?? false;
    }
  };
}

function apply(core, geometryHandle, changes) {
  const updated = core.updateGeometry(geometryHandle, mesh => {
    for (const change of changes) mesh.positions[change.index] = change.position.slice();
  });
  if (!updated) throw new Error('Geometry command references stale geometry');
}

function normalizeChanges(changes) {
  if (!Array.isArray(changes) || changes.length === 0) throw new Error('Vertex command requires changes');
  const map = new Map();
  for (const change of changes) {
    const index = Number(change?.index);
    if (!Number.isInteger(index) || index < 0) throw new RangeError('Invalid vertex index');
    map.set(index, { index, position: normalizeVec3(change.position) });
  }
  return [...map.values()].sort((a, b) => a.index - b.index);
}

function normalizeVec3(value) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError('Expected vec3');
  const result = value.map(Number);
  if (!result.every(Number.isFinite)) throw new TypeError('vec3 must contain finite numbers');
  return result;
}
