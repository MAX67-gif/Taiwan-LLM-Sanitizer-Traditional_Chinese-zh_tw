/* R200: domain-diverse, risk-first batches over R197's ORIGINAL 260 synthetic
 * review IDs. Research scheduling metadata only. Never approve, rewrite,
 * translate, persist user text or infer meaning of unseen sentences.
 */
'use strict';

const R194=require('./context_contrasts_r194.js');
const R197=require('./context_review_queue_r197.js');
const SCHEMA='tls.r200.synthetic-domain-diverse-review-plan.v1';
const ORDER=Object.freeze([
  'P0_REVIEW_STRUCTURE','P0_REVIEW_CONFLICT',
  'P1_REVIEW_WRONG_DOMAIN','P1_REVIEW_UNSEEN_CONTEXT',
  'P2_REVIEW_WORDED_OPTION',
]);
const MAX_ITEMS=260;
function fail(code){throw new Error('R200_'+code);}
function validateBatchSize(n){
  if(!Number.isSafeInteger(n)||n<5||n>52||MAX_ITEMS%n!==0)
    fail('INVALID_BATCH_SIZE');
}
function weaveDomains(rows){
  const buckets=new Map();
  for(const item of rows){
    if(!buckets.has(item.domain))buckets.set(item.domain,[]);
    buckets.get(item.domain).push(item);
  }
  for(const rows of buckets.values())
    rows.sort((a,b)=>a.case_id.localeCompare(b.case_id,'en'));
  const domains=Array.from(buckets.keys()).sort((a,b)=>a.localeCompare(b,'en'));
  const result=[];
  while(result.length<rows.length){
    let progressed=false;
    for(const domain of domains){
      const queue=buckets.get(domain);
      if(queue.length){
        result.push(queue.shift());
        progressed=true;
      }
    }
    if(!progressed)fail('DOMAIN_WEAVE_STALLED');
  }
  return result;
}
function createReviewPlan(batchSize=20){
  validateBatchSize(batchSize);
  const corpus=R194.load();
  R194.validate(corpus);
  const queue=R197.createReviewQueue(corpus);
  R197.validateQueue(queue);
  const domains=new Map(corpus.cases.map(row=>[row.id,row.domain]));
  if(domains.size!==52||queue.items.length!==MAX_ITEMS)
    fail('SOURCE_COUNT_CHANGED');
  const rows=queue.items.map(x=>{
    const domain=domains.get(x.case_id);
    if(typeof domain!=='string'||!/^[a-z][a-z0-9_]{0,40}$/.test(domain))
      fail('UNKNOWN_OR_UNSAFE_DOMAIN');
    return {review_id:x.review_id,case_id:x.case_id,domain,
            route:x.route,risk_priority:x.risk_priority};
  });
  const sorted=[];
  for(const priority of ORDER){
    const selected=rows.filter(x=>x.risk_priority===priority);
    if(selected.length!==52)fail('ORIGINAL_PRIORITY_DISTRIBUTION_CHANGED');
    sorted.push(...weaveDomains(selected));
  }
  if(sorted.length!==MAX_ITEMS||
     new Set(sorted.map(x=>x.review_id)).size!==MAX_ITEMS)
    fail('DUPLICATE_OR_MISSING_REVIEW');
  const items=sorted.map((x,i)=>Object.freeze({
    ...x,sequence:i+1,batch_number:Math.floor(i/batchSize)+1,
    human_review_status:'NOT_COLLECTED',auto_apply:false,
    release_permission:'NONE',
  }));
  const uniqueDomains=new Set(items.map(x=>x.domain)).size;
  const summary=Object.freeze({
    schema:SCHEMA,status:'SYNTHETIC_METADATA_PLANNING_ONLY',
    source:'R194_52_CASES_R196_R197_FIXED_ORIGINALS',
    case_count:52,review_item_count:MAX_ITEMS,domain_count:uniqueDomains,
    batch_size:batchSize,batch_count:MAX_ITEMS/batchSize,
    priorities:Object.freeze(Object.fromEntries(
      ORDER.map(p=>[p,52]))),
    real_reviewers:0,human_reviews_completed:0,
    automatic_rewrite_enabled:false,source_text_in_report:false,
    release_permission:'NONE',human_quality_verified:false,
    adoption_measured:false,network_requested:false,
    fairness_claim:'DIVERSITY_OF_EXISTING_SYNTHETIC_DOMAINS_ONLY',
  });
  return Object.freeze({summary,items:Object.freeze(items)});
}
function validatePlan(value){
  if(!value||!value.summary||!Array.isArray(value.items))
    fail('INVALID_PLAN');
  const expected=createReviewPlan(value.summary.batch_size);
  if(JSON.stringify(value)!==JSON.stringify(expected))
    fail('MODIFIED_OR_PROMOTED_PLAN');
  return true;
}
if(require.main===module){
  if(process.argv.length!==3||process.argv[2]!=='--check')fail('CHECK_ONLY');
  const report=createReviewPlan();
  validatePlan(report);
  console.log(JSON.stringify({
    schema:report.summary.schema,status:report.summary.status,
    review_items:260,domains:report.summary.domain_count,
    batches:report.summary.batch_count,
    human_reviews_completed:0,source_text_in_report:false,
    release_permission:'NONE',human_quality_verified:false,
  },null,2));
}
module.exports=Object.freeze({createReviewPlan,validatePlan,ORDER,weaveDomains});
