/* Taiwan-LLM-Sanitizer R17-P0 Document Trust Graph (MIT).
 * Off-line, explicit allowlist, metadata-only, read-only project link analysis.
 * No filesystem/network access in core, no editing, no HTML rendering of source.
 */
(function(global){
'use strict';
const VERSION='0.1.0', REQUEST='tls.repo-audit-request.v1', REPORT='tls.repo-integrity-report.v1';
const MAX_FILES=200,MAX_FILE_BYTES=1048576,MAX_TOTAL_BYTES=16777216,MAX_EDGES=10000;
const LOCALES=new Set(['zh-TW','zh-CN','en','ja','ko','es']);
const FORBIDDEN_PART=/^(?:\.|\.\.|\.env(?:\..*)?|\.git|\.svn|\.hg|\.ssh|node_modules|private|secrets?|credentials?|__pycache__)$/iu;
const supported=/\.md|\.markdown$/iu;
const codes=Object.freeze({PASS:'PASS',WARN:'WARN',BLOCK:'BLOCK',UNKNOWN:'UNKNOWN'});
const TEXT_ENCODER=new TextEncoder();
function fault(code){throw new Error('TLS_R17_'+code)}
function isPlain(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype}
function checkPath(p){
 if(typeof p!=='string'||p.length<1||p.length>240||p.startsWith('/')||p.includes('\\')||p.includes('\0')||/[\x00-\x1f\x7f]/u.test(p)||/^[A-Za-z]:/u.test(p)||p.startsWith('//'))fault('DENIED_PATH');
 const parts=p.split('/');
 if(parts.some(s=>!s||FORBIDDEN_PART.test(s)||s.startsWith('.')||s.endsWith(' ')||s.endsWith('.')||s==='..'))fault('DENIED_PATH');
 if(p.normalize('NFC')!==p)fault('AMBIGUOUS_PATH_NORMALIZATION');
 return p;
}
async function hash(text){
 // Reuse the already released R15/R15.1 hash implementation, including its
 // verified no-SubtleCrypto fallback, instead of adding another SHA library.
 let core=global.TLSProtectedR15;
 if(!core&&typeof require==='function')core=require('./protected_segments_r15.js');
 if(!core||typeof core.analyze!=='function')fault('HASH_ENGINE_NOT_PRESENT');
 const outcome=await core.analyze(text,'prompt');
 return outcome.input_sha256;
}
function lineContent(text){return text.split(/\r\n|\r|\n/u)}
function cleanHeading(raw){
 const s=raw.replace(/\s+#+\s*$/u,'').trim();
 if(!s||/[<>\[\]`{}\\*~]|\{#|&[a-z]+;/iu.test(s))return null;
 // Conservative GitHub-like slug subset; anything more complex returns UNKNOWN.
 const slug=s.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\p{Pc} \-]/gu,'').replace(/\s/gu,'-');
 return slug||null;
}
function scrubCodeAndHTML(lines){
 let fence=null,html=null,htmlDepth=0,front=false,first=true;let uncertain=false;const visible=[];
 for(let i=0;i<lines.length;i++){
  let s=lines[i];
  if(first){first=false;if(/^\ufeff?---\s*$/u.test(s)){front=true;visible.push(null);continue;}}
  if(front){if(/^(?:---|\.\.\.)\s*$/u.test(s))front=false;visible.push(null);continue;}
  if(fence){const f=s.match(/^ {0,3}(`{3,}|~{3,})\s*$/u);if(f&&f[1][0]===fence.char&&f[1].length>=fence.n)fence=null;visible.push(null);continue;}
  const f=s.match(/^ {0,3}(`{3,}|~{3,})/u);if(f){fence={char:f[1][0],n:f[1].length};visible.push(null);continue;}
  if(html){if(html==='comment'&&s.includes('-->'))html=null;
   else if(html!=='comment'){
     const opening=(s.match(new RegExp('<'+html+'\\b','giu'))||[]).length;
     const closing=(s.match(new RegExp('</'+html+'\\s*>','giu'))||[]).length;
     htmlDepth+=opening-closing;if(htmlDepth<=0){html=null;htmlDepth=0;}
   }
   visible.push(null);continue;
  }
  if(s.includes('<!--')){if(!s.includes('-->'))html='comment';visible.push(null);continue;}
  let m=s.match(/^\s*<(script|style|pre|div|section|table|details|textarea|iframe|svg)\b/iu);
  if(m){const tag=m[1].toLowerCase();if(!new RegExp('</'+tag+'\\s*>','iu').test(s)){html=tag;htmlDepth=1;}visible.push(null);continue;}
  if(/^(?: {4,}|\t)\S/u.test(s)){visible.push(null);continue;}
  visible.push(s);
 }
 if(fence||front||html)uncertain=true;
 return {visible,uncertain};
}
function headingsOf(lines){
 const headingCounts=new Map(),slugSet=new Set(),ambiguous={value:false};let prior=null;
 for(let i=0;i<lines.length;i++){
  const s=lines[i];if(s===null){prior=null;continue}
  let h=(s.match(/^ {0,3}#{1,6}[ \t]+(.+)$/u)||[])[1];
  if(!h&&prior&&/^ {0,3}(?:=+|-+)\s*$/u.test(s))h=prior;
  if(h!==undefined){const normalized=cleanHeading(h);
   if(normalized===null){ambiguous.value=true;}
   else{const count=headingCounts.get(normalized)||0;headingCounts.set(normalized,count+1);const slug=count?normalized+'-'+count:normalized;slugSet.add(slug);}
  }
  prior=s.trim()?s:null;
 }
 return {slugs:slugSet,ambiguous:ambiguous.value};
}
function scanLinks(lines){
 const links=[];let uncertainty=false;
 for(const original of lines){
  if(original===null)continue;
  let s=original;
  // Inline code is not a link source. Keep positions identical by blanking chars.
  s=s.replace(/(`+)(?:[^`]|(?!\1)`)*\1/gu,span=>' '.repeat(span.length));
  if(s.includes('`'))uncertainty=true;
  for(const x of s.matchAll(/<(?:https?:\/\/|mailto:)[^>\r\n]*>/giu))links.push({raw:x[0].slice(1,-1),kind:'autolink'});
  if(/<a\b[^>]*\bhref\s*=/iu.test(s))links.push({raw:'',kind:'html',unsupported:'INLINE_HTML_LINK_UNSUPPORTED'});
  // Ref definitions are currently unsupported, so do not treat them as PASS.
  if(/^ {0,3}\[[^\]]+\]:/u.test(s)){links.push({raw:'',kind:'reference',unsupported:'REFERENCE_DEFINITION_UNSUPPORTED'});continue;}
  for(let i=0;i<s.length;i++){
   if(s[i]!=='['||i>0&&s[i-1]==='\\')continue;
   let labelDepth=1,j=i+1;
   for(;j<s.length&&labelDepth;j++){if(s[j]==='\\'){j++;continue}if(s[j]==='[')labelDepth++;if(s[j]===']')labelDepth--;}
   if(labelDepth)continue;
   if(s[j]==='['){links.push({raw:'',kind:'reference',unsupported:'REFERENCE_LINK_UNSUPPORTED'});i=j;continue;}
   if(s[j]!=='('){
     const label=s.slice(i+1,j-1).trim();
     if(label&&!/^\s*[xX]?\s*$/u.test(label))links.push({raw:'',kind:'reference',unsupported:'REFERENCE_OR_BRACKET_UNSUPPORTED'});
     i=j-1;continue
   }
   let k=j+1,depth=1,out='',closed=false;
   for(;k<s.length;k++){
    const ch=s[k];if(ch==='\\'&&k+1<s.length){out+=s[++k];continue}
    if(ch==='('){depth++;if(depth>12){uncertainty=true;break;}out+=ch;continue}
    if(ch===')'){depth--;if(depth===0){closed=true;break}out+=ch;continue}
    out+=ch;
   }
   if(!closed){links.push({raw:'',kind:'inline',unsupported:'UNBALANCED_LINK_SYNTAX'});uncertainty=true;break;}
   let target=out.trim();
   if(target.startsWith('<')&&target.endsWith('>'))target=target.slice(1,-1);
   if(/\s/u.test(target)){links.push({raw:'',kind:'inline',unsupported:'LINK_TITLE_OR_UNENCODED_SPACE'});}
   else links.push({raw:target,kind:i>0&&s[i-1]==='!'?'image':'inline'});
   i=k;
  }
 }
 return {links,uncertainty};
}
function resolveLink(raw,from){
 if(!raw)return {kind:'UNKNOWN',reason:'EMPTY_LINK'};
 if(raw.endsWith('#'))return {kind:'UNKNOWN',reason:'EMPTY_FRAGMENT'};
 if(/^https?:\/\//iu.test(raw)||raw.startsWith('//'))return {kind:'UNKNOWN',reason:'EXTERNAL_UNCHECKED'};
 if(/^[a-z][a-z0-9+.-]*:/iu.test(raw))return {kind:raw.startsWith('mailto:')?'UNKNOWN':'BLOCK',reason:raw.startsWith('mailto:')?'EXTERNAL_UNCHECKED':'UNSAFE_SCHEME'};
 const [encodedPath,...hashParts]=raw.split('#');
 if(hashParts.length>1)return {kind:'UNKNOWN',reason:'MULTIPLE_FRAGMENTS'};
 if(/%(?:2f|5c|00)/iu.test(encodedPath))return {kind:'BLOCK',reason:'ENCODED_SEPARATOR'};
 let decoded=encodedPath,fragment=hashParts[0]||'';
 try{decoded=decodeURIComponent(decoded);fragment=decodeURIComponent(fragment)}catch(_){return {kind:'UNKNOWN',reason:'INVALID_PERCENT_ESCAPE'}}
 if(/%[a-f0-9]{2}/iu.test(decoded))return {kind:'UNKNOWN',reason:'MULTIPLE_PERCENT_DECODING'};
 if(/^[A-Za-z]:/u.test(decoded)||decoded.startsWith('/')||decoded.includes('\\')||/[\x00-\x1f\x7f]/u.test(decoded))return {kind:'BLOCK',reason:'OUTSIDE_ROOT'};
 if(fragment&&(/[\x00-\x1f\x7f]/u.test(fragment)||fragment.length>240))return {kind:'UNKNOWN',reason:'UNSUPPORTED_FRAGMENT'};
 let parts=from.split('/').slice(0,-1);
 if(decoded){for(const p of decoded.split('/')){
  if(p==='.'||p==='')continue;
  if(p==='..'){if(!parts.length)return {kind:'BLOCK',reason:'OUTSIDE_ROOT'};parts.pop();continue}
  if(p.startsWith('.')||FORBIDDEN_PART.test(p)||p.endsWith(' ')||p.endsWith('.'))return {kind:'BLOCK',reason:'DENIED_TARGET_PATH'};
  parts.push(p);
 }}else parts=from.split('/');
 let target=parts.join('/');
 try{checkPath(target)}catch(_){return {kind:'BLOCK',reason:'OUTSIDE_ROOT'}}
 return {kind:'LOCAL',target,fragment};
}
async function audit(input,options={}){
 if(!isPlain(input)||input.schema!==REQUEST||!Array.isArray(input.file_allowlist)||!Array.isArray(input.files))fault('INVALID_REQUEST');
 if(input.check_external!==false||input.network_requested!==false||input.locale!==undefined&&!LOCALES.has(input.locale))fault('UNAUTHORIZED_OPTION');
 if(input.file_allowlist.length===0||input.file_allowlist.length>MAX_FILES)fault('FILE_BUDGET');
 const allow=new Set();for(const p of input.file_allowlist){checkPath(p);if(!supported.test(p))fault('MARKDOWN_ONLY');if(allow.has(p))fault('DUPLICATE_ALLOWLIST');allow.add(p)}
 const content=new Map();let total=0;
 for(const file of input.files){
  if(!isPlain(file)||!allow.has(file.path)||content.has(file.path))fault('UNAUTHORIZED_FILE');
  if(file.missing===true){content.set(file.path,null);continue;}
  if(typeof file.text!=='string')fault('INVALID_DOCUMENT_TEXT');
  const bytes=TEXT_ENCODER.encode(file.text).length;
  if(bytes>MAX_FILE_BYTES||total+bytes>MAX_TOTAL_BYTES)fault('SIZE_BUDGET');
  if(file.text.includes('\0')||/\ud800(?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(file.text))fault('BINARY_OR_UNICODE');
  total+=bytes;content.set(file.path,file.text);
 }
 if(content.size!==allow.size)fault('ALLOWLIST_NOT_COMPLETE');
 const paths=[...allow].sort(), ids=new Map(), sources=[],state=new Map(),rawEdges=[];
 const idsUsed=new Set();for(const p of paths){const id='p'+(await hash('tls.r17.path.v1:'+p));if(idsUsed.has(id))fault('PATH_ID_COLLISION');idsUsed.add(id);ids.set(p,id)}
 const lower=new Map();for(const p of paths){const k=p.toLocaleLowerCase('und');if(!lower.has(k))lower.set(k,[]);lower.get(k).push(p)}
 for(const p of paths){const data=content.get(p),sha=data===null?null:await hash(data);
  const record={file_id:ids.get(p),relative_path_or_hash:options.include_paths===true?p:'sha256:'+ids.get(p).slice(1),source_sha256:sha,locale:input.locale||null,validation_status:data===null?'MISSING':'PRESENT'};
  sources.push(record);
  if(data===null){state.set(p,{exists:false});continue;}
  const lines=lineContent(data),scrub=scrubCodeAndHTML(lines),anchors=headingsOf(scrub.visible),links=scanLinks(scrub.visible);
  const uncertain=scrub.uncertain||links.uncertainty||anchors.ambiguous;
  if(uncertain)record.validation_status='PARSER_UNCERTAIN';
  state.set(p,{exists:true,anchors,uncertain,links:links.links});
 }
 for(const p of paths){const s=state.get(p);if(!s.exists)continue;
  for(const link of s.links){if(rawEdges.length>=MAX_EDGES)fault('EDGE_BUDGET');
   let decision='UNKNOWN',reason='UNVERIFIED',resolved,ref='';
   if(link.unsupported){reason=link.unsupported;}
   else{
    resolved=resolveLink(link.raw,p);ref=resolved.target||'';
    if(resolved.kind==='BLOCK'||resolved.kind==='UNKNOWN'){decision=resolved.kind;reason=resolved.reason;}
    else if(!allow.has(ref)){
     if(lower.has(ref.toLocaleLowerCase('und'))){decision='WARN';reason='CASE_MISMATCH_OR_COLLISION';}
     else{decision='UNKNOWN';reason='TARGET_NOT_IN_ALLOWLIST';}
    }else if((lower.get(ref.toLocaleLowerCase('und'))||[]).length>1){decision='UNKNOWN';reason='CASE_COLLISION';}
    else if(!state.get(ref).exists){decision='BLOCK';reason='MISSING_ALLOWLISTED_FILE';}
    else if(resolved.fragment){const target=state.get(ref);
     if(target.uncertain||!target.anchors||target.anchors.ambiguous){decision='UNKNOWN';reason='ANCHOR_PARSER_UNCERTAIN';}
     else if(!/^[\p{L}\p{N}\p{M}\p{Pc}\-]+$/u.test(resolved.fragment)){decision='UNKNOWN';reason='NONCANONICAL_ANCHOR';}
     else if(target.anchors.slugs.has(resolved.fragment)){decision='PASS';reason='LOCAL_ANCHOR_VERIFIED';}
     else{decision='BLOCK';reason='MISSING_LOCAL_ANCHOR';}
    }else{decision='PASS';reason='LOCAL_FILE_IN_ALLOWLIST';}
   }
   rawEdges.push({from_file_id:ids.get(p),target_file_id_or_hash:ref&&ids.has(ref)?ids.get(ref):'h'+(await hash(ref||link.raw||reason)),link_kind:link.kind,fragment_hash_or_normalized_id:resolved?.fragment?'h'+(await hash(resolved.fragment)):null,decision,reason_code:reason});
  }
 }
 // Missing allowlisted files have first-class BLOCK status even without a link.
 const summary={files_checked:paths.length,edges_checked:rawEdges.length,pass_count:0,warn_count:0,block_count:0,unknown_count:0};
 for(const e of rawEdges)summary[e.decision.toLowerCase()+'_count']++;
 const missing=sources.filter(x=>x.validation_status==='MISSING').length;summary.block_count+=missing;
 const uncertainFiles=sources.filter(x=>x.validation_status==='PARSER_UNCERTAIN').length;summary.unknown_count+=uncertainFiles;
 const request_sha256=await hash(JSON.stringify({schema:REQUEST,file_allowlist:paths,locale:input.locale||null,check_external:false,network_requested:false}));
 const snapshot_sha256=await hash(JSON.stringify(sources.map(x=>[x.file_id,x.source_sha256])));
 const overall=summary.block_count?'BLOCK':summary.unknown_count?'UNKNOWN':summary.warn_count?'WARN':'PASS';
 return {schema:REPORT,scanner_version:VERSION,request_sha256,snapshot_sha256,
  decision:overall,approval:'NONE',network_requested:false,transport:'NONE',contains_original_text:false,
  path_disclosure:options.include_paths===true?'EXPLICIT_DEVELOPER_OPT_IN':'HASHED',
  source_files:sources,edges:rawEdges,summary};
}
function compareSnapshots(older,current){
 if(!isPlain(older)||!isPlain(current)||older.schema!==REPORT||current.schema!==REPORT)return {decision:'BLOCK_STALE',reason_code:'INVALID_BASELINE'};
 if(older.request_sha256!==current.request_sha256||older.snapshot_sha256!==current.snapshot_sha256)return {decision:'BLOCK_STALE',reason_code:'SOURCE_OR_SCOPE_CHANGED'};
 return {decision:'PASS',reason_code:'SNAPSHOT_IDENTICAL'};
}
const API=Object.freeze({VERSION,REQUEST,REPORT,MAX_FILES,MAX_FILE_BYTES,MAX_TOTAL_BYTES,MAX_EDGES,checkPath,resolveLink,audit,compareSnapshots});
global.TLSDocumentTrustR17=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
