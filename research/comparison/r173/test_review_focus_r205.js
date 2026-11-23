'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('./review_focus_r205.js'),R204=require('./build_review_workbench_r204.js'),
 R205=require('./build_review_focus_r205.js');
const W=require('../../../src/core/wording_assistant_r172.js');

const ids=Array.from({length:4},(_,i)=>'c'+String(i+1).padStart(5,'0'));
const sample=[
 {id:ids[0],original_text:'menu',resolution:'CONTEXT_REQUIRED',choice:'UNSELECTED',
  options:[{id:'o1',replacement:'選單',context_label:'介面'}]},
 {id:ids[1],original_text:'menu',resolution:'CONTEXT_REQUIRED',choice:'CONFIRM',
  options:[{id:'o2',replacement:'菜單',context_label:'餐飲'}]},
 {id:ids[2],original_text:'軟件',resolution:'CONTEXT_REQUIRED',choice:'KEEP_ORIGINAL',
  options:[{id:'o3',replacement:'軟體',context_label:'軟體'}]},
 {id:ids[3],original_text:'{{menu}}',resolution:'BLOCKED',choice:'UNSELECTED',
  options:[]},
];
test('R205 initial focus goes to undecided and supports explicit previous/next wrapping',()=>{
 assert.deepEqual(F.focus(sample),{id:ids[0],index:1,total:4,wrap:false});
 assert.deepEqual(F.focus(sample,{cursor:ids[0],step:1}),{id:ids[1],index:2,total:4,wrap:false});
 assert.deepEqual(F.focus(sample,{cursor:ids[0],step:-1}),{id:ids[3],index:4,total:4,wrap:true});
 assert.deepEqual(F.focus(sample,{cursor:ids[3],step:1}),{id:ids[0],index:1,total:4,wrap:true});
 const z=F.focus(sample,{mode:'blocked'});assert.equal(z.id,ids[3]);
 assert.equal(F.focus(sample,{mode:'all',query:'不存在'}).id,null);
});
test('R205 focus is a view filter only, no original R204 choices changed',()=>{
 const before=JSON.stringify(sample),z=F.focus(sample,{query:'menu'});
 assert.equal(z.total,3);assert.equal(z.id,ids[0]);
 assert.equal(JSON.stringify(sample),before);
 assert.equal(F.nextPending(sample,ids[1]),ids[0]);
 assert.equal(F.nextPending(sample,ids[0]),ids[0]);
 assert.equal(F.nextPending(sample,ids[0],'kept'),null);
});
test('R205 unselected-only filter does not skip next first visible decision after previous disappears',()=>{
 const source=structuredClone(sample);
 source[0].choice='CONFIRM';
 source[1].choice='UNSELECTED';
 source[2].choice='UNSELECTED';
 const first=F.nextPending(source,ids[0],'unselected');
 assert.equal(first,ids[1],'must pick c00002, not skip to c00003');
 const afterLast=F.nextPending(source,ids[3],'unselected');
 assert.equal(afterLast,ids[1],'wrap to earliest undecided');
 const only=structuredClone(source);only[1].choice='KEEP_ORIGINAL';only[2].choice='KEEP_ORIGINAL';
 assert.equal(F.nextPending(only,ids[0],'unselected'),null);
});

test('R205 partial-coverage report is never document quality certification',()=>{
 const s=F.progress(sample,{omitted_candidate_count:20});
 assert.deepEqual([s.pending,s.confirmed,s.kept,s.blocked,s.omitted],[1,1,1,1,20]);
 assert.equal(s.status,'PARTIAL_COVERAGE_NOT_FULLY_REVIEWED');
 assert.equal(s.full_document_approved,false);
 assert.equal(s.auto_apply,false);
 assert.equal(s.human_quality_verified,false);
 assert.equal(Object.isFrozen(s),true);
 const decided=structuredClone(sample);decided[0].choice='CONFIRM';
 const a=F.progress(decided,{omitted_candidate_count:0});
 assert.equal(a.status,'VISIBLE_ONLY_REVIEWED_NOT_CERTIFIED');
 assert.equal(a.full_document_approved,false);
 assert.equal(F.progress(sample,{omitted_candidate_count:0}).status,'VISIBLE_DECISIONS_PENDING');
});
test('R205 rejects malformed candidate shape, count, duplicate IDs, unknown filter and unsafe step',()=>{
 for(const items of [
  null,{},Array(121).fill(sample[0]),[sample[0],sample[0]],
  [{...sample[0],id:'bad'}],[{...sample[0],resolution:'GRANTED'}],
  [{...sample[0],options:null}],
 ]){
  assert.throws(()=>F.focus(items),/TLS_R205_/);
 }
 for(const inp of [
  ()=>F.focus(sample,{step:2}),
  ()=>F.focus(sample,{cursor:'notid'}),
  ()=>F.focus(sample,{mode:'auto'}),
  ()=>F.focus(sample,{query:'x'.repeat(201)}),
  ()=>F.progress(sample,{omitted_candidate_count:-1}),
  ()=>F.progress(sample,{omitted_candidate_count:1.2}),
  ()=>F.nextPending(sample,'invalid'),
 ]){
  assert.throws(inp,/TLS_R205_|TLS_R204_/);
 }
});
test('R205 actual R172 safe candidate snapshot remains manual and unchanged',async()=>{
 const s=W.createWordingSession({source:'# 原創測試\n設定 menu。午餐 menu。軟件。'});
 const snapshot=await s.inspect();
 assert.equal(snapshot.state,'READY');
 const first=F.focus(snapshot.candidates);
 assert(first.total>=2&&first.id);
 const state=F.progress(snapshot.candidates,snapshot.coverage);
 assert.equal(state.full_document_approved,false);
 assert.equal(state.auto_apply,false);
 assert.equal(state.human_quality_verified,false);
 assert.equal(snapshot.candidates.some(c=>c.choice==='CONFIRM'),false);
 s.revoke();
});
test('R205 derived HTML retains byte-independent R204 and offline CSP',()=>{
 const old=R204.build(),next=R205.build();
 assert.notEqual(R204.hash(old),R205.sha(next));
 assert(next.includes('<title>Taiwan-LLM-Sanitizer｜專注逐筆審稿 R205 Offline Preview</title>'));
 for(const item of ['id="focusToggle"','id="focusPrev"','id="focusNext"','id="focusPosition"',
  "connect-src 'none'","default-src 'none'",'TLSReviewWorkbenchR204','TLSReviewFocusR205']){
  assert(next.includes(item),item);
 }
 assert(old.includes('id="undoReview"'));assert(next.includes('id="undoReview"'));
 assert(next.includes("TLSReviewContinuityR203"));
 assert(!next.includes('https://cdn.'));
 assert(!next.includes('localStorage.'));
 assert(!old.includes('id="focusToggle"'));
});
test('R205 source contains only explicit user display controls, no automodification or exfil',()=>{
 const fs=require('node:fs'),path=require('node:path');
 for(const file of ['review_focus_r205.js','review_focus_ui_r205.js']){
  const text=fs.readFileSync(path.join(__dirname,file),'utf8');
  for(const pattern of ['fetch(', 'XMLHttpRequest','sendBeacon(', 'WebSocket(', 'localStorage.']){
   assert(!text.includes(pattern),file+':'+pattern);
  }
 }
});
