'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createWordingSession:create}=require('../../../src/core/wording_assistant_r172.js');
const Replay=require('./review_continuity_r203.js');
const Build=require('./build_review_continuity_r203.js');
const fs=require('node:fs'),path=require('node:path');
const tick=String.fromCharCode(96);
const original='設定 menu，餐廳 menu。軟件與點擊率不一樣。'+tick+'menu'+tick+' 及 {{KEEP}} 不動。';
async function choose(){
 const session=create({source:original});let snapshot=await session.inspect();
 const menus=snapshot.candidates.filter(x=>x.original_text==='menu');
 assert.equal(menus.length,2);
 for(const [i,replacement] of [[0,'選單'],[1,'菜單']]){
  const option=menus[i].options.find(o=>o.replacement===replacement);assert(option);
  snapshot=session.choose({snapshot_id:snapshot.snapshot_id,candidate_id:menus[i].id,action:'CONFIRM',option_id:option.id});
 }
 const software=snapshot.candidates.find(c=>c.original_text==='軟件');assert(software);
 snapshot=session.choose({snapshot_id:snapshot.snapshot_id,candidate_id:software.id,action:'KEEP_ORIGINAL'});
 return {session,snapshot,plan:Replay.capture(snapshot)};
}
test('R203 portable decisions omit original and replacement text and never grant permission',async()=>{
 const {session,snapshot,plan}=await choose();
 assert.equal(plan.schema,Replay.SCHEMA);assert.equal(plan.choices.length,3);
 assert(Object.isFrozen(plan)&&Object.isFrozen(plan.choices));
 assert.equal(plan.source_sha256,snapshot.source_sha256);
 assert.equal(plan.auto_apply,false);assert.equal(plan.network_requested,false);
 assert.equal(plan.approval,'NONE');assert.equal(plan.contains_original_text,false);
 const encoded=JSON.stringify(plan);
 for(const v of ['設定','餐廳','軟件','選單','菜單','{{KEEP}}'])
  assert(!encoded.includes(v),'leaked: '+v);
 assert.equal(Replay.validate(JSON.parse(encoded)).schema,Replay.SCHEMA);
 session.revoke();
});
test('identical original and same catalog allow explicit restore and safe preview',async()=>{
 const {session,plan}=await choose(),fresh=create({source:original});
 const result=await Replay.restore(fresh,JSON.parse(JSON.stringify(plan)));
 assert.equal(result.restored_count,3);assert.equal(result.approval,'NONE');
 assert.equal(result.preview_not_applied,true);
 const preview=await fresh.preview({snapshot_id:result.snapshot.snapshot_id});
 assert(preview.preview_text.includes('設定 選單，餐廳 菜單。軟件'));
 assert(preview.preview_text.includes(tick+'menu'+tick+' 及 {{KEEP}} 不動'));
 assert.equal(preview.change_count,1);assert.equal(preview.approval,'NONE');
 fresh.revoke();session.revoke();
});
test('one changed original byte invalidates saved choices',async()=>{
 const {session,plan}=await choose();
 const fresh=create({source:original.replace('設定','設定好')});
 await assert.rejects(Replay.restore(fresh,plan),/SOURCE_OR_DICTIONARY_CHANGED/);
 const state=await fresh.inspect();
 assert(state.candidates.every(c=>c.choice==='UNSELECTED'));
 fresh.revoke();session.revoke();
});
test('changing source, official catalog or candidate overlay hashes fails closed',async()=>{
 const {session,plan}=await choose();
 for(const key of ['source_sha256','catalog_sha256','overlay_sha256']){
  const corrupted=JSON.parse(JSON.stringify(plan));corrupted[key]='0'.repeat(64);
  const fresh=create({source:original});
  await assert.rejects(Replay.restore(fresh,corrupted),/SOURCE_OR_DICTIONARY_CHANGED/);
  fresh.revoke();
 }session.revoke();
});
test('malformed later entry fails before any imported choice is executed',async()=>{
 const {session,plan}=await choose();
 for(const mutation of [
  p=>{p.choices[0].start++;},p=>{p.choices[1].end++;},
  p=>{p.choices[1].option_id='missing:context';},
  p=>{p.choices[1].candidate_id='c99999';}
 ]){
  const invalid=JSON.parse(JSON.stringify(plan));mutation(invalid);
  const fresh=create({source:original});
  await assert.rejects(Replay.restore(fresh,invalid),/TLS_R203_/);
  const s=await fresh.inspect();assert(s.candidates.every(c=>c.choice==='UNSELECTED'));
  fresh.revoke();
 }session.revoke();
});
test('schema rejects promotion, extra keys, arbitrary actions, duplicate positions',async()=>{
 const {session,plan}=await choose();
 for(const mutation of [
  p=>{p.approval='APPROVED';},p=>{p.auto_apply=true;},
  p=>{p.contains_original_text=true;},p=>{p.extra_original_text=original;},
  p=>{p.choices.push({...p.choices[0]});},
  p=>{p.choices[0].option_id='__proto__';},
  p=>{p.choices[0].choice='EVAL';},p=>{p.candidate_count=121;},
  p=>{p.choices[1].start=-1;},
  p=>{p.choices[0].choice='KEEP_ORIGINAL';},
  p=>{Object.defineProperty(p.choices[0],'__proto__',{value:{admin:true},enumerable:true});},
 ]){
  const t=JSON.parse(JSON.stringify(plan));mutation(t);
  assert.throws(()=>Replay.validate(t),/TLS_R203_/);
 }session.revoke();
});
test('empty review does nothing and requires explicit preview',async()=>{
 const content='請 click 主選單；'+tick+'click'+tick+' 保持';
 const s=create({source:content});const snap=await s.inspect();
 const plan=Replay.capture(snap);assert.equal(plan.choices.length,0);
 const fresh=create({source:content});const restored=await Replay.restore(fresh,plan);
 const p=await fresh.preview({snapshot_id:restored.snapshot.snapshot_id});
 assert.equal(p.change_count,0);assert.equal(p.preview_text,content);
 fresh.revoke();s.revoke();
});
test('offline HTML reproducible, no egress, old R17.2 source artifact untouched',()=>{
 const built=Build.build();
 assert.equal(fs.readFileSync(Build.TARGET,'utf8'),built);
 for(const k of ["connect-src 'none'","default-src 'none'",'id="importReview"','id="exportReview"'])
  assert(built.includes(k));
 assert(!built.includes('__TLS_R17'));
 const old=fs.readFileSync(path.resolve(__dirname,'../../../examples/TW_Wording_Assistant_R172_20261027.html'),'utf8');
 assert(!old.includes('id="exportReview"'));assert.notEqual(Build.hash(built),Build.hash(old));
});
