/* TLS R204: race-safe helpers for a manually operated offline review workbench.
 * Reuses the immutable R203 receipt schema and the unchanged R172 wording engine.
 * History contains only source-bound decision metadata, never source sentences.
 */
(function(root){'use strict';
const P=root.TLSReviewContinuityR203||(typeof require==='function'?require('./review_continuity_r203.js'):null);
if(!P)throw Error('TLS_R204_MISSING_R203');
const MAX_REVIEW_BYTES=65536,MAX_HISTORY=50;
const fail=code=>{throw Error('TLS_R204_'+code);};
const seal=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(seal);Object.freeze(x);}return x;};
function decodeUTF8(value,limit=MAX_REVIEW_BYTES){
 const bytes=value instanceof Uint8Array?value:value instanceof ArrayBuffer?new Uint8Array(value):null;
 if(!bytes||!Number.isSafeInteger(limit)||limit<1||bytes.length>limit)fail('BYTE_LIMIT');
 let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch(_){fail('INVALID_UTF8');}
 if(text.includes('\0'))fail('NUL_NOT_ALLOWED');return text;
}
function copyData(value,depth=0,seen=new Set()){
 if(depth>8)fail('PLAIN_DATA_DEPTH');
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(typeof value!=='object'||seen.has(value))fail('PLAIN_DATA_REQUIRED');
 const array=Array.isArray(value),proto=Object.getPrototypeOf(value);
 if(!array&&proto!==Object.prototype)fail('PLAIN_DATA_REQUIRED');
 if(array&&value.length>120)fail('PLAIN_DATA_LIMIT');
 seen.add(value);const result=array?[]:{};const ds=Object.getOwnPropertyDescriptors(value);
 for(const key of Reflect.ownKeys(ds)){
  if(array&&key==='length')continue;
  const d=ds[key];
  if(typeof key!=='string'||['__proto__','constructor','prototype'].includes(key)||!('value' in d)||!d.enumerable)fail('PLAIN_DATA_REQUIRED');
  if(array&&!/^(?:0|[1-9]\d*)$/.test(key))fail('PLAIN_DATA_REQUIRED');
  result[key]=copyData(d.value,depth+1,seen);
 }
 seen.delete(value);return result;
}
function freezePlan(untrusted){
 const plan=copyData(untrusted);P.validate(plan);
 if(new TextEncoder().encode(JSON.stringify(plan,null,2)).length>MAX_REVIEW_BYTES)fail('BYTE_LIMIT');
 return seal(plan);
}
// A small bounded JSON reader rejects duplicate keys before JSON.parse can hide them.
function parseReview(input){
 let text=typeof input==='string'?input:decodeUTF8(input);
 if(new TextEncoder().encode(text).length>MAX_REVIEW_BYTES)fail('BYTE_LIMIT');
 if(text.charCodeAt(0)===0xfeff)text=text.slice(1);
 let i=0,nodes=0;
 const ws=()=>{while(i<text.length&&/[\x20\t\r\n]/.test(text[i]))i++;};
 function str(){
  if(text[i]!=='"')fail('INVALID_JSON');const start=i++;
  while(i<text.length){const c=text[i++];if(c==='"'){try{return JSON.parse(text.slice(start,i));}catch(_){fail('INVALID_JSON');}}
   if(c==='\\'){if(i>=text.length)fail('INVALID_JSON');i++;}
  }fail('INVALID_JSON');
 }
 function read(depth){
  if(depth>8||++nodes>4096)fail('JSON_LIMIT');ws();const c=text[i];
  if(c==='"')return str();
  if(c==='{'){
   i++;ws();const out={},keys=new Set();if(text[i]==='}'){i++;return out;}
   for(;;){ws();const key=str();if(keys.has(key))fail('DUPLICATE_JSON_KEY');
    if(['__proto__','constructor','prototype'].includes(key))fail('PLAIN_DATA_REQUIRED');
    keys.add(key);ws();if(text[i++]!==':')fail('INVALID_JSON');out[key]=read(depth+1);ws();
    const end=text[i++];if(end==='}')return out;if(end!==',')fail('INVALID_JSON');
   }
  }
  if(c==='['){i++;ws();const out=[];if(text[i]===']'){i++;return out;}
   for(;;){if(out.length>=120)fail('JSON_LIMIT');out.push(read(depth+1));ws();const end=text[i++];if(end===']')return out;if(end!==',')fail('INVALID_JSON');}
  }
  for(const [word,value] of [['true',true],['false',false],['null',null]])if(text.startsWith(word,i)){i+=word.length;return value;}
  const m=/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
  if(!m)fail('INVALID_JSON');i+=m[0].length;const number=Number(m[0]);if(!Number.isFinite(number))fail('NONFINITE_JSON');return number;
 }
 const data=read(0);ws();if(i!==text.length)fail('INVALID_JSON');return freezePlan(data);
}
async function restore(session,untrusted){
 // Clone and freeze synchronously BEFORE the first asynchronous inspection.
 const owned=freezePlan(untrusted);return P.restore(session,owned);
}
function createClock(){let revision=0;return Object.freeze({bump:()=>++revision,valid:x=>x===revision});}
function createHistory(limit=MAX_HISTORY){
 if(!Number.isSafeInteger(limit)||limit<2||limit>MAX_HISTORY)fail('HISTORY_LIMIT');
 let rows=[],cursor=-1;
 const identity=p=>[p.source_sha256,p.catalog_sha256,p.overlay_sha256].join(':');
 return Object.freeze({
  record(untrusted){const p=freezePlan(untrusted);if(rows.length&&identity(rows[0])!==identity(p))fail('HISTORY_SOURCE');
   if(cursor>=0&&JSON.stringify(rows[cursor])===JSON.stringify(p))return;
   rows=rows.slice(0,cursor+1);rows.push(p);if(rows.length>limit)rows.shift();cursor=rows.length-1;
  },
  peek(direction){if(![-1,1].includes(direction)||cursor+direction<0||cursor+direction>=rows.length)fail('HISTORY_BOUNDARY');return rows[cursor+direction];},
  move(direction){if(![-1,1].includes(direction)||cursor+direction<0||cursor+direction>=rows.length)fail('HISTORY_BOUNDARY');cursor+=direction;},
  info:()=>Object.freeze({size:rows.length,undo:Math.max(0,cursor),redo:Math.max(0,rows.length-cursor-1)}),
  clear(){rows=[];cursor=-1;}
 });
}
function diffRows(source,snapshot){
 if(typeof source!=='string'||!snapshot||snapshot.state!=='READY'||!Array.isArray(snapshot.candidates))fail('DIFF_NOT_READY');
 const rows=[];let last=-1;
 for(const c of snapshot.candidates){
  if(c.choice!=='CONFIRM')continue;
  const option=c.options.find(o=>o.id===c.selected_option_id);
  if(c.resolution!=='CONTEXT_REQUIRED'||!option||!Number.isSafeInteger(c.start)||!Number.isSafeInteger(c.end)||c.start<last||c.start<0||c.end>source.length||source.slice(c.start,c.end)!==c.original_text)fail('DIFF_ANCHOR');
  rows.push(Object.freeze({id:c.id,start:c.start,end:c.end,line:source.slice(0,c.start).split(/\r\n|\r|\n/).length,
   before:c.original_text,after:option.replacement,context:option.context_label}));last=c.end;
 }
 return Object.freeze(rows);
}
function filterCandidates(candidates,mode='all',query=''){
 if(!['all','unselected','confirmed','kept','blocked'].includes(mode)||typeof query!=='string'||query.length>200)fail('FILTER');
 const q=query.trim().toLowerCase();return candidates.filter(c=>{
  const blocked=['BLOCKED','LIMITED'].includes(c.resolution);
  const state=blocked?'blocked':c.choice==='CONFIRM'?'confirmed':c.choice==='KEEP_ORIGINAL'?'kept':'unselected';
  return (mode==='all'||mode===state)&&(!q||[c.original_text,...c.options.map(o=>o.replacement+' '+o.context_label)].some(v=>v.toLowerCase().includes(q)));
 });
}
const API=Object.freeze({MAX_REVIEW_BYTES,MAX_HISTORY,decodeUTF8,parseReview,freezePlan,restore,createClock,createHistory,diffRows,filterCandidates});
root.TLSReviewWorkbenchR204=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
