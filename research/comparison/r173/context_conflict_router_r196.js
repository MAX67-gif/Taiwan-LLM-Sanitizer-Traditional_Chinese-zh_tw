/* R196: fail-closed exact-fixture conflict/abstention lab, NOT a language model.
 * No substitutions, no user data persistence, no egress or runtime integration.
 * R194 original corpus stays source of truth; classification only on exact
 * synthetic samples. All unseen sentences abstain (UNKNOWN_KEEP).
 */
'use strict';

const R194=require('./context_contrasts_r194.js');
const STATES=Object.freeze({
 PROTECTED_KEEP:'PROTECTED_KEEP',
 CONFLICT_KEEP:'CONFLICT_KEEP',
 COUNTEREXAMPLE_BLOCK:'COUNTEREXAMPLE_BLOCK',
 UNKNOWN_KEEP:'UNKNOWN_KEEP',
 PREFERRED_SUGGESTION:'PREFERRED_SUGGESTION',
});
const MAX_OBSERVATIONS=12;
const SCHEMA='tls.r196.context-conflict-shadow.v1';

function fail(code){throw new Error('R196_'+code);}
function validateText(text){
 if(typeof text!=='string'||text.length>320||Buffer.byteLength(text,'utf8')>768||
    /[\u0000-\u0008\u000e-\u001f]/u.test(text))fail('TEXT_REJECTED');
 for(let i=0;i<text.length;i++){
  const code=text.charCodeAt(i);
  if(code>=0xd800&&code<=0xdbff){
   if(i+1>=text.length||text.charCodeAt(++i)<0xdc00||text.charCodeAt(i)>0xdfff)
    fail('UNPAIRED_SURROGATE');
  }else if(code>=0xdc00&&code<=0xdfff)fail('UNPAIRED_SURROGATE');
 }
}
function routeContrastGroup(observations,corpus=R194.load()){
 if(!Array.isArray(observations)||!observations.length||
    observations.length>MAX_OBSERVATIONS)fail('OBSERVATIONS_LENGTH');
 R194.validate(corpus); // recheck provenance + rights boundary every call
 const lookup=new Map(corpus.cases.map(row=>[row.id,row]));
 const seen=new Set(),scores={positive:0,negative:0,protected:0,unknown:0};
 let caseId=null;
 for(const observation of observations){
  if(!observation||Object.getPrototypeOf(observation)!==Object.prototype||
     Object.keys(observation).length!==2||
     !Object.hasOwn(observation,'id')||!Object.hasOwn(observation,'text'))
   fail('INVALID_OBSERVATION_SHAPE');
  if(typeof observation.id!=='string'||!lookup.has(observation.id))
   fail('UNKNOWN_ID');
  if(caseId===null)caseId=observation.id;
  if(caseId!==observation.id)fail('MIXED_TERMS_NOT_COMPARABLE');
  const {text}=observation;
  validateText(text);
  const signature=JSON.stringify([observation.id,text]);
  if(seen.has(signature))fail('DUPLICATE_OBSERVATION');
  seen.add(signature);
  const item=lookup.get(observation.id);
  // Exact protected-code fixture wins regardless of caller-supplied hints.
  // No caller is allowed to mark their own string as certified "positive".
  if(text===item.protected_example){scores.protected++;continue;}
  const action=R194.routeExactSynthetic(item,text);
  if(action.state===R194.STATES.PREFERRED_SUGGESTION)scores.positive++;
  else if(action.state===R194.STATES.COUNTEREXAMPLE_BLOCK)scores.negative++;
  else if(action.state===R194.STATES.UNKNOWN_KEEP)scores.unknown++;
  else fail('UPSTREAM_UNEXPECTED_ACTION');
 }
 const state=scores.protected>0?STATES.PROTECTED_KEEP:
     scores.positive>0&&scores.negative>0?STATES.CONFLICT_KEEP:
     scores.negative>0?STATES.COUNTEREXAMPLE_BLOCK:
     scores.unknown>0?STATES.UNKNOWN_KEEP:
     scores.positive>0?STATES.PREFERRED_SUGGESTION:STATES.UNKNOWN_KEEP;
 return Object.freeze({
  schema:SCHEMA,case_id:caseId,state,
  observation_count:observations.length,
  counts:Object.freeze({...scores}),
  auto_apply:false,source_text_in_result:false,network_requested:false,
  promotion_permission:'NONE',human_quality_verified:false,
  scope:'EXACT_ORIGINAL_SYNTHETIC_FIXTURES_ONLY',
 });
}
if(require.main===module){
 if(process.argv.length!==3||process.argv[2]!=='--check')fail('CHECK_ONLY');
 const corpus=R194.load(),samples=corpus.cases.map(row=>
  routeContrastGroup([{id:row.id,text:row.positive.text},
                      {id:row.id,text:row.counterexample.text}],corpus));
 if(samples.length!==52||samples.some(s=>s.state!==STATES.CONFLICT_KEEP))
  fail('BASELINE_52_CONTRADICTIONS_NOT_BLOCKED');
 console.log(JSON.stringify({
  schema:'tls.r196.context-conflict-validation.v1',
  result:'52_ORIGINAL_SYNTHETIC_CONTRADICTIONS_BLOCKED',
  original_pairs:52,auto_apply:false,
  human_quality_verified:false,promotion_permission:'NONE',
  source_text_in_result:false,network_requested:false,
 },null,2));
}
module.exports=Object.freeze({routeContrastGroup,STATES,MAX_OBSERVATIONS});
