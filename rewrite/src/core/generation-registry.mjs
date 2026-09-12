export class GenerationRegistry {
  #values = new Map();

  constructor(domains = []) {
    for (const domain of domains) this.#values.set(domain, 0);
  }

  ensure(domain) {
    if (!this.#values.has(domain)) this.#values.set(domain, 0);
    return this.#values.get(domain);
  }

  get(domain) {
    return this.ensure(domain);
  }

  bump(domain) {
    const next = this.ensure(domain) + 1;
    this.#values.set(domain, next);
    return next;
  }

  bumpMany(domains) {
    const result = {};
    for (const domain of domains) result[domain] = this.bump(domain);
    return result;
  }

  stamp(domains = [...this.#values.keys()]) {
    const stamp = {};
    for (const domain of domains) stamp[domain] = this.ensure(domain);
    return Object.freeze(stamp);
  }

  matches(stamp) {
    if (!stamp || typeof stamp !== 'object') return false;
    for (const [domain, generation] of Object.entries(stamp)) {
      if (this.ensure(domain) !== generation) return false;
    }
    return true;
  }
}
