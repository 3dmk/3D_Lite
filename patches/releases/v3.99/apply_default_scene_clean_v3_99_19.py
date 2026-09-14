from pathlib import Path
import sys
VERSION='3.99.19'

def patch(path:Path):
    text=path.read_text(encoding='utf-8'); original=text
    start=text.find('  /* v3.99.18 render-ready default scene camera fix */')
    if start<0: raise RuntimeError('v3.99.18 scene block missing')
    end=text.find('\n  requestAnimationFrame(()=>requestAnimationFrame(bootDefaultRenderScene39918));',start)
    if end<0: raise RuntimeError('v3.99.18 scene end missing')
    end+=len('\n  requestAnimationFrame(()=>requestAnimationFrame(bootDefaultRenderScene39918));')
    new=r'''  /* v3.99.19 clean deterministic default render scene */
  const bootDefaultRenderScene39919=()=>{
    if(window.__3DLiteDefaultRenderScene39919)return;
    if(typeof THREE==='undefined'||typeof scene==='undefined'||typeof camera==='undefined'||!scene||!camera){setTimeout(bootDefaultRenderScene39919,50);return;}
    try{
      const root=new THREE.Group();root.name='Default Render Scene';root.userData.defaultRenderScene39919=true;
      const mat=(c,r=.6,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
      const ground=new THREE.Mesh(new THREE.PlaneGeometry(420,320),mat(0x777777,.9));ground.name='Render Ground';ground.receiveShadow=true;root.add(ground);
      const box=new THREE.Mesh(new THREE.BoxGeometry(70,70,70),mat(0xb86f45,.55));box.name='Render Box';box.position.set(-105,15,35);box.castShadow=box.receiveShadow=true;root.add(box);
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(42,32,20),mat(0x6688aa,.3,.08));sphere.name='Render Sphere';sphere.position.set(0,20,42);sphere.castShadow=sphere.receiveShadow=true;root.add(sphere);
      const pyramid=new THREE.Mesh(new THREE.CylinderGeometry(0,54,90,4,1,false),mat(0xc4a45f,.55));pyramid.name='Render Pyramid';pyramid.position.set(110,15,45);pyramid.rotation.z=Math.PI*.25;pyramid.castShadow=pyramid.receiveShadow=true;root.add(pyramid);
      const hemi=new THREE.HemisphereLight(0xddeeff,0x332b24,1.35);hemi.name='Render Ambient';root.add(hemi);
      const key=new THREE.DirectionalLight(0xfff1d8,3.2);key.name='Fast Clean Key';key.position.set(-140,-120,220);key.castShadow=true;root.add(key);root.add(key.target);key.target.position.set(0,10,35);
      const fill=new THREE.PointLight(0xc9ddff,65,600,2);fill.name='Fast Clean Fill';fill.position.set(150,-80,120);root.add(fill);
      scene.add(root);
      for(const m of [ground,box,sphere,pyramid]){m.userData.defaultRenderScene39919=true;if(Array.isArray(objects)&&!objects.includes(m))objects.push(m);try{rebuildWire(m);}catch(_){}}
      camera.position.set(270,-390,230);camera.lookAt(new THREE.Vector3(0,10,42));camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
      try{if(typeof orbit!=='undefined'&&orbit&&orbit.target){orbit.target.set(0,10,42);orbit.update();}}catch(_){}
      try{if(typeof updateStats==='function')updateStats();}catch(_){}
      try{if(typeof requestRender==='function')requestRender();}catch(_){}
      window.__3DLiteDefaultRenderScene39919={ready:true,meshes:4,lights:3};
      console.info('[3DLite] v3.99.19 default render scene ready: 4 meshes, 3 lights');
    }catch(err){console.error('[3DLite] v3.99.19 default scene failed:',err);}
  };
  window.addEventListener('load',()=>setTimeout(bootDefaultRenderScene39919,100),{once:true});
  if(document.readyState==='complete')setTimeout(bootDefaultRenderScene39919,100);
'''
    text=text[:start]+new+text[end:]
    text=text.replace('3.99.18',VERSION)
    for token in ['defaultRenderScene39919','Render Ground','Render Box','Render Sphere','Render Pyramid','Render Ambient','Fast Clean Key','Fast Clean Fill','meshes:4,lights:3','3.99.19']:
        if token not in text: raise RuntimeError('missing '+token)
    if text==original: raise RuntimeError('no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} clean default scene')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
