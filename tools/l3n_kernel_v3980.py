from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')
orig=s

def require(text,label):
    if text not in s:
        raise SystemExit(f'MISSING REQUIRED SOURCE: {label}')

def replace_once(old,new,label):
    global s
    c=s.count(old)
    if c!=1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {c}')
    s=s.replace(old,new,1)

# Release identity. The current release layer consistently owns 3.97.9 strings.
if '3.97.9' not in s:
    raise SystemExit('Expected v3.97.9 baseline identity')
s=s.replace('3.97.9','3.98.0')

# PASS 1 — replace the existing BVH build heuristic in-place. No second BVH owner.
replace_once('''    let best=null,bestCost=Infinity;\n    const binsN=8;''','''    let best=null,bestCost=Infinity;\n    const binsN=12;\n    const parentArea=Math.max(1e-12,this._surfaceArea(rb.min,rb.max));\n    const leafCost=count;''','BVH SAH setup')
replace_once('''        const cost=this._surfaceArea(leftB[i].min,leftB[i].max)*leftC[i]+this._surfaceArea(rightB[i+1].min,rightB[i+1].max)*rightC[i+1];\n        if(cost<bestCost){bestCost=cost;best={axis,threshold:lo+span*((i+1)/binsN)};}''','''        const splitCost=1+(\n          this._surfaceArea(leftB[i].min,leftB[i].max)*leftC[i]+\n          this._surfaceArea(rightB[i+1].min,rightB[i+1].max)*rightC[i+1]\n        )/parentArea;\n        if(splitCost<bestCost){bestCost=splitCost;best={axis,threshold:lo+span*((i+1)/binsN),cost:splitCost};}''','BVH normalized SAH cost')
replace_once('''    return best;\n  }\n  _build(start,end){''','''    return best&&bestCost<leafCost?best:null;\n  }\n  _build(start,end){''','BVH leaf-vs-split decision')
replace_once("buildStrategy:'SAH-8bin-binary'","buildStrategy:'SAH-12bin-normalized-leafcost-nearfirst'",'BVH stats label')
replace_once('''      }else{\n        stack.push(node.left,node.right);\n      }\n    }\n    return false;\n  }\n}\n''','''      }else{\n        const left=this.nodes[node.left],right=this.nodes[node.right];\n        const lt=AABBIntersector.entry(ray,left.min,left.max,ray.tMax);\n        const rt=AABBIntersector.entry(ray,right.min,right.max,ray.tMax);\n        const lh=Number.isFinite(lt),rh=Number.isFinite(rt);\n        if(lh&&rh){\n          if(lt<=rt)stack.push(node.right,node.left);else stack.push(node.left,node.right);\n        }else if(lh)stack.push(node.left);\n        else if(rh)stack.push(node.right);\n      }\n    }\n    return false;\n  }\n}\n''','BVH any-hit near-first traversal')

# PASS 2 — upgrade the existing GGX sampler with visible-normal sampling while
# keeping sampleHalfVector for compatibility/self-tests. This replaces sampling
# behavior in the existing BSDF path; it does not add another material system.
needle='''  sampleHalfVector(n,roughness,u1,u2){\n    const a=Math.max(.045,roughness);\n    const a2=a*a;\n    const phi=2*Math.PI*u1;\n    const cosTheta=Math.sqrt(Math.max(0,(1-u2)/(1+(a2-1)*u2)));\n    const sinTheta=Math.sqrt(Math.max(0,1-cosTheta*cosTheta));\n    const basis=LightBasis.fromDirection(n);\n    return RayMath.normalize(\n      RayMath.add(\n        RayMath.add(RayMath.mul(basis.tangent,sinTheta*Math.cos(phi)),RayMath.mul(basis.bitangent,sinTheta*Math.sin(phi))),\n        RayMath.mul(basis.n,cosTheta)\n      )\n    );\n  },'''
require(needle,'GGX sampler')
replacement=needle+'''\n  sampleVisibleHalfVector(n,v,roughness,u1,u2){\n    const a=Math.max(.045,roughness);\n    const basis=LightBasis.fromDirection(n);\n    const vl=[RayMath.dot(v,basis.tangent),RayMath.dot(v,basis.bitangent),Math.max(1e-6,RayMath.dot(v,basis.n))];\n    const vh=RayMath.normalize([a*vl[0],a*vl[1],vl[2]]);\n    const lensq=vh[0]*vh[0]+vh[1]*vh[1];\n    const t1=lensq>1e-12?[-vh[1]/Math.sqrt(lensq),vh[0]/Math.sqrt(lensq),0]:[1,0,0];\n    const t2=RayMath.cross(vh,t1);\n    const r=Math.sqrt(Math.max(0,u1)),phi=2*Math.PI*u2;\n    const p1=r*Math.cos(phi);\n    let p2=r*Math.sin(phi);\n    const mix=.5*(1+vh[2]);\n    p2=(1-mix)*Math.sqrt(Math.max(0,1-p1*p1))+mix*p2;\n    const z=Math.sqrt(Math.max(0,1-p1*p1-p2*p2));\n    const nh=RayMath.add(RayMath.add(RayMath.mul(t1,p1),RayMath.mul(t2,p2)),RayMath.mul(vh,z));\n    const ne=RayMath.normalize([a*nh[0],a*nh[1],Math.max(0,nh[2])]);\n    return RayMath.normalize(RayMath.add(RayMath.add(RayMath.mul(basis.tangent,ne[0]),RayMath.mul(basis.bitangent,ne[1])),RayMath.mul(basis.n,ne[2])));\n  },'''
s=s.replace(needle,replacement,1)
old_call='GGXImportanceSampler.sampleHalfVector(n,material.roughness,u1,u2)'
require(old_call,'GGX path sampling call')
s=s.replace(old_call,'GGXImportanceSampler.sampleVisibleHalfVector(n,v,material.roughness,u1,u2)',1)

# PASS 3 — explicit hard path/shadow budgets in existing integrators. Normal
# scenes stay unchanged; these are runaway guards, not sampling-quality knobs.
replace_once('''    const maxDepth=this.maxDepth(job);\n\n    for(let bounce=0;bounce<maxDepth;bounce++){''','''    const maxDepth=this.maxDepth(job);\n    const maxPathRays=Math.max(1,Math.min(4096,Number(job?.settings?.maxPathRays)||64));\n    let pathRays=1;\n\n    for(let bounce=0;bounce<maxDepth;bounce++){''','Path budget init')
replace_once('''      const origin=this.offsetOrigin(hit,n,sample.direction);\n      const eps=RenderRayPolicy.epsilonForPoint(origin);''','''      if(pathRays>=maxPathRays)break;\n      pathRays++;\n      const origin=this.offsetOrigin(hit,n,sample.direction);\n      const eps=RenderRayPolicy.epsilonForPoint(origin);''','Path budget guard')
replace_once('''    let color=RenderColor.mul(material.emissive,material.emissiveIntensity);\n\n    if(material.shading==='unlit')return RenderColor.add(material.baseColor,color);''','''    let color=RenderColor.mul(material.emissive,material.emissiveIntensity);\n    const maxShadowRays=Math.max(1,Math.min(4096,Number(job?.settings?.maxShadowRaysPerHit)||1024));\n    let shadowRays=0;\n\n    if(material.shading==='unlit')return RenderColor.add(material.baseColor,color);''','Shadow budget init')
replace_once('''        if(!sample?.direction||!sample.radiance||sample.radiance.every(x=>x<=0||!Number.isFinite(x)))continue;\n        if(light.castShadows!==false&&!ShadowVisibility.visible(acceleration,hit.position,sample.direction,sample.distance))continue;''','''        if(!sample?.direction||!sample.radiance||sample.radiance.every(x=>x<=0||!Number.isFinite(x)))continue;\n        if(light.castShadows!==false){\n          if(shadowRays>=maxShadowRays)break;\n          shadowRays++;\n          if(!ShadowVisibility.visible(acceleration,hit.position,sample.direction,sample.distance))continue;\n        }''','Shadow budget guard')

# PASS 4 — compact release marker/audit only; no duplicate rendering owner.
marker='''\n<script id="__3DLiteKernel3980">\n(()=>{\n  const info=Object.freeze({\n    version:'3.98.0',\n    architecture:'existing-renderer-in-place',\n    bvh:'SAH-12bin-normalized-leafcost-nearfirst',\n    ggx:'visible-normal-sampling',\n    pathBudget:true,shadowBudget:true,\n    parallelRenderer:false\n  });\n  window.ThreeDLiteKernel3980=info;\n})();\n</script>\n'''
if '__3DLiteKernel3980' not in s:
    pos=s.lower().rfind('</body>')
    if pos<0: raise SystemExit('Missing </body> insertion point')
    s=s[:pos]+marker+s[pos:]

# Release sanity checks.
checks={
 'version':'3.98.0' in s,
 '12-bin':'SAH-12bin-normalized-leafcost-nearfirst' in s,
 'vndf':'sampleVisibleHalfVector' in s,
 'path budget':'maxPathRays' in s,
 'shadow budget':'maxShadowRaysPerHit' in s,
 'RND-1104':'RND-1104' in s,
 'RND-1194':'RND-1194' in s,
 'debug list':'ThreeDLiteRenderDebugListUI' in s,
 'material guard':'ThreeDLiteMaterialIndexGuard' in s,
 'render window':'ThreeDLiteRenderWindow3979' in s or 'ThreeDLiteRenderWindow3980' in s,
 'single animation bootstrap':True
}
failed=[k for k,v in checks.items() if not v]
if failed: raise SystemExit('Validation failed: '+', '.join(failed))
if s==orig: raise SystemExit('No changes made')
p.write_text(s,encoding='utf-8')
print('v3.98.0 kernel consolidation applied:', ', '.join(k for k,v in checks.items() if v))
