/* TLS R9: deterministic offline review/choice page builder, no network. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..'),file=p=>path.join(ROOT,p),read=p=>fs.readFileSync(file(p),'utf8');
const candidates=JSON.parse(read('lexicon/candidates_r3.json')).entries;
const approved=JSON.parse(read('lexicon/approved_r3.json')).entries;
const contexts=JSON.parse(read('lexicon/context_examples_r9.json'));
if(candidates.length!==883||approved.length!==67||contexts.entries.length<24)
 throw Error('R9_SOURCE_COUNT_MISMATCH');
const rows=[...approved,...candidates].map(x=>({id:x.id,from:x.from,to:x.to,domain:x.domain,
 scope:x.scope||'general',review_status:x.review_status}));
const output=read('tools/templates/user_terms_r9.html')
 .replace('__TLS_R9_CATALOG__',JSON.stringify(rows).replace(/</gu,'\\u003c'))
 .replace('__TLS_R9_EXAMPLES__',JSON.stringify(contexts).replace(/</gu,'\\u003c'))
 .replace('__TLS_R9_REVIEW_ENGINE__',read('src/core/term_review.js'))
 .replace('__TLS_R9_TERMS_ENGINE__',read('src/core/user_terms_r9.js'));
if(output.includes('__TLS_R9_'))throw Error('R9_UNREPLACED_TOKEN');
const target=file('examples/TW_User_Context_Lab_R9_20261024.html');
if(process.argv.includes('--check')){
 if(!fs.existsSync(target)||read('examples/TW_User_Context_Lab_R9_20261024.html')!==output)
  throw Error('R9_ARTIFACT_OUT_OF_SYNC');
 console.log('R9 OFFLINE ARTIFACT MATCH',rows.length,contexts.entries.length);
}else{
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,output,'utf8');
 console.log('R9 OFFLINE USER CHOICE LAB BUILT',rows.length,contexts.entries.length);
}
