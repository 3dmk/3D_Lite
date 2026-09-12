(()=>{'use strict';
const orig=window.R3DRenderer;
if(!orig)return;
function flipCanvasY(){
  const c=document.getElementById('rc');
  if(!c||!c.width||!c.height)return false;
  const tmp=document.createElement('canvas');tmp.width=c.width;tmp.height=c.height;
  const t=tmp.getContext('2d');t.drawImage(c,0,0);
  const ctx=c.getContext('2d');ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.translate(0,c.height);ctx.scale(1,-1);ctx.drawImage(tmp,0,0);ctx.restore();
  c.dataset.r3dOrientation='upright';
  document.documentElement.dataset.r3dRenderOrientation='upright';
  return true;
}
const wrapped={...orig};
wrapped.render=async(...args)=>{const ok=await orig.render(...args);flipCanvasY();return ok};
wrapped.flipCanvasY=flipCanvasY;
window.R3DRenderer=wrapped;
})();
