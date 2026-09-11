(function(root){'use strict';
const LP=root.LitePix=root.LitePix||{};
const assert=(cond,msg)=>{if(!cond)throw new Error('LitePix runtime: '+msg);};
class LitePixRuntimeV408{constructor(opts={}){this.version='4.08.0';this.opts=opts;this.telemetry=new LP.Core8.LitePixTelemetryV2();this.scene=new LP.Core2.SceneCompiler({memoryLimitBytes:opts.memoryLimitBytes||512*1024*1024});this.raster=null;this.gi=null;this.spatialReuse=new LP.Core5.SpatialReuse({radius:opts.reuseRadius||1});this.shadowCache=new LP.Core5.ShadowReuseCache();this.materials=new LP.Core6.MaterialCache();this.aovs=new LP.Core7.AOVRegistry();this.production=new LP.Core7.ProductionQueue();this.ready=false;this._bindProduction();}
_bindProduction(){this.production.on('start',j=>this._emit('litepix:production-start',j));this.production.on('done',j=>this._emit('litepix:production-done',j));this.production.on('error',j=>this._emit('litepix:production-error',j));}
_emit(type,payload){try{if(root.LitePixEventBus&&typeof root.LitePixEventBus.emit==='function')root.LitePixEventBus.emit(type,payload);}catch(_){}try{if(root.dispatchEvent&&typeof CustomEvent!=='undefined')root.dispatchEvent(new CustomEvent(type,{detail:payload}));}catch(_){}}
initialize(width=64,height=64){assert(LP.Core2&&LP.Core3&&LP.Core4&&LP.Core5&&LP.Core6&&LP.Core7&&LP.Core8,'one or more core modules missing');this.raster=new LP.Core3.RasterGuideBuilder(width,height);this.gi=new LP.Core4.HierarchicalGI(width,height,{startBlock:this.opts.startBlock||32,minBlock:1,maxLevel:6});this.ready=true;this.telemetry.setMeta({renderer:'LitePix',version:this.version,architecture:'All Cores'});this._emit('litepix:ready',{version:this.version});return this;}
compileScene(scene){assert(this.ready,'initialize first');this.telemetry.stage.begin('sceneCompile');this.scene.compile(scene||{});const ms=this.telemetry.stage.end('sceneCompile');this.telemetry.setMemory(this.scene.budget.snapshot());this._emit('litepix:scene-compiled',{ms,stats:this.scene.snapshot()});return this.scene.snapshot();}
beginFrame(){assert(this.ready,'initialize first');this.telemetry.stage.begin('frame');const g=this.raster.beginFrame();this.gi.reset();return g;}
endFrame(){const frameMs=this.telemetry.stage.end('frame');const gi=this.gi.stats();this.telemetry.setBlocks({active:gi.activeBlocks,finalized:gi.finalizedBlocks,refined:gi.refinedBlocks});const snap=this.telemetry.snapshot();snap.frameMs=frameMs;this._emit('litepix:frame-complete',snap);return snap;}
compileMaterial(m){return this.materials.compile(m);}
createDirectReservoir(lights,evaluate,rng){const s=new LP.Core5.DirectLightReservoirSampler({candidates:this.opts.directCandidates||8});return s.sample(lights,evaluate,rng);}
planTiles(w,h,tile=256,overlap=8){return new LP.Core7.TilePlanner(w,h,tile,overlap).plan();}
async benchmark(){const b=new LP.Core8.HardwareBenchmark();const result=await b.run();return{...result,recommendedProfile:b.recommend()};}
compareMetrics(before,after){return LP.Core8.QualityComparator.compare(before,after);}
legacyBridge(){return{RenderFramework:root.RenderFramework||null,LitePixVersion:root.LitePixVersion||null,ThreeDLiteVersion:root.ThreeDLiteVersion||null};}
}
function install(){if(LP.runtime&&LP.runtime.version==='4.08.0')return LP.runtime;const runtime=new LitePixRuntimeV408();LP.Runtime=LitePixRuntimeV408;LP.runtime=runtime;root.LitePixRuntime=runtime;root.__LitePixAllCores408=true;return runtime;}
LP.AllCores={version:'4.08.0',install,modules:['Core2','Core3','Core4','Core5','Core6','Core7','Core8']};
install();
})(typeof globalThis!=='undefined'?globalThis:window);
