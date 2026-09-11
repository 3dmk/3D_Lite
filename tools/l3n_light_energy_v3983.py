from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# 1. All editor light types use the same user-facing intensity default.
old="""const LightDefaults=Object.freeze({
  point:Object.freeze({intensity:10,size:2,range:0,coneAngle:45,penumbra:.15}),
  spot:Object.freeze({intensity:25,size:2,range:0,coneAngle:45,penumbra:.15}),
  rectangle:Object.freeze({intensity:15,size:25,width:50,height:50,range:0,coneAngle:90,penumbra:0}),
  disc:Object.freeze({intensity:15,size:25,range:0,coneAngle:90,penumbra:0}),
  sphere:Object.freeze({intensity:15,size:25,range:0,coneAngle:180,penumbra:0}),
  sun:Object.freeze({intensity:3,size:.5,range:0,coneAngle:.53,penumbra:0}),
  dome:Object.freeze({intensity:1,size:100,range:0,coneAngle:180,penumbra:0}),
  mesh:Object.freeze({intensity:10,size:25,range:0,coneAngle:180,penumbra:0})
});
"""
new="""const LightDefaults=Object.freeze({
  point:Object.freeze({intensity:1,size:2,range:0,coneAngle:45,penumbra:.15}),
  spot:Object.freeze({intensity:1,size:2,range:0,coneAngle:45,penumbra:.15}),
  rectangle:Object.freeze({intensity:1,size:25,width:50,height:50,range:0,coneAngle:90,penumbra:0}),
  disc:Object.freeze({intensity:1,size:25,range:0,coneAngle:90,penumbra:0}),
  sphere:Object.freeze({intensity:1,size:25,range:0,coneAngle:180,penumbra:0}),
  sun:Object.freeze({intensity:1,size:.5,range:0,coneAngle:.53,penumbra:0}),
  dome:Object.freeze({intensity:1,size:100,range:0,coneAngle:180,penumbra:0}),
  mesh:Object.freeze({intensity:1,size:25,range:0,coneAngle:180,penumbra:0})
});

// v3.98.3: one artistic intensity scale for every light type.
// Intensity=1 is the common baseline. Local lights use a gentle scene-unit falloff
// so they remain useful instead of becoming nearly black from raw 1/r^2 at cm-scale distances.
const LightEnergyPolicy=Object.freeze({
  referenceDistance:100,
  distanceAttenuation(light,distance){
    const d=Math.max(0,Number(distance)||0);
    const ref=this.referenceDistance;
    let a=1/(1+(d/ref)*(d/ref));
    const range=Math.max(0,Number(light?.range)||0);
    if(range>0){
      if(d>=range)return 0;
      const t=Math.max(0,Math.min(1,1-d/range));
      // smooth finite-range fade without changing the shared intensity unit.
      a*=t*t*(3-2*t);
    }
    return a;
  },
  radiance(light,factor=1){
    const intensity=Math.max(0,Number(light?.intensity)||0);
    return RenderColor.mul(light.color,intensity*Math.max(0,Number(factor)||0));
  }
});
window.LightEnergyPolicy=LightEnergyPolicy;
window.__3DLiteLightEnergy3983=true;
window.ThreeDLiteLightEnergy3983=Object.freeze({version:'3.98.3',baselineIntensity:1,referenceDistance:100});
"""
if old not in s: raise SystemExit('LightDefaults block not found')
s=s.replace(old,new,1)

# 2. UI default must match renderer semantics.
s=s.replace('<input id="lightIntensity" type="number" min="0" step="0.1" value="10">','<input id="lightIntensity" type="number" min="0" step="0.1" value="1">',1)

# 3. Normalize direct local, spot, sun and dome energy; remove size-driven brightness multipliers.
old="""const DirectLightSampler=Object.freeze({
  sample(light,point){
    if(light.type==='dome'){
      return {kind:'ambient',direction:null,distance:Infinity,radiance:RenderColor.mul(light.color,light.intensity)};
    }
    if(light.type==='sun'){
      return {kind:'directional',direction:RayMath.mul(light.direction,-1),distance:Infinity,radiance:RenderColor.mul(light.color,light.intensity)};
    }

    const to=RayMath.sub(light.position,point);
    const dist=Math.max(RayMath.length(to),1e-4);
    const dir=RayMath.mul(to,1/dist);
    let attenuation=1/(dist*dist);

    if(light.range>0){
      if(dist>=light.range)return {kind:'local',direction:dir,distance:dist,radiance:[0,0,0]};
      const f=Math.max(0,1-dist/light.range);
      attenuation*=f*f;
    }

    if(light.type==='spot'){
      const fromLight=RayMath.mul(dir,-1);
      const cosTheta=RayMath.dot(light.direction,fromLight);
      const outer=Math.cos(light.coneAngle*.5);
      const inner=Math.cos(light.coneAngle*.5*(1-light.penumbra));
      const cone=inner<=outer?(cosTheta>=outer?1:0):Math.max(0,Math.min(1,(cosTheta-outer)/(inner-outer)));
      if(cone<=0)return {kind:'local',direction:dir,distance:dist,radiance:[0,0,0]};
      attenuation*=cone;
    }

    // Area emitters use center-point evaluation in Group 6.
    // Group 7 replaces this with actual surface sampling + visibility.
    const areaScale=
      light.type==='rectangle'?Math.max(.01,light.width*light.height):
      light.type==='disc'?Math.max(.01,Math.PI*light.size*light.size*.25):
      light.type==='sphere'?Math.max(.01,4*Math.PI*Math.pow(light.size*.5,2)):
      light.type==='mesh'?Math.max(.01,light.width*light.height):
      1;

    if(['rectangle','disc','sphere','mesh'].includes(light.type))attenuation*=Math.sqrt(areaScale);

    return {
      kind:'local',
      direction:dir,
      distance:dist,
      radiance:RenderColor.mul(light.color,light.intensity*attenuation)
    };
  }
});
"""
new="""const DirectLightSampler=Object.freeze({
  sample(light,point){
    if(light.type==='dome'){
      return {kind:'ambient',direction:null,distance:Infinity,radiance:LightEnergyPolicy.radiance(light)};
    }
    if(light.type==='sun'){
      return {kind:'directional',direction:RayMath.mul(light.direction,-1),distance:Infinity,radiance:LightEnergyPolicy.radiance(light)};
    }

    const to=RayMath.sub(light.position,point);
    const dist=Math.max(RayMath.length(to),1e-4);
    const dir=RayMath.mul(to,1/dist);
    let attenuation=LightEnergyPolicy.distanceAttenuation(light,dist);
    if(attenuation<=0)return {kind:'local',direction:dir,distance:dist,radiance:[0,0,0]};

    if(light.type==='spot'){
      const fromLight=RayMath.mul(dir,-1);
      const cosTheta=RayMath.dot(light.direction,fromLight);
      const outer=Math.cos(light.coneAngle*.5);
      const inner=Math.cos(light.coneAngle*.5*(1-light.penumbra));
      const cone=inner<=outer?(cosTheta>=outer?1:0):Math.max(0,Math.min(1,(cosTheta-outer)/(inner-outer)));
      if(cone<=0)return {kind:'local',direction:dir,distance:dist,radiance:[0,0,0]};
      attenuation*=cone;
    }

    return {
      kind:'local',
      direction:dir,
      distance:dist,
      radiance:LightEnergyPolicy.radiance(light,attenuation)
    };
  }
});
"""
if old not in s: raise SystemExit('DirectLightSampler block not found')
s=s.replace(old,new,1)

# 4. Area lights: size controls softness/shape, not exposure. Use the same distance scale.
old="""    let attenuation=1/(dist*dist);
    if(light.range>0){
      const f=Math.max(0,1-dist/light.range);
      attenuation*=f*f;
    }
"""
new="""    let attenuation=LightEnergyPolicy.distanceAttenuation(light,dist);
"""
if old not in s: raise SystemExit('Area attenuation block not found')
s=s.replace(old,new,1)

old="""      radiance:RenderColor.mul(light.color,light.intensity*attenuation*emitterCos/safeArea),
"""
new="""      // Size changes sampling footprint/softness only; intensity remains the same user-facing unit.
      radiance:LightEnergyPolicy.radiance(light,attenuation*emitterCos),
"""
if old not in s: raise SystemExit('Area radiance line not found')
s=s.replace(old,new,1)

# 5. Dome environment uses the same normalized intensity scale.
s=s.replace("return RenderColor.mul(light.color,light.intensity);","return LightEnergyPolicy.radiance(light);",1)

# 6. Light-tree importance must not make physically larger lights implicitly stronger.
s=s.replace("return base*Math.sqrt(this.area(light));","return base;",1)

# 7. Keep version title aligned with this release if an earlier v3.98.3 diagnostic title is present.
s=s.replace('<title>3DLite v3.98.3 L3N Diagnostic Learning</title>','<title>3DLite v3.98.3 Light Energy Normalization</title>',1)

# Regression assertions in the patched source.
checks=[
  "point:Object.freeze({intensity:1",
  "spot:Object.freeze({intensity:1",
  "rectangle:Object.freeze({intensity:1",
  "window.__3DLiteLightEnergy3983=true",
  "LightEnergyPolicy.distanceAttenuation(light,dist)",
  "radiance:LightEnergyPolicy.radiance(light,attenuation*emitterCos)",
  "return base;"
]
for c in checks:
    if c not in s: raise SystemExit('missing expected patch marker: '+c)

p.write_text(s,encoding='utf-8')
print('patched v3.98.3 light energy normalization')
