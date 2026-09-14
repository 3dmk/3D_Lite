from pathlib import Path
import sys
VERSION='3.99.21'
SCRIPT='  <script src="litepix/render-health-bridge-v4.49.js"></script>\n'

def patch(path:Path):
    text=path.read_text(encoding='utf-8'); original=text
    if 'render-health-bridge-v4.49.js' not in text:
        if '</body>' not in text: raise RuntimeError('body close missing')
        text=text.replace('</body>',SCRIPT+'</body>',1)
    text=text.replace('3.99.20',VERSION)
    for token in ['render-health-bridge-v4.49.js','3.99.21']:
        if token not in text: raise RuntimeError('missing '+token)
    if text==original: raise RuntimeError('no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} render health integration')

if __name__=='__main__':
    for p in ([Path(x) for x in sys.argv[1:]] or [Path('index.html')]):
        if p.exists(): patch(p)
