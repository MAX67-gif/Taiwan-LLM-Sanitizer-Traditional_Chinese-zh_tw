/* TLS R194: research-only Taiwan wording contrast library and nonbinary router.
 * Originals only. This code NEVER edits a string, performs network I/O, records
 * real user source, adds a shipped lexicon entry, or reports language accuracy.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const CASES=path.join(__dirname,'context_contrasts_r194.json');
const STATES=Object.freeze({
 PREFERRED_SUGGESTION:'PREFERRED_SUGGESTION',
 COUNTEREXAMPLE_BLOCK:'COUNTEREXAMPLE_BLOCK',
 PROTECTED_KEEP:'PROTECTED_KEEP',
 UNKNOWN_KEEP:'UNKNOWN_KEEP',
});
function reject(code){throw new Error('R194_'+code);}
function validate(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||data.schema!=='tls.r194.context-contrast-research.v1'
  ||data.language!=='zh-TW'||data.kind!=='ORIGINAL_SYNTHETIC_RESEARCH'
  ||data.research_only!==true||data.auto_rewrite!==false||data.automatic_translation!==false
  ||data.human_quality_verified!==false||data.adoption_measured!==false
  ||data.legal_claim!=='SELF_AUTHORED_EXAMPLES_ONLY')reject('SCHEMA_OR_PROMOTION');
 if(!Array.isArray(data.taxonomy)||!Array.isArray(data.cases)||
   data.cases.length<40||data.cases.length>120)reject('CASE_COUNT');
 const allowedTaxonomy=['PREFERRED_SUGGESTION','FORBIDDEN_IN_WRONG_CONTEXT',
                        'UNTRANSLATABLE_PROTECTED','AMBIGUOUS_KEEP_ORIGINAL'];
 const tax=new Set(data.taxonomy);
 if(tax.size!==allowedTaxonomy.length||allowedTaxonomy.some(state=>!tax.has(state)))
   reject('TAXONOMY');
 const seen=new Set(),domains=new Set(),terms=new Set();
 for(const item of data.cases){
  if(!item||typeof item!=='object'||!/^CTX\d{3}$/.test(item.id||'')||seen.has(item.id))
    reject('DUPLICATE_OR_BAD_ID');
  seen.add(item.id);
  if(typeof item.term!=='string'||!item.term.trim()||item.term.length>48||
    !/^[\p{L}\p{N}_-]+$/u.test(item.term))reject('TERM_INVALID');
  terms.add(item.term);
  if(typeof item.domain!=='string'||!/[a-z]/.test(item.domain)||!/^[a-z][a-z0-9_]{1,40}$/.test(item.domain))reject('DOMAIN');
  domains.add(item.domain);
  const p=item.positive,n=item.counterexample;
  if(!p||!n||p.mode!=='SUGGEST_ONLY'||n.mode!=='DO_NOT_APPLY_POSITIVE')
    reject('WRONG_ROUTING');
  if(typeof p.text!=='string'||typeof n.text!=='string'||p.text.length>160||n.text.length>160||
    !p.text.includes(item.term)||!n.text.includes(item.term)||p.text===n.text)
    reject('MISSING_CONTRAST');
  if(typeof p.suggested_tw!=='string'||!p.suggested_tw.trim()||p.suggested_tw===n.contextual_term||
    typeof n.contextual_term!=='string'||!n.contextual_term.trim())reject('UNSAFE_CANDIDATE_CONFLATION');
  if(item.protected_example!==`\`const label = ${JSON.stringify(item.term)};\``||
    item.provenance!=='ORIGINAL_SYNTHETIC_EXAMPLE'||item.status!=='NEEDS_HUMAN_REVIEW')
    reject('PROVENANCE_OR_CODE_KEEP');
 }
 if(domains.size<20||terms.size<40)reject('DIVERSITY_NOT_DEMONSTRATED');
 return Object.freeze({
  schema:'tls.r194.context-contrast-validation.v1',result:'STRUCTURAL_PASS_NOT_LINGUISTIC_CERTIFICATION',
  case_count:data.cases.length,domain_count:domains.size,unique_term_count:terms.size,
  synthetic_positive_examples:data.cases.length,synthetic_negative_examples:data.cases.length,
  protected_examples:data.cases.length,provenance:'ORIGINAL_SYNTHETIC',
  network_requests:0,source_text_in_receipt:false,auto_rewrite:false,human_quality_verified:false,
 });
}
function load(){
 const data=JSON.parse(fs.readFileSync(CASES,'utf8'));
 validate(data);
 return data;
}
function routeExactSynthetic(item,input,{protectedExample=false}={}){
 if(!item||typeof input!=='string')reject('ROUTE_INPUT');
 if(protectedExample&&input===item.protected_example)
  return Object.freeze({id:item.id,state:STATES.PROTECTED_KEEP,auto_apply:false});
 if(input===item.positive.text)
  return Object.freeze({id:item.id,state:STATES.PREFERRED_SUGGESTION,auto_apply:false});
 if(input===item.counterexample.text)
  return Object.freeze({id:item.id,state:STATES.COUNTEREXAMPLE_BLOCK,auto_apply:false});
 return Object.freeze({id:item.id,state:STATES.UNKNOWN_KEEP,auto_apply:false});
}
if(require.main===module){
 if(process.argv.length!==3||process.argv[2]!=='--check')reject('USAGE_ONLY_CHECK');
 console.log(JSON.stringify(validate(load()),null,2));
}
module.exports=Object.freeze({load,validate,routeExactSynthetic,STATES});
