from pathlib import Path

p = Path('index.html')
s = p.read_text()
marker = 'id="__3DLiteL3NIntegrationSteps2to7"'
if marker in s:
    print('integration already present')
    raise SystemExit(0)

block = r'''
<script id="__3DLiteL3NIntegrationSteps2to7">
/* 3DLite v3.96.0 — L3N integration steps 2-7 */
(()=>{'use strict';
const L=window.ThreeDLiteL3NIntegration=window.ThreeDLiteL3NIntegration||{};L.version='3.96.0';
L.steps=Object.freeze({startup:true,eventOwnership:true,viewportSelection:true,meshTargetWeldUndo:true,rendererPerformance:true,codeVersionAudit:true,consolidation:true});
L.startup=()=>{const g=window.ThreeDLiteStartupGuardService;const deps={THREE:!!window.THREE,document:!!document,viewport:!!document.getElementById('viewport')};if(g)for(const [k,v] of Object.entries(deps))g.dependency(k,v);return Object.freeze(deps);};
L.claimEvent=(owner,target,type,key='default')=>window.ThreeDLiteEventOwnershipRegistry?.claim?.(owner,target,type,key)??true;
L.normalizeSelection=(indices,max)=>window.ThreeDLiteSelectionValidation?.normalizeIndices?.(indices,max)??Object.freeze([]);
L.requestViewport=(reason='l3n-integration')=>window.ThreeDLiteRendererIsolation?.requestRender?.(reason)??false;
L.measureSelection=(label,fn)=>window.ThreeDLitePerformanceDiagnostics?.measure?.('selection:'+label,fn)??fn();
L.validateMesh=g=>window.ThreeDLiteMeshValidation?.validateGeometry?.(g)??Object.freeze({valid:!!g,issues:Object.freeze([])});
L.targetWeldPreflight=(source,target,geometry)=>window.ThreeDLiteTargetWeldGuard?.preflight?.(source,target,geometry)??Object.freeze({allowed:false});
L.meshTransaction=(label,apply,rollback)=>window.ThreeDLiteTransactionService?.run?.(label,apply,rollback)??apply();
L.safeMeshOperation=(label,geometry,apply,rollback)=>{const before=L.validateMesh(geometry);if(!before.valid)throw new Error('3DLite mesh preflight failed: '+before.issues.join(','));return L.meshTransaction(label,()=>{const value=window.ThreeDLitePerformanceDiagnostics?.measure?.('mesh:'+label,apply)??apply();const after=L.validateMesh(geometry);if(!after.valid)throw new Error('3DLite mesh postflight failed: '+after.issues.join(','));L.requestViewport('mesh:'+label);return value;},rollback);};
L.measureViewport=(label,fn)=>window.ThreeDLitePerformanceDiagnostics?.measure?.('viewport:'+label,fn)??fn();
L.rendererState=()=>window.ThreeDLiteRendererIsolation?.inspect?.()??Object.freeze({rendererPresent:false});
L.audit=()=>Object.freeze({build:window.ThreeDLiteBuildIdentity||Object.freeze({version:L.version}),code:window.ThreeDLiteCodeAuditService?.inspect?.()||Object.freeze({}),renderer:L.rendererState(),startup:window.ThreeDLiteStartupGuardService?.inspect?.()||Object.freeze({})});
L.regression=()=>{const audit=L.audit(),failures=[];if(!window.THREE)failures.push('THREE-missing');if(!document.getElementById('viewport'))failures.push('viewport-missing');if(audit.renderer?.contextLost)failures.push('renderer-context-lost');return Object.freeze({version:L.version,passed:failures.length===0,failures:Object.freeze(failures),audit});};
L.startup();window.__3DLiteL3NIntegrationSnapshot=L.regression();})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('Missing </body>')
s = s.replace('</body>', block + '\n</body>', 1)
s = s.replace('<title>3DLite v3.95.0 L3N 15-Target Development</title>', '<title>3DLite v3.96.0 L3N Integrated Development</title>', 1)
p.write_text(s)
print('v3.96 integration applied')
