import { normalizeModifier, normalizeModifierStack } from './modifier-stack.mjs';

export function createAddModifierCommand(entityHandle, modifier, index = null) {
  let before = null;
  let after = null;
  return {
    name: 'Add Modifier',
    do(core) {
      if (!before) {
        before = snapshot(core, entityHandle);
        const next = before.slice();
        const normalized = normalizeModifier(modifier, next.length);
        const target = index == null ? next.length : clampIndex(index, next.length + 1);
        next.splice(target, 0, normalized);
        after = normalizeModifierStack(next);
      }
      return apply(core, entityHandle, after);
    },
    undo(core) { return apply(core, entityHandle, before); }
  };
}

export function createRemoveModifierCommand(entityHandle, modifierId) {
  let before = null;
  let after = null;
  return {
    name: 'Remove Modifier',
    do(core) {
      if (!before) {
        before = snapshot(core, entityHandle);
        const index = before.findIndex(modifier => modifier.id === String(modifierId));
        if (index < 0) throw new Error('Modifier not found');
        after = normalizeModifierStack(before.filter((_, i) => i !== index));
      }
      return apply(core, entityHandle, after);
    },
    undo(core) { return apply(core, entityHandle, before); }
  };
}

export function createUpdateModifierCommand(entityHandle, modifierId, patch = {}) {
  let before = null;
  let after = null;
  return {
    name: 'Update Modifier',
    do(core) {
      if (!before) {
        before = snapshot(core, entityHandle);
        const index = before.findIndex(modifier => modifier.id === String(modifierId));
        if (index < 0) throw new Error('Modifier not found');
        const current = before[index];
        const merged = {
          ...current,
          ...structuredClone(patch),
          id: current.id,
          params: patch.params === undefined ? current.params : patch.params
        };
        const next = before.slice();
        next[index] = normalizeModifier(merged, index);
        after = normalizeModifierStack(next);
      }
      return apply(core, entityHandle, after);
    },
    undo(core) { return apply(core, entityHandle, before); }
  };
}

export function createMoveModifierCommand(entityHandle, modifierId, toIndex) {
  let before = null;
  let after = null;
  return {
    name: 'Move Modifier',
    do(core) {
      if (!before) {
        before = snapshot(core, entityHandle);
        const from = before.findIndex(modifier => modifier.id === String(modifierId));
        if (from < 0) throw new Error('Modifier not found');
        const next = before.slice();
        const [modifier] = next.splice(from, 1);
        next.splice(clampIndex(toIndex, next.length + 1), 0, modifier);
        after = normalizeModifierStack(next);
      }
      return apply(core, entityHandle, after);
    },
    undo(core) { return apply(core, entityHandle, before); }
  };
}

function snapshot(core, entityHandle) {
  const entity = core.entities.get(entityHandle);
  if (!entity) throw new Error('Modifier command references stale entity');
  if (entity.type !== 'mesh') throw new Error('Modifiers require a mesh entity');
  return structuredClone(entity.modifiers ?? []);
}

function apply(core, entityHandle, stack) {
  if (!core.replaceModifierStack(entityHandle, stack)) throw new Error('Modifier command references stale entity');
  return true;
}

function clampIndex(value, length) {
  const index = Number(value);
  if (!Number.isInteger(index)) throw new TypeError('Modifier index must be an integer');
  return Math.max(0, Math.min(index, Math.max(0, length - 1)));
}
