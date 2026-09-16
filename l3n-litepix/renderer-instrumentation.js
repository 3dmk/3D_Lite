(function(root){'use strict';
const E=()=>root.L3NLitePixEvidence;
function wrapMethod(target,name,stage,counter){if(!target||typeof target[name]!=='function'||target[name].__l3nWrapped)return false;const original=target[name];function wrapped(...args){const e=E();if(counter)e?.count(counter);return e?e.measure(stage,()=>original.apply(this,args)):original.apply(this,args);}wrapped.__l3nWrapped=true;wrapped.__l3nOriginal=original;target[name]=wrapped;return true;}
function instrumentAcceleration(accel){if(!accel)return 0;let n=0;n+=wrapMethod(accel,'trace','acceleration.trace','traceRays')?1:0;n+=wrapMethod(accel,'occluded','acceleration.occluded','shadowRays')?1:0;n+=wrapMethod(accel,'updateTransforms','acceleration.updateTransforms')?1:0;E()?.setMeta('accelerationInstrumentation',n);return n;}
function instrumentObject(obj,label,methods){let n=0;for(const m of methods)n+=wrapMethod(obj,m,`${label}.${m}`)?1:0;return n;}
root.L3NLitePixInstrumentation=Object.freeze({version:'0.1.0',wrapMethod,instrumentAcceleration,instrumentObject});
})(typeof globalThis!=='undefined'?globalThis:window);
