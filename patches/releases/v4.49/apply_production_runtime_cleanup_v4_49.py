from pathlib import Path
import re,sys
VERSION='4.49.2'

L3N_SCRIPT_MARKERS=(
  'L3N Runtime Learning',
  'ThreeDLiteRuntimeLearningEngine',
  'ThreeDLiteRuntimeWorkflowTests',
  'ThreeDLiteRuntimeReportBridge',
  'ThreeDLiteBrowserTestAPI',
  'l3nRuntimeLearningBar',
  '__3DLiteL3NDebugRegistry3973',
  '__3DLiteL3NRenderDebugger3975',
  '__3DLiteL3NRuntimeRenderDebug3976',
  '__3DLiteRenderDebugList3977',
)

def strip_marked_scripts(text):
    lower=text.lower(); out=[]; pos=0; removed=[]
    while True:
        start=lower.find('<script',pos)
        if start<0:
            out.append(text[pos:]); break
        out.append(text[pos:start])
        end=lower.find('</script>',start)
        if end<0:
            out.append(text[start:]); break
        end+=len('</script>')
        block=text[start:end]
        hit=next((m for m in L3N_SCRIPT_MARKERS if m.lower() in block.lower()),None)
        if hit:
            removed.append(hit); out.append('\n')
        else:
            out.append(block)
        pos=end
    return ''.join(out),removed

def patch(path:Path):
    text=path.read_text(encoding='utf-8')
    original=text
    text,removed=strip_marked_scripts(text)

    # Remove only explicitly named standalone runtime/debug remnants.
    # Never scan/remove generic fixed-position ancestors: that can delete the editor/viewport shell.
    text=re.sub(r'\s*<[^>]+id=["\'][^"\']*(?:l3nRuntime)[^"\']*["\'][^>]*>[\s\S]*?</[^>]+>\s*','\n',text,flags=re.I)

    text=re.sub(r'<title>[^<]*</title>', '<title>3D Lite — LitePix v4.49.2 Production Runtime</title>', text, count=1, flags=re.I)

    marker='''\n<script id="productionRuntimeCleanup449">\n(()=>{\n  const exactIds=[\n    'l3nRuntimeLearningBar','l3nRuntimeRunButton','l3nRuntimeExportButton',\n    'l3nRuntimeCopyButton','l3nRuntimeViewButton','l3nRuntimeReportPanel',\n    'l3nRuntimeMachineReport','renderDebug','rendererDebug','renderDebugPanel',\n    'rendererDebugPanel','renderDebugOverlay','rendererDebugOverlay'\n  ];\n  for(const id of exactIds){try{document.getElementById(id)?.remove();}catch(_){}}\n\n  // Safe lower-right cleanup: only remove small leaf/debug widgets, never editor containers.
  const removeSmallRenderDebugWidget=()=>{\n    try{\n      for(const el of [...document.querySelectorAll('[id],[class]')]){\n        const id=(el.id||'').toLowerCase();\n        const cls=String(el.className||'').toLowerCase();\n        if(!/render.?debug|renderer.?debug|debug.?render/.test(id+' '+cls)) continue;\n        const r=el.getBoundingClientRect();\n        const s=getComputedStyle(el);\n        const small=r.width>0&&r.height>0&&r.width<=460&&r.height<=260;\n        const lowerRight=s.position==='fixed'&&r.right>innerWidth-520&&r.bottom>innerHeight-340;\n        if(small&&lowerRight) el.remove();\n      }\n    }catch(_){}\n  };\n  removeSmallRenderDebugWidget();\n  addEventListener('load',removeSmallRenderDebugWidget,{once:true});\n  setTimeout(removeSmallRenderDebugWidget,500);\n\n  window.__3DLiteProductionRuntime449=true;\n  window.__3DLiteProductionVersion='4.49.2';\n  try{document.title='3D Lite — LitePix v4.49.2 Production Runtime';}catch(_){}\n})();\n</script>\n'''
    if '</body>' not in text: raise RuntimeError('body end missing')
    text=text.replace('</body>',marker+'\n</body>',1)

    forbidden=['Run L3N Runtime Test','Copy Report','View Report','L3N Runtime Report','ThreeDLiteRuntimeLearningEngine','ThreeDLiteBrowserTestAPI','ThreeDLiteL3NRenderDebugger','__3DLiteL3NRuntimeRenderDebug3976','__3DLiteRenderDebugList3977']
    leftovers=[x for x in forbidden if x in text]
    if leftovers: raise RuntimeError('L3N/debug remnants remain: '+', '.join(leftovers))
    if 'productionRuntimeCleanup449' not in text or "__3DLiteProductionVersion='4.49.2'" not in text:
        raise RuntimeError('production markers missing')
    if text==original: raise RuntimeError('no changes made')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite/LitePix v{VERSION}; safe debug cleanup + viewport protection')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
