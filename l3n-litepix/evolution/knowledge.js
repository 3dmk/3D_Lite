(function(g){'use strict';
function create(){const records=[];return Object.freeze({record(x){const r=Object.freeze({...x,at:x.at||Date.now()});records.push(r);return r;},snapshot(){return Object.freeze(records.slice());},lessons(){return Object.freeze(records.filter(x=>x.outcome==='promoted'||x.outcome==='rejected').map(x=>Object.freeze({hypothesis:x.hypothesis,outcome:x.outcome,cause:x.cause||null,evidence:x.evidence||null})));}});}
g.L3NLitePixEvolutionKnowledge=Object.freeze({version:'0.1.0',create});
})(typeof globalThis!=='undefined'?globalThis:window);
