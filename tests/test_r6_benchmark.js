/* R6 frozen cohort, evaluator and anti-quality-inflation regression. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const core=require('../src/core/engine.js');
const {
 loadFrozen,inspectCandidate,evaluate,parseOptions,reviewSummary,main
}=require('../tools/r6_benchmark.js');
const frozen=loadFrozen();
test('public v1 cohort is byte-sealed, balanced and explicitly unreviewed',()=>{
 assert.equal(frozen.rows.length,100);
 assert.equal(frozen.sha256,'e41e2589404ad8699bde7a4363eb9a6d81b1492c490d0f69de65a3fc67f403c1');
 assert.equal(frozen.manifest.git_blob_sha1,'13abcec571fa6d9594be3dac2da8d4593ea0feef');
 assert.deepEqual(frozen.manifest.family_counts,{technical:20,business:20,webui:20,named:20,prompt:20});
 assert.equal(frozen.manifest.evaluation_only,true);
 assert.ok(frozen.rows.every(r=>r.reference_status==='editorial_draft_not_independently_reviewed'));
 const seen=new Set(frozen.rows.map(r=>r.source_text));
 assert.equal(seen.size,100);
});
test('editorial references satisfy only narrow exact-byte integrity preconditions',()=>{
 for(const row of frozen.rows){
  for(const literal of row.preserve_exact)
    assert.ok(row.reference_zh_tw.includes(literal),row.id+' missing '+literal);
 }
});
test('corrupted Codex title and altered prompt placeholder are detectable',()=>{
 const named=frozen.rows.find(r=>r.id==='R6-NAMED-001');
 const fail=inspectCandidate(named,'開源法典支援開源社群的開發者。');
 assert.equal(fail.hardFail,true);
 assert.ok(fail.issues.some(x=>x.code==='PROTECTED_NAME_CHANGED'||x.code==='REQUIRED_LITERAL_MISSING'));
 const prompt=frozen.rows.find(r=>r.id==='R6-PROMPT-001');
 const broken=inspectCandidate(prompt,'請翻譯 {姓名} 成臺灣繁體中文。');
 assert.equal(broken.hardFail,true);
 assert.ok(broken.issues.some(x=>x.code==='PROTECTED_STRUCTURE_MISSING'||x.code==='REQUIRED_LITERAL_MISSING'));
});
test('structural success never becomes a naturalness or accuracy claim',()=>{
 const pairs=new Map(frozen.rows.map(r=>[r.id,r.reference_zh_tw]));
 const report=evaluate(frozen,pairs,{model_id:'human_editorial_examples_not_tested'});
 assert.equal(report.automatic.total,100);
 assert.equal(report.automatic.submitted,100);
 assert.equal(report.automatic.missing,0);
 assert.equal(report.translationModelQualityMeasured,false);
 assert.equal(report.approval,'NO_PROMOTION_NO_CLAIM');
 assert.equal(report.human.state,'NOT_REVIEWED');
});
test('dictionary baseline is NOT an evaluated full translation model',()=>{
 const pairs=new Map(frozen.rows.map(r=>[r.id,core.translateText(r.source_text)]));
 const report=evaluate(frozen,pairs,{model_id:'offline-terms-only'});
 assert.equal(report.automatic.submitted,100);
 assert.equal(report.translationModelQualityMeasured,false);
 assert.ok(report.automatic.unchangedEnglish>20);
 assert.equal(report.approval,'NO_PROMOTION_NO_CLAIM');
});
test('incomplete submissions preserve honest coverage counts',()=>{
 const c=frozen.rows[0];
 const r=evaluate(frozen,new Map([[c.id,c.source_text]]));
 assert.equal(r.automatic.submitted,1);
 assert.equal(r.automatic.missing,99);
 assert.ok(Object.values(r.automatic.perFamily).some(s=>s.submitted===0));
});
test('two reviewer entries are partial, unverified; no fake independence',()=>{
 const id=frozen.rows[0].id;
 const asRow=(reviewer_id)=>({id,reviewer_id,meaning:4,naturalness:3,taiwan_locale:5,register:4});
 const data=[asRow('reviewer_a'),asRow('reviewer_b')].map(x=>JSON.stringify(x)).join('\n');
 const r=reviewSummary(data,new Set(frozen.rows.map(x=>x.id)));
 assert.equal(r.state,'PARTIAL_SELF_REPORTED');
 assert.equal(r.reviewedItems,1);
 assert.equal(r.fullyReviewedItems,1);
 assert.equal(r.reviewerIdentityVerified,false);
 assert.equal(r.promotionAuthorized,false);
 assert.throws(()=>reviewSummary([asRow('x'),asRow('x')].map(JSON.stringify).join('\n'),new Set([id])),/DUPLICATE_REVIEWER/u);
 assert.throws(()=>reviewSummary(JSON.stringify({...asRow('a'),meaning:7}),new Set([id])),/INVALID_HUMAN_SCORE/u);
});
test('CLI rejects unsafe or incomplete invocation and never overwrites input',()=>{
 assert.throws(()=>parseOptions(['score','--input','same','--output','same']),/Never overwrite/u);
 assert.throws(()=>parseOptions(['score','--input','x']),/score requires/u);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r6-'));
 try{
   const output=path.join(tmp,'baseline.jsonl'),report=path.join(tmp,'report.json');
   assert.equal(main(['baseline','--output',output,'--report',report]),0);
   const o=JSON.parse(fs.readFileSync(report,'utf8'));
   assert.equal(o.model_kind,'DICTIONARY_BASELINE_NOT_REAL_MODEL');
   assert.equal(o.automatic.submitted,100);
   assert.ok(o.automatic.unchangedEnglish>20);
   assert.throws(()=>main(['baseline','--output',output,'--report',report]),/EEXIST/u);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('unreviewed reference is explicitly not a claimed model performance result',()=>{
 assert.equal(frozen.manifest.reference_review_status,'not_independently_verified');
 assert.ok(frozen.manifest.not_accepted_use.includes('claim_model'));
 assert.ok(frozen.manifest.future_untouched_test.includes('Freeze separately'));
});
