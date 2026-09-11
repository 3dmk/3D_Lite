(function(root){'use strict';
const core=root.ThreeDLiteMainCore;
if(!core||root.__3DLiteMainCoreV2)return;
const VERSION='2.0.0';
const events=new Map(),commands=new Map(),adapters=new Map(),validators=new Map(),derived=new Map(),resources=new Map();
const undoStack=[],redoStack=[],extDiagnostics=[];let resourceSeq=0,toolSeq=0;
const freeze=v=>(v&&typeof v==='object')?Object.freeze(v):v;
const arr=v=>Array.isArray(v)?v:(v==null?[]:[v]);
const stamp=deps=>{const out={};for(const k of deps)out[k]=core.generation(k);return out;};
const sameStamp=(a,b,deps)=>deps.every(k=>a?.[k]===b?.[k]);
function emit(type,payload){const set=events.get(type);if(!set)return;for(const fn of [...set]){try{fn(payload);}catch(error){extDiagnostics.push({type:'event-listener-failure',event:type,error:String(error)});}}}
function on(type,fn){if(typeof fn!=='function')throw new TypeError('listener must be a function');let set=events.get(type);if(!set){set=new Set();events.set(type,set);}set.add(fn);return()=>set.delete(fn);}
function normalizePacket(packet){if(packet&&typeof packet==='object'&&('value'in packet||'undo'in packet||'redo'in packet||'dirty'in packet))return packet;return {value:packet,dirty:[]};}
function registerCommand(name,spec){if(!name||!spec||typeof spec.execute!=='function')throw new TypeError('command requires name and execute()');commands.set(String(name),spec);return()=>commands.delete(String(name));}
function executeCommand(nameOrSpec,args,meta={}){const spec=typeof nameOrSpec==='string'?commands.get(nameOrSpec):nameOrSpec;if(!spec||typeof spec.execute!=='function')throw new Error('unknown 3DLite command');let packet;
  const label=meta.label||spec.name||String(nameOrSpec||'command');
  const value=core.transaction(label,()=>{packet=normalizePacket(spec.execute({core,readDomain,derive,resource:getResource},args));return {value:packet.value,undo:packet.undo,dirty:arr(packet.dirty)};},spec.validate?((value)=>spec.validate(value,args)!==false):null);
  if(typeof packet?.undo==='function'){undoStack.push({label,undo:packet.undo,redo:packet.redo,dirty:arr(packet.dirty),spec,args});if(undoStack.length>256)undoStack.shift();redoStack.length=0;}
  emit('command:committed',freeze({label,dirty:arr(packet?.dirty),value}));return value;
}
function undo(){const entry=undoStack.pop();if(!entry)return false;core.transaction('undo:'+entry.label,()=>({value:entry.undo(),dirty:entry.dirty}));redoStack.push(entry);emit('history:undo',freeze({label:entry.label}));return true;}
function redo(){const entry=redoStack.pop();if(!entry)return false;if(typeof entry.redo==='function')core.transaction('redo:'+entry.label,()=>({value:entry.redo(),dirty:entry.dirty}));else{let packet;core.transaction('redo:'+entry.label,()=>{packet=normalizePacket(entry.spec.execute({core,readDomain,derive,resource:getResource},entry.args));entry.undo=packet.undo;entry.redo=packet.redo;entry.dirty=arr(packet.dirty);return {value:packet.value,undo:packet.undo,dirty:entry.dirty};});}undoStack.push(entry);emit('history:redo',freeze({label:entry.label}));return true;}
function registerAdapter(name,adapter){if(!name||!adapter||typeof adapter.read!=='function')throw new TypeError('adapter requires read()');adapters.set(String(name),adapter);return()=>adapters.delete(String(name));}
function readDomain(name){const a=adapters.get(String(name));if(!a)throw new Error('unknown 3DLite domain adapter '+name);return a.read();}
function registerValidator(name,fn){if(typeof fn!=='function')throw new TypeError('validator must be function');validators.set(String(name),fn);return()=>validators.delete(String(name));}
function validate(name,value){const fn=validators.get(String(name));return fn?fn(value)!==false:true;}
function derive(key,deps,compute){deps=arr(deps);if(typeof compute!=='function')throw new TypeError('derive compute must be function');const s=stamp(deps),prev=derived.get(key);if(prev&&sameStamp(prev.stamp,s,deps))return prev.value;const value=compute();derived.set(key,{stamp:s,value});return value;}
function clearDerived(key){if(key==null)derived.clear();else derived.delete(key);}
function createResource(type,value){const id=++resourceSeq;resources.set(id,{type:String(type||'resource'),generation:1,value});return freeze({id,generation:1,type:String(type||'resource')});}
function getResource(handle){const r=handle&&resources.get(handle.id);if(!r||r.generation!==handle.generation)return null;return r.value;}
function updateResource(handle,value){const r=handle&&resources.get(handle.id);if(!r||r.generation!==handle.generation)throw new Error('stale 3DLite resource handle');r.generation++;r.value=value;return freeze({id:handle.id,generation:r.generation,type:r.type});}
function releaseResource(handle){const r=handle&&resources.get(handle.id);if(!r||r.generation!==handle.generation)return false;resources.delete(handle.id);return true;}
function beginTool(name,impl={},context={}){let state='active';const id=++toolSeq;const session={id,name:String(name||'tool'),get state(){return state;},update(input){if(state!=='active')return;return impl.update?.(input,context);},preview(input){if(state!=='active')return;return impl.preview?.(input,context);},commit(input){if(state!=='active')throw new Error('tool is not active');const result=impl.commit?.(input,context);state='committed';emit('tool:commit',freeze({id,name:session.name}));return result;},cancel(){if(state!=='active')return false;impl.cancel?.(context);state='cancelled';emit('tool:cancel',freeze({id,name:session.name}));return true;}};impl.begin?.(context);emit('tool:begin',freeze({id,name:session.name}));return session;}
function projectEnvelope(data={}){return freeze({schema:1,application:'3DLite',mainCore:VERSION,litePix:root.LitePixVersion?.version||null,createdAt:Date.now(),generations:core.generations(),data});}
function renderSceneView(){core.syncLegacyRevisions?.();return freeze({application:'3DLite',mainCore:VERSION,generations:core.renderStamp?.()||core.generations(),scene:root.scene||null,objects:Array.isArray(root.objects)?root.objects:null,camera:root.camera||null});}
registerAdapter('scene',{authority:'legacy-migrating',read:()=>root.scene||null});
registerAdapter('objects',{authority:'legacy-migrating',read:()=>Array.isArray(root.objects)?root.objects:null});
registerAdapter('selection',{authority:'legacy-migrating',read:()=>root.selectedObjects||root.selection||root.selected||null});
registerAdapter('renderScene',{authority:'core-view',read:renderSceneView});
const oldStatus=core.status.bind(core);
Object.assign(core,{architectureVersion:VERSION,architecture:'DCAMP',mode:'progressive-authority',on,emit,registerCommand,executeCommand,undo,redo,canUndo:()=>undoStack.length>0,canRedo:()=>redoStack.length>0,historyState:()=>freeze({undo:undoStack.length,redo:redoStack.length}),registerAdapter,readDomain,registerValidator,validate,derive,clearDerived,createResource,getResource,updateResource,releaseResource,beginTool,projectEnvelope,renderSceneView,extensionDiagnostics:()=>extDiagnostics.slice()});
core.status=function(){const base=oldStatus();return freeze({...base,architectureVersion:VERSION,architecture:'DCAMP',mode:'progressive-authority',commands:commands.size,adapters:[...adapters.keys()],validators:validators.size,derivedEntries:derived.size,resources:resources.size,undoDepth:undoStack.length,redoDepth:redoStack.length,extensionDiagnostics:extDiagnostics.length});};
root.__3DLiteMainCoreV2=true;
emit('core:extended',freeze({version:VERSION,architecture:'DCAMP'}));
})(typeof globalThis!=='undefined'?globalThis:window);
