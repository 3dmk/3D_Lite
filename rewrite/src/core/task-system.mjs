function now(){ return globalThis.performance?.now?.() ?? Date.now(); }

export class AsyncTaskSystem {
  #generations;
  #queues = new Map();
  #jobs = new Map();
  #nextId = 1;
  #stats = { submitted:0, completed:0, stale:0, failed:0, cancelled:0 };

  constructor(generations, { concurrency = 2 } = {}) {
    if (!generations?.stamp || !generations?.matches) throw new TypeError('AsyncTaskSystem requires GenerationRegistry');
    this.#generations = generations;
    this.concurrency = Math.max(1, Math.floor(Number(concurrency) || 1));
  }

  submit({ type='task', domains=[], input=null, execute, apply=null, key=null } = {}) {
    if (typeof execute !== 'function') throw new TypeError('Task execute function is required');
    if (apply != null && typeof apply !== 'function') throw new TypeError('Task apply must be a function');
    const id = this.#nextId++;
    const stamp = this.#generations.stamp([...new Set(domains.map(String))]);
    const job = {
      id, type:String(type), key:key == null ? null : String(key), input,
      stamp, execute, apply, state:'queued', submittedAt:now(), startedAt:null,
      finishedAt:null, error:null, result:undefined, cancelled:false
    };
    this.#jobs.set(id, job);
    this.#stats.submitted++;
    const queueKey = job.key ?? '__default__';
    if (!this.#queues.has(queueKey)) this.#queues.set(queueKey, []);
    this.#queues.get(queueKey).push(job);
    this.#pump();
    return Object.freeze({ id, type:job.type, key:job.key, stamp });
  }

  cancel(id) {
    const job = this.#jobs.get(Number(id));
    if (!job || ['done','stale','error','cancelled'].includes(job.state)) return false;
    job.cancelled = true;
    if (job.state === 'queued') {
      job.state = 'cancelled'; job.finishedAt = now(); this.#stats.cancelled++;
    }
    return true;
  }

  status(id) {
    const job = this.#jobs.get(Number(id));
    if (!job) return null;
    return Object.freeze({ id:job.id, type:job.type, key:job.key, state:job.state, stamp:job.stamp, error:job.error, submittedAt:job.submittedAt, startedAt:job.startedAt, finishedAt:job.finishedAt });
  }

  snapshot() {
    const states = {};
    for (const job of this.#jobs.values()) states[job.state] = (states[job.state] ?? 0) + 1;
    return Object.freeze({ concurrency:this.concurrency, ...this.#stats, states:Object.freeze(states) });
  }

  async idle() {
    while ([...this.#jobs.values()].some(job => job.state === 'queued' || job.state === 'running')) await new Promise(resolve => setTimeout(resolve, 0));
    return this.snapshot();
  }

  #activeCount() { return [...this.#jobs.values()].filter(job => job.state === 'running').length; }

  #nextQueued() {
    for (const queue of this.#queues.values()) {
      while (queue.length && queue[0].state !== 'queued') queue.shift();
      if (queue.length) return queue.shift();
    }
    return null;
  }

  #pump() {
    while (this.#activeCount() < this.concurrency) {
      const job = this.#nextQueued();
      if (!job) return;
      this.#run(job);
    }
  }

  async #run(job) {
    if (job.cancelled) { this.#pump(); return; }
    job.state='running'; job.startedAt=now();
    try {
      const result = await job.execute(job.input, Object.freeze({ id:job.id, stamp:job.stamp, isCancelled:()=>job.cancelled }));
      if (job.cancelled) {
        job.state='cancelled'; this.#stats.cancelled++;
      } else if (!this.#generations.matches(job.stamp)) {
        job.state='stale'; job.result=result; this.#stats.stale++;
      } else {
        if (job.apply) await job.apply(result, Object.freeze({ id:job.id, stamp:job.stamp }));
        if (!this.#generations.matches(job.stamp)) {
          job.state='stale'; job.result=result; this.#stats.stale++;
        } else {
          job.state='done'; job.result=result; this.#stats.completed++;
        }
      }
    } catch (error) {
      job.state='error'; job.error=String(error?.message ?? error); this.#stats.failed++;
    } finally {
      job.finishedAt=now(); this.#pump();
    }
  }
}
