'use strict';
/* R209 TDD: integrated first task + context risk + stable manual focus. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const W=require('../../../src/core/wording_assistant_r172.js');
const Lens=require('./context_risk_lens_r205.js');
const M=require('./review_workbench_r204.js');
const F=require('./review_focus_r207.js');
const R208=require('./build_first_task_r208.js');
const U=require('./review_unified_r209.js');
const Build=require('./build_unified_review_r209.js');
const SRC='介面 menu，餐廳 menu。餐廳設定 menu，未知 menu。`menu` 與 {{KEY}} 保留。';
const sessionOf=async text=>{const s=W.createWordingSession({source:text});return {s,snapshot:await s.inspect()};};
const menus=c=>c.filter(x=>x.original_text.toLowerCase()==='menu');

test('R209 composes R205 risk-first sorting with R207 focus without modifying candidates',async()=>{
 const {s,snapshot}=await sessionOf(SRC);const rows=menus(snapshot.candidates);
 assert.equal(rows.length,4);
 const frozen=JSON.stringify(rows);
 const risk=U.route(rows,SRC,'risk_first');
 assert.deepEqual(risk.map(x=>x.id),[rows[2].id,rows[3].id,rows[0].id,rows[1].id]);
 assert.equal(U.focus(risk,null,0).id,rows[2].id);
 assert.equal(U.focus(risk,rows[2].id,1).id,rows[3].id);
 assert.equal(U.focus(risk,rows[2].id,-1).id,rows[1].id);
 assert.deepEqual(U.route(rows,SRC,'document').map(x=>x.id),rows.map(x=>x.id));
 assert.deepEqual(U.route(rows,SRC,'high_only').map(x=>x.id),[rows[2].id,rows[3].id]);
 assert.equal(JSON.stringify(rows),frozen);
 assert(snapshot.candidates.every(x=>x.choice==='UNSELECTED'));
 s.revoke();
});
test('R209 next unresolved follows current risk order after manual KEEP; never auto-chooses',async()=>{
 const {s,snapshot}=await sessionOf(SRC);const original=menus(snapshot.candidates);
 let after=s.choose({snapshot_id:snapshot.snapshot_id,candidate_id:original[2].id,action:'KEEP_ORIGINAL'});
 const rows=U.route(menus(after.candidates),SRC,'risk_first');
 assert.equal(U.nextPending(rows,original[2].id),original[3].id);
 assert.equal(U.nextPending(rows,'c99999'),original[3].id);
 assert.equal(after.candidates.find(c=>c.id===original[3].id).choice,'UNSELECTED');
 assert.equal(after.candidates.find(c=>c.id===original[2].id).choice,'KEEP_ORIGINAL');
 assert.equal((await s.preview({snapshot_id:after.snapshot_id})).approval,'NONE');
 s.revoke();
});
test('R209 missing/cancelled high-risk view remains a read-only filter, not completion proof',async()=>{
 const {s,snapshot}=await sessionOf(SRC);
 const empty=U.route(menus(snapshot.candidates),SRC,'high_only');
 assert.equal(empty.length,2);
 const restricted=U.route(menus(snapshot.candidates).slice(0,2),SRC,'high_only');
 assert.equal(restricted.length,0);
 assert.equal(U.focus(restricted,null,0).id,null);
 assert.equal(U.nextPending(restricted,'c00001'),null);
 const proof=U.summary(snapshot,SRC);
 assert.equal(proof.schema,'tls.r209.unified-review-summary.v1');
 assert.equal(proof.risk_high,2);
 assert.equal(proof.candidates_pending>=4,true);
 assert.equal(proof.full_document_certified,false);
 assert.equal(proof.auto_apply,false);
 assert.equal(proof.network_requested,false);
 assert.equal(proof.contains_source_text,false);
 assert(!JSON.stringify(proof).includes('餐廳'));
 s.revoke();
});
test('R209 safe-context anchors and invalid modes fail closed',async()=>{
 const {s,snapshot}=await sessionOf(SRC);
 const row=menus(snapshot.candidates)[0];
 assert.throws(()=>U.route([{...row,start:row.start+1}],SRC,'risk_first'),/R205_.*ANCHOR/);
 assert.throws(()=>U.route([row],SRC,'auto'),/R205_.*MODE|R209_.*MODE/);
 assert.throws(()=>U.focus([row],null,2),/R207_/);
 assert.throws(()=>U.nextPending([row],'notid'),/R209_/);
 s.revoke();
});
test('R209 existing R203 JSON and R208 first-task contracts remain unchanged',async()=>{
 const {s,snapshot}=await sessionOf(SRC);
 const flow=require('./first_task_r208.js').evaluate({source_loaded:true,analysis_ready:true,
  reviewable_count:4,decision_count:0,omitted_count:0,preview_ready:false,export_action_triggered:false});
 assert.equal(flow.stage,'NEED_REVIEW');
 assert.equal(flow.full_document_certified,false);
 const fallback=U.summary(snapshot,SRC);
 assert.equal(fallback.translation_quality_verified,false);
 assert.equal(fallback.external_adoption_verified,false);
 s.revoke();
});
test('R209 builder produces reproducible self-contained guided, focus and risk HTML',()=>{
 const original=R208.build(),html=Build.build();
 assert.notEqual(html,original);
 for(const mark of ['id="firstTaskR208"','id="focusToggle"','id="riskMode"','id="riskSummary"',
  'id="r208FeedbackConsent"','id="reviewFilter"','id="previewBtn"','TLSIntegratedReviewR209',
  'TLSContextRiskLensR205',"default-src 'none'","connect-src 'none'"])
   assert(html.includes(mark),mark);
 assert(!original.includes('id="riskMode"'));
 assert(!html.includes('__TLS_R209_'));
 assert(!html.includes('https://cdn.'));
 assert(!html.includes('localStorage.'));
 assert.equal(fs.readFileSync(Build.TARGET,'utf8'),html);
});
test('R209 no network, storage, native file overwrite or developer override in new sources',()=>{
 for(const name of ['review_unified_r209.js','build_unified_review_r209.js']){
  const src=fs.readFileSync(path.join(__dirname,name),'utf8');
  for(const forbidden of ['XMLHttpRequest(', 'sendBeacon(', 'WebSocket(', 'localStorage.',
                           'sessionStorage.', 'document.cookie', 'auto_apply:true'])
   assert(!src.includes(forbidden),name+':'+forbidden);
 }
});
