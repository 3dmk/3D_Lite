<script id="l3n-litetrace-telemetry-3992">
(()=>{
'use strict';
const VERSION='3.99.2';
const root=window;
const A=root.ThreeDLiteAdaptiveRender3990||null;
const jobs=()=>root.RenderFramework?.jobs||null;
const currentJob=()=>jobs()?.activeJob||jobs()?.lastJob||null;
const clone=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return null;}};
const snapshot=()=>{
  const job=currentJob();
  const frame=job?.beautyFrame||null;
  const metadata=frame?.metadata||null;
  const fastDiagnostics=job?.settings?.engine==='fast' ? (metadata?.diagnostics||null) : null;
  const rendererPerformance=metadata?.performance||null;
  const finalPerformance=job?.performance||null;
  const workerStats=jobs()?.workerStats?.()||null;
  const executionContext=root.LiteTraceExecutionContext||null;
  return Object.freeze({
    schema:2,
    version:VERSION,
    generatedAt:new Date().toISOString(),
    renderer:metadata?.renderer||null,
    status:job?.status||job?.progress?.status||null,
    progress:clone(job?.progress?.snapshot?.()||job?.progress||null),
    fastDiagnostics:clone(fastDiagnostics),
    rendererPerformance:clone(rendererPerformance),
    finalPerformance:clone(finalPerformance),
    workerStats:clone(workerStats),
    execution:Object.freeze({
      activeJobId:executionContext?.activeJob?.id||null,
      performanceAttached:!!executionContext?.performance,
      controllerHasActiveJob:!!jobs()?.activeJob,
      controllerHasLastJob:!!jobs()?.lastJob
    })
  });
};
root.ThreeDLiteLiteTraceTelemetry3992=Object.freeze({version:VERSION,snapshot,currentJob});
if(A){
  const previous=A.renderDataSnapshot?.bind(A);
  A.renderDataSnapshot=()=>{
    const base=previous?previous():{};
    return Object.assign({},base,{version:VERSION,liteTrace:snapshot()});
  };
  A.version=VERSION;
  if(A.state)A.state.version=VERSION;
}
try{if(root.ThreeDLiteVersion&&typeof root.ThreeDLiteVersion==='object')root.ThreeDLiteVersion.version=VERSION;}catch(_){}
document.documentElement.dataset.liteTraceTelemetryVersion=VERSION;
root.__3DLiteLiteTraceTelemetry3992=true;
})();
</script>