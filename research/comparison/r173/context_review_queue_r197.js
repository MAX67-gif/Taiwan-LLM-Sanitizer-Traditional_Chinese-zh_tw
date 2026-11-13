/* R197: provenance-safe human review queue derived ONLY from 52 synthetic
 * public R194 positive/negative/protected fixtures + R196 abstention states.
 * Does not infer new meaning, collect user text, store private material,
 * grant approval, auto-replace or contact any external service.
 */
'use strict';

const R194=require('./context_contrasts_r194.js');
const R196=require('./context_conflict_router_r196.js');

const STATES=Object.freeze([
  'PROTECTED_KEEP','CONFLICT_KEEP','COUNTEREXAMPLE_BLOCK',
  'UNKNOWN_KEEP','PREFERRED_SUGGESTION',
]);
const PRIORITY=Object.freeze({
  PROTECTED_KEEP:'P0_REVIEW_STRUCTURE',
  CONFLICT_KEEP:'P0_REVIEW_CONFLICT',
  COUNTEREXAMPLE_BLOCK:'P1_REVIEW_WRONG_DOMAIN',
  UNKNOWN_KEEP:'P1_REVIEW_UNSEEN_CONTEXT',
  PREFERRED_SUGGESTION:'P2_REVIEW_WORDED_OPTION',
});
const SCHEMA='tls.r197.synthetic-human-review-queue.v1';
const FIXTURE_VERSION='R194_52_ORIGINAL_POSITIVE_NEGATIVE_CODE';
function fail(code){throw new Error('R197_'+code);}
function scenarioSamples(entry){
 const positive=entry.positive.text;
 const negative=entry.counterexample.text;
 const protectedCode=entry.protected_example;
 const unknown='R197：未知情境，不可根據術語自動替換 '+entry.term+'。';
 return [
  ['protected_example',[protectedCode,positive]],
  ['positive_negative_conflict',[positive,negative]],
  ['negative_counterexample',[negative]],
  ['unseen_context',[positive,unknown]],
  ['positive_suggestion_only',[positive]],
 ];
}
function createReviewQueue(corpus=R194.load()){
 R194.validate(corpus);
 if(!Array.isArray(corpus.cases)||corpus.cases.length!==52)fail('EXACT_52_CASES_REQUIRED');
 const items=[];
 const stateCount=Object.fromEntries(STATES.map(x=>[x,0]));
 const seen=new Set();
 for(const row of corpus.cases){
  if(seen.has(row.id))fail('DUPLICATE_CASE_ID');
  seen.add(row.id);
  for(const [scenario,samples] of scenarioSamples(row)){
   const decision=R196.routeContrastGroup(
     samples.map(text=>({id:row.id,text})),corpus);
   if(!STATES.includes(decision.state)||decision.auto_apply!==false||
      decision.human_quality_verified!==false)fail('ROUTER_AUTHORITY_CHANGED');
   stateCount[decision.state]++;
   items.push(Object.freeze({
     review_id:row.id+'__'+scenario,
     case_id:row.id,
     fixture_kind:scenario,
     route:decision.state,
     risk_priority:PRIORITY[decision.state],
     suggested_action:'HUMAN_REVIEW_OR_KEEP',
     human_review_status:'NOT_COLLECTED',
     safe_to_auto_apply:false,
     original_text_in_queue:false,
     evidence_scope:'SYNTHETIC_EXACT_FIXTURE_ONLY',
     protected_observations:decision.counts.protected,
     positive_observations:decision.counts.positive,
     negative_observations:decision.counts.negative,
     unknown_observations:decision.counts.unknown,
   }));
  }
 }
 if(items.length!==260||
    STATES.some(s=>stateCount[s]!==52))fail('FIVE_STATES_BY_52_UNEXPECTED');
 const priorities={
  P0_REVIEW_STRUCTURE:52,P0_REVIEW_CONFLICT:52,
  P1_REVIEW_WRONG_DOMAIN:52,P1_REVIEW_UNSEEN_CONTEXT:52,
  P2_REVIEW_WORDED_OPTION:52,
 };
 const summary=Object.freeze({
  schema:SCHEMA,
  status:'SYNTHETIC_RESEARCH_QUEUE_ONLY',
  source_dataset:FIXTURE_VERSION,
  source_repository_path:'research/comparison/r173/context_contrasts_r194.json',
  route_research_path:'research/comparison/r173/context_conflict_router_r196.js',
  case_count:52,
  review_item_count:260,
  priority_count:Object.freeze(priorities),
  state_count:Object.freeze(stateCount),
  human_review_done:0,
  human_quality_verified:false,
  full_language_accuracy_verified:false,
  user_adoption_measured:false,
  automatic_rewrite_enabled:false,
  release_permission:'NONE',
  originals_stored:false,
  private_user_text_in_queue:false,
  source_bytes_in_queue:false,
  external_requests:0,
 });
 return Object.freeze({summary,items:Object.freeze(items)});
}
function validateQueue(output){
 const expected=createReviewQueue();
 if(!output||!output.summary||!Array.isArray(output.items)||
    JSON.stringify(output)!==JSON.stringify(expected))
  fail('QUEUE_CONTENT_MODIFIED_OR_PROMOTED');
 return true;
}
if(require.main===module){
 if(process.argv.length!==3||process.argv[2]!=='--check')fail('CHECK_ONLY');
 const data=createReviewQueue();
 validateQueue(data);
 console.log(JSON.stringify({schema:data.summary.schema,
  status:data.summary.status,
  review_items:data.summary.review_item_count,
  reasons:Object.keys(data.summary.state_count).length,
  users_reviewed:0,auto_apply:false,network_requested:false,
  promotion_permission:'NONE',text_in_report:false},null,2));
}
module.exports=Object.freeze({createReviewQueue,validateQueue,STATES,PRIORITY});
