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
