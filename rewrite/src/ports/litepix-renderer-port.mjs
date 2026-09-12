import { LitePixSceneAdapter } from './litepix-scene-adapter.mjs';
import { LitePixIncrementalPlanner } from './litepix-incremental-plan.mjs';

export class LitePixRendererPort {
  #adapter;
  #runtime;
  #planner = new LitePixIncrementalPlanner();
  #lastStamp = null;
  #lastCompiled = null;
  #lastPlan = null;

  constructor(renderScenePort, runtime) {
    if (!runtime || typeof runtime.compileScene !== 'function') throw new TypeError('LitePixRendererPort requires a renderer runtime');
    this.#adapter = new LitePixSceneAdapter(renderScenePort);
    this.#runtime = runtime;
  }

  compile() {
    const scene = this.#adapter.compile();
    if (this.#lastStamp && sameStamp(this.#lastStamp, scene.stamp)) return this.#lastCompiled;

    const plan = this.#planner.analyze(scene);
    if (plan.mode === 'reuse' && this.#lastCompiled) {
      this.#planner.commit(scene);
      this.#lastStamp = structuredClone(scene.stamp);
      this.#lastPlan = plan;
      return this.#lastCompiled;
    }

    const compiled = this.#runtime.compileScene(scene, plan);
    this.#planner.commit(scene);
    this.#lastStamp = structuredClone(scene.stamp);
    this.#lastCompiled = compiled;
    this.#lastPlan = plan;
    return compiled;
  }

  submit(job = {}) {
    const compiled = this.compile();
    if (typeof this.#runtime.submit !== 'function') return Object.freeze({ scene:compiled, job });
    return this.#runtime.submit(compiled, job);
  }

  dispose() {
    this.#planner.reset();
    this.#lastStamp = null;
    this.#lastCompiled = null;
    this.#lastPlan = null;
    this.#runtime.dispose?.();
  }

  snapshot() {
    return Object.freeze({
      provider: this.#runtime.name ?? 'LitePix renderer runtime',
      sceneCompiled: !!this.#lastCompiled,
      lastPlan: this.#lastPlan,
      runtime: typeof this.#runtime.snapshot === 'function' ? this.#runtime.snapshot() : null
    });
  }
}

export function createBrowserLitePixRuntime(root = globalThis) {
  const SceneCompiler = root.LitePixSceneCompiler ?? root.LitePixNative?.Core2?.SceneCompiler;
  if (typeof SceneCompiler !== 'function') throw new Error('LitePix SceneCompiler is unavailable');
  const compiler = new SceneCompiler();
  const telemetry = typeof root.LitePixCore8Production443 === 'function' ? new root.LitePixCore8Production443() : null;
  let compiledOnce = false;
  const stats = { rebuilds:0, tlasRebuilds:0, refits:0, metadataUpdates:0, reuses:0 };

  return Object.freeze({
    name: 'LitePix 4.45 L3N incremental renderer adapter',
    compileScene(scene, plan = { mode:'rebuild' }) {
      const mode = plan?.mode ?? 'rebuild';
      if (compiledOnce && mode === 'reuse') {
        stats.reuses++;
        return compiler;
      }

      if (compiledOnce && mode === 'metadata') {
        compiler.materials = [...(scene.materials ?? [])];
        compiler.lights = [...(scene.lights ?? [])];
        stats.metadataUpdates++;
        return compiler;
      }

      if (compiledOnce && mode === 'refit' && canRefitInstances(compiler, scene)) {
        compiler.instances = normalizeInstances(scene.instances);
        if (compiler.tlas) compiler.tlas.primitives = compiler.instances.map(instance => ({ bounds:instance.bounds, instance }));
        compiler.refitTLAS?.();
        if (plan.metadataChanged) {
          compiler.materials = [...(scene.materials ?? [])];
          compiler.lights = [...(scene.lights ?? [])];
          stats.metadataUpdates++;
        }
        stats.refits++;
        return compiler;
      }

      if (compiledOnce && mode === 'tlas-rebuild' && compiler.tlas?.build) {
        compiler.instances = normalizeInstances(scene.instances);
        compiler.tlas.build(compiler.instances.map(instance => ({ bounds:instance.bounds, instance })));
        if (plan.metadataChanged) {
          compiler.materials = [...(scene.materials ?? [])];
          compiler.lights = [...(scene.lights ?? [])];
          stats.metadataUpdates++;
        }
        stats.tlasRebuilds++;
        return compiler;
      }

      compiler.compile(scene);
      compiledOnce = true;
      stats.rebuilds++;
      return compiler;
    },
    submit(compiled, job = {}) {
      if (typeof job.render === 'function') return job.render(compiled);
      return Object.freeze({ compiler:compiled, job });
    },
    capture(job, extra = {}) { return telemetry?.capture(job, extra) ?? null; },
    dispose() {
      compiler.dispose?.();
      telemetry?.dispose?.();
    },
    snapshot() {
      return Object.freeze({
        compiler:compiler.snapshot?.() ?? null,
        telemetry:telemetry?.snapshot?.() ?? null,
        incremental:Object.freeze({ ...stats })
      });
    }
  });
}

function canRefitInstances(compiler, scene) {
  const current = compiler.instances ?? [];
  const next = scene.instances ?? [];
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (String(current[i]?.id) !== String(next[i]?.id)) return false;
    if (String(current[i]?.meshId) !== String(next[i]?.meshId)) return false;
  }
  return true;
}

function normalizeInstances(instances = []) {
  return instances.map(instance => ({
    ...instance,
    bounds:instance.bounds ?? { min:[-1,-1,-1], max:[1,1,1] }
  }));
}

function sameStamp(a,b) {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}
