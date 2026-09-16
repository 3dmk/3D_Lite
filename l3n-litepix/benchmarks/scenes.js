(function(root){'use strict';
const SCENES=Object.freeze([
{id:'simple',kind:'baseline',objects:3,lights:1,features:['diffuse']},
{id:'geometry-stress',kind:'geometry',objects:1024,lights:1,features:['bvh','instances']},
{id:'shadow-stress',kind:'lighting',objects:64,lights:16,features:['visibility','shadows']},
{id:'reflection-stress',kind:'material',objects:32,lights:4,features:['reflection','bsdf']},
{id:'gi-stress',kind:'transport',objects:48,lights:2,features:['gi','multi-bounce']},
{id:'mixed-production',kind:'mixed',objects:128,lights:8,features:['bvh','shadows','reflection','gi']}
]);
const byId=id=>SCENES.find(s=>s.id===id)||null;
root.L3NLitePixBenchmarkScenes=Object.freeze({version:'0.1.0',all:()=>SCENES.slice(),byId});
})(typeof globalThis!=='undefined'?globalThis:window);
