/* Injected only after the popup's explicit current-document consent. */
(function(){'use strict';if(window.top!==window)return;globalThis.TLSMRFTActiveR177?.controller.dispose();
let controller;
const provider=TLSMRFTLocalProviderR177.createProvider({api:globalThis.Translator,origin:location.origin,userActivation:()=>navigator.userActivation?.isActive===true});
const session=TLSMRFTR177.createSession({origin:location.origin,consent:true,provider,onChange:()=>controller?.refresh()});
controller=TLSMRFTDOMR177.createController(document,{session,onClose:()=>{delete globalThis.TLSMRFTActiveR177;}});
globalThis.TLSMRFTActiveR177=Object.freeze({controller});
})();
