from pathlib import Path
p=Path('index.html')
s=p.read_text()
old='3.97.1'; new='3.97.2'
repls=[
("<span class=\"small\" id=\"threeDLitePublicVersion\">3DLite 3.97.1</span>","<span class=\"small\" id=\"threeDLitePublicVersion\">3DLite 3.97.2</span>",'public label'),
("const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.97.1'});","const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.97.2'});",'authoritative version'),
("const ThreeDLiteBrowserTestAPI = Object.freeze({\n  version:'3.97.1',","const ThreeDLiteBrowserTestAPI = Object.freeze({\n  version:'3.97.2',",'browser API version'),
("ThreeDLiteSubsystemHealth?.set?.('browserTestAPI','READY','v3.97.1 GitHub Pages runtime bridge installed');","ThreeDLiteSubsystemHealth?.set?.('browserTestAPI','READY','v3.97.2 GitHub Pages runtime bridge installed');",'browser bridge status'),
("window.__3DLiteLiveBuild = Object.freeze({\n  version:'3.97.1',","window.__3DLiteLiveBuild = Object.freeze({\n  version:'3.97.2',",'live build metadata'),
("3DLite v3.97.1 — Central Public Version Synchronizer","3DLite v3.97.2 — Central Public Version Synchronizer",'synchronizer comment'),
("<title>3DLite v3.97.1", "<title>3DLite v3.97.2", 'static title')
]
changed=[]
for a,b,label in repls:
    if a in s:
        s=s.replace(a,b,1); changed.append(label)
# Keep historical subsystem comments intact. Update active deep build identities only where clearly current.
s=s.replace("window.ThreeDLiteBuildIdentity=Object.freeze({version:'3.97.1'", "window.ThreeDLiteBuildIdentity=Object.freeze({version:'3.97.2'",1)
s=s.replace("version:'3.97.1',method:'L3N'", "version:'3.97.2',method:'L3N'",1)
required=[
"const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.97.2'});",
"<span class=\"small\" id=\"threeDLitePublicVersion\">3DLite 3.97.2</span>",
]
missing=[x for x in required if x not in s]
if missing: raise SystemExit('Missing v3.97.2 public identity markers: '+repr(missing))
p.write_text(s)
print('v3.97.2 updated:', ', '.join(changed))
