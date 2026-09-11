from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
terms=['renderFrameWindow','render-title','RenderFramework','onProgress','progress','renderCanvas','renderImage','renderOutput','renderStatus']
out=[]
for term in terms:
    out.append(f'\n===== {term} =====\n')
    start=0
    count=0
    while True:
        i=s.find(term,start)
        if i<0 or count>=12: break
        a=max(0,i-2200); b=min(len(s),i+4200)
        out.append(f'--- occurrence {count+1} at {i} ---\n{s[a:b]}\n')
        start=i+len(term); count+=1
Path('tools/render_window_context_v3979.txt').write_text(''.join(out),encoding='utf-8')
print('inspection complete')
