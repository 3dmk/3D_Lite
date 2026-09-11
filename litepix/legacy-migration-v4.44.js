(function(root){'use strict';
const VERSION='4.44.0';
const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return null;}};
const getJob=()=>root.RenderFramework?.jobs?.activeJob||root.RenderFramework?.jobs?.lastJob||null;
const registry=Object.freeze([
  {legacy:'Render jobs / active-last job',target:'LitePix Core1',status:'implemented'},
  {legacy:'LiteTrace execution context',target:'LitePix Core1 + Path runtime',status:'merged'},
  {legacy:'Fast renderer diagnostics',target:'Core1/Core8 telemetry',status:'replaced'},
  {legacy:'Renderer performance telemetry',target:'Core8',status:'improved'},
  {legacy:'Worker statistics',target:'Core2/Core8',status:'improved'},
  {legacy:'Path primary/bounce traversal',target:'Core2 packed SAH BLAS/TLAS',status:'improved'},
  {legacy:'Shadow visibility',target:'Core2 any-hit traversal',status:'improved'},
  {legacy:'BVH acceleration',target:'Core2 BLAS/TLAS + cache/refit',status:'improved'},
  {legacy:'Direct-light normal handling',target:'Path surface interpolation',status:'preserved'},
  {legacy:'Material linear color behavior',target:'Core6 + compatibility path',status:'preserved'},
  {legacy:'GI / indirect lighting',target:'Core4 + Light Cache',status:'implemented'},
  {legacy:'Light Cache',target:'Path GI + Core4 infrastructure',status:'preserved'},
  {legacy:'G-buffer / raster guides',target:'Core3',status:'added'},
  {legacy:'Spatial/temporal reuse',target:'Core5',status:'added'},
  {legacy:'PBR/material validation',target:'Core6',status:'implemented'},
  {legacy:'Tiles/AOV/checkpoints',target:'Core7',status:'implemented'},
  {legacy:'Runtime telemetry/quality/hardware advice',target:'Core8',status:'implemented'},
  {legacy:'Historical MaxPix symbol-by-symbol API',target:'LitePix',status:'unverified-source'}
]);
const aliases=Object.freeze({
  renderer:['engine','renderer','renderEngine','mode'],
  bounces:['bounces','maxBounces','rayDepth','depth'],
  minSamples:['minSamples','samplesMin'],
  maxSamples:['maxSamples','samples','spp'],
  noise:['noise','noiseThreshold','adaptiveThreshold'],
  exposure:['exposure','ev'],
  width:['width','renderWidth'],height:['height','renderHeight']
});
function pick(src,names){for(const n of names)if(src&&src[n]!==undefined)return src[n];}
function normalizeSettings(src={}){const out={...src};for(const [dst,names] of Object.entries(aliases)){const v=pick(src,names);if(v!==undefined)out[dst]=v;}if(out.renderer!==undefined&&out.engine===undefined)out.engine=out.renderer;if(out.engine!==undefined)out.engine=String(out.engine).toLowerCase();return out;}
function capabilities(){return Object.freeze({
  core1:!!root.LitePix,core2:!!root.__LitePixCore2Production419,core3:!!root.__LitePixCore3Production423,
  core4:!!root.__LitePixCore4Production427,core5:!!root.__LitePixCore5Production431,core6:!!root.__LitePixCore6Production435,
  core7:!!root.__LitePixCore7Production439,core8:!!root.__LitePixCore8Production443,
  cores4to8:!!root.__LitePixCores4to8Production443,materialLinearFix:!!root.__3DLiteMaterialLinearColor3996,
  renderFramework:!!root.RenderFramework,pathRuntime:typeof root.PathGIRenderer!=='undefined'||!!root.RenderFramework,
  legacyLiteTraceContext:!!root.LiteTraceExecutionContext
});}
function telemetry(){const job=getJob(),frame=job?.beautyFrame||null,meta=frame?.metadata||null;return Object.freeze({
  schema:3,version:VERSION,software:'3D Lite',renderer:'LitePix',jobId:job?.id||null,status:job?.status||job?.progress?.status||null,
  progress:clone(job?.progress?.snapshot?.()||job?.progress||null),rendererName:meta?.renderer||null,
  fastDiagnostics:clone(job?.settings?.engine==='fast'?meta?.diagnostics||null:null),rendererPerformance:clone(meta?.performance||null),
  finalPerformance:clone(job?.performance||null),workerStats:clone(root.RenderFramework?.jobs?.workerStats?.()||null),
  litePix:{core2:clone(meta?.litePixCore2Production||null),core3:clone(meta?.litePixCore3Production||null),cores4to8:clone(meta?.litePixCores4to8Production||null)}
});}
function audit(){const caps=capabilities(),missing=Object.entries(caps).filter(([k,v])=>k!=='legacyLiteTraceContext'&&!v).map(([k])=>k);const unresolved=registry.filter(x=>x.status==='unverified-source');return Object.freeze({
  version:VERSION,software:'3D Lite',renderer:'LitePix',registry,capabilities:caps,missingRuntimeCapabilities:missing,
  operationalComplete:missing.length===0,historicalComplete:missing.length===0&&unresolved.length===0,
  unresolved:unresolved.map(x=>x.legacy),note:unresolved.length?'Historical MaxPix source/API was not found as a separately identifiable module in the protected pre-LitePix repository, so symbol-by-symbol certification remains intentionally false.':'All registered legacy surfaces certified.'
});}
const api=Object.freeze({version:VERSION,registry,aliases,normalizeSettings,capabilities,telemetry,audit,currentJob:getJob});
root.LitePixLegacyMigration444=api;
root.ThreeDLiteRendererMigrationAudit=api;
if(!root.ThreeDLiteLiteTraceTelemetry3992)root.ThreeDLiteLiteTraceTelemetry3992=Object.freeze({version:VERSION,snapshot:telemetry,currentJob:getJob,compatibility:'LitePix v4.44'});
root.__LitePixLegacyMigration444=true;
})(typeof globalThis!=='undefined'?globalThis:window);
