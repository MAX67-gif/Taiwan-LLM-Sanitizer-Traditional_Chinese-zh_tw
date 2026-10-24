/* R13 optional chrome content, isolated read-only bilingual panel. */
(()=>{
'use strict';
if(!globalThis.TLSR13ReaderUI)return;
if(globalThis.__TLSR13Reader){
 try{globalThis.__TLSR13Reader.dispose();}catch(_){ }
}
let closed=false;
const reader=globalThis.TLSR13ReaderUI.createReader(document,{onClose:()=>{closed=true;}});
globalThis.__TLSR13Reader=reader;
try{
 if(globalThis.__TLSR13Listener)chrome.runtime.onMessage.removeListener(globalThis.__TLSR13Listener);
 const listener=(request,_sender,respond)=>{
  if(!request||typeof request.kind!=='string'||!request.kind.startsWith('TLS_R13_'))return false;
  if(request.kind==='TLS_R13_STATUS')respond({ok:true,state:reader.getState()});
  else if(request.kind==='TLS_R13_CLOSE'){
   reader.dispose();closed=true;respond({ok:true});
  }else if(request.kind==='TLS_R13_OPEN'){
   if(closed)respond({ok:false,reason:'RELOAD_REQUIRED'});
   else respond({ok:true});
  }
  return false;
 };
 chrome.runtime.onMessage.addListener(listener);
 globalThis.__TLSR13Listener=listener;
}catch(_){/* extension runtime may have been disconnected; read-only UI remains safe */}
})();
