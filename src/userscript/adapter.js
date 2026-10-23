/* R3 standalone userscript adapter: no external dependencies, MIT. */
(() => {
'use strict';
if(window.top!==window.self || !globalThis.TLSWeb || !globalThis.TLSProviders)return;
const origin=location.origin;
const activeKey='tls-enabled:'+origin, modeKey='tls-mode-r2:'+origin,sourceKey='tls-source-r2:'+origin;
let enabled=Boolean(GM_getValue(activeKey,false)),paused=false;
let mode=GM_getValue(modeKey,'terms')==='local-ai'?'local-ai':'terms';
let sourceLanguage=GM_getValue(sourceKey,'auto');
const sources=['auto','en','ja','ko','zh','fr','de','es','ru','vi','th','pt','id','ar'];
if(!sources.includes(sourceLanguage))sourceLanguage='auto';
const panel=document.createElement('div');
panel.dataset.tlsUi='true';panel.style.cssText='position:fixed;right:10px;top:10px;z-index:2147483646;pointer-events:auto';
const shadow=panel.attachShadow({mode:'closed'});
const wrap=document.createElement('div');
wrap.style.cssText='background:#fff;color:#183247;border:1px solid #94a3b8;box-shadow:0 4px 18px #0003;padding:8px;border-radius:12px;font:12px/1.5 system-ui,sans-serif;max-width:250px';
const title=document.createElement('div');title.textContent='TLS 臺灣繁中化 R3';title.style.fontWeight='700';
const status=document.createElement('div');status.setAttribute('aria-live','polite');status.style.cssText='margin:4px 0;max-width:230px;overflow-wrap:anywhere';
const pause=document.createElement('button'),modeButton=document.createElement('button'),sourceSelect=document.createElement('select');
for(const btn of [pause,modeButton])btn.style.cssText='padding:5px 8px;border:0;border-radius:7px;color:#fff;background:#0f766e;cursor:pointer;margin:3px 3px 3px 0;font:12px system-ui';
sourceSelect.style.cssText='margin:4px 0;width:100%;padding:5px;border-radius:7px;background:white;color:#111;border:1px solid #94a3b8';
for(const lang of sources){
  const option=document.createElement('option');option.value=lang;option.textContent='原文：'+lang;
  sourceSelect.appendChild(option);
}
sourceSelect.value=sourceLanguage;
wrap.append(title,status,pause,modeButton,sourceSelect);shadow.appendChild(wrap);
const ctrl=globalThis.TLSWeb.createWebLocalizer(document,{
  mode,sourceLanguage,onStatus:(snapshot)=>renderStatus(snapshot)
});
function renderStatus(snapshot){
  if(!snapshot)return;
  const translated=snapshot.converted||0;
  const progress=snapshot.lastState==='MODEL_DOWNLOAD'?'（下載本機語言模型中）':'';
  status.textContent=(mode==='local-ai'?'本機 AI：':'離線詞彙：')+
    (paused?'已暫停':'已處理 '+translated+' 處')+progress;
  if(snapshot.provider?.state==='DEGRADED')status.textContent+='（模型不可用，僅保留安全轉換）';
}
function render(){
  pause.textContent=paused?'恢復':'暫停／還原';
  modeButton.textContent=mode==='local-ai'?'改用詞彙模式':'改用本機 AI';
  if(enabled&&!panel.isConnected)(document.body||document.documentElement).appendChild(panel);
  if(!enabled&&panel.isConnected)panel.remove();
  renderStatus(ctrl.getStatus());
}
function apply(){
  if(!enabled)return;
  ctrl.configure({mode,sourceLanguage});if(!paused)ctrl.start();
  render();
}
function setEnabled(next){
  enabled=Boolean(next);GM_setValue(activeKey,enabled);paused=false;
  if(enabled){ctrl.configure({mode,sourceLanguage});ctrl.start();}
  else ctrl.stop();
  render();
}
pause.addEventListener('click',()=>{if(!enabled)return;paused=!paused;if(paused)ctrl.stop();else ctrl.start();render();});
modeButton.addEventListener('click',()=>{
  if(!enabled)return;
  mode=mode==='terms'?'local-ai':'terms';GM_setValue(modeKey,mode);apply();
});
sourceSelect.addEventListener('change',()=>{
  if(!enabled)return;
  sourceLanguage=sources.includes(sourceSelect.value)?sourceSelect.value:'auto';
  GM_setValue(sourceKey,sourceLanguage);apply();
});
GM_registerMenuCommand('TLS：啟用／停用本站',()=>setEnabled(!enabled));
GM_registerMenuCommand('TLS：暫停／恢復',()=>{if(enabled)pause.click();});
GM_registerMenuCommand('TLS：離線詞彙／Chrome 本機 AI 模式',()=>{if(enabled)modeButton.click();});
if(enabled)ctrl.start();
render();
})();
