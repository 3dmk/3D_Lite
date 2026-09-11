from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

s=s.replace('3.97.6','3.97.7')

marker='__3DLiteRenderDebugList3977'
if marker not in s:
    layer=r'''
<script id="__3DLiteRenderDebugList3977">
/* 3DLite v3.97.7 — selectable/copyable render-debug list in editor render window */
(()=>{
  const VERSION='3.97.7';
  const STATE={timer:null,lastText:'',opened:false};
  const safe=v=>{try{return JSON.parse(JSON.stringify(v));}catch(_){return null;}};
  const esc=v=>String(v??'').replace(/\r?\n/g,' ');
  const fmtTime=t=>{try{return new Date(t||Date.now()).toLocaleTimeString();}catch(_){return '--:--:--';}};

  function sourceSnapshot(){
    const complete=window.ThreeDLiteL3NCompleteRenderDebugger?.snapshot?.();
    const base=window.ThreeDLiteL3NRenderDebugger?.snapshot?.();
    return {complete:safe(complete),base:safe(base)};
  }

  function collectEvents(){
    const {complete,base}=sourceSnapshot();
    const rows=[];
    const seen=new Set();
    const add=e=>{
      if(!e||!e.code)return;
      const key=[e.code,e.at||e.detectedAt||'',e.renderId||'',e.message||''].join('|');
      if(seen.has(key))return;seen.add(key);
      rows.push({
        at:e.at||e.detectedAt||Date.now(),code:e.code||'RND-1194',severity:e.severity||'info',
        renderId:e.renderId??'',stage:e.stage||'',status:e.status||'',message:e.message||e.name||'',
        evidence:e.evidence||null
      });
    };
    for(const e of complete?.events||[])add(e);
    for(const e of complete?.base?.reports||[])add(e);
    for(const e of base?.reports||[])add(e);
    rows.sort((a,b)=>(a.at||0)-(b.at||0));
    return {rows,complete,base};
  }

  function buildText(){
    const {rows,complete,base}=collectEvents();
    const active=complete?.active||base?.active||null;
    const lines=[];
    lines.push('3DLite Render Debug List v'+VERSION);
    lines.push('Errors: '+rows.length);
    if(active){
      lines.push('Active Render: '+String(active.renderId??'—')+' | '+String(active.status??'—')+' | '+String(active.percent??active.progressPercent??'—')+'%');
    }
    lines.push('');
    if(!rows.length){
      lines.push('No RND render errors recorded.');
    }else{
      rows.forEach((r,i)=>{
        lines.push(String(i+1).padStart(3,'0')+' | '+fmtTime(r.at)+' | '+esc(r.code)+' | '+String(r.severity||'').toUpperCase()+' | Render '+esc(r.renderId||'—')+' | '+esc(r.stage||'—')+' | '+esc(r.status||'—')+' | '+esc(r.message));
      });
    }
    lines.push('');
    lines.push('--- CURRENT RENDER EVIDENCE ---');
    if(active){
      const keys=['renderId','status','percent','progressPercent','currentSamples','maximumSamples','elapsedMs','resolution','raysPerSecond','totalRays','raysCast','primaryRays','secondaryRays','shadowRays','reflectionRays','refractionRays','intersections','misses','bvhTests','invalidRays','bounceDepth','noise','engine','error','errorStage'];
      for(const k of keys){
        const v=active[k]; if(v!==undefined&&v!==null&&v!=='') lines.push(k+': '+(Array.isArray(v)?v.join(' x '):String(v)));
      }
    }else lines.push('No active render.');
    return lines.join('\n');
  }

  function ensureUI(){
    const win=document.getElementById('renderFrameWindow');
    if(!win)return false;
    if(!document.getElementById('l3nRenderDebugListBtn')){
      const title=win.querySelector('.render-title');
      const btn=document.createElement('button');
      btn.type='button';btn.id='l3nRenderDebugListBtn';btn.textContent='Debug List';btn.title='Open selectable render debugging list';
      btn.style.cssText='margin-left:4px;padding:2px 7px;font-size:11px;';
      const close=title?.querySelector('[data-render-close="frame"]');
      if(title)title.insertBefore(btn,close||null);
      btn.addEventListener('click',()=>toggle());
    }
    if(!document.getElementById('l3nRenderDebugListWindow')){
      const panel=document.createElement('div');
      panel.id='l3nRenderDebugListWindow';
      panel.style.cssText='display:none;position:absolute;left:12px;right:12px;top:44px;bottom:12px;z-index:30;background:#1c1c1c;border:1px solid #555;box-shadow:0 8px 28px rgba(0,0,0,.55);padding:8px;min-width:360px;min-height:180px;';
      panel.innerHTML=`
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font:12px sans-serif;color:#ddd;">
          <b style="margin-right:auto">Render Debugging List <span style="font-weight:normal;color:#aaa">v${VERSION}</span></b>
          <button type="button" id="l3nRenderDebugRefresh">Refresh</button>
          <button type="button" id="l3nRenderDebugCopySelected">Copy Selected</button>
          <button type="button" id="l3nRenderDebugCopyAll">Copy All</button>
          <button type="button" id="l3nRenderDebugClose">Close</button>
        </div>
        <textarea id="l3nRenderDebugListText" readonly spellcheck="false" aria-label="Render debugging list" style="width:100%;height:calc(100% - 32px);resize:none;background:#111;color:#ddd;border:1px solid #444;padding:8px;font:11px/1.45 Consolas,monospace;white-space:pre;overflow:auto;user-select:text;-webkit-user-select:text;cursor:text;box-sizing:border-box;"></textarea>
        <div id="l3nRenderDebugCopyStatus" style="position:absolute;left:10px;bottom:3px;font:10px sans-serif;color:#aaa;pointer-events:none"></div>`;
      win.appendChild(panel);
      panel.querySelector('#l3nRenderDebugRefresh')?.addEventListener('click',refresh);
      panel.querySelector('#l3nRenderDebugCopyAll')?.addEventListener('click',copyAll);
      panel.querySelector('#l3nRenderDebugCopySelected')?.addEventListener('click',copySelected);
      panel.querySelector('#l3nRenderDebugClose')?.addEventListener('click',close);
      const ta=panel.querySelector('#l3nRenderDebugListText');
      ta?.addEventListener('mousedown',e=>e.stopPropagation());
      ta?.addEventListener('select',()=>status('Selection ready to copy'));
    }
    return true;
  }

  function status(msg){const el=document.getElementById('l3nRenderDebugCopyStatus');if(el){el.textContent=msg;setTimeout(()=>{if(el.textContent===msg)el.textContent='';},1400);}}
  function refresh(){
    if(!ensureUI())return '';
    const ta=document.getElementById('l3nRenderDebugListText');
    const text=buildText();STATE.lastText=text;
    if(ta&&ta.value!==text){const a=ta.selectionStart,b=ta.selectionEnd;ta.value=text;try{ta.setSelectionRange(Math.min(a,text.length),Math.min(b,text.length));}catch(_){}}
    return text;
  }
  async function writeClipboard(text){
    if(!text)return false;
    try{await navigator.clipboard.writeText(text);return true;}catch(_){
      const ta=document.getElementById('l3nRenderDebugListText');if(!ta)return false;ta.focus();document.execCommand?.('copy');return true;
    }
  }
  async function copyAll(){const text=refresh();const ok=await writeClipboard(text);status(ok?'Copied all render debugging':'Copy failed');return ok;}
  async function copySelected(){
    const ta=document.getElementById('l3nRenderDebugListText');if(!ta)return false;
    const text=ta.value.slice(ta.selectionStart,ta.selectionEnd);
    if(!text){status('Select text first');ta.focus();return false;}
    const ok=await writeClipboard(text);status(ok?'Copied selected text':'Copy failed');return ok;
  }
  function open(){if(!ensureUI())return false;const p=document.getElementById('l3nRenderDebugListWindow');p.style.display='block';STATE.opened=true;refresh();startVisibleTimer();document.getElementById('l3nRenderDebugListText')?.focus();return true;}
  function close(){const p=document.getElementById('l3nRenderDebugListWindow');if(p)p.style.display='none';STATE.opened=false;stopVisibleTimer();return true;}
  function toggle(){return STATE.opened?close():open();}
  function startVisibleTimer(){stopVisibleTimer();STATE.timer=setInterval(()=>{if(STATE.opened)refresh();},1000);}
  function stopVisibleTimer(){if(STATE.timer){clearInterval(STATE.timer);STATE.timer=null;}}

  document.addEventListener('DOMContentLoaded',()=>{setTimeout(ensureUI,0);setTimeout(ensureUI,1000);});
  window.ThreeDLiteRenderDebugListUI=Object.freeze({version:VERSION,open,close,toggle,refresh,copyAll,copySelected,text:buildText});
  window.__3DLiteRenderDebugListText=()=>buildText();
})();
</script>
'''
    pos=s.lower().rfind('</body>')
    if pos<0: raise SystemExit('missing </body>')
    s=s[:pos]+layer+s[pos:]

required=['3DLite v3.97.7','__3DLiteRenderDebugList3977','ThreeDLiteRenderDebugListUI','l3nRenderDebugListWindow','l3nRenderDebugListText','Copy Selected','Copy All']
for x in required:
    if x not in s: raise SystemExit('missing '+x)

p.write_text(s,encoding='utf-8')
print('patched v3.97.7 selectable render debug list')
