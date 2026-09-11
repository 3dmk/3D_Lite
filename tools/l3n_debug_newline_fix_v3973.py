from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
start=s.find('<script id="__3DLiteL3NDebugRegistry3973">')
if start < 0:
    raise SystemExit('missing diagnostic layer')
end=s.find('</script>', start)
if end < 0:
    raise SystemExit('missing diagnostic layer close tag')
end += len('</script>')
seg=s[start:end]
fixed=seg.replace(r'\n','\n')
if fixed == seg:
    print('diagnostic layer newlines already clean')
else:
    s=s[:start]+fixed+s[end:]
    p.write_text(s,encoding='utf-8')
    print('repaired diagnostic layer literal newline escapes')
