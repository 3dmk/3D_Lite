from pathlib import Path
import sys
VERSION='3.99.20'

def patch(path:Path):
    text=path.read_text(encoding='utf-8'); original=text
    start=text.find('  /* v3.99.19 clean deterministic default render scene */')
    if start<0: raise RuntimeError('v3.99.19 scene block missing')
    end=text.find("\n  if(document.readyState==='complete')setTimeout(bootDefaultRenderScene39919,100);",start)
    if end<0: raise RuntimeError('v3.99.19 scene end missing')
    end+=len("\n  if(document.readyState==='complete')setTimeout(bootDefaultRenderScene39919,100);")
    new=r'''  /* v3.99.20 deterministic default scene with renderer-native lights */
  const bootDefaultRenderScene39920=()=>{
    if(window.__3DLiteDefaultRenderScene39920)return;
    if(typeof THREE==='undefined'||typeof scene==='undefined'||typeof camera==='undefined'||typeof EditorLightSystem==='undefined'){setTimeout(bootDefaultRenderScene39920,50);return;}
    try{
      const mat=(c,r=.6,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
      const addMesh=(name,g,material,pos)=>{const m=new THREE.Mesh(g,material);m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;m.userData.defaultRenderScene39920=true;scene.add(m);objects.push(m);try{rebuildWire(m);}catch(_){}return m;};
      const ground=addMesh('Render Ground',new THREE.PlaneGeometry(420,320),mat(0x777777,.9),[0,0,0]);ground.castShadow=false;
      addMesh('Render Box',new THREE.BoxGeometry(70,70,70),mat(0xb86f45,.55),[-105,15,35]);
      addMesh('Render Sphere',new THREE.SphereGeometry(42,32,20),mat(0x6688aa,.3,.08),[0,20,42]);
      const pyramid=addMesh('Render Pyramid',new THREE.CylinderGeometry(0,54,90,4,1,false),mat(0xc4a45f,.55),[110,15,45]);pyramid.rotation.z=Math.PI*.25;
      const key=EditorLightSystem.create('rectangle',{name:'Fast Clean Key',color:'#fff2dc',intensity:5.5,width:110,height:80,size:85,castShadows:true});
      key.name='Fast Clean Key';key.position.set(-125,-120,190);key.rotation.set(.62,0,-.48);key.userData.defaultRenderScene39920=true;
      const fill=EditorLightSystem.create('point',{name:'Fast Clean Fill',color:'#c9ddff',intensity:1.4,size:8,castShadows:false});
      fill.name='Fast Clean Fill';fill.position.set(150,-80,120);fill.userData.defaultRenderScene39920=true;
      const dome=EditorLightSystem.create('dome',{name:'Render Ambient',color:'#dce8ff',intensity:.35,size:100,castShadows:false});
      dome.name='Render Ambient';dome.position.set(0,0,180);dome.userData.defaultRenderScene39920=true;
      camera.position.set(270,-390,230);camera.lookAt(new THREE.Vector3(0,10,42));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
      try{if(typeof orbit!=='undefined'&&orbit?.target){orbit.target.set(0,10,42);orbit.update();}}catch(_){}
      try{clearSelection();updateStats();requestRender();}catch(_){}
      const nativeLights=(objects||[]).filter(o=>EditorLightSystem.isLightObject(o)&&o.userData?.defaultRenderScene39920).length;
      window.__3DLiteDefaultRenderScene39920={ready:true,meshes:4,lights:nativeLights};
      console.info('[3DLite] v3.99.20 default render scene ready',{meshes:4,rendererNativeLights:nativeLights});
    }catch(err){console.error('[3DLite] v3.99.20 default scene failed:',err);}
  };
  window.addEventListener('load',()=>setTimeout(bootDefaultRenderScene39920,120),{once:true});
  if(document.readyState==='complete')setTimeout(bootDefaultRenderScene39920,120);
'''
    text=text[:start]+new+text[end:]
    text=text.replace('3.99.19',VERSION)
    for token in ['defaultRenderScene39920','EditorLightSystem.create','Fast Clean Key','Fast Clean Fill','Render Ambient','rendererNativeLights','3.99.20']:
        if token not in text: raise RuntimeError('missing '+token)
    if text==original: raise RuntimeError('no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} renderer-native default lights')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
