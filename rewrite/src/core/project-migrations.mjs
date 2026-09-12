export const PROJECT_FORMAT = '3dlite-project';
export const PROJECT_VERSION = 1;

export class ProjectMigrationRegistry {
  #migrations = new Map();

  register(fromVersion, migrate) {
    const from = Number(fromVersion);
    if (!Number.isInteger(from) || from < 0) throw new TypeError('Migration version must be a non-negative integer');
    if (typeof migrate !== 'function') throw new TypeError('Migration must be a function');
    this.#migrations.set(from, migrate);
    return this;
  }

  migrate(document) {
    let current = structuredClone(document);
    if (!current || typeof current !== 'object') throw new TypeError('Project document must be an object');
    if (current.format !== PROJECT_FORMAT) throw new Error('Unsupported project format');
    let version = Number(current.version ?? 0);
    if (!Number.isInteger(version) || version < 0) throw new Error('Invalid project version');
    if (version > PROJECT_VERSION) throw new Error(`Project version ${version} is newer than supported version ${PROJECT_VERSION}`);
    while (version < PROJECT_VERSION) {
      const migrate = this.#migrations.get(version);
      if (!migrate) throw new Error(`No project migration registered from version ${version}`);
      current = migrate(structuredClone(current));
      const next = Number(current?.version);
      if (!Number.isInteger(next) || next <= version) throw new Error(`Invalid migration result from version ${version}`);
      version = next;
    }
    return deepFreeze(current);
  }
}

export function createDefaultProjectMigrations() {
  return new ProjectMigrationRegistry().register(0, document => ({
    format: PROJECT_FORMAT,
    version: 1,
    metadata: document.metadata ?? {},
    assets: document.assets ?? [],
    materials: document.materials ?? [],
    geometries: document.geometries ?? [],
    entities: document.entities ?? [],
    hierarchy: document.hierarchy ?? [],
    state: document.state ?? {}
  }));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
