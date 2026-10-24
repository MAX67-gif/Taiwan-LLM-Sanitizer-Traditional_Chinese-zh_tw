/* Taiwan-LLM-Sanitizer R13 bilingual read-only primitives, MIT. No DOM mutation or network. */
(function(g){
'use strict';
const MAX_SELECTION=6000, MAX_CANDIDATE=12000;
const EXCLUDED='input,textarea,select,option,[contenteditable],[role="textbox"],[role="searchbox"],[role="combobox"],script,style,code,pre,kbd,samp,template,svg,canvas,[translate="no"],[data-no-translate],[data-sensitive],[data-private],[hidden],[inert],[aria-hidden="true"],[data-tls-r13-ui]';
const STRUCTURAL=[/\{\{[^{}\r\n]+\}\}/gu,/\$\{[^}\r\n]+\}/gu,/https?:\/\/[^\s<>"']+/giu,/(?:`[^`\r\n]+`)/gu,/```[\s\S]*?```/gu,/(?:^|\s)--[a-z][a-z0-9-]*(?:=[^\s]+)?/gimu,/%(?:\d+\$)?[sdif]/gu];
const NAMES=['Codex for Open Source','OpenAI Codex','Claude Code','GitHub','ChatGPT','Hugging Face'];
const UI_ACTIONS=Object.freeze([{source:'click',suggestion:'點選',context:'ui'}, {source:'点击',suggestion:'點選',context:'ui'}, {source:'點擊',suggestion:'點選',context:'ui'}]);
function validText(input,max=MAX_SELECTION){
 if(typeof input!=='string'||input.length>max||!input.trim()||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(input))throw new Error('R13_INVALID_TEXT');
 return input;
}
function protectedPieces(original){
 const pieces=[];
 for(const r of STRUCTURAL)for(const m of original.matchAll(r)){pieces.push({term:m[0].trim(),start:m.index,end:m.index+m[0].length});}
 for(const term of NAMES){let p=0;while((p=original.indexOf(term,p))>=0){pieces.push({term,start:p,end:p+term.length});p+=term.length;}}
 return pieces.sort((a,b)=>a.start-b.start||b.end-a.end);
}
function checkCandidate(original,candidate){
 validText(original,MAX_SELECTION);validText(candidate,MAX_CANDIDATE);
 const required=protectedPieces(original),failures=[];
 const requiredCount=new Map();for(const p of required)requiredCount.set(p.term,(requiredCount.get(p.term)||0)+1);
 for(const [term,amount] of requiredCount){
  let present=0,pos=0;while((pos=candidate.indexOf(term,pos))>=0){present++;pos+=term.length;}
  if(present<amount)failures.push({kind:'PROTECTED_TEXT_CHANGED',term,expected:amount,found:present});
 }
 return {ok:failures.length===0,failures,structuralCheckOnly:true,semanticQualityVerified:false};
}
function uiActionHints(text,domain){
 validText(text,MAX_SELECTION);
 if(domain!=='ui')return [];
 const hits=[];
 for(const row of UI_ACTIONS){
  const latin=/^[a-z]+$/iu.test(row.source),hay=latin?text.toLowerCase():text,needle=latin?row.source.toLowerCase():row.source;
  let start=0,p;while((p=hay.indexOf(needle,start))>=0){
   const end=p+needle.length,before=text[p-1]||'',after=text[end]||'';
   if(!latin||(!/[a-z\d_]/iu.test(before)&&!/[a-z\d_]/iu.test(after))){
    hits.push({source:text.slice(p,end),recommendation:'點選',domain:'ui',index:p,automatic:false});
   }
   start=end;
  }
 }
 return hits.sort((a,b)=>a.index-b.index).slice(0,25);
}
function safeSelection(win){
 if(!win?.getSelection||!win.document)throw new Error('R13_WINDOW_REQUIRED');
 const selection=win.getSelection();if(!selection||selection.isCollapsed||selection.rangeCount!==1)throw new Error('R13_SELECT_TEXT_FIRST');
 const range=selection.getRangeAt(0),root=range.commonAncestorContainer;
 const element=root.nodeType===1?root:root.parentElement;
 if(!element||element.closest(EXCLUDED))throw new Error('R13_EXCLUDED_SELECTION');
 const doc=win.document,walker=doc.createTreeWalker(root,4);let node;
 if(root.nodeType===3){if(root.parentElement?.closest(EXCLUDED))throw new Error('R13_EXCLUDED_SELECTION');}
 while((node=walker.nextNode())){
  if(range.intersectsNode(node)&&node.parentElement?.closest(EXCLUDED))throw new Error('R13_EXCLUDED_SELECTION');
 }
 const s=selection.toString();return validText(s,MAX_SELECTION);
}
const api=Object.freeze({VERSION:'R13-0.6.0-preview',MAX_SELECTION,MAX_CANDIDATE,validText,protectedPieces,checkCandidate,uiActionHints,safeSelection});
g.TLSBilingualR13=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
