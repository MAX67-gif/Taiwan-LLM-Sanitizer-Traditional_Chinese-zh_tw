/* R2 Chrome content adapter: isolated world + site storage. */
(() => {
  'use strict';
  if(!globalThis.TLSCore || !globalThis.TLSProviders || !globalThis.TLSWeb)return;
  const key='tls-site-config-v2:'+location.origin;
  const defaults={mode:'terms',sourceLanguage:'auto'};
  const valid=(v)=>globalThis.TLSProviders.selected(v?.mode,v?.sourceLanguage);
  async function configFromStorage(){
    try{
      const settings=await chrome.storage.local.get(key);
      return valid(settings[key]||defaults);
    }catch(_){return defaults;}
  }
  function registerListener(){
    try {
      if(globalThis.__TLSRuntimeListener)chrome.runtime.onMessage.removeListener(globalThis.__TLSRuntimeListener);
      const handler=(request,sender,sendResponse)=>{
        if(!request || typeof request!=='object' || !String(request.kind||'').startsWith('TLS_'))return false;
        if(request.kind==='TLS_STATUS'){
          sendResponse({ok:true,status:globalThis.__TLSPageController?.getStatus()||null});
        }else if(request.kind==='TLS_CONFIG'){
          const opts=valid(request.config);
          globalThis.__TLSPageController?.configure(opts);
          sendResponse({ok:true,status:globalThis.__TLSPageController?.getStatus()||null});
        }else if(request.kind==='TLS_STOP'){
          globalThis.__TLSPageController?.stop();
          sendResponse({ok:true});
        }
        return false;
      };
      chrome.runtime.onMessage.addListener(handler);
      globalThis.__TLSRuntimeListener=handler;
    }catch(_){}
  }
  // Reloading/changing versions may leave a previous controller in this frame.
  if(globalThis.__TLSPageController) {
    try{globalThis.__TLSPageController.stop();}catch(_){}
  }
  const ctrl=globalThis.TLSWeb.createWebLocalizer(document,defaults);
  globalThis.__TLSPageController=ctrl;
  registerListener();
  configFromStorage().then(opts=>{
    if(globalThis.__TLSPageController!==ctrl)return;
    ctrl.configure(opts);
    ctrl.start();
  }).catch(()=>ctrl.start());
})();
