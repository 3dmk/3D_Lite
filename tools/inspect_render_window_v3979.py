from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
terms=[
'class RenderFrameBufferView','class RenderJobController','const RenderFramework','var RenderFramework',
'RenderTileScheduler16.runLocal','Progressive','onProgress(','updateProgress(p)','present(frame)',
"const canvas=document.getElementById('renderCanvas')",'renderCanvasWrap','currentSamples','maximumSamples'
]
out=[]
for term in terms:
    out.append(f'\n===== {term} =====\n')
    start=0; count=0
    while True:
        i=s.find(term,start)
        if i<0 or count>=20: break
        a=max(0,i-3500); b=min(len(s),i+7500)
        out.append(f'--- occurrence {count+1} at {i} ---\n{s[a:b]}\n')
        start=i+len(term); count+=1
Path('tools/render_window_context_v3979.txt').write_text(''.join(out),encoding='utf-8')
print('expanded inspection complete')
