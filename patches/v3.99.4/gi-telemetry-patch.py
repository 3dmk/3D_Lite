from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

def replace_once(old,new,label):
    global s
    if new in s:
        return
    count=s.count(old)
    if count!=1:
        raise SystemExit(f'release-blocking {label} anchor count={count}')
    s=s.replace(old,new,1)

replace_once('<title>3DLite v3.99.3 L3N GitHub Runtime</title>','<title>3DLite v3.99.4 L3N GitHub Runtime</title>','title')
replace_once("const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.99.3'});","const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.99.4'});",'central version')
replace_once("const VERSION='3.99.2';\nconst root=window;","const VERSION='3.99.4';\nconst root=window;",'telemetry version')

replace_once(
"""  const rendererPerformance=metadata?.performance||null;
  const finalPerformance=job?.performance||null;
  const workerStats=jobs()?.workerStats?.()||null;""",
"""  const rendererPerformance=metadata?.performance||null;
  const finalPerformance=job?.performance||null;
  const giDiagnostics=job?.settings?.engine==='path' ? Object.freeze({
    renderer:metadata?.renderer||null,
    engine:'path',
    globalIllumination:job?.settings?.globalIllumination!==false,
    primaryGI:job?.settings?.primaryGI||null,
    secondaryGI:metadata?.secondaryGI||job?.settings?.secondaryGI||null,
    samplesPerPixel:Number(metadata?.samplesPerPixel)||0,
    passes:Number(metadata?.passes)||0,
    maxBounces:Number(metadata?.maxBounces)||Number(job?.settings?.maxBounces)||0,
    estimator:metadata?.estimator||null,
    mis:metadata?.mis===true,
    russianRoulette:metadata?.russianRoulette===true,
    importanceSampling:metadata?.importanceSampling||null,
    noise:Number.isFinite(Number(metadata?.noise))?Number(metadata.noise):null,
    transmission:metadata?.transmission===true,
    progressive:metadata?.progressive===true,
    adaptive:metadata?.adaptive===true,
    minSamples:Number(job?.settings?.minSamples)||0,
    maxSamples:Number(job?.settings?.maxSamples)||0,
    noiseThreshold:Number(job?.settings?.noiseThreshold)||0,
    lightCache:clone(metadata?.lightCache||null),
    emissiveTriangleLights:Number(metadata?.emissiveTriangleLights)||0,
    rendererDiagnostics:clone(metadata?.diagnostics||null),
    cameraRays:Number(rendererPerformance?.cameraRays)||0,
    pathRays:Number(rendererPerformance?.pathRays)||0,
    shadowRays:Number(rendererPerformance?.shadowRays)||0,
    probeRays:Number(rendererPerformance?.probeRays)||0,
    totalRays:Number(rendererPerformance?.totalRays)||0,
    samples:Number(rendererPerformance?.samples)||0,
    raysPerSecond:Number(rendererPerformance?.raysPerSecond)||0,
    stageMs:clone(rendererPerformance?.stageMs||null),
    pathGuiding:job?.settings?.pathGuiding===true,
    lightTree:job?.settings?.lightTree===true,
    acceleration:job?.settings?.acceleration||null
  }) : null;
  const workerStats=jobs()?.workerStats?.()||null;""",
'GI diagnostics insertion')

replace_once(
"""    fastDiagnostics:clone(fastDiagnostics),
    rendererPerformance:clone(rendererPerformance),""",
"""    fastDiagnostics:clone(fastDiagnostics),
    giDiagnostics:clone(giDiagnostics),
    rendererPerformance:clone(rendererPerformance),""",
'GI snapshot field')

replace_once(
"root.ThreeDLiteLiteTraceTelemetry3992=Object.freeze({version:VERSION,snapshot,currentJob});",
"root.ThreeDLiteLiteTraceTelemetry3994=Object.freeze({version:VERSION,snapshot,currentJob});\nroot.ThreeDLiteLiteTraceTelemetry3992=root.ThreeDLiteLiteTraceTelemetry3994;",
'telemetry alias')
replace_once(
"root.__3DLiteLiteTraceTelemetry3992=true;",
"root.__3DLiteLiteTraceTelemetry3994=true;\nroot.__3DLiteLiteTraceTelemetry3992=true;",
'telemetry marker')

p.write_text(s,encoding='utf-8')
