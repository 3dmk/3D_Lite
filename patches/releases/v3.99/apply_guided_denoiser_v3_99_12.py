from pathlib import Path
import sys

VERSION='3.99.12'

DENOISER = r'''const RenderDenoiser13=Object.freeze({
  version:'3.99.12-guided-low-sample',
  process(channels,mode='Quality'){
    const beauty=channels?.get?.('Beauty');
    if(!beauty)return null;
    const w=channels.width|0,h=channels.height|0;
    if(w<1||h<1)return null;
    if(mode==='Off')return new Float32Array(beauty);
    const albedo=channels?.get?.('Albedo')||null;
    const normal=channels?.get?.('Normal')||null;
    const depth=channels?.get?.('Depth')||null;
    const nPix=w*h;
    const src=new Float32Array(beauty);
    const temp=new Float32Array(src.length);
    const out=new Float32Array(src.length);
    const lum=(a,i)=>.2126*a[i*3]+.7152*a[i*3+1]+.0722*a[i*3+2];
    const dotN=(a,ia,b,ib)=>{if(!a||!b)return 1;const ax=a[ia*3],ay=a[ia*3+1],az=a[ia*3+2],bx=b[ib*3],by=b[ib*3+1],bz=b[ib*3+2],al=Math.hypot(ax,ay,az)||1,bl=Math.hypot(bx,by,bz)||1;return Math.max(-1,Math.min(1,(ax*bx+ay*by+az*bz)/(al*bl)));};
    const pass=(input,output,step,quality)=>{const radius=quality?2:1,sigmaSpatial=quality?1.8:1.1,colorSigma=quality?.20:.14,albedoSigma=quality?.18:.14,depthSigma=quality?.035:.025,normalPower=quality?32:48;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,bi=i*3,centerLum=lum(input,i),centerDepth=depth?depth[i]:0;let wr=0,wg=0,wb=0,ws=0;for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){const xx=x+ox*step,yy=y+oy*step;if(xx<0||yy<0||xx>=w||yy>=h)continue;const j=yy*w+xx,bj=j*3,d2=ox*ox+oy*oy;let weight=Math.exp(-d2/(2*sigmaSpatial*sigmaSpatial));const nDot=Math.max(0,dotN(normal,i,normal,j));weight*=Math.pow(nDot,normalPower);if(albedo){const dr=albedo[bi]-albedo[bj],dg=albedo[bi+1]-albedo[bj+1],db=albedo[bi+2]-albedo[bj+2],ad=Math.sqrt(dr*dr+dg*dg+db*db);weight*=Math.exp(-ad/albedoSigma);}if(depth){const dz=Math.abs(centerDepth-depth[j]),rel=dz/Math.max(1e-4,Math.max(Math.abs(centerDepth),Math.abs(depth[j])));weight*=Math.exp(-rel/depthSigma);}const ld=Math.abs(centerLum-lum(input,j));weight*=Math.exp(-ld/(colorSigma*(.05+Math.abs(centerLum))));if(weight<1e-6)continue;wr+=input[bj]*weight;wg+=input[bj+1]*weight;wb+=input[bj+2]*weight;ws+=weight;}if(ws>0){output[bi]=wr/ws;output[bi+1]=wg/ws;output[bi+2]=wb/ws;}else{output[bi]=input[bi];output[bi+1]=input[bi+1];output[bi+2]=input[bi+2];}}};
    if(mode==='Fast'){pass(src,out,1,false);return out;}
    pass(src,temp,1,true);pass(temp,out,2,true);
    for(let i=0;i<nPix;i++){const b=i*3;out[b]=out[b]*.90+src[b]*.10;out[b+1]=out[b+1]*.90+src[b+1]*.10;out[b+2]=out[b+2]*.90+src[b+2]*.10;}
    return out;
  }
});
'''

def patch(path: Path):
    text=path.read_text(encoding='utf-8');original=text
    start=text.find('const RenderDenoiser13=Object.freeze({');end=text.find('const RenderPresenter13=Object.freeze({', start)
    if start<0 or end<0 or end<=start: raise RuntimeError('denoiser replacement markers not found')
    text=text[:start]+DENOISER+'\n'+text[end:]
    text=text.replace("process(channels,mode='Off')","process(channels,mode='Quality')").replace("job?.settings?.denoise||'Off'","job?.settings?.denoise||'Quality'").replace("settings.denoise||'Off'","settings.denoise||'Quality'")
    text=text.replace("legacyVersion:'3.99.11'",f"legacyVersion:'{VERSION}'").replace("const VERSION='3.99.11';",f"const VERSION='{VERSION}';").replace("window.ThreeDLiteVersion.version='3.99.11'",f"window.ThreeDLiteVersion.version='{VERSION}'").replace('// 3DLite Compiled Render Data v3.99.11',f'// 3DLite Compiled Render Data v{VERSION}')
    if "version:'3.99.12-guided-low-sample'" not in text: raise RuntimeError('new guided denoiser missing')
    if text==original: raise RuntimeError('denoiser patch made no changes')
    path.write_text(text,encoding='utf-8')
    print(f'patched {path} -> 3DLite v{VERSION} guided low-sample denoiser')

if __name__=='__main__':
    targets=[Path(x) for x in sys.argv[1:]] or [Path('index.html')]
    for p in targets:
        if p.exists(): patch(p)
