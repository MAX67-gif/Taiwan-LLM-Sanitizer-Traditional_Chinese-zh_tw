#!/usr/bin/env node
/* TLS R211 read-only local Markdown/PR wording review, NOT a translator.
 * Uses the original R172 protected candidate scan and R205 context tiers.
 * The only output is a new, metadata-only JSON file, never source text.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const Word=require('../../../src/core/wording_assistant_r172.js');
const Lens=require('./context_risk_lens_r205.js');
const File=require('../../../tools/r16_local_workbench_cli.js');
const SCHEMA='tls.r211.pr-wording-audit.v1';
const TIER_ORDER=Object.freeze({HIGH:0,MEDIUM:1,LOW:2,LOCKED:3});
const FORMAT=new Set(['.md','.markdown','.txt']);
const fail=code=>{throw Error('TLS_R211_'+code);};
const freeze=o=>{for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);return Object.freeze(o);};
function parse(argv){
 if(!Array.isArray(argv))fail('ARGUMENTS');
 const opts={input:null,report:null,strict:false};
 const seen=new Set();
 for(let i=0;i<argv.length;i++){
  const key=argv[i];if(!['--input','--report','--strict'].includes(key)||seen.has(key))fail('ARGUMENTS');
  seen.add(key);
  if(key==='--strict'){opts.strict=true;continue;}
  if(i+1>=argv.length||!argv[i+1]||argv[i+1].startsWith('--'))fail('ARGUMENTS');
  opts[key.slice(2)]=argv[++i];
 }
 if(!opts.input||!opts.report)fail('REQUIRE_INPUT_AND_REPORT');
 return opts;
}
function position(source,offset){
 const lines=source.slice(0,offset).split(/\r\n|\r|\n/u);
 return Object.freeze({line:lines.length,column_utf16:lines[lines.length-1].length+1});
}
async function auditMarkdown(source){
 if(typeof source!=='string'||!source.trim()||source.includes('\0'))fail('UNSUPPORTED_SOURCE');
 // The R172 Core rejects structured JSON, invalid Unicode and >64 KiB input.
 const s=Word.createWordingSession({source});
 try{
  const snap=await s.inspect();
  if(snap.state!=='READY'||snap.schema!=='tls.wording-candidates.v1')fail('REJECTED_OR_UNSAFE_CONTENT');
  const findings=snap.candidates.map((c,index)=>{
   const risk=Lens.assess(c,source);
   const here=position(source,c.start);
   return Object.freeze({ordinal:index+1,line:here.line,column_utf16:here.column_utf16,
    length_utf16:c.end-c.start,tier:risk.tier,reason_code:risk.reason_code,
    reviewable:c.resolution==='CONTEXT_REQUIRED',human_review_required:risk.human_review_required});
  });
  findings.sort((a,b)=>TIER_ORDER[a.tier]-TIER_ORDER[b.tier]||a.ordinal-b.ordinal);
  const riskCount=label=>findings.filter(f=>f.tier===label).length;
  const omitted=snap.coverage.omitted_candidate_count;
  const count=findings.filter(f=>f.reviewable).length;
  return freeze({schema:SCHEMA,status:count>0||omitted>0?'REVIEW_REQUIRED':
    findings.length>0?'LOCKED_ONLY_NOT_CERTIFIED':'NO_CANDIDATES_NOT_CERTIFIED',
   format:'markdown',offset_unit:'utf16',candidates_total:findings.length,
   candidates_reviewable:count,review_high:riskCount('HIGH'),
   review_medium:riskCount('MEDIUM'),review_low:riskCount('LOW'),
   native_locked:riskCount('LOCKED'),
   protected_segments:snap.coverage.protected_segments,
   omitted_candidates:omitted,partial_coverage:omitted>0,
   review_required:count>0||omitted>0,findings,
   approval:'NONE',auto_apply:false,automatically_modified:false,
   contains_source_text:false,contains_source_hashes:false,
   contains_candidate_ids:false,contains_replacement_text:false,
   contains_file_names:false,contains_user_identity:false,
   network_requested:false,full_document_certified:false,
   linguistic_quality_verified:false,external_adoption_verified:false});
 }finally{s.revoke();}
}
async function main(argv=process.argv.slice(2)){
 const opts=parse(argv);
 const p=path.resolve(opts.input);
 if(!FORMAT.has(path.extname(p).toLowerCase()))fail('EXTENSION_NOT_SUPPORTED');
 const input=File.readStrict(p,Word.MAX_BYTES);
 const out=File.ensureNewPath(opts.report,[p]);
 const report=await auditMarkdown(input.text);
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{encoding:'utf8',flag:'wx',mode:0o600});
 return Object.freeze({schema:SCHEMA,status:report.status,
  report_written:true,review_required:report.review_required,
  review_high:report.review_high,review_medium:report.review_medium,
  exit_code:opts.strict&&report.review_required?2:0});
}
if(require.main===module){main().then(report=>{
 console.log(JSON.stringify(report));process.exitCode=report.exit_code;
},error=>{
 // Never leak a path, part of a user's input or OS-specific errors to CI logs.
 const tag=/^TLS_R211_([A-Z_]+)$/.exec(String(error.message||''));
 console.error('TLS_R211_REJECTED',tag?tag[1]:'LOCAL_FILE_OR_SOURCE_REJECTED');
 process.exitCode=1;
});}
module.exports=Object.freeze({SCHEMA,parse,auditMarkdown,main});
