'use strict';
/* R208 first-task TDD: source-independent progress and local voluntary receipt */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const Flow=require('./first_task_r208.js');
const Build=require('./build_first_task_r208.js');
const R207=require('./build_review_focus_r207.js');
const base={source_loaded:false,analysis_ready:false,reviewable_count:0,decision_count:0,
 omitted_count:0,preview_ready:false,export_action_triggered:false};
const of=x=>Flow.evaluate({...base,...x});

test('R208 five explicit first-task stages never grant document/translation approval',()=>{
 const cases=[
  [{},'NEED_INPUT',0],
  [{source_loaded:true},'NEED_ANALYSIS',1],
  [{source_loaded:true,analysis_ready:true,reviewable_count:3},'NEED_REVIEW',2],
  [{source_loaded:true,analysis_ready:true,reviewable_count:3,decision_count:1},'NEED_PREVIEW',3],
  [{source_loaded:true,analysis_ready:true,reviewable_count:3,decision_count:1,preview_ready:true},'NEED_EXPORT',4],
  [{source_loaded:true,analysis_ready:true,reviewable_count:3,decision_count:1,preview_ready:true,export_action_triggered:true},'LOCAL_EXPORT_ACTION_TRIGGERED',5],
 ];
 for(const [input,stage,complete] of cases){
  const r=of(input);assert.equal(r.stage,stage);assert.equal(r.completed_steps,complete);
  assert.equal(r.total_steps,5);assert.equal(r.full_document_certified,false);
  assert.equal(r.auto_apply,false);assert.equal(r.network_requested,false);
  assert(Object.isFrozen(r));
 }
});
test('R208 incomplete coverage and no-reviewable candidate never become quality certification',()=>{
 const partial=of({source_loaded:true,analysis_ready:true,reviewable_count:120,decision_count:120,
  omitted_count:12,preview_ready:true,export_action_triggered:true});
 assert.equal(partial.stage,'LOCAL_EXPORT_ACTION_TRIGGERED');
 assert.equal(partial.partial_coverage,true);assert.equal(partial.omitted_count,12);
 assert.equal(partial.full_document_certified,false);
 const empty=of({source_loaded:true,analysis_ready:true});
 assert.equal(empty.stage,'NO_REVIEWABLE_CANDIDATES');
 assert.equal(empty.completed_steps,2);assert.equal(empty.full_document_certified,false);
});
test('R208 inconsistent states and invented fields fail closed',()=>{
 for(const a of [
  {analysis_ready:true},
  {decision_count:1},
  {source_loaded:true,reviewable_count:1},
  {source_loaded:true,analysis_ready:true,reviewable_count:1,decision_count:2},
  {source_loaded:true,analysis_ready:true,reviewable_count:121},
  {source_loaded:true,analysis_ready:true,reviewable_count:1,preview_ready:true},
  {source_loaded:true,analysis_ready:true,reviewable_count:1,decision_count:1,export_action_triggered:true},
  {source_loaded:true,analysis_ready:true,reviewable_count:1,decision_count:1,preview_ready:true,omitted_count:-1},
  {source_loaded:true,original_text:'原稿'},
  {source_loaded:'true'},
 ]){
  assert.throws(()=>of(a),/TLS_R208_/);
 }
});
test('R208 feedback requires deliberate download consent; finished must have clicked export',()=>{
 const started=of({source_loaded:true,analysis_ready:true,reviewable_count:1});
 const done=of({source_loaded:true,analysis_ready:true,reviewable_count:1,
  decision_count:1,preview_ready:true,export_action_triggered:true});
 assert.throws(()=>Flow.makeFeedback({flow:done,consent:false,clarity:'EASY',outcome:'FINISHED'}),/CONSENT/);
 assert.throws(()=>Flow.makeFeedback({flow:started,consent:true,clarity:'EASY',outcome:'FINISHED'}),/FINISH/);
 const actual=Flow.makeFeedback({flow:done,consent:true,clarity:'SOME_DIFFICULTY',outcome:'FINISHED'});
 assert.equal(actual.schema,'tls.r208.local-voluntary-feedback.v1');
 assert.equal(actual.status,'LOCAL_USER_SELECTED_FEEDBACK_NOT_VERIFIED');
 assert.equal(actual.sharing_authorized,false);assert.equal(actual.network_requested,false);
 assert.equal(actual.contains_source_text,false);assert.equal(actual.contains_source_digest,false);
 assert.equal(actual.real_human_identity_verified,false);assert.equal(actual.translation_quality_verified,false);
 assert.equal(actual.stage,'LOCAL_EXPORT_ACTION_TRIGGERED');assert.equal(actual.outcome,'FINISHED');
 assert(Object.isFrozen(actual));
});
test('R208 all voluntary feedback stays source-free and enums-only',()=>{
 const src='# 使用者機密原稿\n某專案內部金鑰 XYZ';
 const result=Flow.makeFeedback({flow:of({source_loaded:true,analysis_ready:true,reviewable_count:2,
   decision_count:1}),consent:true,clarity:'NOT_CLEAR',outcome:'NOT_FINISHED'});
 const json=JSON.stringify(result);
 for(const raw of [src,'原稿','c00001','source_sha256','email','ip_address','Codex for Open Source'])
  assert.equal(json.includes(raw),false,'unsafe result contains '+raw);
 assert.equal(result.outcome,'NOT_FINISHED');
 for(const code of ['UNKNOWN','',true,undefined]){
  assert.throws(()=>Flow.makeFeedback({flow:result,consent:true,clarity:code,outcome:'FINISHED'}),/TLS_R208_/);
 }
});
test('R208 zero network by construction and no implicit local persistence',()=>{
 for(const filename of ['first_task_r208.js','first_task_ui_r208.js']){
  const s=fs.readFileSync(path.join(__dirname,filename),'utf8');
  for(const name of ['fetch(', 'XMLHttpRequest','sendBeacon(', 'WebSocket(', 'localStorage.', 'sessionStorage.', 'IndexedDB'])
   assert(!s.includes(name),filename+':'+name);
 }
});
test('R208 derived HTML is reproducible, retains R207 focus, R204 undo and CSP',()=>{
 const html=Build.build();const old=R207.build();
 assert.equal(fs.readFileSync(Build.TARGET,'utf8'),html);
 assert.notEqual(html,old);
 for(const mark of ['id="firstTaskR208"','id="r208Start"','id="r208Next"',
  'id="r208FeedbackConsent"','id="r208FeedbackDownload"','id="focusToggle"',
  'id="undoReview"','id="previewBtn"',"connect-src 'none'","default-src 'none'",'TLSFirstTaskR208'])
  assert(html.includes(mark),mark);
 assert(!old.includes('id="firstTaskR208"'));
 assert(!html.includes('__TLS_R208_'));
});
