from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
terms=['LiteTraceExecutionContext','ExecutionContext','LiteTrace','new LiteTrace','RND-1104']
out=[]
for term in terms:
    out.append('\n===== '+term+' =====\n')
    start=0; n=0
    while True:
        i=s.find(term,start)
        if i<0: break
        n+=1
        a=max(0,i-1800); b=min(len(s),i+3000)
        out.append(f'--- occurrence {n} at {i} ---\n'+s[a:b]+'\n')
        start=i+len(term)
    if n==0: out.append('NO OCCURRENCES\n')
Path('tools/litetrace_context_v3978.txt').write_text(''.join(out),encoding='utf-8')
print('inspection written')
