from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old=s
s=s.replace('3.98.0','3.98.1')
start=s.find('  iconGeometry(type,size){', s.find('var EditorLightSystem={'))
end=s.find('\n  create(type,opts={}){', start)
if start<0 or end<0:
    raise SystemExit('EditorLightSystem iconGeometry block not found')
new_icon=r'''  iconGeometry(type,size,light={}){
    const s=Math.max(4,Math.min(18,Number(size)||10));
    const pts=[];
    const add=(a,b)=>{pts.push(...a,...b)};
    const circle=(plane,r,z=0,segments=16)=>{
      for(let i=0;i<segments;i++){
        const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;
        let p0,p1;
        if(plane==='xy'){p0=[Math.cos(a)*r,Math.sin(a)*r,z];p1=[Math.cos(b)*r,Math.sin(b)*r,z]}
        else if(plane==='xz'){p0=[Math.cos(a)*r,z,Math.sin(a)*r];p1=[Math.cos(b)*r,z,Math.sin(b)*r]}
        else {p0=[z,Math.cos(a)*r,Math.sin(a)*r];p1=[z,Math.cos(b)*r,Math.sin(b)*r]}
        add(p0,p1);
      }
    };
    const frame=(w,h,z=0)=>{
      const x=w*.5,y=h*.5;
      add([-x,-y,z],[x,-y,z]);add([x,-y,z],[x,y,z]);add([x,y,z],[-x,y,z]);add([-x,y,z],[-x,-y,z]);
    };
    const normal=(len)=>{add([0,0,0],[0,0,-len]);add([0,0,-len],[len*.12,0,-len*.82]);add([0,0,-len],[-len*.12,0,-len*.82])};
    switch(type){
      case 'point':
        add([-s,0,0],[s,0,0]);add([0,-s,0],[0,s,0]);add([0,0,-s],[0,0,s]);circle('xy',s*.45,0,12);break;
      case 'spot':{
        const len=s*1.8,ang=Math.max(1,Math.min(85,Number(light.coneAngle)||45))*Math.PI/360;
        const r=Math.min(len*1.4,Math.max(s*.3,Math.tan(ang)*len));
        circle('xy',s*.28,0,12);circle('xy',r,-len,16);
        for(const a of [0,Math.PI*.5,Math.PI,Math.PI*1.5])add([Math.cos(a)*s*.28,Math.sin(a)*s*.28,0],[Math.cos(a)*r,Math.sin(a)*r,-len]);
        normal(len*1.15);break;
      }
      case 'rectangle':{
        const w=Math.max(s*.8,Math.min(s*2.4,(Number(light.width)||s*2)*.18));
        const h=Math.max(s*.6,Math.min(s*2.0,(Number(light.height)||s*2)*.18));
        frame(w,h,0);normal(s*1.2);break;
      }
      case 'disc': circle('xy',s*.72,0,20);add([-s*.72,0,0],[s*.72,0,0]);add([0,-s*.72,0],[0,s*.72,0]);normal(s*1.15);break;
      case 'sphere': circle('xy',s*.72,0,16);circle('xz',s*.72,0,16);circle('yz',s*.72,0,16);break;
      case 'sun':
        circle('xy',s*.38,0,12);
        for(let i=0;i<8;i++){const a=i*Math.PI/4,c=Math.cos(a),q=Math.sin(a);add([c*s*.5,q*s*.5,0],[c*s*.8,q*s*.8,0])}
        normal(s*1.8);break;
      case 'dome':
        circle('xy',s*.9,0,20);
        for(let i=0;i<10;i++){const a=i/10*Math.PI,b=(i+1)/10*Math.PI;add([Math.cos(a)*s*.9,0,Math.sin(a)*s*.9],[Math.cos(b)*s*.9,0,Math.sin(b)*s*.9]);add([0,Math.cos(a)*s*.9,Math.sin(a)*s*.9],[0,Math.cos(b)*s*.9,Math.sin(b)*s*.9])}
        break;
      case 'mesh':
        frame(s*1.45,s,0);add([-s*.725,-s*.5,0],[s*.725,s*.5,0]);add([s*.725,-s*.5,0],[-s*.725,s*.5,0]);normal(s*1.1);break;
      default: add([-s,0,0],[s,0,0]);add([0,-s,0],[0,s,0]);add([0,0,-s],[0,0,s]);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
    g.computeBoundingSphere();
    return g;
  },
'''
s=s[:start]+new_icon+s[end:]
s=s.replace('const geometry=this.iconGeometry(type,size);',"const geometry=this.iconGeometry(type,size,{...d,...opts,size});",1)
old_mat="""const material=new THREE.MeshBasicMaterial({
      color,wireframe:true,transparent:true,opacity:.9,
      depthTest:true,depthWrite:false,toneMapped:false
    });
    const obj=new THREE.Mesh(geometry,material);"""
new_mat="""const material=new THREE.LineBasicMaterial({
      color,transparent:true,opacity:.92,
      depthTest:false,depthWrite:false,toneMapped:false
    });
    const obj=new THREE.LineSegments(geometry,material);
    obj.renderOrder=1000;"""
if old_mat not in s:
    raise SystemExit('light material/create block not found')
s=s.replace(old_mat,new_mat,1)
s=s.replace('obj.geometry=this.iconGeometry(l.type,l.size);','obj.geometry=this.iconGeometry(l.type,l.size,l);',1)
marker='var LightSnapshotTools=Object.freeze({'
insert="""window.ThreeDLiteLightGizmo3981=Object.freeze({version:'3.98.1',types:LightTypes.slice(),mode:'minimal-line-gizmos'});\nwindow.__3DLiteLightGizmo3981=true;\n\n"""
pos=s.find(marker)
if pos<0: raise SystemExit('LightSnapshotTools marker not found')
if '__3DLiteLightGizmo3981' not in s[:pos]:
    s=s[:pos]+insert+s[pos:]
if s==old:
    raise SystemExit('no changes applied')
p.write_text(s,encoding='utf-8')
print('patched v3.98.1 minimal light gizmos')
