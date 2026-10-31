/* MIT. R17.7 bounded ordinary-DOM reader. No network, storage, shadow or frame traversal.
 * createController(document,{session,onClose}) returns dispose(), refresh() and diagnostics().
 * refresh only repaints session state; it never reads page source. diagnostics returns only
 * closed, scanCount, scheduledCount, pendingTimers, regionCount and listenerCount counters.
 * There is no source-reading/test bypass API. The open Shadow DOM isolates UI styles only.
 */
(function (global) {
  'use strict';
  const BLOCKED = 'input,textarea,select,option,button,form,[contenteditable]:not([contenteditable="false"]),[hidden],[inert],[aria-hidden="true"],script,style,code,pre,iframe,canvas,svg,video,audio,picture,img,object,embed,[data-mrft-root],[data-mrft-host],[data-private],[data-sensitive],[role="log"],[role="textbox"]';
  const PRIVATE = /(?:private|sensitive|secret|password|payment|credit.?card|account|nickname|chat|message|inbox|conversation|token|credential|username|user.?id)/i;
  const IDENTITY = ['id','data-id','data-key','data-item-id','data-identity','itemid','name'];
  const identity = el => IDENTITY.map(key => el.getAttribute(key) || '').join('\u001f');
  const intersects = (a,b) => a.x < b.x+b.width && b.x < a.x+a.width && a.y < b.y+b.height && b.y < a.y+a.height;
  const intersection = (a,b) => { const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);return {x,y,width:Math.max(0,Math.min(a.x+a.width,b.x+b.width)-x),height:Math.max(0,Math.min(a.y+a.height,b.y+b.height)-y)}; };
  function excluded(el,win) {
    if (el.matches(BLOCKED)) return true;
    for (const key of ['id','class','name','aria-label','data-sensitive','data-private','autocomplete','role']) {
      const value=el.getAttribute(key);
      if (value && PRIVATE.test(value)) return true;
    }
    const style=win.getComputedStyle(el);
    return style.display==='none' || style.visibility!=='visible' || Number(style.opacity)===0;
  }
  function readRegion(doc,rect) {
    const win=doc.defaultView;
    if (rect.width<4 || rect.height<4) return {text:'',reason:'EMPTY_REGION',anchor:null};
    let clip=intersection(rect,{x:0,y:0,width:win.innerWidth,height:win.innerHeight});
    if (!clip.width || !clip.height) return {text:'',reason:'OUTSIDE_VIEWPORT',anchor:null};
    // Gate the body's root ancestor without traversing head, frames or shadow trees.
    if (excluded(doc.documentElement,win)) return {text:'',reason:'EXCLUDED_ROOT',anchor:null};
    let nodes=1,chars=0,out='',anchor=null,lastY=null,lastParent=null;
    const range=doc.createRange();
    function walk(el,visible) {
      if (++nodes>4000) throw Error('NODE_BUDGET');
      if (excluded(el,win)) return;
      const style=win.getComputedStyle(el),box=el.getBoundingClientRect();
      let next=visible;
      if (/(hidden|clip|scroll|auto)/.test(style.overflowX+' '+style.overflowY)) next=intersection(visible,box);
      if (!next.width || !next.height) return;
      for (const child of el.childNodes) {
        if (child.nodeType===1) walk(child,next);
        else if (child.nodeType===3) {
          if (++nodes>4000) throw Error('NODE_BUDGET');
          range.selectNodeContents(child);
          if (![...range.getClientRects()].some(r=>intersects(r,next))) continue;
          if (chars+child.length>16000) throw Error('CHARACTER_BUDGET');
          chars+=child.length;
          for(let i=0;i<child.length;i++) {
            range.setStart(child,i);range.setEnd(child,i+1);
            const glyph=[...range.getClientRects()].find(r=>r.width>0 && r.height>0 && intersects(r,next));
            if(!glyph)continue;
            // Only now, after ancestry, clipping and individual glyph intersection, read the character.
            if(out && (lastParent!==el || Math.abs(glyph.y-lastY)>3) && !/\s$/.test(out))out+='\n';
            const clipped=intersection(glyph,next);
            const hit=doc.elementsFromPoint(clipped.x+clipped.width/2,clipped.y+clipped.height/2).find(node=>!node.closest('[data-mrft-host],[data-mrft-root]'));
            if(hit!==el)continue;
            out+=child.substringData(i,1);lastY=glyph.y;lastParent=el;
            if(out.length>10000)throw Error('SOURCE_BUDGET');
            if(!anchor)anchor=el;
          }
        }
      }
    }
    try {walk(doc.body,clip);if(/https?:\/\/|\{\{|\$\{|```|[\{,]\s*"[^"]+"\s*:/.test(out))return {text:'',reason:'TECHNICAL_SOURCE_EXCLUDED',anchor:null};return {text:out.trim(),reason:out.trim()?'':'EMPTY_REGION',anchor};}
    catch(error){return {text:'',reason:error.message,anchor:null};}
    finally{range.detach();}
  }
  function createController(doc,{session,onClose=()=>{}}) {
    const win=doc.defaultView,roots=[],listeners=[],frames=new Map(),cards=new Map();
    let closed=false,timer=null,drawing=null,drag=null,scanCount=0,scheduledCount=0,observer=null,rendering=false;
    const carrier=doc.createElement('div');carrier.dataset.mrftHost='';carrier.style.cssText='all:initial!important;display:block!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483646!important';const shadow=carrier.attachShadow({mode:'open'});const host=doc.createElement('div');host.dataset.mrftRoot='';shadow.append(host);host.setAttribute('aria-label','MRFT 翻譯預覽');
    host.style.cssText='all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483646;font:14px system-ui;color:#172331';
    const style=doc.createElement('style');style.textContent=`[data-mrft-root] *{box-sizing:border-box}[data-mrft-root] button,[data-mrft-root] select,[data-mrft-root] textarea,[data-mrft-root] input{font:inherit}[data-mrft-root] button{cursor:pointer;border:1px solid #b7cbd5;border-radius:6px;background:#fff;color:#173b49;padding:6px 8px}[data-mrft-root] button:disabled{opacity:.45;cursor:default}[data-mrft-root] :focus-visible{outline:3px solid #ffb547;outline-offset:2px}[data-mrft-root] label{display:block;margin:6px 0}[data-mrft-root] select{max-width:100%;padding:4px}[data-mrft-root] textarea{width:100%;min-height:55px}[data-mrft-root] p{margin:6px 0}[data-mrft-root] details{margin:6px 0}[data-mrft-root] [data-mrft-card]{border-top:1px solid #c5d6dc;margin-top:12px;padding-top:10px}[data-mrft-root] [data-mrft-source],[data-mrft-root] [data-mrft-result]{white-space:pre-wrap;overflow-wrap:anywhere;max-height:110px;overflow:auto;padding:7px;background:#eff6f8;border-radius:5px}[data-mrft-root] [data-mrft-status]{font-weight:600;color:#74501c}[data-mrft-root] .mrft-row{display:flex;gap:5px;flex-wrap:wrap;margin:5px 0}`;
    host.append(style);doc.documentElement.append(carrier);roots.push(carrier);
    const panel=doc.createElement('section');panel.style.cssText='pointer-events:auto;position:absolute;z-index:2;right:12px;top:12px;width:min(365px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;background:#fff;padding:14px;border:1px solid #8daeba;border-radius:12px;box-shadow:0 6px 30px #0003';host.append(panel);
    const title=doc.createElement('strong');title.textContent='MRFT · 多區域翻譯預覽';panel.append(title);
    const body=doc.createElement('div');
    function el(tag,text,parent=body){const node=doc.createElement(tag);if(text)node.textContent=text;parent.append(node);return node;}
    function listen(target,type,fn,options){target.addEventListener(type,fn,options);listeners.push({target,off:()=>target.removeEventListener(type,fn,options)});}
    function button(text,fn,parent=body){const b=el('button',text,parent);b.type='button';listen(b,'click',event=>{if(event.isTrusted)fn(event);});return b;}
    button('收合面板',e=>{body.hidden=!body.hidden;e.currentTarget.textContent=body.hidden?'展開面板':'收合面板';},panel);panel.append(body);
    el('p','僅適用於公開、非敏感的一般 HTML。標記無法辨識所有私人內容或重複使用的項目。原文保持不變。');
    const description=el('details');el('summary','模式與支援範圍',description);el('p','FOLLOW_DOM 跟隨原本元素；FIX_VIEWPORT 固定螢幕座標，讀取捲入的文字。元素移除或識別標記變更時，需要重新綁定。不讀取框架、Shadow DOM、畫布或圖片，也不提供 OCR。擴充功能為桌面版 Chrome 預覽；範例頁可用觸控畫框。',description);
    el('p','狀態說明：WAITING_MANUAL 等待貼上譯文；SOURCE_DIRTY 正在確認原文；NEEDS_REBIND 請重新綁定；MODEL_UNAVAILABLE 模型不可用；DOWNLOAD_REQUIRED 需要明確同意下載；UNSUPPORTED_PAIR 不支援此語言組合。LOCAL 僅提供本機預覽，不代表臺灣用語或語意品質認證。',description);
    const modeLabel=el('label','新框模式 ');const mode=el('select',null,modeLabel);mode.dataset.mrftAction='mode';for(const value of ['FOLLOW_DOM','FIX_VIEWPORT']){const option=el('option',value,mode);option.value=value;}
    const toolbar=el('div');toolbar.className='mrft-row';
    const add=button('畫出區域',()=>startDrawing(null),toolbar);
    button('全部暫停',()=>{session.pauseAll();stopTimer();render();},toolbar);
    button('全部關閉',dispose,toolbar);
    const notice=el('p','在頁面拖曳畫框；按 Escape 取消。');notice.setAttribute('role','status');
    const cardList=el('div');
    function safe(fn){try{fn();}catch(error){notice.textContent=error.code || 'ACTION_UNAVAILABLE';}render();}
    function stopTimer(){if(timer!==null){win.clearTimeout(timer);timer=null;}}
    function active(record){return record.state==='WATCHING';}
    function schedule(){if(closed || timer!==null || !session.listRegions().some(active))return;scheduledCount++;timer=win.setTimeout(()=>{timer=null;scan();},180);}
    function invalidate(){if(closed)return;for(const r of session.listRegions())if(active(r))session.markDirty(r.id);schedule();render();}
    function scan(){if(closed)return;scanCount++;for(const r of session.listRegions()) {
      if(!active(r))continue;
      const f=frames.get(r.id);if(!f)continue;
      let rect=r.rect;
      if(r.anchorMode==='FOLLOW_DOM' && f.anchor){
        if(!f.anchor.isConnected || identity(f.anchor)!==f.identity){session.needsRebind(r.id,'ANCHOR_CHANGED');continue;}
        const b=f.anchor.getBoundingClientRect();rect={x:b.x+f.offset.x,y:b.y+f.offset.y,width:r.rect.width,height:r.rect.height};
        if(rect.x!==r.rect.x || rect.y!==r.rect.y)session.updateRegion(r.id,{rect});
      }
      const read=readRegion(doc,rect);f.reason=read.reason;
      session.setSource(r.id,read.text);
    }render();}
    function bind(id,rect){const f=frames.get(id),read=readRegion(doc,rect);f.anchor=read.anchor;f.identity=read.anchor?identity(read.anchor):'';const b=read.anchor?.getBoundingClientRect();f.offset={x:b?rect.x-b.x:0,y:b?rect.y-b.y:0};f.reason=read.reason;const r=session.getRegion(id);if(r.anchorMode==='FOLLOW_DOM' && !f.anchor)session.needsRebind(id,read.reason || 'NO_ANCHOR');else session.setSource(id,read.text);}
    function startDrawing(id){if(closed || (!id && session.listRegions().length>=8))return;cancelDrawing();drawing={id};notice.textContent='在公開文字上拖曳畫框；按 Escape 取消。';const glass=el('div',null,host);glass.style.cssText='position:absolute;z-index:3;inset:0;pointer-events:auto;touch-action:none;cursor:crosshair;background:#16445408';drawing.glass=glass;
      listen(glass,'pointerdown',e=>{if(!e.isTrusted || e.button!==0)return;e.preventDefault();drawing.start={x:e.clientX,y:e.clientY};glass.setPointerCapture(e.pointerId);});
      listen(glass,'pointermove',e=>{if(!e.isTrusted || !drawing?.start)return;const a=drawing.start;glass.style.background='#16445412';notice.textContent=`畫框中 ${Math.abs(e.clientX-a.x).toFixed(0)} × ${Math.abs(e.clientY-a.y).toFixed(0)}`;});
      listen(glass,'pointerup',e=>{if(!e.isTrusted || !drawing?.start)return;const a=drawing.start,existing=drawing.id;const rect={x:Math.min(a.x,e.clientX),y:Math.min(a.y,e.clientY),width:Math.abs(e.clientX-a.x),height:Math.abs(e.clientY-a.y)};cancelDrawing();safe(()=>{if(existing){session.updateRegion(existing,{rect,rebind:true});bind(existing,rect);}else {const r=session.addRegion({anchorMode:mode.value,rect});frames.set(r.id,{anchor:null,identity:'',offset:{x:0,y:0},reason:''});bind(r.id,rect);}notice.textContent='已新增區域。請貼上譯文，或準備本機模型。';});});
    }
    function sweepListeners(){for(let i=listeners.length-1;i>=0;i--){const l=listeners[i];if(l.target.nodeType && !l.target.isConnected){l.off();listeners.splice(i,1);}}}
    function cancelDrawing(){if(drawing){drawing.glass.remove();drawing=null;sweepListeners();}notice.textContent='在頁面拖曳畫框；按 Escape 取消。';}
    function changeRect(id,rect){const r=session.getRegion(id);session.updateRegion(id,{rect});if(r.anchorMode==='FOLLOW_DOM'){const f=frames.get(id),b=f.anchor?.getBoundingClientRect();if(b)f.offset={x:rect.x-b.x,y:rect.y-b.y};}schedule();render();}
    function makeFrame(r){const box=el('div',null,host);box.style.cssText='position:absolute;z-index:1;pointer-events:none;border:2px solid #087d91;border-radius:4px;background:#087d9105';const bar=el('div',null,box);bar.style.cssText='position:absolute;left:0;top:-24px;display:flex;pointer-events:auto;';
      const move=button('移動 '+r.id,()=>{},bar);move.style.cssText='touch-action:none;white-space:nowrap;font-size:11px;padding:2px';
      const size=button('調整大小 '+r.id,()=>{},box);size.style.cssText='position:absolute;right:0;bottom:-24px;pointer-events:auto;touch-action:none;white-space:nowrap;font-size:11px;padding:2px';
      for(const [handle,kind] of [[move,'move'],[size,'size']]){
        listen(handle,'pointerdown',e=>{if(!e.isTrusted)return;e.preventDefault();drag={id:r.id,kind,x:e.clientX,y:e.clientY,rect:session.getRegion(r.id).rect};handle.setPointerCapture(e.pointerId);});
        listen(handle,'pointermove',e=>{if(!e.isTrusted || !drag || drag.id!==r.id)return;const d=drag,dx=e.clientX-d.x,dy=e.clientY-d.y;const rect=kind==='move'?{...d.rect,x:d.rect.x+dx,y:d.rect.y+dy}:{...d.rect,width:Math.max(1,d.rect.width+dx),height:Math.max(1,d.rect.height+dy)};safe(()=>changeRect(r.id,rect));});
        listen(handle,'pointerup',()=>{drag=null;});listen(handle,'pointercancel',()=>{drag=null;});
        listen(handle,'keydown',e=>{if(!e.isTrusted || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const rect={...session.getRegion(r.id).rect},d=e.shiftKey?10:1;rect[kind==='move'?(e.key.includes('Left')||e.key.includes('Right')?'x':'y'):(e.key.includes('Left')||e.key.includes('Right')?'width':'height')]+=e.key==='ArrowLeft'||e.key==='ArrowUp'?-d:d;rect.width=Math.max(1,rect.width);rect.height=Math.max(1,rect.height);safe(()=>changeRect(r.id,rect));});
      }
      return box;
    }
    function makeCard(r){const card=el('article',null,cardList);card.dataset.mrftCard=r.id;el('strong','區域 '+r.id,card);const status=el('p',null,card);status.dataset.mrftStatus='';status.setAttribute('role','status');
      const fields=el('div',null,card);fields.className='mrft-row';
      function select(label,key,options){const l=el('label',label+' ',fields),s=el('select',null,l);s.setAttribute('aria-label',label+' '+r.id);for(const val of options){const o=el('option',val,s);o.value=val;}s.value=r[key];listen(s,'change',event=>{if(!event.isTrusted)return;safe(()=>{session.updateRegion(r.id,{[key]:s.value});if(key==='anchorMode')bind(r.id,session.getRegion(r.id).rect);schedule();});});return s;}
      select('模式','anchorMode',['FOLLOW_DOM','FIX_VIEWPORT']);select('原文語言','sourceLanguage',['en','zh-Hant','ja','ko','es','fr','de']);select('譯文語言','targetLanguage',['zh-Hant','en','ja','ko','es','fr','de']);select('翻譯方式','route',['USER_PASTED','LOCAL']);
      el('small','可見原文',card);const source=el('p',null,card);source.dataset.mrftSource='';el('small','目前譯文',card);const result=el('p',null,card);result.dataset.mrftResult='';
      const label=el('label','貼上目前原文的譯文',card),paste=el('textarea',null,label);paste.maxLength=24000;
      button('使用貼上的譯文',()=>safe(()=>session.setManualTranslation(r.id,paste.value)),card);
      const dl=el('label',null,card),consent=el('input',null,dl);consent.type='checkbox';let downloadConsented=false;listen(consent,'change',event=>{if(event.isTrusted)downloadConsented=consent.checked;});dl.append(doc.createTextNode(' 同意本次準備時下載瀏覽器模型。下載可能使用網路及磁碟空間；頁面文字留在本機。'));
      button('準備本機模型',()=>{safe(()=>session.updateRegion(r.id,{route:'LOCAL'}));scan();const route=card.querySelector('select[aria-label^="翻譯方式"]');route.value='LOCAL';session.prepareLocal(r.id,{allowDownload:downloadConsented}).then(render).catch(()=>{notice.textContent='MODEL_UNAVAILABLE';});},card);
      const row=el('div',null,card);row.className='mrft-row';const pause=button('暫停',()=>safe(()=>{const now=session.getRegion(r.id);if(now.state==='PAUSED'){session.resume(r.id);schedule();}else session.pause(r.id);}),row);
      button('重新綁定',()=>startDrawing(r.id),row);button('移除',()=>safe(()=>{session.remove(r.id);frames.delete(r.id);}),row);
      button('複製譯文',async()=>{const text=session.getRegion(r.id)?.translation;if(!text)return;try{await win.navigator.clipboard.writeText(text);notice.textContent='已複製譯文。';}catch(_){notice.textContent='目前無法使用剪貼簿，請選取譯文後複製。';}},row);
      return {card,status,source,result,paste,pause,box:makeFrame(r)};
    }
    function render(){if(closed || rendering)return;rendering=true;try{const regions=session.listRegions(),ids=new Set(regions.map(r=>r.id));for(const [id,c]of cards)if(!ids.has(id)){c.paste.value='';c.source.textContent='';c.result.textContent='';c.card.remove();c.box.remove();cards.delete(id);}for(const r of regions){let c=cards.get(r.id);if(!c){c=makeCard(r);cards.set(r.id,c);}const reason=frames.get(r.id)?.reason;c.status.textContent=r.state+' · '+r.status+(reason?' · '+reason:'');c.source.textContent=r.source||'尚無已確認的可見原文';c.result.textContent=r.translation||'尚無有效譯文';c.pause.textContent=r.state==='PAUSED'?'繼續':'暫停';if(c.seq!==r.sourceChangeSeq){c.paste.value='';c.seq=r.sourceChangeSeq;}Object.assign(c.box.style,{left:r.rect.x+'px',top:r.rect.y+'px',width:r.rect.width+'px',height:r.rect.height+'px',borderColor:r.state==='NEEDS_REBIND'?'#b55c21':'#087d91'});c.box.firstElementChild.style.top=r.rect.y<24?'0':'-24px';c.box.lastElementChild.style.bottom=r.rect.y+r.rect.height>win.innerHeight-24?'0':'-24px';}add.disabled=regions.length>=8;sweepListeners();}finally{rendering=false;}}
    observer=new win.MutationObserver(records=>{if(records.some(record=>!host.contains(record.target) && record.target!==host && record.target!==carrier && !(record.type==='childList' && [...record.addedNodes,...record.removedNodes].every(n=>n===carrier || n===host || host.contains(n)))))invalidate();});
    observer.observe(doc.documentElement,{childList:true,subtree:true,characterData:true,attributes:true});
    listen(win,'scroll',invalidate,true);listen(win,'resize',invalidate);if(win.visualViewport){listen(win.visualViewport,'scroll',invalidate);listen(win.visualViewport,'resize',invalidate);}
    listen(doc,'keydown',e=>{if(e.key==='Escape')cancelDrawing();});listen(win,'pagehide',dispose);
    function dispose(){if(closed)return;closed=true;stopTimer();observer.disconnect();for(const listener of listeners.splice(0))listener.off();for(const c of cards.values()){c.paste.value='';c.source.textContent='';c.result.textContent='';}cards.clear();frames.clear();drawing=null;drag=null;session.dispose();for(const root of roots)root.remove();onClose();}
    render();return Object.freeze({dispose,refresh:render,diagnostics:()=>({closed,scanCount,scheduledCount,pendingTimers:timer===null?0:1,regionCount:frames.size,listenerCount:listeners.length})});
  }
  global.TLSMRFTDOMR177=Object.freeze({createController});
})(globalThis);
