// ==UserScript==
// @name         Taiwan-LLM-Sanitizer R13｜安全雙語閱讀
// @namespace    https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw
// @version      0.6.0
// @description  逐站手動啟用，只讀取反白文字並比對譯文；不改寫網頁。
// @author       CA L. and contributors
// @match        http://*/*
// @match        https://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @homepageURL  https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw
// ==/UserScript==

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

/* R13 opt-in bilingual reader dock. Never modifies original webpage text or records excerpts. */
(function(g){
'use strict';
const core=g.TLSBilingualR13;
if(!core)throw new Error('R13_CORE_REQUIRED');
const style=`:host{all:initial;color-scheme:light}*{box-sizing:border-box}.dock{position:fixed;right:14px;bottom:16px;z-index:2147483646;font:13px/1.5 system-ui,sans-serif;color:#12334b}.opener{border:0;background:#126b75;color:white;border-radius:24px;padding:9px 14px;cursor:pointer;box-shadow:0 4px 14px #1c3c4b52}.panel{background:white;color:#163448;border:1px solid #9ab3c4;box-shadow:0 6px 28px #112e3d52;border-radius:12px;padding:12px;width:min(410px,calc(100vw - 28px));max-height:75vh;overflow-y:auto;overflow-wrap:anywhere}.head{font-size:15px;font-weight:750;margin-bottom:4px}.fine{font-size:11px;color:#466271}textarea{display:block;width:100%;resize:vertical;min-height:74px;max-height:200px;font:12px/1.45 ui-monospace,monospace;background:#f6fafc;color:#12334b;border:1px solid #b5c7d1;border-radius:6px;padding:8px}.actions{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}button,select{font:inherit;border:1px solid #9daeba;border-radius:6px;padding:6px 8px;cursor:pointer;color:#0d3c50;background:#f7fcfd}button:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #168cba;outline-offset:2px}.status{padding:6px 0;min-height:22px}.warning{color:#9c4505}.pass{color:#13613a}.label{font-weight:700;margin:7px 0 3px}.hide{display:none!important}`;
function el(doc,tag,text='',cls=''){
 const node=doc.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;
}
function createReader(doc,options={}){
 if(!doc?.documentElement||!doc.defaultView)throw new Error('R13_DOCUMENT_REQUIRED');
 let alive=true,panelOpen=true,epoch=0,session=null;
 const win=doc.defaultView,host=el(doc,'section');host.dataset.tlsR13Ui='true';host.setAttribute('aria-label','R13 雙語閱讀');
 const shadow=host.attachShadow({mode:'closed'}),css=el(doc,'style');css.textContent=style;shadow.appendChild(css);
 const dock=el(doc,'div','','dock'),opener=el(doc,'button','R13 雙語閱讀','opener'),panel=el(doc,'section','','panel');opener.type='button';
 const title=el(doc,'div','R13｜安全雙語閱讀','head'),desc=el(doc,'div','只讀取你主動反白的文字；網頁原文不改寫，也不傳給本專案伺服器。','fine');
 const actions=el(doc,'div','','actions'),capture=el(doc,'button','讀取反白原文'),lang=el(doc,'select'),translate=el(doc,'button','試用 Chrome 本機翻譯'),inspect=el(doc,'button','檢查譯文'),reset=el(doc,'button','清除'),close=el(doc,'button','關閉');
 for(const [code,name] of [['en','英文'],['ja','日文'],['ko','韓文'],['zh-Hans','簡體中文'],['fr','法文'],['de','德文']]){
  const o=el(doc,'option',name);o.value=code;lang.appendChild(o);
 }
 for(const b of [capture,lang,translate,inspect,reset,close])actions.appendChild(b);
 const originalLabel=el(doc,'div','原文（本次暫存）','label'),original=el(doc,'textarea');original.readOnly=true;original.setAttribute('aria-label','選取的原文');
 const candidateLabel=el(doc,'div','譯文（本機模型或自行貼上）','label'),candidate=el(doc,'textarea');candidate.placeholder='本機模型不可用時，可以自行貼上譯文作對照。';candidate.setAttribute('aria-label','譯文');
 const hint=el(doc,'div','UI 用語：滑鼠 click／点击／點擊，建議寫成「點選」；聲響及點閱數不適用。','fine');
 const status=el(doc,'div','尚未讀取內容','status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const note=el(doc,'div','翻譯品質須另做人工核對。若 Chrome 要求下載本機語言模型，該下載屬瀏覽器行為。','fine');
 panel.append(title,desc,actions,originalLabel,original,candidateLabel,candidate,hint,status,note);dock.append(opener,panel);shadow.append(dock);doc.documentElement.appendChild(host);
 function message(value,mode=''){status.textContent=value;status.className='status '+mode;}
 function clear(){epoch++;if(session?.destroy){try{session.destroy();}catch(_){}}session=null;original.value='';candidate.value='';message('已清除本次文字。網頁原文從未改寫。');}
 function dispose(){if(!alive)return;alive=false;clear();host.remove();options.onClose?.();}
 function getState(){return {alive,open:panelOpen,hasOriginal:!!original.value,hasCandidate:!!candidate.value,changedPage:false};}
 opener.addEventListener('click',()=>{if(!alive)return;panelOpen=!panelOpen;panel.classList.toggle('hide',!panelOpen);});
 capture.addEventListener('click',()=>{
  if(!alive)return;epoch++;candidate.value='';
  try{original.value=core.safeSelection(win);message('已取得反白內容；未修改網頁。');}
  catch(e){original.value='';message(e.message,'warning');}
 });
 translate.addEventListener('click',async()=>{
  if(!alive)return;
  let source;try{source=core.validText(original.value);}catch(_){message('請先反白並讀取原文。','warning');return;}
  const T=win.Translator||g.Translator;
  if(!T||typeof T.create!=='function'){message('本瀏覽器沒有可用的本機翻譯功能，請自行貼上譯文核對。','warning');return;}
  const token=++epoch;
  try{
   message('正在確認本機語言模型是否可用…');
   if(typeof T.availability==='function'){
    const availability=await T.availability({sourceLanguage:lang.value,targetLanguage:'zh-Hant'});
    if(!alive||token!==epoch)return;
    if(availability==='unavailable')throw new Error('本機模型不支援目前語言組合');
   }
   message('正在使用瀏覽器本機翻譯（可能需要下載語言模型）…');
   const created=await T.create({sourceLanguage:lang.value,targetLanguage:'zh-Hant'});
   if(!alive||token!==epoch){created?.destroy?.();return;}
   session=created;
   const translated=await created.translate(source);
   if(!alive||token!==epoch)return;
   core.validText(translated,core.MAX_CANDIDATE);
   candidate.value=translated;
   const qa=core.checkCandidate(source,translated);
   message(qa.ok?'本機翻譯完成；已通過有限的結構檢查，仍需人工確認語意。':'譯文含專名或技術結構疑點，請人工確認；原文未改動。',qa.ok?'pass':'warning');
  }catch(e){if(alive&&token===epoch)message('本機翻譯未完成：'+String(e?.message||'不支援')+'。請自行貼上譯文核對。','warning');}
 });
 inspect.addEventListener('click',()=>{
  try{const qa=core.checkCandidate(original.value,candidate.value);message(qa.ok?'有限結構檢查通過；不代表語意正確或自然。':'疑似結構變動：'+qa.failures.map(x=>x.term).slice(0,5).join('、'),'warning');}
  catch(_){message('原文與譯文都必須有內容。','warning');}
 });
 reset.addEventListener('click',clear);close.addEventListener('click',dispose);
 // Explicit label guards: the extension never writes to DOM text nodes outside its own dock.
 const api={dispose,clear,getState,host};
 if(options.testHooks===true)api.testControls=Object.freeze({capture,translate,inspect,reset,close,original,candidate,status});
 return Object.freeze(api);
}
const api=Object.freeze({createReader});
g.TLSR13ReaderUI=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

/* R13 standalone Tampermonkey reader, default OFF, site-scope only. */
(()=>{
'use strict';
if(window.top!==window.self||!globalThis.TLSR13ReaderUI)return;
const key='tls-r13-site-optin:'+location.origin;
let allowed=Boolean(GM_getValue(key,false)),reader=null;
function start(){if(!allowed)return;if(reader){reader.dispose();reader=null;}reader=globalThis.TLSR13ReaderUI.createReader(document,{onClose:()=>reader=null});}
function stop(){reader?.dispose();reader=null;}
function set(on){allowed=Boolean(on);GM_setValue(key,allowed);if(allowed)start();else stop();}
GM_registerMenuCommand('TLS R13：啟用／停用本站雙語閱讀',()=>set(!allowed));
GM_registerMenuCommand('TLS R13：開啟／重新開啟閱讀面板',()=>{if(allowed)start();});
GM_registerMenuCommand('TLS R13：清除本次閱讀內容',()=>reader?.clear());
if(allowed)start();
})();
