/* TLS R11 MV3: optional manual site glossary bridge; R5 provider retained. MIT. */
(() => {
'use strict';
if(!globalThis.TLSCore||!globalThis.TLSProviders||!globalThis.TLSWeb||
   !globalThis.TLSPreferences||!globalThis.TLSProgress||!globalThis.TLSNames||!globalThis.TLSR11)return;

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
if(globalThis.__TLSR11Session){
  try{globalThis.__TLSR11Session.restore();}catch(_){}
}
let disposed=false;
let ctrl=null;
let r11Active=false;
const r11=globalThis.TLSR11.createSession(document);
globalThis.__TLSR11Session=r11;
const r11Status=()=>({ok:true,status:r11.status(),r11Active});

const progress=globalThis.TLSProgress.createIndicator(document,{
  visible:true,
  onClick:()=>{
    if(disposed||!ctrl||r11Active)return;
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
      respond({ok:true,status:ctrl.getStatus(),r11:r11.status(),r11Active});
    }else if(request.kind==='TLS_R11_STATUS'){
      respond(r11Status());
    }else if(request.kind==='TLS_R11_PREVIEW'){
      try{
        if(disposed||request.origin!==location.origin)throw new Error('SITE_NOT_AUTHORIZED');
        // R5 translation must not compete with R11 user decisions.
        const previouslyRunning=ctrl.isRunning();
        ctrl.stop();progress.update(ctrl.getStatus());
        let result;
        try{result=r11.preview(request.rows,request.domain||'auto');}
        catch(error){if(previouslyRunning&&!r11Active)ctrl.start();throw error;}
        r11Active=true;
        respond({ok:true,...result});
      }catch(e){respond({ok:false,reason:String(e?.message||e)});}
    }else if(request.kind==='TLS_R11_APPLY'){
      try{
        if(disposed||!r11Active||request.origin!==location.origin)throw new Error('SITE_NOT_AUTHORIZED');
        respond({ok:true,...r11.apply(request.selectedIds,request.revision)});
      }catch(e){respond({ok:false,reason:String(e?.message||e)});}
    }else if(request.kind==='TLS_R11_RESTORE'){
      try{
        if(disposed||request.origin!==location.origin)throw new Error('SITE_NOT_AUTHORIZED');
        respond({ok:true,...r11.restore()});
      }catch(e){respond({ok:false,reason:String(e?.message||e)});}
    }else if(request.kind==='TLS_R11_EXIT'){
      try{
        if(disposed||request.origin!==location.origin)throw new Error('SITE_NOT_AUTHORIZED');
        const result=r11.restore();r11Active=false;ctrl.start();
        respond({ok:true,...result});
      }catch(e){respond({ok:false,reason:String(e?.message||e)});}
    }else if(request.kind==='TLS_CONFIG'){
      if(disposed){respond({ok:false,reason:'DISABLED'});return false;}
      if(r11Active){r11.restore();r11Active=false;}
      ctrl.configure(valid(request.config));
      if(!ctrl.isRunning())ctrl.start();
      progress.update(ctrl.getStatus());
      respond({ok:true,status:ctrl.getStatus()});
    }else if(request.kind==='TLS_STOP'){
      disposed=true;
      r11.restore();r11Active=false;
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
  if(disposed||r11Active||globalThis.__TLSPageController!==ctrl)return;
  ctrl.configure(config);
  ctrl.start();
}).catch(()=>{
  if(!disposed&&!r11Active&&globalThis.__TLSPageController===ctrl)ctrl.start();
});
})();
