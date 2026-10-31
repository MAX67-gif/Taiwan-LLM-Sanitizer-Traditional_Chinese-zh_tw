/* Original synthetic public fixture. Production modules only; no fake translator. */
'use strict';
let documentConsented=false;
const consent=document.getElementById('fixture-consent'),enable=document.getElementById('fixture-enable');
consent.addEventListener('change',event=>{if(!event.isTrusted)return;documentConsented=consent.checked;enable.disabled=!documentConsented;});
enable.addEventListener('click',event=>{
  if(!event.isTrusted || !documentConsented)return;globalThis.TLSMRFTActiveR177?.controller.dispose();let controller;
  const provider=TLSMRFTLocalProviderR177.createProvider({api:globalThis.Translator,origin:location.origin,userActivation:()=>navigator.userActivation?.isActive===true});
  const session=TLSMRFTR177.createSession({origin:location.origin,consent:true,provider,onChange:()=>controller?.refresh()});
  controller=TLSMRFTDOMR177.createController(document,{session,onClose:()=>{delete globalThis.TLSMRFTActiveR177;}});globalThis.TLSMRFTActiveR177=Object.freeze({controller});documentConsented=false;consent.checked=false;enable.disabled=true;
});
let count=0,revision=0;
document.getElementById('page-counter').addEventListener('click',()=>{document.getElementById('counter-value').textContent=String(++count);});
document.getElementById('update-public').addEventListener('click',()=>{revision++;for(let i=1;i<=3;i++){const el=document.getElementById('public-'+i);if(el)el.textContent=['The harbor lanterns guide a small boat toward the open quay.','A garden path passes bright flowers and a quiet stone bench.','The library opens its reading room for an afternoon workshop.'][i-1]+' Public revision '+revision+'.';}});
document.getElementById('replace-public').addEventListener('click',()=>{const el=document.getElementById('public-1');if(el)el.replaceWith(el.cloneNode(true));});
document.getElementById('remove-public').addEventListener('click',()=>document.getElementById('public-3')?.remove());
