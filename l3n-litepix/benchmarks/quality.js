(function(root){'use strict';
function metrics(ref,cand){if(!ref||!cand||ref.length!==cand.length)throw new Error('equal buffers required');let mse=0,mae=0,max=0;for(let i=0;i<ref.length;i++){const d=Number(cand[i])-Number(ref[i]);mse+=d*d;mae+=Math.abs(d);max=Math.max(max,Math.abs(d));}mse/=ref.length;mae/=ref.length;const psnr=mse===0?Infinity:10*Math.log10(1/mse);return{mse,rmse:Math.sqrt(mse),mae,maxAbsError:max,psnr};}
function gate(ref,cand,{maxRMSE=.01,maxAbsError=.05,minPSNR=40}={}){const m=metrics(ref,cand);return{...m,passed:m.rmse<=maxRMSE&&m.maxAbsError<=maxAbsError&&m.psnr>=minPSNR};}
function timeToQuality(samples,{maxNoise=.02,maxRMSE=.01}={}){for(const s of samples||[])if(Number(s.noise)<=maxNoise&&Number(s.rmse)<=maxRMSE)return s.elapsedMs;return null;}
root.L3NLitePixQualityLab=Object.freeze({version:'0.1.0',metrics,gate,timeToQuality});
})(typeof globalThis!=='undefined'?globalThis:window);
