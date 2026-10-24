/* R13 standalone Tampermonkey reader, default OFF, site-scope only. */
(()=>{
'use strict';
if(window.top!==window.self||!globalThis.TLSR13ReaderUI)return;
const key='tls-r13-site-optin:'+location.origin;
let allowed=Boolean(GM_getValue(key,false)),reader=null;
function start(){if(!allowed)return;if(reader){reader.dispose();reader=null;}reader=globalThis.TLSR13ReaderUI.createReader(document,{onClose:()=>reader=null});}
function stop(){reader?.dispose();reader=null;}
function set(on){allowed=Boolean(on);GM_setValue(key,allowed);if(allowed)start();else stop();}
GM_registerMenuCommand('TLS R13：啟用／停用本站雙語閱讀',()=>set(!allowed));
GM_registerMenuCommand('TLS R13：開啟／重新開啟閱讀面板',()=>{if(allowed)start();});
GM_registerMenuCommand('TLS R13：清除本次閱讀內容',()=>reader?.clear());
if(allowed)start();
})();
