/* Taiwan-LLM-Sanitizer PokéBonk display-only demo R7. MIT original adapter.
 * Do not import game runtime, change canvas, game state, requests, login, or saves.
 * The profile is generated from src/demos/pokebonk/profile.json at build time. */
(function(global){
'use strict';
const VERSION="0.1.0";
const ALLOWED_HOSTS=new Set(["pokebonk.com","www.pokebonk.com"]);
function compile(entries) {
 if(!Array.isArray(entries))throw Error("PROFILE_DATA_REQUIRED");
 const exact=new Map();
 for(const e of entries){
  if(!e||typeof e.from!=="string"||typeof e.to!=="string"||!e.from||!e.to)
    throw Error("INVALID_ENTRY");
  if(exact.has(e.from)&&exact.get(e.from)!==e.to)throw Error("PROFILE_CONFLICT");
  exact.set(e.from,e.to);
 }
 return exact;
}
function translateExact(text,mappings) {
 if(typeof text!=="string"||text.length>350)return text;
 const match=/^(\s*)([\s\S]*?)(\s*)$/u.exec(text);
 if(!match)return text;
 const value=mappings.get(match[2]);
 return value===undefined?text:match[1]+value+match[3];
}
function compatibility(doc){
 const gameModule=[...doc.querySelectorAll('script[src]')]
  .map(x=>x.getAttribute('src')||'')
  .filter(x=>/\/assets\/main-[^/]+\.js/u.test(x));
 const reported=gameModule.at(-1)||null;
 return {
  hostAllowed:ALLOWED_HOSTS.has(doc.location?.hostname||""),
  reportedBundle:reported,
  previousReference:"main-CmuSC2AB-mvd1mlac.js",
  versionExactKnown:reported?reported.includes("main-CmuSC2AB-mvd1mlac.js"):false,
  advisory:reported&&!reported.includes("main-CmuSC2AB-mvd1mlac.js")
    ?"頁面使用不同於 2026-10-18 資料快照的主程式；繼續採文字顯示層處理，不接觸遊戲內部。"
    :"版本與來源未充分驗證；僅可試用顯示層文字，不保證 WebGL／Canvas 覆蓋。"
 };
}
function eligibleText(node) {
 if(!node||node.nodeType!==3||!node.parentElement)return false;
 const e=node.parentElement;
 if(e.closest('script,style,noscript,code,pre,textarea,input,select,option,svg,canvas,iframe,video,audio,template,[contenteditable],[translate="no"],[data-tls-pokebonk-demo]'))return false;
 if(e.closest('[class*="trainer-name"],[class*="player-name"],[class*="nickname"],[class*="chat"],[id*="nickname"],[id*="password"],[data-user-content]'))return false;
 return true;
}
function eligibleAttr(el,name) {
 if(!el||el.nodeType!==1||!['title','aria-label','placeholder','alt'].includes(name))return false;
 if(el.closest('[data-tls-pokebonk-demo],script,style,textarea,[contenteditable],[translate="no"],[data-user-content]'))return false;
 if(el.matches('input[type="password"],input[type="email"],input[name*="password"]'))return false;
 return true;
}
const PUBLIC_API=Object.freeze({VERSION,ALLOWED_HOSTS,compile,translateExact,compatibility,eligibleText,eligibleAttr});
global.TLSPokebonkProfile=PUBLIC_API;
if(typeof module!=="undefined"&&module.exports)module.exports=PUBLIC_API;
})(typeof globalThis!=="undefined"?globalThis:this);
