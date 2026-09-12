export class RenderScenePort {
  constructor(core) {
    this.core = core;
    this.lastStamp = null;
    this.lastScene = null;
  }

  compile() {
    const stamp = this.core.renderSceneStamp();
    if (this.lastStamp && this.core.generations.matches(this.lastStamp)) return this.lastScene;

    const entities = this.core.entities.values();
    const scene = Object.freeze({
      schema: 2,
      stamp,
      activeCamera: this.core.state.activeCamera,
      hierarchy: this.core.scene.snapshot(),
      objects: Object.freeze(entities.map((entity, index) => Object.freeze({
        id: entity.id ?? `entity-${index}`,
        type: entity.type ?? 'object',
        transform: entity.transform ?? null,
        geometryHandle: entity.geometry ?? null,
        geometry: entity.geometry ? this.core.geometry.compile(entity.geometry) : null,
        material: entity.material ?? null,
        visible: entity.visible !== false
      })))
    });

    this.lastStamp = stamp;
    this.lastScene = scene;
    return scene;
  }
}
