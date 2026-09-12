export class RuntimeHealthMonitor {
  #diagnostics;
  #recovery;
  #state;

  constructor(diagnostics, recovery = null) {
    if (!diagnostics || typeof diagnostics.run !== 'function') throw new TypeError('RuntimeHealthMonitor requires diagnostics');
    this.#diagnostics = diagnostics;
    this.#recovery = recovery;
    this.#state = Object.freeze({ schema:1, status:'unknown', lastCheck:null, failures:0, consecutiveFailures:0 });
  }

  get state() { return this.#state; }

  async check(context = {}) {
    const report = await this.#diagnostics.run(context);
    const previous = this.#state;
    const failed = !report.passed;
    this.#state = Object.freeze({
      schema:1,
      status: failed ? 'degraded' : 'healthy',
      lastCheck: report.finishedAt,
      failures: previous.failures + (failed ? 1 : 0),
      consecutiveFailures: failed ? previous.consecutiveFailures + 1 : 0
    });
    if (failed && this.#recovery) this.#recovery.enterSafeMode(`release-blocking diagnostics: ${report.releaseBlockingFailures.join(', ')}`);
    return Object.freeze({ report, health:this.#state });
  }
}

export function validateStartupEnvironment({ documentRef = globalThis.document, requiredSelectors = [], dependencies = {} } = {}) {
  const failures = [];
  if (!documentRef) failures.push('document unavailable');
  if (documentRef) {
    for (const selector of requiredSelectors) if (!documentRef.querySelector(selector)) failures.push(`missing element: ${selector}`);
    const ids = [...documentRef.querySelectorAll?.('[id]') ?? []].map(node => node.id);
    const duplicates = ids.filter((id,index) => id && ids.indexOf(id) !== index);
    if (duplicates.length) failures.push(`duplicate ids: ${[...new Set(duplicates)].join(', ')}`);
    const scripts = [...documentRef.querySelectorAll?.('script[src]') ?? []];
    for (const script of scripts) if (String(script.textContent ?? '').trim()) failures.push(`external script has inline body: ${script.src || '(unknown)'}`);
  }
  for (const [name, value] of Object.entries(dependencies)) if (!value) failures.push(`missing dependency: ${name}`);
  return Object.freeze({ schema:1, passed:failures.length === 0, failures:Object.freeze(failures) });
}
