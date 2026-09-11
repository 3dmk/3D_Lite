from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
orig=s

def ro(old,new,label,count=1):
    global s
    c=s.count(old)
    if c<count: raise SystemExit(f'{label}: expected >= {count}, found {c}')
    s=s.replace(old,new,count)

# Match sampling alpha to the PhysicalBSDF convention alpha = roughness^2.
ro('const a=Math.max(.045,roughness);\n    const a2=a*a;',
   'const a=Math.max(.002025,roughness*roughness);\n    const a2=a*a;',
   'GGX NDF sampler alpha',1)
ro('const a=Math.max(.045,roughness);\n    const basis=LightBasis.fromDirection(n);',
   'const a=Math.max(.002025,roughness*roughness);\n    const basis=LightBasis.fromDirection(n);',
   'GGX VNDF sampler alpha',1)
ro('const a=Math.max(.045,roughness),a2=a*a;',
   'const a=Math.max(.002025,roughness*roughness),a2=a*a;',
   'GGX sampler distribution alpha',1)

old='''    const nDotH=Math.max(0,RayMath.dot(n,h));\n    const vDotH=Math.max(1e-7,RayMath.dot(v,h));\n    const D=GGXImportanceSampler.distribution(nDotH,material.roughness);\n    const specPdf=(D*nDotH)/(4*vDotH+1e-8);\n    return (1-specProb)*diffusePdf+specProb*specPdf;'''
new='''    const nDotH=Math.max(0,RayMath.dot(n,h));\n    const vDotH=Math.max(1e-7,RayMath.dot(v,h));\n    const nDotV=Math.max(1e-7,RayMath.dot(n,v));\n    const D=PhysicalBSDF.distributionGGX(nDotH,material.roughness);\n    const G1=PhysicalBSDF.geometrySchlickGGX(nDotV,material.roughness);\n    // VNDF half-vector pdf: D(h)*G1(v)*|v.h|/|n.v|.\n    // Reflection Jacobian 1/(4|v.h|) cancels the v.h term.\n    const specPdf=(D*G1)/(4*nDotV+1e-8);\n    return (1-specProb)*diffusePdf+specProb*specPdf;'''
ro(old,new,'VNDF reflected-direction PDF',1)

# Marker must describe the actual matched pair.
ro("ggx:'visible-normal-sampling'","ggx:'visible-normal-sampling+matched-vndf-pdf'",'kernel GGX marker',1)

checks=[
 ('v3980','3.98.0' in s),
 ('VNDF sampler','sampleVisibleHalfVector' in s),
 ('matched PDF','const specPdf=(D*G1)/(4*nDotV+1e-8);' in s),
 ('physical D','const D=PhysicalBSDF.distributionGGX' in s),
 ('marker',"visible-normal-sampling+matched-vndf-pdf" in s),
]
fail=[k for k,v in checks if not v]
if fail: raise SystemExit('failed: '+', '.join(fail))
if s==orig: raise SystemExit('no changes')
p.write_text(s,encoding='utf-8')
print('GGX VNDF/PDF consistency fixed')
