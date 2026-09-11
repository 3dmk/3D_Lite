from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
OLD='3.97.8'; NEW='3.97.9'
assert OLD in s, 'expected v3.97.8 baseline'
s=s.replace(OLD,NEW)

# Add live bucket callback to the fast/direct renderer only.
marker='var BasicDirectRenderer=Object.freeze({'
start=0; patched=0
needle='      perf16.yields++;\n    },onProgress);'
insert="""      try{window.ThreeDLiteRenderWindow3979?.tile?.(job,width,height,rgba,tile,{total:tiles16.length});}catch(_){}
      perf16.yields++;
    },onProgress);"""
while True:
    i=s.find(marker,start)
    if i<0: break
    j=s.find('\n\n/*',i)
    if j<0: j=len(s)
    section=s[i:j]
    if needle in section:
        section=section.replace(needle,insert,1)
        s=s[:i]+section+s[j:]
        patched+=1
        start=i+len(section)
    else:
        start=j
assert patched>=1, 'BasicDirectRenderer tile hook not patched'

# Emit explicit renderer stage changes from orchestration points.
def rep(old,new,count=1,required=True):
    global s
    n=s.count(old)
    if required: assert n>=count, f'missing patch anchor: {old[:80]!r}'
    s=s.replace(old,new,count)

rep("""    let t=RenderProfiler16.begin();
    let e=RenderCore1.createExecution(job);
    RenderPerformanceRuntime16.markStage(job,'geometry',t);""",
"""    try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Geometry',0);}catch(_){}
    let t=RenderProfiler16.begin();
    let e=RenderCore1.createExecution(job);
    RenderPerformanceRuntime16.markStage(job,'geometry',t);
    try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Geometry',1);}catch(_){}""")
rep("""    t=RenderProfiler16.begin();
    e=await RenderCore1.prepareExecution(e,pool,onProgress);
    RenderPerformanceRuntime16.markStage(job,'worker',t);""",
"""    try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Worker Geometry',0);}catch(_){}
    t=RenderProfiler16.begin();
    e=await RenderCore1.prepareExecution(e,pool,onProgress);
    RenderPerformanceRuntime16.markStage(job,'worker',t);
    try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Worker Geometry',1);}catch(_){}""")
rep("""    t=RenderProfiler16.begin();
    e=RenderCore1.buildAcceleration(e);
    RenderPerformanceRuntime16.markStage(job,'bvh',t);""",
"""    try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'BVH',0);}catch(_){}
    t=RenderProfiler16.begin();
    e=RenderCore1.buildAcceleration(e);
    RenderPerformanceRuntime16.markStage(job,'bvh',t);
    try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'BVH',1);}catch(_){}""")
rep("""    t=performance.now();
    const baseShading=RenderCore2.compileShading(job);
    e.shading=RenderCoreE.prepareShading(job,e.acceleration,baseShading);
    RenderPerformanceRuntime16.markStage(job,'shading',t);""",
"""    try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Shading',0);}catch(_){}
    t=performance.now();
    const baseShading=RenderCore2.compileShading(job);
    e.shading=RenderCoreE.prepareShading(job,e.acceleration,baseShading);
    RenderPerformanceRuntime16.markStage(job,'shading',t);
    try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Shading',1);}catch(_){}""")
rep("""      const activeRenderer=RendererMasterCore.rendererFor(job);
      const diagnostic=await activeRenderer.render(job,job.acceleration,ratio=>{""",
"""      const activeRenderer=RendererMasterCore.rendererFor(job);
      try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Rendering',0);}catch(_){}
      const diagnostic=await activeRenderer.render(job,job.acceleration,ratio=>{
        try{window.ThreeDLiteRenderWindow3979?.renderProgress?.(job,ratio);}catch(_){}""")
rep("""      job.beautyFrame=diagnostic;
      const selectedChannel=document.getElementById('rfChannel')?.value||'Beauty';""",
"""      job.beautyFrame=diagnostic;
      try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Composite',0);}catch(_){}
      const selectedChannel=document.getElementById('rfChannel')?.value||'Beauty';""")
rep("""      if(!RenderFramework.showChannel(selectedChannel))RenderFramework.ui.frameBuffer.present(diagnostic);
      RenderFramework.updateFrameActions();""",
"""      if(!RenderFramework.showChannel(selectedChannel))RenderFramework.ui.frameBuffer.present(diagnostic);
      RenderFramework.updateFrameActions();
      try{window.ThreeDLiteRenderWindow3979?.stage?.(job,'Composite',1);}catch(_){}""")

css=r'''
<style id="__3DLiteRenderWindowLive3979Style">
#renderCanvasWrap{overflow:hidden!important;display:block!important;position:relative!important;touch-action:none;cursor:default}
#renderCanvas{position:absolute!important;left:50%;top:50%;max-width:none!important;max-height:none!important;transform-origin:center center;image-rendering:auto;box-shadow:0 0 0 1px #222}
#renderCanvasWrap.render-pan-active{cursor:grabbing!important}
#rfZoomReadout3979{min-width:48px;text-align:center;font-variant-numeric:tabular-nums}
#renderLiveHud3979{position:absolute;left:10px;top:10px;z-index:18;min-width:250px;max-width:55%;pointer-events:none;background:rgba(18,18,18,.82);border:1px solid #4a4a4a;border-radius:3px;padding:6px 8px;color:#ddd;font:11px/1.35 Consolas,"Courier New",monospace;box-shadow:0 4px 14px rgba(0,0,0,.35)}
#renderLiveStage3979{font-weight:700;color:#f0f0f0;margin-bottom:4px}
#renderLiveStageTrack3979{height:5px;background:#262626;border:1px solid #4c4c4c;margin:3px 0 4px;overflow:hidden}
#renderLiveStageFill3979{height:100%;width:0%;background:#9a9a9a;transition:width .06s linear}
#renderLiveDetail3979{color:#bdbdbd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#renderBucketMarker3979{display:none;position:absolute;z-index:16;pointer-events:none;border:1px solid rgba(255,255,255,.9);box-shadow:0 0 0 1px rgba(0,0,0,.8) inset,0 0 8px rgba(255,255,255,.22)}
#renderProgressDot3979{display:none;position:absolute;z-index:17;pointer-events:none;width:9px;height:9px;border:1px solid #fff;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 0 0 1px #000,0 0 8px #fff;animation:renderDotPulse3979 .65s infinite alternate}
@keyframes renderDotPulse3979{from{opacity:.35;transform:translate(-50%,-50%) scale(.75)}to{opacity:1;transform:translate(-50%,-50%) scale(1.25)}}
#renderProgress{width:190px!important}
</style>
'''
assert '</head>' in s
s=s.replace('</head>',css+'\n</head>',1)

script=r'''
<script id="__3DLiteRenderWindowLive3979">
/* 3DLite v3.97.9 — movable/zoomable live render framebuffer + bucket/progressive progress */
(()=>{
  'use strict';
  const VERSION='3.97.9';
  const state={panX:0,panY:0,drag:false,lastX:0,lastY:0,space:false,bucketCount:0,bucketTotal:0,lastStage:'Idle',stageRatio:0,lastJobId:null,installed:false};
  const $=id=>document.getElementById(id);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const activeJob=()=>window.RenderFramework?.jobs?.activeJob||null;
  function ui(){
    const wrap=$('renderCanvasWrap'),canvas=$('renderCanvas'); if(!wrap||!canvas)return null;
    if(!$('renderLiveHud3979')){
      const hud=document.createElement('div');hud.id='renderLiveHud3979';
      hud.innerHTML='<div id="renderLiveStage3979">Idle</div><div id="renderLiveStageTrack3979"><div id="renderLiveStageFill3979"></div></div><div id="renderLiveDetail3979">Ready</div>';
      wrap.appendChild(hud);
      const bucket=document.createElement('div');bucket.id='renderBucketMarker3979';wrap.appendChild(bucket);
      const dot=document.createElement('div');dot.id='renderProgressDot3979';wrap.appendChild(dot);
    }
    const toolbar=$('renderToolbar');
    if(toolbar&&!$('rfResetView3979')){
      const reset=document.createElement('button');reset.id='rfResetView3979';reset.type='button';reset.textContent='Reset View';reset.title='Center render image and reset pan';
      const z=document.createElement('button');z.id='rfZoomReadout3979';z.type='button';z.textContent='100%';z.title='Current render image zoom; click for 100%';
      const anchor=$('rfRegion');toolbar.insertBefore(reset,anchor||null);toolbar.insertBefore(z,anchor||null);
      reset.addEventListener('click',()=>{state.panX=0;state.panY=0;window.RenderFramework?.ui?.frameBuffer?.fit?.();applyTransform();});
      z.addEventListener('click',()=>{state.panX=0;state.panY=0;window.RenderFramework?.ui?.frameBuffer?.setZoom?.(1);applyTransform();});
    }
    return {wrap,canvas};
  }
  function zoom(){return Number(window.RenderFramework?.ui?.frameBuffer?.zoom)||1;}
  function applyTransform(){
    const x=ui();if(!x)return;
    x.canvas.style.transform=`translate(-50%,-50%) translate(${state.panX}px,${state.panY}px)`;
    const zr=$('rfZoomReadout3979');if(zr)zr.textContent=Math.round(zoom()*100)+'%';
    repositionMarker();
  }
  function stage(job,name,ratio=0){
    ui();
    const jid=job?.id??null;if(jid!==state.lastJobId){state.lastJobId=jid;state.bucketCount=0;state.bucketTotal=0;}
    state.lastStage=String(name||'Rendering');state.stageRatio=clamp(Number(ratio)||0,0,1);
    const st=$('renderLiveStage3979'),fill=$('renderLiveStageFill3979');
    if(st)st.textContent=state.lastStage;if(fill)fill.style.width=(state.stageRatio*100).toFixed(1)+'%';
  }
  function detail(text){const e=$('renderLiveDetail3979');if(e)e.textContent=String(text||'');}
  function renderProgress(job,ratio){
    stage(job,'Rendering',ratio);
    const meta=job?.previewFrame?.metadata||{};
    if(meta.currentPass!=null){
      const max=meta.maxSamples||job?.settings?.maxSamples||0;
      detail(`Progressive • pass ${meta.currentPass}/${max||'—'} • ${Math.round(clamp(ratio,0,1)*100)}%`);
    }else if(state.bucketTotal){
      detail(`Bucket ${state.bucketCount}/${state.bucketTotal} • ${Math.round(clamp(ratio,0,1)*100)}%`);
    }else detail(`Rendering • ${Math.round(clamp(ratio,0,1)*100)}%`);
  }
  function ensureCanvasSize(width,height){
    const fb=window.RenderFramework?.ui?.frameBuffer;if(!fb)return;
    if(fb.canvas.width!==width||fb.canvas.height!==height){
      fb.resize(width,height);
      state.panX=0;state.panY=0;applyTransform();
    }
    const n=$('renderFrameNotice');if(n)n.style.display='none';
  }
  function tile(job,width,height,rgba,tile,meta={}){
    try{
      ui();ensureCanvasSize(width,height);
      const fb=window.RenderFramework?.ui?.frameBuffer;if(!fb?.ctx)return;
      const pixels=rgba instanceof Uint8ClampedArray?rgba:new Uint8ClampedArray(rgba);
      const img=new ImageData(pixels,width,height);
      fb.ctx.putImageData(img,0,0,tile.x,tile.y,tile.width,tile.height);
      fb.lastUpdated=performance.now();
      state.bucketCount++;
      state.bucketTotal=Math.max(state.bucketTotal,Number(meta.total)||state.bucketTotal||1);
      if(job?.progress){job.progress.currentSamples=state.bucketCount;job.progress.maximumSamples=state.bucketTotal;}
      stage(job,'Bucket Rendering',state.bucketTotal?state.bucketCount/state.bucketTotal:0);
      detail(`Bucket ${state.bucketCount}/${state.bucketTotal||'—'} • x:${tile.x} y:${tile.y} • ${tile.width}×${tile.height}`);
      showBucket(tile);
    }catch(_){ }
  }
  function showBucket(tile){
    const wrap=$('renderCanvasWrap'),canvas=$('renderCanvas'),m=$('renderBucketMarker3979');if(!wrap||!canvas||!m)return;
    const wr=wrap.getBoundingClientRect(),cr=canvas.getBoundingClientRect();
    const sx=cr.width/Math.max(1,canvas.width),sy=cr.height/Math.max(1,canvas.height);
    m.style.display='block';m.style.left=(cr.left-wr.left+tile.x*sx)+'px';m.style.top=(cr.top-wr.top+tile.y*sy)+'px';m.style.width=Math.max(1,tile.width*sx)+'px';m.style.height=Math.max(1,tile.height*sy)+'px';
  }
  function showProgressive(frame){
    const meta=frame?.metadata||{};if(meta.currentPass==null)return;
    const wrap=$('renderCanvasWrap'),canvas=$('renderCanvas'),dot=$('renderProgressDot3979'),bucket=$('renderBucketMarker3979');if(!wrap||!canvas||!dot)return;
    if(bucket)bucket.style.display='none';
    const pass=Math.max(1,Number(meta.currentPass)||1),max=Math.max(pass,Number(meta.maxSamples)||pass);
    const j=activeJob();if(j?.progress){j.progress.currentSamples=pass;j.progress.maximumSamples=max;j.progress.noise=Number.isFinite(Number(meta.noise))?Number(meta.noise):j.progress.noise;}
    stage(j,'Progressive Rendering',pass/max);
    detail(`Progressive pass ${pass}/${max} • samples/pixel ${Number(meta.samplesPerPixel||0).toFixed(2)}${meta.noise!=null?' • noise '+Number(meta.noise).toFixed(4):''}`);
    const wr=wrap.getBoundingClientRect(),cr=canvas.getBoundingClientRect();
    const px=((pass*97)%Math.max(1,canvas.width)),py=((pass*53)%Math.max(1,canvas.height));
    dot.style.left=(cr.left-wr.left+(px/canvas.width)*cr.width)+'px';dot.style.top=(cr.top-wr.top+(py/canvas.height)*cr.height)+'px';dot.style.display='block';
  }
  function present(frame){
    showProgressive(frame);
    const meta=frame?.metadata||{};
    if(meta.currentPass==null){const d=$('renderProgressDot3979');if(d)d.style.display='none';}
    applyTransform();
  }
  function progress(p){
    ui();
    const status=String(p?.status||'Idle');
    if(/finished/i.test(status)){stage(activeJob(),'Complete',1);detail('Render complete');const b=$('renderBucketMarker3979');if(b)b.style.display='none';const d=$('renderProgressDot3979');if(d)d.style.display='none';}
    else if(/cancel/i.test(status)){detail('Render cancelled • completed pixels preserved');}
    else if(/error/i.test(status)){detail('Render error • see Debug List');}
    else if(/paused/i.test(status)){detail('Paused • rendered pixels preserved');}
    const e=$('renderLiveDetail3979');
    if(e&&p?.elapsedMs>0&&!/complete|cancel|error/i.test(e.textContent))e.textContent+=' • '+(p.elapsedMs/1000).toFixed(1)+'s';
  }
  function repositionMarker(){
    const job=activeJob();const t=job?.__liveTile3979;if(t)showBucket(t);
  }
  function installInteractions(){
    const x=ui();if(!x||x.wrap.dataset.live3979==='1')return;
    x.wrap.dataset.live3979='1';
    x.wrap.addEventListener('wheel',e=>{
      const fb=window.RenderFramework?.ui?.frameBuffer;if(!fb)return;
      e.preventDefault();
      const r=x.wrap.getBoundingClientRect(),mx=e.clientX-r.left-r.width/2,my=e.clientY-r.top-r.height/2;
      const old=zoom(),next=clamp(old*(e.deltaY<0?1.15:1/1.15),.1,8);
      const ix=(mx-state.panX)/old,iy=(my-state.panY)/old;
      state.panX=mx-ix*next;state.panY=my-iy*next;fb.setZoom(next);applyTransform();
    },{passive:false});
    x.wrap.addEventListener('pointerdown',e=>{
      if(e.button===1||(e.button===0&&state.space)){
        e.preventDefault();state.drag=true;state.lastX=e.clientX;state.lastY=e.clientY;x.wrap.classList.add('render-pan-active');x.wrap.setPointerCapture?.(e.pointerId);
      }
    });
    x.wrap.addEventListener('pointermove',e=>{if(!state.drag)return;state.panX+=e.clientX-state.lastX;state.panY+=e.clientY-state.lastY;state.lastX=e.clientX;state.lastY=e.clientY;applyTransform();});
    const end=e=>{if(!state.drag)return;state.drag=false;x.wrap.classList.remove('render-pan-active');try{x.wrap.releasePointerCapture?.(e.pointerId);}catch(_){}};
    x.wrap.addEventListener('pointerup',end);x.wrap.addEventListener('pointercancel',end);
    window.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||'')){state.space=true;}});
    window.addEventListener('keyup',e=>{if(e.code==='Space')state.space=false;});
    window.addEventListener('resize',()=>applyTransform());
  }
  function install(){
    if(state.installed)return true;
    const rf=window.RenderFramework,fb=rf?.ui?.frameBuffer;if(!rf||!fb)return false;
    state.installed=true;ui();installInteractions();
    const origSet=fb.setZoom.bind(fb);fb.setZoom=function(v){const r=origSet(v);applyTransform();return r;};
    const origFit=fb.fit.bind(fb);fb.fit=function(){state.panX=0;state.panY=0;const r=origFit();applyTransform();return r;};
    const origPresent=fb.present.bind(fb);fb.present=function(frame){const r=origPresent(frame);present(frame);return r;};
    const origUpdate=rf.ui.updateProgress.bind(rf.ui);rf.ui.updateProgress=function(p){origUpdate(p);progress(p);};
    applyTransform();
    return true;
  }
  function start(){if(!install())setTimeout(start,100);}
  window.ThreeDLiteRenderWindow3979=Object.freeze({version:VERSION,stage,renderProgress,tile,present,progress,resetView(){state.panX=0;state.panY=0;window.RenderFramework?.ui?.frameBuffer?.fit?.();applyTransform();},snapshot(){return Object.freeze({...state,zoom:zoom()});}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0));else setTimeout(start,0);
})();
</script>
'''
assert '__3DLiteRenderWindowLive3979' not in s
assert '</body>' in s
s=s.replace('</body>',script+'\n</body>',1)

# Fix tile marker state reference for repositioning without copying RGBA.
s=s.replace("      state.bucketCount++;\n      state.bucketTotal=", "      job.__liveTile3979={x:tile.x,y:tile.y,width:tile.width,height:tile.height};\n      state.bucketCount++;\n      state.bucketTotal=",1)

p.write_text(s,encoding='utf-8')
print('patched',NEW,'direct renderers',patched)
