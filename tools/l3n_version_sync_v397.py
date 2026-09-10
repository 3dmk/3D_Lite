from pathlib import Path
p=Path('index.html'); s=p.read_text(); changed=[]
repls=[
("<span class=\"small\" id=\"threeDLitePublicVersion\">3DLite 3.94.1</span>","<span class=\"small\" id=\"threeDLitePublicVersion\">3DLite 3.97.0</span>",'public version label'),
("const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.94.1'});","const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.97.0'});",'authoritative version'),
("const ThreeDLiteBrowserTestAPI = Object.freeze({\n  version:'3.94.1',","const ThreeDLiteBrowserTestAPI = Object.freeze({\n  version:'3.97.0',",'browser test API version'),
("ThreeDLiteSubsystemHealth?.set?.('browserTestAPI','READY','v3.94.1 GitHub Pages runtime bridge installed');","ThreeDLiteSubsystemHealth?.set?.('browserTestAPI','READY','v3.97.0 GitHub Pages runtime bridge installed');",'browser bridge status'),
("window.__3DLiteLiveBuild = Object.freeze({\n  version:'3.94.1',","window.__3DLiteLiveBuild = Object.freeze({\n  version:'3.97.0',",'live build metadata'),
("3DLite v3.94.1 — Central Public Version Synchronizer","3DLite v3.97.0 — Central Public Version Synchronizer",'version synchronizer comment'),
("3DLite v3.95.0 — L3N Runtime Learning","3DLite v3.97.0 — L3N Runtime Learning",'runtime learning version')]
for old,new,label in repls:
    if old in s: s=s.replace(old,new,1); changed.append(label)
# Public synchronizer owns runtime document.title; retain channel wording but use authoritative version.
if "version:'3.97.0'" not in s: raise SystemExit('v3.97 authoritative version missing after patch')
p.write_text(s)
print('Synchronized:', ', '.join(changed))
