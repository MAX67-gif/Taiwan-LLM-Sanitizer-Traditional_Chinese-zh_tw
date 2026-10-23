/* TLS R8 read-only contextual term review: no storage, network, or replacement. MIT */
(function(g){
'use strict';
const MAX_CHARS=12000,MAX_MATCHES=100,WORD=/[a-zA-Z0-9_]/u;
function protectedRanges(s){
 const r=[];
 for(const pattern of [
  /<(script|style|code|pre)\b[^>]*>[\s\S]*?<\/\1\s*>/giu,
  /<[^>\r\n]*>/gu,
  /https?:\/\/[^\s<>"']+/giu,
  /\x60[^\x60\r\n]*\x60/gu,
  /\{\{[^{}\r\n]*\}\}/gu,
  /\$\{[^}\r\n]*\}/gu,
  /<%[\s\S]{0,250}?%>/gu,
  /%(?:\d+\$)?[sdif]/gu,
  /"(?:\\.|[^"\\])*"\s*:/gu,
  /^[ \t]{4,}[^\r\n]+/gmu
 ])for(const m of s.matchAll(pattern))r.push([m.index,m.index+m[0].length]);
 let at=0,open=null;
 for(const line of s.split('\n')){
  const trim=line.trimStart();
  const m=/^(\x60{3,}|~{3,})/u.exec(trim);
  if(!open&&m)open={start:at,ch:m[1][0],length:m[1].length};
  else if(open&&m&&m[1][0]===open.ch&&m[1].length>=open.length&&!trim.slice(m[1].length).trim()){
   r.push([open.start,Math.min(s.length,at+line.length)]);open=null;
  }
  at+=line.length+1;
 }
 if(open)r.push([open.start,s.length]);
 r.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const merged=[];
 for(const range of r){
  if(merged.length&&range[0]<=merged[merged.length-1][1])
    merged[merged.length-1][1]=Math.max(merged[merged.length-1][1],range[1]);
  else merged.push([...range]);
 }
 return merged;
}
function blocked(ranges,a,b){
 for(const [s,e] of ranges){if(s>=b)break;if(e>a&&s<b)return true;}
 return false;
}
function review(text,rows,options={}){
 if(typeof text!=='string')throw new TypeError('text must be a string');
 if(text.length>MAX_CHARS)throw new RangeError('INPUT_TOO_LONG');
 if(!Array.isArray(rows))throw new TypeError('catalog must be an array');
 const domain=options.domain||'auto',stage=['candidate','editorial_seed','all'].includes(options.stage)?options.stage:'all';
 const ranges=protectedRanges(text),groups=new Map(),hits=[];
 for(const x of rows){
  if(!x||typeof x.from!=='string'||typeof x.to!=='string'||!x.from.trim()||!x.to.trim())continue;
  if(x.from.length>100||x.to.length>100)continue;
  const key=x.from.toLocaleLowerCase('en-US'),items=groups.get(key)||[];
  const v={id:String(x.id||''),to:x.to,domain:String(x.domain||'general'),
    scope:String(x.scope||'general'),stage:x.review_status==='candidate'?'candidate':'editorial_seed'};
  const index=items.findIndex(y=>y.to===v.to&&y.domain===v.domain&&y.scope===v.scope);
  if(index<0)items.push(v);else if(v.stage==='editorial_seed')items[index]=v;
  groups.set(key,items);
 }
 for(const [phrase,optionsForPhrase] of groups){
  const latin=/^[\x20-\x7e]+$/u.test(phrase)&&/[a-z]/iu.test(phrase);
  const hay=latin?text.toLocaleLowerCase('en-US'):text;
  let i=0;
  while((i=hay.indexOf(phrase,i))>=0){
   const end=i+phrase.length;
   const okBoundary=!latin||(!WORD.test(text[i-1]||'')&&!WORD.test(text[end]||''));
   if(okBoundary&&!blocked(ranges,i,end)){
    const matches=optionsForPhrase.filter(x=>stage==='all'||x.stage===stage);
    if(matches.length)hits.push({start:i,end,found:text.slice(i,end),alternatives:matches});
   }
   i=end;
  }
 }
 hits.sort((a,b)=>a.start-b.start||(b.end-b.start)-(a.end-a.start));
 let limit=-1;const suggestions=[];
 for(const h of hits){
  if(h.start<limit)continue;
  limit=h.end;
  const possible=domain==='auto'?h.alternatives:h.alternatives.filter(x=>x.domain===domain||x.scope==='general');
  const targets=[...new Set(possible.map(x=>x.to))];
  const decision=!possible.length?'DOMAIN_UNCERTAIN':targets.length>1?'CONTEXT_REQUIRED':
    possible.some(x=>x.stage==='editorial_seed')?'EDITORIAL_SEED':'UNREVIEWED_CANDIDATE';
  suggestions.push({...h,decision,selected:targets.length===1?targets[0]:null,autoApplied:false});
  if(suggestions.length>=MAX_MATCHES)break;
 }
 return {version:'R8-preview',mode:'suggestion_only',originalUnchanged:true,domain,stage,suggestions,
  stats:{inputLength:text.length,protectedSpans:ranges.length,found:suggestions.length,
    ambiguous:suggestions.filter(x=>x.decision==='CONTEXT_REQUIRED').length,
    truncated:suggestions.length>=MAX_MATCHES}};
}
const api=Object.freeze({review,protectedRanges,MAX_CHARS});
g.TLSContextReview=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
