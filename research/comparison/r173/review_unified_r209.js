/* TLS R209: immutable view-only coordination between R205 risk routing,
 * R207 one-card focus and R208 guided local workflow. Never translates,
 * decides, alters a source document or records private session data.
 */
(function(root){'use strict';
const L=root.TLSContextRiskLensR205||(typeof require==='function'?require('./context_risk_lens_r205.js'):null);
const F=root.TLSReviewFocusR207||(typeof require==='function'?require('./review_focus_r207.js'):null);
if(!L||!F)throw Error('TLS_R209_REQUIRED_LOCKED_MODULE_MISSING');
const fail=code=>{throw Error('TLS_R209_'+code);};
function route(candidates,source,mode='risk_first'){
 if(!Array.isArray(candidates)||candidates.length>120)fail('CANDIDATES');
 if(!['risk_first','document','high_only'].includes(mode))fail('RISK_MODE');
 return L.route(candidates,source,mode);
}
function focus(visible,cursor=null,step=0){
 if(!Array.isArray(visible))fail('FOCUS_CANDIDATES');
 return F.focus(visible,{cursor,step});
}
function nextPending(visible,previousId){
 if(!Array.isArray(visible)||visible.length>120)fail('CANDIDATES');
 if(typeof previousId!=='string'||!/^c\d{5}$/.test(previousId))fail('PREVIOUS_ID');
 const seen=new Set();
 for(const c of visible){
  if(!c||typeof c.id!=='string'||!/^c\d{5}$/.test(c.id)||seen.has(c.id)||
     !['CONTEXT_REQUIRED','LIMITED','BLOCKED'].includes(c.resolution)||
     !['UNSELECTED','CONFIRM','KEEP_ORIGINAL'].includes(c.choice))fail('CANDIDATE_SHAPE');
  seen.add(c.id);
 }
 if(!visible.length)return null;
 const origin=visible.findIndex(c=>c.id===previousId);
 for(let step=1;step<=visible.length;step++){
  const index=origin<0?step-1:(origin+step)%visible.length;
  const c=visible[index];
  if(c.resolution==='CONTEXT_REQUIRED'&&c.choice==='UNSELECTED')return c.id;
 }
 return null;
}
function summary(snapshot,source){
 if(!snapshot||snapshot.schema!=='tls.wording-candidates.v1'||snapshot.state!=='READY'||
   !Array.isArray(snapshot.candidates)||snapshot.candidates.length>120)fail('SNAPSHOT_NOT_READY');
 const risk=L.summarize(snapshot.candidates,source);
 const work=F.progress(snapshot.candidates,snapshot.coverage);
 return Object.freeze({
  schema:'tls.r209.unified-review-summary.v1',
  risk_high:risk.high,risk_medium:risk.medium,risk_low:risk.low,
  risk_locked:risk.locked,confirmed_risk:risk.confirmed_risk,
  candidates_pending:work.pending,candidates_confirmed:work.confirmed,
  candidates_kept:work.kept,candidates_omitted:work.omitted,
  partial_coverage:!work.coverageComplete,
  full_document_certified:false,translation_quality_verified:false,
  external_adoption_verified:false,auto_apply:false,network_requested:false,
  contains_source_text:false,approval:'NONE',
 });
}
const API=Object.freeze({route,focus,nextPending,summary});
root.TLSIntegratedReviewR209=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
