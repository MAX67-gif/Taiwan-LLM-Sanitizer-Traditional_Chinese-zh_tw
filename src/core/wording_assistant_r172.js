/* Taiwan-LLM-Sanitizer R17.2 original local-only wording assistant.
 * Every candidate is inside an R16-validated EDITABLE segment.  Preview is
 * delegated to the unmodified R16 -> R15.1 contract. Nothing is auto-applied.
 */
(function(g){'use strict';
const WORK=g.TLSLocalWorkbenchR16||(typeof require==='function'?require('./local_workbench_r16.js'):null);
const CATALOG=g.TLSWordingCatalogR172||(typeof require==='function'?require('../../lexicon/approved_r3.json'):null);
const OVERLAY=g.TLSWordingOverlayR172||(typeof require==='function'?require('../../lexicon/wording_overlay_r172.json'):null);
if(!WORK||!CATALOG||!OVERLAY)throw Error('TLS_R172_MISSING_LOCKED_SOURCE');
const FAIL=code=>{throw Error('TLS_R172_'+code);};
const MAX_BYTES=65536, MAX_CANDIDATES=120, MAX_REPLACEMENT=1000;
const IDENT='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
const safeObj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const frozen=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(frozen);Object.freeze(x);}return x;};
// Canonical byte strings are embedded by the builder; the runtime hashes its
// immutable in-memory data, never accepts a caller-supplied lexicon.
const metadata={catalog_version:CATALOG.schema_version,overlay_version:OVERLAY.version,
  catalog_sha256:null,overlay_sha256:null};
// Both SHAs are of the in-memory canonical catalog and overlay content.
// The standalone builder injects SHA-256 digests; Node computes them directly.
if(g.TLSWordingDigestsR172){
 metadata.catalog_sha256=g.TLSWordingDigestsR172.catalog_sha256;
 metadata.overlay_sha256=g.TLSWordingDigestsR172.overlay_sha256;
}else if(typeof require==='function'){
 const crypto=require('node:crypto');
 metadata.catalog_sha256=crypto.createHash('sha256').update(JSON.stringify(CATALOG)).digest('hex');
 metadata.overlay_sha256=crypto.createHash('sha256').update(JSON.stringify(OVERLAY)).digest('hex');
}
if(![metadata.catalog_sha256,metadata.overlay_sha256].every(x=>typeof x==='string'&&/^[0-9a-f]{64}$/.test(x)))FAIL('HASH_BINDING_MISSING');

let nextSession=0;
const contextSet=new Set(['unknown','ui_menu','food_menu','ui_action','statistics','sound',
 'software','engineering','general','food','ui','hardware','cloud','internet','document']);
const knownNonUI=(surface,after,before)=>{
 // Only match tokens attached to THIS occurrence, not another word later
 // in the sentence. Never infer UI action from document-level language.
 const suffix=after.slice(0,8);
 if(/^(?:率|量|數|数|聲|声|聲音|次数|次數)/u.test(suffix))return true;
 if(/^\s*(?:rate|through|sound|noise)\b/iu.test(suffix)&&/^click$/iu.test(surface))return true;
 return false;
};
function isLatin(form){return /^[a-zA-Z][\w -]*$/u.test(form);}
function matchesBoundary(text,start,end,word){
 if(!isLatin(word))return true;
 return !(IDENT.includes(text[start-1]||'\0')||IDENT.includes(text[end]||'\0'));
}
function entries(){
 const rows=[];
 for(const r of CATALOG.entries){
  if(!r.from||!r.to||r.from===r.to)continue;
  const ctx=r.scope==='ui'?'ui_menu':r.scope==='food'?'food_menu':
   r.domain==='ui'?'ui_action':r.domain==='food'?'food_menu':(r.domain||'general');
  rows.push({source:r.from,replacement:r.to,context:ctx,source_entry_id:r.id,
   source_kind:'BASE_INTERNAL_APPROVED',parent_concept_id:r.id,evidence_status:'INTERNAL_EDITORIAL_SEED'});
 }
 for(const r of OVERLAY.forms)rows.push({source:r.from_text,replacement:r.to,
   context:r.context,source_entry_id:r.id,source_kind:r.kind,parent_concept_id:r.parent_concept_id,
   evidence_status:'CANDIDATE_ONLY'});
 return rows;
}
const dictionary=entries();
function createWordingSession({source}={}){
 if(typeof source!=='string'||!source.trim()||source.includes('\0'))FAIL('UNSUPPORTED_CONTENT');
 for(let i=0;i<source.length;i++){
  const c=source.charCodeAt(i);
  if(c>=0xD800&&c<=0xDBFF){const n=source.charCodeAt(++i);if(!(n>=0xDC00&&n<=0xDFFF))FAIL('UNSUPPORTED_CONTENT');}
  else if(c>=0xDC00&&c<=0xDFFF)FAIL('UNSUPPORTED_CONTENT');
 }
 if(new TextEncoder().encode(source).length>MAX_BYTES)FAIL('INPUT_LIMIT');
 const trimmed=source.trim();
 if(/^[\[{]/u.test(trimmed)){
  try{const obj=JSON.parse(trimmed);if(obj!==null&&typeof obj==='object')FAIL('UNSUPPORTED_CONTENT');}
  catch(e){if(String(e.message).includes('TLS_R172_'))throw e;}
 }
 // Unfenced JSON key-looking material must not receive Markdown rewrites.
 const jsonish=/(?:^|\n)\s*["'][^\n"']{1,80}["']\s*:\s*(?:["'\[{]|\d|true|false|null)/u.test(source);
 const sid=++nextSession;let state='NEW',generation=0,revision=0,session=null,
   original=source,report=null,candidates=[],limited=0,omitted=0,lastPreview=null,seen=[];
 const alive=()=>{if(state==='REVOKED')FAIL('SESSION_REVOKED');};
 const stamp=()=>`r172-${sid}-${generation}-${revision}`;
 function snapshot(){
  return frozen({schema:'tls.wording-candidates.v1',snapshot_id:stamp(),selection_revision:revision,
   source_sha256:report?.source_sha256||null,format:'markdown',offset_unit:'utf16',
   catalog_version:metadata.catalog_version,catalog_sha256:metadata.catalog_sha256,
   overlay_version:metadata.overlay_version,overlay_sha256:metadata.overlay_sha256,
   state,candidates:candidates.map(x=>({...x,options:x.options.map(o=>({...o})),reason_codes:[...x.reason_codes]})),
   coverage:{editable_segments:seen.length,protected_segments:report?.protected_spans?.length||0,
    scanned_candidate_count:candidates.length+omitted,limited_segments:limited,omitted_candidate_count:omitted},
   approval:'NONE',semantic_equivalence_verified:false});
 }
 async function inspect(){
  alive();++generation;++revision;lastPreview=null;candidates=[];limited=0;omitted=0;state='INSPECTING';
  const current=generation;
  session?.revoke();session=WORK.openSession({source:original,format:'markdown'});
  const r=await session.inspect();if(current!==generation||state==='REVOKED')FAIL('STALE_SNAPSHOT');
  report=r;seen=session.changesAllowed();
  if(r.validation_status!=='OK'||jsonish){state='REJECTED';return snapshot();}
  const raw=[];
  for(const seg of seen){
   const part=session.excerpt(seg.id);
   if(!part)continue;
   for(const entry of dictionary){
    let from=0;const phrase=entry.source;const latin=isLatin(phrase);
    const hay=latin?part.toLowerCase():part,needle=latin?phrase.toLowerCase():phrase;
    for(;;){let index=hay.indexOf(needle,from);if(index<0)break;from=index+needle.length;
     const start=seg.start+index,end=start+needle.length;
     if(!matchesBoundary(original,start,end,phrase))continue;
     raw.push({start,end,segment_id:seg.id,original_text:original.slice(start,end),entry});
    }
   }
  }
  raw.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
  const groups=[];let boundary=-1;
  for(const hit of raw){
   if(hit.start<boundary){const last=groups[groups.length-1];
     if(last&&hit.start===last.start&&hit.end===last.end)last.rows.push(hit.entry);
     continue;
   }
   groups.push({start:hit.start,end:hit.end,segment_id:hit.segment_id,original_text:hit.original_text,rows:[hit.entry]});boundary=hit.end;
  }
  for(const hit of groups){
   if(candidates.length>=MAX_CANDIDATES){omitted++;continue;}
   const s=seen.find(x=>x.id===hit.segment_id),segmentText=session.excerpt(hit.segment_id);
   const options=[],ids=new Set();
   for(const r of hit.rows){const id=r.source_entry_id+':'+r.context;
    if(ids.has(id))continue;ids.add(id);
    options.push({id,replacement:r.replacement,context:r.context,
      context_label:({ui_menu:'介面選單',food_menu:'餐飲菜單',ui_action:'介面操作',software:'軟體技術',engineering:'工程／程式',general:'一般'})[r.context]||r.context,
      source_entry_id:r.source_entry_id,source_kind:r.source_kind,
      parent_concept_id:r.parent_concept_id,evidence_status:r.evidence_status,auto_apply:false});
   }
   const forbidden=hit.rows.some(x=>x.source_kind==='R172_UI_PREFERENCE')&&knownNonUI(hit.original_text,original.slice(hit.end,hit.end+9),original.slice(Math.max(0,hit.start-9),hit.start));
   const isLong=segmentText?.length>MAX_REPLACEMENT;
   const resolution=forbidden?'BLOCKED':isLong?'LIMITED':options.length?'CONTEXT_REQUIRED':'BLOCKED';
   if(resolution==='LIMITED')limited++;
   candidates.push({id:'c'+String(candidates.length+1).padStart(5,'0'),segment_id:hit.segment_id,
    start:hit.start,end:hit.end,source_entry_ids:hit.rows.map(x=>x.source_entry_id),scope:'occurrence',
    original_text:hit.original_text,options:forbidden?[]:options,resolution,
    choice:'UNSELECTED',selected_option_id:null,occurrence_context:'unknown',reason_codes:[forbidden?'KNOWN_NON_UI_CONTEXT':isLong?'SEGMENT_REPLACEMENT_LIMIT':'USER_CONTEXT_REQUIRED']});
  }
  state='READY';return snapshot();
 }
 function choose(command){
  alive();if(state!=='READY')FAIL('NOT_READY');
  if(!safeObj(command)||command.snapshot_id!==stamp())FAIL('STALE_SNAPSHOT');
  if(!['SET_CONTEXT','CONFIRM','KEEP_ORIGINAL','RESET'].includes(command.action))FAIL('INVALID_CHOICE');
  const target=candidates.find(c=>c.id===command.candidate_id);if(!target)FAIL('INVALID_CHOICE');
  if(target.resolution==='BLOCKED'||target.resolution==='LIMITED')FAIL('INVALID_CHOICE');
  let value={...target};
  if(command.action==='SET_CONTEXT'){
   if(!contextSet.has(command.context))FAIL('INVALID_CHOICE');
   // Existing KEEP persists across context adjustment.
   value.occurrence_context=command.context;
   if(value.choice==='CONFIRM'){value.choice='UNSELECTED';value.selected_option_id=null;}
  }else if(command.action==='CONFIRM'){
   const option=value.options.find(o=>o.id===command.option_id);
   if(!option)FAIL('INVALID_CHOICE');
   if(!contextSet.has(option.context))FAIL('INVALID_CHOICE');
   value.choice='CONFIRM';value.selected_option_id=option.id;value.occurrence_context=option.context;
  }else if(command.action==='KEEP_ORIGINAL'){
   value.choice='KEEP_ORIGINAL';value.selected_option_id=null;
  }else{
   value.choice='UNSELECTED';value.selected_option_id=null;value.occurrence_context='unknown';
  }
  candidates=candidates.map(c=>c===target?value:c);++revision;lastPreview=null;
  return snapshot();
 }
 async function preview({snapshot_id}={}){
  alive();if(state!=='READY')FAIL('NOT_READY');if(snapshot_id!==stamp())FAIL('STALE_SNAPSHOT');
  const epoch=generation,rev=revision,selected=candidates.filter(c=>c.choice==='CONFIRM'&&c.resolution==='CONTEXT_REQUIRED');
  const perSegment=new Map();
  for(const c of selected){const option=c.options.find(o=>o.id===c.selected_option_id);
   const seg=seen.find(x=>x.id===c.segment_id),originalSegment=session.excerpt(c.segment_id);
   if(!option||!seg||original.slice(c.start,c.end)!==c.original_text||!originalSegment)FAIL('PREVIEW_REJECTED');
   const part=perSegment.get(seg.id)||[];part.push({candidate:c,option,seg});perSegment.set(seg.id,part);
  }
  const edits=[];
  for(const [id,items] of perSegment){
   const seg=items[0].seg;const before=session.excerpt(id);let pos=0,result='';
   for(const {candidate:c,option:o} of items.sort((a,b)=>a.candidate.start-b.candidate.start)){
    const start=c.start-seg.start,end=c.end-seg.start;
    if(start<pos||before.slice(start,end)!==c.original_text)FAIL('PREVIEW_REJECTED');
    result+=before.slice(pos,start)+o.replacement;pos=end;
   }
   result+=before.slice(pos);
   if(result.length>MAX_REPLACEMENT)FAIL('PREVIEW_REJECTED');
   if(result!==before)edits.push({id,replacement:result});
  }
  let outcome;
  try{outcome=await session.prepare({schema:'tls.structured-edits.v1',input_sha256:report.source_sha256,edits});}
  catch(e){if(state==='REVOKED')FAIL('SESSION_REVOKED');if(epoch!==generation||rev!==revision)FAIL('STALE_SNAPSHOT');FAIL('PREVIEW_REJECTED');}
  if(state==='REVOKED')FAIL('SESSION_REVOKED');
  if(epoch!==generation||rev!==revision||snapshot_id!==stamp())FAIL('STALE_SNAPSHOT');
  if(outcome.status!=='SAFE_PREVIEW_NOT_APPLIED'||outcome.report.approval!=='NONE')FAIL('PREVIEW_REJECTED');
  lastPreview=frozen({schema:'tls.wording-preview.v1',snapshot_id:stamp(),source_sha256:report.source_sha256,
   status:'SAFE_PREVIEW_NOT_APPLIED',approval:'NONE',preview_text:outcome.preview_text,
   preview_output_sha256:outcome.report.preview_output_sha256,change_count:outcome.report.preview_change_count,
   semantic_equivalence_verified:false});
  return lastPreview;
 }
 function publicReport(){return frozen({schema:'tls.wording-report.v1',state,
  source_sha256:report?.source_sha256||null,catalog_sha256:metadata.catalog_sha256,
  overlay_sha256:metadata.overlay_sha256,selected_count:candidates.filter(c=>c.choice==='CONFIRM').length,
  keep_count:candidates.filter(c=>c.choice==='KEEP_ORIGINAL').length,
  unresolved_count:candidates.filter(c=>c.choice==='UNSELECTED').length,limited_count:limited+omitted,
  protected_span_count:report?.protected_spans?.length||0,
  preview_output_sha256:lastPreview?.preview_output_sha256||null,network_requested:false,
  transport:'NONE',approval:'NONE',contains_original_text:false,contains_replacement_text:false,
  semantic_equivalence_verified:false});}
 function revoke(){++generation;++revision;state='REVOKED';session?.revoke();session=null;
  original=null;report=null;candidates=[];seen=[];lastPreview=null;return frozen({status:'REVOKED',approval:'NONE'});}
 return Object.freeze({inspect,choose,preview,report:publicReport,revoke});
}
const API=Object.freeze({createWordingSession,MAX_BYTES,MAX_CANDIDATES,MAX_REPLACEMENT});
g.TLSWordingAssistantR172=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
