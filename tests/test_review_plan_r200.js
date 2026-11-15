'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const R194=require('../research/comparison/r173/context_contrasts_r194.js');
const R197=require('../research/comparison/r173/context_review_queue_r197.js');
const R200=require('../research/comparison/r173/context_review_plan_r200.js');

test('R200 schedules exactly 260 existing synthetic review items, with no new cases',()=>{
 const data=R200.createReviewPlan();
 assert.equal(data.summary.case_count,52);
 assert.equal(data.summary.review_item_count,260);
 assert.equal(data.items.length,260);
 assert.equal(data.summary.batch_size,20);
 assert.equal(data.summary.batch_count,13);
 assert.equal(data.summary.real_reviewers,0);
 assert.equal(data.summary.human_reviews_completed,0);
 assert.equal(data.summary.release_permission,'NONE');
 assert.equal(data.summary.human_quality_verified,false);
 assert(R200.validatePlan(data));
});

test('R200 never drops or invents review IDs and preserves routes',()=>{
 const original=R197.createReviewQueue().items;
 const planned=R200.createReviewPlan().items;
 const before=new Map(original.map(x=>[x.review_id,x]));
 assert.equal(before.size,260);
 for(const x of planned){
  const source=before.get(x.review_id);
  assert(source,x.review_id);
  assert.equal(x.route,source.route);
  assert.equal(x.risk_priority,source.risk_priority);
  assert.equal(x.case_id,source.case_id);
  assert.equal(x.auto_apply,false);
  assert.equal(x.release_permission,'NONE');
  before.delete(x.review_id);
 }
 assert.equal(before.size,0);
});

test('R200 priority order is irreversible and all five bands retain exactly 52',()=>{
 const data=R200.createReviewPlan().items;
 const expected=R200.ORDER;
 assert.deepEqual(Array.from({length:5},(_,j)=>data[j*52].risk_priority),expected);
 for(let j=0;j<5;j++){
  const slice=data.slice(j*52,(j+1)*52);
  assert.equal(slice.length,52);
  assert(slice.every(x=>x.risk_priority===expected[j]));
 }
});

test('R200 distributes P0 by distinct domains before saturating software UI',()=>{
 const corpus=R194.load(),report=R200.createReviewPlan();
 const domains=new Set(corpus.cases.map(x=>x.domain));
 assert.equal(report.summary.domain_count,domains.size);
 assert(domains.size>=20);
 const first20=report.items.slice(0,20);
 assert.equal(new Set(first20.map(x=>x.domain)).size,20);
 assert.equal(first20.filter(x=>x.domain==='software_ui').length<=1,true);
});

test('R200 deterministic batching, edge position and alternate valid size',()=>{
 for(const n of [5,10,20,26,52]){
  const a=R200.createReviewPlan(n),b=R200.createReviewPlan(n);
  assert.deepEqual(a,b);
  assert.equal(a.summary.batch_count,260/n);
  assert.equal(a.items[0].batch_number,1);
  assert.equal(a.items[n].batch_number,2);
  assert.equal(a.items.at(-1).batch_number,260/n);
  assert(R200.validatePlan(a));
 }
});

test('R200 rejects unbounded, fractional and fake batch sizes',()=>{
 for(const n of [null,undefined,0,1,3,12,17,53,100,Infinity,5.5,'20',NaN]){
  if(n===undefined)continue; // omitted argument intentionally uses safe default
  assert.throws(()=>R200.createReviewPlan(n),/R200_INVALID_BATCH_SIZE/);
 }
});

test('R200 does not leak synthetic sentences, terms, user text or source bytes',()=>{
 const report=R200.createReviewPlan();
 const raw=JSON.stringify(report),corpus=R194.load();
 for(const row of corpus.cases){
  assert(!raw.includes(row.positive.text),row.id);
  assert(!raw.includes(row.counterexample.text),row.id);
  assert(!raw.includes(row.protected_example),row.id);
 }
 for(const item of report.items){
  assert(!('text' in item));
  assert(!('term' in item));
  assert(!('source' in item));
  assert(!('prompt' in item));
  assert.equal(item.human_review_status,'NOT_COLLECTED');
 }
 assert.equal(report.summary.source_text_in_report,false);
 assert.equal(report.summary.network_requested,false);
 assert.equal(report.summary.adoption_measured,false);
});

test('R200 forbids forged human reviews, changed priorities, extra text or approval',()=>{
 const input=R200.createReviewPlan();
 for(const mutate of [
  x=>{x.items[0].human_review_status='APPROVED';},
  x=>{x.items[0].release_permission='YES';},
  x=>{x.items[0].source_text='PRIVATE';},
  x=>{x.items[0].risk_priority='P2_REVIEW_WORDED_OPTION';},
  x=>{x.items.pop();},
  x=>{x.summary.human_reviews_completed=1;},
  x=>{x.summary.human_quality_verified=true;},
 ]){
  const bad=structuredClone(input);
  mutate(bad);
  assert.throws(()=>R200.validatePlan(bad),/R200_/);
 }
});

test('R200 is offline, metadata only and never modifies existing product runtime',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../research/comparison/r173/context_review_plan_r200.js'),'utf8');
 for(const unsafe of ['fetch(', 'XMLHttpRequest(', 'sendBeacon(', 'writeFileSync(', 'gh release create','AUTO_APPROVE', 'chrome.cookies']){
  assert(!code.includes(unsafe),unsafe);
 }
});
