/* Taiwan-LLM-Sanitizer R5 visual status: stable, local-only, responsive. MIT. */
(function(global){
'use strict';
const VERSION='0.4.0';
const CSS=":host{all:initial;display:block}\nbutton{box-sizing:border-box;width:52px;height:52px;display:grid;place-items:center;\nborder-radius:50%;border:2px solid #fff9;background:#f0f4f8;color:#253d50;\nbox-shadow:0 4px 17px #102a343b;cursor:pointer;position:relative;pointer-events:auto;\nfont:700 18px/1 system-ui,sans-serif}\nbutton:focus-visible{outline:3px solid #1a70cc;outline-offset:3px}\n.arc{box-sizing:border-box;position:absolute;inset:4px;border-radius:50%;\nborder:4px solid #b4c5cf;border-top-color:#227b94;transform:rotate(0deg)}\n.glyph{position:relative;z-index:1;font-size:19px;line-height:1}\nbutton[data-state=\"running\"] .arc{animation:tls-spin .86s linear infinite}\nbutton[data-state=\"download\"] .arc{background:conic-gradient(#1979a7 var(--percent,0%),#d6e5ee 0);\nborder:0;padding:4px;-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));\nmask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px))}\nbutton[data-state=\"done\"]{background:#e1f6ec;color:#125d3c}\nbutton[data-state=\"done\"] .arc{border:4px solid #2a8d59}\nbutton[data-state=\"warning\"]{background:#fff3d7;color:#8e5a0b}\nbutton[data-state=\"warning\"] .arc{border:4px solid #c27d10}\nbutton[data-state=\"paused\"]{background:#e5e9f0;color:#536070}\nbutton[data-state=\"paused\"] .arc{border:4px solid #8994a5}\nbutton[data-state=\"idle\"] .arc{border-color:#cad6dc}\n@keyframes tls-spin{to{transform:rotate(360deg)}}\n@media(prefers-reduced-motion:reduce){button[data-state=\"running\"] .arc{animation:none;border-style:dashed}}";
function stateOf(s){
 if(!s||!s.running)return 'paused';
 if(s.provider?.state==='MODEL_DOWNLOAD'||s.lastState==='MODEL_DOWNLOAD')return 'download';
 if(s.busy||s.queued>0)return 'running';
 if(s.provider?.state==='DEGRADED'||s.errors>0||s.overflow>0)return 'warning';
 return s.scanned>0||s.converted>0?'done':'idle';
}
const LABELS=Object.freeze({
 paused:'臺灣繁中化：已暫停，按一下可操作',
 running:'臺灣繁中化：正在翻譯',
 download:'臺灣繁中化：正在準備本機語言模型',
 warning:'臺灣繁中化：部分內容未完成',
 done:'臺灣繁中化：目前可處理的文字已完成',
 idle:'臺灣繁中化：已啟用，等待文字'
});
const GLYPHS={paused:'Ⅱ',running:'↻',download:'↓',warning:'!',done:'✓',idle:'文'};
function createIndicator(doc,options={}){
 if(!doc?.documentElement)throw new TypeError('Document required');
 const host=doc.createElement('div');
 host.setAttribute('data-tls-ui','true');
 host.setAttribute('data-tls-indicator','true');
 for(const [name,value] of Object.entries({
   position:'fixed',bottom:'max(12px, env(safe-area-inset-bottom))',
   right:'max(12px, env(safe-area-inset-right))',
   width:'52px',height:'52px',zIndex:'2147483646',
   pointerEvents:'none',contain:'layout style'
 })){host.style[name]=value;}
 const shadow=host.attachShadow({mode:'closed'});
 const style=doc.createElement('style');style.textContent=CSS;
 const button=doc.createElement('button');button.type='button';
 button.dataset.state='idle';button.setAttribute('aria-label',LABELS.idle);
 button.title=LABELS.idle;
 const arc=doc.createElement('span');arc.className='arc';arc.setAttribute('aria-hidden','true');
 const glyph=doc.createElement('span');glyph.className='glyph';glyph.textContent=GLYPHS.idle;
 glyph.setAttribute('aria-hidden','true');button.append(arc,glyph);shadow.append(style,button);
 button.addEventListener('click',()=>options.onClick?.());
 let alive=true,visible=false,current='idle';
 function show(yes=true){
   visible=Boolean(yes);
   if(visible){if(!host.isConnected)doc.documentElement.appendChild(host);}
   else if(host.isConnected)host.remove();
 }
 function update(status){
   if(!alive)return;
   const state=stateOf(status);
   current=state;button.dataset.state=state;
   button.setAttribute('aria-label',LABELS[state]);
   button.title=LABELS[state];
   glyph.textContent=GLYPHS[state];
   if(state==='download'){
     const p=Number(status?.modelProgress);
     button.style.setProperty('--percent',Number.isFinite(p)?String(Math.round(Math.max(0,Math.min(1,p))*100))+'%':'0%');
   }else button.style.removeProperty('--percent');
 }
 function destroy(){alive=false;show(false);}
 if(options.visible!==false)show(true);
 return Object.freeze({show,update,destroy,button,host,get state(){return current;},get visible(){return visible;}});
}
const api=Object.freeze({VERSION,stateOf,createIndicator});
global.TLSProgress=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
