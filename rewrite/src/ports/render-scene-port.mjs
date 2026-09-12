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
      schema: 5,
      stamp,
      activeCamera: this.core.state.activeCamera,
      hierarchy: this.core.scene.snapshot(),
      objects: Object.freeze(entries.map((entry, index) => {
        const entity = entry.value;
        return Object.freeze({
          id: entity.id ?? `entity-${index}`,
          type: entity.type ?? 'object',
          transform: entity.transform ?? null,
          geometryHandle: entity.geometry ?? null,
          evaluationRevision: this.core.evaluationRevision(entry.handle),
          modifierStack: entity.modifiers ?? Object.freeze([]),
          geometry: entity.geometry ? this.core.evaluateEntityGeometry(entry.handle) : null,
          materialHandle: entity.material ?? null,
          material: entity.material ? this.core.compileMaterial(entity.material) : null,
          visible: entity.visible !== false
        });
      }))
    });

    this.lastStamp = stamp;
    this.lastScene = scene;
    return scene;
  }
}
