'use strict';
// R205 TDD: pure read-only contextual risk hints, never a translation decision.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createWordingSession}=require('../../../src/core/wording_assistant_r172.js');
const Lens=require('./context_risk_lens_r205.js');
const source='介面 menu，餐廳 menu。餐廳設定 menu，未知 menu。請保持 \x60menu\x60 和 {{KEY}} 原樣。';
const menuRows=a=>a.candidates.filter(c=>c.original_text.toLowerCase()==='menu');
async function fresh(text=source){const session=createWordingSession({source:text});return {session,snapshot:await session.inspect()};}
test('R205 reads four editable menu occurrences but never code or template',async()=>{
 const {session,snapshot}=await fresh();const found=menuRows(snapshot);assert.equal(found.length,4);
 assert.equal(snapshot.candidates.some(c=>c.start>=source.indexOf('\x60menu\x60')&&c.start<source.indexOf('\x60menu\x60')+6),false);
 assert.equal(snapshot.candidates.every(c=>c.choice==='UNSELECTED'),true);
 const a=found.map(c=>Lens.assess(c,source));
 assert.equal(a[0].suggested_context,'ui_menu');
 assert.equal(a[1].suggested_context,'food_menu');
 assert.equal(a[2].reason_code,'CONFLICTING_CONTEXT_CUES');
 assert.equal(a[3].reason_code,'AMBIGUOUS_CONTEXT_NO_CUES');
 assert.equal(a[0].tier,'MEDIUM');assert.equal(a[1].tier,'MEDIUM');
 assert.equal(a[2].tier,'HIGH');assert.equal(a[3].tier,'HIGH');
 assert(a.every(x=>x.auto_apply===false&&x.approval==='NONE'&&x.human_review_required));
 session.revoke();
});
test('R205 inconsistent manual choice is warned, not silently reversed',async()=>{
 const {session,snapshot}=await fresh();const rows=menuRows(snapshot);
 let state=snapshot;const wrong=rows[0].options.find(x=>x.context==='food_menu');
 assert(wrong,'Original engine must expose a food-menu option');
 state=session.choose({snapshot_id:state.snapshot_id,candidate_id:rows[0].id,action:'CONFIRM',option_id:wrong.id});
 const updated=state.candidates.find(c=>c.id===rows[0].id);
 const decision=Lens.assess(updated,source);
 assert.equal(decision.tier,'HIGH');assert.equal(decision.reason_code,'CHOICE_CONTEXT_CONFLICT');
 assert.equal(updated.choice,'CONFIRM');
 assert.equal(updated.selected_option_id,wrong.id);
 assert.equal((await session.preview({snapshot_id:state.snapshot_id}).approval,'NONE');
 session.revoke();
});
test('R205 high-risk-first queue is deterministic, stable, with no changes to choices',async()=>{
 const {session,snapshot}=await fresh();const cs=menuRows(snapshot);
 const risk=Lens.route(cs,source,'risk_first');
 assert.deepEqual(risk.map(x=>x.id),[cs[2].id,cs[3].id,cs[0].id,cs[1].id]);
 assert.deepEqual(Lens.route(cs,source,'document').map(x=>x.id),cs.map(x=>x.id));
 assert.deepEqual(Lens.route(cs,source,'high_only').map(x=>x.id),[cs[2].id,cs[3].id]);
 assert(cs.every(x=>x.choice==='UNSELECTED'));
 session.revoke();
});
test('R205 summary exposes counts only; no user text or auto permission',async()=>{
 const {session,snapshot}=await fresh();
 const summary=Lens.summarize(snapshot.candidates,source);
 assert.equal(summary.schema,'tls.r205.context-risk-summary.v1');
 assert.equal(summary.high,2);assert.equal(summary.medium>=2,true);
 assert.equal(summary.approval,'NONE');assert.equal(summary.auto_apply,false);
 assert.equal(summary.network_requested,false);
 assert.equal(summary.contains_source_text,false);
 assert.equal(JSON.stringify(summary).includes('餐廳'),false);
 assert(Object.isFrozen(summary));
 session.revoke();
});
test('R205 reject stale, forged, overlapping and shifted candidate anchors',async()=>{
 const {session,snapshot}=await fresh();const row=menuRows(snapshot)[0];
 for(const change of [
  {...row,start:row.start+1},
  {...row,end:row.end+1},
  {...row,start:-1},
  {...row,original_text:'totally different'},
 ]){
   assert.throws(()=>Lens.assess(change,source),/R205_.*ANCHOR/);
 }
 assert.throws(()=>Lens.route([row],'different menu','risk_first'),/R205_.*ANCHOR/);
 assert.throws(()=>Lens.route([row],source,'alphabetic'),/R205_.*MODE/);
 session.revoke();
});
test('R205 native blocked and limited cases remain locked',async()=>{
 const text='點擊率和點擊聲不是滑鼠點選。';
 const {session,snapshot}=await fresh(text);
 const blocked=snapshot.candidates.filter(c=>c.resolution==='BLOCKED'||c.resolution==='LIMITED');
 assert(blocked.length>=1);
 for(const row of blocked){
  const info=Lens.assess(row,text);
  assert.equal(info.tier,'LOCKED');
  assert.equal(info.suggested_context,null);
  assert.equal(info.auto_apply,false);
 }
 session.revoke();
});
test('R205 only explains source-local cues, punctuation prevents distant context leak',async()=>{
 const text='介面操作。午餐 menu，介面 menu';
 const {session,snapshot}=await fresh(text);const rows=menuRows(snapshot);
 assert.equal(rows.length,2);
 assert.equal(Lens.assess(rows[0],text).suggested_context,'food_menu');
 assert.equal(Lens.assess(rows[1],text).suggested_context,'ui_menu');
 session.revoke();
});
test('R205 unknown candidates never authorize replacement or human accuracy claims',async()=>{
 const {session,snapshot}=await fresh('請使用軟件和其他設定。');
 const info=Lens.summarize(snapshot.candidates,'請使用軟件和其他設定。');
 assert.equal(info.semantic_equivalence_verified,false);
 for(const c of snapshot.candidates){const r=Lens.assess(c,'請使用軟件和其他設定。');assert.equal(r.auto_apply,false);}
 session.revoke();
});
