export function createAssignMaterialCommand(entityHandle, materialHandle = null) {
  let before = undefined;
  return {
    name: 'Assign Material',
    do(core) {
      const entity = core.entities.get(entityHandle);
      if (!entity) throw new Error('Material command references stale entity');
      if (before === undefined) before = entity.material ? { ...entity.material } : null;
      return core.assignMaterialDirect(entityHandle, materialHandle);
    },
    undo(core) {
      if (before === undefined) return false;
      return core.assignMaterialDirect(entityHandle, before);
    }
  };
}

export function createUpdateMaterialCommand(materialHandle, patch = {}) {
  let before = null;
  return {
    name: 'Update Material',
    do(core) {
      const current = core.materials.get(materialHandle);
      if (!current) throw new Error('Material command references stale material');
      if (!before) before = structuredClone(current);
      return core.updateMaterialDirect(materialHandle, draft => Object.assign(draft, structuredClone(patch)));
    },
    undo(core) {
      if (!before) return false;
      return core.replaceMaterialDirect(materialHandle, before);
    }
  };
}
