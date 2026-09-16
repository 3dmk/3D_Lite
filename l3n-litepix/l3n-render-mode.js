(function(g){'use strict';
const KEY='3dlite.l3n.bestRenderProfile.v1';let nextMode='normal',activeMode='normal';
const clone=x=>JSON.parse(JSON.stringify(x||{}));
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){return null}}
function save(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch(_){}}
function comparable(a,b){return !!a&&!!b&&a.signature===b.signature;}
function settingsFromBest(){const b=load();return b?.settings?clone(b.settings):null;}
function startL3N(){const s=settingsFromBest();nextMode='l3n';return g.RenderFramework?.render?.('full',null,s||null);}
function markNormal(){nextMode='normal';}
function onStart(job){activeMode=nextMode;nextMode='normal';if(job)job.__l3nRenderMode=activeMode;}
function onComplete(e,analysis,job){const mode=job?.__l3nRenderMode||activeMode;const old=load();let promoted=false;
 if(mode==='l3n'&&e?.status==='Finished'&&(!old||!comparable(old.evidence,e)||e.elapsedMs<old.evidence.elapsedMs)){save({at:Date.now(),settings:clone(job?.settings),evidence:e});promoted=true;}
 const badge=document.getElementById('l3nBestRenderBadge');if(badge){const b=load();badge.textContent=b?`L3N Best: ${Math.round(b.evidence.elapsedMs)}ms${promoted?' NEW':''}`:'L3N Best: none';badge.title=b?'Normal Render remains unchanged. L3N Render uses the learned best settings when available.':'';}
 return {mode,promoted,best:load()};}
function install(){const normal=document.getElementById('renderNowBtn');if(normal&&!document.getElementById('l3nRenderBtn')){normal.addEventListener('click',markNormal,true);const b=document.createElement('button');b.id='l3nRenderBtn';b.type='button';b.textContent='L3N Render';b.title='Render using L3N learned best comparable settings';b.addEventListener('click',e=>{e.stopPropagation();startL3N();});normal.after(b);const badge=document.createElement('span');badge.id='l3nBestRenderBadge';badge.style.cssText='padding:4px 7px;color:#9ddd9d;font:11px monospace';b.after(badge);onComplete(null,null,null);}}
g.L3NRenderMode=Object.freeze({version:'1.0.0',install,startL3N,onStart,onComplete,best:load});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})(window);
