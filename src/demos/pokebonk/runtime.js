/* Taiwan-LLM-Sanitizer R7 PokéBonk example: opt-in, reversible DOM display only.
 * No code/assets from either PokéBonk or PokéSurvivor are included.
 * No network, game-state, account, save, canvas, WebGL or timing hooks. */
(function(){
"use strict";
const api=globalThis.TLSPokebonkProfile,pack=globalThis.__TLS_POKEBONK_PROFILE;
if(!api||!pack||!api.compatibility(document).hostAllowed)return;
const UI="tls-pokebonk-r7-display-demo";
if(document.getElementById(UI))return;
const glossary=api.compile(pack.entries),compat=api.compatibility(document);
const originals=new Map(),attrOriginals=new Map();
const cap=1700;
let running=false,changed=0,overLimit=false,observer=null,scheduled=false;
const pending=new Set();
const dock=document.createElement("div");dock.id=UI;
dock.setAttribute("data-tls-pokebonk-demo","true");
dock.style.cssText="position:fixed;right:14px;bottom:max(14px,env(safe-area-inset-bottom));width:48px;height:48px;z-index:2147483645;pointer-events:none;contain:layout style";
const root=dock.attachShadow({mode:"open"});
const style=document.createElement("style");
style.textContent=[
":host{display:block}*,*:before,*:after{box-sizing:border-box}",
"button,a{font:inherit}button{cursor:pointer;border:0}",
".pill{width:48px;height:48px;background:#e9f4f6;color:#134557;border:2px solid #fff;border-radius:50%;box-shadow:0 6px 18px #14304d66;font:700 18px system-ui;pointer-events:auto;position:relative}",
".pill[data-on=true]{background:#e5f8e8;color:#165c36}",
".pill[data-warning=true]{background:#fff0ce;color:#835013}",
".pill:after{content:'';position:absolute;inset:3px;border:3px solid #8cb3c6;border-radius:50%}",
".pill[data-on=true]:after{border-color:#2a945b}",
".panel{position:absolute;right:0;bottom:57px;max-height:50vh;overflow:auto;width:min(318px,calc(100vw - 28px));background:#fff;color:#243f4d;border:1px solid #c6d9e1;border-radius:13px;box-shadow:0 8px 30px #102b3e66;padding:13px;font:12px/1.5 system-ui,'Microsoft JhengHei',sans-serif;pointer-events:auto}",
".panel[hidden]{display:none!important}.panel h2{font-size:14px;margin:0 0 6px}.panel p{margin:6px 0}",
".actions{display:flex;gap:8px}.actions button{flex:1;min-height:36px;border-radius:8px;padding:7px}",
".yes{background:#126e66;color:#fff;font-weight:700}.no{background:#eaf0f4;color:#284354}",
".note{font-size:11px;color:#5d7182}.panel a{color:#146b77;word-break:break-word}",
"button:focus-visible,a:focus-visible{outline:3px solid #236dc5;outline-offset:3px}"
].join("");
const btn=document.createElement("button");btn.type="button";btn.className="pill";btn.textContent="臺";
btn.setAttribute("aria-label","臺灣用語示範設定");
const panel=document.createElement("div");panel.className="panel";panel.hidden=true;
const title=document.createElement("h2");title.textContent="PokéBonk・臺灣繁中試玩版";
const why=document.createElement("p");why.textContent="必須手動啟用。只處理目前看到的一般網頁文字，不碰戰鬥、帳號與存檔。";
const controls=document.createElement("div");controls.className="actions";
const turnOn=document.createElement("button");turnOn.type="button";turnOn.className="yes";turnOn.textContent="啟用臺灣用語";
const turnOff=document.createElement("button");turnOff.type="button";turnOff.className="no";turnOff.textContent="停用／還原";
controls.append(turnOn,turnOff);
const status=document.createElement("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
const warning=document.createElement("p");warning.className="note";warning.textContent=compat.advisory;
const limitation=document.createElement("p");limitation.className="note";
limitation.textContent="WebGL／Canvas 及玩家輸入內容不處理。本工具與寶可夢權利人、遊戲作者無關。";
const github=document.createElement("a");
github.href="https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases";
github.target="_blank";github.rel="noopener noreferrer";
github.textContent="手動查看 Github 新版本";
panel.append(title,why,controls,status,warning,limitation,github);
root.append(style,btn,panel);
function render(){
 btn.dataset.on=running?"true":"false";btn.dataset.warning=overLimit?"true":"false";
 btn.textContent=running?"✓":"臺";
 status.textContent=running?
  ("已改寫 "+changed+" 處畫面文字。"+(overLimit?"其他項目超出限制，已略過。":"WebGL/Canvas 不包含在內。")):
  "目前停用。點「啟用臺灣用語」後才開始。";
}
function canAdd(map){
 if(map.size<cap)return true;
 for(const n of map.keys())if(!n.isConnected)map.delete(n);
 if(map.size>=cap){overLimit=true;return false;}
 return true;
}
function textNode(node){
 if(!api.eligibleText(node))return;
 const before=node.nodeValue,record=originals.get(node);
 if(record&&record.after===before)return;
 const after=api.translateExact(before,glossary);
 if(after===before||!canAdd(originals))return;
 originals.set(node,{before,after});node.nodeValue=after;changed++;
}
function attrNode(el){
 if(!el||el.nodeType!==1||el.hasAttribute("data-tls-pokebonk-demo"))return;
 for(const name of ["title","aria-label","placeholder","alt"]){
  if(!api.eligibleAttr(el,name))continue;
  const before=el.getAttribute(name);
  if(!before)continue;
  const current=attrOriginals.get(el)?.get(name);
  if(current?.after===before)continue;
  const after=api.translateExact(before,glossary);
  if(before===after||!canAdd(attrOriginals))continue;
  const records=attrOriginals.get(el)||new Map();
  records.set(name,{before,after});attrOriginals.set(el,records);
  el.setAttribute(name,after);changed++;
 }
}
function scan(node){
 if(!running||!node)return;
 if(node.nodeType===3){textNode(node);return;}
 if(![1,9,11].includes(node.nodeType))return;
 if(node.nodeType===1)attrNode(node);
 const walk=document.createTreeWalker(node,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
 let item,n=0;
 while((item=walk.nextNode())&&n++<3500)
   if(item.nodeType===3)textNode(item);else attrNode(item);
 if(item)overLimit=true;
}
function flush(){
 scheduled=false;if(!running)return;
 let count=0;
 for(const item of pending){pending.delete(item);scan(item);if(++count>=40){overLimit=true;break;}}
 if(pending.size&&!scheduled){scheduled=true;requestAnimationFrame(flush);}
 render();
}
function enqueue(node){
 if(!running)return;
 pending.add(node);
 if(!scheduled){scheduled=true;requestAnimationFrame(flush);}
}
function start(){
 if(running)return;
 running=true;changed=0;overLimit=false;
 scan(document.body||document.documentElement);
 observer=new MutationObserver(events=>{
  for(const e of events){
   if(e.type==="characterData"||e.type==="attributes")enqueue(e.target);
   else for(const x of e.addedNodes)enqueue(x);
  }
 });
 observer.observe(document.body||document.documentElement,{
   subtree:true,childList:true,characterData:true,attributes:true,
   attributeFilter:["title","aria-label","placeholder","alt"]
 });
 render();
}
function stop(){
 running=false;observer?.disconnect();observer=null;
 pending.clear();
 for(const [node,value] of originals)
  if(node.isConnected&&node.nodeValue===value.after)node.nodeValue=value.before;
 for(const [el,map] of attrOriginals)
  if(el.isConnected)for(const [key,v] of map)
   if(el.getAttribute(key)===v.after)el.setAttribute(key,v.before);
 originals.clear();attrOriginals.clear();render();
}
btn.addEventListener("click",()=>{panel.hidden=!panel.hidden;});
turnOn.addEventListener("click",start);
turnOff.addEventListener("click",stop);
document.documentElement.appendChild(dock);
render();
})();
