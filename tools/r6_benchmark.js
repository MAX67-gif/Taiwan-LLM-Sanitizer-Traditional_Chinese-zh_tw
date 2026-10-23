#!/usr/bin/env node
/* R6 public frozen benchmark, structural QA and optional human review.
 * No network/API, no telemetry, no automatic semantic-quality claim. MIT. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const core=require('../src/core/engine.js');
const quality=require('./translation_qa.js');

const ROOT=path.resolve(__dirname,'..');
const FILE=path.join(ROOT,'benchmarks/r6/public_frozen_v1.jsonl');
const MANIFEST=path.join(ROOT,'benchmarks/r6/frozen_manifest_v1.json');
const FAMILIES=['technical','business','webui','named','prompt'];
const ALLOWED_AXES=['meaning','naturalness','taiwan_locale','register'];
const MAX_BYTES=5_000_000;
function readText(file) {
  const info=fs.lstatSync(file);
  if(!info.isFile()||info.isSymbolicLink()||info.size>MAX_BYTES)throw Error('Input must be regular local UTF-8 file under 5 MB');
  return fs.readFileSync(file,'utf8');
}
function jsonl(raw){
  return raw.split(/\r?\n/u).map(x=>x.trim()).filter(Boolean).map((x,i)=>{
    try{return JSON.parse(x);}catch(_){throw Error('Malformed JSONL at line '+(i+1));}
  });
}
function loadFrozen() {
  const raw=readText(FILE),manifest=JSON.parse(readText(MANIFEST));
  const sum=crypto.createHash('sha256').update(Buffer.from(raw,'utf8')).digest('hex');
  if(sum!==manifest.exact_sha256_utf8)throw Error('FROZEN_INPUT_SHA256_MISMATCH: do not edit V1; create V2');
  const rows=jsonl(raw);
  if(rows.length!==100||manifest.record_count!==rows.length)throw Error('FROZEN_RECORD_COUNT_MISMATCH');
  const seen=new Set(),counts={};
  for(const c of rows){
    if(typeof c.id!=='string'||seen.has(c.id))throw Error('DUPLICATE_OR_INVALID_ID');
    seen.add(c.id);
    if(!FAMILIES.includes(c.family))throw Error('INVALID_FAMILY');
    if(typeof c.source_text!=='string'||!c.source_text.trim()||
       typeof c.reference_zh_tw!=='string'||!c.reference_zh_tw.trim())throw Error('INVALID_SAMPLE');
    if(c.reference_status!=='editorial_draft_not_independently_reviewed')throw Error('UNVERIFIED_REFERENCE_MISLABELED');
    if(!['en','zh-CN'].includes(c.source_locale)||c.target_locale!=='zh-Hant-TW')throw Error('INVALID_LOCALE');
    if(!Array.isArray(c.preserve_exact))throw Error('PRESERVE_LIST_MISSING');
    for(const key of c.preserve_exact)if(!c.source_text.includes(key))throw Error('PROTECTED_LITERAL_ABSENT_IN_SOURCE');
    counts[c.family]=(counts[c.family]||0)+1;
  }
  for(const name of FAMILIES)if(counts[name]!==20||manifest.family_counts[name]!==20)
    throw Error('UNBALANCED_FAMILY');
  return {manifest,rows,sha256:sum};
}
function parseOptions(argv) {
  const [command,...rest]=argv;
  const commands=['validate','baseline','score','review-template'];
  if(!commands.includes(command))throw Error('Usage: node tools/r6_benchmark.js validate|baseline|score|review-template [--input FILE] [--output NEW_FILE] [--report NEW_FILE] [--reviews FILE] [--model-id LABEL]');
  const options={command};
  for(let i=0;i<rest.length;i++){
    const key=rest[i];
    if(!['--input','--output','--report','--reviews','--model-id'].includes(key))
      throw Error('Unknown option: '+key);
    if(!rest[i+1])throw Error('Missing value for '+key);
    options[key.slice(2).replace('-','_')]=rest[++i];
  }
  if(command==='score'&&(!options.input||!options.output))throw Error('score requires --input and --output');
  if(command==='baseline'&&(!options.output||!options.report))throw Error('baseline requires --output and --report');
  if(command==='review-template'&&(!options.input||!options.output))throw Error('review-template requires --input and --output');
  if(options.input && options.input===options.output)throw Error('Never overwrite the source file');
  return options;
}
function inspectCandidate(caseData,translation){
  if(typeof translation!=='string'||!translation.trim()||translation.length>50_000)
    return {hardFail:true,issues:[{code:'MISSING_OR_INVALID_TRANSLATION'}],unchanged:false};
  const qa=quality.inspect(caseData.source_text,translation);
  const issues=[...qa.issues];
  for(const required of caseData.preserve_exact)if(!translation.includes(required))
    issues.push({code:'REQUIRED_LITERAL_MISSING',kind:'protected_source_item'});
  // Not a hard quality fail: some Chinese terms, product names or numbers can be
  // identical across locale variants. Flag only truly unchanged English sources.
  const unchanged=caseData.source_locale==='en'&&translation.trim()===caseData.source_text.trim();
  if(unchanged)issues.push({code:'SOURCE_UNCHANGED_ENGLISH',kind:'review_warning'});
  return {hardFail:issues.some(x=>x.code!=='SOURCE_UNCHANGED_ENGLISH'),
    issues:issues.map(x=>({code:x.code,kind:x.kind||undefined})),unchanged};
}
function safeCandidateRows(raw,expected) {
  const entries=jsonl(raw),out=new Map();
  for(const entry of entries){
    if(!entry||typeof entry.id!=='string'||!expected.has(entry.id))throw Error('UNKNOWN_BENCHMARK_ID');
    if(out.has(entry.id))throw Error('DUPLICATE_CANDIDATE_ID');
    if(typeof entry.translation!=='string'||entry.translation.length>50_000)throw Error('TRANSLATION_FIELD_INVALID');
    out.set(entry.id,entry.translation);
  }
  return out;
}
function reviewSummary(raw,known){
  if(!raw)return {state:'NOT_REVIEWED',reviewedItems:0,fullyReviewedItems:0,reviewCount:0,axes:null};
  const reviews=jsonl(raw),byId=new Map();
  for(const r of reviews){
    if(!r||!known.has(r.id)||typeof r.reviewer_id!=='string'||!r.reviewer_id.trim())
      throw Error('INVALID_REVIEW');
    for(const axis of ALLOWED_AXES)if(!Number.isInteger(r[axis])||r[axis]<1||r[axis]>5)
      throw Error('INVALID_HUMAN_SCORE_'+axis);
    const people=byId.get(r.id)||new Map();
    if(people.has(r.reviewer_id))throw Error('DUPLICATE_REVIEWER_ON_ITEM');
    people.set(r.reviewer_id,r);byId.set(r.id,people);
  }
  let fully=0,discordant=0;const totals=Object.fromEntries(ALLOWED_AXES.map(x=>[x,[]]));
  for(const group of byId.values()){
    if(group.size<2)continue;
    fully++;
    const ratings=[...group.values()];
    for(const axis of ALLOWED_AXES){
      const values=ratings.map(x=>x[axis]);
      if(Math.max(...values)-Math.min(...values)>=2)discordant++;
      totals[axis].push(...values);
    }
  }
  const complete=fully===known.size&&known.size===100;
  return {state:complete?'SELF_REPORTED_COMPLETE_NOT_INDEPENDENTLY_VERIFIED':'PARTIAL_SELF_REPORTED',
    reviewedItems:byId.size,fullyReviewedItems:fully,reviewCount:reviews.length,
    disagreements:discordant,axes:fully?Object.fromEntries(ALLOWED_AXES.map(a=>
      [a,Number((totals[a].reduce((x,y)=>x+y,0)/totals[a].length).toFixed(3))])):null,
    reviewerIdentityVerified:false,
    promotionAuthorized:false};
}
function evaluate(frozen,outputs,metadata={}) {
  const per=Object.fromEntries(FAMILIES.map(f=>[f,{total:20,submitted:0,missing:0,staticPass:0,hardFail:0,unchangedEnglish:0}]));
  let submitted=0,missing=0,hard=0,unchanged=0,passed=0;
  const problems=[];
  for(const c of frozen.rows){
    const family=per[c.family];
    if(!outputs.has(c.id)){missing++;family.missing++;continue;}
    submitted++;family.submitted++;
    const status=inspectCandidate(c,outputs.get(c.id));
    if(status.hardFail){hard++;family.hardFail++;}
    else{passed++;family.staticPass++;}
    if(status.unchanged){unchanged++;family.unchangedEnglish++;}
    if(status.issues.length)problems.push({id:c.id,issues:status.issues});
  }
  const modelId=typeof metadata.model_id==='string'?metadata.model_id:'unspecified';
  return {
    schema:'tls.r6.structural_evaluation.v1',
    cohort:frozen.manifest.benchmark_id,
    frozen_sha256:frozen.sha256,
    submitted_by_user_model_id:modelId,
    evaluation_only:true,
    translationModelQualityMeasured:false,
    automaticCheckMeaning:'KNOWN_NAME_AND_PARTIAL_STRUCTURE_CHECKS_ONLY',
    automatic:{
      total:100,submitted,missing,staticPass:passed,hardFail:hard,unchangedEnglish:unchanged,
      coverageFraction:Number((submitted/100).toFixed(4)),
      perFamily:per
    },
    issuesById:problems,
    human:metadata.human||{state:'NOT_REVIEWED'},
    approval:'NO_PROMOTION_NO_CLAIM',
    note:'A structural pass is NOT evidence of correct meaning, naturalness, register, Taiwan preferences or independent model performance.'
  };
}
function writeNew(filename,content){
  if(!filename||typeof filename!=='string')throw Error('Explicit output file required');
  // No overwrite; never create files in GitHub repo unintentionally.
  const full=path.resolve(filename);
  if(full===FILE||full===MANIFEST)throw Error('Frozen source cannot be overwritten');
  fs.writeFileSync(full,content,{encoding:'utf8',flag:'wx'});
}
function main(argv=process.argv.slice(2)){
  const args=parseOptions(argv),frozen=loadFrozen();
  if(args.command==='validate'){
    console.log(JSON.stringify({status:'FROZEN_SHA256_PASS',cohort:frozen.manifest.benchmark_id,
      records:frozen.rows.length,families:frozen.manifest.family_counts,
      referenceQuality:'UNREVIEWED_EDITORIAL_DRAFT',sha256:frozen.sha256},null,2));
    return 0;
  }
  if(args.command==='baseline'){
    const baseline=frozen.rows.map(c=>({
      id:c.id,translation:core.translateText(c.source_text,{
        domain:c.family==='technical'?'engineering':c.family==='webui'?'ui':'general',
        regionalPreference:'balanced'})
    }));
    writeNew(args.output,baseline.map(r=>JSON.stringify(r)).join('\n')+'\n');
    const report=evaluate(frozen,new Map(baseline.map(r=>[r.id,r.translation])),
      {model_id:'R5_OFFLINE_TERMS_ONLY_NOT_A_FULL_TRANSLATION_MODEL'});
    report.model_kind='DICTIONARY_BASELINE_NOT_REAL_MODEL';
    writeNew(args.report,JSON.stringify(report,null,2)+'\n');
    console.log('Wrote baseline and separate structural report locally. No model fluency claim.');
    return 0;
  }
  const expected=new Set(frozen.rows.map(c=>c.id));
  const translations=safeCandidateRows(readText(args.input),expected);
  if(args.command==='review-template'){
    const template=frozen.rows.filter(c=>translations.has(c.id)).map(c=>({
      id:c.id,family:c.family,context:c.context,source_locale:c.source_locale,
      source:c.source_text,candidate:translations.get(c.id),
      reviewer_id:'',meaning:null,naturalness:null,taiwan_locale:null,register:null,
      error_categories:[],comment:''
    }));
    writeNew(args.output,template.map(x=>JSON.stringify(x)).join('\n')+'\n');
    console.log('Human review form exported locally; reference translation intentionally hidden to reduce anchoring.');
    return 0;
  }
  const human=args.reviews?reviewSummary(readText(args.reviews),expected):undefined;
  const report=evaluate(frozen,translations,{model_id:args.model_id||'unspecified_local_candidate',human});
  writeNew(args.output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({frozen_sha256:report.frozen_sha256,submitted:report.automatic.submitted,
    missing:report.automatic.missing,structuralIssues:report.automatic.hardFail,
    humanState:report.human.state,approval:report.approval},null,2));
  return 0;
}
if(require.main===module)try{process.exitCode=main();}catch(e){console.error('R6_BENCHMARK_ERROR:',e.message);process.exitCode=2;}
module.exports={loadFrozen,jsonl,inspectCandidate,evaluate,parseOptions,reviewSummary,main};
