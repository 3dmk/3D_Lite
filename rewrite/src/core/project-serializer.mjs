import { PROJECT_FORMAT, PROJECT_VERSION, createDefaultProjectMigrations } from './project-migrations.mjs';

export function serializeProject(core, { metadata = {} } = {}) {
  const assets = core.assets.entries();
  const materials = core.materials.entries();
  const geometries = core.geometry.entries();
  const entities = core.entities.entries();

  const assetRefs = refMap(assets, 'asset');
  const materialRefs = refMap(materials, 'material');
  const geometryRefs = refMap(geometries, 'geometry');
  const entityRefs = refMap(entities, 'entity');

  const hierarchy = core.scene.snapshot().map(node => ({
    entityRef: entityRefs.get(keyOf(node.handle)),
    parentRef: node.parent ? entityRefs.get(keyOf(node.parent)) : null
  }));

  return deepFreeze({
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    metadata: structuredClone(metadata),
    assets: assets.map(entry => ({ ref: assetRefs.get(keyOf(entry.handle)), value: structuredClone(entry.value) })),
    materials: materials.map(entry => ({
      ref: materialRefs.get(keyOf(entry.handle)),
      value: serializeMaterial(entry.value, assetRefs)
    })),
    geometries: geometries.map(entry => ({
      ref: geometryRefs.get(keyOf(entry.handle)),
      value: serializeGeometry(entry.value)
    })),
    entities: entities.map(entry => ({
      ref: entityRefs.get(keyOf(entry.handle)),
      value: serializeEntity(entry.value, geometryRefs, materialRefs)
    })),
    hierarchy,
    state: {
      sceneName: core.state.sceneName,
      activeCameraRef: core.state.activeCamera ? entityRefs.get(keyOf(core.state.activeCamera)) : null,
      selectionRefs: core.state.selection.map(handle => entityRefs.get(keyOf(handle))).filter(Boolean),
      editSelection: serializeEditSelection(core.state.editSelection, geometryRefs)
    }
  });
}

export function serializeProjectJSON(core, options = {}) {
  return JSON.stringify(serializeProject(core, options), null, 2);
}

export function deserializeProject(document, createCore, { migrations = createDefaultProjectMigrations() } = {}) {
  if (typeof createCore !== 'function') throw new TypeError('deserializeProject requires a Main Core factory');
  const migrated = migrations.migrate(typeof document === 'string' ? JSON.parse(document) : document);
  validateDocument(migrated);

  const core = createCore();
  const assetHandles = new Map();
  const materialHandles = new Map();
  const geometryHandles = new Map();
  const entityHandles = new Map();

  for (const record of migrated.assets) assetHandles.set(record.ref, core.createAsset(record.value));
  for (const record of migrated.materials) materialHandles.set(record.ref, core.createMaterial(deserializeMaterial(record.value, assetHandles)));
  for (const record of migrated.geometries) geometryHandles.set(record.ref, core.createGeometry(record.value));
  for (const record of migrated.entities) {
    const entity = deserializeEntity(record.value, geometryHandles, materialHandles);
    entityHandles.set(record.ref, core.createEntity(entity));
  }

  for (const link of migrated.hierarchy) {
    if (!link.parentRef) continue;
    const child = requireRef(entityHandles, link.entityRef, 'entity');
    const parent = requireRef(entityHandles, link.parentRef, 'parent entity');
    core.reparentEntity(child, parent);
  }

  core.transact('loadProjectState', draft => {
    draft.sceneName = String(migrated.state?.sceneName ?? 'Untitled');
  }, ['scene','renderScene','viewport']);

  const activeCamera = migrated.state?.activeCameraRef
    ? requireRef(entityHandles, migrated.state.activeCameraRef, 'active camera')
    : null;
  core.setActiveCamera(activeCamera);

  const selection = (migrated.state?.selectionRefs ?? []).map(ref => requireRef(entityHandles, ref, 'selection entity'));
  core.setSelection(selection);
  restoreEditSelection(core, migrated.state?.editSelection, geometryHandles);

  return Object.freeze({ core, document: migrated });
}

function serializeGeometry(mesh) {
  return {
    schema: mesh.schema,
    id: mesh.id,
    name: mesh.name,
    positions: structuredClone(mesh.positions),
    faces: structuredClone(mesh.faces)
  };
}

function serializeMaterial(material, assetRefs) {
  const value = structuredClone(material);
  const textures = {};
  for (const [slot, handle] of Object.entries(material.textures ?? {})) {
    textures[slot] = handle ? assetRefs.get(keyOf(handle)) ?? null : null;
  }
  value.textures = textures;
  return value;
}

function deserializeMaterial(material, assetHandles) {
  const value = structuredClone(material);
  const textures = {};
  for (const [slot, ref] of Object.entries(material.textures ?? {})) {
    textures[slot] = ref ? requireRef(assetHandles, ref, 'asset') : null;
  }
  value.textures = textures;
  return value;
}

function serializeEntity(entity, geometryRefs, materialRefs) {
  const value = structuredClone(entity);
  value.geometryRef = entity.geometry ? geometryRefs.get(keyOf(entity.geometry)) ?? null : null;
  value.materialRef = entity.material ? materialRefs.get(keyOf(entity.material)) ?? null : null;
  delete value.geometry;
  delete value.material;
  return value;
}

function deserializeEntity(entity, geometryHandles, materialHandles) {
  const value = structuredClone(entity);
  value.geometry = value.geometryRef ? requireRef(geometryHandles, value.geometryRef, 'geometry') : null;
  value.material = value.materialRef ? requireRef(materialHandles, value.materialRef, 'material') : null;
  delete value.geometryRef;
  delete value.materialRef;
  return value;
}

function serializeEditSelection(selection, geometryRefs) {
  return {
    mode: selection?.mode ?? 'object',
    geometryRef: selection?.geometry ? geometryRefs.get(keyOf(selection.geometry)) ?? null : null,
    elements: structuredClone(selection?.elements ?? [])
  };
}

function restoreEditSelection(core, selection, geometryHandles) {
  const mode = selection?.mode ?? 'object';
  if (mode === 'object') {
    core.setEditMode('object');
    return;
  }
  const geometry = requireRef(geometryHandles, selection?.geometryRef, 'edit geometry');
  core.setEditMode(mode, geometry);
  core.setComponentSelection(selection?.elements ?? []);
}

function validateDocument(document) {
  if (document.format !== PROJECT_FORMAT || document.version !== PROJECT_VERSION) throw new Error('Project migration did not produce current format');
  for (const key of ['assets','materials','geometries','entities','hierarchy']) if (!Array.isArray(document[key])) throw new Error(`Project field ${key} must be an array`);
  ensureUniqueRefs(document.assets, 'asset');
  ensureUniqueRefs(document.materials, 'material');
  ensureUniqueRefs(document.geometries, 'geometry');
  ensureUniqueRefs(document.entities, 'entity');
}

function ensureUniqueRefs(records, label) {
  const seen = new Set();
  for (const record of records) {
    if (!record || typeof record.ref !== 'string' || !record.ref) throw new Error(`Invalid ${label} reference`);
    if (seen.has(record.ref)) throw new Error(`Duplicate ${label} reference: ${record.ref}`);
    seen.add(record.ref);
  }
}

function refMap(entries, prefix) {
  const map = new Map();
  entries.forEach((entry, index) => map.set(keyOf(entry.handle), `${prefix}:${index}`));
  return map;
}

function requireRef(map, ref, label) {
  const value = map.get(ref);
  if (!value) throw new Error(`Project references missing ${label}: ${ref}`);
  return value;
}

function keyOf(handle) { return `${handle.index}:${handle.generation}`; }
function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; for (const child of Object.values(value)) deepFreeze(child); return Object.freeze(value); }
