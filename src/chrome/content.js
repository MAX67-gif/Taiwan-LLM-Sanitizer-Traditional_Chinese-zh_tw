/* Taiwan-LLM-Sanitizer R5: MV3 content adapter, fixed visual progress, no network. MIT. */
(() => {
'use strict';
if(!globalThis.TLSCore||!globalThis.TLSProviders||!globalThis.TLSWeb||
   !globalThis.TLSPreferences||!globalThis.TLSProgress||!globalThis.TLSNames)return;

const key='tls-site-config-v2:'+location.origin;
const defaults={mode:'terms',sourceLanguage:'auto',domain:'auto',
  regionalPreference:'balanced',tone:'faithful'};
const domains=new Set(globalThis.TLSPreferences.DOMAINS);
const valid=(input)=>({
  ...globalThis.TLSProviders.selected(input?.mode,input?.sourceLanguage),
  ...globalThis.TLSPreferences.normalize(input||defaults),
  domain:domains.has(input?.domain)?input.domain:'auto'
});
async function stored(){
  try {
    const result=await chrome.storage.local.get(key);
    return valid(result[key]||defaults);
  }catch(_){return defaults;}
}
if(globalThis.__TLSPageController){
  try{globalThis.__TLSPageController.stop();}catch(_){}
}
if(globalThis.__TLSProgressIndicator){
  try{globalThis.__TLSProgressIndicator.destroy();}catch(_){}
}
let disposed=false;
let ctrl=null;
const progress=globalThis.TLSProgress.createIndicator(document,{
  visible:true,
  onClick:()=>{
    if(disposed||!ctrl)return;
    if(ctrl.isRunning())ctrl.stop();else ctrl.start();
    progress.update(ctrl.getStatus());
  }
});
globalThis.__TLSProgressIndicator=progress;
ctrl=globalThis.TLSWeb.createWebLocalizer(document,{
  ...defaults,onStatus:(status)=>{if(!disposed)progress.update(status);}
});
globalThis.__TLSPageController=ctrl;

try{
  if(globalThis.__TLSRuntimeListener)
    chrome.runtime.onMessage.removeListener(globalThis.__TLSRuntimeListener);
  const listener=(request,sender,respond)=>{
    if(!request||typeof request.kind!=='string'||!request.kind.startsWith('TLS_'))return false;
    if(request.kind==='TLS_STATUS'){
      respond({ok:true,status:ctrl.getStatus()});
    }else if(request.kind==='TLS_CONFIG'){
      if(disposed){respond({ok:false,reason:'DISABLED'});return false;}
      ctrl.configure(valid(request.config));
      progress.update(ctrl.getStatus());
      respond({ok:true,status:ctrl.getStatus()});
    }else if(request.kind==='TLS_STOP'){
      disposed=true;
      ctrl.stop();
      progress.destroy();
      respond({ok:true});
    }
    return false;
  };
  chrome.runtime.onMessage.addListener(listener);
  globalThis.__TLSRuntimeListener=listener;
}catch(_){/* extension runtime may be temporarily disconnected after an update */}

// Consent already given by the Chrome popup at registration. Do not restart
// if the user disabled the site while storage was still resolving.
stored().then(config=>{
  if(disposed||globalThis.__TLSPageController!==ctrl)return;
  ctrl.configure(config);
  ctrl.start();
}).catch(()=>{
  if(!disposed&&globalThis.__TLSPageController===ctrl)ctrl.start();
});
})();
