from pathlib import Path
import re,sys
VERSION='4.49.0'

L3N_MARKERS=(
  'L3N Runtime Learning','ThreeDLiteRuntimeLearning','ThreeDLiteRuntimeWorkflowTests',
  'ThreeDLiteRuntimeReport','ThreeDLiteBrowserTestAPI','l3nRuntime',
  '__3DLiteL3N','ThreeDLiteL3N','__3DLiteRenderDebug','ThreeDLiteL3NRenderDebugger',
  'Render Debug:'
)

SCRIPT_RE=re.compile(r'\s*<script\b([^>]*)>([\s\S]*?)</script>\s*',re.I)

def patch(path:Path):
    text=path.read_text(encoding='utf-8')
    original=text
    removed=[]

    def strip_runtime_script(m):
        attrs=m.group(1) or ''
        body=m.group(2) or ''
        probe=attrs+'\n'+body
        if any(marker.lower() in probe.lower() for marker in L3N_MARKERS):
            removed.append(next((x for x in L3N_MARKERS if x.lower() in probe.lower()),'L3N'))
            return '\n'
        return m.group(0)

    text=SCRIPT_RE.sub(strip_runtime_script,text)

    # Remove any static remnants of the runtime/debug controls.
    text=re.sub(r'\s*<[^>]+id=["\'][^"\']*(?:l3nRuntime|renderDebug)[^"\']*["\'][^>]*>[\s\S]*?</[^>]+>\s*','\n',text,flags=re.I)

    # Promote the public production version. Keep the historical legacyVersion field untouched.
    text=text.replace('3D Lite — LitePix v4.45.0 Adaptive Ray Budget','3D Lite — LitePix v4.49.0 Production Runtime')
    text=text.replace("name:'LitePix',version:'4.45.0'","name:'LitePix',version:'4.49.0'")

    marker='''\n<script id="productionRuntimeCleanup449">\n(()=>{\n  const ids=['l3nRuntimeLearningBar','l3nRuntimeRunButton','l3nRuntimeExportButton','l3nRuntimeCopyButton','l3nRuntimeViewButton','l3nRuntimeReportPanel','l3nRuntimeMachineReport'];\n  for(const id of ids){try{document.getElementById(id)?.remove();}catch(_){}}\n  const timers=['__3DLiteL3NRenderingTimer','__3DLiteL3NIntegrationTimer'];\n  for(const n of timers){try{if(window[n])clearInterval(window[n]);}catch(_){} try{delete window[n];}catch(_){}}\n  window.__3DLiteProductionRuntime449=true;\n})();\n</script>\n'''
    if '</body>' not in text: raise RuntimeError('body end missing')
    text=text.replace('</body>',marker+'\n</body>',1)

    forbidden=['Run L3N Runtime Test','Copy Report','View Report','L3N Runtime Report','ThreeDLiteRuntimeLearningEngine','ThreeDLiteBrowserTestAPI','ThreeDLiteL3NRenderDebugger','__3DLiteL3NRuntimeRenderDebug3976','__3DLiteRenderDebugList3977']
    leftovers=[x for x in forbidden if x in text]
    if leftovers: raise RuntimeError('L3N/debug remnants remain: '+', '.join(leftovers))
    if 'productionRuntimeCleanup449' not in text: raise RuntimeError('production cleanup marker missing')
    if text==original: raise RuntimeError('no changes made')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite/LitePix v{VERSION}; removed {len(removed)} runtime/debug script blocks')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
