'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildShowcase,verifyShowcase}=require('../tools/check_showcase_r176.js');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'docs/showcase/source.md'),'utf8');
const decisions=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/showcase/decisions.json'),'utf8'));
const clone=()=>structuredClone(decisions);

test('real frozen core replays individual choices, explicit KEEP and unselected defaults',async()=>{
 const {preview,verification:v}=await buildShowcase(source,decisions);
 assert.match(preview,/software 選單 點選進階選項，檢查軟體和資料庫/);
 assert.match(preview,/餐廳的 菜單 預約完成後，請保留點擊率/);
 assert.match(preview,/第三處 menu 保留原文；另一處軟件也保留原文；數據庫暫不選擇/);
 assert.equal(v.counts.candidates,8);assert.equal(v.counts.confirmed,4);assert.equal(v.counts.kept,2);
 assert.equal(v.counts.unselected,2);assert.equal(v.counts.blocked,1);assert.equal(v.counts.changed_segments,2);
 const menus=v.choices.filter(x=>x.original_text==='menu');
 assert.deepEqual(menus.map(x=>[x.action,x.replacement]),[['CONFIRM','選單'],['CONFIRM','菜單'],['KEEP_ORIGINAL','menu']]);
 assert.equal(v.choices.find(x=>x.original_text==='點擊').resolution,'BLOCKED');
 assert.equal(v.coverage.omitted_candidate_count,0);assert.equal(v.coverage.limited_segments,0);
});
test('all protected spans have equal bytes and hashes, including actual template/code/comment/link',async()=>{
 const {verification:v}=await buildShowcase(source,decisions);
 assert.equal(v.protection.all_equal,true);assert.equal(v.protection.spans.length,20);
 for(const s of v.protection.spans){assert.equal(s.source_sha256,s.preview_sha256);assert.equal(s.bytes_equal,true);}
 for(const reason of ['HTML_COMMENT','INLINE_CODE','TEMPLATE_VARIABLE','CODE_FENCE_BODY','LINK_OR_REFERENCE_IMMUTABLE'])assert(v.protection.spans.some(x=>x.reason===reason));
});
test('repeated sessions produce deterministic provenance without fake human or adoption approval',async()=>{
 const a=await buildShowcase(source,decisions),b=await buildShowcase(source,decisions);
 assert.deepEqual(a,b);assert.equal(a.verification.human_quality,'NOT_TESTED');
 assert.equal(a.verification.adoption,'NOT_COLLECTED');assert.equal(a.verification.approval,'NONE');
 assert.equal(a.verification.semantic_equivalence_verified,false);
 for(const x of Object.values(a.verification.artifacts))assert.match(x.sha256,/^[a-f0-9]{64}$/);
});
test('source hash mismatch refuses stale source',async()=>{await assert.rejects(buildShowcase(source+'\n',decisions),/SOURCE_BINDING/);});
test('stale occurrence offsets refuse replay',async()=>{const d=clone();d.choices[0].start++;await assert.rejects(buildShowcase(source,d),/CANDIDATE_BINDING/);});
test('stale occurrence text refuses replay',async()=>{const d=clone();d.choices[0].original_text='軟件';await assert.rejects(buildShowcase(source,d),/CANDIDATE_BINDING/);});
test('unknown option refuses replay rather than assuming a conversion',async()=>{const d=clone();d.choices[0].option_id='not-an-option';await assert.rejects(buildShowcase(source,d),/OPTION_BINDING/);});
test('blocked statistical 點擊 cannot be confirmed or explicitly chosen',async()=>{
 for(const action of ['CONFIRM','KEEP_ORIGINAL']){const d=clone();d.choices[4].action=action;await assert.rejects(buildShowcase(source,d),/BLOCKED_CHOICE/);}
});
test('complete one-to-one ledger rejects omitted, duplicated or extra occurrences',async()=>{
 for(const change of [d=>d.choices.pop(),d=>d.choices[1]=d.choices[0],d=>d.choices.push(d.choices[0])]){
  const d=clone();change(d);await assert.rejects(buildShowcase(source,d),/LEDGER_COMPLETENESS|CANDIDATE_BINDING/);
 }
});
test('invalid schema, extra keys and non-confirm option are rejected',async()=>{
 for(const change of [d=>d.schema='bad',d=>d.extra=true,d=>d.choices[5].option_id='approved_041:ui_menu',d=>d.choices[0].action='AUTO_APPLY']){
  const d=clone();change(d);await assert.rejects(buildShowcase(source,d),/INVALID_DECISIONS|OPTION_BINDING/);
 }
});
test('committed preview and manifest agree with real replay',async()=>{const v=await verifyShowcase(ROOT);assert.equal(v.status,'PASS');});
test('read-only verifier detects preview, manifest, core and shipped HTML drift',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tls-showcase-'));
 try{
  for(const name of ['docs/showcase','src/core','lexicon','tools/wording_assistant_r172_ui.js','tools/templates/wording_assistant_r172.html','examples/TW_Wording_Assistant_R172_20261027.html']){
   fs.mkdirSync(path.dirname(path.join(temp,name)),{recursive:true});fs.cpSync(path.join(ROOT,name),path.join(temp,name),{recursive:true});
  }
  for(const file of ['docs/showcase/preview.md','docs/showcase/verification.json','src/core/wording_assistant_r172.js','examples/TW_Wording_Assistant_R172_20261027.html']){
   const p=path.join(temp,file),before=fs.readFileSync(p);fs.appendFileSync(p,'\n');
   await assert.rejects(verifyShowcase(temp),/ARTIFACT_MISMATCH/);
   assert.equal(fs.readFileSync(p).length,before.length+1,'check must not repair the mismatch');fs.writeFileSync(p,before);
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
