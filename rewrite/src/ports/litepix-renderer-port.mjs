import { LitePixSceneAdapter } from './litepix-scene-adapter.mjs';

export class LitePixRendererPort {
  #adapter;
  #runtime;
  #lastStamp = null;
  #lastCompiled = null;

  constructor(renderScenePort, runtime) {
    this.#adapter = new LitePixSceneAdapter(renderScenePort);
    this.#runtime = runtime;
  }

  compile() {
    const scene = this.#adapter.compile();
    if (this.#lastStamp && sameStamp(this.#lastStamp, scene.stamp)) return this.#lastCompiled;
    const compiled = this.#runtime.compileScene(scene);
    this.#lastStamp = structuredClone(scene.stamp);
    this.#lastCompiled = compiled;
    return compiled;
  }

  submit(job = {}) {
    const compiled = this.compile();
    if (typeof this.#runtime.submit !== 'function') return Object.freeze({ scene:compiled, job });
    return this.#runtime.submit(compiled, job);
  }

  snapshot() {
    return Object.freeze({
      provider: this.#runtime.name ?? 'LitePix runtime',
      sceneCompiled: !!this.#lastCompiled,
      runtime: typeof this.#runtime.snapshot === 'function' ? this.#runtime.snapshot() : null
    });
  }
}

export function createBrowserLitePixRuntime(root = globalThis) {
  const SceneCompiler = root.LitePixSceneCompiler ?? root.LitePixNative?.Core2?.SceneCompiler;
  if (typeof SceneCompiler !== 'function') throw new Error('LitePix SceneCompiler is unavailable');
  const compiler = new SceneCompiler();
  const telemetry = typeof root.LitePixCore8Production443 === 'function' ? new root.LitePixCore8Production443() : null;
  return Object.freeze({
    name: 'LitePix 4.45 clean bridge',
    compileScene(scene) {
      compiler.compile(scene);
      return compiler;
    },
    submit(compiled, job = {}) {
      if (typeof job.render === 'function') return job.render(compiled);
      return Object.freeze({ compiler:compiled, job });
    },
    capture(job, extra = {}) { return telemetry?.capture(job, extra) ?? null; },
    snapshot() { return Object.freeze({ compiler:compiler.snapshot?.() ?? null, telemetry:telemetry?.snapshot?.() ?? null }); }
  });
}

function sameStamp(a,b) {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if (a[key] !== b[key]) return false;
  return true;
}
