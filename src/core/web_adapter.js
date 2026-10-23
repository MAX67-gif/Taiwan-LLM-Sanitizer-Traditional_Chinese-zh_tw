/* Taiwan-LLM-Sanitizer R2: DOM Adapter for asynchronous providers, MIT. */
(function(global){
'use strict';
const core=global.TLSCore || (typeof require==='function'?require('./engine.js'):null);
const providers=global.TLSProviders || (typeof require==='function'?require('./provider.js'):null);
if(!core||!providers)throw new Error('TLSCore and TLSProviders must load first');
const SKIP='script,style,noscript,textarea,select,option,pre,code,kbd,samp,svg,canvas,math,template,input,[hidden],[aria-hidden="true"],[contenteditable],[translate="no"],[data-no-translate],[data-tls-ui],.monaco-editor,.cm-editor';
const ATTRS=['title','aria-label','alt'];
const MAX_QUEUED=4200, MAX_RECORDS=6000, MAX_TEXT=1800;
function safeElement(el){
  if(!el||el.nodeType!==1)return false;
  try{return !el.closest(SKIP)&&!el.isContentEditable;}
  catch(_){return false;}
}
function domainOf(el) {
  if(!safeElement(el))return 'general';
  try {
    if(el.closest('nav,menu,[role="navigation"],[role="menu"],[role="menubar"],[role="menuitem"]'))
      return 'ui';
    return 'general';
  } catch(_) {return 'general';}
}
function createWebLocalizer(doc,options={}){
  if(!doc?.documentElement||typeof doc.createTreeWalker!=='function')
    throw new TypeError('Valid browser document required');
  let opts={...options},running=false,epoch=0,router=null,observer=null,timer=null,working=false;
  const changedTexts=new Map(),changedAttrs=new Map(),queue=[],queued=new Set();
  const requestedDomain=(el)=>opts.domain&&opts.domain!=='auto'?opts.domain:domainOf(el);
  let stats={scanned:0,converted:0,unchanged:0,errors:0,skipped:0,overflow:0,lastState:'IDLE',lastReason:'',modelProgress:0};
  function publish(){
    try{opts.onStatus?.(getStatus());}catch(_){}
  }
  function skipText(node){
    return !node?.parentElement||!safeElement(node.parentElement)||!node.isConnected;
  }
  function enqueue(target){
    if(!running||!target)return;
    if(queue.length>=MAX_QUEUED){stats.overflow++;stats.lastState='LIMIT_REACHED';return;}
    if(!queued.has(target)){queued.add(target);queue.push(target);}
    if(timer===null&&!working)timer=setTimeout(drain,20);
  }
  function scan(root){
    if(!running||!root)return;
    if(root.nodeType===3){enqueue(root);return;}
    if(![1,9,11].includes(root.nodeType))return;
    if(root.nodeType===1&&!safeElement(root))return;
    if(root.nodeType===1)enqueueAttr(root);
    const walker=doc.createTreeWalker(root,5);
    let cur,limit=0;
    while((cur=walker.nextNode())&&limit++<25000){
      if(cur.nodeType===3)enqueue(cur);
      else if(cur.nodeType===1)enqueueAttr(cur);
    }
    if(limit>=25000)stats.overflow++;
  }
  const attrQueue=[],attrQueued=new Set();
  function enqueueAttr(el){
    if(!safeElement(el)||attrQueued.has(el)||attrQueue.length>=MAX_QUEUED)return;
    attrQueued.add(el);attrQueue.push(el);
    if(timer===null&&!working)timer=setTimeout(drain,20);
  }
  function restore(){
    for(const [node,record] of changedTexts){
      if(node.isConnected&&node.data===record.after)node.data=record.before;
    }
    for(const [el,group] of changedAttrs){
      if(!el.isConnected)continue;
      for(const [name,record] of Object.entries(group))
        if(el.getAttribute(name)===record.after)el.setAttribute(name,record.before);
    }
    changedTexts.clear();changedAttrs.clear();
  }
  function prune(){
    if(changedTexts.size+changedAttrs.size<=MAX_RECORDS)return;
    for(const node of changedTexts.keys())if(!node.isConnected)changedTexts.delete(node);
    for(const el of changedAttrs.keys())if(!el.isConnected)changedAttrs.delete(el);
    if(changedTexts.size+changedAttrs.size>MAX_RECORDS)stats.lastReason='記錄已達上限；不再修改新節點';
  }
  async function updateText(node,myEpoch){
    if(skipText(node))return;
    let before=node.data;
    if(!before||!before.trim()||before.length>MAX_TEXT){stats.skipped++;return;}
    const old=changedTexts.get(node);
    if(old?.after===before)return;
    if(old)changedTexts.delete(node);
    if(changedTexts.size+changedAttrs.size>=MAX_RECORDS){stats.overflow++;return;}
    const result=await router.translate(before,{domain:requestedDomain(node.parentElement),regionalPreference:opts.regionalPreference,tone:opts.tone});
    if(!running||myEpoch!==epoch||skipText(node)||node.data!==before)return;
    stats.scanned++;stats.lastState=result.state||'UNKNOWN';stats.lastReason=result.reason||'';
    if(typeof result.text==='string'&&result.text!==before){
      changedTexts.set(node,{before,after:result.text});
      node.data=result.text;stats.converted++;
    }else stats.unchanged++;
  }
  async function updateAttrs(el,myEpoch){
    if(!safeElement(el)||!el.isConnected)return;
    for(const name of ATTRS){
      if(!running||myEpoch!==epoch)return;
      if(!el.hasAttribute(name))continue;
      let before=el.getAttribute(name);
      if(!before||before.length>MAX_TEXT)continue;
      const existing=changedAttrs.get(el);
      if(existing?.[name]?.after===before)continue;
      if(existing?.[name]){delete existing[name];if(!Object.keys(existing).length)changedAttrs.delete(el);}
      if(changedTexts.size+changedAttrs.size>=MAX_RECORDS){stats.overflow++;return;}
      const result=await router.translate(before,{domain:requestedDomain(el),regionalPreference:opts.regionalPreference,tone:opts.tone});
      if(!running||myEpoch!==epoch||!el.isConnected||el.getAttribute(name)!==before)continue;
      if(typeof result.text==='string'&&result.text!==before){
        const group=changedAttrs.get(el)||{};
        group[name]={before,after:result.text};changedAttrs.set(el,group);
        el.setAttribute(name,result.text);stats.converted++;
      }
    }
  }
  async function drain(){
    timer=null;
    if(!running||working)return;
    working=true;
    const currentEpoch=epoch;
    let iterations=0;
    try{
      while(running&&epoch===currentEpoch&&(queue.length||attrQueue.length)){
        if(queue.length){
          const node=queue.shift();queued.delete(node);
          try{await updateText(node,currentEpoch);}catch(e){stats.errors++;stats.lastReason=String(e);}
        }else{
          const el=attrQueue.shift();attrQueued.delete(el);
          try{await updateAttrs(el,currentEpoch);}catch(e){stats.errors++;stats.lastReason=String(e);}
        }
        if(++iterations%16===0){
          prune();publish();
          // Yield to the browser; prevent translation work from blocking the site.
          await new Promise(resolve=>setTimeout(resolve,0));
        }
      }
    } finally {
      working=false;publish();
      if(running&&(queue.length||attrQueue.length)&&timer===null)
        timer=setTimeout(drain,20);
    }
  }
  function start(){
    if(running)return;
    epoch++;running=true;
    router=opts.router||providers.createRouter({
      mode:opts.mode,sourceLanguage:opts.sourceLanguage,
      documentLanguage:opts.documentLanguage||doc.documentElement.lang,
      environment:opts.environment||global,
      onProgress:(event)=>{stats.lastState=event.state;stats.modelProgress=event.loaded;publish();}
    });
    observer=new MutationObserver(records=>{
      for(const m of records){
        if(m.type==='childList')for(const n of m.addedNodes)scan(n);
        else if(m.type==='characterData')enqueue(m.target);
        else if(m.type==='attributes')enqueueAttr(m.target);
      }
    });
    observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,
      attributes:true,attributeFilter:ATTRS});
    scan(doc.documentElement);publish();
  }
  function stop(){
    running=false;epoch++;
    if(observer)observer.disconnect();observer=null;
    if(timer!==null)clearTimeout(timer);timer=null;
    queue.length=0;queued.clear();attrQueue.length=0;attrQueued.clear();
    if(router && !opts.router)router.destroy();
    router=null;
    restore();stats.lastState='STOPPED';publish();
  }
  function configure(next){
    const wasRunning=running;
    if(wasRunning)stop();
    opts={...opts,...next};
    if(wasRunning)start();
  }
  function getStatus(){
    return Object.freeze({version:'0.3.0',running,mode:providers.selected(opts.mode,opts.sourceLanguage).mode,
      sourceLanguage:providers.selected(opts.mode,opts.sourceLanguage).sourceLanguage,
      domain:opts.domain||'auto',
      regionalPreference:opts.regionalPreference||'balanced',tone:opts.tone||'faithful',
      queued:queue.length+attrQueue.length,tracked:changedTexts.size+changedAttrs.size,
      ...stats,provider:router?.status()||{state:'INACTIVE'}});
  }
  return Object.freeze({start,stop,pause:stop,resume:start,configure,getStatus,
    isRunning:()=>running,translateText:core.translateText});
}
const api=Object.freeze({VERSION:'0.3.0',createWebLocalizer});
global.TLSWeb=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
