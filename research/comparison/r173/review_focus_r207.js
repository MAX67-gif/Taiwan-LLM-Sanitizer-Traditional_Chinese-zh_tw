/* TLS R207: one-candidate-at-a-time focus and fail-closed visible progress.
 * This is a view-only navigation helper over immutable R204/R172 decisions.
 * No auto-approval, rewrites, source cache, network or persistence.
 */
(function(root){'use strict';
const M=root.TLSReviewWorkbenchR204||(typeof require==='function'?require('./review_workbench_r204.js'):null);
if(!M)throw Error('TLS_R207_R204_HELPER_MISSING');
const MAX_CANDIDATES=120;
const err=code=>{throw Error('TLS_R207_'+code);};
function ensureRows(candidates){
 if(!Array.isArray(candidates)||candidates.length>MAX_CANDIDATES)err('CANDIDATE_LIMIT');
 const ids=new Set();
 for(const row of candidates){
  if(!row||typeof row.id!=='string'||!/^c\d{5}$/.test(row.id)||ids.has(row.id)
    ||!Array.isArray(row.options)||typeof row.original_text!=='string'
    ||!['CONTEXT_REQUIRED','BLOCKED','LIMITED'].includes(row.resolution))
    err('CANDIDATE_SHAPE');
  ids.add(row.id);
 }
 return candidates;
}
function progress(candidates,coverage={}){
 ensureRows(candidates);
 if(coverage==null||typeof coverage!=='object'||Array.isArray(coverage))err('COVERAGE');
 const omitted=coverage.omitted_candidate_count??0;
 if(!Number.isSafeInteger(omitted)||omitted<0||omitted>1000000)err('COVERAGE');
 let pending=0,confirmed=0,kept=0,blocked=0;
 for(const c of candidates){
  if(c.resolution!=='CONTEXT_REQUIRED'){blocked++;continue;}
  if(c.choice==='CONFIRM')confirmed++;
  else if(c.choice==='KEEP_ORIGINAL')kept++;
  else if(c.choice==='UNSELECTED')pending++;
  else err('CHOICE_SHAPE');
 }
 const visibleComplete=pending===0;
 const coverageComplete=omitted===0;
 return Object.freeze({
  pending,confirmed,kept,blocked,omitted,listed:candidates.length,
  visibleComplete,coverageComplete,
  status:!coverageComplete?'PARTIAL_COVERAGE_NOT_FULLY_REVIEWED':
    !visibleComplete?'VISIBLE_DECISIONS_PENDING':'VISIBLE_ONLY_REVIEWED_NOT_CERTIFIED',
  auto_apply:false,human_quality_verified:false,full_document_approved:false,
 });
}
function visible(candidates,mode='all',query=''){
 ensureRows(candidates);
 return M.filterCandidates(candidates,mode,query);
}
function focus(candidates,{mode='all',query='',cursor=null,step=0}={}){
 const rows=visible(candidates,mode,query);
 if(!Number.isSafeInteger(step)||Math.abs(step)>1)err('NAVIGATION_STEP');
 if(cursor!==null&&(typeof cursor!=='string'||!/^c\d{5}$/.test(cursor)))err('CURSOR');
 if(!rows.length)return Object.freeze({id:null,index:0,total:0,wrap:false});
 let idx=rows.findIndex(x=>x.id===cursor);
 if(idx===-1){
  idx=rows.findIndex(x=>x.resolution==='CONTEXT_REQUIRED'&&x.choice==='UNSELECTED');
  if(idx<0)idx=0;
 }
 let wrap=false;
 if(step){
  const next=idx+step;
  wrap=next<0||next>=rows.length;
  idx=(next+rows.length)%rows.length;
 }
 return Object.freeze({id:rows[idx].id,index:idx+1,total:rows.length,wrap});
}
function nextPending(candidates,previousId,mode='all',query=''){
 const rows=visible(candidates,mode,query);
 if(typeof previousId!=='string'||!/^c\d{5}$/.test(previousId))err('PREVIOUS_ID');
 if(!rows.length)return null;
 const previous=rows.findIndex(c=>c.id===previousId);
 // A filter may remove the just-decided card. When it does, the first
 // undecided card after that ID must not be skipped.
 if(previous<0){
  return rows.find(c=>c.id>previousId&&c.resolution==='CONTEXT_REQUIRED'&&c.choice==='UNSELECTED')?.id
    ||rows.find(c=>c.resolution==='CONTEXT_REQUIRED'&&c.choice==='UNSELECTED')?.id||null;
 }
 for(let offset=1;offset<=rows.length;offset++){
  const row=rows[(previous+offset)%rows.length];
  if(row.resolution==='CONTEXT_REQUIRED'&&row.choice==='UNSELECTED')return row.id;
 }
 return null;
}
const API=Object.freeze({MAX_CANDIDATES,progress,focus,nextPending,visible});
root.TLSReviewFocusR207=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
