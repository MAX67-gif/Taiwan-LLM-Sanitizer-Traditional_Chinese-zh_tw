'use strict';
const consent=document.getElementById('consent'),enable=document.getElementById('enable'),status=document.getElementById('status');
let target=null,documentConsented=false;
chrome.tabs.query({active:true,currentWindow:true}).then(([tab])=>{try{const u=new URL(tab.url);if(!['http:','https:'].includes(u.protocol))throw Error();target=tab;document.getElementById('origin').textContent=u.origin;}catch(_){status.textContent='請先開啟一般公開 HTTP(S) 網頁。';}});
consent.addEventListener('change',event=>{if(!event.isTrusted)return;documentConsented=consent.checked;enable.disabled=!documentConsented || !target;});
enable.addEventListener('click',async event=>{if(!event.isTrusted || !documentConsented || !target)return;enable.disabled=true;try{await chrome.scripting.executeScript({target:{tabId:target.id},world:'ISOLATED',files:['src/core/provider_capability_r14.js','src/core/mrft_local_provider_r177.js','src/core/mrft_regions_r177.js','src/r177/mrft_dom_r177.js','content.js']});status.textContent='已啟用，請在這份文件上畫出區域。';documentConsented=false;consent.checked=false;}catch(_){status.textContent='目前無法啟用，請在目標公開頁面重新點選擴充功能圖示。';}finally{enable.disabled=!documentConsented;}});
document.getElementById('stop').addEventListener('click',async()=>{if(!target)return;try{await chrome.scripting.executeScript({target:{tabId:target.id},world:'ISOLATED',func:()=>{globalThis.TLSMRFTActiveR177?.controller.dispose();delete globalThis.TLSMRFTActiveR177;}});status.textContent='已停止，原文、譯文及模型工作階段已清除。';documentConsented=false;consent.checked=false;enable.disabled=true;}catch(_){status.textContent='目前無法停止此分頁；離開這份文件也會結束工作階段。';}});

// An open popup never carries consent across a document navigation.
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(target?.id===tabId && change.status==='loading'){documentConsented=false;consent.checked=false;enable.disabled=true;target=null;status.textContent='文件已變更，請重新點選擴充功能圖示並確認內容。';}});
