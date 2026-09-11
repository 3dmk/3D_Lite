(function(root){'use strict';
const LP=root.LitePixNative=root.LitePixNative||{};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class GuidePyramid421{
  constructor(gbuffer){this.levels=[];this.builds=0;this.build(gbuffer);}
  build(g){this.levels.length=0;let w=g.width,h=g.height,depth=g.depth,normal=g.shadingNormal,valid=g.valid,material=g.materialId,objectId=g.objectId;let level=0;
    while(true){const n=w*h,d=new Float32Array(n),nn=new Float32Array(n*3),v=new Uint8Array(n),m=new Uint32Array(n),o=new Uint32Array(n),edge=new Float32Array(n);
      if(level===0){d.set(depth);nn.set(normal);v.set(valid);m.set(material);o.set(objectId);}else{const p=this.levels[level-1],pw=p.width,ph=p.height;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;let count=0,ds=0,nx=0,ny=0,nz=0,mm=0,oo=0,first=true,es=0;
          for(let oy=0;oy<2;oy++)for(let ox=0;ox<2;ox++){const sx=Math.min(pw-1,x*2+ox),sy=Math.min(ph-1,y*2+oy),si=sy*pw+sx;if(!p.valid[si])continue;count++;ds+=p.depth[si];const s3=si*3;nx+=p.normal[s3];ny+=p.normal[s3+1];nz+=p.normal[s3+2];es=Math.max(es,p.edge[si]||0);if(first){mm=p.materialId[si];oo=p.objectId[si];first=false;}else{if(mm!==p.materialId[si])es=1;if(oo!==p.objectId[si])es=Math.max(es,.75);}}
          if(count){v[i]=1;d[i]=ds/count;const l=Math.hypot(nx,ny,nz)||1,di=i*3;nn[di]=nx/l;nn[di+1]=ny/l;nn[di+2]=nz/l;m[i]=mm;o[i]=oo;edge[i]=es;}
        }}
      const L={level,width:w,height:h,depth:d,normal:nn,valid:v,materialId:m,objectId:o,edge};if(level===0){for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(!v[i]){edge[i]=1;continue;}let e=0,c=0;const i3=i*3;for(const q of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+q[0],yy=y+q[1];if(xx<0||yy<0||xx>=w||yy>=h){e+=1;c++;continue;}const j=yy*w+xx;if(!v[j]){e+=1;c++;continue;}const scale=Math.max(1,Math.abs(d[i]),Math.abs(d[j])),dd=Math.abs(d[i]-d[j])/scale,j3=j*3,nd=1-clamp(nn[i3]*nn[j3]+nn[i3+1]*nn[j3+1]+nn[i3+2]*nn[j3+2],-1,1),md=m[i]===m[j]?0:1,od=o[i]===o[j]?0:.5;e+=clamp(dd*5+nd+md+od,0,1);c++;}edge[i]=c?e/c:0;}}
      this.levels.push(L);if(w===1&&h===1)break;w=Math.max(1,(w+1)>>1);h=Math.max(1,(h+1)>>1);level++;}
    this.builds++;return this;}
  sample(level,x,y){const l=this.levels[Math.max(0,Math.min(this.levels.length-1,level|0))];x=Math.max(0,Math.min(l.width-1,x|0));y=Math.max(0,Math.min(l.height-1,y|0));const i=y*l.width+x,i3=i*3;return{valid:!!l.valid[i],depth:l.depth[i],normal:[l.normal[i3],l.normal[i3+1],l.normal[i3+2]],materialId:l.materialId[i],objectId:l.objectId[i],edge:l.edge[i]};}
  chooseLevel(radius){return Math.max(0,Math.min(this.levels.length-1,Math.floor(Math.log2(Math.max(1,radius)))));}
  snapshot(){return{version:'4.21.0',builds:this.builds,levels:this.levels.map(l=>({level:l.level,width:l.width,height:l.height}))};}
}
LP.Core3GuidePyramid421={GuidePyramid421,version:'4.21.0'};root.LitePixGuidePyramid421=GuidePyramid421;root.__LitePixCore3Pyramid421=true;
})(typeof globalThis!=='undefined'?globalThis:window);
