(function(root){'use strict';
const LP=root.LitePixNative=root.LitePixNative||{};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
class LitePixPathExecution410{
  constructor(width,height,opts={}){
    if(!LP.Core2||!LP.Core3||!LP.Core4||!LP.Core5)throw new Error('LitePix v4.10 path bridge requires Core2-5');
    this.width=width|0;this.height=height|0;this.opts=opts;
    this.budget=new LP.Core2.MemoryBudget(opts.memoryLimitBytes||256*1024*1024);
    this.raster=new LP.Core3.RasterGuideBuilder(this.width,this.height,{materialStrict:false,objectStrict:false});
    this.gbuffer=this.raster.beginFrame();
    this.gi=new LP.Core4.HierarchicalGI(this.width,this.height,{startBlock:opts.startBlock||32,minBlock:opts.minBlock||1,maxLevel:opts.maxLevel||6,varianceThreshold:opts.varianceThreshold??.02,errorThreshold:opts.errorThreshold??.03});
    this.temporal=new LP.Core5.TemporalHistory(this.width,this.height);this.temporal.beginFrame();
    this.spatial=new LP.Core5.SpatialReuse({radius:1,maxNeighbors:8});
    this.reservoirs=new Array(this.width*this.height);
    this.pass=0;this.samples=0;this.primaryHits=0;this.guideWrites=0;this.blockPasses=0;this.startedAt=performance.now();
    const n=this.width*this.height;
    this.budget.reserve('path-gbuffer',n*(4+12+12+4+4+4+4+8+1));
    this.budget.reserve('path-reservoir-grid',n*24);
  }
  record(index,x,y,sample,hit,accumulator){
    this.samples++;
    const r=new LP.Core5.Reservoir();
    const radiance=sample?.radiance||[0,0,0];
    r.update({radiance,index,pass:this.pass},Math.max(1e-8,lum(radiance)),()=>0);
    this.reservoirs[index]=r;this.temporal.store(x,y,r);
    if(hit?.hit){
      this.primaryHits++;
      const n=hit.orientedGeometricNormal||hit.geometricNormal||[0,1,0];
      const depth=Number(hit.t??hit.distance??1);
      const mat=(hit.materialIndex??0)>>>0,obj=(hit.objectIndex??0)>>>0;
      const variance=accumulator&&accumulator.samples[index]>1?accumulator.variance(index):1;
      this.gbuffer.writeRaw(x,y,depth,n[0]||0,n[1]||1,n[2]||0,.5,.5,.5,clamp(.5+Math.min(.5,variance),0,1),0,mat,obj,0,0);
      this.guideWrites++;
    }
  }
  completePass(accumulator){
    this.pass++;
    const g=this.gbuffer,guide=this.raster.guide,w=this.width,h=this.height;
    const sampleBlock=b=>{
      const x=Math.min(w-1,b.x+(b.size>>1)),y=Math.min(h-1,b.y+(b.size>>1)),i=y*w+x,o=i*3;
      const s=Math.max(1,accumulator.samples[i]);
      const c=[accumulator.sum[o]/s,accumulator.sum[o+1]/s,accumulator.sum[o+2]/s];
      const v=Number.isFinite(accumulator.variance(i))?accumulator.variance(i):1;
      const e=Number.isFinite(accumulator.noise(i))?accumulator.noise(i):1;
      return {radiance:c,variance:v,error:e,confidence:clamp(s/4,0,1)};
    };
    const importance=b=>{
      const x=Math.min(w-1,b.x+(b.size>>1)),y=Math.min(h-1,b.y+(b.size>>1)),i=y*w+x;
      const v=Number.isFinite(accumulator.variance(i))?accumulator.variance(i):1;
      return guide.importance(g,x,y,v);
    };
    if(this.gi.active.length){this.gi.runPass(sampleBlock,importance);this.blockPasses++;}
    return this.snapshot();
  }
  snapshot(){
    return {version:'4.10.0',mode:'native-path-observer',samples:this.samples,passes:this.pass,primaryHits:this.primaryHits,guideWrites:this.guideWrites,blockPasses:this.blockPasses,gi:this.gi.stats(),guide:{...this.raster.guide.stats},spatial:this.spatial.stats(),memory:this.budget.snapshot(),elapsedMs:performance.now()-this.startedAt};
  }
  dispose(){try{const m=this.budget.snapshot();for(const [tag,bytes] of Object.entries(m.tags||{}))this.budget.release(tag,bytes);}catch(_){}this.reservoirs.length=0;}
}
LP.PathExecution410=LitePixPathExecution410;
root.LitePixPathExecution410=LitePixPathExecution410;
root.__LitePixPathIntegration410=true;
})(typeof globalThis!=='undefined'?globalThis:window);
