/* Tampermonkey controller. Build combines this with src/core/engine.js. */
(() => {
  'use strict';
  if(window.top!==window.self) return;
  const key='tls-enabled:'+location.origin;
  let enabled=Boolean(GM_getValue(key,false));
  let paused=false;
  const ctrl=globalThis.TLSCore.createLocalizer(document);
  const panel=document.createElement('div');
  panel.setAttribute('data-tls-ui','true');
  panel.style.cssText='position:fixed;right:8px;top:8px;z-index:2147483646;pointer-events:auto';
  const shadow=panel.attachShadow({mode:'closed'});
  const button=document.createElement('button');
  button.type='button';
  button.style.cssText='background:#155e75;color:white;border:1px solid white;border-radius:18px;padding:5px 10px;font:12px system-ui;cursor:pointer;box-shadow:0 2px 8px #0003';
  shadow.appendChild(button);
  function render() {
    button.textContent=paused?'繁中｜已暫停（點此恢復）':'繁中｜執行中（點此暫停）';
    if(enabled&&!panel.isConnected) (document.body||document.documentElement).appendChild(panel);
    if(!enabled&&panel.isConnected) panel.remove();
  }
  function setEnabled(next) {
    enabled=Boolean(next);
    GM_setValue(key,enabled);
    paused=false;
    if(enabled) ctrl.start(); else ctrl.stop();
    render();
  }
  button.addEventListener('click',()=>{
    if(!enabled) return;
    paused=!paused;
    if(paused) ctrl.stop(); else ctrl.start();
    render();
  });
  GM_registerMenuCommand('TLS：切換本站啟用／停用（停用還原）',()=>setEnabled(!enabled));
  GM_registerMenuCommand('TLS：暫停／恢復本站',()=>{
    if(enabled) button.click();
  });
  if(enabled) ctrl.start();
  render();
})();
