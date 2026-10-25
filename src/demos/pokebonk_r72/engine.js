/* Taiwan-LLM-Sanitizer PokéBonk display-only demo R7.2. MIT original adapter.
 * Do not import game runtime, change canvas, game state, requests, login, or saves.
 * The profile is generated from src/demos/pokebonk/profile.json at build time. */
(function(global){
'use strict';
const VERSION="0.1.2";
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
 // An observed game JS bundle is a diagnostic only, not a version gate.
 // Do NOT read site cookies, localStorage, JS game state or private data.
 const files=[...doc.querySelectorAll('script[src]')]
  .map(el=>el.getAttribute('src')||'')
  .filter(src=>/\/assets\/main-[^/]+\.js/u.test(src));
 const observed=files.at(-1)||null;
 return {
  hostAllowed:ALLOWED_HOSTS.has(doc.location?.hostname||''),
  reportedBundle:observed,
  versionExactKnown:false,
  evidenceStatus:'LIVE_BUILD_NOT_VERIFIED',
  advisory:observed
   ?'偵測到網站主程式檔名，尚未證實與新版本 UI 一致；只修改明確匹配的顯示文字，不碰遊戲邏輯。'
   :'無法從頁面確認遊戲主程式版本；仍可安全試用可見 DOM 完整詞條，Canvas/WebGL 及未識別內容不處理。'
 };
}
// Keep the same content and ancestry boundaries for text AND display attributes.
// This also excludes semantically hidden UI and common CSS-hidden nodes.
const SKIP_COMMON='script,style,noscript,code,pre,textarea,select,option,svg,canvas,iframe,video,audio,template,input,form,[contenteditable],[translate="no"],[data-tls-pokebonk-demo]';
// Do not inspect, translate or persist player-generated content. Broad exclusion
// is deliberate, as Season 2 introduced co-op rooms/chat/clan/profile surfaces.
const SKIP_PERSONAL='[class*="player" i],[class*="trainer-name" i],[class*="nickname" i],[class*="username" i],[class*="chat" i],[class*="message" i],[class*="comment" i],[class*="member-name" i],[class*="leaderboard-entry" i],[id*="nickname" i],[id*="player-name" i],[id*="chat" i],[id*="password" i],[data-testid*="chat" i],[data-testid*="message" i],[data-user-content],[role="log"],[role="textbox"],[aria-label*="player name" i]';
const SKIP_HIDDEN='[hidden],[aria-hidden="true"],[inert]';
function excluded(el,forText) {
 if(!el||el.nodeType!==1)return true;
 try{
  const selectors=SKIP_COMMON+','+SKIP_PERSONAL+','+SKIP_HIDDEN;
  if(el.closest(selectors)||el.isContentEditable)return true;
  for(let p=el;p&&p.nodeType===1;p=p.parentElement){
   const local=p.style;
   if(local&&(local.display==='none'||local.visibility==='hidden'||local.visibility==='collapse'))return true;
   if(typeof global.getComputedStyle==='function'){
    const css=global.getComputedStyle(p);
    if(css&&(css.display==='none'||css.visibility==='hidden'||css.visibility==='collapse'))return true;
   }
  }
  return false;
 }catch(_){return true;}
}
function eligibleText(node) {
 return !!node&&node.nodeType===3&&!!node.parentElement&&!excluded(node.parentElement,true);
}
function eligibleAttr(el,name) {
 if(!el||el.nodeType!==1||!['title','aria-label','placeholder','alt'].includes(name))return false;
 if(excluded(el,false))return false;
 if(typeof el.matches!=='function')return false;
 return !el.matches('input,textarea,select,[contenteditable],[role="textbox"]');
}
const PUBLIC_API=Object.freeze({VERSION,ALLOWED_HOSTS,compile,translateExact,compatibility,eligibleText,eligibleAttr});
global.TLSPokebonkProfile=PUBLIC_API;
if(typeof module!=="undefined"&&module.exports)module.exports=PUBLIC_API;
})(typeof globalThis!=="undefined"?globalThis:this);
