from pathlib import Path
import sys

VERSION='3.99.15'

BOOT=r'''  /* v3.99.15 default render-ready startup scene */
  try{
    const existingRenderable=(objects||[]).some(o=>o?.isMesh&&!o?.userData?.creationPreview&&!o?.userData?.__l3nRuntimeTest);
    if(!existingRenderable){
      const nameEl=document.getElementById('createName'),colorEl=document.getElementById('createColor');
      const addDefault=(type,name,geometry,position,color)=>{
        if(nameEl)nameEl.value=name;
        if(colorEl)colorEl.value=color;
        const m=createMesh(type,geometry);
        m.name=name;m.position.set(position[0],position[1],position[2]);
        m.userData.defaultRenderScene39915=true;
        objects.push(m);scene.add(m);rebuildWire(m);return m;
      };
      addDefault('plane','Render Ground',primitiveGeometry('plane',420,320,1),[0,0,0],'#777777');
      addDefault('box','Render Box',primitiveGeometry('box',70,70,70),[-105,15,35],'#b86f45');
      addDefault('sphere','Render Sphere',primitiveGeometry('sphere',42,42,84),[0,20,42],'#6688aa');
      addDefault('pyramid','Render Pyramid',primitiveGeometry('pyramid',48,48,90),[110,15,45],'#c4a45f');
      const key=EditorLightSystem.create('rectangle',{name:'Fast Clean Key',color:'#fff2dc',intensity:5.5,size:85,width:110,height:80,castShadows:true});
      if(key){key.position.set(-125,-120,190);key.rotation.set(.62,0,-.48);key.userData.defaultRenderScene39915=true;}
      try{camera.position.set(270,-390,230);controls.target.set(0,10,42);controls.update();}catch(_){}
      clearSelection();
      if(nameEl)nameEl.value='Box';
      requestRender();
      window.__3DLiteDefaultRenderScene39915=true;
    }
  }catch(err){console.warn('[3DLite] default render scene skipped:',err);}
'''

def req(text,old,new,label):
    if old not in text: raise RuntimeError('missing patch target: '+label)
    return text.replace(old,new,1)

def patch(path:Path):
    text=path.read_text(encoding='utf-8'); original=text
    # Make the renderer tab explicitly describe the tuned default profile.
    text=text.replace("this.rayBudgetMin=1000;this.rayBudgetMax=4000;","this.rayBudgetMin=1000;this.rayBudgetMax=4000;this.renderPreset='Fast Clean';",1)
    marker="  if(!window.__3DLiteAnimationLoopStarted){window.__3DLiteAnimationLoopStarted=true;animate(performance.now());}"
    text=req(text,marker,BOOT+'\n'+marker,'final bootstrap animation marker')
    text=text.replace('3.99.14',VERSION)
    for token in ["renderPreset='Fast Clean'","defaultRenderScene39915","Fast Clean Key","Render Ground","Render Box","Render Sphere","Render Pyramid","3.99.15"]:
        if token not in text: raise RuntimeError('missing output marker: '+token)
    if text==original: raise RuntimeError('default render scene patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} default render scene + Fast Clean preset')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
        if p.exists(): patch(p)
