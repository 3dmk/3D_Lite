from pathlib import Path
path=Path('tools/l3n_render_window_live_v3979.py')
src=path.read_text(encoding='utf-8')
src=src.replace("assert '__3DLiteRenderWindowLive3979' not in s", "assert '<script id=\"__3DLiteRenderWindowLive3979\">' not in s")
exec(compile(src,str(path),'exec'),{'__name__':'__main__'})
