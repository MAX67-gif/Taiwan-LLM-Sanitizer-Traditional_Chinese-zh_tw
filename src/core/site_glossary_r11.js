/* Taiwan-LLM-Sanitizer R11: manual, site-session-only personal glossary. MIT.
 * R5 runtime is not changed or called from this module. No network, storage or auto-apply.
 */
(function(global){
'use strict';
const personal=global.TLSPersonalGlossary || (typeof require==='function'?require('./user_terms_r9.js'):null);
const names=global.TLSNames || (typeof require==='function'?require('./entities.js'):null);
if(!personal)throw new Error('R11_REQUIRES_R9_SCHEMA');
const MAX_ROWS=200,MAX_HITS=100,MAX_NODES=4500,MAX_NODE_LENGTH=1400;
const MAX_CONTEXT=72;
const EXCLUDED='script,style,noscript,textarea,input,select,option,pre,code,kbd,samp,svg,canvas,math,template,[contenteditable],[translate="no"],[data-no-translate],[data-tls-ui],.monaco-editor,.cm-editor,[hidden],[inert],[aria-hidden="true"],[role="textbox"],[role="searchbox"],[role="combobox"],[role="alert"],[role="status"],[role="log"],[role="feed"],[data-sensitive],[data-private],[data-chat],[data-player-id],[class*="chat"],[id*="chat"],[class*="player"],[id*="player"]';
const STRUCTURE=/[<>{}\x60]|https?:\/\/|\$\{|\{\{|<%|%(?:\d+\$)?[sdif]/u;
const LATIN=/[A-Za-z0-9_]/u;
function domainValid(d){return personal.DOMAINS.includes(d)||d==='auto';}
function goodNode(node,doc){
 if(!node||node.nodeType!==3||!node.isConnected||!node.parentElement)return false;
 const parent=node.parentElement;
 try{
  if(parent.closest(EXCLUDED)||parent.isContentEditable)return false;
  for(let el=parent;el&&el.nodeType===1;el=el.parentElement){
   if(el.hasAttribute('hidden')||el.getAttribute('aria-hidden')==='true'||el.inert)return false;
   const win=doc.defaultView;
   const css=win?.getComputedStyle?.(el);
   if(css && (css.display==='none'||css.visibility==='hidden'||css.visibility==='collapse'))return false;
  }
  return true;
 }catch(_){return false;}
}
function selectableRows(rows,domain){
 if(!domainValid(domain))throw new Error('INVALID_DOMAIN');
 const normalized=personal.normalizeRows(rows);
 const chosen=new Map();
 // Domain-specific decisions override general ones, including KEEP.
 for(const row of normalized){
  if(row.domain!=='general'&&row.domain!==domain)continue;
  const k=row.source.toLocaleLowerCase('en-US');
  const prior=chosen.get(k);
  if(!prior||row.domain===domain)chosen.set(k,row);
 }
 return [...chosen.values()].filter(row=>row.action==='replace'&&row.replacement!==row.source)
  .sort((a,b)=>b.source.length-a.source.length||a.source.localeCompare(b.source,'en'));
}
function hitInProtectedName(text,start,end){
 if(!names?.find)return false;
 for(const span of names.find(text)){if(start<span.end&&end>span.start)return true;}
 return false;
}
function collectTextHits(text,rows){
 if(typeof text!=='string'||text.length>MAX_NODE_LENGTH||STRUCTURE.test(text))return [];
 const all=[];
 for(const row of rows){
  const ascii=/[A-Za-z]/u.test(row.source)&&!/[\u3400-\u9fff]/u.test(row.source);
  const hay=ascii?text.toLocaleLowerCase('en-US'):text;
  const needle=ascii?row.source.toLocaleLowerCase('en-US'):row.source;
  let pos=0;
  while((pos=hay.indexOf(needle,pos))!==-1){
   const end=pos+needle.length;
   if((!ascii||(!LATIN.test(text[pos-1]||'')&&!LATIN.test(text[end]||''))) &&
       !hitInProtectedName(text,pos,end)){
    all.push({start:pos,end,from:text.slice(pos,end),to:row.replacement,domain:row.domain});
   }
   pos=end;
  }
 }
 all.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
 const result=[];let end=0;
 for(const h of all){if(h.start>=end){result.push(h);end=h.end;}}
 return result;
}
function createSession(doc){
 if(!doc?.documentElement||!doc.createTreeWalker)throw new TypeError('DOCUMENT_REQUIRED');
 let hits=[],records=new Map(),phase='IDLE',generation=0,domain='auto',truncated=false;
 function status(){return Object.freeze({phase,domain,hits:hits.length,applied:records.size,
    truncated,revision:generation,autoApplied:false,persistentPageText:false});}
 function restore(){
  let restored=0,skipped=0;
  for(const [node,entry] of records){
   if(node?.isConnected&&node.data===entry.after){node.data=entry.before;restored++;}
   else skipped++;
  }
  records.clear();hits=[];generation++;
  phase='IDLE';return {restored,skipped,...status()};
 }
 function preview(rawRows,chosenDomain='auto'){
  if(phase==='APPLIED')throw new Error('RESTORE_BEFORE_NEW_PREVIEW');
  const rows=selectableRows(rawRows,chosenDomain);
  if(rows.length>MAX_ROWS)throw new Error('ROWS_TOO_MANY');
  hits=[];domain=chosenDomain;generation++;truncated=false;
  if(!rows.length){phase='PREVIEW';return {matches:[],...status()};}
  const walker=doc.createTreeWalker(doc.documentElement,4);let count=0,node;
  while((node=walker.nextNode())&&count++<MAX_NODES){
   if(!goodNode(node,doc))continue;
   const text=node.data;
   if(!text||!text.trim())continue;
   for(const found of collectTextHits(text,rows)){
    if(hits.length>=MAX_HITS){truncated=true;break;}
    const id='r11_'+generation+'_'+hits.length;
    const context=text.slice(Math.max(0,found.start-22),Math.min(text.length,found.end+22))
      .slice(0,MAX_CONTEXT);
    hits.push({...found,id,node,before:text,context});
   }
   if(truncated)break;
  }
  if(count>=MAX_NODES)truncated=true;
  phase='PREVIEW';
  return {matches:hits.map(({id,from,to,domain,context})=>({id,from,to,domain,context})),...status()};
 }
 function apply(selectedIds,revision){
  if(phase!=='PREVIEW')throw new Error('PREVIEW_REQUIRED');
  if(!Number.isInteger(revision)||revision!==generation)throw new Error('STALE_PREVIEW');
  if(!Array.isArray(selectedIds)||selectedIds.length<1||selectedIds.length>MAX_HITS)
    throw new Error('EXPLICIT_SELECTION_REQUIRED');
  const desired=new Set(selectedIds);
  if(desired.size!==selectedIds.length||selectedIds.some(s=>typeof s!=='string'))throw new Error('DUPLICATE_IDS');
  const known=new Map(hits.map(x=>[x.id,x]));
  if([...desired].some(x=>!known.has(x)))throw new Error('UNKNOWN_APPROVAL');
  const changes=new Map();
  for(const id of desired){
   const hit=known.get(id),node=hit.node;
   if(!goodNode(node,doc)||node.data!==hit.before)
    throw new Error('PAGE_CHANGED_RESCAN_REQUIRED');
   const list=changes.get(node)||[];
   list.push(hit);changes.set(node,list);
  }
  const planned=[];
  for(const [node,positions] of changes){
   positions.sort((a,b)=>a.start-b.start);
   let cursor=0,after='';
   for(const x of positions){
    if(x.start<cursor||node.data.slice(x.start,x.end)!==x.from)throw new Error('OVERLAPPING_OR_CHANGED');
    after+=node.data.slice(cursor,x.start)+x.to;cursor=x.end;
   }
   after+=node.data.slice(cursor);
   if(after!==node.data)planned.push({node,before:node.data,after});
  }
  // Atomic validation above, then deterministic synchronous writes.
  for(const x of planned){records.set(x.node,{before:x.before,after:x.after});x.node.data=x.after;}
  hits=[];phase='APPLIED';generation++;
  return {nodesChanged:planned.length,approvedPositions:desired.size,...status()};
 }
 function clear(){return restore();}
 return Object.freeze({preview,apply,restore,clear,status});
}
const api=Object.freeze({VERSION:'R11-preview-0.5.0',MAX_HITS,MAX_NODE_LENGTH,
  selectableRows,collectTextHits,createSession,goodNode});
global.TLSR11=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
