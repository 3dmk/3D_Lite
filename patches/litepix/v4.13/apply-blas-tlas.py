from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')

# Identity: idempotent after workflow commits the integrated index.
if '<title>LitePix v4.13.0 BLAS TLAS + Transform Refit</title>' not in s:
    s,n=re.subn(r'<title>LitePix v4\.12\.0[^<]*</title>','<title>LitePix v4.13.0 BLAS TLAS + Transform Refit</title>',s,count=1)
    if n!=1: raise SystemExit('release-blocking: v4.12 title anchor missing')
if "version:'4.13.0'" not in s:
    m=re.search(r"const\s+LitePixVersion\s*=\s*Object\.freeze\(\{(?P<body>[^;]*?version:'4\.12\.0'[^;]*?)\}\);",s)
    if not m: raise SystemExit('release-blocking: v4.12 version anchor missing')
    body=m.group('body').replace("version:'4.12.0'","version:'4.13.0'",1)
    s=s[:m.start()]+"const LitePixVersion=Object.freeze({"+body+"});"+s[m.end():]

anchor='<script src="./litepix/core2-path-v4.12.js"></script>'
loader=anchor+'\n<script src="./litepix/core2-instance-v4.13.js"></script>'
if 'core2-instance-v4.13.js' not in s:
    if anchor not in s: raise SystemExit('release-blocking: Core2 v4.12 loader missing')
    s=s.replace(anchor,loader,1)

# Keep the proven world-space mesh for compatibility, but add a local-space mesh and affine transform
# so repeated geometry can share one BLAS and transforms can be handled by the TLAS.
local_block="""  localMesh(obj,materialCount=1){
    obj.updateMatrixWorld(true);
    const g=obj.geometry,pa=g?.getAttribute?.('position');if(!pa)return null;
    const na=g.getAttribute?.('normal'),ua=g.getAttribute?.('uv');
    const p=new Float32Array(pa.count*3),n=new Float32Array(pa.count*3),uv=new Float32Array(pa.count*2);
    for(let i=0;i<pa.count;i++){
      p[i*3]=pa.getX(i);p[i*3+1]=pa.getY(i);p[i*3+2]=pa.getZ(i);
      if(na){n[i*3]=na.getX(i);n[i*3+1]=na.getY(i);n[i*3+2]=na.getZ(i);}
      if(ua){uv[i*2]=ua.getX(i);uv[i*2+1]=ua.getY(i);}
    }
    const idx=g.index?new Uint32Array(g.index.array):Uint32Array.from({length:pa.count},(_,i)=>i);
    const mi=new Uint16Array(Math.ceil(idx.length/3));
    const validCount=Math.max(1,Number(materialCount)||1);
    for(const gr of g.groups||[]){
      const raw=Number(gr.materialIndex),safe=Number.isInteger(raw)&&raw>=0&&raw<validCount?raw:0;
      for(let t=Math.floor(gr.start/3);t<Math.ceil((gr.start+gr.count)/3)&&t<mi.length;t++)mi[t]=safe;
    }
    return new RenderMeshSnapshot({positions:p,normals:n,uvs:uv,indices:idx,materialIndices:mi,bounds:this.bounds(p)});
  },
  transform(obj){
    obj.updateMatrixWorld(true);
    const e=obj.matrixWorld.elements;
    return [e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10],e[12],e[13],e[14]];
  },
"""
if '  localMesh(obj,materialCount=1){' not in s:
    cam_anchor='  camera(){\n'
    if s.count(cam_anchor)!=1: raise SystemExit(f'release-blocking: camera anchor count={s.count(cam_anchor)}')
    s=s.replace(cam_anchor,local_block+cam_anchor,1)

old_build="""      const mesh=this.mesh(obj,ids.length);if(!mesh)continue;
      ros.push(new RenderObjectSnapshot({
        id:obj.userData?.id||obj.uuid,name:obj.name||'Object',
        sourceType:obj.userData?.primitiveType||obj.type||'Mesh',
        materialIds:Object.freeze(ids.slice()),mesh
      }));"""
new_build="""      const mesh=this.mesh(obj,ids.length);if(!mesh)continue;
      const localMesh=this.localMesh(obj,ids.length);if(!localMesh)continue;
      ros.push(new RenderObjectSnapshot({
        id:obj.userData?.id||obj.uuid,name:obj.name||'Object',
        sourceType:obj.userData?.primitiveType||obj.type||'Mesh',
        geometryId:obj.geometry?.uuid||obj.userData?.geometryId||obj.uuid,
        transform:Object.freeze(this.transform(obj)),
        materialIds:Object.freeze(ids.slice()),mesh,localMesh
      }));"""
if new_build not in s:
    if s.count(old_build)!=1: raise SystemExit(f'release-blocking: snapshot object anchor count={s.count(old_build)}')
    s=s.replace(old_build,new_build,1)

# TLAS hits carry already-interpolated local attributes transformed into the correct world-side normal.
old_normal="""  normal(acceleration,hit){
    const s=acceleration.store,t=hit.triangleIndex,k=t*3;"""
new_normal="""  normal(acceleration,hit){
    if(hit?.shadingNormal)return hit.shadingNormal;
    const s=acceleration.store,t=hit.triangleIndex,k=t*3;"""
if new_normal not in s:
    if s.count(old_normal)!=1: raise SystemExit(f'release-blocking: SurfaceInterpolator.normal anchor count={s.count(old_normal)}')
    s=s.replace(old_normal,new_normal,1)
old_uv="""  uv(acceleration,hit){
    const s=acceleration.store,t=hit.triangleIndex,k=t*3;"""
new_uv="""  uv(acceleration,hit){
    if(hit?.uv)return hit.uv;
    const s=acceleration.store,t=hit.triangleIndex,k=t*3;"""
if new_uv not in s:
    if s.count(old_uv)!=1: raise SystemExit(f'release-blocking: SurfaceInterpolator.uv anchor count={s.count(old_uv)}')
    s=s.replace(old_uv,new_uv,1)

# Prefer true scene BLAS/TLAS in both primary and bounce Path entry points; retain v4.12 fallback.
old_wrap="""    if(window.__LitePixCore2Path412Enabled!==false&&typeof window.LitePixCore2PathAcceleration412==='function'){
      acceleration=window.LitePixCore2PathAcceleration412.wrap(acceleration,job);
    }
"""
new_wrap="""    if(window.__LitePixCore2Scene413Enabled!==false&&typeof window.LitePixSceneAcceleration413==='function'){
      acceleration=window.LitePixSceneAcceleration413.wrap(acceleration,job);
    }else if(window.__LitePixCore2Path412Enabled!==false&&typeof window.LitePixCore2PathAcceleration412==='function'){
      acceleration=window.LitePixCore2PathAcceleration412.wrap(acceleration,job);
    }
"""
if new_wrap not in s:
    count=s.count(old_wrap)
    if count<2: raise SystemExit(f'release-blocking: expected >=2 Path wrapper anchors, got {count}')
    s=s.replace(old_wrap,new_wrap)

# Path metadata keeps v4.12 fallback telemetry and adds the real v4.13 scene hierarchy snapshot.
old_meta="litePixCore2BVH:job.litePixCore2Acceleration412?.snapshot?.()||null"
new_meta="litePixCore2Scene:job.litePixCore2Scene413?.snapshot?.()||null,\n        litePixCore2BVH:job.litePixCore2Acceleration412?.snapshot?.()||null"
if new_meta not in s:
    if s.count(old_meta)!=1: raise SystemExit(f'release-blocking: Core2 metadata anchor count={s.count(old_meta)}')
    s=s.replace(old_meta,new_meta,1)

p.write_text(s,encoding='utf-8')
print('LitePix v4.13 real scene BLAS/TLAS integration applied')