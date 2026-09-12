import { serializeProject, deserializeProject } from './project-serializer.mjs';

export class RecoveryManager {
  #createCore;
  #checkpoint = null;
  #safeMode = false;
  #events = [];

  constructor(createCore) {
    if (typeof createCore !== 'function') throw new TypeError('RecoveryManager requires a Main Core factory');
    this.#createCore = createCore;
  }

  checkpoint(core, { reason = 'manual', metadata = {} } = {}) {
    const document = serializeProject(core, { metadata: { ...metadata, recoveryReason: reason, checkpointedAt: Date.now() } });
    this.#checkpoint = structuredClone(document);
    this.#events.push(Object.freeze({ type:'checkpoint', reason, at:Date.now() }));
    return deepFreeze(structuredClone(document));
  }

  hasCheckpoint() { return !!this.#checkpoint; }
  get safeMode() { return this.#safeMode; }

  enterSafeMode(reason = 'runtime failure') {
    this.#safeMode = true;
    this.#events.push(Object.freeze({ type:'safe-mode-enter', reason:String(reason), at:Date.now() }));
    return true;
  }

  exitSafeMode() {
    this.#safeMode = false;
    this.#events.push(Object.freeze({ type:'safe-mode-exit', at:Date.now() }));
    return true;
  }

  restore() {
    if (!this.#checkpoint) throw new Error('No recovery checkpoint is available');
    const result = deserializeProject(structuredClone(this.#checkpoint), this.#createCore);
    this.#events.push(Object.freeze({ type:'restore', at:Date.now() }));
    return result;
  }

  clear() {
    this.#checkpoint = null;
    this.#events.push(Object.freeze({ type:'clear', at:Date.now() }));
  }

  snapshot() {
    return deepFreeze({ schema:1, hasCheckpoint:!!this.#checkpoint, safeMode:this.#safeMode, events:this.#events.slice(-32) });
  }
}

function deepFreeze(value) { if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; for (const child of Object.values(value)) deepFreeze(child); return Object.freeze(value); }
