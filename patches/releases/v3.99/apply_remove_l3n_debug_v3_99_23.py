from pathlib import Path
import re,sys
VERSION='3.99.23'

def patch(path:Path):
    text=path.read_text(encoding='utf-8'); original=text
    # Remove external L3N/render-health/debug scripts from public runtime.
    patterns=[
      r'\s*<script[^>]+src=["\'][^"\']*litepix/l3n-[^"\']+["\'][^>]*>\s*</script>\s*',
      r'\s*<script[^>]+src=["\'][^"\']*litepix/render-health-[^"\']+["\'][^>]*>\s*</script>\s*',
    ]
    for p in patterns:text=re.sub(p,'\n',text,flags=re.I)
    # Remove dedicated health/debug UI elements when present.
    text=re.sub(r'\s*<[^>]+id=["\'][^"\']*(?:renderHealth|l3n)[^"\']*["\'][^>]*>[\s\S]*?</[^>]+>\s*','\n',text,flags=re.I)
    text=re.sub(r'\s*<button[^>]*(?:Render Health|L3N|Debugger)[\s\S]*?</button>\s*','\n',text,flags=re.I)
    # Disable leftover public globals/timers defensively without touching LitePix core.
    cleanup=r'''
<script id="removeL3NDebug39923">
(function(){
  const names=['__3DLiteL3NRenderingTimer','__3DLiteL3NIntegrationTimer'];
  for(const n of names){try{if(window[n])clearInterval(window[n]);}catch(_){} try{delete window[n];}catch(_){}}
  const globals=['__3DLiteRenderHealth','__3DLiteRenderHealthText','__3DLiteRenderExecutionTimeline','__3DLiteRenderExecutionTimelineText','__3DLiteL3NRendering','__3DLiteL3NRenderingSnapshot','__3DLiteL3NRenderingText','__3DLiteL3NRenderingReset','__3DLiteL3NInstallRenderIntegration','__3DLiteL3NRenderIntegrationSnapshot'];
  for(const n of globals){try{delete window[n];}catch(_){window[n]=undefined;}}
  window.__3DLiteDebugLayerRemoved39923=true;
})();
</script>
'''
    if '</body>' not in text: raise RuntimeError('body end missing')
    text=text.replace('</body>',cleanup+'\n</body>',1)
    text=text.replace('3.99.22',VERSION)
    if 'removeL3NDebug39923' not in text: raise RuntimeError('cleanup marker missing')
    if text==original: raise RuntimeError('no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} without L3N/debug layer')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
      if p.exists(): patch(p)
