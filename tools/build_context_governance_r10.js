/* R10 deterministic, zero-network public evidence workbench builder; never promote terms. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),file=p=>path.join(ROOT,p),read=p=>fs.readFileSync(file(p),'utf8');
const packText=read('lexicon/context_provenance_r10.json'),pack=JSON.parse(packText);
const r9=JSON.parse(read('lexicon/context_examples_r9.json'));
const core=require('../src/core/context_governance_r10.js'),stats=core.validatePack(pack);
if(pack.entries.length!==40||stats.referencedR9!==28||stats.originalR10!==12||r9.entries.length!==28)
 throw new Error('R10_PROVENANCE_COUNTS_CHANGED');
const r9ById=new Map(r9.entries.map(row=>[row.id,row]));
for(const row of pack.entries){
 if(row.evidence_origin!=='r9_editorial_reference')continue;
 const src=r9ById.get(row.source_case_id);
 if(!src||src.from!==row.source_term||src.domain!==row.domain||src.preferred!==row.suggested_term||
  src.reason!==row.meaning_note||src.positive_example!==row.positive_example||
  src.counter_example!==row.counter_example||src.status!=='editorial_example_unverified'||src.auto_apply!==false)
  throw new Error('R10_R9_SOURCE_MISMATCH: '+row.id);
}
const digest=crypto.createHash('sha256').update(Buffer.from(packText,'utf8')).digest('hex');
const manifest={schema:'tls.term-evidence-manifest.v1',pack_id:pack.pack_id,
 source_path:'lexicon/context_provenance_r10.json',source_sha256:digest,
 case_count:stats.cases,referenced_r9:stats.referencedR9,new_editorial:stats.originalR10,
 runtime_permission:'NONE',independent_validation:false,never_promote_candidates:true};
const html=read('tools/templates/context_governance_r10.html')
 .replace('__TLS_R10_PACK_JSON__',JSON.stringify(pack).replace(/</gu,'\\u003c'))
 .replace('__TLS_R10_PACK_SHA256__',digest)
 .replace('__TLS_R10_CORE_JS__',read('src/core/context_governance_r10.js'));
if(/__TLS_R10_[A-Z0-9_]+__/u.test(html)||html.includes('src="http')||html.includes('href="http'))
 throw new Error('R10_OUTPUT_HAS_PLACEHOLDER_OR_EXTERNAL_DEP');
const files={
 'lexicon/context_provenance_r10_manifest.json':JSON.stringify(manifest,null,2)+'\n',
 'examples/TW_Context_Governance_Lab_R10_20261024.html':html,
};
const check=process.argv.includes('--check');
for(const [name,content] of Object.entries(files)){
 const dest=file(name);
 if(check){if(!fs.existsSync(dest)||read(name)!==content)throw new Error('R10_GENERATED_OUTPUT_DRIFT: '+name);}
 else {fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content,'utf8');}
}
console.log('R10 EVIDENCE '+(check?'PARITY PASS':'BUILT'),JSON.stringify(stats),digest);
