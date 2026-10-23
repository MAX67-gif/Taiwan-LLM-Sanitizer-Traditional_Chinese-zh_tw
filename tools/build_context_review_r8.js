/* R8 deterministic local-only contextual review workbench builder. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),file=p=>path.join(ROOT,p),read=p=>fs.readFileSync(file(p),'utf8');
const cand=JSON.parse(read('lexicon/candidates_r3.json')).entries;
const approved=JSON.parse(read('lexicon/approved_r3.json')).entries;
if(cand.length!==883||approved.length!==67)throw Error('Catalog count changed; manual review required');
const rows=[...approved,...cand].map(x=>({id:x.id,from:x.from,to:x.to,domain:x.domain,scope:x.scope||'general',review_status:x.review_status}));
const html=read('tools/templates/context_review_r8.html')
 .replace('__TLS_R8_CATALOG__',JSON.stringify(rows).replace(/</gu,'\\u003c'))
 .replace('__TLS_R8_ENGINE__',read('src/core/term_review.js'));
const target=file('examples/TW_Context_Review_Lab_R8_20261024.html');
if(process.argv.includes('--check')){
 if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==html)throw Error('R8 generated HTML differs from source');
 console.log('R8 BUILD FIDELITY PASS',rows.length);
}else{
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,html,'utf8');
 console.log('R8 OFFLINE WORKBENCH BUILT',rows.length);
}
