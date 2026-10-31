#!/usr/bin/env node
'use strict';
// Maintainer-only deterministic fixture replay. No new product runtime or transport.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createWordingSession,MAX_BYTES,MAX_CANDIDATES,MAX_REPLACEMENT}=require('../src/core/wording_assistant_r172.js');
const {analyze}=require('../src/core/protected_segments_r15.js');
const ROOT=path.resolve(__dirname,'..');
const fail=code=>{throw Error('TLS_SHOWCASE_'+code);};
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
// Original R17.2 bytes at the frozen public baseline, not regenerated product files.
const LOCKED={
 'src/core/entities.js':'59c34500fc0a45e63de68919382d12a6db39ff9f7949477d35fec564590cc157',
 'src/core/protected_segments_r15.js':'b436da248ed272e841289b2e5c6043b260e98ca3e64b4f3c6d927d82dce38ed9',
 'src/core/local_workbench_r16.js':'f5680c4b788a3ddd9e917d40ef1aadceaa7ba4e25614aa1b3531bd0ac907be80',
 'src/core/wording_assistant_r172.js':'ce0570400d8d43466206884217553a1a120be546f11d90a40012564d8cf4c8ee',
 'tools/wording_assistant_r172_ui.js':'ec2b14dd6c3c33e021a9590d04998a8cb8208c435db94dd207b05bb611d8b427',
 'tools/templates/wording_assistant_r172.html':'593f2ed44ced39db4af26f50608858e43828013072ce5cbd4ff223c6b1c32263',
 'lexicon/approved_r3.json':'664dd0f0f733b6aac378c69d36f9765af651dedd39cd1404dfb35732a314878f',
 'lexicon/wording_overlay_r172.json':'bb13c04be634466d95b60f14210bac832856fbc3bd85da30b56573cd28abfaba',
 'examples/TW_Wording_Assistant_R172_20261027.html':'4ce1cfae97832937907ec6aa3c56c11b552d2cbd04c7b27c676379637be6b873'
};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
function keys(x,expected){return object(x)&&Object.keys(x).sort().join('|')===[...expected].sort().join('|');}
function binding(bytes){return {sha256:sha256(bytes),bytes:Buffer.byteLength(bytes)};}
function immutableArtifacts(root){
 const artifacts={};
 for(const [file,hash] of Object.entries(LOCKED)){
  const bytes=fs.readFileSync(path.join(root,file));if(sha256(bytes)!==hash)fail('ARTIFACT_MISMATCH:'+file);
  artifacts[file]=binding(bytes);
 }
 return artifacts;
}
async function replay(source,decisions,root){
 if(!keys(decisions,['schema','source_sha256','offset_unit','choices'])||decisions.schema!=='tls.showcase.decisions.v1'||decisions.offset_unit!=='utf16'||!Array.isArray(decisions.choices))fail('INVALID_DECISIONS');
 if(typeof source!=='string'||sha256(source)!==decisions.source_sha256)fail('SOURCE_BINDING');
 const artifacts=immutableArtifacts(root),session=createWordingSession({source});
 try{
  let snapshot=await session.inspect();
  if(snapshot.state!=='READY')fail('INSPECTION_REJECTED');
  if(decisions.choices.length!==snapshot.candidates.length)fail('LEDGER_COMPLETENESS');
  for(let i=0;i<snapshot.candidates.length;i++){
   const c=snapshot.candidates[i],d=decisions.choices[i];
   if(!keys(d,['candidate_id','start','end','original_text','resolution','action','option_id'])||!['CONFIRM','KEEP_ORIGINAL','UNSELECTED'].includes(d.action))fail('INVALID_DECISIONS');
   if(d.candidate_id!==c.id||d.start!==c.start||d.end!==c.end||d.original_text!==c.original_text||d.resolution!==c.resolution)fail('CANDIDATE_BINDING');
   if(['BLOCKED','LIMITED'].includes(c.resolution)&&d.action!=='UNSELECTED')fail('BLOCKED_CHOICE');
   if(d.action==='CONFIRM'?!c.options.some(o=>o.id===d.option_id):d.option_id!==null)fail('OPTION_BINDING');
   if(d.action!=='UNSELECTED')snapshot=session.choose({snapshot_id:snapshot.snapshot_id,candidate_id:c.id,action:d.action,...(d.action==='CONFIRM'?{option_id:d.option_id}:{})});
  }
  const outcome=await session.preview({snapshot_id:snapshot.snapshot_id}),preview=outcome.preview_text;
  const before=await analyze(source,'markdown'),after=await analyze(preview,'markdown');
  const protectedBefore=before.segments.filter(s=>s.policy==='PROTECT'),protectedAfter=after.segments.filter(s=>s.policy==='PROTECT');
  if(before.validation.status!=='OK'||after.validation.status!=='OK'||protectedBefore.length!==protectedAfter.length)fail('PROTECTED_SEGMENT_CHANGE');
  const spans=protectedBefore.map((s,i)=>{
   const t=protectedAfter[i],a=source.slice(s.start,s.end),b=preview.slice(t.start,t.end);
   if(s.type!==t.type||s.reason!==t.reason||a!==b)fail('PROTECTED_SEGMENT_CHANGE');
   return {id:s.id,type:s.type,reason:s.reason,source_start:s.start,source_end:s.end,preview_start:t.start,preview_end:t.end,source_sha256:sha256(a),preview_sha256:sha256(b),bytes:Buffer.byteLength(a),bytes_equal:true};
  });
  const choices=snapshot.candidates.map(c=>{
   const selected=c.options.find(o=>o.id===c.selected_option_id);
   return {candidate_id:c.id,start:c.start,end:c.end,original_text:c.original_text,resolution:c.resolution,reason_codes:c.reason_codes,action:c.choice,option_id:c.selected_option_id,replacement:selected?.replacement||c.original_text,context:selected?.context||c.occurrence_context,options:c.options.map(o=>({option_id:o.id,replacement:o.replacement,context:o.context,evidence_status:o.evidence_status}))};
  });
  artifacts['docs/showcase/source.md']=binding(source);
  artifacts['docs/showcase/decisions.json']=binding(json(decisions));
  artifacts['docs/showcase/preview.md']=binding(preview);
  const report=session.report();
  return {preview,verification:{schema:'tls.showcase.verification.v1',status:'PASS',method:'R17.2_CREATE_WORDING_SESSION_REPLAY',offset_unit:'utf16',artifacts,
   counts:{candidates:snapshot.candidates.length,confirmed:report.selected_count,kept:report.keep_count,unselected:report.unresolved_count,blocked:snapshot.candidates.filter(c=>c.resolution==='BLOCKED').length,changed_segments:outcome.change_count,protected_spans:spans.length},
   coverage:snapshot.coverage,limits:{max_source_bytes:MAX_BYTES,max_candidates:MAX_CANDIDATES,max_replacement_utf16_per_segment:MAX_REPLACEMENT,markdown:'CONSERVATIVE_RULES_NOT_FULL_GFM',english_software_candidate:false},
   choices,protection:{all_equal:true,spans},preview_status:outcome.status,source_overwritten:false,transport:'NONE',network_requested:false,
   browser_verification:'SEPARATE_ACTUAL_UI_TEST_REQUIRED',human_quality:'NOT_TESTED',adoption:'NOT_COLLECTED',approval:'NONE',semantic_equivalence_verified:false}};
 }finally{session.revoke();}
}
async function buildShowcase(source,decisions){return replay(source,decisions,ROOT);}
async function verifyShowcase(root=ROOT){
 const source=fs.readFileSync(path.join(root,'docs/showcase/source.md'),'utf8');
 const bytes=fs.readFileSync(path.join(root,'docs/showcase/decisions.json'),'utf8'),decisions=JSON.parse(bytes);
 const result=await replay(source,decisions,root);
 if(bytes!==json(decisions))fail('ARTIFACT_MISMATCH:docs/showcase/decisions.json');
 for(const [file,expected] of [['preview.md',result.preview],['verification.json',json(result.verification)]]){
  if(fs.readFileSync(path.join(root,'docs/showcase',file),'utf8')!==expected)fail('ARTIFACT_MISMATCH:docs/showcase/'+file);
 }
 return result.verification;
}
async function main(){
 const args=process.argv.slice(2);if(args.length!==1||!['--write','--check'].includes(args[0]))fail('USAGE:--write_OR_--check');
 let verification;
 if(args[0]==='--write'){
  const source=fs.readFileSync(path.join(ROOT,'docs/showcase/source.md'),'utf8'),bytes=fs.readFileSync(path.join(ROOT,'docs/showcase/decisions.json'),'utf8'),decisions=JSON.parse(bytes);
  if(bytes!==json(decisions))fail('INVALID_DECISIONS_NON_CANONICAL');
  const result=await buildShowcase(source,decisions);verification=result.verification;
  fs.writeFileSync(path.join(ROOT,'docs/showcase/preview.md'),result.preview);
  fs.writeFileSync(path.join(ROOT,'docs/showcase/verification.json'),json(verification));
 }else verification=await verifyShowcase();
 console.log(JSON.stringify({result:'PASS',mode:args[0],source_sha256:verification.artifacts['docs/showcase/source.md'].sha256,preview_sha256:verification.artifacts['docs/showcase/preview.md'].sha256,counts:verification.counts,human_quality:verification.human_quality,adoption:verification.adoption}));
}
module.exports={buildShowcase,verifyShowcase};
if(require.main===module)main().catch(e=>{console.error(String(e.message));process.exitCode=1;});
