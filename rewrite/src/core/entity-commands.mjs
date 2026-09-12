import { normalizeTransform } from './scene-entity.mjs';

export function createSetEntityTransformCommand(entityHandle, transform) {
  const target = normalizeTransform(transform);
  let before = null;

  return {
    name: 'Set Entity Transform',
    do(core) {
      const entity = core.entities.get(entityHandle);
      if (!entity) throw new Error('Transform command references stale entity');
      if (!before) before = structuredClone(entity.transform);
      return core.updateEntity(entityHandle, draft => {
        draft.transform = structuredClone(target);
      }, ['transform','renderScene','viewport']);
    },
    undo(core) {
      if (!before) return false;
      return core.updateEntity(entityHandle, draft => {
        draft.transform = structuredClone(before);
      }, ['transform','renderScene','viewport']);
    }
  };
}

export function createTranslateEntityCommand(entityHandle, delta) {
  const d = normalizeVec3(delta);
  let inner = null;
  return {
    name: 'Translate Entity',
    do(core) {
      if (!inner) {
        const entity = core.entities.get(entityHandle);
        if (!entity) throw new Error('Transform command references stale entity');
        const next = structuredClone(entity.transform);
        next.position = [
          next.position[0] + d[0],
          next.position[1] + d[1],
          next.position[2] + d[2]
        ];
        inner = createSetEntityTransformCommand(entityHandle, next);
      }
      return inner.do(core);
    },
    undo(core) { return inner?.undo(core) ?? false; }
  };
}

function normalizeVec3(value) {
  if (!Array.isArray(value) || value.length !== 3) throw new TypeError('Expected vec3');
  const result = value.map(Number);
  if (!result.every(Number.isFinite)) throw new TypeError('vec3 must contain finite numbers');
  return result;
}
