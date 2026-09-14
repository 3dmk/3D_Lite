from pathlib import Path
import sys

VERSION='3.99.16'

OLD_START='''  /* v3.99.15 default render-ready startup scene */'''
OLD_END='''      window.__3DLiteDefaultRenderScene39915=true;\n    }\n  }catch(err){console.warn('[3DLite] default render scene skipped:',err);}\n'''

NEW=r'''  /* v3.99.16 post-boot default render scene: never blocks viewport startup */
  setTimeout(()=>{
    try{
      if(window.__3DLiteDefaultRenderScene39916)return;
      const existingRenderable=(objects||[]).some(o=>o?.isMesh&&!o?.userData?.creationPreview&&!o?.userData?.__l3nRuntimeTest&&!o?.userData?.defaultRenderScene39915);
      for(const old of [...(objects||[])]){
        if(old?.userData?.defaultRenderScene39915){
          try{scene.remove(old);}catch(_){}
          const i=objects.indexOf(old);if(i>=0)objects.splice(i,1);
        }
      }
      if(existingRenderable){window.__3DLiteDefaultRenderScene39916='preserved-user-scene';return;}
      const mat=(hex,rough=.72,metal=0)=>new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal});
      const add=(name,geometry,material,position)=>{
        const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...position);
        m.castShadow=true;m.receiveShadow=true;m.userData={...(m.userData||{}),id:'default-'+name.toLowerCase().replace(/\\s+/g,'-'),primitiveType:name.toLowerCase().includes('ground')?'plane':name.toLowerCase().replace('render ','').toLowerCase(),defaultRenderScene39916:true};
        scene.add(m);objects.push(m);try{rebuildWire(m);}catch(_){}return m;
      };
      const ground=add('Render Ground',new THREE.PlaneGeometry(420,320,1,1),mat(0x777777,.9,0),[0,0,0]);ground.receiveShadow=true;
      add('Render Box',new THREE.BoxGeometry(70,70,70,1,1,1),mat(0xb86f45,.62,0),[-105,15,35]);
      add('Render Sphere',new THREE.SphereGeometry(42,32,18),mat(0x6688aa,.34,.08),[0,20,42]);
      const pg=new THREE.CylinderGeometry(0,54,90,4,1,false);pg.rotateZ(0);const pyramid=add('Render Pyramid',pg,mat(0xc4a45f,.58,0),[110,15,45]);pyramid.rotation.z=Math.PI*.25;
      const key=EditorLightSystem?.create?.('rectangle',{name:'Fast Clean Key',color:'#fff2dc',intensity:5.5,size:85,width:110,height:80,castShadows:true});
      if(key){key.position.set(-125,-120,190);key.rotation.set(.62,0,-.48);key.userData.defaultRenderScene39916=true;}
      camera.position.set(270,-390,230);
      if(controls?.target){controls.target.set(0,10,42);controls.update();}else camera.lookAt(0,10,42);
      try{clearSelection();}catch(_){}
      try{updateStats();}catch(_){}
      try{requestRender();}catch(_){}
      window.__3DLiteDefaultRenderScene39916=true;
    }catch(err){console.error('[3DLite] post-boot default scene failed:',err);window.__3DLiteDefaultRenderScene39916='failed';}
  },0);
'''

def patch(path:Path):
    text=path.read_text(encoding='utf-8'); original=text
    s=text.find(OLD_START)
    if s<0: raise RuntimeError('v3.99.15 default scene start marker missing')
    e=text.find(OLD_END,s)
    if e<0: raise RuntimeError('v3.99.15 default scene end marker missing')
    e+=len(OLD_END)
    text=text[:s]+NEW+text[e:]
    text=text.replace('3.99.15',VERSION)
    for token in ['post-boot default render scene','defaultRenderScene39916','new THREE.BoxGeometry','new THREE.SphereGeometry','new THREE.CylinderGeometry','Fast Clean Key','3.99.16']:
        if token not in text: raise RuntimeError('missing output marker: '+token)
    if text==original: raise RuntimeError('post-boot default scene patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} post-boot default render scene')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
        if p.exists(): patch(p)
