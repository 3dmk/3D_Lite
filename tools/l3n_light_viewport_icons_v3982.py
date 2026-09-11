from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
orig=s
# Version bump for this release.
s=s.replace('3.98.1','3.98.2')
# Replace physical-size-derived line gizmos with compact normalized UI symbols.
new_method=r'''  iconGeometry(type){
    const pts=[];
    const add=(a,b)=>{pts.push(...a,...b)};
    const circle=(plane,r,z=0,segments=12,start=0,end=Math.PI*2)=>{
      for(let i=0;i<segments;i++){
        const a=start+(end-start)*i/segments,b=start+(end-start)*(i+1)/segments;
        let p0,p1;
        if(plane==='xy'){p0=[Math.cos(a)*r,Math.sin(a)*r,z];p1=[Math.cos(b)*r,Math.sin(b)*r,z]}
        else if(plane==='xz'){p0=[Math.cos(a)*r,z,Math.sin(a)*r];p1=[Math.cos(b)*r,z,Math.sin(b)*r]}
        else {p0=[z,Math.cos(a)*r,Math.sin(a)*r];p1=[z,Math.cos(b)*r,Math.sin(b)*r]}
        add(p0,p1);
      }
    };
    const frame=(w,h,z=0)=>{const x=w*.5,y=h*.5;add([-x,-y,z],[x,-y,z]);add([x,-y,z],[x,y,z]);add([x,y,z],[-x,y,z]);add([-x,y,z],[-x,-y,z])};
    const tick=(len=.72)=>{add([0,0,-.12],[0,0,-len]);add([0,0,-len],[.12,0,-len+.16]);add([0,0,-len],[-.12,0,-len+.16])};
    switch(type){
      case 'point':
        add([-.42,0,0],[.42,0,0]);add([0,-.42,0],[0,.42,0]);add([0,0,-.42],[0,0,.42]);
        add([-.18,-.18,0],[.18,.18,0]);add([.18,-.18,0],[-.18,.18,0]);break;
      case 'spot':
        circle('xy',.16,0,8);add([-.16,0,0],[-.42,0,-.62]);add([.16,0,0],[.42,0,-.62]);
        add([0,-.16,0],[0,-.42,-.62]);add([0,.16,0],[0,.42,-.62]);circle('xy',.42,-.62,10);tick(.9);break;
      case 'rectangle': frame(.9,.58,0);tick(.72);break;
      case 'disc': circle('xy',.42,0,12);add([-.18,0,0],[.18,0,0]);add([0,-.18,0],[0,.18,0]);tick(.7);break;
      case 'sphere': circle('xy',.4,0,12);circle('xz',.4,0,10);break;
      case 'sun':
        circle('xy',.22,0,10);for(let i=0;i<8;i++){const a=i*Math.PI/4,c=Math.cos(a),q=Math.sin(a);add([c*.32,q*.32,0],[c*.48,q*.48,0])}tick(.86);break;
      case 'dome':
        add([-.48,0,0],[.48,0,0]);circle('xz',.48,0,8,0,Math.PI);circle('yz',.48,0,8,0,Math.PI);break;
      case 'mesh':
        add([0,.46,0],[.46,0,0]);add([.46,0,0],[0,-.46,0]);add([0,-.46,0],[-.46,0,0]);add([-.46,0,0],[0,.46,0]);
        add([-.28,0,0],[.28,0,0]);add([0,-.28,0],[0,.28,0]);tick(.7);break;
      default: add([-.4,0,0],[.4,0,0]);add([0,-.4,0],[0,.4,0]);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    g.computeBoundingSphere();
    g.userData={...(g.userData||{}),lightViewportIcon:true,iconType:type,uiThemed:true};
    return g;
  },

  updateViewportIconScale(obj,camera,renderer){
    if(!obj||!camera||!renderer)return;
    const h=Math.max(1,renderer.domElement?.clientHeight||renderer.domElement?.height||720);
    const px=Number(obj.userData?.lightViewportIcon?.pixels)||22;
    let worldPerPixel=1/h;
    if(camera.isPerspectiveCamera){
      const op=obj.getWorldPosition(new THREE.Vector3()),cp=camera.getWorldPosition(new THREE.Vector3());
      const d=Math.max(.01,op.distanceTo(cp));
      worldPerPixel=2*d*Math.tan(THREE.MathUtils.degToRad(camera.fov||50)*.5)/h;
    }else if(camera.isOrthographicCamera){
      worldPerPixel=Math.abs((camera.top-camera.bottom)/(camera.zoom||1))/h;
    }
    const sc=Math.max(.001,worldPerPixel*px);
    obj.scale.setScalar(sc);
  },

  create(type'''
pat=r"  iconGeometry\(type,size,light=\{\}\)\{.*?\n  \},\n\n  create\(type"
s,n=re.subn(pat,new_method,s,flags=re.S)
assert n==1, f'iconGeometry replacement count {n}'
# Create normalized symbol and neutral editor-theme line material.
s=s.replace("const geometry=this.iconGeometry(type,size,{...d,...opts,size});", "const geometry=this.iconGeometry(type);")
s=s.replace("const color=new THREE.Color(opts.color||'#fff2c8');\n    const material=new THREE.LineBasicMaterial({\n      color,transparent:true,opacity:.92,", "const color=new THREE.Color(opts.color||'#fff2c8');\n    const material=new THREE.LineBasicMaterial({\n      color:new THREE.Color('#aeb4bc'),transparent:true,opacity:.82,")
# Add viewport-icon metadata and constant-screen-scale hook directly after line object creation.
needle="const obj=new THREE.LineSegments(geometry,material);\n    obj.renderOrder=1000;"
repl="const obj=new THREE.LineSegments(geometry,material);\n    obj.userData.lightViewportIcon={theme:'editor-neutral',pixels:22,version:'3.98.2'};\n    obj.onBeforeRender=(renderer,_scene,camera)=>this.updateViewportIconScale(obj,camera,renderer);\n    obj.renderOrder=1000;"
assert needle in s
s=s.replace(needle,repl,1)
# UI symbol is independent of physical light size/color.
s=s.replace("obj.geometry=this.iconGeometry(l.type,l.size,l);", "obj.geometry=this.iconGeometry(l.type);")
s=s.replace("obj.geometry=this.iconGeometry(l.type,l.size);", "obj.geometry=this.iconGeometry(l.type);")
s=s.replace("if(obj.material?.color)obj.material.color.set(l.color||'#ffffff');", "if(obj.material?.color)obj.material.color.set('#aeb4bc');")
s=s.replace("if(key==='size'||key==='color')EditorLightSystem.updateIcon(selected);", "/* v3.98.2 viewport icon is independent of physical size/color */")
# Marker upgrade.
s=s.replace("window.ThreeDLiteLightGizmo3981=Object.freeze({version:'3.98.2',types:LightTypes.slice(),mode:'minimal-line-gizmos'});\nwindow.__3DLiteLightGizmo3981=true;", "window.ThreeDLiteLightViewportIcons3982=Object.freeze({version:'3.98.2',types:LightTypes.slice(),mode:'minimal-ui-themed-viewport-icons',theme:'#aeb4bc',screenPixels:22});\nwindow.__3DLiteLightViewportIcons3982=true;")
# In case the global version bump altered only value but old identifier stayed with another spacing, remove old marker deterministically.
s=s.replace("window.__3DLiteLightGizmo3981=true;", "window.__3DLiteLightViewportIcons3982=true;")
s=s.replace("window.ThreeDLiteLightGizmo3981", "window.ThreeDLiteLightViewportIcons3982")
# Required checks.
assert "__3DLiteLightViewportIcons3982" in s
assert "minimal-ui-themed-viewport-icons" in s
assert "updateViewportIconScale" in s
assert "this.iconGeometry(type);" in s
assert "#aeb4bc" in s
assert "3.98.2" in s
assert "__3DLiteLightGizmo3981" not in s
assert s!=orig
p.write_text(s,encoding='utf-8')
print('v3.98.2 themed viewport icons patched')