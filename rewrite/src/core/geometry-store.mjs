import { ResourceStore } from './resource-store.mjs';
import { createEditableMesh } from './editable-mesh.mjs';

export class GeometryStore {
  #resources = new ResourceStore();

  create(input = {}) {
    return this.#resources.create(createEditableMesh(input));
  }

  has(handle) {
    return this.#resources.has(handle);
  }

  get(handle) {
    return this.#resources.get(handle);
  }

  update(handle, updater) {
    const current = this.get(handle);
    if (!current) return false;
    if (typeof updater !== 'function') throw new TypeError('updater must be a function');
    const draft = structuredClone(current);
    updater(draft);
    const rebuilt = createEditableMesh(draft);
    return this.#resources.update(handle, rebuilt);
  }

  destroy(handle) {
    return this.#resources.destroy(handle);
  }

  compile(handle) {
    const mesh = this.get(handle);
    if (!mesh) return null;
    return Object.freeze({
      schema: mesh.schema,
      id: mesh.id,
      name: mesh.name,
      positions: mesh.positions,
      triangles: mesh.triangles,
      topology: Object.freeze({
        vertexCount: mesh.positions.length,
        edgeCount: mesh.topology.edges.length,
        faceCount: mesh.faces.length,
        halfEdgeCount: mesh.topology.halfEdges.length,
        boundaryHalfEdges: mesh.topology.boundaryHalfEdges
      })
    });
  }
}
