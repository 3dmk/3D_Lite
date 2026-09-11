from pathlib import Path
import json,re
ROOT=Path('.')
files=[Path('index.html')]+sorted(Path('litepix').glob('*.js'))+sorted(Path('3dlite').glob('*.js'))
DECL=[('class',re.compile(r'\bclass\s+([A-Za-z_$][\w$]*)')),('function',re.compile(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(')),('const-object',re.compile(r'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*Object\.freeze\s*\(')),('const-arrow',re.compile(r'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^;\n]*?\)\s*=>'))]
registry=[];metrics={};
for p in files:
    if not p.exists(): continue
    text=p.read_text(encoding='utf-8',errors='replace');lines=text.splitlines();metrics[str(p)]={'bytes':len(text.encode()),'lines':len(lines)}
    for kind,rx in DECL:
        for m in rx.finditer(text):
            line=text.count('\n',0,m.start())+1
            registry.append({'id':f'{p}:{line}:{m.group(1)}','name':m.group(1),'kind':kind,'file':str(p),'line':line,'status':'VERIFIED_EXISTING'})
html=Path('index.html').read_text(encoding='utf-8',errors='replace')
ids=re.findall(r'\bid\s*=\s*["\']([^"\']+)["\']',html,re.I)
scripts=re.findall(r'<script\b([^>]*)>([\s\S]*?)</script>',html,re.I)
report={'schema':1,'application':'3DLite','method':'DCAMP structural extraction','files':metrics,'registryCount':len(registry),'registry':registry,'startup':{'duplicateIds':len(ids)-len(set(ids)),'externalScriptInlineBodies':sum(1 for a,b in scripts if re.search(r'\bsrc\s*=',a) and b.strip()),'animationLoopStarts':len(re.findall(r'requestAnimationFrame\s*\(\s*animate\s*\)',html))},'classification':[{'element':'index.html monolith','decision':'REWRITE/MOVE/SIMPLIFY','reason':'Required behavior remains, but application and renderer responsibilities are concentrated in one large file.'},{'element':'3dlite/main-core-v1.js','decision':'KEEP/IMPROVE','reason':'Provides validated transaction, generation and rollback foundation.'},{'element':'3dlite/main-core-v2.js','decision':'KEEP','reason':'Adds lean DCAMP command, adapter, derived-data, resource and tool-lifecycle capabilities without duplicating renderer ownership.'},{'element':'LitePix','decision':'KEEP/IMPROVE SEPARATELY','reason':'Renderer remains behind a 3DLite boundary; editable application state must not move into LitePix.'}]}
Path('reports/3dlite').mkdir(parents=True,exist_ok=True)
Path('reports/3dlite/dcamp-structure-inventory.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
Path('docs/architecture').mkdir(parents=True,exist_ok=True)
md=['# 3D Lite Current Structural Sheet','','Generated from the current repository by `tools/architecture/scan_3dlite.py`.','',f'- Files scanned: {len(metrics)}',f'- Verified declarations indexed: {len(registry)}',f'- Duplicate IDs: {report["startup"]["duplicateIds"]}',f'- External script tags with inline bodies: {report["startup"]["externalScriptInlineBodies"]}',f'- `requestAnimationFrame(animate)` starts: {report["startup"]["animationLoopStarts"]}','','## Top-level classification','']
for c in report['classification']: md.append(f'- **{c["element"]} — {c["decision"]}**: {c["reason"]}')
md += ['','## Verified declaration registry','']
for r in registry: md.append(f'- `{r["file"]}:{r["line"]}` — {r["kind"]} `{r["name"]}`')
Path('docs/architecture/STRUCTURAL_SHEET_CURRENT.md').write_text('\n'.join(md)+'\n',encoding='utf-8')
print(json.dumps({'files':len(metrics),'registry':len(registry),'startup':report['startup']},indent=2))
