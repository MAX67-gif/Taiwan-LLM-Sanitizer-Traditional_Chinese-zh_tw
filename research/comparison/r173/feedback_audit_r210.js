/* TLS R210: STRICT offline aggregate of previously voluntarily exported R208
 * local metadata. Counts files/payloads, NEVER people, adoption or quality.
 * No source documents, hashes, identity, telemetry, storage or egress.
 */
(function(root){'use strict';
const Flow=root.TLSFirstTaskR208||(typeof require==='function'?require('./first_task_r208.js'):null);
if(!Flow)throw Error('TLS_R210_MISSING_R208');
const SCHEMA='tls.r210.local-feedback-evidence.v1';
const MAX_FILE_BYTES=8192,MAX_FILES=40,MAX_TOTAL_BYTES=262144;
const KEYS=Object.freeze(['schema','status','stage','completed_steps','total_steps',
 'reviewable_count','decision_count','omitted_count','partial_coverage',
 'export_action_triggered','clarity','outcome','local_download_consent',
 'sharing_authorized','contains_source_text','contains_source_digest',
 'contains_replacement_text','contains_candidate_ids','contains_file_names',
 'contains_user_identity','network_requested','auto_apply','approval',
 'real_human_identity_verified','translation_quality_verified',
 'external_adoption_verified']);
const CLARITY=Object.freeze(['EASY','SOME_DIFFICULTY','NOT_CLEAR','NOT_EVALUATED']);
const OUTCOME=Object.freeze(['FINISHED','NOT_FINISHED','NOT_SURE']);
const STAGES=Object.freeze(['NEED_INPUT','NEED_ANALYSIS','NEED_REVIEW',
 'NO_REVIEWABLE_CANDIDATES','NEED_PREVIEW','NEED_EXPORT','LOCAL_EXPORT_ACTION_TRIGGERED']);
const SAFE_FALSE=Object.freeze(['sharing_authorized','contains_source_text',
 'contains_source_digest','contains_replacement_text','contains_candidate_ids',
 'contains_file_names','contains_user_identity','network_requested',
 'auto_apply','real_human_identity_verified','translation_quality_verified',
 'external_adoption_verified']);
const fail=c=>{throw Error('TLS_R210_'+c);};
const safeInt=(v,n)=>Number.isSafeInteger(v)&&v>=0&&v<=n;
const safeObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function inputText(value){
 let text,bytes;
 if(typeof value==='string'){
  text=value;bytes=new TextEncoder().encode(value);
 }else if(value instanceof Uint8Array||value instanceof ArrayBuffer){
  bytes=value instanceof Uint8Array?value:new Uint8Array(value);
  try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(_){fail('INVALID_UTF8');}
 }else fail('INPUT_NOT_BYTES');
 if(!bytes.length||bytes.length>MAX_FILE_BYTES)fail('FILE_LIMIT');
 if(text.includes('\0'))fail('NUL_NOT_ALLOWED');
 return text;
}
// Parse R208 JSON without allowing JSON.parse to hide duplicate escaped keys.
function parseDistinctJSON(text){
 let i=0,nodes=0;const whitespace=()=>{while(/[\x20\t\r\n]/.test(text[i]||'!'))i++;};
 function string(){
  if(text[i]!=='"')fail('INVALID_JSON');const begin=i++;
  while(i<text.length){const c=text[i++];
   if(c==='"'){
    try{return JSON.parse(text.slice(begin,i));}catch(_){fail('INVALID_JSON');}
   }
   if(c==='\\'){if(i>=text.length)fail('INVALID_JSON');i++;}
  }
  fail('INVALID_JSON');
 }
 function value(depth){
  if(depth>5||++nodes>1024)fail('JSON_LIMIT');
  whitespace();const c=text[i];
  if(c==='"')return string();
  if(c==='{'){
   i++;whitespace();const out={},seen=new Set();
   if(text[i]==='}'){i++;return out;}
   for(;;){whitespace();const key=string();
    if(seen.has(key))fail('DUPLICATE_JSON_KEY');
    if(['__proto__','constructor','prototype'].includes(key))fail('UNSAFE_JSON_KEY');
    seen.add(key);whitespace();if(text[i++]!==':')fail('INVALID_JSON');
    out[key]=value(depth+1);whitespace();const closer=text[i++];
    if(closer==='}')return out;if(closer!==',')fail('INVALID_JSON');
   }
  }
  if(c==='['){
   i++;whitespace();const out=[];if(text[i]===']'){i++;return out;}
   for(;;){if(out.length>100)fail('JSON_LIMIT');out.push(value(depth+1));
    whitespace();const closer=text[i++];if(closer===']')return out;
    if(closer!==',')fail('INVALID_JSON');}
  }
  for(const [word,v] of [['true',true],['false',false],['null',null]]){
   if(text.startsWith(word,i)){i+=word.length;return v;}
  }
  const number=/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
  if(!number)fail('INVALID_JSON');i+=number[0].length;const result=Number(number[0]);
  if(!Number.isFinite(result))fail('INVALID_NUMBER');return result;
 }
 whitespace();const result=value(0);whitespace();
 if(i!==text.length)fail('INVALID_JSON');return result;
}
function validateFeedback(untrusted){
 if(!safeObject(untrusted)||Object.keys(untrusted).length!==KEYS.length||
    !KEYS.every(k=>Object.prototype.hasOwnProperty.call(untrusted,k)))fail('SCHEMA_KEYS');
 const fields=Object.getOwnPropertyDescriptors(untrusted),copy={};
 for(const key of KEYS){const d=fields[key];
  if(!d||!d.enumerable||!('value' in d))fail('SCHEMA_DATA_ONLY');
  copy[key]=d.value;
 }
 if(copy.schema!==Flow.FEEDBACK_SCHEMA||
    copy.status!=='LOCAL_USER_SELECTED_FEEDBACK_NOT_VERIFIED'||
    copy.total_steps!==5||copy.approval!=='NONE'||
    copy.local_download_consent!==true||
    SAFE_FALSE.some(k=>copy[k]!==false)||
    !STAGES.includes(copy.stage)||!CLARITY.includes(copy.clarity)||
    !OUTCOME.includes(copy.outcome)||
    typeof copy.partial_coverage!=='boolean'||
    typeof copy.export_action_triggered!=='boolean'||
    !safeInt(copy.completed_steps,5)||!safeInt(copy.reviewable_count,120)||
    !safeInt(copy.decision_count,120)||!safeInt(copy.omitted_count,1000000))
   fail('CLAIM_OR_VALUE');
 const source_loaded=copy.stage!=='NEED_INPUT';
 const analysis_ready=!['NEED_INPUT','NEED_ANALYSIS'].includes(copy.stage);
 const preview_ready=['NEED_EXPORT','LOCAL_EXPORT_ACTION_TRIGGERED'].includes(copy.stage);
 let derived;
 try{derived=Flow.evaluate({source_loaded,analysis_ready,
  reviewable_count:copy.reviewable_count,decision_count:copy.decision_count,
  omitted_count:copy.omitted_count,preview_ready,
  export_action_triggered:copy.export_action_triggered});}
 catch(_){fail('IMPOSSIBLE_STAGE');}
 if(derived.stage!==copy.stage||derived.completed_steps!==copy.completed_steps||
    derived.partial_coverage!==copy.partial_coverage||
    derived.export_action_triggered!==copy.export_action_triggered||
    (copy.outcome==='FINISHED'&&copy.stage!=='LOCAL_EXPORT_ACTION_TRIGGERED'))
   fail('IMPOSSIBLE_STAGE');
 return Object.freeze(copy);
}
function parseFeedback(raw){return validateFeedback(parseDistinctJSON(inputText(raw)));}
function emptyCounts(options){return Object.fromEntries(options.map(key=>[key,0]));}
function summarizeBatch(inputs){
 if(!Array.isArray(inputs)||inputs.length>MAX_FILES)fail('BATCH_LIMIT');
 let total=0,accepted=0,duplicates=0,rejected=0;
 const outcome=emptyCounts(OUTCOME),clarity=emptyCounts(CLARITY),stage=emptyCounts(STAGES);
 const failures=Object.create(null),seen=new Set();
 for(const raw of inputs){
  if(!(typeof raw==='string'||raw instanceof Uint8Array||raw instanceof ArrayBuffer))fail('BATCH_INPUT');
  const bytes=typeof raw==='string'?new TextEncoder().encode(raw).length:raw.byteLength;
  total+=bytes;if(total>MAX_TOTAL_BYTES)fail('BATCH_LIMIT');
  if(bytes>MAX_FILE_BYTES)fail('FILE_LIMIT');
  try{
   const row=parseFeedback(raw);
   const canonical=JSON.stringify(KEYS.map(k=>row[k]));
   if(seen.has(canonical)){duplicates++;continue;}
   seen.add(canonical);accepted++;
   outcome[row.outcome]++;clarity[row.clarity]++;stage[row.stage]++;
  }catch(error){
   rejected++;
   // Do not propagate external content, filenames, tokens or raw errors.
   const code=/^TLS_R210_([A-Z_]+)$/.exec(String(error.message||''))?.[1]||'UNKNOWN';
   failures[code]=(failures[code]||0)+1;
  }
 }
 const summary={schema:SCHEMA,status:'UNVERIFIED_VOLUNTARY_METADATA_ONLY',
  input_files:inputs.length,accepted_distinct_payloads:accepted,
  duplicate_payloads:duplicates,rejected_files:rejected,
  clarity:Object.freeze(clarity),outcomes:Object.freeze(outcome),
  stages:Object.freeze(stage),rejection_reason_counts:Object.freeze({...failures}),
  real_user_count_verified:false,adoption_verified:false,
  translation_quality_verified:false,authenticity_verified:false,
  independently_verified_participants:0,unique_humans_estimated:false,
  external_sharing_authorized:false,source:'USER_SELECTED_LOCAL_FILES_ONLY',
  contains_original_text:false,contains_source_hashes:false,
  contains_candidate_ids:false,contains_file_names:false,
  contains_user_identity:false,network_requested:false,auto_apply:false,
  approval:'NONE'};
 return Object.freeze(summary);
}
const API=Object.freeze({SCHEMA,MAX_FILE_BYTES,MAX_FILES,
 validateFeedback,parseFeedback,summarizeBatch});
root.TLSFeedbackEvidenceR210=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
