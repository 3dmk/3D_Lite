export class RenderScenePort {
  constructor(core) {
    this.core = core;
    this.lastStamp = null;
    this.lastScene = null;
  }

  compile() {
    const stamp = this.core.renderSceneStamp();
    if (this.lastStamp && this.core.generations.matches(this.lastStamp)) return this.lastScene;

    const hierarchy = this.core.scene.snapshot();
    const parentByHandle = new Map(hierarchy.map(node => [handleKey(node.handle), node.parent]));
    const entities = this.core.entities.values();
    const liveEntries = [];

    for (const node of hierarchy) {
      const entity = this.core.entities.get(node.handle);
      if (entity) liveEntries.push({ handle: node.handle, entity });
    }

    const scene = Object.freeze({
      schema: 2,
      stamp,
      activeCamera: this.core.state.activeCamera ? Object.freeze({ ...this.core.state.activeCamera }) : null,
      roots: Object.freeze(this.core.scene.roots().map(handle => Object.freeze({ ...handle }))),
      objects: Object.freeze(liveEntries.map(({ handle, entity }) => Object.freeze({
        handle: Object.freeze({ ...handle }),
        parent: parentByHandle.get(handleKey(handle)) ? Object.freeze({ ...parentByHandle.get(handleKey(handle)) }) : null,
        id: entity.id,
        name: entity.name,
        type: entity.type,
        transform: entity.transform,
        geometry: entity.geometry,
        material: entity.material,
        visible: entity.visible,
        components: entity.components
      })))
    });

    this.lastStamp = stamp;
    this.lastScene = scene;
    return scene;
  }
}

function handleKey(handle) {
  return `${handle.index}:${handle.generation}`;
}
