/* Taiwan-LLM-Sanitizer R12: offline evaluation evidence, no runtime/promotion permission. MIT. */
(function (global) {
'use strict';
const SCHEMA='tls.r12.quality-evidence.v1';
const FAMILIES=['technical','business','webui','named','prompt'];
const AXES=['meaning','naturalness','taiwan_locale','register'];
const MAX_FILE_BYTES=5000000,MAX_TRANSLATION=50000,MAX_REVIEWS=400;
function failure(code){throw new Error(code);}
function jsonl(text,maxRows=400){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_FILE_BYTES)failure('INPUT_TOO_LARGE');
 const lines=text.split(/\r?\n/u).filter(x=>x.trim());
 if(lines.length>maxRows)failure('TOO_MANY_ROWS');
 return lines.map((line,i)=>{let value;
  try{value=JSON.parse(line);}catch(_){failure('INVALID_JSONL_LINE_'+(i+1));}
  if(!value||typeof value!=='object'||Array.isArray(value))failure('INVALID_JSONL_OBJECT');
  return value;
 });
}
function rowsById(frozen){
 if(!Array.isArray(frozen)||frozen.length!==100)failure('FROZEN_COUNT_MISMATCH');
 const result=new Map(),counts={};
 for(const row of frozen){
  if(!row||typeof row.id!=='string'||result.has(row.id)||!FAMILIES.includes(row.family)||
    typeof row.source_text!=='string'||!['en','zh-CN'].includes(row.source_locale)||
    !Array.isArray(row.preserve_exact))failure('FROZEN_COHORT_INVALID');
  result.set(row.id,row);counts[row.family]=(counts[row.family]||0)+1;
 }
 if(FAMILIES.some(x=>counts[x]!==20))failure('FROZEN_FAMILY_IMBALANCE');
 return result;
}
function parseTranslations(raw,frozen){
 const expected=rowsById(frozen),seen=new Map();
 for(const record of jsonl(raw,100)){
  const keys=Object.keys(record);
  if(keys.length!==2||!keys.includes('id')||!keys.includes('translation')||
    typeof record.id!=='string'||!expected.has(record.id))failure('TRANSLATION_SCHEMA_OR_ID');
  if(seen.has(record.id))failure('DUPLICATE_TRANSLATION_ID');
  if(typeof record.translation!=='string'||record.translation.length>MAX_TRANSLATION||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(record.translation))failure('INVALID_TRANSLATION_TEXT');
  seen.set(record.id,record.translation);
 }
 return seen;
}
function inspect(row,translation){
 const issues=[];
 if(!translation.trim())issues.push('EMPTY_TRANSLATION');
 else{
  for(const value of row.preserve_exact){if(typeof value!=='string')failure('INVALID_FROZEN_PRESERVE');
   if(!translation.includes(value))issues.push('PROTECTED_LITERAL_MISSING');}
  if(row.source_locale==='en'&&translation.trim()===row.source_text.trim())issues.push('UNCHANGED_ENGLISH');
 }
 return [...new Set(issues)];
}
function analyze(frozen,translationMap,label='user-supplied-candidate'){
 const expected=rowsById(frozen);
 if(!(translationMap instanceof Map)||[...translationMap.keys()].some(x=>!expected.has(x)))failure('TRANSLATIONS_INVALID');
 const counts=Object.fromEntries(FAMILIES.map(x=>[x,{total:20,submitted:0,missing:0,withStructuralFlags:0,unchangedEnglish:0}]));
 let supplied=0,flagged=0,unchanged=0;const issueCounts={};const flags=[];
 for(const row of frozen){
  const stat=counts[row.family];if(!translationMap.has(row.id)){stat.missing++;continue;}
  supplied++;stat.submitted++;const codes=inspect(row,translationMap.get(row.id));
  if(codes.length){flagged++;stat.withStructuralFlags++;flags.push({id:row.id,codes});}
  for(const code of codes){issueCounts[code]=(issueCounts[code]||0)+1;
   if(code==='UNCHANGED_ENGLISH'){unchanged++;stat.unchangedEnglish++;}}
 }
 return {label:String(label).slice(0,80),total:frozen.length,submitted:supplied,missing:frozen.length-supplied,
  coverageFraction:Number((supplied/frozen.length).toFixed(4)),withStructuralFlags:flagged,
  withoutDetectedFlags:supplied-flagged,unchangedEnglish:unchanged,perFamily:counts,issueCounts,flags,
  structuralScope:'SELECTIVE_LITERAL_AND_UNCHANGED_TEXT_WARNINGS_ONLY',
  translationAccuracyMeasured:false};
}
function parseReviews(raw,frozen){
 const expected=rowsById(frozen),seen=new Set(),reviews=[];
 for(const row of jsonl(raw,MAX_REVIEWS)){
  const allowed=['id','reviewer_id',...AXES,'error_categories','comment'];
  if(Object.keys(row).some(k=>!allowed.includes(k))||typeof row.id!=='string'||
    !expected.has(row.id)||typeof row.reviewer_id!=='string'||!/^[-_a-zA-Z0-9]{1,64}$/u.test(row.reviewer_id))
    failure('INVALID_REVIEW_SCHEMA');
  if(AXES.some(a=>!Number.isInteger(row[a])||row[a]<1||row[a]>5))failure('INVALID_REVIEW_SCORE');
  if(row.comment!==undefined&&(typeof row.comment!=='string'||row.comment.length>1500))failure('INVALID_REVIEW_COMMENT');
  if(row.error_categories!==undefined&&(!Array.isArray(row.error_categories)||row.error_categories.length>30||
   row.error_categories.some(x=>typeof x!=='string'||x.length>70)))failure('INVALID_REVIEW_CATEGORIES');
  const key=row.id+'\0'+row.reviewer_id;
  if(seen.has(key))failure('DUPLICATE_REVIEWER_PER_CASE');seen.add(key);
  reviews.push(row);
 }
 return reviews;
}
function summarizeReviews(reviews,submitted){
 if(!Array.isArray(reviews)||!(submitted instanceof Map))failure('INVALID_REVIEW_INPUT');
 const byId=new Map();for(const row of reviews){if(!submitted.has(row.id))continue;
  const a=byId.get(row.id)||[];a.push(row);byId.set(row.id,a);}
 let twoOrMore=0,disagreements=0;const values=Object.fromEntries(AXES.map(x=>[x,[]]));
 for(const rows of byId.values())if(rows.length>=2){twoOrMore++;
  for(const axis of AXES){const scores=rows.map(x=>x[axis]);values[axis].push(...scores);
   if(Math.max(...scores)-Math.min(...scores)>=2)disagreements++;}}
 const averages=twoOrMore?Object.fromEntries(AXES.map(a=>
  [a,Number((values[a].reduce((s,v)=>s+v,0)/values[a].length).toFixed(3))])):null;
 return {reviewRecords:reviews.length,reviewedSubmittedCases:byId.size,atLeastTwoSelfReportedReviewers:twoOrMore,
  missingTwoReviews:submitted.size-twoOrMore,disagreementAxes:disagreements,axisMeans:averages,
  reviewerIdentityVerified:false,independentHumanReviewVerified:false,
  state:twoOrMore===100?'SELF_REPORTED_FULL_COVERAGE_NOT_INDEPENDENTLY_VERIFIED':
    (twoOrMore?'PARTIAL_SELF_REPORTED':'INSUFFICIENT_FOR_TWO_REVIEWER_AGGREGATE')};
}
function compare(a,b,frozen,meta={}){
 const one=analyze(frozen,a,meta.labelA||'candidate A');
 const two=b?analyze(frozen,b,meta.labelB||'candidate B'):null;
 let both=0,onlyA=0,onlyB=0;
 if(two)for(const row of frozen){const inA=a.has(row.id),inB=b.has(row.id);
  if(inA&&inB)both++;else if(inA)onlyA++;else if(inB)onlyB++;}
 const human=Array.isArray(meta.reviews)?summarizeReviews(meta.reviews,a):null;
 return {schema:SCHEMA,cohort:'R6_PUBLIC_FROZEN_V1',frozen_sha256:meta.frozenSHA||'',
  generatedFrom:'locally_uploaded_user_material',candidateSourceVerified:false,
  studyOnly:true,approval:'NO_PROMOTION_NO_CLAIM',noUnseenOOS:true,
  candidateA:one,candidateB:two,comparison:two?{both,onlyA,onlyB,
   coverageDeltaBminusA:two.submitted-one.submitted,
   structuralFlagCountDeltaBminusA:two.withStructuralFlags-one.withStructuralFlags,
   comparisonIsNotAccuracyRanking:true}:null,
  human,humanReviewIndependent:false,rawCandidateTextIncluded:false,
  warning:'Structural checks are incomplete and cannot certify meaning, grammar, Taiwan localization, source model identity or independent human review.'};
}
const api=Object.freeze({SCHEMA,FAMILIES,AXES,MAX_FILE_BYTES,MAX_REVIEWS,jsonl,rowsById,
 parseTranslations,parseReviews,inspect,analyze,summarizeReviews,compare});
global.TLSQualityR12=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
