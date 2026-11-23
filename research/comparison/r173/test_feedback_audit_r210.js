'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R208=require('./first_task_r208.js');
const R210=require('./feedback_audit_r210.js');
const BASE={source_loaded:false,analysis_ready:false,reviewable_count:0,decision_count:0,
 omitted_count:0,preview_ready:false,export_action_triggered:false};
const make=(changes={},clarity='EASY',outcome='NOT_SURE')=>R208.makeFeedback({
 flow:R208.evaluate({...BASE,...changes}),consent:true,clarity,outcome
});
const SAMPLE=make({source_loaded:true,analysis_ready:true,reviewable_count:3,
 decision_count:2,preview_ready:true,export_action_triggered:true},'EASY','FINISHED');
const pending=make({source_loaded:true,analysis_ready:true,reviewable_count:4},'SOME_DIFFICULTY','NOT_FINISHED');

test('R210 accepts exact R208 consented self-reported feedback only',()=>{
 const value=R210.parseFeedback(JSON.stringify(SAMPLE));
 assert.deepEqual(value,SAMPLE);assert(Object.isFrozen(value));
 assert.equal(value.sharing_authorized,false);
 assert.equal(value.real_human_identity_verified,false);
 assert.equal(value.translation_quality_verified,false);
});
test('R210 derives the original R208 stage; rejects impossible outcomes',()=>{
 for(const change of [
  x=>x.stage='NEED_EXPORT',x=>x.completed_steps=4,
  x=>x.export_action_triggered=false,x=>x.partial_coverage=true,
  x=>x.outcome='MAYBE',x=>x.reviewable_count=1,
  x=>x.decision_count=4,
 ]){
  const candidate=structuredClone(SAMPLE);change(candidate);
  assert.throws(()=>R210.validateFeedback(candidate),/TLS_R210_/);
 }
 const fake=structuredClone(pending);fake.outcome='FINISHED';
 assert.throws(()=>R210.validateFeedback(fake),/TLS_R210_/);
});
test('R210 rejects forged publication, quality, identity and sensitive fields',()=>{
 for(const update of [
  x=>x.sharing_authorized=true,x=>x.real_human_identity_verified=true,
  x=>x.external_adoption_verified=true,x=>x.translation_quality_verified=true,
  x=>x.approval='APPROVED',x=>x.contains_source_text=true,
  x=>x.contains_source_digest=true,x=>x.auto_apply=true,
  x=>x.network_requested=true,x=>x.local_download_consent=false,
  x=>x.private_text='隱私資料',x=>x.email='a@example.com',
 ]){
  const candidate=structuredClone(SAMPLE);update(candidate);
  assert.throws(()=>R210.validateFeedback(candidate),/TLS_R210_/);
 }
});
test('R210 strict JSON rejects duplicate keys and escaped aliases',()=>{
 const s=JSON.stringify(SAMPLE);
 for(const raw of [
  s.replace('"approval":"NONE"','"approval":"APPROVED","approval":"NONE"'),
  s.replace('"approval":"NONE"','"approval":"NONE","approv\\u0061l":"NONE"'),
  s.replace('"clarity":"EASY"','"clarity":"EASY","clarity":"NOT_CLEAR"'),
  s.replace('"status":','"__proto__":{"admin":true},"status":'),
  s+' extra',
  '{"raw":"private"}',
 ])assert.throws(()=>R210.parseFeedback(raw),/TLS_R210_/);
});
test('R210 rejects invalid UTF-8, oversize, null bytes and deep structures',()=>{
 assert.throws(()=>R210.parseFeedback(new Uint8Array([0xc3,0x28])),/TLS_R210_/);
 assert.throws(()=>R210.parseFeedback(new Uint8Array([0])),/TLS_R210_/);
 assert.throws(()=>R210.parseFeedback('x'.repeat(8193)),/TLS_R210_/);
 assert.throws(()=>R210.parseFeedback('['.repeat(12)+']'.repeat(12)),/TLS_R210_/);
});
test('R210 deduplicates equivalent JSON payloads, not participant identities',()=>{
 const reversed=Object.fromEntries(Object.entries(SAMPLE).reverse());
 const result=R210.summarizeBatch([JSON.stringify(SAMPLE),JSON.stringify(reversed),
  JSON.stringify(pending),'not json']);
 assert.equal(result.input_files,4);
 assert.equal(result.accepted_distinct_payloads,2);
 assert.equal(result.duplicate_payloads,1);
 assert.equal(result.rejected_files,1);
 assert.equal(result.outcomes.FINISHED,1);
 assert.equal(result.outcomes.NOT_FINISHED,1);
 assert.equal(result.clarity.EASY,1);
 assert.equal(result.clarity.SOME_DIFFICULTY,1);
 assert.equal(result.real_user_count_verified,false);
 assert.equal(result.adoption_verified,false);
 assert.equal(result.translation_quality_verified,false);
 assert.equal(result.network_requested,false);
 assert.equal(result.contains_original_text,false);
 assert.equal(result.contains_source_hashes,false);
 assert.equal(JSON.stringify(result).includes('隱私資料'),false);
 assert(Object.isFrozen(result));
});
test('R210 empty file batch is not adoption evidence',()=>{
 const empty=R210.summarizeBatch([]);
 assert.equal(empty.input_files,0);assert.equal(empty.accepted_distinct_payloads,0);
 assert.equal(empty.real_user_count_verified,false);
 assert.equal(empty.status,'UNVERIFIED_VOLUNTARY_METADATA_ONLY');
});
test('R210 batching rejects more than 40 items and aggregate oversize',()=>{
 assert.throws(()=>R210.summarizeBatch(Array(41).fill(JSON.stringify(SAMPLE))),/TLS_R210_/);
 assert.throws(()=>R210.summarizeBatch([new Uint8Array(9000)]),/TLS_R210_/);
});
test('R210 cannot introduce external calls, storage or implicit upload',()=>{
 const src=fs.readFileSync(path.join(__dirname,'feedback_audit_r210.js'),'utf8');
 for(const name of ['fetch(', 'XMLHttpRequest(', 'sendBeacon(', 'new WebSocket(',
   'localStorage.', 'sessionStorage.', 'document.cookie', 'navigator.geolocation'])
  assert(!src.includes(name),name);
});
test('R210 standalone builder is self-contained, offline, and exactly reproducible',()=>{
 const Builder=require('./build_feedback_audit_r210.js');
 const html=Builder.build();
 assert.equal(fs.readFileSync(Builder.TARGET,'utf8'),html);
 for(const marker of ['id="feedbackFiles"','id="analyzeFeedback"','id="authorized"',
  'id="downloadSummary"',"connect-src 'none'","default-src 'none'",'TLSFeedbackEvidenceR210'])
  assert(html.includes(marker),marker);
 assert(!html.includes('https://cdn.'));
 assert(!html.includes('__TLS_R210_'));
});
