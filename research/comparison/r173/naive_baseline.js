/* R17.3 research-only literal baseline. No transport, source overwrites or model calls.
 * L1 and L2-EQUAL both use the exact R16-provided EDITABLE UTF-16 spans.
 * RAW is a separately identified diagnostic, not a fair text-quality comparison.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const WORK = require('../../../src/core/local_workbench_r16.js');
const WORDING = require('../../../src/core/wording_assistant_r172.js');
const OVERLAY = require('../../../lexicon/wording_overlay_r172.json');

const digest = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const MAX_BYTES=65536;
function assertSource(source){
 if(typeof source!=='string'||!source.trim()||Buffer.byteLength(source,'utf8')>MAX_BYTES||source.includes('\0'))throw Error('R173_SOURCE_REJECTED');
 for(let i=0;i<source.length;i++){
   let n=source.charCodeAt(i);
   if(n>=0xd800&&n<=0xdbff){if(++i>=source.length||source.charCodeAt(i)<0xdc00||source.charCodeAt(i)>0xdfff)throw Error('R173_UNPAIRED_SURROGATE');}
   else if(n>=0xdc00&&n<=0xdfff)throw Error('R173_UNPAIRED_SURROGATE');
 }
 return source;
}
function frozenRules(){
 const aliases=OVERLAY.forms.filter(x=>x.kind==='R172_CANDIDATE_ALIAS').map(x=>({from:x.from_text,to:x.to}));
 if(aliases.length!==6)throw Error('R173_OVERLAY_DRIFT');
 return Object.freeze(aliases.map(x=>Object.freeze(x)));
}
function validateRules(rules){
 if(!Array.isArray(rules)||!rules.length||rules.length>20)throw Error('R173_RULES_REJECTED');
 const seen=new Set();
 for(const x of rules){
  if(!x||typeof x.from!=='string'||typeof x.to!=='string'||!x.from||!x.to||x.from===x.to||x.from.length>40||x.to.length>80||seen.has(x.from))throw Error('R173_RULES_REJECTED');
  seen.add(x.from);
 }
 return [...rules].sort((a,b)=>b.from.length-a.from.length||a.from.localeCompare(b.from));
}
function replaceLiteral(text,rules){
 const ordered=validateRules(rules);let out='',count=0,at=0;
 // Greedy longest match; per-position independent; replacement is never rescanned.
 while(at<text.length){
  const rule=ordered.find(r=>text.startsWith(r.from,at));
  if(rule){out+=rule.to;at+=rule.from.length;count++;}
  else{out+=text[at];at++;}
 }
 return {text:out,changed_occurrences:count};
}
function validateEditableSpans(source,spans){
 if(!Array.isArray(spans)||spans.length>20000)throw Error('R173_INVALID_SPANS');
 let cursor=0;
 for(const s of spans){
   if(!s||!Number.isSafeInteger(s.start)||!Number.isSafeInteger(s.end)||s.start<cursor||s.end>source.length||s.start>=s.end||typeof s.id!=='string')throw Error('R173_INVALID_SPANS');
   cursor=s.end;
 }
 return spans;
}
function replaceEditable(source,spans,rules){
 validateEditableSpans(source,spans);let at=0,out='',changed=0;
 for(const s of spans){
  out+=source.slice(at,s.start);
  const chunk=replaceLiteral(source.slice(s.start,s.end),rules);
  out+=chunk.text;changed+=chunk.changed_occurrences;at=s.end;
 }
 out+=source.slice(at);
 return {text:out,changed_occurrences:changed};
}
function protectedRawChanges(source,spans,rules){
 validateEditableSpans(source,spans);let at=0,events=0;
 for(const s of spans){const part=source.slice(at,s.start);events+=replaceLiteral(part,rules).changed_occurrences;at=s.end;}
 events+=replaceLiteral(source.slice(at),rules).changed_occurrences;return events;
}
async function inspectSource(source){
 assertSource(source);
 const session=WORK.openSession({source,format:'markdown'});
 try{
  const report=await session.inspect();
  if(report.validation_status!=='OK')return {status:'LIMITED_OR_UNSUPPORTED',reason_codes:report.reject_reasons,spans:[],protected_count:0};
  const spans=validateEditableSpans(source,session.changesAllowed());
  return {status:'READY',spans,protected_count:report.protected_spans.length};
 }finally{session.revoke();}
}
async function compareLocal(source,opts={}){
 assertSource(source);
 const rules=frozenRules();
 const snap=await inspectSource(source);
 if(snap.status!=='READY')return {schema:'tls.r173.engineering-observation.v1',evidence_class:'DEV_ONLY',status:'LIMITED',reason_codes:snap.reason_codes,semantic_equivalence_verified:false,models_invoked:0,reviewers:0,network_requested:false,original_text_in_report:false};
 const raw=replaceLiteral(source,rules),same=replaceEditable(source,snap.spans,rules);
 let wording=null,snapshot;
 try{wording=WORDING.createWordingSession({source});snapshot=await wording.inspect();}
 catch(e){
  const code=String(e.message||'');
  if(!/^TLS_R172_(?:UNSUPPORTED_CONTENT|INPUT_LIMIT|PREVIEW_REJECTED|HASH_BINDING_MISSING)$/u.test(code))throw e;
  return {schema:'tls.r173.engineering-observation.v1',evidence_class:'DEV_ONLY',status:'LIMITED',reason_codes:[code],
    opencc_status:'BASELINE_NOT_RUN',llm_status:'NOT_RUN',human_quality_status:'NOT_MEASURED',
    semantic_equivalence_verified:false,models_invoked:0,reviewers:0,network_requested:false,original_text_in_report:false};
 }finally{wording?.revoke();}
 if(snapshot.state!=='READY')throw Error('R173_R172_STATE_MISMATCH');
 return Object.freeze({schema:'tls.r173.engineering-observation.v1',evidence_class:'DEV_ONLY',status:'STRUCTURAL_OBSERVATION_ONLY',
   lane1:'EQUAL_EDITABLE_SPANS',lane2_raw:'RAW_DIAGNOSTIC_UNFAIR_FOR_TEXT_QUALITY',
   mode:'SIX_ALIASES_FROZEN',raw_literal_events:raw.changed_occurrences,
   equal_span_literal_events:same.changed_occurrences,raw_protected_literal_events:protectedRawChanges(source,snap.spans,rules),
   equal_span_protected_violations:0,editable_segment_count:snap.spans.length,protected_segment_count:snap.protected_count,
   tls_candidate_count:snapshot.candidates.length,tls_unresolved_count:snapshot.candidates.filter(c=>c.choice==='UNSELECTED').length,
   tls_automatic_changes:0,opencc_status:'BASELINE_NOT_RUN',llm_status:'NOT_RUN',human_quality_status:'NOT_MEASURED',
   semantic_equivalence_verified:false,models_invoked:0,reviewers:0,network_requested:false,original_text_in_report:false});
}
async function cli(args){
 const index=args.indexOf('--input');
 if(index<0||!args[index+1]||args.length!==2){process.stderr.write('Usage: node naive_baseline.js --input <locally-owned-file>\n');return 2;}
 const p=path.resolve(args[index+1]);if(!fs.statSync(p).isFile()||fs.lstatSync(p).isSymbolicLink())throw Error('R173_INPUT_PATH_REJECTED');
 const report=await compareLocal(fs.readFileSync(p,'utf8'));
 // Never print source content, filepath, source digest or proposed plaintext changes.
 process.stdout.write(JSON.stringify(report,null,2)+'\n');return 0;
}
module.exports={digest,assertSource,frozenRules,replaceLiteral,replaceEditable,protectedRawChanges,inspectSource,compareLocal};
if(require.main===module)cli(process.argv.slice(2)).then(code=>process.exitCode=code).catch(e=>{console.error('R173_RESEARCH_ERROR:',e.message);process.exitCode=2;});
