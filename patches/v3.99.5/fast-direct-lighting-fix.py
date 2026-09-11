from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

pairs=[
("<title>3DLite v3.99.4 L3N GitHub Runtime</title>","<title>3DLite v3.99.5 L3N GitHub Runtime</title>"),
("const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.99.4'});","const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.99.5'});"),
("const VERSION='3.99.4';\nconst root=window;","const VERSION='3.99.5';\nconst root=window;")
]
for old,new in pairs:
    if new not in s:
        if s.count(old)!=1: raise SystemExit(f'version anchor count {s.count(old)}: {old}')
        s=s.replace(old,new,1)

old="""const SurfaceInterpolator=Object.freeze({
  normal(acceleration,hit){
    const s=acceleration.store,t=hit.triangleIndex,k=t*3;
    if(!s.normals||s.normals.length!==s.positions.length)return hit.geometricNormal;
    const ia=s.triangles[k],ib=s.triangles[k+1],ic=s.triangles[k+2];
    const w=1-hit.u-hit.v;
    const read=i=>[s.normals[i*3],s.normals[i*3+1],s.normals[i*3+2]];
    const a=read(ia),b=read(ib),c=read(ic);
    let n=RayMath.normalize([
      a[0]*w+b[0]*hit.u+c[0]*hit.v,
      a[1]*w+b[1]*hit.u+c[1]*hit.v,
      a[2]*w+b[2]*hit.u+c[2]*hit.v
    ]);
    if(!n.every(Number.isFinite)||RayMath.length(n)<1e-10)n=hit.geometricNormal;
    if(RayMath.dot(n,hit.geometricNormal)<0)n=RayMath.mul(n,-1);
    return n;
  },"""
new="""const SurfaceInterpolator=Object.freeze({
  normal(acceleration,hit){
    const s=acceleration.store,t=hit.triangleIndex,k=t*3;
    // v3.99.5: shading normals must follow the ray-oriented hit side, not raw triangle winding.
    // Otherwise valid back-face hits can force N.L to zero and make lit objects render black.
    const faceNormal=hit.orientedGeometricNormal||hit.geometricNormal||[0,0,1];
    if(!s.normals||s.normals.length!==s.positions.length)return faceNormal;
    const ia=s.triangles[k],ib=s.triangles[k+1],ic=s.triangles[k+2];
    const w=1-hit.u-hit.v;
    const read=i=>[s.normals[i*3],s.normals[i*3+1],s.normals[i*3+2]];
    const a=read(ia),b=read(ib),c=read(ic);
    let n=RayMath.normalize([
      a[0]*w+b[0]*hit.u+c[0]*hit.v,
      a[1]*w+b[1]*hit.u+c[1]*hit.v,
      a[2]*w+b[2]*hit.u+c[2]*hit.v
    ]);
    if(!n.every(Number.isFinite)||RayMath.length(n)<1e-10)n=faceNormal;
    if(RayMath.dot(n,faceNormal)<0)n=RayMath.mul(n,-1);
    return n;
  },"""
if new not in s:
    if s.count(old)!=1: raise SystemExit(f'SurfaceInterpolator anchor count={s.count(old)}')
    s=s.replace(old,new,1)

# Export a release marker without disturbing historical subsystem markers.
marker="window.__3DLiteFastDirectLighting3995=true;"
if marker not in s:
    anchor="window.__3DLiteLiteTraceTelemetry3992=true;"
    if s.count(anchor)!=1: raise SystemExit(f'release marker anchor count={s.count(anchor)}')
    s=s.replace(anchor,anchor+'\n'+marker,1)

p.write_text(s,encoding='utf-8')
