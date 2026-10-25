/* TLS R16 Offline Localization Safety Studio — original MIT shadow wrapper.
 * User-supplied data never leaves in-memory session; no provider or transport.
 * All preview edits re-enter the locked R15.1 validation contract.
 */
(function(global){'use strict';
const SCHEMA='tls.local-workbench.v1';
const CORE=global.TLSProtectedR15||(typeof require==='function'?require('./protected_segments_r15.js'):null);
if(!CORE||typeof CORE.analyze!=='function'||typeof CORE.preview!=='function')throw Error('TLS_R16_MISSING_R151_CORE');
const formats=new Set(['markdown','json','prompt']);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const cleanReason=x=>String(x||'INVALID').replace(/[^A-Z0-9_]/g,'').slice(0,88)||'INVALID';
const fail=code=>{throw Error('TLS_R16_'+code);};
let currentIndex=0;
function openSession({source,format}={}){
 let original=typeof source==='string'?source:null;
 const kind=formats.has(format)?format:'UNSUPPORTED';
 let generation=0,closed=false,analysis=null,rejected=[];
 const id=++currentIndex;
 const alive=epoch=>{if(closed||epoch!==generation)fail('SESSION_CANCELLED');};
 const freshReport=(a,issues,previewSha=null,changes=0)=>({
   schema:SCHEMA,format:kind,source_sha256:a?.input_sha256||null,
   source_bytes:a?.input_bytes??null,offset_unit:'utf16',
   protected_spans:(a?.segments||[]).filter(s=>s.policy==='PROTECT').map(s=>({id:s.id,start:s.start,end:s.end,type:s.type,reason:s.reason})),
   safe_edit_ids:(a?.segments||[]).filter(s=>s.policy==='EDITABLE').map(s=>s.id),
   validation_status:issues.length?'REJECTED':'OK',reject_reasons:issues.slice(),
   preview_output_sha256:previewSha,preview_change_count:changes,network_requested:false,
   approval:'NONE',contains_original_text:false,contains_replacement_text:false,
   session_id:`local-${id}`,transport:'NONE'
 });
 async function inspect(){
   const rev=generation;alive(rev);
   if(kind==='UNSUPPORTED'||original===null||!original.trim()){
     rejected=[kind==='UNSUPPORTED'?'INVALID_FORMAT':!original?'EMPTY_SOURCE':'EMPTY_SOURCE'];
     analysis=null;return freshReport(null,rejected);
   }
   try{
     const a=await CORE.analyze(original,kind);alive(rev);
     analysis=a;
     rejected=a.validation.status==='OK'?[]:a.validation.errors.map(cleanReason);
     return freshReport(analysis,rejected);
   }catch(e){alive(rev);analysis=null;rejected=[cleanReason(e.message)];return freshReport(null,rejected);}
 }
 async function prepare(plan){
   const rev=generation;alive(rev);
   if(!analysis||rejected.length||analysis.validation.status!=='OK')fail('INSPECTION_REQUIRED');
   if(!isObject(plan)||Object.keys(plan).some(k=>!['schema','input_sha256','edits'].includes(k))||
      plan.schema!=='tls.structured-edits.v1'||plan.input_sha256!==analysis.input_sha256||!Array.isArray(plan.edits))fail('INVALID_EDIT_PLAN');
   // CORE.preview rechecks SHA, editable ranges and structural consistency, and returns only a preview.
   const result=await CORE.preview(original,analysis,plan.edits);alive(rev);
   if(result.approval!=='NONE'||result.status!=='SAFE_PREVIEW_NOT_APPLIED')fail('UNSAFE_CORE_RESULT');
   return {schema:'tls.local-workbench-preview.v1',status:'SAFE_PREVIEW_NOT_APPLIED',
     preview_text:result.preview_text,report:freshReport(analysis,[],result.preview_sha256,result.change_count),
     changes:result.changes.map(c=>({id:c.id,start:c.start,end:c.end,type:c.type,originalLength:c.originalLength,newLength:c.newLength}))};
 }
 function revoke(){++generation;closed=true;analysis=null;original=null;rejected=['SESSION_REVOKED'];return Object.freeze({status:'REVOKED',session_id:`local-${id}`,approval:'NONE'});}
 function changesAllowed(){return !closed&&analysis?.validation.status==='OK'?analysis.segments.filter(s=>s.policy==='EDITABLE').map(s=>({id:s.id,start:s.start,end:s.end,type:s.type})):[];}
 function excerpt(id){if(closed||!analysis)return null;const s=analysis.segments.find(t=>t.policy==='EDITABLE'&&t.id===id);return s?original.slice(s.start,s.end):null;}
 return Object.freeze({inspect,prepare,revoke,changesAllowed,excerpt});
}
const API=Object.freeze({SCHEMA,openSession});
global.TLSLocalWorkbenchR16=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
