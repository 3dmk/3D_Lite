export class RenderScenePort {
  constructor(core) {
    this.core = core;
    this.lastStamp = null;
    this.lastScene = null;
  }

  compile() {
    const stamp = this.core.renderSceneStamp();
    if (this.lastStamp && this.core.generations.matches(this.lastStamp)) return this.lastScene;

    const entries = this.core.entities.entries();
    const scene = Object.freeze({
      schema: 7,
      stamp,
      activeCamera: this.core.state.activeCamera ? Object.freeze({ ...this.core.state.activeCamera }) : null,
      hierarchy: this.core.scene.snapshot(),
      entityHandles: Object.freeze(entries.map(entry => Object.freeze({ ...entry.handle }))),
      objects: Object.freeze(entries.map((entry, index) => {
        const entity = entry.value;
        return deepFreeze({
          id: entity.id ?? `entity-${index}`,
          type: entity.type ?? 'object',
          transform: entity.transform ? structuredClone(entity.transform) : null,
          geometryHandle: entity.geometry ? { ...entity.geometry } : null,
          evaluationRevision: this.core.evaluationRevision(entry.handle),
          modifierStack: structuredClone(entity.modifiers ?? []),
          geometry: entity.geometry ? this.core.evaluateEntityGeometry(entry.handle) : null,
          materialHandle: entity.material ? { ...entity.material } : null,
          material: entity.material ? this.core.compileMaterial(entity.material) : null,
          components: structuredClone(entity.components ?? {}),
          visible: entity.visible !== false
        });
      }))
    });

    this.lastStamp = stamp;
    this.lastScene = scene;
    return scene;
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
