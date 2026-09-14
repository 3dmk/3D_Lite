from pathlib import Path
import re,sys
VERSION='4.49.4'

def patch(path:Path):
    text=path.read_text(encoding='utf-8')
    original=text

    # Remove only dedicated external development scripts by their SRC attribute.
    # Their bodies may contain fallback text, so consume the full external script block.
    text=re.sub(
        r'<script\b(?=[^>]*\bsrc=["\'][^"\']*(?:litepix/l3n-|litepix/render-health-|render-health-bridge)[^"\']*["\'])[^>]*>[\s\S]*?</script>\s*',
        '', text, flags=re.I)
    # Remove dedicated inline development blocks only when their own id marks them as such.
    text=re.sub(
        r'<script\b[^>]*\bid=["\'][^"\']*(?:l3n|runtimelearning|renderhealth|renderdebug|rendererdebug)[^"\']*["\'][^>]*>[\s\S]*?</script>\s*',
        '', text, flags=re.I)

    # Remove explicitly named standalone runtime/debug UI remnants only.
    text=re.sub(r'\s*<[^>]+id=["\'][^"\']*(?:l3nRuntime)[^"\']*["\'][^>]*>[\s\S]*?</[^>]+>\s*','\n',text,flags=re.I)
    text=re.sub(r'\s*<div\s+id=["\']viewportDebugLine["\'][\s\S]*?</div>\s*','\n',text,count=1,flags=re.I)
    text=re.sub(r'<title>[^<]*</title>', '<title>3D Lite — LitePix v4.49.4 Production</title>', text, count=1, flags=re.I)

    style='''\n<style id="productionLayout494">\nhtml,body,#app{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important}\n#app{display:grid!important;grid-template-columns:1fr!important;grid-template-rows:28px minmax(0,1fr)!important}\n#mainMenuBar{grid-column:1!important;grid-row:1!important;height:28px!important;min-height:28px!important;max-height:28px!important}\n#workspace{grid-column:1!important;grid-row:2!important;display:grid!important;grid-template-columns:260px 5px minmax(0,1fr) 5px 270px!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important}\n#leftPanel{display:flex!important;flex-direction:column!important;grid-column:1!important;width:260px!important;min-width:260px!important;max-width:260px!important;height:100%!important;min-height:0!important}\n#workspace>.splitter:first-of-type{display:block!important;grid-column:2!important}\n#center{display:grid!important;grid-column:3!important;grid-template-rows:38px minmax(0,1fr)!important;width:auto!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important}\n#workspace>.splitter:nth-of-type(2){display:block!important;grid-column:4!important}\n#rightPanel{display:block!important;grid-column:5!important;width:270px!important;min-width:270px!important;max-width:270px!important;height:100%!important;min-height:0!important}\n#viewportWrap{position:relative!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important}\n#viewport{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important}\n#viewport>canvas,#viewport canvas{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;visibility:visible!important}\n#viewportDebugLine{display:none!important}\n</style>\n'''
    if '</head>' not in text: raise RuntimeError('head end missing')
    text=text.replace('</head>',style+'\n</head>',1)

    marker='''\n<script id="productionRuntimeCleanup449">\n(()=>{\n  'use strict';\n  const exactIds=[\n    'l3nRuntimeLearningBar','l3nRuntimeRunButton','l3nRuntimeExportButton',\n    'l3nRuntimeCopyButton','l3nRuntimeViewButton','l3nRuntimeReportPanel',\n    'l3nRuntimeMachineReport','renderDebug','rendererDebug','renderDebugPanel',\n    'rendererDebugPanel','renderDebugOverlay','rendererDebugOverlay','viewportDebugLine'\n  ];\n  const removeDevUi=()=>{\n    for(const id of exactIds){try{document.getElementById(id)?.remove();}catch(_){}}\n    try{\n      for(const b of [...document.querySelectorAll('button')]){\n        const t=(b.textContent||'').trim();\n        if(/^Render\\s*Debug\\s*:/i.test(t) || /^Run\\s+L3N\\s+Runtime\\s+Test$/i.test(t) || /^Copy\\s+Report$/i.test(t) || /^View\\s+Report$/i.test(t)) b.remove();\n      }\n      for(const el of [...document.querySelectorAll('[id],[class]')]){\n        const id=(el.id||'').toLowerCase();\n        const cls=String(el.className||'').toLowerCase();\n        if(!/render.?debug|renderer.?debug|debug.?render/.test(id+' '+cls)) continue;\n        const r=el.getBoundingClientRect();\n        const s=getComputedStyle(el);\n        const small=r.width>0&&r.height>0&&r.width<=460&&r.height<=260;\n        const lowerRight=s.position==='fixed'&&r.right>innerWidth-520&&r.bottom>innerHeight-340;\n        if(small&&lowerRight) el.remove();\n      }\n    }catch(_){}\n  };\n\n  let resizeQueued=false;\n  const syncViewport=()=>{\n    if(resizeQueued)return;\n    resizeQueued=true;\n    requestAnimationFrame(()=>{\n      resizeQueued=false;\n      try{\n        const host=document.getElementById('viewport');\n        if(!host)return;\n        const canvas=host.querySelector('canvas');\n        if(!canvas)return;\n        const r=host.getBoundingClientRect();\n        if(r.width<2||r.height<2)return;\n        canvas.style.setProperty('display','block','important');\n        canvas.style.setProperty('position','absolute','important');\n        canvas.style.setProperty('inset','0','important');\n        canvas.style.setProperty('width','100%','important');\n        canvas.style.setProperty('height','100%','important');\n        canvas.style.setProperty('visibility','visible','important');\n        try{window.dispatchEvent(new Event('resize'));}catch(_){}\n        if((canvas.width|0)<2||(canvas.height|0)<2){\n          const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));\n          canvas.width=Math.max(2,Math.round(r.width*dpr));\n          canvas.height=Math.max(2,Math.round(r.height*dpr));\n        }\n      }catch(_){}\n    });\n  };\n\n  const bootRepair=()=>{removeDevUi();syncViewport();};\n  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootRepair,{once:true});\n  else bootRepair();\n  addEventListener('load',bootRepair,{once:true});\n  setTimeout(bootRepair,50);\n  setTimeout(bootRepair,300);\n  setTimeout(bootRepair,1000);\n  try{\n    const host=document.getElementById('viewportWrap')||document.getElementById('viewport');\n    if(host&&'ResizeObserver' in window) new ResizeObserver(syncViewport).observe(host);\n  }catch(_){}\n\n  window.__3DLiteProductionRuntime449=true;\n  window.__3DLiteProductionVersion='4.49.4';\n  window.__3DLiteViewportRepair494=syncViewport;\n  try{document.title='3D Lite — LitePix v4.49.4 Production';}catch(_){}\n})();\n</script>\n'''
    if '</body>' not in text: raise RuntimeError('body end missing')
    text=text.replace('</body>',marker+'\n</body>',1)

    forbidden=['litepix/l3n-','litepix/render-health-','render-health-bridge-v4.49.js']
    leftovers=[x for x in forbidden if x.lower() in text.lower()]
    if leftovers: raise RuntimeError('dedicated development runtime remains: '+', '.join(leftovers))
    if 'productionLayout494' not in text or 'productionRuntimeCleanup449' not in text or "__3DLiteProductionVersion='4.49.4'" not in text:
        raise RuntimeError('production markers missing')
    if text==original: raise RuntimeError('no changes made')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite/LitePix v{VERSION}; core preserved + dedicated debug/runtime removed')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
