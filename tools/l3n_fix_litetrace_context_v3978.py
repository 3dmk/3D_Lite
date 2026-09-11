from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
# Verify actual use contract before introducing the missing shared context.
props=sorted(set(re.findall(r'LiteTraceExecutionContext\.([A-Za-z_$][\w$]*)',s)))
allowed={'activeJob','performance'}
extra=set(props)-allowed
if extra:
    raise SystemExit('Unexpected LiteTraceExecutionContext properties: '+repr(sorted(extra)))
if not {'activeJob','performance'}.issubset(set(props)):
    raise SystemExit('Expected LiteTraceExecutionContext use sites not found: '+repr(props))
# Bump current software identity.
s=s.replace('3.97.7','3.97.8')
# Introduce exactly one shared mutable execution context before the first renderer use.
needle='var BasicDirectRenderer=Object.freeze({'
if needle not in s:
    raise SystemExit('BasicDirectRenderer anchor missing')
marker='__3DLiteLiteTraceExecutionContext3978'
if marker not in s:
    decl="""/* 3DLite v3.97.8 — LiteTrace execution-context dependency repair */
var LiteTraceExecutionContext=(function(){
  const existing=window.LiteTraceExecutionContext;
  if(existing&&typeof existing==='object')return existing;
  const ctx={activeJob:null,performance:null};
  window.LiteTraceExecutionContext=ctx;
  return ctx;
})();
window.__3DLiteLiteTraceExecutionContext3978=true;

"""
    s=s.replace(needle,decl+needle,1)
# Release-time structure checks.
if s.count('var LiteTraceExecutionContext=(function(){')!=1:
    raise SystemExit('LiteTraceExecutionContext declaration count invalid')
first_decl=s.find('var LiteTraceExecutionContext=(function(){')
first_use=s.find('LiteTraceExecutionContext.activeJob')
if first_decl<0 or first_use<0 or first_decl>first_use:
    raise SystemExit('LiteTraceExecutionContext is not initialized before first use')
required=['3DLite v3.97.8','__3DLiteLiteTraceExecutionContext3978','RND-1104','ThreeDLiteL3NCompleteRenderDebugger','ThreeDLiteRenderDebugListUI']
for x in required:
    if x not in s: raise SystemExit('missing '+x)
p.write_text(s,encoding='utf-8')
print('v3.97.8 fixed LiteTraceExecutionContext; properties:',props)
