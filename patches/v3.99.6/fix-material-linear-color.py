from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')

pairs=[
("<title>3DLite v3.99.5 L3N GitHub Runtime</title>","<title>3DLite v3.99.6 L3N GitHub Runtime</title>"),
("const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.99.5'});","const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.99.6'});"),
("const VERSION='3.99.5';\nconst root=window;","const VERSION='3.99.6';\nconst root=window;")
]
for old,new in pairs:
    if new not in s:
        if s.count(old)!=1: raise SystemExit(f'version anchor count={s.count(old)} {old}')
        s=s.replace(old,new,1)

old="""      id:this.materialId(m),name:m?.name||'Material',
      shading:m?.isMeshBasicMaterial?'unlit':m?.isMeshLambertMaterial?'lambert':'physical',
      baseColor:c?[c.r,c.g,c.b]:[.54,.54,.54],"""
new="""      id:this.materialId(m),name:m?.name||'Material',
      // v3.99.6: THREE.Color component values are already in the renderer working-linear space.
      // Mark the snapshot explicitly so RenderSurfaceMaterial does not linearize them a second time.
      colorSpace:'linear',
      shading:m?.isMeshBasicMaterial?'unlit':m?.isMeshLambertMaterial?'lambert':'physical',
      baseColor:c?[c.r,c.g,c.b]:[.54,.54,.54],"""
if new not in s:
    if s.count(old)!=1: raise SystemExit(f'snapshot colorSpace anchor count={s.count(old)}')
    s=s.replace(old,new,1)

old="""    const srgb=RenderMaterialPolicy.finiteColor(snapshot.baseColor,[.54,.54,.54]);
    this.baseColor=Object.freeze(RenderColor.srgbToLinear(srgb));
    this.roughness=RenderMaterialPolicy.scalar(snapshot.roughness,.65,.045,1);"""
new="""    const colorSpace=snapshot.colorSpace==='linear'?'linear':'srgb';
    const baseInput=RenderMaterialPolicy.finiteColor(snapshot.baseColor,[.54,.54,.54]);
    this.baseColor=Object.freeze(colorSpace==='linear'?baseInput:RenderColor.srgbToLinear(baseInput));
    this.roughness=RenderMaterialPolicy.scalar(snapshot.roughness,.65,.045,1);"""
if new not in s:
    if s.count(old)!=1: raise SystemExit(f'base color anchor count={s.count(old)}')
    s=s.replace(old,new,1)

old="""    const attenSrgb=RenderMaterialPolicy.finiteColor(snapshot.attenuationColor,[1,1,1]);
    this.attenuationColor=Object.freeze(RenderColor.srgbToLinear(attenSrgb));
    this.attenuationDistance=(Number.isFinite(Number(snapshot.attenuationDistance))&&Number(snapshot.attenuationDistance)>0)?Number(snapshot.attenuationDistance):Infinity;
    const emissiveSrgb=RenderMaterialPolicy.finiteColor(snapshot.emissive,[0,0,0]);
    this.emissive=Object.freeze(RenderColor.srgbToLinear(emissiveSrgb));"""
new="""    const attenuationInput=RenderMaterialPolicy.finiteColor(snapshot.attenuationColor,[1,1,1]);
    this.attenuationColor=Object.freeze(colorSpace==='linear'?attenuationInput:RenderColor.srgbToLinear(attenuationInput));
    this.attenuationDistance=(Number.isFinite(Number(snapshot.attenuationDistance))&&Number(snapshot.attenuationDistance)>0)?Number(snapshot.attenuationDistance):Infinity;
    const emissiveInput=RenderMaterialPolicy.finiteColor(snapshot.emissive,[0,0,0]);
    this.emissive=Object.freeze(colorSpace==='linear'?emissiveInput:RenderColor.srgbToLinear(emissiveInput));"""
if new not in s:
    if s.count(old)!=1: raise SystemExit(f'atten/emissive anchor count={s.count(old)}')
    s=s.replace(old,new,1)

marker="root.__3DLiteMaterialLinearColor3996=true;"
if marker not in s:
    anchor="root.__3DLiteFastDirectLighting3995=true;"
    if s.count(anchor)!=1: raise SystemExit(f'marker anchor count={s.count(anchor)}')
    s=s.replace(anchor,anchor+'\n'+marker,1)

p.write_text(s,encoding='utf-8')
