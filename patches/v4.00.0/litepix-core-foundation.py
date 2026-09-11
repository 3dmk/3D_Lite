from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old_title = '<title>3DLite v3.99.6 L3N GitHub Runtime</title>'
new_title = '<title>LitePix v4.00.0 Core Foundation</title>'
if new_title not in s:
    if s.count(old_title) != 1:
        raise SystemExit(f'release-blocking: title anchor count={s.count(old_title)}')
    s = s.replace(old_title, new_title, 1)

old_version = "const ThreeDLiteVersion=Object.freeze({name:'3DLite',version:'3.99.6'});"
foundation = r'''const LitePixVersion=Object.freeze({name:'LitePix',version:'4.00.0',legacyName:'3DLite',legacyVersion:'3.99.6',architecture:'Core Foundation'});
// Compatibility bridge: existing 3DLite services keep working while the renderer migrates to LitePix ownership.
const ThreeDLiteVersion=LitePixVersion;

const LitePixProfiles=Object.freeze({
  interactive:Object.freeze({name:'interactive',spatialSamples:1,temporalSamples:8,maxBounces:3,giQuality:0.5,adaptive:true}),
  balanced:Object.freeze({name:'balanced',spatialSamples:2,temporalSamples:8,maxBounces:5,giQuality:1.0,adaptive:true}),
  final:Object.freeze({name:'final',spatialSamples:8,temporalSamples:8,maxBounces:8,giQuality:2.0,adaptive:true})
});

class LitePixEventBus{
  constructor(){this._listeners=new Map();}
  on(type,fn){if(typeof fn!=='function')throw new TypeError('LitePix listener must be a function');const set=this._listeners.get(type)||new Set();set.add(fn);this._listeners.set(type,set);return()=>this.off(type,fn);}
  off(type,fn){const set=this._listeners.get(type);if(!set)return false;const removed=set.delete(fn);if(!set.size)this._listeners.delete(type);return removed;}
  emit(type,payload){const set=this._listeners.get(type);if(!set)return 0;let count=0;for(const fn of [...set]){try{fn(payload);count++;}catch(err){console.error('[LitePixEventBus]',type,err);}}return count;}
  clear(){this._listeners.clear();}
}

class LitePixResourceScope{
  constructor(label='scope'){this.label=String(label);this._resources=[];this.closed=false;}
  own(resource,dispose){if(this.closed)throw new Error('LitePixResourceScope is closed');const disposer=typeof dispose==='function'?()=>dispose(resource):()=>{if(resource&&typeof resource.dispose==='function')resource.dispose();};this._resources.push(disposer);return resource;}
  defer(fn){if(this.closed)throw new Error('LitePixResourceScope is closed');if(typeof fn!=='function')throw new TypeError('deferred cleanup must be a function');this._resources.push(fn);return fn;}
  close(){if(this.closed)return;this.closed=true;for(let i=this._resources.length-1;i>=0;i--){try{this._resources[i]();}catch(err){console.warn('[LitePixResourceScope cleanup]',this.label,err);}}this._resources.length=0;}
}

class LitePixCancellationToken{
  constructor(){this.cancelled=false;this.reason='';}
  cancel(reason='cancelled'){this.cancelled=true;this.reason=String(reason);}
  throwIfCancelled(){if(this.cancelled){const e=new Error(this.reason||'LitePix job cancelled');e.name='LitePixCancelledError';throw e;}}
}

class LitePixRenderJob{
  static _nextId=1;
  constructor(options={}){
    const profileName=String(options.profile||'balanced').toLowerCase();
    const profile=LitePixProfiles[profileName]||LitePixProfiles.balanced;
    this.id=options.id||`lp-${Date.now().toString(36)}-${LitePixRenderJob._nextId++}`;
    this.profile=profile.name;
    this.width=Math.max(1,Math.floor(Number(options.width)||1280));
    this.height=Math.max(1,Math.floor(Number(options.height)||720));
    this.samples=Math.max(1,Math.floor(Number(options.samples)||profile.spatialSamples*profile.temporalSamples));
    this.maxBounces=Math.max(1,Math.min(16,Math.floor(Number(options.maxBounces)||profile.maxBounces)));
    this.frameStart=Math.floor(Number(options.frameStart)||0);
    this.frameEnd=Math.max(this.frameStart,Math.floor(Number(options.frameEnd??this.frameStart)));
    this.output=String(options.output||'');
    this.metadata=Object.freeze({...options.metadata});
    this.token=new LitePixCancellationToken();
    this.status='queued';
    this.createdAt=performance.now();
    this.startedAt=0;
    this.finishedAt=0;
    this.error=null;
  }
  cancel(reason){this.token.cancel(reason);if(this.status==='queued')this.status='cancelled';}
  snapshot(){return Object.freeze({id:this.id,profile:this.profile,width:this.width,height:this.height,samples:this.samples,maxBounces:this.maxBounces,frameStart:this.frameStart,frameEnd:this.frameEnd,status:this.status,createdAt:this.createdAt,startedAt:this.startedAt,finishedAt:this.finishedAt,error:this.error?String(this.error.message||this.error):null});}
}

class LitePixRenderQueue{
  constructor({events=new LitePixEventBus(),runner=null}={}){this.events=events;this.runner=runner;this.jobs=[];this.activeJob=null;this.running=false;}
  enqueue(jobOrOptions){const job=jobOrOptions instanceof LitePixRenderJob?jobOrOptions:new LitePixRenderJob(jobOrOptions);this.jobs.push(job);this.events.emit('job:queued',job.snapshot());return job;}
  cancel(jobId,reason='cancelled by user'){const job=this.activeJob?.id===jobId?this.activeJob:this.jobs.find(j=>j.id===jobId);if(!job)return false;job.cancel(reason);this.events.emit('job:cancelled',job.snapshot());return true;}
  async runNext(runner=this.runner){if(this.running)return null;const job=this.jobs.find(j=>j.status==='queued');if(!job)return null;if(typeof runner!=='function')throw new Error('LitePixRenderQueue requires a runner');this.running=true;this.activeJob=job;job.status='running';job.startedAt=performance.now();this.events.emit('job:start',job.snapshot());const scope=new LitePixResourceScope(`job:${job.id}`);try{job.token.throwIfCancelled();const result=await runner(job,{scope,events:this.events,token:job.token});job.token.throwIfCancelled();job.status='completed';job.finishedAt=performance.now();this.events.emit('job:complete',{job:job.snapshot(),result});return result;}catch(err){job.error=err;job.finishedAt=performance.now();job.status=job.token.cancelled?'cancelled':'failed';this.events.emit(job.status==='cancelled'?'job:cancelled':'job:error',{job:job.snapshot(),error:err});throw err;}finally{scope.close();this.activeJob=null;this.running=false;}}
  async drain(runner=this.runner){const out=[];while(this.jobs.some(j=>j.status==='queued'))out.push(await this.runNext(runner));return out;}
  snapshots(){return this.jobs.map(j=>j.snapshot());}
}

class LitePixTelemetryHub{
  constructor(events){this.events=events;this.records=[];this._unsub=[];for(const type of ['job:queued','job:start','job:complete','job:error','job:cancelled'])this._unsub.push(events.on(type,payload=>this.record(type,payload)));}
  record(type,payload){this.records.push(Object.freeze({type,time:performance.now(),payload}));if(this.records.length>2048)this.records.splice(0,this.records.length-2048);}
  snapshot(){return Object.freeze({version:LitePixVersion.version,records:this.records.slice()});}
  dispose(){for(const fn of this._unsub)fn();this._unsub.length=0;}
}

const LitePixEvents=new LitePixEventBus();
const LitePixQueue=new LitePixRenderQueue({events:LitePixEvents});
const LitePixTelemetry=new LitePixTelemetryHub(LitePixEvents);
const LitePixCore=Object.freeze({version:LitePixVersion,profiles:LitePixProfiles,events:LitePixEvents,queue:LitePixQueue,telemetry:LitePixTelemetry,RenderJob:LitePixRenderJob,ResourceScope:LitePixResourceScope,CancellationToken:LitePixCancellationToken});
if(typeof globalThis!=='undefined'){
  globalThis.LitePix=LitePixCore;
  globalThis.LitePixVersion=LitePixVersion;
  globalThis.__LitePixCore400=true;
}
'''
if 'const LitePixVersion=Object.freeze(' not in s:
    if s.count(old_version) != 1:
        raise SystemExit(f'release-blocking: version anchor count={s.count(old_version)}')
    s = s.replace(old_version, foundation, 1)

old_sync = 'document.title=`3DLite v${value} L3N GitHub Runtime`;'
new_sync = 'document.title=`LitePix v${value} Core Runtime`;'
if new_sync not in s and old_sync in s:
    s = s.replace(old_sync, new_sync, 1)

# Keep the visible version value synchronized through the legacy setter while branding the document as LitePix.
if "root.__3DLiteMaterialLinearColor3996=true;" not in s:
    raise SystemExit('release-blocking: v3.99.6 color-space fix marker missing')

p.write_text(s,encoding='utf-8')
print('LitePix v4.00.0 core foundation patch applied')
