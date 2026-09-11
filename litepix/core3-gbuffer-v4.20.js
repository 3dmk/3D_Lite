(function(root){'use strict';
const LP=root.LitePixNative=root.LitePixNative||{};
const clamp01=v=>v<0?0:v>1?1:v;
class ProductionGBuffer420{
  constructor(w,h){this.resize(w,h);this.frame=0;this.writes=0;this.hits=0;}
  resize(w,h){this.width=Math.max(1,w|0);this.height=Math.max(1,h|0);const n=this.width*this.height;
    this.depth=new Float32Array(n);this.worldPosition=new Float32Array(n*3);this.geometricNormal=new Float32Array(n*3);this.shadingNormal=new Float32Array(n*3);
    this.albedo=new Float32Array(n*3);this.emissive=new Float32Array(n*3);this.roughness=new Float32Array(n);this.metallic=new Float32Array(n);this.opacity=new Float32Array(n);
    this.materialId=new Uint32Array(n);this.objectId=new Uint32Array(n);this.triangleId=new Uint32Array(n);this.motion=new Float32Array(n*2);this.valid=new Uint8Array(n);this.clear();return this;}
  clear(){this.depth.fill(Infinity);this.worldPosition.fill(0);this.geometricNormal.fill(0);this.shadingNormal.fill(0);this.albedo.fill(0);this.emissive.fill(0);this.roughness.fill(1);this.metallic.fill(0);this.opacity.fill(1);this.materialId.fill(0);this.objectId.fill(0);this.triangleId.fill(0);this.motion.fill(0);this.valid.fill(0);this.writes=0;this.hits=0;return this;}
  beginFrame(){this.frame++;return this.clear();}
  write(index,s={}){if(index<0||index>=this.valid.length)return false;const i=index|0,i3=i*3,i2=i*2,n=s.shadingNormal||s.normal||[0,1,0],gn=s.geometricNormal||n,p=s.position||[0,0,0],a=s.albedo||[.5,.5,.5],e=s.emissive||[0,0,0],m=s.motion||[0,0];
    this.depth[i]=Number.isFinite(s.depth)?s.depth:Infinity;this.worldPosition[i3]=p[0]||0;this.worldPosition[i3+1]=p[1]||0;this.worldPosition[i3+2]=p[2]||0;
    this.geometricNormal[i3]=gn[0]||0;this.geometricNormal[i3+1]=gn[1]||1;this.geometricNormal[i3+2]=gn[2]||0;this.shadingNormal[i3]=n[0]||0;this.shadingNormal[i3+1]=n[1]||1;this.shadingNormal[i3+2]=n[2]||0;
    this.albedo[i3]=a[0]??.5;this.albedo[i3+1]=a[1]??.5;this.albedo[i3+2]=a[2]??.5;this.emissive[i3]=e[0]||0;this.emissive[i3+1]=e[1]||0;this.emissive[i3+2]=e[2]||0;
    this.roughness[i]=clamp01(s.roughness??1);this.metallic[i]=clamp01(s.metallic??0);this.opacity[i]=clamp01(s.opacity??1);this.materialId[i]=(s.materialId||0)>>>0;this.objectId[i]=(s.objectId||0)>>>0;this.triangleId[i]=(s.triangleId||0)>>>0;this.motion[i2]=Number.isFinite(m[0])?m[0]:0;this.motion[i2+1]=Number.isFinite(m[1])?m[1]:0;this.valid[i]=1;this.writes++;this.hits++;return true;}
  invalidate(index){if(index>=0&&index<this.valid.length)this.valid[index]=0;}
  snapshot(){let valid=0;for(let i=0;i<this.valid.length;i++)valid+=this.valid[i]?1:0;return{version:'4.20.0',width:this.width,height:this.height,frame:this.frame,writes:this.writes,validPixels:valid,coverage:valid/Math.max(1,this.valid.length),bytes:this.bytes()};}
  bytes(){let n=0;for(const v of Object.values(this))if(ArrayBuffer.isView(v))n+=v.byteLength;return n;}
}
function materialSnapshot(job,hit){const idx=(hit?.materialIndex??0)>>>0,src=job?.renderScene?.materials?.[idx]||null;if(!src)return{albedo:[.5,.5,.5],emissive:[0,0,0],roughness:.5,metallic:0,opacity:1};
  const c=src.baseColor||src.color||[.5,.5,.5],e=src.emissive||[0,0,0];return{albedo:[c[0]??c.r??.5,c[1]??c.g??.5,c[2]??c.b??.5],emissive:[e[0]??e.r??0,e[1]??e.g??0,e[2]??e.b??0],roughness:src.roughness??.5,metallic:src.metalness??src.metallic??0,opacity:src.opacity??1};}
LP.Core3ProductionGBuffer420={ProductionGBuffer420,materialSnapshot,version:'4.20.0'};root.LitePixProductionGBuffer420=ProductionGBuffer420;root.__LitePixCore3GBuffer420=true;
})(typeof globalThis!=='undefined'?globalThis:window);
