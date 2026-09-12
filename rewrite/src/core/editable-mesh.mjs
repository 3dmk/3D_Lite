const DEFAULT_NAME = 'Mesh';

export function createEditableMesh(input = {}) {
  const positions = normalizePositions(input.positions ?? []);
  const faces = normalizeFaces(input.faces ?? [], positions.length);
  const topology = buildHalfEdgeTopology(faces);
  const mesh = {
    schema: 1,
    id: String(input.id ?? meshId()),
    name: String(input.name ?? DEFAULT_NAME),
    positions,
    faces,
    topology,
    triangles: triangulateFaces(faces)
  };
  if (!validateEditableMesh(mesh)) throw new Error('Invalid editable mesh');
  return deepFreeze(mesh);
}

export function rebuildEditableMesh(meshLike) {
  return createEditableMesh(meshLike);
}

export function validateEditableMesh(mesh) {
  if (!mesh || mesh.schema !== 1) return false;
  if (!Array.isArray(mesh.positions) || !Array.isArray(mesh.faces)) return false;
  if (!mesh.positions.every(validPosition)) return false;
  if (!mesh.faces.every(face => validFace(face, mesh.positions.length))) return false;
  if (!mesh.topology || !Array.isArray(mesh.topology.halfEdges) || !Array.isArray(mesh.topology.edges)) return false;
  if (!Array.isArray(mesh.triangles) || mesh.triangles.length % 3 !== 0) return false;
  return true;
}

export function setVertexPosition(mesh, vertexIndex, position) {
  if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= mesh.positions.length) {
    throw new RangeError('Vertex index out of range');
  }
  const positions = mesh.positions.map(p => p.slice());
  positions[vertexIndex] = normalizePosition(position);
  return createEditableMesh({ id: mesh.id, name: mesh.name, positions, faces: mesh.faces });
}

function normalizePositions(input) {
  if (!Array.isArray(input)) throw new TypeError('positions must be an array');
  return input.map(normalizePosition);
}

function normalizePosition(position) {
  if (!validPosition(position)) throw new TypeError('Each position must contain 3 finite numbers');
  return position.map(Number);
}

function normalizeFaces(input, vertexCount) {
  if (!Array.isArray(input)) throw new TypeError('faces must be an array');
  return input.map(face => {
    if (!validFace(face, vertexCount)) throw new Error('Face contains invalid vertex indices');
    return face.map(Number);
  });
}

function validPosition(position) {
  return Array.isArray(position) && position.length === 3 && position.every(value => Number.isFinite(Number(value)));
}

function validFace(face, vertexCount) {
  if (!Array.isArray(face) || face.length < 3) return false;
  if (!face.every(index => Number.isInteger(Number(index)) && Number(index) >= 0 && Number(index) < vertexCount)) return false;
  return new Set(face.map(Number)).size === face.length;
}

function buildHalfEdgeTopology(faces) {
  const halfEdges = [];
  const directed = new Map();
  const undirected = new Map();

  faces.forEach((face, faceIndex) => {
    const start = halfEdges.length;
    for (let i = 0; i < face.length; i += 1) {
      const origin = face[i];
      const to = face[(i + 1) % face.length];
      const key = `${origin}:${to}`;
      if (directed.has(key)) throw new Error('Duplicate directed edge; mesh is non-manifold or has inconsistent winding');
      const index = halfEdges.length;
      halfEdges.push({
        origin,
        to,
        face: faceIndex,
        next: start + ((i + 1) % face.length),
        prev: start + ((i - 1 + face.length) % face.length),
        twin: -1,
        edge: -1
      });
      directed.set(key, index);
      const undirectedKey = origin < to ? `${origin}:${to}` : `${to}:${origin}`;
      const list = undirected.get(undirectedKey) ?? [];
      list.push(index);
      if (list.length > 2) throw new Error('Non-manifold edge has more than two incident faces');
      undirected.set(undirectedKey, list);
    }
  });

  const edges = [];
  for (const indices of undirected.values()) {
    const edgeIndex = edges.length;
    const first = indices[0];
    const second = indices[1] ?? -1;
    halfEdges[first].edge = edgeIndex;
    if (second >= 0) {
      const a = halfEdges[first];
      const b = halfEdges[second];
      if (a.origin !== b.to || a.to !== b.origin) throw new Error('Adjacent faces must use opposite edge winding');
      a.twin = second;
      b.twin = first;
      b.edge = edgeIndex;
    }
    edges.push({ halfEdge: first, twinHalfEdge: second });
  }

  return {
    halfEdges,
    edges,
    boundaryHalfEdges: halfEdges.reduce((count, edge) => count + (edge.twin < 0 ? 1 : 0), 0)
  };
}

function triangulateFaces(faces) {
  const triangles = [];
  for (const face of faces) {
    for (let i = 1; i < face.length - 1; i += 1) triangles.push(face[0], face[i], face[i + 1]);
  }
  return triangles;
}

function meshId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `mesh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
