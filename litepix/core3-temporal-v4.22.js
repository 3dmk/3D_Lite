(function(root){'use strict';
const LP=root.LitePixNative=root.LitePixNative||{};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
class TemporalGuide422{
  constructor(w,h,opts={}){this.width=w|0;this.height=h|0;this.depthTolerance=opts.depthTolerance??.025;this.normalThreshold=opts.normalThreshold??.82;this.history=null;this.accepted=0;this.rejected=0;this.reprojected=0;this.frames=0;}
  beginFrame(){this.accepted=0;this.rejected=0;this.reprojected=0;return this;}
  validate(current,index){if(!this.history||!current?.valid?.[index]){this.rejected++;return null;}const i2=index*2,mx=current.motion[i2]||0,my=current.motion[i2+1]||0,x=index%this.width,y=(index/this.width)|0,px=Math.round(x-mx),py=Math.round(y-my);if(px<0||py<0||px>=this.width||py>=this.height){this.rejected++;return null;}const pi=py*this.width+px;if(!this.history.valid[pi]){this.rejected++;return null;}this.reprojected++;
    const cd=current.depth[index],pd=this.history.depth[pi],scale=Math.max(1,Math.abs(cd),Math.abs(pd));if(!Number.isFinite(cd)||!Number.isFinite(pd)||Math.abs(cd-pd)>this.depthTolerance*scale){this.rejected++;return null;}
    const c3=index*3,p3=pi*3,cn=[current.shadingNormal[c3],current.shadingNormal[c3+1],current.shadingNormal[c3+2]],pn=[this.history.shadingNormal[p3],this.history.shadingNormal[p3+1],this.history.shadingNormal[p3+2]];if(dot(cn,pn)<this.normalThreshold||current.materialId[index]!==this.history.materialId[pi]||current.objectId[index]!==this.history.objectId[pi]){this.rejected++;return null;}this.accepted++;return{index:pi,x:px,y:py};}
  commit(current){const clone=a=>new a.constructor(a);this.history={valid:clone(current.valid),depth:clone(current.depth),shadingNormal:clone(current.shadingNormal),materialId:clone(current.materialId),objectId:clone(current.objectId)};this.frames++;return this;}
  snapshot(){return{version:'4.22.0',frames:this.frames,reprojected:this.reprojected,accepted:this.accepted,rejected:this.rejected,acceptRate:this.accepted/Math.max(1,this.accepted+this.rejected)};}
}
LP.Core3Temporal422={TemporalGuide422,version:'4.22.0'};root.LitePixTemporalGuide422=TemporalGuide422;root.__LitePixCore3Temporal422=true;
})(typeof globalThis!=='undefined'?globalThis:window);
