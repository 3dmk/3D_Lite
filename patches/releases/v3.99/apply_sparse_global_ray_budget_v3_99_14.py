from pathlib import Path
import sys

VERSION='3.99.14'

HELPER=r'''const RenderSparseRayBudget39914=Object.freeze({
  version:'3.99.14-sparse-global-ray-budget',minRays:1000,maxRays:4000,
  _state(job,width,height){let s=job.__sparseRayBudget39914;if(!s||s.width!==width||s.height!==height){const total=Math.max(1,width*height),target=Math.max(64,Math.min(this.minRays,total)),spacing=Math.max(1,Math.ceil(Math.sqrt(total/target)));s=job.__sparseRayBudget39914={width,height,spacing,used:0,seen:new Set(),passes:0};}return s;},
  indices(width,height,pass,job){const s=this._state(job,width,height),remaining=Math.max(0,this.maxRays-s.used);if(remaining<=0)return new Uint32Array(0);const perPass=Math.min(this.minRays,remaining),step=s.spacing,phases=[[.5,.5],[.25,.25],[.75,.75],[.25,.75],[.75,.25],[.5,.25],[.25,.5],[.75,.5]],ph=phases[pass%phases.length],out=[];for(let cy=0;cy<height&&out.length<perPass;cy+=step)for(let cx=0;cx<width&&out.length<perPass;cx+=step){const x=Math.min(width-1,Math.max(0,Math.floor(cx+step*ph[0]))),y=Math.min(height-1,Math.max(0,Math.floor(cy+step*ph[1]))),i=y*width+x;if(s.seen.has(i))continue;s.seen.add(i);out.push(i);}let seed=((pass+1)*2654435761)>>>0;while(out.length<perPass&&s.seen.size<width*height){seed=(Math.imul(seed^seed>>>16,2246822519)+3266489917)>>>0;const i=seed%(width*height);if(s.seen.has(i))continue;s.seen.add(i);out.push(i);}s.used+=out.length;s.passes=Math.max(s.passes,pass+1);job.progress.rayBudgetMin=this.minRays;job.progress.rayBudgetMax=this.maxRays;job.progress.rayBudgetUsed=s.used;job.progress.rayBudgetRemaining=Math.max(0,this.maxRays-s.used);job.progress.rayBudgetMode='Sparse Adaptive Reconstruction';return Uint32Array.from(out);},
  resolveRGBA(accumulator,settings,primaryMask,width,height,job){const src=accumulator.resolveRGBA(settings,primaryMask),samples=accumulator.samples;if(!samples||!samples.length)return src;const s=this._state(job,width,height),step=s.spacing,cw=Math.ceil(width/step),ch=Math.ceil(height/step),cells=cw*ch,rr=new Float64Array(cells),gg=new Float64Array(cells),bb=new Float64Array(cells),ww=new Uint32Array(cells);for(let i=0;i<samples.length;i++){if(samples[i]<=0)continue;const x=i%width,y=(i/width)|0,cx=Math.min(cw-1,(x/step)|0),cy=Math.min(ch-1,(y/step)|0),ci=cy*cw+cx,p=i*4;rr[ci]+=src[p];gg[ci]+=src[p+1];bb[ci]+=src[p+2];ww[ci]++;}const nearest=(cx,cy)=>{cx=Math.max(0,Math.min(cw-1,cx));cy=Math.max(0,Math.min(ch-1,cy));let ci=cy*cw+cx;if(ww[ci])return ci;for(let r=1;r<=3;r++)for(let oy=-r;oy<=r;oy++)for(let ox=-r;ox<=r;ox++){if(Math.abs(ox)!==r&&Math.abs(oy)!==r)continue;const nx=cx+ox,ny=cy+oy;if(nx<0||ny<0||nx>=cw||ny>=ch)continue;ci=ny*cw+nx;if(ww[ci])return ci;}return -1;};const out=new Uint8ClampedArray(src);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=y*width+x;if(samples[i]>0)continue;const gx=(x+.5)/step-.5,gy=(y+.5)/step-.5,x0=Math.floor(gx),y0=Math.floor(gy),tx=gx-x0,ty=gy-y0,ids=[nearest(x0,y0),nearest(x0+1,y0),nearest(x0,y0+1),nearest(x0+1,y0+1)],ws=[(1-tx)*(1-ty),tx*(1-ty),(1-tx)*ty,tx*ty];let r=0,g=0,b=0,w=0;for(let k=0;k<4;k++){const ci=ids[k];if(ci<0||!ww[ci])continue;const q=ws[k]/ww[ci];r+=rr[ci]*q;g+=gg[ci]*q;b+=bb[ci]*q;w+=ws[k];}const p=i*4;if(w>1e-6){out[p]=r/w;out[p+1]=g/w;out[p+2]=b/w;out[p+3]=255;}}return out;}
});
window.RenderSparseRayBudget39914=RenderSparseRayBudget39914;
'''

def req(text,old,new,label,count=1):
    if old not in text: raise RuntimeError(f'missing patch target: {label}')
    return text.replace(old,new,count)

def patch(path:Path):
    text=path.read_text(encoding='utf-8');original=text
    marker='var PathGIRenderer=Object.freeze({'
    text=req(text,marker,HELPER+'\n\n'+marker,'PathGIRenderer marker')
    text=text.replace("this.maxBounces=4;this.denoise='Quality';","this.maxBounces=4;this.denoise='Quality';this.rayBudgetMin=1000;this.rayBudgetMax=4000;",1)
    old="""      const activePixels16=progressive?accumulator.compactActive(settings):(()=>{
        const a=new Uint32Array(width*height);for(let i=0;i<a.length;i++)a[i]=i;return a;
      })();
      if(activePixels16.length===0)break;"""
    new="""      const activePixels16=RenderSparseRayBudget39914.indices(width,height,pass,job);
      if(activePixels16.length===0)break;"""
    text=req(text,old,new,'sparse active pixels')
    text=text.replace('accumulator.resolveRGBA(settings,primaryMask)','RenderSparseRayBudget39914.resolveRGBA(accumulator,settings,primaryMask,width,height,job)')
    text=req(text,"if(settings.adaptive&&completedPasses>=settings.minSamples&&accumulator.active===0)break;\n      if(sampledThisPass===0)break;","if(job.__sparseRayBudget39914?.used>=RenderSparseRayBudget39914.maxRays)break;\n      if(sampledThisPass===0)break;",'budget termination')
    text=text.replace("renderer:'Group 9 Progressive Path GI'","renderer:'Group 9 Sparse Adaptive Path GI 1K-4K'",2).replace('3.99.13',VERSION)
    for token in ["version:'3.99.14-sparse-global-ray-budget'","rayBudgetMode='Sparse Adaptive Reconstruction'","rayBudgetMin=1000","rayBudgetMax=4000"]:
      if token not in text: raise RuntimeError(f'missing output marker: {token}')
    if text==original: raise RuntimeError('sparse ray budget patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} sparse 1K-4K global camera-ray budget')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
      if p.exists(): patch(p)
