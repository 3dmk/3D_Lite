(function(root){'use strict';
const E=()=>root.L3NLitePixEvidence,I=()=>root.L3NLitePixInstrumentation;
function instrumentPath(path){if(!path||!I())return 0;let n=0;n+=I().wrapMethod(path,'record','path.record','pathSamples')?1:0;n+=I().wrapMethod(path,'completePass','path.completePass','pathPasses')?1:0;n+=I().wrapMethod(path,'snapshot','path.snapshot')?1:0;E()?.setMeta('pathInstrumentation',n);return n;}
function capturePath(path){const e=E();if(!e||!path?.snapshot)return null;const s=path.snapshot();e.setMeta('pathVersion',s.version);e.setMeta('pathMode',s.mode);e.setMeta('pathElapsedMs',s.elapsedMs);e.setMeta('pathMemory',s.memory);e.setMeta('pathGI',s.gi);e.setMeta('pathGuide',s.guide);e.setMeta('pathSpatial',s.spatial);return s;}
function captureHardware(){const e=E();if(!e)return null;const nav=root.navigator||{};const p=root.performance||{};const h={logicalProcessors:nav.hardwareConcurrency??null,deviceMemoryGB:nav.deviceMemory??null,webgpu:!!nav.gpu,jsHeapLimit:p.memory?.jsHeapSizeLimit??null,jsHeapUsed:p.memory?.usedJSHeapSize??null};e.setMeta('hardware',h);return h;}
root.L3NLitePixRuntimeEvidence=Object.freeze({version:'0.1.0',instrumentPath,capturePath,captureHardware});
})(typeof globalThis!=='undefined'?globalThis:window);
