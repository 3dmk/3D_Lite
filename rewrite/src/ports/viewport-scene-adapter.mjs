export class ViewportSceneAdapter {
  #viewport;

  constructor(viewportPort) { this.#viewport = viewportPort; }

  compile() {
    const frame = this.#viewport.frame();
    const selected = new Set(frame.selection.map(handleKey));
    const objects = frame.scene.objects.map((object, index) => Object.freeze({
      id: object.id,
      type: object.type,
      transform: object.transform,
      geometry: object.geometry,
      material: object.material,
      visible: object.visible,
      selected: selected.has(handleKey(frame.scene.entityHandles?.[index] ?? null))
    }));
    return Object.freeze({
      schema: 1,
      view: frame.view,
      activeCamera: frame.scene.activeCamera,
      objects: Object.freeze(objects),
      editSelection: frame.editSelection,
      generations: frame.generations
    });
  }
}

function handleKey(handle) {
  return handle ? `${handle.index}:${handle.generation}` : '';
}
