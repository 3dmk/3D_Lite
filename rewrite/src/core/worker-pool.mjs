export class WorkerPool {
  #workers;
  #cursor = 0;

  constructor(workers = []) {
    if (!Array.isArray(workers) || workers.length === 0) throw new Error('WorkerPool requires at least one worker adapter');
    for (const worker of workers) if (typeof worker?.run !== 'function') throw new TypeError('Worker adapter must implement run(payload, context)');
    this.#workers = workers.slice();
  }

  get size(){ return this.#workers.length; }

  run(payload, context={}) {
    const worker = this.#workers[this.#cursor++ % this.#workers.length];
    return worker.run(payload, context);
  }

  snapshot(){ return Object.freeze({ size:this.#workers.length, workers:Object.freeze(this.#workers.map((worker,index)=>Object.freeze({ index, name:String(worker.name ?? `worker-${index}`) }))) }); }
}

export class InlineWorkerAdapter {
  constructor(name, handler) {
    if (typeof handler !== 'function') throw new TypeError('InlineWorkerAdapter handler is required');
    this.name = String(name ?? 'inline-worker');
    this.handler = handler;
  }
  run(payload, context={}) { return Promise.resolve(this.handler(payload, context)); }
}
