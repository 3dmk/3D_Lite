from pathlib import Path
import sys

VERSION='3.99.17'

OLD="""  /* v3.99.16 post-boot default render scene: never blocks viewport startup */"""

NEW=r'''  /* v3.99.17 reliable render-ready default scene */
  const bootDefaultRenderScene39917=()=>{
    try{
      if(window.__3DLiteDefaultRenderScene39917)return;
      if(!window.THREE||!scene||!camera||!Array.isArray(objects)){requestAnimationFrame(bootDefaultRenderScene39917);return;}
      const userMeshes=objects.filter(o=>o?.isMesh&&!o?.userData?.creationPreview&&!o?.userData?.__l3nRuntimeTest&&!o?.userData?.defaultRenderScene39915&&!o?.userData?.defaultRenderScene39916&&!o?.userData?.defaultRenderScene39917);
      if(userMeshes.length){window.__3DLiteDefaultRenderScene39917='preserved-user-scene';return;}
      for(const old of [...objects]) if(old?.userData?.defaultRenderScene39915||old?.userData?.defaultRenderScene39916){try{scene.remove(old);}catch(_){} const i=objects.indexOf(old);if(i>=0)objects.splice(i,1);}
      const material=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
      const add=(name,geometry,mat,pos)=>{const m=new THREE.Mesh(geometry,mat);m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;m.userData={...(m.userData||{}),id:'default-'+name.toLowerCase().replace(/\s+/g,'-'),defaultRenderScene39917:true};scene.add(m);objects.push(m);try{rebuildWire(m);}catch(_){}return m;};
      const ground=add('Render Ground',new THREE.PlaneGeometry(420,320),material(0x707070,.92,0),[0,0,0]);
      add('Render Box',new THREE.BoxGeometry(70,70,70),material(0xb86f45,.58,0),[-105,15,35]);
      add('Render Sphere',new THREE.SphereGeometry(42,32,20),material(0x6688aa,.3,.08),[0,20,42]);
      const pyramid=add('Render Pyramid',new THREE.CylinderGeometry(0,54,90,4,1,false),material(0xc4a45f,.55,0),[110,15,45]);pyramid.rotation.z=Math.PI*.25;
      try{
        const key=EditorLightSystem?.create?.('rectangle',{name:'Fast Clean Key',color:'#fff2dc',intensity:5.5,size:85,width:110,height:80,castShadows:true});
        if(key){key.position.set(-125,-120,190);key.rotation.set(.62,0,-.48);key.userData.defaultRenderScene39917=true;}
        const fill=EditorLightSystem?.create?.('point',{name:'Fast Clean Fill',color:'#c9ddff',intensity:1.25,castShadows:false});
        if(fill){fill.position.set(150,-80,115);fill.userData.defaultRenderScene39917=true;}
      }catch(_){}
      camera.position.set(270,-390,230);if(controls?.target){controls.target.set(0,10,42);controls.update();}else camera.lookAt(0,10,42);
      try{clearSelection();updateStats();requestRender();}catch(_){}
      window.__3DLiteDefaultRenderScene39917=true;
    }catch(err){console.error('[3DLite] v3.99.17 default scene failed:',err);requestAnimationFrame(bootDefaultRenderScene39917);}
  };
  requestAnimationFrame(()=>requestAnimationFrame(bootDefaultRenderScene39917));
'''

def patch(path:Path):
    text=path.read_text(encoding='utf-8')
    start=text.find(OLD)
    if start<0: raise RuntimeError('v3.99.16 scene marker missing')
    end=text.find("\n  },0);",start)
    if end<0: raise RuntimeError('v3.99.16 scene end missing')
    end+=len("\n  },0);")
    text=text[:start]+NEW+text[end:]
    text=text.replace('3.99.16',VERSION)
    for token in ['defaultRenderScene39917','Render Ground','Render Box','Render Sphere','Render Pyramid','Fast Clean Key','Fast Clean Fill','3.99.17']:
        if token not in text: raise RuntimeError('missing marker '+token)
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION}')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
