from pathlib import Path

p=Path('index.html')
s=p.read_text()
if 'id="__3DLiteL3NDeepIntegration397"' in s:
    print('v3.97 deep integration already present')
    raise SystemExit(0)

changes=[]

def replace_once(old,new,label,required=True):
    global s
    if old in s:
        s=s.replace(old,new,1); changes.append(label); return True
    if required:
        raise SystemExit(f'Expected block not found for {label}; refusing unsafe patch')
    return False

replace_once('<title>3DLite v3.96.0 L3N Integrated Development</title>', '<title>3DLite v3.97.0 L3N Deep Integrated Development</title>', 'version title')
replace_once("const BuildIdentity=Object.freeze({version:'3.95.0',method:'L3N',targets:15,stage:'consolidated-infrastructure'});", "const BuildIdentity=Object.freeze({version:'3.97.0',method:'L3N',targets:15,stage:'deep-integrated-development'});", 'build identity')
replace_once("L.version='3.96.0';", "L.version='3.97.0';", 'integration identity')

old_sel="""  setVertices(ids,{refresh=true}={}){\n    const values=[...new Set(ids||[])];subSelection={ids:values};this._state()?.vertex.set(values);this.markChanged(false);\n    if(refresh){updateSubOverlay?.();syncTransformTarget?.();requestRender?.()}\n  },"""
new_sel="""  setVertices(ids,{refresh=true}={}){\n    const applySelection=()=>{\n      const ep=selected?.userData?.editPoly;\n      const max=ep?.v?.length??Number.MAX_SAFE_INTEGER;\n      const values=window.ThreeDLiteSelectionValidation?.normalizeIndices?.(ids,max)??[...new Set(ids||[])];\n      subSelection={ids:[...values]};this._state()?.vertex.set(values);this.markChanged(false);\n      if(refresh){updateSubOverlay?.();syncTransformTarget?.();requestRender?.()}\n    };\n    const perf=window.ThreeDLitePerformanceDiagnostics;\n    return perf?.measure?perf.measure('selection:setVertices',applySelection):applySelection();\n  },"""
replace_once(old_sel,new_sel,'selection normalization')

old_tw="""function targetWeldVertices(mesh,sourceId,targetId){\n  const ep=mesh?.userData?.editPoly;if(!ep||sourceId===targetId)return false;\n  const source=ep.v[sourceId],target=ep.v[targetId];if(!source||!target||source.dead||target.dead)return false;\n  const before=snapshotEditablePoly(mesh);\n  if(!MeshOps.targetWeld(mesh,sourceId,targetId))return false;\n  rebuildEditableGeometry(mesh,true);SelectionManager.clear({refresh:false});clearSubHoverOverlay();updateSubOverlay();syncTransformTarget();SelectionManager.markChanged();updateStats();\n  const after=snapshotEditablePoly(mesh);\n  if(editablePolyStateChanged(before,after)){HistoryManager.push(new MeshCommand('Target Weld',mesh,before,after));return true}\n  return false;\n}"""
new_tw="""function targetWeldVertices(mesh,sourceId,targetId){\n  const ep=mesh?.userData?.editPoly;if(!ep||sourceId===targetId)return false;\n  const source=ep.v[sourceId],target=ep.v[targetId];if(!source||!target||source.dead||target.dead)return false;\n  const guard=window.ThreeDLiteTargetWeldGuard;\n  if(guard?.canWeld&&!guard.canWeld(sourceId,targetId,ep.v.length)){\n    console.warn('Target Weld blocked by L3N preflight',{sourceId,targetId,vertexCount:ep.v.length});return false;\n  }\n  const before=snapshotEditablePoly(mesh);\n  const rollback=()=>{restoreEditablePoly(mesh,before);clearSubHoverOverlay();updateSubOverlay();syncTransformTarget();updateStats();requestRender();};\n  const apply=()=>{\n    if(!MeshOps.targetWeld(mesh,sourceId,targetId))return false;\n    rebuildEditableGeometry(mesh,true);\n    const geometryCheck=window.ThreeDLiteMeshValidation?.validateGeometry?.(mesh.geometry);\n    if(geometryCheck&&!geometryCheck.valid)throw new Error('Target Weld produced invalid geometry: '+geometryCheck.issues.join(','));\n    SelectionManager.clear({refresh:false});clearSubHoverOverlay();updateSubOverlay();syncTransformTarget();SelectionManager.markChanged();updateStats();\n    const after=snapshotEditablePoly(mesh);\n    if(editablePolyStateChanged(before,after)){HistoryManager.push(new MeshCommand('Target Weld',mesh,before,after));requestRender();return true}\n    return false;\n  };\n  try{\n    const tx=window.ThreeDLiteTransactionService;\n    return tx?.run?tx.run('Target Weld',apply,rollback):apply();\n  }catch(error){\n    console.error('Target Weld transaction rolled back',error);\n    if(!window.ThreeDLiteTransactionService?.run)rollback();\n    return false;\n  }\n}"""
replace_once(old_tw,new_tw,'target weld transaction')

replace_once("""    updateUniformScaleHandle();\n    renderer.render(scene,camera);""", """    updateUniformScaleHandle();\n    const renderFrame=()=>renderer.render(scene,camera);\n    const perf=window.ThreeDLitePerformanceDiagnostics;\n    if(perf?.measure)perf.measure('viewport:render',renderFrame);else renderFrame();""", 'render measurement')

replace_once("""  render(){renderer.render(scene,camera)},""", """  render(){const f=()=>renderer.render(scene,camera);const p=window.ThreeDLitePerformanceDiagnostics;return p?.measure?p.measure('viewport:backend-render',f):f()},""", 'backend render measurement')

replace_once("""window.addEventListener('resize',resize);\nresize();""", """window.addEventListener('resize',resize);\nsetTimeout(()=>window.ThreeDLiteEventOwnershipRegistry?.claim?.('ViewportRuntime',window,'resize','primary'),0);\nresize();""", 'resize ownership')

marker=r'''
<script id="__3DLiteL3NDeepIntegration397">
/* v3.97 deep integration completion marker and learning handoff */
(()=>{
  const learning=window.ThreeDLiteL3NTargetLearning;
  if(learning?.record){
    const notes=['telemetry deduplicated','startup/dependency guards active','release gate expanded','code audit active','event ownership active','viewport measured','selection normalized','mesh validation active','target weld transactional','undo/history preserved','renderer isolated/measured','safe repair available','performance diagnostics active','version identity unified','learning snapshot active'];
    for(let i=1;i<=15;i++)learning.record(i,'integrated',notes[i-1]);
  }
  const integration=window.ThreeDLiteL3NIntegration;
  const regression=integration?.regression?.()||{passed:false,failures:['integration-regression-unavailable']};
  window.__3DLiteL3NDeepIntegration=Object.freeze({version:'3.97.0',targets:15,regression,learning:learning?.snapshot?.()||[]});
})();
</script>
'''
if '</body>' not in s: raise SystemExit('Missing </body>')
s=s.replace('</body>',marker+'\n</body>',1)
changes.append('learning/consolidation marker')
p.write_text(s)
print('Applied v3.97 deep integration:', ', '.join(changes))
