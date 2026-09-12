import { GenerationRegistry } from './generation-registry.mjs';
import { ResourceStore } from './resource-store.mjs';
import { CommandStack } from './command-stack.mjs';
import { SceneGraph } from './scene-graph.mjs';
import { GeometryStore } from './geometry-store.mjs';
import { EvaluationGraph } from './evaluation-graph.mjs';
import { DerivedGeometryEvaluator } from './evaluator.mjs';
import { createSceneEntity, validateSceneEntity, normalizeTransform } from './scene-entity.mjs';
import { createEditSelection, normalizeEditSelection, validateEditSelection } from './edit-selection.mjs';
import { createMoveVerticesCommand, createSetVertexPositionsCommand } from './geometry-commands.mjs';

const DOMAINS = ['scene','geometry','topology','transform','selection','material','evaluation','renderScene','viewport'];

export class ThreeDLiteMainCore {
  #state;
  #validator;

  constructor({ validator } = {}) {
    this.generations = new GenerationRegistry(DOMAINS);
    this.entities = new ResourceStore();
    this.geometry = new GeometryStore();
    this.commands = new CommandStack();
    this.scene = new SceneGraph(handle => this.entities.has(handle));
    this.evaluationGraph = new EvaluationGraph();
    this.evaluator = new DerivedGeometryEvaluator(this);
    this.#validator = validator ?? (() => true);
    this.#state = Object.freeze({ sceneName:'Untitled', activeCamera:null, selection:Object.freeze([]), editSelection:createEditSelection(), metadata:Object.freeze({ schema:5 }) });
  }

  get state() { return this.#state; }
  snapshot() { return Object.freeze({ state:this.#state, generations:this.generations.stamp(), entities:Object.freeze(this.entities.values().slice()), hierarchy:this.scene.snapshot(), evaluation:this.evaluationGraph.snapshot() }); }

  transact(label, mutator, dirtyDomains=['scene']) {
    if (typeof mutator !== 'function') throw new TypeError('mutator must be a function');
    const draft=structuredClone(this.#state); mutator(draft,this);
    if (!this.#validator(draft,{label,core:this})) throw new Error(`Main Core validation failed: ${label}`);
    this.#state=deepFreeze(draft); this.generations.bumpMany(dirtyDomains);
    if (dirtyDomains.includes('evaluation') || dirtyDomains.includes('geometry') || dirtyDomains.includes('topology')) this.evaluator.invalidate();
    return this.#state;
  }

  execute(command){ return this.commands.execute(command,this); }
  undo(){ return this.commands.undo(this); }
  redo(){ return this.commands.redo(this); }

  createGeometry(input={}) { const handle=this.geometry.create(input); this.generations.bumpMany(['geometry','topology','evaluation','renderScene']); this.evaluator.invalidate(); return handle; }
  updateGeometry(handle,updater) {
    const updated=this.geometry.update(handle,updater);
    if(updated){ const edit=this.#state.editSelection; if(sameHandle(edit.geometry,handle)&&!validateEditSelection(edit,this.geometry)){ const repaired=normalizeEditSelection(edit.mode,handle,[],this.geometry); this.#state=deepFreeze({...structuredClone(this.#state),editSelection:repaired}); } this.generations.bumpMany(['geometry','topology','evaluation','renderScene']); this.evaluator.invalidate(); }
    return updated;
  }
  destroyGeometry(handle) {
    if(!this.geometry.has(handle)) return false;
    if(this.entities.values().some(entity=>sameHandle(entity.geometry,handle))) return false;
    const destroyed=this.geometry.destroy(handle);
    if(destroyed){ if(sameHandle(this.#state.editSelection.geometry,handle)) this.#state=deepFreeze({...structuredClone(this.#state),editSelection:createEditSelection()}); this.generations.bumpMany(['geometry','topology','selection','evaluation','renderScene']); this.evaluator.invalidate(); }
    return destroyed;
  }

  evaluateGeometry(handle, stack=[]) { return this.evaluator.evaluate(handle,stack); }

  createEntity(entity={}, {parent=null}={}) {
    const normalized=createSceneEntity(entity); if(normalized.geometry&&!this.geometry.has(normalized.geometry)) throw new Error('Entity references stale geometry'); if(!validateSceneEntity(normalized)) throw new Error('Invalid scene entity'); if(!this.#validator(normalized,{label:'createEntity',core:this})) throw new Error('Entity validation failed');
    const handle=this.entities.create(deepFreeze(normalized)); try{this.scene.register(handle,parent);}catch(error){this.entities.destroy(handle);throw error;} this.generations.bumpMany(['scene','renderScene']); return handle;
  }
  updateEntity(handle,updater,dirtyDomains=['scene','renderScene']) {
    const current=this.entities.get(handle); if(!current)return false; if(typeof updater!=='function')throw new TypeError('updater must be a function'); const next=structuredClone(current); updater(next); next.transform=normalizeTransform(next.transform); if(next.geometry&&!this.geometry.has(next.geometry))throw new Error('Entity references stale geometry'); if(!validateSceneEntity(next))throw new Error('Invalid scene entity update'); if(!this.#validator(next,{label:'updateEntity',core:this,handle}))throw new Error('Entity validation failed'); this.entities.update(handle,deepFreeze(next)); this.generations.bumpMany(dirtyDomains); return true;
  }
  assignGeometry(entityHandle,geometryHandle=null){ const entity=this.entities.get(entityHandle); if(!entity)return false; if(geometryHandle&&!this.geometry.has(geometryHandle))throw new Error('Cannot assign stale geometry'); if(geometryHandle&&entity.type!=='mesh')throw new Error('Geometry can only be assigned to mesh entities'); return this.updateEntity(entityHandle,draft=>{draft.geometry=geometryHandle?{...geometryHandle}:null;},['scene','geometry','renderScene']); }
  reparentEntity(handle,parent=null){ this.scene.reparent(handle,parent); this.generations.bumpMany(['scene','transform','renderScene']); return true; }
  destroyEntity(handle,{recursive=true}={}) { if(!this.entities.has(handle))return false; const descendants=recursive?this.scene.descendantsOf(handle).reverse():[]; const removedKeys=new Set([handleKey(handle),...descendants.map(handleKey)]); for(const child of descendants){this.scene.unregister(child,{reparentChildren:false});this.entities.destroy(child);} this.scene.unregister(handle,{reparentChildren:!recursive}); const destroyed=this.entities.destroy(handle); if(destroyed){const selection=this.#state.selection.filter(selected=>!removedKeys.has(handleKey(selected)));this.#state=deepFreeze({...structuredClone(this.#state),selection});this.generations.bumpMany(['scene','renderScene','selection']);} return destroyed; }
  setSelection(handles){ const valid=dedupeHandles(handles.filter(handle=>this.entities.has(handle))); return this.transact('setSelection',draft=>{draft.selection=valid.map(handle=>({...handle}));},['selection']); }
  setEditMode(mode='object',geometryHandle=null){ const next=normalizeEditSelection(mode,geometryHandle,[],this.geometry); return this.transact('setEditMode',draft=>{draft.editSelection=structuredClone(next);},['selection','viewport']); }
  setComponentSelection(elements=[]){ const current=this.#state.editSelection;if(current.mode==='object')throw new Error('Component selection requires vertex, edge, or polygon edit mode');const next=normalizeEditSelection(current.mode,current.geometry,elements,this.geometry);return this.transact('setComponentSelection',draft=>{draft.editSelection=structuredClone(next);},['selection','viewport']); }
  setVertexPositions(geometryHandle,changes){ return this.execute(createSetVertexPositionsCommand(geometryHandle,changes)); }
  moveSelectedVertices(delta){ const edit=this.#state.editSelection;if(edit.mode!=='vertex'||!edit.geometry)throw new Error('Vertex edit mode is required');if(edit.elements.length===0)return false;return this.execute(createMoveVerticesCommand(edit.geometry,edit.elements,delta)); }
  setActiveCamera(handle=null){ if(handle){const entity=this.entities.get(handle);if(!entity||entity.type!=='camera')throw new Error('Active camera must reference a live camera entity');}return this.transact('setActiveCamera',draft=>{draft.activeCamera=handle?{...handle}:null;},['scene','viewport','renderScene']); }
  renderSceneStamp(){ return this.generations.stamp(['scene','geometry','topology','transform','material','evaluation','renderScene']); }
}
function sameHandle(a,b){return !!a&&!!b&&a.index===b.index&&a.generation===b.generation;}
function handleKey(handle){return `${handle.index}:${handle.generation}`;}
function dedupeHandles(handles){const seen=new Set();return handles.filter(handle=>{const key=handleKey(handle);if(seen.has(key))return false;seen.add(key);return true;});}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;for(const child of Object.values(value))deepFreeze(child);return Object.freeze(value);}
