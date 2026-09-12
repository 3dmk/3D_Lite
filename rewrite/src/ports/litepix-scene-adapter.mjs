export class LitePixSceneAdapter {
  constructor(renderScenePort) { this.renderScenePort = renderScenePort; }

  compile() {
    const source = this.renderScenePort.compile();
    const meshes = [];
    const instances = [];
    const materials = [];
    const lights = [];
    const materialIds = new Map();

    source.objects.forEach((object, index) => {
      if (object.visible === false) return;
      if (object.type === 'light') {
        lights.push(Object.freeze({
          id: object.id,
          transform: object.transform,
          data: object.components ?? null
        }));
        return;
      }
      if (object.type !== 'mesh' || !object.geometry) return;

      const meshId = `mesh:${object.id}`;
      const primitives = trianglesToPrimitives(object.geometry);
      const bounds = transformedBounds(object.geometry.positions ?? [], object.transform);
      meshes.push(Object.freeze({
        id: meshId,
        dynamic: object.evaluationRevision > 1 || (object.modifierStack?.length ?? 0) > 0,
        primitives: Object.freeze(primitives)
      }));

      let materialId = null;
      if (object.material) {
        const signature = JSON.stringify(object.material);
        materialId = materialIds.get(signature) ?? `material:${materials.length}`;
        if (!materialIds.has(signature)) {
          materialIds.set(signature, materialId);
          materials.push(Object.freeze({ id: materialId, ...structuredClone(object.material) }));
        }
      }

      instances.push(Object.freeze({
        id: `instance:${object.id}`,
        meshId,
        materialId,
        transform: structuredClone(object.transform),
        bounds
      }));
    });

    return Object.freeze({
      schema: 1,
      sourceSchema: source.schema,
      stamp: source.stamp,
      activeCamera: source.activeCamera,
      meshes: Object.freeze(meshes),
      instances: Object.freeze(instances),
      materials: Object.freeze(materials),
      lights: Object.freeze(lights)
    });
  }
}

function trianglesToPrimitives(geometry) {
  const positions = geometry.positions ?? [];
  const triangles = geometry.triangles ?? [];
  const out = [];
  for (let i = 0; i + 2 < triangles.length; i += 3) {
    const a = positions[triangles[i]], b = positions[triangles[i + 1]], c = positions[triangles[i + 2]];
    if (!a || !b || !c) throw new Error('LitePix adapter received invalid triangle indices');
    const tri = [a.slice(), b.slice(), c.slice()];
    out.push(Object.freeze({ positions: Object.freeze(tri), bounds: boundsOf(tri) }));
  }
  return out;
}

function transformedBounds(positions, transform = {}) {
  if (!positions.length) return Object.freeze({ min:[0,0,0], max:[0,0,0] });
  const points = positions.map(position => transformPoint(position, transform));
  return boundsOf(points);
}

function transformPoint(position, transform = {}) {
  const p = transform.position ?? [0,0,0];
  const r = transform.rotation ?? [0,0,0];
  const s = transform.scale ?? [1,1,1];
  let x = position[0] * s[0], y = position[1] * s[1], z = position[2] * s[2];
  const cx=Math.cos(r[0]), sx=Math.sin(r[0]); [y,z]=[y*cx-z*sx,y*sx+z*cx];
  const cy=Math.cos(r[1]), sy=Math.sin(r[1]); [x,z]=[x*cy+z*sy,-x*sy+z*cy];
  const cz=Math.cos(r[2]), sz=Math.sin(r[2]); [x,y]=[x*cz-y*sz,x*sz+y*cz];
  return [x+p[0], y+p[1], z+p[2]];
}

function boundsOf(points) {
  const min=[Infinity,Infinity,Infinity], max=[-Infinity,-Infinity,-Infinity];
  for (const p of points) for (let i=0;i<3;i++) { if (p[i] < min[i]) min[i]=p[i]; if (p[i] > max[i]) max[i]=p[i]; }
  return Object.freeze({ min:Object.freeze(min), max:Object.freeze(max) });
}
