from pathlib import Path
p=Path('index.html')
s=p.read_text()
changed=[]
repls=[
("if(s.maxBounces!==16||s.progressive||s.adaptive||s.denoise!=='Off')errors.push('Deferred setting sanitization failed');","if(s.maxBounces!==16||!s.progressive||!s.adaptive||s.denoise!=='Quality')errors.push('Deferred setting sanitization failed');",'Part 6 sanitization self-test'),
("if(!Number.isFinite(m.totalMs)||!Number.isFinite(m.estimatedRaysPerSecond))errors.push('Performance metric test failed');","if(!Number.isFinite(m.totalMs)||!Number.isFinite(m.raysPerSecond??m.estimatedRaysPerSecond))errors.push('Performance metric test failed');",'Part 6 performance self-test'),
("const h=RenderSampling.hash32((Number(id)||0)+1);\n    return [((h>>>16)&255)/255,((h>>>8)&255)/255,(h&255)/255];","const h=(RenderSampling.hash32((Number(id)||0)+1)*4294967296)>>>0;\n    return [((h>>>16)&255)/255,((h>>>8)&255)/255,(h&255)/255];",'Group 12 ID color encoding')]
for old,new,label in repls:
    if old not in s:
        raise SystemExit(f'Expected renderer target missing: {label}')
    s=s.replace(old,new,1); changed.append(label)
# Version patch, preserving historical subsystem comments.
vrepls=[
("const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.97.0'});","const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.97.1'});"),
("<span class=\"small\" id=\"threeDLitePublicVersion\">3DLite 3.97.0</span>","<span class=\"small\" id=\"threeDLitePublicVersion\">3DLite 3.97.1</span>"),
("const ThreeDLiteBrowserTestAPI = Object.freeze({\n  version:'3.97.0',","const ThreeDLiteBrowserTestAPI = Object.freeze({\n  version:'3.97.1',"),
("ThreeDLiteSubsystemHealth?.set?.('browserTestAPI','READY','v3.97.0 GitHub Pages runtime bridge installed');","ThreeDLiteSubsystemHealth?.set?.('browserTestAPI','READY','v3.97.1 GitHub Pages runtime bridge installed');"),
("window.__3DLiteLiveBuild = Object.freeze({\n  version:'3.97.0',","window.__3DLiteLiveBuild = Object.freeze({\n  version:'3.97.1',"),
("3DLite v3.97.0 — Central Public Version Synchronizer","3DLite v3.97.1 — Central Public Version Synchronizer"),
("3DLite v3.97.0 — L3N Runtime Learning","3DLite v3.97.1 — L3N Runtime Learning")]
for old,new in vrepls:
    if old in s: s=s.replace(old,new,1)
p.write_text(s)
print('Applied:', ', '.join(changed), 'and version 3.97.1')
