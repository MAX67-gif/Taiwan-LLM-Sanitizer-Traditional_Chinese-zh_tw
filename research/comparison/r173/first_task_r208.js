/* TLS R208 original local first-task guidance and opt-in feedback metadata.
 * Only consumes stage booleans and counts. Never sees, stores or transmits
 * source documents, source hashes, candidate text, option IDs or accounts.
 */
(function(root){'use strict';
const SCHEMA='tls.r208.first-task-flow-state.v1';
const FEEDBACK_SCHEMA='tls.r208.local-voluntary-feedback.v1';
const INPUT=Object.freeze(['source_loaded','analysis_ready','reviewable_count',
 'decision_count','omitted_count','preview_ready','export_action_triggered']);
const CLARITY=Object.freeze(['EASY','SOME_DIFFICULTY','NOT_CLEAR','NOT_EVALUATED']);
const OUTCOME=Object.freeze(['FINISHED','NOT_FINISHED','NOT_SURE']);
const fail=s=>{throw Error('TLS_R208_'+s);};
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const safeN=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
function evaluate(input){
 if(!plain(input)||Object.keys(input).length!==INPUT.length||
    !INPUT.every(k=>Object.prototype.hasOwnProperty.call(input,k)))fail('INPUT_SCHEMA');
 const {source_loaded,analysis_ready,reviewable_count,decision_count,omitted_count,
  preview_ready,export_action_triggered}=input;
 if([source_loaded,analysis_ready,preview_ready,export_action_triggered].some(x=>typeof x!=='boolean')||
    !safeN(reviewable_count,120)||!safeN(decision_count,120)||
    !safeN(omitted_count,1000000))fail('INPUT_TYPES');
 if((!source_loaded&&(analysis_ready||preview_ready||export_action_triggered))||
    (!analysis_ready&&(reviewable_count||decision_count||omitted_count||preview_ready||export_action_triggered))||
    decision_count>reviewable_count||
    (preview_ready&&reviewable_count>0&&decision_count===0)||
    (export_action_triggered&&!preview_ready))fail('INCONSISTENT_STATE');
 let stage,completed;
 if(!source_loaded){stage='NEED_INPUT';completed=0;}
 else if(!analysis_ready){stage='NEED_ANALYSIS';completed=1;}
 else if(reviewable_count===0){stage='NO_REVIEWABLE_CANDIDATES';completed=2;}
 else if(decision_count===0){stage='NEED_REVIEW';completed=2;}
 else if(!preview_ready){stage='NEED_PREVIEW';completed=3;}
 else if(!export_action_triggered){stage='NEED_EXPORT';completed=4;}
 else{stage='LOCAL_EXPORT_ACTION_TRIGGERED';completed=5;}
 return Object.freeze({schema:SCHEMA,stage,completed_steps:completed,total_steps:5,
  reviewable_count,decision_count,omitted_count,partial_coverage:omitted_count>0,
  preview_ready,export_action_triggered,
  full_document_certified:false,human_quality_verified:false,
  real_user_verified:false,auto_apply:false,network_requested:false});
}
function makeFeedback({flow,consent,clarity,outcome}={}){
 if(!plain(flow)||flow.schema!==SCHEMA||!Object.isFrozen(flow)||
    flow.full_document_certified!==false||flow.network_requested!==false||
    flow.auto_apply!==false)fail('FLOW_REQUIRED');
 if(consent!==true)fail('CONSENT_REQUIRED');
 if(!CLARITY.includes(clarity)||!OUTCOME.includes(outcome))fail('FEEDBACK_ENUM');
 if(outcome==='FINISHED'&&flow.stage!=='LOCAL_EXPORT_ACTION_TRIGGERED')fail('FINISH_NOT_OBSERVED');
 return Object.freeze({
  schema:FEEDBACK_SCHEMA,status:'LOCAL_USER_SELECTED_FEEDBACK_NOT_VERIFIED',
  stage:flow.stage,completed_steps:flow.completed_steps,total_steps:5,
  reviewable_count:flow.reviewable_count,decision_count:flow.decision_count,
  omitted_count:flow.omitted_count,partial_coverage:flow.partial_coverage,
  export_action_triggered:flow.export_action_triggered,
  clarity,outcome,local_download_consent:true,sharing_authorized:false,
  contains_source_text:false,contains_source_digest:false,
  contains_replacement_text:false,contains_candidate_ids:false,
  contains_file_names:false,contains_user_identity:false,
  network_requested:false,auto_apply:false,approval:'NONE',
  real_human_identity_verified:false,translation_quality_verified:false,
  external_adoption_verified:false,
 });
}
const API=Object.freeze({SCHEMA,FEEDBACK_SCHEMA,evaluate,makeFeedback});
root.TLSFirstTaskR208=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
