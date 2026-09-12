(function(root){'use strict';
const VERSION='4.46.2';
const ORDER=[
 ['render-request','Render request'],['settings-validation','Settings validation'],['backend-selection','Backend selection'],['telemetry-reset','Telemetry reset'],['scene-snapshot','Scene snapshot'],['geometry-compile','Geometry compile'],['material-compile','Material / texture compile'],['light-compile','Light compile'],['acceleration','BLAS / TLAS / BVH build'],['light-structures','Light distributions / Light Tree'],['gi-structures','GI / Light Cache / Path Guiding preparation'],['film-setup','Film / AOV setup'],['workers','Workers / task queues'],['progressive-loop','Progressive render loop'],['primary-rays','Primary rays'],['surface-shading','Surface / BSDF evaluation'],['direct-light','Direct-light sampling'],['shadow-visibility','Shadow visibility'],['secondary-rays','Secondary / continuation rays'],['bounce-loop','Bounce loop'],['gi-evaluation','GI evaluation'],['accumulation','HDR accumulation'],['noise-check','Variance / noise check'],['final-resolve','Final film / AOV resolve'],['display-pipeline','Exposure / tone map / display transform'],['debug-report','Final health report']
];
const now=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const active=s=>/render|running|progress|trace|sampling/i.test(String(s||''));
const done=s=>/complete|finished|done/i.test(String(s||''));
const statusRank=Object.freeze({'NOT MEASURED':0,'NOT ACTIVE':1,'GOOD':2,'WARNING':3,'BAD':4});
class ExecutionTimeline{
  constructor(health){this.health=health;this.reset(null);}
  reset(renderId){this.renderId=renderId;this.startedAt=now();this.entries=new Map();this.orderViolations=[];this.lastStageIndex=-1;this.lastObservedAt=this.startedAt;}
  _evidence(raw,id){
    const hasJob=!!raw.job,hasSamples=(raw.currentSamples||0)>0,hasPrimary=(raw.primary||0)>0,hasSecondary=(raw.secondary||0)>0,hasShadow=(raw.shadow||0)>0,isDone=done(raw.status),isActive=active(raw.status);
    switch(id){
      case 'render-request': return hasJob||isActive||isDone;
      case 'settings-validation': return hasJob&&!!raw.settings;
      case 'backend-selection': return raw.backend&&raw.backend!=='unknown';
      case 'telemetry-reset': return raw.total!=null||raw.primary!=null||raw.currentSamples!=null;
      case 'scene-snapshot': return hasJob;
      case 'geometry-compile': return hasPrimary||(raw.bvh||0)>0||(raw.primitive||0)>0;
      case 'material-compile': return hasPrimary||hasSecondary;
      case 'light-compile': return (raw.lightCounts?.total||0)>0||hasShadow;
      case 'acceleration': return hasPrimary||(raw.bvh||0)>0;
      case 'light-structures': return (raw.lightCounts?.total||0)>0;
      case 'gi-structures': return !!(raw.job?.lightCache||raw.job?.pathGuide||raw.settings?.secondaryGI);
      case 'film-setup': return hasSamples||isDone;
      case 'workers': return raw.workers!=null;
      case 'progressive-loop': return hasSamples||isActive||isDone;
      case 'primary-rays': return hasPrimary;
      case 'surface-shading': return hasPrimary&&((raw.hits||0)>0||hasSecondary);
      case 'direct-light': return (raw.lightCounts?.total||0)>0&&(hasShadow||hasSamples);
      case 'shadow-visibility': return hasShadow||((raw.rb?.requestedShadowTests||0)>0);
      case 'secondary-rays': return hasSecondary;
      case 'bounce-loop': return hasSecondary||(raw.bounce||0)>0;
      case 'gi-evaluation': return !!(raw.job?.lightCache||raw.job?.pathGuide||/GI|Brute|Cache/i.test(String(raw.p?.gi||raw.settings?.secondaryGI||'')));
      case 'accumulation': return hasSamples;
      case 'noise-check': return raw.noise!=null;
      case 'final-resolve': return isDone;
      case 'display-pipeline': return isDone&&(raw.display!=null||raw.tone!=null||root.__3DLiteMaterialLinearColor3996===true);
      case 'debug-report': return true;
      default:return false;
    }
  }
  observe(){
    let raw;try{raw=this.health.collect();}catch(_){return;}
    const id=raw.job?.id??raw.legacy?.renderId??null;
    if(id!==this.renderId&&(id!=null||this.renderId!=null))this.reset(id);
    const t=now();this.lastObservedAt=t;
    for(let i=0;i<ORDER.length;i++){
      const [key,label]=ORDER[i];if(!this._evidence(raw,key))continue;
      if(!this.entries.has(key)){
        if(i<this.lastStageIndex&&!this.orderViolations.some(v=>v.stage===key))this.orderViolations.push({stage:key,label,index:i,afterIndex:this.lastStageIndex,at:t,detail:'Stage became observable after a later stage; instrumentation/order should be reviewed'});
        this.entries.set(key,{id:key,label,index:i,firstSeen:t,lastSeen:t,elapsedFromStartMs:Math.max(0,t-this.startedAt),observations:1});
        if(i>this.lastStageIndex){const prev=[...this.entries.values()].filter(e=>e.index<this.lastStageIndex+1).sort((a,b)=>b.index-a.index)[0];if(prev&&!prev.completedAt){prev.completedAt=t;prev.durationMs=Math.max(0,t-prev.firstSeen);}this.lastStageIndex=i;}
      }else{const e=this.entries.get(key);e.lastSeen=t;e.observations++;}
    }
    if(done(raw.status)){
      const ordered=[...this.entries.values()].sort((a,b)=>a.index-b.index);for(let i=0;i<ordered.length;i++){const e=ordered[i];if(!e.completedAt){const next=ordered.slice(i+1).find(n=>n.firstSeen>=e.firstSeen);e.completedAt=next?.firstSeen||t;e.durationMs=Math.max(0,e.completedAt-e.firstSeen);}}
    }
  }
  snapshot(){this.observe();const rows=ORDER.map(([id,label],index)=>{const e=this.entries.get(id);return e?Object.freeze({...e,status:'GOOD'}):Object.freeze({id,label,index,status:'NOT MEASURED',firstSeen:null,lastSeen:null,elapsedFromStartMs:null,durationMs:null,observations:0});});return Object.freeze({version:VERSION,renderId:this.renderId,startedAt:this.startedAt,observedAt:this.lastObservedAt,stages:Object.freeze(rows),orderViolations:Object.freeze(this.orderViolations.map(v=>Object.freeze({...v}))),complete:done(this.health.collect()?.status)});}
  toText(){const s=this.snapshot(),out=[];out.push('[EXECUTION TIMELINE v'+VERSION+']');for(const e of s.stages){const seq=String(e.index+1).padStart(2,'0');const at=e.elapsedFromStartMs==null?'—':Math.round(e.elapsedFromStartMs)+'ms';const dur=e.durationMs==null?'—':Math.round(e.durationMs)+'ms';out.push((e.status||'NOT MEASURED').padEnd(12)+' | '+seq+'. '+e.label+' | start '+at+' | duration '+dur);}if(s.orderViolations.length){out.push('');out.push('[ORDER WARNINGS]');for(const v of s.orderViolations)out.push('WARNING      | '+v.label+' — '+v.detail);}return out.join('\n');}
}
function install(){
  const health=root.LitePixRenderHealthDebugger;if(!health||health.__timeline462Installed)return false;
  const timeline=new ExecutionTimeline(health);health.__timeline462Installed=true;health.executionTimeline=timeline;
  const baseSnapshot=health.snapshot.bind(health),baseText=health.toText.bind(health);
  health.snapshot=function(){timeline.observe();const b=baseSnapshot();return Object.freeze({...b,version:VERSION,executionTimeline:timeline.snapshot()});};
  health.toText=function(report){const r=report||health.snapshot();return baseText(r)+'\n\n'+timeline.toText();};
  root.__3DLiteRenderExecutionTimeline=()=>timeline.snapshot();
  root.__3DLiteRenderExecutionTimelineText=()=>timeline.toText();
  root.__3DLiteRenderHealthVersion=VERSION;
  root.__3DLiteRenderHealthTimelineVersion=VERSION;
  setInterval(()=>timeline.observe(),250);
  return true;
}
if(!install()){
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer);},100);
}
})(typeof globalThis!=='undefined'?globalThis:window);