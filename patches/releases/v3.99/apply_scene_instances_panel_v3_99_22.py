from pathlib import Path
import sys
VERSION='3.99.22'

def patch(path:Path):
    text=path.read_text(encoding='utf-8')
    if 'sceneInstancesPanel39922' in text:
        raise RuntimeError('v3.99.22 already applied')
    css=r'''
/* 3DLite v3.99.22 — Scene Instances left panel */
#workspace{
  grid-template-columns:260px 5px minmax(0,1fr) 5px 270px !important;
}
#leftPanel{
  display:flex !important;
  flex-direction:column !important;
  grid-column:1 !important;
  width:260px !important;
  min-width:220px !important;
  max-width:360px !important;
  height:100% !important;
  overflow:hidden !important;
  border-right:1px solid #3d3d3d !important;
  background:#272727 !important;
}
#workspace > .splitter:first-child{
  display:block !important;
  grid-column:2 !important;
}
#center{grid-column:3 !important;}
#workspace > .splitter:nth-of-type(2){grid-column:4 !important;}
#rightPanel{grid-column:5 !important;}
#sceneInstancesPanel39922{display:flex;flex-direction:column;min-height:0;height:100%;}
#sceneInstancesToolbar39922{display:flex;gap:4px;padding:5px;border-bottom:1px solid #444;background:#242424;}
#sceneInstancesFilter39922{min-width:0;flex:1;height:24px;}
#sceneInstancesCount39922{font-size:11px;color:#999;padding:4px 8px;border-bottom:1px solid #3d3d3d;background:#292929;}
#sceneInstancesList39922{flex:1;min-height:0;overflow:auto;padding:4px;background:#252525;}
.sceneInstanceRow39922{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:4px;height:25px;padding:0 5px;border:1px solid transparent;border-radius:2px;cursor:pointer;}
.sceneInstanceRow39922:hover{background:#343434;}
.sceneInstanceRow39922.selected{background:#3a3128;border-color:#8f4c00;}
.sceneInstanceIcon39922{text-align:center;color:#aaa;font-size:11px;}
.sceneInstanceName39922{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sceneInstanceType39922{color:#888;font-size:10px;text-transform:uppercase;}
.sceneInstanceEmpty39922{padding:12px;color:#888;text-align:center;}
'''
    text=text.replace('</style>',css+'\n</style>',1)
    js=r'''
<script>
/* 3DLite v3.99.22 — live Scene Instances outliner */
(()=>{'use strict';
  const VERSION='3.99.22';
  let lastSig='';
  const safe=(fn,fallback=null)=>{try{return fn();}catch(_){return fallback;}};
  const getScene=()=>safe(()=>scene,null);
  const getObjects=()=>safe(()=>Array.isArray(objects)?objects:[],[]);
  const getLights=()=>safe(()=>{
    if(typeof EditorLightSystem!=='undefined'){
      if(typeof EditorLightSystem.getAll==='function')return EditorLightSystem.getAll()||[];
      if(Array.isArray(EditorLightSystem.lights))return EditorLightSystem.lights;
      if(EditorLightSystem.items instanceof Map)return [...EditorLightSystem.items.values()];
    }
    return [];
  },[]);
  const typeOf=o=>{
    const ud=o?.userData||{};
    const lt=String(ud.lightData?.type||ud.lightType||o?.type||'').toLowerCase();
    if(o?.isLight||ud.lightData||/light/.test(lt))return 'Light';
    if(o?.isCamera||/camera/.test(lt))return 'Camera';
    if(o?.isMesh)return 'Object';
    if(o?.isGroup)return 'Group';
    return 'Instance';
  };
  const iconOf=t=>t==='Light'?'L':t==='Camera'?'C':t==='Group'?'G':t==='Object'?'O':'•';
  const collect=()=>{
    const seen=new Set(),rows=[];
    const add=o=>{if(!o||seen.has(o)||o.visible===false&&o.userData?.helperOnly)return;seen.add(o);const t=typeOf(o);if(t==='Instance'&&(!o.name||o.name==='Scene'))return;rows.push({o,type:t,name:o.name||o.userData?.name||`${t} ${rows.length+1}`});};
    for(const o of getObjects())add(o);
    for(const l of getLights())add(l?.object||l?.mesh||l);
    const s=getScene();
    if(s?.traverse)s.traverse(o=>{if(o!==s&&(o.isMesh||o.isLight||o.isCamera||o.userData?.lightData||o.userData?.sceneInstance))add(o);});
    return rows;
  };
  const selectedSet=()=>safe(()=>{
    const out=new Set();
    if(typeof selectedObject!=='undefined'&&selectedObject)out.add(selectedObject);
    if(typeof selectedObjects!=='undefined'&&Array.isArray(selectedObjects))selectedObjects.forEach(x=>out.add(x));
    if(typeof selection!=='undefined'){
      if(Array.isArray(selection))selection.forEach(x=>out.add(x));
      else if(selection?.object)out.add(selection.object);
    }
    return out;
  },new Set());
  const select=(o)=>{
    if(!o)return;
    let done=false;
    done=safe(()=>{if(typeof selectObject==='function'){selectObject(o);return true;}return false;},false)||done;
    done=safe(()=>{if(typeof setSelection==='function'){setSelection(o);return true;}return false;},false)||done;
    done=safe(()=>{if(typeof clearSelection==='function'&&typeof addSelection==='function'){clearSelection();addSelection(o);return true;}return false;},false)||done;
    if(!done)safe(()=>{if(typeof selectedObject!=='undefined')selectedObject=o;});
    safe(()=>{if(typeof requestRender==='function')requestRender();});
    render(true);
  };
  const buildPanel=()=>{
    let lp=document.getElementById('leftPanel');
    if(!lp){
      const ws=document.getElementById('workspace');if(!ws)return null;
      lp=document.createElement('aside');lp.id='leftPanel';lp.className='panel';ws.insertBefore(lp,ws.firstChild);
    }
    lp.innerHTML=`<div id="sceneInstancesPanel39922"><div class="panelTitle">Scene Instances</div><div id="sceneInstancesToolbar39922"><input id="sceneInstancesFilter39922" type="text" placeholder="Filter objects, lights..." aria-label="Filter scene instances"><button id="sceneInstancesRefresh39922" title="Refresh">↻</button></div><div id="sceneInstancesCount39922">0 instances</div><div id="sceneInstancesList39922"></div></div>`;
    document.getElementById('sceneInstancesFilter39922')?.addEventListener('input',()=>render(true));
    document.getElementById('sceneInstancesRefresh39922')?.addEventListener('click',()=>render(true));
    return lp;
  };
  const render=(force=false)=>{
    const list=document.getElementById('sceneInstancesList39922');if(!list)return;
    const q=(document.getElementById('sceneInstancesFilter39922')?.value||'').trim().toLowerCase();
    const all=collect();
    const selected=selectedSet();
    const rows=all.filter(r=>!q||r.name.toLowerCase().includes(q)||r.type.toLowerCase().includes(q));
    const sig=rows.map(r=>`${r.o.uuid||r.name}:${r.name}:${selected.has(r.o)?1:0}`).join('|')+'#'+q;
    if(!force&&sig===lastSig)return;lastSig=sig;
    document.getElementById('sceneInstancesCount39922').textContent=`${all.length} instance${all.length===1?'':'s'} • ${all.filter(r=>r.type==='Object').length} objects • ${all.filter(r=>r.type==='Light').length} lights`;
    list.innerHTML='';
    if(!rows.length){const e=document.createElement('div');e.className='sceneInstanceEmpty39922';e.textContent='No scene instances';list.appendChild(e);return;}
    for(const r of rows){
      const row=document.createElement('div');row.className='sceneInstanceRow39922'+(selected.has(r.o)?' selected':'');row.title=r.name;
      const i=document.createElement('div');i.className='sceneInstanceIcon39922';i.textContent=iconOf(r.type);
      const n=document.createElement('div');n.className='sceneInstanceName39922';n.textContent=r.name;
      const t=document.createElement('div');t.className='sceneInstanceType39922';t.textContent=r.type;
      row.append(i,n,t);row.addEventListener('click',()=>select(r.o));list.appendChild(row);
    }
  };
  const boot=()=>{if(!buildPanel())return setTimeout(boot,100);render(true);setInterval(()=>render(false),250);window.__3DLiteSceneInstancesPanel39922={version:VERSION,refresh:()=>render(true),collect};};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>
'''
    text=text.replace('</body>',js+'\n</body>',1)
    text=text.replace('3.99.21',VERSION)
    for token in ['sceneInstancesPanel39922','Scene Instances','sceneInstancesList39922','__3DLiteSceneInstancesPanel39922','grid-template-columns:260px 5px minmax(0,1fr) 5px 270px','3.99.22']:
        if token not in text: raise RuntimeError('missing marker '+token)
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} Scene Instances panel')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
