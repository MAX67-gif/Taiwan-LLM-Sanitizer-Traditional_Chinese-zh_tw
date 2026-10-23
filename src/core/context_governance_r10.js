/* Taiwan-LLM-Sanitizer R10: provenance & human-choice governance; NO runtime translation permission. MIT. */
(function(global){
'use strict';
const EVIDENCE_SCHEMA='tls.term-evidence.v1';
const REVIEW_SCHEMA='tls.term-review-ledger.v1';
const DOMAIN_SET=new Set(['general','ui','software','engineering','ai','security','ecommerce',
  'finance','food','travel','education','medicine','media','office','public','games','industry']);
const OUTCOMES=new Set(['KEEP_ORIGINAL','SUGGEST_ONLY','CONTEXT_REQUIRED','REJECT_SUGGESTION']);
const MAX_REVIEWS=200, MAX_IMPORT_BYTES=65536,MAX_NOTE=160;
function assertPlainObject(obj,code){
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.getPrototypeOf(obj)!==Object.prototype)
  throw new Error(code);
}
function exactKeys(row,required,code){
 assertPlainObject(row,code);
 if(Object.keys(row).some(k=>!required.includes(k))||required.some(k=>!Object.hasOwn(row,k)))
  throw new Error(code);
}
function stringField(value,max,code){
 if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f]/u.test(value))
  throw new Error(code);
 return value;
}
function validatePack(data){
 const top=['schema','pack_id','published_on','language_policy','source_policy',
  'license_scope','runtime_permission','evaluation_use','entries'];
 exactKeys(data,top,'PACK_FIELDS_INVALID');
 if(data.schema!==EVIDENCE_SCHEMA||data.runtime_permission!=='NONE'||
  data.source_policy!=='original_project_editorial_examples_only_not_independent_attestation'||
  data.language_policy!=='neutral_no_banned_words_keep_original_allowed'||
  data.license_scope!=='MIT_original_editorial_examples_only'||
  data.evaluation_use!=='human_review_training_material_only_not_quality_benchmark')
   throw new Error('PACK_POLICY_INVALID');
 stringField(data.pack_id,110,'PACK_ID_INVALID');
 if(!/^20\d\d-\d\d-\d\d$/u.test(data.published_on))throw new Error('PACK_DATE_INVALID');
 if(!Array.isArray(data.entries)||data.entries.length<24||data.entries.length>150)
  throw new Error('PACK_ENTRIES_INVALID');
 const keys=['id','source_term','domain','suggested_term','meaning_note','positive_example',
  'counter_example','evidence_origin','source_path','source_case_id','source_license',
  'evidence_status','permission','auto_apply','risk_tier'];
 const ids=new Set();let fromR9=0;
 for(const row of data.entries){
  exactKeys(row,keys,'CASE_FIELDS_INVALID');
  if(!/^r10-\d{3}$/u.test(row.id)||ids.has(row.id))throw new Error('CASE_ID_INVALID');
  ids.add(row.id);
  stringField(row.source_term,96,'SOURCE_INVALID');
  stringField(row.suggested_term,120,'SUGGESTION_INVALID');
  stringField(row.meaning_note,300,'REASON_INVALID');
  stringField(row.positive_example,340,'POSITIVE_INVALID');
  stringField(row.counter_example,340,'COUNTER_INVALID');
  if(!DOMAIN_SET.has(row.domain)||!['low','medium','high'].includes(row.risk_tier))throw new Error('CASE_DOMAIN_RISK_INVALID');
  if(row.evidence_status!=='unverified_editorial'||row.permission!=='SUGGEST_ONLY'||row.auto_apply!==false||
   row.source_license!=='project_original_editorial_example')throw new Error('CASE_PROMOTION_BLOCKED');
  if(row.evidence_origin==='r9_editorial_reference'){
   fromR9++;
   if(row.source_path!=='lexicon/context_examples_r9.json'||!/^r9-\d{3}$/u.test(row.source_case_id)||
    row.id!=='r10-'+row.source_case_id.slice(3))throw new Error('R9_PROVENANCE_INVALID');
  }else if(row.evidence_origin==='r10_original_editorial'){
   if(row.source_path!=='lexicon/context_provenance_r10.json'||row.source_case_id!==row.id)
    throw new Error('R10_PROVENANCE_INVALID');
  }else throw new Error('SOURCE_KIND_INVALID');
 }
 return {cases:data.entries.length,referencedR9:fromR9,originalR10:data.entries.length-fromR9,
  distinctSourceTerms:new Set(data.entries.map(x=>x.source_term)).size,
  independentVerification:false,allSuggestionOnly:true,runtimePermission:'NONE'};
}
function blankLedger(packHash){
 if(typeof packHash!=='string'||!/^[0-9a-f]{64}$/u.test(packHash))throw new Error('HASH_INVALID');
 return {schema:REVIEW_SCHEMA,locale:'zh-TW',evidence_sha256:packHash,decisions:[]};
}
function validateDecision(raw,ids){
 exactKeys(raw,['case_id','outcome','note'],'REVIEW_FIELDS_INVALID');
 if(!ids.has(raw.case_id)||!OUTCOMES.has(raw.outcome))throw new Error('REVIEW_ACTION_INVALID');
 if(typeof raw.note!=='string'||raw.note.length>MAX_NOTE||/[\u0000-\u001f\u007f<>]/u.test(raw.note))
  throw new Error('REVIEW_NOTE_INVALID');
 return {case_id:raw.case_id,outcome:raw.outcome,note:raw.note.trim()};
}
function normalizeDecisions(decisions,pack){
 if(!Array.isArray(decisions)||decisions.length>MAX_REVIEWS)throw new Error('TOO_MANY_REVIEWS');
 const ids=new Set(pack.entries.map(x=>x.id)),seen=new Set(),out=[];
 for(const raw of decisions){
  const d=validateDecision(raw,ids);
  if(seen.has(d.case_id))throw new Error('DUPLICATE_REVIEW');
  seen.add(d.case_id);out.push(d);
 }
 return out.sort((a,b)=>a.case_id.localeCompare(b.case_id,'en'));
}
function exportLedger(decisions,pack,packHash){
 validatePack(pack);
 const ledger=blankLedger(packHash);
 ledger.decisions=normalizeDecisions(decisions,pack);
 const text=JSON.stringify(ledger,null,2)+'\n';
 if(new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)throw new Error('REVIEW_FILE_TOO_LARGE');
 return text;
}
function importLedger(text,pack,packHash){
 validatePack(pack);blankLedger(packHash);
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)
  throw new Error('REVIEW_FILE_TOO_LARGE');
 let data;try{data=JSON.parse(text)}catch(_){throw new Error('REVIEW_JSON_INVALID');}
 exactKeys(data,['schema','locale','evidence_sha256','decisions'],'REVIEW_SCHEMA_INVALID');
 if(data.schema!==REVIEW_SCHEMA||data.locale!=='zh-TW')throw new Error('REVIEW_FORMAT_INCOMPATIBLE');
 if(data.evidence_sha256!==packHash)throw new Error('EVIDENCE_VERSION_MISMATCH');
 return normalizeDecisions(data.decisions,pack);
}
function decide(rows,caseId,outcome,note,pack){
 validatePack(pack);
 const next={case_id:caseId,outcome,note};
 const ids=new Set(pack.entries.map(x=>x.id));validateDecision(next,ids);
 return normalizeDecisions([...rows.filter(x=>x.case_id!==caseId),next],pack);
}
function explain(record){
 if(!record)return '沒有詞彙案例';
 const action=record.risk_tier==='high'?'高歧義：建議補語境再由人決定':'人工審查：可保留原詞或選擇建議用語';
 return `${action}。尚未通過獨立雙人審查，不得自動改寫任何網站或文件。`;
}
const api=Object.freeze({EVIDENCE_SCHEMA,REVIEW_SCHEMA,MAX_REVIEWS,MAX_IMPORT_BYTES,
 validatePack,blankLedger,validateDecision,normalizeDecisions,exportLedger,importLedger,decide,explain});
global.TLSEvidenceR10=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
