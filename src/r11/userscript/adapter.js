/* TLS R11 standalone Tampermonkey: site-opt-in personal glossary and R5 provider. MIT. */
(() => {
'use strict';
if(window.top!==window.self||!globalThis.TLSWeb||!globalThis.TLSProviders||
   !globalThis.TLSPreferences||!globalThis.TLSProgress||!globalThis.TLSNames||!globalThis.TLSR11||!globalThis.TLSPersonalGlossary)return;
const origin=location.origin;
const activeKey='tls-enabled:'+origin, modeKey='tls-mode-r2:'+origin,
  sourceKey='tls-source-r2:'+origin,domainKey='tls-domain-r3:'+origin,
  preferenceKey='tls-regional-r3:'+origin,toneKey='tls-tone-r3:'+origin;
const prefs=globalThis.TLSPreferences;
const r11=globalThis.TLSR11.createSession(document);
const profileKey='tls-r11-profile:'+origin;
let r11Active=false, r11Preview=null, r11Revision=0;

let enabled=Boolean(GM_getValue(activeKey,false)),paused=false;
let mode=GM_getValue(modeKey,'terms')==='local-ai'?'local-ai':'terms';
const sources=['auto','en','ja','ko','zh','fr','de','es','ru','vi','th','pt','id','ar'];
let sourceLanguage=GM_getValue(sourceKey,'auto');
if(!sources.includes(sourceLanguage))sourceLanguage='auto';
const domains=prefs.DOMAINS.slice();
const labels={auto:'自動判斷',general:'一般',ui:'介面選單',software:'軟體',
 engineering:'程式開發',ai:'AI',security:'資安',ecommerce:'購物',
 finance:'金融',food:'餐飲',travel:'交通旅遊',education:'教育',
 medicine:'醫療',media:'社群影音',office:'辦公',public:'公共行政',
 games:'遊戲',industry:'工業'};
let domain=GM_getValue(domainKey,'auto');
if(!domains.includes(domain))domain='auto';
let regionalPreference=GM_getValue(preferenceKey,'balanced');
let tone=GM_getValue(toneKey,'faithful');
const validated=prefs.normalize({regionalPreference,tone,domain});
regionalPreference=validated.regionalPreference;
tone=validated.tone;
const pane=document.createElement('section');
pane.setAttribute('data-tls-ui','true');
pane.setAttribute('aria-label','臺灣繁體中文翻譯設定');
pane.style.cssText='position:fixed;right:12px;bottom:76px;width:min(295px,calc(100vw - 24px));'+
 'max-height:min(66vh,570px);z-index:2147483646;overflow:hidden;box-sizing:border-box;';
pane.hidden=true;
const shadow=pane.attachShadow({mode:'closed'});
const css=document.createElement('style');
css.textContent=':host{all:initial}:host([hidden]){display:none!important} .box{background:#fff;color:#17354b;border:1px solid #99b6c3;'+
 'border-radius:13px;box-shadow:0 7px 30px #082a4238;padding:11px;box-sizing:border-box;'+
 'display:flex;flex-direction:column;max-height:min(66vh,570px);font:12px/1.55 system-ui,sans-serif}'+
 '.header{font-weight:700;font-size:14px;flex:none} .scroll{overflow:auto;flex:1;min-height:0}'+
 'label{display:block;margin:8px 0 3px;font-weight:600} select{box-sizing:border-box;'+
 'width:100%;padding:7px;font:inherit;background:#fff;color:#18384b;border:1px solid #9bbaca;border-radius:7px}'+
 '.footer{flex:none;border-top:1px solid #dbe6ec;margin-top:8px;padding-top:8px;display:flex;gap:7px}'+
 'button{cursor:pointer;flex:1;padding:8px;background:#0f766e;color:#fff;border:0;border-radius:8px;font-weight:700}'+
 'button:focus-visible,select:focus-visible{outline:3px solid #277dc8;outline-offset:2px}'+
 '.status{min-height:28px;max-height:52px;overflow:auto;color:#344e5b;margin:6px 0}'+
 '.note{font-size:11px;opacity:.8;line-height:1.35;margin:7px 0}';
const box=document.createElement('div');box.className='box';
const header=document.createElement('div');header.className='header';
header.textContent='臺灣繁中化 R11 · CA L.';
const status=document.createElement('div');status.className='status';
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const scroll=document.createElement('div');scroll.className='scroll';
const controls={};
function selector(key,label,choices,current) {
 const title=document.createElement('label');title.textContent=label;
 const select=document.createElement('select');title.appendChild(select);
 for(const [value,caption] of choices){
   const opt=document.createElement('option');opt.value=value;opt.textContent=caption;select.appendChild(opt);
 }
 select.value=current;controls[key]=select;scroll.appendChild(title);
 return select;
}
selector('source','原文語言',sources.map(x=>[x,x==='auto'?'自動判斷':x]),sourceLanguage);
selector('domain','臺灣用語領域',domains.map(x=>[x,labels[x]||x]),domain);
selector('regional','臺灣用語偏好',prefs.LEVELS.map(x=>[x,prefs.DESCRIPTIONS[x]]),regionalPreference);
selector('tone','譯文語氣（偏好設定，模型尚未支援）',prefs.TONES.map(x=>[x,prefs.TONE_LABELS[x]]),tone);
const note=document.createElement('p');note.className='note';
note.textContent='本機模型翻譯能力依 Chrome 支援。文風設定不代表已可控制模型；內容不由本腳本上傳。';
scroll.appendChild(note);
const r11Panel=document.createElement('section');
r11Panel.style.cssText='border-top:1px solid #cbdfe2;margin-top:12px;padding-top:9px;';
const r11Heading=document.createElement('strong');r11Heading.textContent='R11 個人詞庫（本站人工套用）';
const r11Desc=document.createElement('p');r11Desc.textContent='先匯入 R9 JSON → 預覽 → 逐項勾選 → 套用；預設不修改。';
const r11File=document.createElement('input');r11File.type='file';r11File.accept='.json,application/json';
r11File.style.cssText='display:block;width:100%;font-size:11px;margin:8px 0;';
const r11State=document.createElement('p');r11State.textContent='未匯入。';
r11State.setAttribute('role','status');r11State.setAttribute('aria-live','polite');
const r11Matches=document.createElement('div');r11Matches.style.cssText='max-height:170px;overflow:auto;';
const r11Actions=document.createElement('div');r11Actions.style.cssText='display:flex;flex-wrap:wrap;gap:6px';
const r11Buttons={};
for(const [key,label] of [['preview','預覽'],['apply','套用勾選'],['restore','還原'],['exit','退出 R11']]){
 const b=document.createElement('button');b.textContent=label;b.type='button';
 b.style.cssText='min-width:105px;font-size:11px;';r11Actions.appendChild(b);r11Buttons[key]=b;
}
r11Panel.append(r11Heading,r11Desc,r11File,r11Actions,r11State,r11Matches);
scroll.appendChild(r11Panel);
const footer=document.createElement('div');footer.className='footer';
const pause=document.createElement('button');pause.type='button';
const switchMode=document.createElement('button');switchMode.type='button';
const close=document.createElement('button');close.type='button';close.textContent='關閉面板';
footer.append(pause,switchMode,close);
box.append(header,status,scroll,footer);shadow.append(css,box);
let indicator;
const ctrl=globalThis.TLSWeb.createWebLocalizer(document,{
 mode,sourceLanguage,domain,regionalPreference,tone,
 onStatus:statusInfo=>{
   indicator?.update(statusInfo);
   renderStatus(statusInfo);
 }
});
indicator=globalThis.TLSProgress.createIndicator(document,{
 visible:false,
 onClick:()=>{if(!enabled)return;pane.hidden=!pane.hidden;}
});
function renderStatus(info){
 if(!info)return;
 const state=globalThis.TLSProgress.stateOf(info);
 const labels={running:'正在處理網頁文字',download:'正在下載或準備本機語言模型',
  warning:'部分文字未處理，請查看設定',done:'目前可處理的文字已完成',
  paused:'目前已暫停',idle:'等待可處理的文字'};
 status.textContent=labels[state]||labels.idle;
}
function render(){
 pause.textContent=r11Active?'退出 R11':paused?'繼續':'暫停／還原';
 switchMode.textContent=mode==='local-ai'?'改用離線詞彙':'試用本機 AI';
 indicator.show(enabled);
 if(enabled&&!pane.isConnected)document.documentElement.appendChild(pane);
 if(!enabled){pane.hidden=true;if(pane.isConnected)pane.remove();}
 indicator.update(ctrl.getStatus());
 renderStatus(ctrl.getStatus());
}
function apply(){
 if(!enabled)return;
 if(r11Active)exitR11();
 ctrl.configure({mode,sourceLanguage,domain,regionalPreference,tone});
 if(!paused&&!ctrl.isRunning())ctrl.start();
 render();
}
function setEnabled(next){
 if(r11Active)exitR11();
 enabled=Boolean(next);GM_setValue(activeKey,enabled);paused=false;
 if(enabled){ctrl.configure({mode,sourceLanguage,domain,regionalPreference,tone});ctrl.start();}
 else ctrl.stop();
 render();
}
pause.addEventListener('click',()=>{
 if(!enabled)return;
 if(r11Active){exitR11();return;}
 paused=!paused;
 if(paused)ctrl.stop();else ctrl.start();
 render();
});
switchMode.addEventListener('click',()=>{
 if(!enabled)return;
 mode=mode==='local-ai'?'terms':'local-ai';GM_setValue(modeKey,mode);apply();
});
close.addEventListener('click',()=>{pane.hidden=true;});
controls.source.addEventListener('change',()=>{
 sourceLanguage=sources.includes(controls.source.value)?controls.source.value:'auto';
 GM_setValue(sourceKey,sourceLanguage);apply();
});
controls.domain.addEventListener('change',()=>{
 domain=domains.includes(controls.domain.value)?controls.domain.value:'auto';
 GM_setValue(domainKey,domain);apply();
});
controls.regional.addEventListener('change',()=>{
 regionalPreference=prefs.normalize({regionalPreference:controls.regional.value}).regionalPreference;
 GM_setValue(preferenceKey,regionalPreference);apply();
});
controls.tone.addEventListener('change',()=>{
 tone=prefs.normalize({tone:controls.tone.value}).tone;
 GM_setValue(toneKey,tone);apply();
});

function r11Message(value){r11State.textContent=value;}
function resetR11UI(){r11Preview=null;r11Revision=0;r11Matches.replaceChildren();}
function exitR11(){
 const outcome=r11.restore();r11Active=false;resetR11UI();
 if(enabled&&!paused&&!ctrl.isRunning())ctrl.start();
 r11Message('已退出 R11；還原 '+outcome.restored+' 處，忽略已變動 '+outcome.skipped+' 處。');
 render();
}
function r11RenderPreview(result){
 r11Preview=result.matches;r11Revision=result.revision;r11Matches.replaceChildren();
 for(const hit of r11Preview.slice(0,45)){
  const label=document.createElement('label');label.style.cssText='display:block;font-weight:normal;border-bottom:1px solid #dbe5eb;padding:5px 0';
  const check=document.createElement('input');check.type='checkbox';check.value=hit.id;
  label.append(check,document.createTextNode(' '+hit.from+' → '+hit.to+' ('+hit.domain+')'));
  const sub=document.createElement('small');sub.textContent=hit.context;sub.style.cssText='display:block;margin-left:20px';
  label.append(sub);r11Matches.append(label);
 }
 r11Message('找到 '+r11Preview.length+' 處，尚未修改。先逐項勾選。'+(result.truncated?' 已達掃描上限。':''));
}
r11File.addEventListener('change',async()=>{
 const f=r11File.files?.[0];if(!f)return;
 try{
  if(f.size>65536)throw Error('檔案超過 64 KiB');
  const raw=await f.text();const entries=globalThis.TLSPersonalGlossary.importProfile(raw);
  GM_setValue(profileKey,raw);resetR11UI();
  r11Message('本機僅為此網站儲存 '+entries.length+' 筆詞彙；未自動套用。');
 }catch(e){r11Message('匯入失敗：'+String(e.message||e));}
 finally{r11File.value='';}
});
r11Buttons.preview.addEventListener('click',()=>{
 try{
  if(!enabled)throw Error('請先啟用本站');
  const raw=GM_getValue(profileKey,'');if(!raw)throw Error('請先匯入 R9 詞庫');
  const entries=globalThis.TLSPersonalGlossary.importProfile(raw);
  if(!entries.length)throw Error('詞庫為空');
  ctrl.stop();paused=false; // R11 and the R5 async translator must be mutually exclusive.
  const result=r11.preview(entries,domain);
  r11Active=true;r11RenderPreview(result);render();
 }catch(e){r11Message('預覽失敗：'+String(e.message||e));}
});
r11Buttons.apply.addEventListener('click',()=>{
 try{
  if(!enabled||!r11Active||!r11Preview)throw Error('請先預覽');
  const selected=[...r11Matches.querySelectorAll('input:checked')].map(x=>x.value);
  const result=r11.apply(selected,r11Revision);
  r11Message('已套用 '+result.approvedPositions+' 處、修改 '+result.nodesChanged+' 個節點。');
 }catch(e){r11Message('套用拒絕：'+String(e.message||e));}
});
r11Buttons.restore.addEventListener('click',()=>{
 if(!r11Active)return;
 const result=r11.restore();resetR11UI();
 r11Message('還原 '+result.restored+' 處；跳過 '+result.skipped+' 處（網站已變動）。');
});
r11Buttons.exit.addEventListener('click',()=>{if(r11Active)exitR11();});
GM_registerMenuCommand('TLS R11：開啟本站個人詞庫',()=>{
 if(enabled){pane.hidden=false;render();}
});

GM_registerMenuCommand('TLS：啟用／停用本站',()=>setEnabled(!enabled));
GM_registerMenuCommand('TLS：暫停／恢復',()=>{if(enabled)pause.click();});
GM_registerMenuCommand('TLS：離線詞彙／Chrome 本機 AI 模式',()=>{if(enabled)switchMode.click();});
if(enabled)ctrl.start();
render();
})();
