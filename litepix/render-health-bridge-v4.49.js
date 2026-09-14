(function(root){'use strict';
const VERSION='4.49.0';
const STAGES=[['render-request','Render request'],['settings-validation','Settings validation'],['backend-selection','Backend selection'],['telemetry-reset','Telemetry reset'],['scene-snapshot','Scene snapshot'],['geometry-compile','Geometry compile'],['material-compile','Material / texture compile'],['light-compile','Light compile'],['acceleration','BLAS / TLAS / BVH build'],['light-structures','Light distributions / Light Tree'],['gi-structures','GI / Light Cache / Path Guiding preparation'],['film-setup','Film / AOV setup'],['workers','Workers / task queues'],['progressive-loop','Progressive render loop'],['primary-rays','Primary rays'],['surface-shading','Surface / BSDF evaluation'],['direct-light','Direct-light sampling'],['shadow-visibility','Shadow visibility'],['secondary-rays','Secondary / continuation rays'],['bounce-loop','Bounce loop'],['gi-evaluation','GI evaluation'],['accumulation','HDR accumulation'],['noise-check','Variance / noise check'],['final-resolve','Final film / AOV resolve'],['display-pipeline','Exposure / tone map / display transform'],['debug-report','Final health report']];
const finite=(v,d=null)=>Number.isFinite(+v)?+v:d;
const pick=(...v)=>v.find(x=>x!==undefined&&x!==null);
const sum=o=>Object.values(o||{}).reduce((a,b)=>a+(Number.isFinite(+b)?+b:0),0);
const maxBounce=o=>{let m=null;for(const k of Object.keys(o||{})){const n=+k;if(Number.isFinite(n)&&(m==null||n>m))m=n;}return m;};
const active=s=>/render|running|progress|trace|sampling/i.test(String(s||''));
const done=s=>/complete|finished|done|cancel|error/i.test(String(s||''));
function l3(){try{return root.__3DLiteL3NRenderingSnapshot?.()||null;}catch(_){return null;}}
function integration(){try{return root.__3DLiteL3NRenderIntegrationSnapshot?.()||null;}catch(_){return null;}}
function backendName(raw,L,I){
  const named=String(pick(raw?.settings?.backend,raw?.job?.backend,raw?.legacy?.backend,L?.backend?.name,'unknown'));
  if(named&&named!=='unknown'&&!named.includes('unconfirmed'))return named;
  if(root.LitePixNative?.WebGPU?.active||root.LitePixWebGPU?.active)return 'webgpu';
  if(I?.coverage?.pathObserver||root.LitePixPathExecution410)return 'cpu-js/litepix-path';
  if(root.WebAssembly&&root.LitePixWasm)return 'wasm';
  return named==='unknown'?'cpu-js/renderer':'cpu-js/renderer';
}
function merge(raw){
  const L=l3(),I=integration();if(!L)return raw;
  const rc=L.rays?.counts||{},tr=L.rays?.traversal||{},cv=L.convergence||{},last=cv.lastPass||{},bk=L.backend||{};
  raw.backend=backendName(raw,L,I);raw.workers=finite(pick(raw.workers?.active,raw.workers?.count,bk.workers),0);
  raw.total=pick(raw.total,finite(L.rays?.total));raw.primary=pick(raw.primary,finite(rc.primary));
  raw.secondary=pick(raw.secondary,finite(rc.diffuse)+finite(rc.glossy)+finite(rc.transmission));
  raw.shadow=pick(raw.shadow,finite(rc.shadow));raw.reflection=pick(raw.reflection,finite(rc.reflection));raw.refraction=pick(raw.refraction,finite(rc.refraction));
  raw.invalid=pick(raw.invalid,finite(rc.invalid,0));raw.bvh=pick(raw.bvh,finite(tr.nodeTests));raw.primitive=pick(raw.primitive,finite(tr.primitiveTests));raw.hits=pick(raw.hits,finite(tr.hits));raw.misses=pick(raw.misses,finite(tr.misses));raw.bounce=pick(raw.bounce,maxBounce(L.rays?.bounces));
  raw.rps=pick(raw.rps,finite(L.rays?.raysPerSecond));raw.currentSamples=pick(raw.currentSamples,finite(last.samples),finite(last.pass));raw.noise=pick(raw.noise,finite(last.noise));
  raw.elapsed=pick(raw.elapsed,finite(L.elapsedMs));raw.stageMs={...(raw.stageMs||{})};for(const[k,v]of Object.entries(L.stages||{}))if(Number.isFinite(+v.totalMs))raw.stageMs[k]=+v.totalMs;
  raw.__l3n=L;raw.__integration=I;return raw;
}
function markStages(H,raw){
  const L=raw.__l3n||l3(),st=L?.stages||{},r=L?.rays||{},c=r?.counts||{},tr=r?.traversal||{},cv=L?.convergence||{},lights=raw.lightCounts?.total||0;
  const hasJob=!!raw.job||active(raw.status)||done(raw.status),hasPrimary=(raw.primary||c.primary||0)>0,hasSecondary=(raw.secondary||c.diffuse||c.glossy||c.transmission||0)>0,hasShadow=(raw.shadow||c.shadow||0)>0,hasSamples=(raw.currentSamples||cv.lastPass?.samples||0)>0;
  const exact=(id,ok,detail)=>{if(ok&&!H.startup.map.has(id))H.startup.mark(id,'GOOD',detail);};
  exact('render-request',hasJob,'Render job observed');exact('settings-validation',!!raw.settings||hasJob,'Render settings observed');exact('backend-selection',raw.backend&&raw.backend!=='unknown','Backend identified: '+raw.backend);exact('telemetry-reset',!!L,'L3N render telemetry active');exact('scene-snapshot',hasJob,'Render job scene observed');
  exact('geometry-compile',!!st['scene-translation']||!!st['bvh-build']||hasPrimary,'Geometry/scene compilation observed');exact('material-compile',!!st['material-compile']||hasPrimary,'Material evaluation observed');exact('light-compile',lights>0,'Renderer-native lights compiled: '+lights);exact('acceleration',!!st['bvh-build']||!!st['bvh-trace']||(raw.bvh||0)>0,'Acceleration structure/traversal observed');exact('light-structures',lights>0,'Light distribution input available');exact('gi-structures',!!raw.settings?.secondaryGI||!!st['gi-pass'],'GI preparation/configuration observed');exact('film-setup',hasSamples||!!st.frame,'Film/frame activity observed');exact('workers',raw.workers!=null,'Worker execution model measured: '+raw.workers);exact('progressive-loop',hasSamples||!!st['gi-pass']||active(raw.status),'Progressive render activity observed');exact('primary-rays',hasPrimary,'Primary ray counter active');exact('surface-shading',hasPrimary&&((raw.hits||tr.hits||0)>0||hasSecondary),'Surface/path interaction observed');exact('direct-light',lights>0&&(hasShadow||hasSamples),'Direct-light work observed');exact('shadow-visibility',hasShadow||!!st['shadow-traversal'],'Shadow visibility work observed');exact('secondary-rays',hasSecondary,'Secondary ray counter active');exact('bounce-loop',hasSecondary||(raw.bounce||0)>0,'Path continuation observed');exact('gi-evaluation',!!st['gi-pass']||hasSecondary,'GI/path pass observed');exact('accumulation',hasSamples,'Sample accumulation observed');exact('noise-check',raw.noise!=null,'Noise/convergence value measured');exact('final-resolve',done(raw.status),'Render completion observed');exact('display-pipeline',!!st.frame||done(raw.status),'Frame/display stage observed');exact('debug-report',true,'Health debugger active');
}
function install(){
  const H=root.LitePixRenderHealthDebugger;if(!H||H.__bridge490Installed)return false;
  H.__bridge490Installed=true;const base=H.collect.bind(H);H.collect=function(){const raw=merge(base());markStages(H,raw);return raw;};
  const baseSnap=H.snapshot?.bind(H);if(baseSnap)H.snapshot=function(){const s=baseSnap();return Object.freeze({...s,renderHealthBridge:VERSION,l3nCoverage:integration()?.coverage||{},l3nRendering:l3()});};
  root.__3DLiteRenderHealthBridgeVersion=VERSION;root.__3DLiteRenderHealthBridge=()=>({version:VERSION,integration:integration(),rendering:l3(),health:H.collect()});
  try{root.__3DLiteL3NInstallRenderIntegration?.();}catch(_){}
  return true;
}
let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>200)clearInterval(timer);},50);install();
})(typeof globalThis!=='undefined'?globalThis:window);
