/* TLS R203: portable local-only wording review choices, no text or auto-apply.
 * Standalone research preview: opt-in JSON receipt must match exact source,
 * catalog, overlay and occurrence positions before any selection is restored.
 */
(function(root){'use strict';
const SCHEMA='tls.r203.review-continuity.v1';
const MAX_CHOICES=120;
const HEX=/^[0-9a-f]{64}$/;
const fail=code=>{throw Error('TLS_R203_'+code);};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const sameKeys=(x,keys)=>obj(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(x,k));
const int=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const seal=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){for(const y of Object.values(x))seal(y);Object.freeze(x);}return x;};
const HEADER=['schema','status','source_sha256','catalog_sha256','overlay_sha256','offset_unit',
 'candidate_count','protected_segments','omitted_candidate_count','choices','approval',
 'contains_original_text','contains_replacement_text','auto_apply','network_requested',
 'semantic_equivalence_verified'];
const ENTRY=['candidate_id','start','end','choice','option_id'];
function validate(plan){
 if(!sameKeys(plan,HEADER)||plan.schema!==SCHEMA||plan.status!=='USER_REVIEW_CHOICES_ONLY'||
    plan.offset_unit!=='utf16'||plan.approval!=='NONE'||plan.contains_original_text!==false||
    plan.contains_replacement_text!==false||plan.auto_apply!==false||
    plan.network_requested!==false||plan.semantic_equivalence_verified!==false)
   fail('SCHEMA_OR_PERMISSION');
 if(![plan.source_sha256,plan.catalog_sha256,plan.overlay_sha256].every(x=>typeof x==='string'&&HEX.test(x)))
   fail('INVALID_SOURCE_OR_LEXICON_HASH');
 if(!int(plan.candidate_count,MAX_CHOICES)||!int(plan.protected_segments,20000)||
    !int(plan.omitted_candidate_count,20000)||!Array.isArray(plan.choices)||
    plan.choices.length>plan.candidate_count)fail('LIMIT_EXCEEDED');
 const ids=new Set();let prev=-1;
 for(const row of plan.choices){
  if(!sameKeys(row,ENTRY)||!/^c\d{5}$/.test(row.candidate_id)||
     !int(row.start,65536)||!int(row.end,65536)||row.start>=row.end||
     row.start<prev||ids.has(row.candidate_id))fail('DUPLICATE_OR_UNSAFE_OCCURRENCE');
  if(row.choice!=='CONFIRM'&&row.choice!=='KEEP_ORIGINAL')fail('UNAPPROVED_CHOICE');
  if(row.choice==='KEEP_ORIGINAL'?row.option_id!==null:
     !(typeof row.option_id==='string'&&row.option_id.length<=160&&
       /^[a-zA-Z0-9_.:-]+$/.test(row.option_id)&&
       !['__proto__','constructor','prototype'].includes(row.option_id)))fail('OPTION_ID_INVALID');
  ids.add(row.candidate_id);prev=row.end;
 }
 return plan;
}
function capture(snapshot){
 if(!obj(snapshot)||snapshot.schema!=='tls.wording-candidates.v1'||snapshot.state!=='READY'||
    !Array.isArray(snapshot.candidates)||snapshot.candidates.length>MAX_CHOICES||
    !obj(snapshot.coverage))fail('SNAPSHOT_NOT_READY');
 const rows=[];
 for(const c of snapshot.candidates){
  if(c.choice==='UNSELECTED')continue;
  if(!['CONFIRM','KEEP_ORIGINAL'].includes(c.choice)||c.resolution!=='CONTEXT_REQUIRED')fail('NOT_A_REVIEWABLE_CHOICE');
  const option=c.choice==='CONFIRM'?c.options.find(o=>o.id===c.selected_option_id):null;
  if(c.choice==='CONFIRM'&&!option)fail('OPTION_NOT_IN_CATALOG');
  rows.push({candidate_id:c.id,start:c.start,end:c.end,choice:c.choice,option_id:option?.id??null});
 }
 const plan={schema:SCHEMA,status:'USER_REVIEW_CHOICES_ONLY',
  source_sha256:snapshot.source_sha256,catalog_sha256:snapshot.catalog_sha256,
  overlay_sha256:snapshot.overlay_sha256,offset_unit:'utf16',
  candidate_count:snapshot.candidates.length,
  protected_segments:snapshot.coverage.protected_segments,
  omitted_candidate_count:snapshot.coverage.omitted_candidate_count,
  choices:rows,approval:'NONE',contains_original_text:false,
  contains_replacement_text:false,auto_apply:false,network_requested:false,
  semantic_equivalence_verified:false};
 validate(plan);
 return seal(plan);
}
async function restore(session,untrustedPlan){
 const plan=validate(untrustedPlan);
 if(!session||typeof session.inspect!=='function'||typeof session.choose!=='function')
   fail('SESSION_REQUIRED');
 // Inspect in a *new, temporary session*. The caller owns disposal on error.
 let next=await session.inspect();
 if(next.state!=='READY'||next.schema!=='tls.wording-candidates.v1'||
    next.source_sha256!==plan.source_sha256||
    next.catalog_sha256!==plan.catalog_sha256||
    next.overlay_sha256!==plan.overlay_sha256||
    next.candidates.length!==plan.candidate_count||
    next.coverage.protected_segments!==plan.protected_segments||
    next.coverage.omitted_candidate_count!==plan.omitted_candidate_count)
   fail('SOURCE_OR_DICTIONARY_CHANGED');
 // Full dry-run and validation first: malformed imports never partially choose.
 const byId=new Map(next.candidates.map(c=>[c.id,c]));
 const operations=[];
 for(const row of plan.choices){
  const c=byId.get(row.candidate_id);
  if(!c||c.start!==row.start||c.end!==row.end||c.resolution!=='CONTEXT_REQUIRED')
    fail('CANDIDATE_ANCHOR_CHANGED');
  if(row.choice==='CONFIRM'&&!c.options.some(o=>o.id===row.option_id))
    fail('OPTION_NO_LONGER_PRESENT');
  operations.push({candidate_id:row.candidate_id,action:row.choice,
                   ...(row.choice==='CONFIRM'?{option_id:row.option_id}:{})});
 }
 for(const command of operations){
   next=session.choose({...command,snapshot_id:next.snapshot_id});
 }
 return seal({schema:'tls.r203.review-restore-result.v1',status:'CHOICES_RESTORED_PREVIEW_REQUIRED',
   snapshot:next,restored_count:operations.length,approval:'NONE',
   source_unchanged:true,preview_not_applied:true,network_requested:false});
}
const API=Object.freeze({SCHEMA,MAX_CHOICES,capture,validate,restore});
root.TLSReviewContinuityR203=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
