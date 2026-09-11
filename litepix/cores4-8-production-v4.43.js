(function(root){'use strict';
class LitePixCores4to8Production443{
 constructor(width,height,job,compiled){this.width=width;this.height=height;this.job=job;this.compiled=compiled;this.core4=new root.LitePixCore4Production427(width,height);this.core5=new root.LitePixCore5Production431(width,height);this.core6=new root.LitePixCore6Production435();this.core7=new root.LitePixCore7Production439(width,height,job);this.core8=new root.LitePixCore8Production443();this.passes=0;this.records=0;this.started=performance.now();const mats=compiled?.materials?.list||[];this.core6.compile(mats);}
 record(index,x,y,sample,hit,accumulator){this.records++;this.core4.recordPrimary(hit,sample,accumulator,index);this.core5.record(index,sample);}
 completePass(accumulator){this.passes++;this.core4.completePass(accumulator,null);this.core5.completePass(null);return this.snapshot();}
 finalize(job){this.core7.complete();const c4=this.core4.snapshot();this.core8.capture(job,{blocks:c4.adaptive||{},memory:{usedBytes:0,limitBytes:0}});return this.snapshot();}
 snapshot(){return{version:'4.43.0',provider:'LitePix Cores 4-8 production orchestrator',records:this.records,passes:this.passes,core4:this.core4.snapshot(),core5:this.core5.snapshot(),core6:this.core6.snapshot(),core7:this.core7.snapshot(),core8:this.core8.snapshot(),elapsedMs:performance.now()-this.started};}}
root.LitePixCores4to8Production443=LitePixCores4to8Production443;root.__LitePixCores4to8Production443=true;
})(typeof globalThis!=='undefined'?globalThis:window);