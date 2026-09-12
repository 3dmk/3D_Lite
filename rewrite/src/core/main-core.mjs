import { GenerationRegistry } from './generation-registry.mjs';
import { ResourceStore } from './resource-store.mjs';
import { CommandStack } from './command-stack.mjs';
import { SceneGraph } from './scene-graph.mjs';
import { GeometryStore } from './geometry-store.mjs';
import { AssetStore } from './asset-store.mjs';
import { MaterialStore } from './material-store.mjs';
import { EvaluationGraph } from './evaluation-graph.mjs';
import { DerivedGeometryEvaluator } from './evaluator.mjs';
import { createSceneEntity, validateSceneEntity, normalizeTransform } from './scene-entity.mjs';
import { createEditSelection, normalizeEditSelection, validateEditSelection } from './edit-selection.mjs';
import { createMoveVerticesCommand, createSetVertexPositionsCommand } from './geometry-commands.mjs';
import { normalizeModifierStack, modifierStackSignature } from './modifier-stack.mjs';
import { createAddModifierCommand, createRemoveModifierCommand, createUpdateModifierCommand, createMoveModifierCommand } from './modifier-commands.mjs';
import { createAssignMaterialCommand, createUpdateMaterialCommand } from './material-commands.mjs';

const DOMAINS = ['scene','geometry','topology','transform','selection','material','asset','evaluation','renderScene','viewport'];

export class ThreeDLiteMainCore {
  #state;
  #validator;
  #evaluationRevisions = new Map();
  #evaluationNodes = new Map();

  constructor({ validator } = {}) {
    this.generations = new GenerationRegistry(DOMAINS);
    this.entities = new ResourceStore();
    this.geometry = new GeometryStore();
    this.assets = new AssetStore();
    this.materials = new MaterialStore(this.assets);
    this.commands = new CommandStack();
    this.scene = new SceneGraph(handle => this.entities.has(handle));
    this.evaluationGraph = new EvaluationGraph();
    this.evaluator = new DerivedGeometryEvaluator(this);
    this.#validator = validator ?? (() => true);
    this.#state = Object.freeze({ sceneName:'Untitled', activeCamera:null, selection:Object.freeze([]), editSelection:createEditSelection(), metadata:Object.freeze({ schema:7 }) });
  }

  get state() { return this.#state; }

  snapshot() {
    return Object.freeze({
      state:this.#state,
      generations:this.generations.stamp(),
      entities:Object.freeze(this.entities.values().slice()),
      assets:Object.freeze(this.assets.entries().map(entry => Object.freeze({ handle:entry.handle, value:entry.value }))),
      materials:Object.freeze(this.materials.entries().map(entry => Object.freeze({ handle:entry.handle, value:entry.value }))),
      hierarchy:this.scene.snapshot(),
      evaluation:this.evaluationGraph.snapshot()
    });
  }

  transact(label, mutator, dirtyDomains=['scene']) {
    if (typeof mutator !== 'function') throw new TypeError('mutator must be a function');
    const draft=structuredClone(this.#state);
    mutator(draft,this);
    if (!this.#validator(draft,{label,core:this})) throw new Error(`Main Core validation failed: ${label}`);
    this.#state=deepFreeze(draft);
    this.generations.bumpMany(dirtyDomains);
    if (dirtyDomains.some(domain => domain === 'evaluation' || domain === 'geometry' || domain === 'topology')) this.evaluator.invalidate();
    return this.#state;
  }

  execute(command){ return this.commands.execute(command,this); }
  undo(){ return this.commands.undo(this); }
  redo(){ return this.commands.redo(this); }

  createAsset(input={}) {
    const handle=this.assets.create(input);
    this.generations.bumpMany(['asset','material','renderScene']);
    return handle;
  }

  updateAsset(handle, updater) {
    const updated=this.assets.update(handle,updater);
    if (updated) this.generations.bumpMany(['asset','material','renderScene']);
    return updated;
  }

  destroyAsset(handle) {
    if (!this.assets.has(handle)) return false;
    const referenced=this.materials.entries().some(({value}) => Object.values(value.textures ?? {}).some(texture => sameHandle(texture,handle)));
    if (referenced) return false;
    const destroyed=this.assets.destroy(handle);
    if (destroyed) this.generations.bumpMany(['asset','material','renderScene']);
    return destroyed;
  }

  createMaterial(input={}) {
    const handle=this.materials.create(input);
    this.generations.bumpMany(['material','renderScene']);
    return handle;
  }

  updateMaterialDirect(handle, updater) {
    const updated=this.materials.update(handle,updater);
    if (updated) this.generations.bumpMany(['material','renderScene']);
    return updated;
  }

  replaceMaterialDirect(handle, value) {
    return this.updateMaterialDirect(handle, draft => {
      for (const key of Object.keys(draft)) delete draft[key];
      Object.assign(draft, structuredClone(value));
    });
  }

  updateMaterial(handle, patch={}) { return this.execute(createUpdateMaterialCommand(handle,patch)); }

  destroyMaterial(handle) {
    if (!this.materials.has(handle)) return false;
    if (this.entities.values().some(entity => sameHandle(entity.material,handle))) return false;
    const destroyed=this.materials.destroy(handle);
    if (destroyed) this.generations.bumpMany(['material','renderScene']);
    return destroyed;
  }

  compileMaterial(handle) { return handle ? this.materials.compile(handle) : null; }

  createGeometry(input={}) {
    const handle=this.geometry.create(input);
    this.generations.bumpMany(['geometry','topology','evaluation','renderScene']);
    this.evaluator.invalidate();
    return handle;
  }

  updateGeometry(handle, updater) {
    const updated=this.geometry.update(handle,updater);
    if (!updated) return false;
    const edit=this.#state.editSelection;
    if (sameHandle(edit.geometry,handle) && !validateEditSelection(edit,this.geometry)) {
      const repaired=normalizeEditSelection(edit.mode,handle,[],this.geometry);
      this.#state=deepFreeze({...structuredClone(this.#state),editSelection:repaired});
    }
    for (const entry of this.entities.entries()) if (sameHandle(entry.value.geometry,handle)) this.#markEntityEvaluationDirty(entry.handle);
    this.generations.bumpMany(['geometry','topology','evaluation','renderScene']);
    this.evaluator.invalidate();
    return true;
  }

  destroyGeometry(handle) {
    if (!this.geometry.has(handle)) return false;
    if (this.entities.values().some(entity => sameHandle(entity.geometry,handle))) return false;
    const destroyed=this.geometry.destroy(handle);
    if (destroyed) {
      if (sameHandle(this.#state.editSelection.geometry,handle)) this.#state=deepFreeze({...structuredClone(this.#state),editSelection:createEditSelection()});
      this.generations.bumpMany(['geometry','topology','selection','evaluation','renderScene']);
      this.evaluator.invalidate();
    }
    return destroyed;
  }

  evaluateGeometry(handle,stack=[]){ return this.evaluator.evaluate(handle,stack); }

  evaluateEntityGeometry(entityHandle) {
    const entity=this.entities.get(entityHandle);
    if (!entity || entity.type !== 'mesh' || !entity.geometry) return null;
    const key=handleKey(entityHandle);
    return this.evaluator.evaluate(entity.geometry,entity.modifiers ?? [],{ scope:key, revision:this.evaluationRevision(entityHandle) });
  }

  evaluationRevision(entityHandle){ return this.#evaluationRevisions.get(handleKey(entityHandle)) ?? 0; }

  createEntity(entity={}, {parent=null}={}) {
    const normalized=createSceneEntity(entity);
    if (normalized.geometry && !this.geometry.has(normalized.geometry)) throw new Error('Entity references stale geometry');
    if (normalized.material && !this.materials.has(normalized.material)) throw new Error('Entity references stale material');
    if (normalized.material && normalized.type !== 'mesh') throw new Error('Materials can only be assigned to mesh entities');
    if (!validateSceneEntity(normalized)) throw new Error('Invalid scene entity');
    if (!this.#validator(normalized,{label:'createEntity',core:this})) throw new Error('Entity validation failed');
    const handle=this.entities.create(deepFreeze(normalized));
    try {
      this.scene.register(handle,parent);
      if (normalized.type === 'mesh') {
        this.#evaluationRevisions.set(handleKey(handle),1);
        this.#syncEntityEvaluationGraph(handle);
      }
    } catch (error) {
      this.entities.destroy(handle);
      this.#removeEntityEvaluationGraph(handle);
      this.#evaluationRevisions.delete(handleKey(handle));
      throw error;
    }
    this.generations.bumpMany(['scene','evaluation','renderScene']);
    return handle;
  }

  updateEntity(handle,updater,dirtyDomains=['scene','renderScene']) {
    const current=this.entities.get(handle);
    if (!current) return false;
    if (typeof updater !== 'function') throw new TypeError('updater must be a function');
    const beforeGeometry=current.geometry;
    const beforeModifiers=modifierStackSignature(current.modifiers ?? []);
    const beforeMaterial=current.material;
    const next=structuredClone(current);
    updater(next);
    next.transform=normalizeTransform(next.transform);
    next.modifiers=next.type === 'mesh' ? normalizeModifierStack(next.modifiers ?? []) : Object.freeze([]);
    if (next.geometry && !this.geometry.has(next.geometry)) throw new Error('Entity references stale geometry');
    if (next.material && !this.materials.has(next.material)) throw new Error('Entity references stale material');
    if (next.material && next.type !== 'mesh') throw new Error('Materials can only be assigned to mesh entities');
    if (!validateSceneEntity(next)) throw new Error('Invalid scene entity update');
    if (!this.#validator(next,{label:'updateEntity',core:this,handle})) throw new Error('Entity validation failed');
    const evaluationChanged=!sameNullableHandle(beforeGeometry,next.geometry) || beforeModifiers !== modifierStackSignature(next.modifiers);
    const materialChanged=!sameNullableHandle(beforeMaterial,next.material);
    this.entities.update(handle,deepFreeze(next));
    const domains=new Set(dirtyDomains);
    if (evaluationChanged) {
      domains.add('evaluation'); domains.add('renderScene');
      this.#markEntityEvaluationDirty(handle);
      this.#syncEntityEvaluationGraph(handle);
    }
    if (materialChanged) { domains.add('material'); domains.add('renderScene'); }
    this.generations.bumpMany([...domains]);
    return true;
  }

  assignGeometry(entityHandle,geometryHandle=null) {
    const entity=this.entities.get(entityHandle);
    if (!entity) return false;
    if (geometryHandle && !this.geometry.has(geometryHandle)) throw new Error('Cannot assign stale geometry');
    if (geometryHandle && entity.type !== 'mesh') throw new Error('Geometry can only be assigned to mesh entities');
    return this.updateEntity(entityHandle,draft => { draft.geometry=geometryHandle ? {...geometryHandle} : null; },['scene','geometry','evaluation','renderScene']);
  }

  assignMaterialDirect(entityHandle,materialHandle=null) {
    const entity=this.entities.get(entityHandle);
    if (!entity) return false;
    if (entity.type !== 'mesh') throw new Error('Materials can only be assigned to mesh entities');
    if (materialHandle && !this.materials.has(materialHandle)) throw new Error('Cannot assign stale material');
    return this.updateEntity(entityHandle,draft => { draft.material=materialHandle ? {...materialHandle} : null; },['material','renderScene']);
  }

  assignMaterial(entityHandle,materialHandle=null){ return this.execute(createAssignMaterialCommand(entityHandle,materialHandle)); }

  replaceModifierStack(entityHandle,stack=[]) {
    const entity=this.entities.get(entityHandle);
    if (!entity) return false;
    if (entity.type !== 'mesh') throw new Error('Modifiers require a mesh entity');
    const normalized=normalizeModifierStack(stack);
    return this.updateEntity(entityHandle,draft => { draft.modifiers=structuredClone(normalized); },['evaluation','renderScene']);
  }

  addModifier(entityHandle,modifier,index=null){ return this.execute(createAddModifierCommand(entityHandle,modifier,index)); }
  removeModifier(entityHandle,modifierId){ return this.execute(createRemoveModifierCommand(entityHandle,modifierId)); }
  updateModifier(entityHandle,modifierId,patch={}){ return this.execute(createUpdateModifierCommand(entityHandle,modifierId,patch)); }
  moveModifier(entityHandle,modifierId,toIndex){ return this.execute(createMoveModifierCommand(entityHandle,modifierId,toIndex)); }

  reparentEntity(handle,parent=null){ this.scene.reparent(handle,parent); this.generations.bumpMany(['scene','transform','renderScene']); return true; }

  destroyEntity(handle,{recursive=true}={}) {
    if (!this.entities.has(handle)) return false;
    const descendants=recursive ? this.scene.descendantsOf(handle).reverse() : [];
    const removedKeys=new Set([handleKey(handle),...descendants.map(handleKey)]);
    for (const child of descendants) {
      this.#removeEntityEvaluationGraph(child);
      this.#evaluationRevisions.delete(handleKey(child));
      this.scene.unregister(child,{reparentChildren:false});
      this.entities.destroy(child);
    }
    this.#removeEntityEvaluationGraph(handle);
    this.#evaluationRevisions.delete(handleKey(handle));
    this.scene.unregister(handle,{reparentChildren:!recursive});
    const destroyed=this.entities.destroy(handle);
    if (destroyed) {
      const selection=this.#state.selection.filter(selected => !removedKeys.has(handleKey(selected)));
      this.#state=deepFreeze({...structuredClone(this.#state),selection});
      this.generations.bumpMany(['scene','evaluation','renderScene','selection']);
    }
    return destroyed;
  }

  setSelection(handles){ const valid=dedupeHandles(handles.filter(handle => this.entities.has(handle))); return this.transact('setSelection',draft => { draft.selection=valid.map(handle => ({...handle})); },['selection']); }
  setEditMode(mode='object',geometryHandle=null){ const next=normalizeEditSelection(mode,geometryHandle,[],this.geometry); return this.transact('setEditMode',draft => { draft.editSelection=structuredClone(next); },['selection','viewport']); }
  setComponentSelection(elements=[]){ const current=this.#state.editSelection; if (current.mode === 'object') throw new Error('Component selection requires vertex, edge, or polygon edit mode'); const next=normalizeEditSelection(current.mode,current.geometry,elements,this.geometry); return this.transact('setComponentSelection',draft => { draft.editSelection=structuredClone(next); },['selection','viewport']); }
  setVertexPositions(geometryHandle,changes){ return this.execute(createSetVertexPositionsCommand(geometryHandle,changes)); }
  moveSelectedVertices(delta){ const edit=this.#state.editSelection; if (edit.mode !== 'vertex' || !edit.geometry) throw new Error('Vertex edit mode is required'); if (edit.elements.length === 0) return false; return this.execute(createMoveVerticesCommand(edit.geometry,edit.elements,delta)); }

  setActiveCamera(handle=null) {
    if (handle) { const entity=this.entities.get(handle); if (!entity || entity.type !== 'camera') throw new Error('Active camera must reference a live camera entity'); }
    return this.transact('setActiveCamera',draft => { draft.activeCamera=handle ? {...handle} : null; },['scene','viewport','renderScene']);
  }

  renderSceneStamp(){ return this.generations.stamp(['scene','geometry','topology','transform','material','asset','evaluation','renderScene']); }

  #markEntityEvaluationDirty(handle) {
    const key=handleKey(handle);
    this.#evaluationRevisions.set(key,(this.#evaluationRevisions.get(key) ?? 0)+1);
    this.evaluator.invalidateScope(key);
  }

  #syncEntityEvaluationGraph(handle) {
    this.#removeEntityEvaluationGraph(handle);
    const entity=this.entities.get(handle);
    if (!entity || entity.type !== 'mesh' || !entity.geometry) return;
    const prefix=`entity:${handleKey(handle)}`;
    const nodes=[];
    const source=`${prefix}:source`;
    this.evaluationGraph.register(source,[]); nodes.push(source);
    let previous=source;
    for (const modifier of entity.modifiers ?? []) {
      const node=`${prefix}:modifier:${modifier.id}`;
      this.evaluationGraph.register(node,[previous]); nodes.push(node); previous=node;
    }
    const renderNode=`${prefix}:render`;
    this.evaluationGraph.register(renderNode,[previous]); nodes.push(renderNode);
    this.#evaluationNodes.set(handleKey(handle),nodes);
  }

  #removeEntityEvaluationGraph(handle) {
    const key=handleKey(handle);
    const nodes=this.#evaluationNodes.get(key) ?? [];
    for (const node of [...nodes].reverse()) this.evaluationGraph.unregister(node);
    this.#evaluationNodes.delete(key);
    this.evaluator.invalidateScope(key);
  }
}

function sameHandle(a,b){ return !!a && !!b && a.index === b.index && a.generation === b.generation; }
function sameNullableHandle(a,b){ if (!a && !b) return true; return sameHandle(a,b); }
function handleKey(handle){ return `${handle.index}:${handle.generation}`; }
function dedupeHandles(handles){ const seen=new Set(); return handles.filter(handle => { const key=handleKey(handle); if (seen.has(key)) return false; seen.add(key); return true; }); }
function deepFreeze(value){ if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value; for (const child of Object.values(value)) deepFreeze(child); return Object.freeze(value); }
