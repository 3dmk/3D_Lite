(function(root){'use strict';
const VERSION='1.0.0';
const DIRTY=Object.freeze(['scene','geometry','topology','transform','selection','material','renderScene','viewport']);
const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const cloneGenerations=g=>Object.freeze({...g});
class ThreeDLiteMainCoreV1{
  constructor(){
    this.version=VERSION;
    this.mode='compatibility-migration';
    this._generations=Object.create(null);
    for(const k of DIRTY)this._generations[k]=0;
    this._txSeq=0;
    this._active=null;
    this._history=[];
    this._diagnostics=[];
    this._maxHistory=128;
    this.syncLegacyRevisions();
  }
  generations(){return cloneGenerations(this._generations);}
  generation(kind){return this._generations[kind]||0;}
  dirty(kind){
    if(!DIRTY.includes(kind))throw new Error(`3DLite Main Core: unknown dirty domain ${kind}`);
    this._generations[kind]=(this._generations[kind]||0)+1;
    if(kind==='geometry'||kind==='topology')this._generations.renderScene++;
    if(kind==='scene'||kind==='transform'||kind==='material')this._generations.renderScene++;
    if(kind!=='viewport')this._generations.viewport++;
    this._publishLegacy(kind);
    return this._generations[kind];
  }
  syncLegacyRevisions(){
    const s=Number(root.__3DLiteSceneRevision)||0;
    const g=Number(root.__3DLiteGeometryRevision)||0;
    this._generations.scene=Math.max(this._generations.scene,s);
    this._generations.geometry=Math.max(this._generations.geometry,g);
    return this.generations();
  }
  _publishLegacy(kind){
    if(kind==='scene'||kind==='transform'||kind==='material')root.__3DLiteSceneRevision=Math.max(Number(root.__3DLiteSceneRevision)||0,this._generations.scene);
    if(kind==='geometry'||kind==='topology')root.__3DLiteGeometryRevision=Math.max(Number(root.__3DLiteGeometryRevision)||0,this._generations.geometry);
  }
  transaction(label,operation,validate){
    if(this._active)throw new Error('3DLite Main Core: nested authoritative transaction is not allowed');
    if(typeof operation!=='function')throw new TypeError('3DLite Main Core: transaction operation must be a function');
    const tx={id:++this._txSeq,label:String(label||'transaction'),startedAt:now(),state:'active'};
    this._active=tx;
    let result;
    try{
      result=operation();
      const packet=(result&&typeof result==='object'&&('value'in result||'undo'in result||'dirty'in result))?result:{value:result};
      if(validate&&validate(packet.value,packet)===false)throw new Error(`3DLite Main Core: validation failed for ${tx.label}`);
      const dirty=Array.isArray(packet.dirty)?packet.dirty:(packet.dirty?[packet.dirty]:[]);
      for(const kind of dirty)this.dirty(kind);
      tx.state='committed';tx.elapsedMs=now()-tx.startedAt;tx.dirty=dirty.slice();
      this._remember(tx);
      return packet.value;
    }catch(error){
      try{if(result&&typeof result.undo==='function')result.undo();}catch(rollbackError){this._diagnostics.push({type:'rollback-failure',label:tx.label,error:String(rollbackError)});}
      tx.state='rolled-back';tx.elapsedMs=now()-tx.startedAt;tx.error=String(error?.message||error);
      this._remember(tx);
      throw error;
    }finally{this._active=null;}
  }
  _remember(tx){this._history.push(Object.freeze({...tx}));if(this._history.length>this._maxHistory)this._history.shift();}
  history(){return this._history.slice();}
  diagnostics(){return this._diagnostics.slice();}
  renderStamp(){
    this.syncLegacyRevisions();
    return Object.freeze({version:VERSION,scene:this._generations.scene,geometry:this._generations.geometry,topology:this._generations.topology,transform:this._generations.transform,material:this._generations.material,renderScene:this._generations.renderScene});
  }
  status(){return Object.freeze({name:'3DLite Main Core',version:VERSION,mode:this.mode,authoritativeDomains:Object.freeze(DIRTY.slice()),activeTransaction:this._active?Object.freeze({...this._active}):null,generations:this.generations(),historyCount:this._history.length,diagnosticsCount:this._diagnostics.length});}
}
const existing=root.ThreeDLiteMainCore;
if(existing&&existing.version===VERSION)return;
const core=new ThreeDLiteMainCoreV1();
Object.defineProperty(root,'ThreeDLiteMainCore',{value:core,writable:false,configurable:false,enumerable:true});
root.__3DLiteMainCoreV1=true;
})(typeof globalThis!=='undefined'?globalThis:window);
