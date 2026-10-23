/* Chrome MV3: per-site explicit permission, persistent registration. */
(() => {
  'use strict';
  const button=document.querySelector('#toggle');
  const state=document.querySelector('#state');
  const host=document.querySelector('#host');
  let tab, pattern, scriptId, enabled=false;
  function hashId(value) {
    let hash=2166136261;
    for(const char of value) hash=Math.imul(hash ^ char.charCodeAt(0),16777619)>>>0;
    return 'tls_site_'+hash.toString(16);
  }
  function render() {
    state.textContent=enabled?'本站已啟用；重新整理仍有效':'本站未啟用';
    button.textContent=enabled?'停用本站並還原':'啟用本站繁中化';
    button.disabled=false;
  }
  async function init() {
    try {
      const tabs=await chrome.tabs.query({active:true,currentWindow:true});
      tab=tabs[0];
      const url=new URL(tab.url);
      if(!['http:','https:'].includes(url.protocol))
        throw new Error('只能在一般 HTTP(S) 網頁使用');
      pattern=url.protocol+'//'+url.hostname+'/*';
      scriptId=hashId(pattern);
      host.textContent='目前網站：'+url.hostname;
      const scripts=await chrome.scripting.getRegisteredContentScripts({ids:[scriptId]});
      enabled=scripts.some(s=>s.matches.includes(pattern));
      render();
    } catch(err) {
      host.textContent='無法使用：'+err.message;
      state.textContent='受瀏覽器限制或此頁無法注入';
      button.disabled=true;
    }
  }
  async function stopCurrentPage() {
    try {
      await chrome.scripting.executeScript({
        target:{tabId:tab.id},
        func:()=>globalThis.__TLSPageController?.stop()
      });
    } catch (_) { /* navigation or restricted frame: registration is still removed */ }
  }
  button.addEventListener('click', () => {
    button.disabled=true;
    if(!enabled) {
      // Request begins directly within a real click gesture.
      chrome.permissions.request({origins:[pattern]}).then(async accepted=>{
        if(!accepted) throw new Error('未授權本站');
        const registered=await chrome.scripting.getRegisteredContentScripts({ids:[scriptId]});
        if(!registered.length) await chrome.scripting.registerContentScripts([{
          id:scriptId,matches:[pattern],js:['engine.js','content.js'],
          runAt:'document_idle',persistAcrossSessions:true,allFrames:false
        }]);
        await chrome.scripting.executeScript({
          target:{tabId:tab.id},files:['engine.js','content.js']
        });
        enabled=true;render();
      }).catch(err=>{state.textContent='啟用失敗：'+err.message;button.disabled=false;});
    } else {
      (async()=>{
        await stopCurrentPage();
        await chrome.scripting.unregisterContentScripts({ids:[scriptId]});
        await chrome.permissions.remove({origins:[pattern]});
        enabled=false;render();
      })().catch(err=>{state.textContent='停用失敗：'+err.message;button.disabled=false;});
    }
  });
  init();
})();
