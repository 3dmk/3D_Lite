import { UIIntentBus } from './ui-intent-bus.mjs';
import { ToolController } from './tool-controller.mjs';
import { PropertyController } from './property-controller.mjs';
import { PanelController } from './panel-controller.mjs';

export class UIController {
  #core;
  #viewport;

  constructor(core, viewport) {
    this.#core = core;
    this.#viewport = viewport;
    this.intents = new UIIntentBus();
    this.tools = new ToolController(viewport);
    this.properties = new PropertyController(core);
    this.panels = new PanelController();
    this.#bindIntents();
  }

  snapshot() {
    return Object.freeze({
      tool: this.tools.active,
      panels: this.panels.state,
      selection: this.#core.state.selection,
      editSelection: this.#core.state.editSelection,
      viewport: this.#viewport.state
    });
  }

  #bindIntents() {
    this.intents.on('tool.activate', event => this.tools.activate(event.payload.name));
    this.intents.on('tool.cancel', () => this.tools.cancel());
    this.intents.on('selection.clear', () => this.#core.setSelection([]));
    this.intents.on('selection.pick', event => this.#viewport.applyPick(event.payload.result, event.payload.options ?? {}));
    this.intents.on('edit.mode', event => this.#core.setEditMode(event.payload.mode, event.payload.geometry ?? null));
    this.intents.on('scene.rename', event => this.properties.setSceneName(event.payload.name));
    this.intents.on('property.transform', event => this.properties.setSelectedTransform(event.payload));
    this.intents.on('property.visibility', event => this.properties.setSelectedVisibility(event.payload.visible));
    this.intents.on('property.material', event => this.properties.updateSelectedMaterial(event.payload));
    this.intents.on('panel.toggle', event => this.panels.toggle(event.payload.name));
    this.intents.on('undo', () => this.#core.undo());
    this.intents.on('redo', () => this.#core.redo());
  }
}
