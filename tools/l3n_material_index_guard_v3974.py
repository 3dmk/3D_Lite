from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Version bump for the new tested software update.
s=s.replace('3.97.3','3.97.4')

# Teach the L3N material category this concrete failure type.
s=s.replace("materials:['texture','uv-scale','reflection','refraction','roughness','metalness','shader','invalid-values']",
            "materials:['texture','uv-scale','reflection','refraction','roughness','metalness','shader','invalid-values','material-index-out-of-range']")

# Renderer mesh snapshot gets the number of valid local material slots.
s=s.replace('  mesh(obj){','  mesh(obj,materialCount=1){')
s=s.replace('const mesh=this.mesh(obj);if(!mesh)continue;','const mesh=this.mesh(obj,ids.length);if(!mesh)continue;')

old="for(const gr of g.groups||[])for(let t=Math.floor(gr.start/3);t<Math.ceil((gr.start+gr.count)/3)&&t<mi.length;t++)mi[t]=gr.materialIndex||0;"
new="""for(const gr of g.groups||[]){
      const raw=Number(gr.materialIndex);
      const validCount=Math.max(1,Number(materialCount)||1);
      const safe=Number.isInteger(raw)&&raw>=0&&raw<validCount?raw:0;
      if(safe!==raw){
        try{window.ThreeDLiteL3NDebugRegistry?.register?.({category:'materials',subtype:'material-index-out-of-range',severity:'medium',subsystem:'renderer-material-binding',source:'render-snapshot',message:'Material index out of range repaired',reproduced:true,regression:false,evidence:{object:obj.name||obj.uuid||'Mesh',requestedIndex:raw,availableMaterialCount:validCount,repairedIndex:safe},status:'resolved',successfulFix:'Remapped invalid geometry group material index to material slot 0'});}catch(_){}
        gr.materialIndex=safe;
      }
      for(let t=Math.floor(gr.start/3);t<Math.ceil((gr.start+gr.count)/3)&&t<mi.length;t++)mi[t]=safe;
    }"""
count=s.count(old)
if count < 1:
    raise SystemExit('material group snapshot assignment not found')
s=s.replace(old,new)

# Public utility: validate/repair any mesh before it reaches viewport/rendering code.
marker='__3DLiteMaterialIndexGuard3974'
if marker not in s:
    layer='''\n<script id="__3DLiteMaterialIndexGuard3974">\n/* 3DLite v3.97.4 — material slot integrity guard */\n(()=>{\n  const VERSION='3.97.4';\n  function slotsFor(obj){return Math.max(1,Array.isArray(obj?.material)?obj.material.length:(obj?.material?1:1));}\n  function inspect(obj){\n    const groups=obj?.geometry?.groups||[];\n    const materialCount=slotsFor(obj);\n    const invalid=[];\n    for(let i=0;i<groups.length;i++){\n      const raw=Number(groups[i]?.materialIndex);\n      if(!Number.isInteger(raw)||raw<0||raw>=materialCount)invalid.push({groupIndex:i,requestedIndex:raw});\n    }\n    return Object.freeze({valid:invalid.length===0,materialCount,invalid:Object.freeze(invalid.map(x=>Object.freeze({...x})))});\n  }\n  function repairObject(obj,source='material-guard'){\n    const before=inspect(obj);\n    if(before.valid)return Object.freeze({repaired:false,...before});\n    const groups=obj?.geometry?.groups||[];\n    const repairs=[];\n    for(const bad of before.invalid){\n      const group=groups[bad.groupIndex];\n      if(!group)continue;\n      const old=group.materialIndex;\n      group.materialIndex=0;\n      repairs.push({groupIndex:bad.groupIndex,from:old,to:0});\n    }\n    try{window.ThreeDLiteL3NDebugRegistry?.register?.({category:'materials',subtype:'material-index-out-of-range',severity:'medium',subsystem:'material-binding',source,message:'Material index out of range repaired',reproduced:true,regression:false,evidence:{object:obj?.name||obj?.uuid||'Mesh',availableMaterialCount:before.materialCount,repairs},status:'resolved',successfulFix:'Invalid group material indices remapped to slot 0'});}catch(_){}\n    return Object.freeze({repaired:repairs.length>0,materialCount:before.materialCount,repairs:Object.freeze(repairs.map(x=>Object.freeze({...x})))});\n  }\n  function repairScene(root=window.scene){\n    let checked=0,repaired=0;\n    root?.traverse?.(obj=>{if(!obj?.isMesh)return;checked++;const r=repairObject(obj,'scene-scan');if(r.repaired)repaired++;});\n    return Object.freeze({checked,repaired});\n  }\n  window.ThreeDLiteMaterialIndexGuard=Object.freeze({version:VERSION,inspect,repairObject,repairScene});\n})();\n</script>\n'''
    pos=s.lower().rfind('</body>')
    if pos<0: raise SystemExit('missing </body>')
    s=s[:pos]+layer+s[pos:]

required=[
  '3DLite v3.97.4',
  '__3DLiteMaterialIndexGuard3974',
  'ThreeDLiteMaterialIndexGuard',
  'material-index-out-of-range',
  'this.mesh(obj,ids.length)',
  'gr.materialIndex=safe',
]
for x in required:
    if x not in s: raise SystemExit('missing required marker: '+x)

p.write_text(s,encoding='utf-8')
print('patched v3.97.4 material index guard; renderer assignments replaced:',count)
