import assert from 'node:assert/strict';
import { ThreeDLiteMainCore } from '../src/core/main-core.mjs';
import { createCoreDiagnostics, DiagnosticsRegistry } from '../src/core/diagnostics.mjs';
import { RecoveryManager } from '../src/core/recovery-manager.mjs';
import { RuntimeHealthMonitor, validateStartupEnvironment } from '../src/core/runtime-health.mjs';

const createCore = () => new ThreeDLiteMainCore({ validator:value => !!value && typeof value === 'object' });
const core = createCore();
const geometry = core.createGeometry({ id:'diag-geo', positions:[[0,0,0],[1,0,0],[0,1,0]], faces:[[0,1,2]] });
const material = core.createMaterial({ id:'diag-mat', baseColor:[0.5,0.5,0.5,1] });
const entity = core.createEntity({ id:'diag-mesh', type:'mesh', geometry, material });
core.setSelection([entity]);

const diagnostics = createCoreDiagnostics(core);
const healthy = await diagnostics.run({ core });
assert.equal(healthy.passed, true);
assert.equal(healthy.releaseBlockingFailures.length, 0);
assert.ok(healthy.results.length >= 6);

const recovery = new RecoveryManager(createCore);
const checkpoint = recovery.checkpoint(core, { reason:'smoke' });
assert.equal(checkpoint.format, '3dlite-project');
assert.equal(recovery.hasCheckpoint(), true);

core.updateEntity(entity, draft => { draft.transform.position[0] = 5; }, ['transform','renderScene','viewport']);
const restored = recovery.restore();
const restoredEntity = restored.core.entities.entries().find(entry => entry.value.id === 'diag-mesh');
assert.ok(restoredEntity);
assert.equal(restoredEntity.value.transform.position[0], 0);

const failing = new DiagnosticsRegistry();
failing.register('forced.blocker', () => ({ passed:false, message:'forced failure' }), { releaseBlocking:true });
const health = new RuntimeHealthMonitor(failing, recovery);
const degraded = await health.check();
assert.equal(degraded.report.passed, false);
assert.equal(degraded.health.status, 'degraded');
assert.equal(recovery.safeMode, true);
recovery.exitSafeMode();
assert.equal(recovery.safeMode, false);

const fakeDocument = {
  querySelector(selector) { return selector === '#viewport' ? {} : null; },
  querySelectorAll(selector) {
    if (selector === '[id]') return [{id:'viewport'},{id:'status'}];
    if (selector === 'script[src]') return [{ src:'app.mjs', textContent:'' }];
    return [];
  }
};
const startup = validateStartupEnvironment({ documentRef:fakeDocument, requiredSelectors:['#viewport'], dependencies:{ MainCore:ThreeDLiteMainCore } });
assert.equal(startup.passed, true);

const badDocument = {
  querySelector() { return null; },
  querySelectorAll(selector) {
    if (selector === '[id]') return [{id:'dup'},{id:'dup'}];
    if (selector === 'script[src]') return [{src:'bad.js',textContent:'inline'}];
    return [];
  }
};
const failedStartup = validateStartupEnvironment({ documentRef:badDocument, requiredSelectors:['#viewport'], dependencies:{ Missing:null } });
assert.equal(failedStartup.passed, false);
assert.ok(failedStartup.failures.some(item => item.includes('duplicate ids')));
assert.ok(failedStartup.failures.some(item => item.includes('external script has inline body')));
assert.ok(failedStartup.failures.some(item => item.includes('missing dependency')));

console.log(JSON.stringify({ passed:true, diagnostics:healthy.results.length, recovery:recovery.snapshot(), degraded:degraded.health, startup }, null, 2));
