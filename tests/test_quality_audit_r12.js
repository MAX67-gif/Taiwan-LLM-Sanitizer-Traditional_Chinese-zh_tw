/* R12 independent offline evidence validation, no promotion. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const qa=require('../src/core/quality_audit_r12.js');
const frozen=fs.readFileSync(path.join(__dirname,'../benchmarks/r6/public_frozen_v1.jsonl'),'utf8')
 .split(/\r?\n/u).filter(Boolean).map(JSON.parse);
const encoded=rows=>rows.map(x=>JSON.stringify(x)).join('\n')+'\n';
test('R12 frozen cohort is 100 with five equal families and proof-only states',()=>{
 assert.equal(qa.rowsById(frozen).size,100);
 assert.equal(qa.FAMILIES.length,5);
 assert.throws(()=>qa.rowsById(frozen.slice(1)),/FROZEN_COUNT_MISMATCH/);
 assert.throws(()=>qa.rowsById([...frozen.slice(1),frozen[1]]),/FROZEN_COHORT_INVALID/);
});
test('candidate coverage never turns structural pass into accuracy',()=>{
 const first=frozen[0];const a=qa.parseTranslations(encoded([{id:first.id,translation:'測試文字'}]),frozen);
 const report=qa.compare(a,null,frozen,{frozenSHA:'b'.repeat(64)});
 assert.equal(report.candidateA.submitted,1);assert.equal(report.candidateA.missing,99);
 assert.equal(report.candidateA.translationAccuracyMeasured,false);
 assert.equal(report.approval,'NO_PROMOTION_NO_CLAIM');
 assert.equal(report.candidateSourceVerified,false);
 assert.equal(report.rawCandidateTextIncluded,false);
 assert.equal(JSON.stringify(report).includes('測試文字'),false);
});
test('R12 rejects corrupt, duplicate, unknown and raw-text-leaking uploads',()=>{
 const id=frozen[0].id;
 assert.throws(()=>qa.parseTranslations('bad-json\n',frozen),/INVALID_JSONL_LINE_1/);
 assert.throws(()=>qa.parseTranslations(encoded([{id:'UNKNOWN',translation:'test'}]),frozen),/TRANSLATION_SCHEMA_OR_ID/);
 assert.throws(()=>qa.parseTranslations(encoded([{id,translation:'yes'},{id,translation:'again'}]),frozen),/DUPLICATE_TRANSLATION_ID/);
 assert.throws(()=>qa.parseTranslations(encoded([{id,translation:'x',source_text:'SECRET'}]),frozen),/TRANSLATION_SCHEMA_OR_ID/);
 assert.throws(()=>qa.parseTranslations(encoded([{id,translation:123}]),frozen),/INVALID_TRANSLATION_TEXT/);
 assert.throws(()=>qa.parseTranslations('x'.repeat(qa.MAX_FILE_BYTES+1),frozen),/INPUT_TOO_LARGE/);
});
test('preserved placeholders and unaltered English produce warnings but no quality claim',()=>{
 const named=frozen.find(x=>x.preserve_exact.length>0&&x.source_locale==='en');
 const bad=qa.inspect(named,'你好，我刪掉官方名稱');
 assert.ok(bad.includes('PROTECTED_LITERAL_MISSING'));
 const original=qa.inspect(named,named.source_text);
 assert.ok(original.includes('UNCHANGED_ENGLISH'));
 const result=qa.analyze(frozen,new Map([[named.id,named.source_text]]));
 assert.equal(result.withStructuralFlags,1);
 assert.equal(result.translationAccuracyMeasured,false);
});
test('two candidate files compared only on aligned submission and warning counts',()=>{
 const a=qa.parseTranslations(encoded([{id:frozen[0].id,translation:'甲'},{id:frozen[1].id,translation:'乙'}]),frozen);
 const b=qa.parseTranslations(encoded([{id:frozen[0].id,translation:'甲'},{id:frozen[2].id,translation:'丙'}]),frozen);
 const r=qa.compare(a,b,frozen);
 assert.equal(r.comparison.both,1);assert.equal(r.comparison.onlyA,1);assert.equal(r.comparison.onlyB,1);
 assert.equal(r.comparison.comparisonIsNotAccuracyRanking,true);
});
test('human ratings remain self reported, no fabricated independent reviewers',()=>{
 const id=frozen[0].id,src=id2=>({id,reviewer_id:id2,meaning:4,naturalness:3,taiwan_locale:4,register:5});
 const rows=qa.parseReviews(encoded([src('review1'),src('review2')]),frozen);
 const map=new Map([[id,'某個譯文']]);
 const human=qa.summarizeReviews(rows,map);
 assert.equal(human.atLeastTwoSelfReportedReviewers,1);
 assert.equal(human.independentHumanReviewVerified,false);
 assert.equal(human.reviewerIdentityVerified,false);
 assert.equal(human.state,'PARTIAL_SELF_REPORTED');
 assert.throws(()=>qa.parseReviews(encoded([src('review1'),src('review1')]),frozen),/DUPLICATE_REVIEWER_PER_CASE/);
 assert.throws(()=>qa.parseReviews(encoded([{...src('bad-review'),naturalness:0}]),frozen),/INVALID_REVIEW_SCORE/);
 assert.throws(()=>qa.parseReviews(encoded([{...src('a'),comment:'x',unexpected:true}]),frozen),/INVALID_REVIEW_SCHEMA/);
});
test('R12 excludes unsubmitted cases from human coverage rather than boosting scores',()=>{
 const one=frozen[0].id,two=frozen[1].id;
 const r=qa.parseReviews(encoded([one,two].flatMap(id=>['a','b'].map(reviewer_id=>
   ({id,reviewer_id,meaning:5,naturalness:5,taiwan_locale:5,register:5})))),frozen);
 const human=qa.summarizeReviews(r,new Map([[one,'譯文']]));
 assert.equal(human.atLeastTwoSelfReportedReviewers,1);
 assert.equal(human.reviewRecords,4);
 assert.equal(human.missingTwoReviews,0);
});
