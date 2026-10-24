/* Taiwan-LLM-Sanitizer R9: explicit, reversible personal vocabulary preview. MIT. */
(function(global){
'use strict';
const SCHEMA='tls.personal-glossary.v1',LOCALE='zh-TW',MAX_ENTRIES=200,MAX_JSON_BYTES=65536,MAX_INPUT=12000;
const DOMAINS=Object.freeze(['general','ui','software','engineering','ai','security','ecommerce',
 'finance','food','travel','education','medicine','media','office','public','games','industry']);
const DOMAIN_SET=new Set(DOMAINS);
function plainTerm(value,field,max){
 if(typeof value!=='string')throw new TypeError(field+'_NOT_STRING');
 const text=value.trim();
 if(!text||text.length>max)throw new RangeError(field+'_INVALID_LENGTH');
 // Exclude structural hazards only; no regional or political language bans.
 if(/[\u0000-\u001f\u007f<>{}\x60]/u.test(text)||/https?:\/\//iu.test(text))
  throw new Error(field+'_STRUCTURAL_HAZARD');
 return text;
}
function validRecord(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new TypeError('INVALID_ENTRY');
 const allowed=new Set(['source','replacement','domain','action','note']);
 if(Object.keys(raw).some(k=>!allowed.has(k)))throw new Error('UNKNOWN_ENTRY_FIELD');
 const source=plainTerm(raw.source,'SOURCE',90);
 if(!DOMAIN_SET.has(raw.domain))throw new Error('UNKNOWN_DOMAIN');
 if(!['keep','replace'].includes(raw.action))throw new Error('UNKNOWN_ACTION');
 const replacement=raw.action==='replace'?plainTerm(raw.replacement,'REPLACEMENT',120):'';
 if(raw.action==='keep'&&raw.replacement!==undefined&&raw.replacement!=='')
  throw new Error('KEEP_CANNOT_REPLACE');
 if(raw.note!==undefined&&(typeof raw.note!=='string'||raw.note.length>160||
  /[\u0000-\u001f\u007f<>]/u.test(raw.note)))throw new Error('INVALID_NOTE');
 return {source,domain:raw.domain,action:raw.action,replacement,
  ...(raw.note?{note:raw.note.trim()}:{})};
}
function key(source,domain){return domain+'\u0000'+source.toLocaleLowerCase('en-US');}
function normalizeRows(rows){
 if(!Array.isArray(rows)||rows.length>MAX_ENTRIES)throw new RangeError('TOO_MANY_ENTRIES');
 const found=new Set(),out=[];
 for(const raw of rows){
  const entry=validRecord(raw),k=key(entry.source,entry.domain);
  if(found.has(k))throw new Error('DUPLICATE_ENTRY');
  found.add(k);out.push(entry);
 }
 return out.sort((a,b)=>a.domain.localeCompare(b.domain,'en')||
  a.source.localeCompare(b.source,'en'));
}
function importProfile(payload){
 if(typeof payload!=='string'||new TextEncoder().encode(payload).length>MAX_JSON_BYTES)
  throw new RangeError('INVALID_PROFILE_SIZE');
 let source;try{source=JSON.parse(payload);}catch(_){throw new Error('INVALID_JSON');}
 if(!source||typeof source!=='object'||Array.isArray(source))throw new Error('INVALID_PROFILE');
 if(Object.keys(source).some(k=>!['schema','locale','entries'].includes(k)))
  throw new Error('UNKNOWN_PROFILE_FIELD');
 if(source.schema!==SCHEMA||source.locale!==LOCALE)throw new Error('INCOMPATIBLE_PROFILE');
 return normalizeRows(source.entries);
}
function exportProfile(rows){
 const entries=normalizeRows(rows),result=JSON.stringify({schema:SCHEMA,locale:LOCALE,entries},null,2)+'\n';
 if(new TextEncoder().encode(result).length>MAX_JSON_BYTES)throw new RangeError('PROFILE_SIZE_LIMIT');
 return result;
}
function upsert(rows,raw){
 const next=validRecord(raw),k=key(next.source,next.domain);
 return normalizeRows([...normalizeRows(rows).filter(x=>key(x.source,x.domain)!==k),next]);
}
function remove(rows,source,domain){
 return normalizeRows(rows).filter(x=>key(x.source,x.domain)!==key(source,domain));
}
function find(rows,source,domain){
 if(!DOMAIN_SET.has(domain))return null;
 return normalizeRows(rows).find(x=>key(x.source,x.domain)===key(source,domain))||null;
}
function reviewRows(rows){
 return normalizeRows(rows).filter(x=>x.action==='replace').map((x,i)=>({
  id:'personal_'+(i+1),from:x.source,to:x.replacement,domain:x.domain,
  scope:x.domain,review_status:'candidate',user_authored:true
 }));
}
function preview(text,suggestions,choices=[]){
 if(typeof text!=='string'||text.length>MAX_INPUT)throw new RangeError('INVALID_PREVIEW_TEXT');
 if(!Array.isArray(suggestions)||!Array.isArray(choices))throw new TypeError('INVALID_PREVIEW_INPUT');
 const selected=new Map();
 for(const choice of choices){
  if(!choice||!Number.isInteger(choice.index)||selected.has(choice.index))
   throw new Error('DUPLICATE_OR_INVALID_CHOICE');
  const s=suggestions[choice.index];
  if(!s||!Array.isArray(s.alternatives)||!s.alternatives.some(x=>
    x.to===choice.to&&x.domain===choice.domain))throw new Error('CHOICE_NOT_IN_REVIEW');
  selected.set(choice.index,choice);
 }
 let cursor=0,out='',changes=[];
 const order=suggestions.map((item,index)=>({item,index})).sort((a,b)=>a.item.start-b.item.start);
 for(const {item,index} of order){
  if(!Number.isInteger(item.start)||!Number.isInteger(item.end)||
   item.start<cursor||item.end>text.length||item.start>=item.end||
   text.slice(item.start,item.end)!==item.found)throw new Error('REVIEW_SPAN_MISMATCH');
  out+=text.slice(cursor,item.start);
  const choice=selected.get(index),result=choice?choice.to:item.found;
  out+=result;
  if(result!==item.found)changes.push({start:item.start,original:item.found,
   suggested:result,domain:choice.domain,review_required:true});
  cursor=item.end;
 }
 out+=text.slice(cursor);
 return {text:out,changes,changed:changes.length,originalUnmodified:true,
  explicitlyChosen:selected.size};
}
const api=Object.freeze({SCHEMA,LOCALE,DOMAINS,MAX_ENTRIES,MAX_JSON_BYTES,
 validRecord,normalizeRows,importProfile,exportProfile,upsert,remove,find,reviewRows,preview});
global.TLSPersonalGlossary=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
