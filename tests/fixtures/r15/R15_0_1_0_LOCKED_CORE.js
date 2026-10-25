/* Taiwan-LLM-Sanitizer R15: offline, immutable typed protected segments (MIT).
 * Preview only: no transport, no model, no filesystem changes, no approval.
 * Positions are UTF-16 code-unit offsets, [start,end), not bytes or code points.
 */
(function(global){
'use strict';
const SCHEMA='tls.structured-segments.v1';
const MAX_BYTES=1048576, MAX_SEGMENTS=20000,MAX_EDITS=120,MAX_REPLACEMENT=1000;
const FIELDS=new Set(['text','description','summary','message','label','title','caption','help','tooltip','body','instructions','hint','placeholder_text']);
const BLOCKED=new Set(['code','script','source_code','html','css','json','key','id','type','role','path','url','uri','href','src','schema','$schema','pattern','regex','model','locale','language','checksum','signature','token','api_key','password','secret','command','function','function_name','example_code']);
const ROLE_RE=/^\s*(?:system|developer|assistant|user|tool|function|instruction|context)\s*[:：]/iu;
const DANGEROUS=/(?:\{\{[^}\r\n]*\}\}|\$\{[^}\r\n]*\}|\$[A-Z][A-Z\d_]*|https?:\/\/|www\.|--[A-Za-z][\w-]*)/u;
const NEWLINES=/\r\n|\r|\n/gu;
function plainObject(x){return x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;}
function fail(code){throw new Error('TLS_R15_'+code);}
function byteLength(text){return new TextEncoder().encode(text).length;}
function pureSHA256(bytes){
 // Offline SHA-256 for browser contexts where SubtleCrypto is absent (for example about:blank test fixtures).
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
 0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
 0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
 0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
 0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
 0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
 0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
 0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
                          0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
 const n=bytes.length,padLen=Math.ceil((n+9)/64)*64,b=new Uint8Array(padLen);
 b.set(bytes);b[n]=0x80;
 const view=new DataView(b.buffer);
 view.setUint32(padLen-8,0,false);view.setUint32(padLen-4,(n*8)>>>0,false);
 const r=(x,k)=>(x>>>k)|(x<<(32-k));
 for(let block=0;block<padLen;block+=64){
  const w=new Uint32Array(64);
  for(let i=0;i<16;i++)w[i]=view.getUint32(block+i*4,false);
  for(let i=16;i<64;i++){
   const a=w[i-15],c=w[i-2];
   const s0=r(a,7)^r(a,18)^(a>>>3),s1=r(c,17)^r(c,19)^(c>>>10);
   w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
  }
  let [a,c,d,e,f,g,h,j]=H;
  for(let i=0;i<64;i++){
   const S1=r(f,6)^r(f,11)^r(f,25),ch=(f&g)^(~f&h);
   const t1=(j+S1+ch+K[i]+w[i])>>>0;
   const S0=r(a,2)^r(a,13)^r(a,22),maj=(a&c)^(a&d)^(c&d);
   const t2=(S0+maj)>>>0;
   j=h;h=g;g=f;f=(e+t1)>>>0;e=d;d=c;c=a;a=(t1+t2)>>>0;
  }
  const t=[a,c,d,e,f,g,h,j];for(let i=0;i<8;i++)H[i]=(H[i]+t[i])>>>0;
 }
 return Array.from(H,x=>x.toString(16).padStart(8,'0')).join('');
}
async function hash(text){
 const data=new TextEncoder().encode(text);
 if(global.crypto&&global.crypto.subtle){const result=new Uint8Array(await global.crypto.subtle.digest('SHA-256',data));return Array.from(result,x=>x.toString(16).padStart(2,'0')).join('');}
 if(typeof require==='function')return require('node:crypto').createHash('sha256').update(data).digest('hex');
 return pureSHA256(data);
}
function checkInput(source,format){
 if(typeof source!=='string'||!['markdown','json','prompt'].includes(format))fail('INVALID_FORMAT_OR_TEXT');
 // TextEncoder normalizes unpaired UTF-16 surrogates to the replacement character.
 // Reject those inputs to prevent non-identical sources sharing the same SHA256.
 for(let i=0;i<source.length;i++){
  const n=source.charCodeAt(i);
  if(n>=0xD800&&n<=0xDBFF){const next=source.charCodeAt(++i);if(!(next>=0xDC00&&next<=0xDFFF))fail('UNPAIRED_SURROGATE');}
  else if(n>=0xDC00&&n<=0xDFFF)fail('UNPAIRED_SURROGATE');
 }
 const length=byteLength(source);if(length>MAX_BYTES)fail('INPUT_TOO_LARGE');
 if(source.includes('\0'))fail('INPUT_BINARY_REJECTED');
 return length;
}
function buildCollector(source){
 const rows=[];let cursor=0;
 function add(start,end,type,policy,reason){
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<cursor||end>source.length||start>end)fail('INVALID_SEGMENT_RANGE');
  if(start>cursor)push(cursor,start,'structural','PROTECT','SYNTAX_OR_WHITESPACE');
  if(end>start)push(start,end,type,policy,reason);
  cursor=end;
 }
 function push(start,end,type,policy,reason){
  const prev=rows[rows.length-1];
  if(prev&&prev.end===start&&prev.type===type&&prev.policy===policy&&prev.reason===reason)prev.end=end;
  else rows.push({start,end,type,policy,reason});
  if(rows.length>MAX_SEGMENTS)fail('TOO_MANY_SEGMENTS');
 }
 function finish(){
  if(cursor<source.length)push(cursor,source.length,'structural','PROTECT','SYNTAX_OR_WHITESPACE');
  return rows.map((r,i)=>({...r,id:'s'+String(i).padStart(5,'0')}));
 }
 return {add,finish};
}
function names(){
 let api=global.TLSNames;
 if(!api&&typeof require==='function'){try{api=require('./entities.js');}catch(_){} }
 return api&&typeof api.find==='function'?api:null;
}
function scanPlain(source,start,end,c,kind){
 if(end<=start)return;
 const list=names()?.find(source.slice(start,end))||[];
 const named=new Map(list.map(x=>[start+x.start,start+x.end]));
 let i=start;
 while(i<end){
  if(named.has(i)){const bound=named.get(i);if(bound<=end){c.add(i,bound,'named_entity','PROTECT','PROTECTED_PRODUCT_NAME');i=bound;continue;}}
  const tail=source.slice(i,end);let match=null,typ='literal',why='PROTECTED_MARKER';
  if(tail.startsWith('{{'))match=tail.match(/^\{\{[^}\r\n]{0,160}\}\}/u);
  if(!match&&tail.startsWith('${'))match=tail.match(/^\$\{[^}\r\n]{0,160}\}/u);
  if(!match&&tail.startsWith('$'))match=tail.match(/^\$[A-Z][A-Z\d_]*/u);
  if(match){typ='placeholder';why='TEMPLATE_VARIABLE';}
  if(!match&&tail.startsWith('--')){match=tail.match(/^--[A-Za-z][\w-]*/u);typ='cli_flag';why='COMMAND_OPTION';}
  if(!match&&(tail.startsWith('https://')||tail.startsWith('http://')||tail.startsWith('www.'))){match=tail.match(/^(?:https?:\/\/|www\.)[^\s\[\]<>"'`|]+/u);typ='url';why='URL_PRESERVED';}
  if(!match&&(tail.startsWith('{{')||tail.startsWith('${')))fail('UNCLOSED_TEMPLATE');
  if(!match&&(kind==='markdown'||kind==='prompt')&&tail[0]==='`'){
   const run=tail.match(/^`+/u)[0],from=i+run.length;
   const close=source.indexOf(run,from);
   if(close<0||close+run.length>end)fail('UNCLOSED_INLINE_CODE');
   match=[source.slice(i,close+run.length)];typ='inline_code';why='INLINE_CODE';
  }
  if(!match&&kind==='markdown'&&tail.startsWith('![')){
   match=tail.match(/^!\[[^\]\r\n]*\]\([^\)\r\n]*\)/u);
   if(!match)fail('UNBALANCED_IMAGE_SYNTAX');typ='link';why='IMAGE_SOURCE';
  }
  if(!match&&kind==='markdown'&&tail[0]==='['){
   match=tail.match(/^\[[^\]\r\n]*\]\([^\)\r\n]*\)/u);
   if(!match)fail('UNKNOWN_MARKDOWN_REFERENCE');typ='link';why='LINK_DESTINATION_AND_LABEL';
  }
  if(!match&&kind==='markdown'&&tail[0]==='<'){
   match=tail.match(/^<[^>\r\n]*>/u);
   if(!match)fail('UNCLOSED_HTML_OR_AUTOLINK');typ='html';why='HTML_OR_AUTOLINK';
  }
  if(!match&&kind==='markdown'&&tail[0]==='\\'){
   match=tail.slice(0,2)?[tail.slice(0,2)]:null;typ='escape';why='MARKDOWN_ESCAPE';
  }
  if(!match&&(tail[0]==='|'&&kind==='markdown')){match=['|'];typ='table_pipe';why='TABLE_STRUCTURE';}
  if(!match&&kind==='markdown'&&/^[*_~#\[\]>]/u.test(tail)){match=[tail[0]];typ='markdown_token';why='MARKDOWN_MARKER';}
  if(match){c.add(i,i+match[0].length,typ,'PROTECT',why);i+=match[0].length;continue;}
  const nextSpecial=(pos)=>{const s=source[pos];return s==='`'||s==='{'||s==='$'||s==='-'||s==='h'||s==='w'||(kind==='markdown'&&'![<\\|*_~#]>'.includes(s))||named.has(pos);};
  let j=i+1;
  while(j<end&&!nextSpecial(j))j++;
  const chunk=source.slice(i,j);
  if(!chunk.trim())c.add(i,j,'whitespace','PROTECT','WHITESPACE');
  else{
   const first=chunk.search(/\S/u),last=chunk.search(/\s*$/u);
   if(first>0)c.add(i,i+first,'whitespace','PROTECT','WHITESPACE');
   const actualStart=i+Math.max(0,first),actualEnd=i+last;
   if(actualEnd>actualStart)c.add(actualStart,actualEnd,'prose','EDITABLE','LOCAL_TEXT_PREVIEW_ONLY');
   if(actualEnd<j)c.add(actualEnd,j,'whitespace','PROTECT','WHITESPACE');
  }
  i=j;
 }
}
function linesOf(source){
 const lines=[],re=/(?:[^\r\n]*)(?:\r\n|\r|\n|$)/gu;let m;
 while((m=re.exec(source))!==null){if(m[0]==='')break;lines.push({start:m.index,text:m[0],end:m.index+m[0].length});}
 return lines;
}
function scanDocument(source,format,c){
 const lines=linesOf(source);let fence=null,front=false,first=true;
 for(const row of lines){
  const {start,end}=row,line=row.text;
  const raw=line.replace(/(?:\r\n|\r|\n)$/u,''),contentEnd=start+raw.length;
  let reason=null,match;
  if(first){first=false;if(raw.startsWith('\ufeff')){c.add(start,start+1,'bom','PROTECT','BYTE_ORDER_MARK');}}
  const text=source.slice(start+(start===0&&raw.startsWith('\ufeff')?1:0),contentEnd),s=start+(start===0&&raw.startsWith('\ufeff')?1:0);
  if(front){reason='FRONTMATTER';if(/^(?:---|\.\.\.)\s*$/u.test(text))front=false;}
  else if(fence){reason='CODE_FENCE_BODY';match=text.match(/^ {0,3}(`{3,}|~{3,})(?:\s*)$/u);if(match&&match[1][0]===fence.char&&match[1].length>=fence.size)fence=null;}
  else if((format==='markdown'||format==='prompt')&&(match=text.match(/^ {0,3}(`{3,}|~{3,})/u))){fence={char:match[1][0],size:match[1].length};reason='CODE_FENCE';}
  else if(format==='markdown'&&start===0&&/^(?:---|\+\+\+)\s*$/u.test(text)){front=true;reason='FRONTMATTER';}
  else if(format==='markdown'&&(/^\s{4,}\S/u.test(text)||/^\t/u.test(text)))reason='INDENTED_CODE';
  else if(format==='markdown'&&(/^\s{0,3}#{1,6}\s/u.test(text)||/^\s{0,3}\[[^\]]+\]:/u.test(text)))reason='HEADING_OR_REFERENCE';
  else if(format==='markdown'&&(/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/u.test(text)||/^\s*\|?\s*:?-{3,}/u.test(text)))reason='THEMATIC_OR_TABLE_RULE';
  else if(format==='markdown'&&(/^\s*<!--/u.test(text)||/^\s*<(?:script|style|div|pre|table|section|iframe|details|svg)\b/iu.test(text)))reason='HTML_BLOCK';
  else if(format==='prompt'&&(ROLE_RE.test(text)||/^\s*<\/?(?:system|developer|assistant|user|tool|function)\b/iu.test(text)))reason='PROMPT_ROLE_BOUNDARY';
  if(reason)c.add(s,contentEnd,'block','PROTECT',reason);
  else{
   let prefix='';if(format==='markdown')prefix=(text.match(/^\s{0,3}(?:>\s?|[-+*]\s+|\d+[.)]\s+)/u)||[])[0]||'';
   if(prefix)c.add(s,s+prefix.length,'markdown_token','PROTECT','BLOCK_PREFIX');
   scanPlain(source,s+prefix.length,contentEnd,c,format);
  }
  if(contentEnd<end)c.add(contentEnd,end,'newline','PROTECT','LINE_ENDING');
 }
 if(fence)fail('UNCLOSED_CODE_FENCE');
 if(front)fail('UNCLOSED_FRONTMATTER');
}
function scanJSON(source,c){
 try{JSON.parse(source.replace(/^\ufeff/u,''));}catch(_){fail('INVALID_JSON');}
 const stack=[];let i=0;
 while(i<source.length){
  const ch=source[i],top=stack[stack.length-1];
  if(ch==='"'){
   const start=i++;let escaped=false;
   while(i<source.length){const v=source[i++];if(escaped){escaped=false;continue}if(v==='\\'){escaped=true;continue}if(v==='"')break;}
   if(source[i-1]!=='"')fail('INVALID_JSON_STRING');
   const end=i,inner=source.slice(start+1,end-1),decoded=JSON.parse(source.slice(start,end));
   let k=i;while(/\s/u.test(source[k]||'')&&k<source.length)k++;
   const isKey=source[k]===':';
   if(isKey){
    if(!top||top.type!=='object')fail('INVALID_JSON_KEY_SCOPE');
    if(['__proto__','prototype','constructor'].includes(decoded))fail('DANGEROUS_JSON_KEY');
    if(top.keys.has(decoded))fail('DUPLICATE_JSON_KEY');
    top.keys.add(decoded);top.key=decoded;
   }
   const safe=!isKey&&top?.type==='object'&&!top.unsafe&&FIELDS.has(top.key)&&!BLOCKED.has(top.key)
    &&!inner.includes('\\')&&!DANGEROUS.test(decoded)&&!/[<>`\[\]{}]/u.test(decoded)&&decoded.trim().length>0;
   c.add(start,start+1,'json_quote','PROTECT','JSON_SYNTAX');
   c.add(start+1,end-1,isKey?'json_key':safe?'json_string_value':'json_value',safe?'EDITABLE':'PROTECT',isKey?'JSON_KEY_IMMUTABLE':safe?'JSON_VALUE_PREVIEW_ONLY':'UNKNOWN_OR_ESCAPED_VALUE');
   c.add(end-1,end,'json_quote','PROTECT','JSON_SYNTAX');
   continue;
  }
  if(ch==='{'||ch==='['){
   const parent=top;const unsafe=Boolean(parent?.unsafe||parent?.type==='object'&&BLOCKED.has(parent.key));
   stack.push({type:ch==='{'?'object':'array',key:null,unsafe,keys:new Set()});
  }else if(ch==='}'||ch===']')stack.pop();
  else if(ch===','&&top?.type==='object')top.key=null;
  i++;
 }
}
function rejected(source,format,bytes,sha,err){
 return {schema:SCHEMA,format,input_sha256:sha,offset_unit:'utf16',input_bytes:bytes,
  segments:source.length?[{id:'s00000',start:0,end:source.length,type:'unsafe_document',policy:'PROTECT',reason:err}]:[],
  protected_count:source.length?1:0,mutable_count:0,validation:{status:'REJECTED',errors:[err]},approval:'NONE'};
}
async function analyze(source,format){
 const bytes=checkInput(source,format),sha=await hash(source),c=buildCollector(source);
 try{
  if(format==='json')scanJSON(source,c);else scanDocument(source,format,c);
  const segments=c.finish();const count=segments.filter(s=>s.policy==='EDITABLE').length;
  return {schema:SCHEMA,format,input_sha256:sha,offset_unit:'utf16',input_bytes:bytes,
   segments,protected_count:segments.length-count,mutable_count:count,validation:{status:'OK',errors:[]},approval:'NONE'};
 }catch(error){const code=String(error?.message||'').startsWith('TLS_R15_')?error.message:'TLS_R15_INVALID_DOCUMENT';return rejected(source,format,bytes,sha,code);}
}
function safeReplacement(s,format){return typeof s==='string'&&s.length<=MAX_REPLACEMENT&&s.trim().length>0
 &&!/[\x00-\x1f\x7f<>`\[\]{}]/u.test(s)&&!DANGEROUS.test(s)
 &&!/[\u202a-\u202e\u2066-\u2069\u200e\u200f]/u.test(s)
 &&!(format==='markdown'&&/[\*_~|\\]/u.test(s))
 &&!/^\s*(?:#{1,6}\s|[-*_]{3,}\s*$|>\s|(?:[-+*]|\d+[.)])\s)/u.test(s);
}
function structuralMatch(a,b){
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>structuralMatch(x,b[i]));
 if(a&&b&&typeof a==='object'&&typeof b==='object'){
  const x=Object.keys(a),y=Object.keys(b);
  return x.length===y.length&&x.every((k,i)=>k===y[i]&&structuralMatch(a[k],b[k]));
 }
 return typeof a===typeof b;
}
async function preview(source,analysis,edits){
 if(typeof source!=='string'||!plainObject(analysis)||analysis.schema!==SCHEMA||analysis.approval!=='NONE'
   ||analysis.validation?.status!=='OK'||analysis.offset_unit!=='utf16')fail('PREVIEW_INVALID_ANALYSIS');
 if(await hash(source)!==analysis.input_sha256)fail('PREVIEW_SOURCE_HASH_MISMATCH');
 const check=await analyze(source,analysis.format);
 if(check.validation.status!=='OK'||JSON.stringify(check.segments)!==JSON.stringify(analysis.segments))fail('PREVIEW_ANALYSIS_TAMPERED');
 if(!Array.isArray(edits)||edits.length>MAX_EDITS)fail('TOO_MANY_EDITS');
 const mutable=new Map(analysis.segments.filter(x=>x.policy==='EDITABLE').map(x=>[x.id,x]));
 const seen=new Set();let result='',pos=0,diff=[];
 for(const edit of [...edits].sort((x,y)=>(mutable.get(x.id)?.start??Infinity)-(mutable.get(y.id)?.start??Infinity))){
  if(!plainObject(edit)||Object.keys(edit).some(k=>!['id','replacement'].includes(k))||!mutable.has(edit.id)||seen.has(edit.id))fail('PREVIEW_INVALID_TARGET');
  seen.add(edit.id);const segment=mutable.get(edit.id);
  if(!safeReplacement(edit.replacement,analysis.format))fail('PREVIEW_UNSAFE_REPLACEMENT');
  const old=source.slice(segment.start,segment.end);
  let replacement=edit.replacement;
  if(analysis.format==='json')replacement=JSON.stringify(replacement).slice(1,-1);
  if(replacement===old)continue;
  result+=source.slice(pos,segment.start)+replacement;pos=segment.end;
  diff.push({id:edit.id,start:segment.start,end:segment.end,type:segment.type,originalLength:old.length,newLength:replacement.length});
 }
 result+=source.slice(pos);
 if(analysis.format==='json'){
  let before,after;try{before=JSON.parse(source.replace(/^\ufeff/u,''));after=JSON.parse(result.replace(/^\ufeff/u,''));}catch(_){fail('PREVIEW_JSON_INVALID');}
  if(!structuralMatch(before,after))fail('PREVIEW_JSON_STRUCTURE_CHANGED');
 }
 if(byteLength(result)>MAX_BYTES)fail('PREVIEW_SIZE_LIMIT');
 return {schema:'tls.structured-preview.v1',status:'SAFE_PREVIEW_NOT_APPLIED',input_sha256:analysis.input_sha256,
  preview_sha256:await hash(result),approval:'NONE',change_count:diff.length,changes:diff,preview_text:result};
}
function publicReport(analysis){
 if(!plainObject(analysis)||analysis.schema!==SCHEMA)fail('INVALID_REPORT');
 const {schema,format,input_sha256,offset_unit,input_bytes,protected_count,mutable_count,segments,validation,approval}=analysis;
 return {schema,format,input_sha256,offset_unit,input_bytes,protected_count,mutable_count,segments,validation,approval,
  contains_original_text:false,contains_replacement_text:false,transport:'NONE'};
}
const API=Object.freeze({SCHEMA,MAX_BYTES,MAX_EDITS,analyze,preview,publicReport});
global.TLSProtectedR15=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
