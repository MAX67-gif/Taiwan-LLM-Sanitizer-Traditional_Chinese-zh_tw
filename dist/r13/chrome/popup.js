/* R13 explicit per-origin permission and injection. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),FILES=['bilingual_reader_r13.js','reader_ui_r13.js','content.js'];
let tab=null,pattern='',scriptId='',enabled=false,busy=false;
function hash(value){let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h.toString(16);}
function state(s){$('state').textContent=s;$('enable').disabled=busy||!tab||enabled;$('disable').disabled=busy||!tab||!enabled;}
async function init(){
 try{
  const tabs=await chrome.tabs.query({active:true,currentWindow:true});tab=tabs[0];
  const url=new URL(tab?.url);if(!['http:','https:'].includes(url.protocol))throw Error('不支援此分頁');
  pattern=url.protocol+'//'+url.hostname+'/*';scriptId='tls_r13_'+hash(pattern);
  $('site').textContent='網站：'+url.hostname;
  const found=await chrome.scripting.getRegisteredContentScripts({ids:[scriptId]});
  enabled=found.some(x=>x.matches.includes(pattern));state(enabled?'已啟用本站。請選取文字後使用 R13 面板。':'尚未授權本站。');
 }catch(e){tab=null;state('不可操作：'+String(e.message||e));}
}
$('enable').addEventListener('click',()=>{
 if(!tab||busy||enabled)return;busy=true;state('正在請求本站授權…');
 // Chrome permission request must start synchronously from user gesture.
 chrome.permissions.request({origins:[pattern]}).then(async yes=>{
  if(!yes)throw Error('使用者未允許本站');
  await chrome.scripting.registerContentScripts([{id:scriptId,matches:[pattern],js:FILES,runAt:'document_idle',allFrames:false,persistAcrossSessions:true}]);
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:FILES});
  enabled=true;state('已啟用：現在反白一段文字，在網頁右下角點選 R13 面板。');
 }).catch(e=>state('啟用失敗：'+String(e.message||e))).finally(()=>{busy=false;state($('state').textContent);});
});
$('disable').addEventListener('click',async()=>{
 if(!tab||busy||!enabled)return;busy=true;state('正在停用…');
 try{
  try{await chrome.tabs.sendMessage(tab.id,{kind:'TLS_R13_CLOSE'});}catch(_){/* page may have navigated */}
  await chrome.scripting.unregisterContentScripts({ids:[scriptId]});
  await chrome.permissions.remove({origins:[pattern]});enabled=false;state('已停用本站。未曾改寫網站原文。');
 }catch(e){state('停用時發生問題：'+String(e.message||e));}
 finally{busy=false;state($('state').textContent);}
});
init();
})();
