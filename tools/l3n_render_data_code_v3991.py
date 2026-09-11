from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8',errors='ignore')
if '__3DLiteRenderDataCode3991' in s:
    raise SystemExit('already patched')
s=s.replace('3DLite v3.99.0','3DLite v3.99.1')
block=r'''<script id="l3n-render-data-code-3991">
(()=>{
const A=window.ThreeDLiteAdaptiveRender3990;
if(!A)return;
A.version='3.99.1'; if(A.state)A.state.version='3.99.1';
try{if(window.ThreeDLiteVersion&&typeof window.ThreeDLiteVersion==='object')window.ThreeDLiteVersion.version='3.99.1';}catch(_){}
const $=id=>document.getElementById(id);
const mapToArray=m=>m instanceof Map?[...m.entries()].map(([key,value])=>({key,value})):m;
const safeClone=v=>{try{return JSON.parse(JSON.stringify(v,(k,x)=>x instanceof Map?mapToArray(x):x));}catch(_){return null;}};
A.renderDataSnapshot=()=>{
  const S=A.state||{};
  let job=null;
  try{const rf=window.RenderFramework;job=rf?.activeJob||rf?.job||rf?.currentJob||null;}catch(_){}
  const convergence=S.convergence?{
    stableThreshold:S.convergence.stableThreshold,
    pixels:mapToArray(S.convergence.pixels),
    tiles:mapToArray(S.convergence.tiles)
  }:null;
  const lightLearning=S.lightLearning?{
    minContribution:S.lightLearning.minContribution,
    lights:mapToArray(S.lightLearning.lights)
  }:null;
  const pathLearning=S.pathLearning?{
    energyCutoff:S.pathLearning.energyCutoff,
    depth:mapToArray(S.pathLearning.depth)
  }:null;
  const cache=S.cache?{
    revision:S.cache.revision,hits:S.cache.hits,misses:S.cache.misses,
    hitRate:(S.cache.hits+S.cache.misses)?S.cache.hits/(S.cache.hits+S.cache.misses):0,
    primaryEntries:S.cache.primary?.size||0,visibilityEntries:S.cache.visibility?.size||0
  }:null;
  const guiding=S.guiding?{
    directions:mapToArray(S.guiding.dirs),
    reservoirs:mapToArray(S.guiding.reservoirs)
  }:null;
  return {
    schema:1,
    version:'3.99.1',
    generatedAt:new Date().toISOString(),
    render:{
      renderCount:S.renderCount||0,
      passCount:S.passCount||0,
      current:S.last||null,
      job:safeClone(job?.progress?.snapshot?.()||job?.progress||job?.stats||null)
    },
    passes:safeClone(S.history||[]),
    convergence,
    lights:lightLearning,
    bounces:pathLearning,
    noise:safeClone(S.noiseLearning||null),
    cache,
    guiding,
    metrics:safeClone(S.metrics||{}),
    strategy:safeClone(S.strategy||null),
    controllerMode:S.controllerMode||null,
    sceneRevision:S.sceneRevision||0
  };
};
A.compiledRenderDataCode=()=>`// 3DLite Compiled Render Data v3.99.1\nconst RenderDataProfile=${JSON.stringify(A.renderDataSnapshot(),null,2)};\n`;
A.openRenderDataCodeViewer=()=>{
  let p=$('l3nRenderDataCodeWindow3991');
  if(!p){
    p=document.createElement('div');p.id='l3nRenderDataCodeWindow3991';
    p.style.cssText='display:none;position:absolute;left:16px;right:16px;top:48px;bottom:16px;z-index:82;background:#181818;border:1px solid #555;padding:8px;box-shadow:0 8px 28px #000b';
    p.innerHTML='<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px"><b style="margin-right:auto">Compiled Render Data Code</b><button id="l3nRenderDataRefresh3991">Refresh</button><button id="l3nRenderDataCopy3991">Copy All</button><button id="l3nRenderDataClose3991">Close</button></div><textarea id="l3nRenderDataCodeText3991" spellcheck="false" style="width:100%;height:calc(100% - 34px);resize:none;background:#101010;color:#ddd;border:1px solid #444;font:11px/1.35 monospace;padding:8px"></textarea>';
    ($('renderFrameWindow')||document.body).appendChild(p);
    $('l3nRenderDataRefresh3991').onclick=()=>{$('l3nRenderDataCodeText3991').value=A.compiledRenderDataCode()};
    $('l3nRenderDataCopy3991').onclick=async()=>{const t=$('l3nRenderDataCodeText3991');t.select();try{await navigator.clipboard.writeText(t.value)}catch(_){document.execCommand('copy')}};
    $('l3nRenderDataClose3991').onclick=()=>p.style.display='none';
  }
  p.style.display='block';$('l3nRenderDataCodeText3991').value=A.compiledRenderDataCode();return p;
};
function addButton(){
  const title=$('renderFrameWindow')?.querySelector('.render-title');
  if(!title||$('l3nRenderDataCodeBtn3991'))return;
  const b=document.createElement('button');b.id='l3nRenderDataCodeBtn3991';b.type='button';b.textContent='Render Data Code';b.title='Open compiled measured render data';b.onclick=()=>A.openRenderDataCodeViewer();
  const close=title.querySelector('[data-render-close="frame"]');title.insertBefore(b,close||null);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addButton,{once:true});else addButton();
window.__3DLiteRenderDataCode3991=true;
window.ThreeDLiteRenderDataCode3991={version:'3.99.1',snapshot:()=>A.renderDataSnapshot(),code:()=>A.compiledRenderDataCode(),open:()=>A.openRenderDataCodeViewer()};
})();
</script>'''
if '</body>' not in s: raise SystemExit('no body')
s=s.replace('</body>',block+'\n</body>',1)
p.write_text(s,encoding='utf-8')
print('patched v3.99.1 render data code')
