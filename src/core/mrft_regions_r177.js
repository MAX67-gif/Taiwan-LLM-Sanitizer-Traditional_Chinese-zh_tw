/* R17.7 multi-region state engine. MIT. Source and results are memory-only.
 * Public records are clones. metadata() is the only export/diagnostic boundary.
 * A dirty validation cache holds at most one completed source/result per region;
 * it is hidden until an identical rescan and erased on any configuration change.
 */
(function(global){
'use strict';
const R14=typeof module!=='undefined'&&module.exports?require('./provider_capability_r14.js'):global.TLSProviderCapabilityR14;
const LANG=/^[a-z]{2,3}(?:-[A-Za-z]{2,8}){0,3}$/u;
const CODES=new Set(['MODEL_UNAVAILABLE','DOWNLOAD_REQUIRED','UNSUPPORTED_PAIR','WAITING','ERROR','INVALID_TEXT','USER_ACTIVATION_REQUIRED','NOT_PREPARED','CANCELLED','PROVIDER_DISPOSED','REGION_LIMIT']);
function error(code){const e=new Error(code);e.code=code;return e;}
function language(v){
 if(typeof v!=='string'||v.length>36||!LANG.test(v))return false;
 try{return Intl.getCanonicalLocales(v).length===1;}catch(_){return false;}
}
function plain(v,max){return typeof v==='string'&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v);}
function rectangle(r){return r&&['x','y','width','height'].every(k=>Number.isFinite(r[k])&&Math.abs(r[k])<=10000000)&&r.width>0&&r.height>0;}
function validProvider(p){return p==null||['prepare','translate','release','dispose'].every(k=>typeof p[k]==='function');}
function clone(r){return {...r,rect:{...r.rect}};}
function createSession({origin,consent,provider=null,onChange,maxRegions=8,debounceMs=200,timeoutMs=15000}={}){
 if(consent!==true)throw error('CONSENT_REQUIRED');
 if(!R14||!R14.isOrigin(origin)||!validProvider(provider)||!Number.isInteger(maxRegions)||maxRegions<1||maxRegions>8||!Number.isFinite(debounceMs)||debounceMs<0||debounceMs>5000||!Number.isFinite(timeoutMs)||timeoutMs<1||timeoutMs>120000)throw error('INVALID_CONFIG');
 const regions=new Map();let disposed=false,nextId=0,active=0;
 function notify(){try{if(typeof onChange==='function'){const result=onChange();if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});}}catch(_) {}}
 function live(){if(disposed)throw error('SESSION_DISPOSED');}
 function entry(id){live();const e=regions.get(id);if(!e)throw error('REGION_NOT_FOUND');return e;}
 function current(e,epoch){return !disposed&&regions.get(e.r.id)===e&&e.r.state==='WATCHING'&&e.r.requestEpoch===epoch;}
 function release(e){e.ready=false;try{if(e.provider){const result=e.provider.release(e.r.id);if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});}}catch(_) {}}
 function invalidate(e,{keepSource=false,keepCache=false,releaseModel=false}={}){
  e.r.requestEpoch++;
  if(e.timer!==null)clearTimeout(e.timer);e.timer=null;e.pending=false;
  if(e.controller)e.controller.abort();e.controller=null;
  if(e.timeout!==null)clearTimeout(e.timeout);e.timeout=null;
  if(releaseModel||e.preparing)release(e);e.preparing=false;
  if(!keepSource)e.r.source='';e.r.translation='';
  if(!keepCache)e.cache=null;
 }
 function waiting(e){return e.r.source?(e.r.route==='USER_PASTED'?'WAITING_MANUAL':'WAITING'):'WAITING_SOURCE';}
 function schedule(e){
  if(e.r.state!=='WATCHING'||e.r.route!=='LOCAL'||!e.r.source||!e.ready)return;
  if(e.timer!==null)clearTimeout(e.timer);
  e.r.status='WAITING';
  e.timer=setTimeout(()=>{e.timer=null;if(disposed||regions.get(e.r.id)!==e||e.r.state!=='WATCHING')return;e.pending=true;pump();},debounceMs);
 }
 function pump(){
  if(disposed)return;
  for(const e of regions.values()){
   if(active>=2)break;
   if(!e.pending||!e.ready||!e.r.source||e.r.state!=='WATCHING'||e.r.route!=='LOCAL')continue;
   e.pending=false;run(e);
  }
 }
 function run(e){
  const epoch=e.r.requestEpoch,p=e.provider,controller=new AbortController();e.controller=controller;active++;
  e.r.status='TRANSLATING';
  e.timeout=setTimeout(()=>{
   if(!current(e,epoch))return;
   invalidate(e,{releaseModel:true});e.r.status='TIMEOUT';notify();
   // An ignored AbortSignal must not free a physical slot. The underlying
   // promise owns that slot until it settles; this bounds hung native work.
  },timeoutMs);
  notify();
  if(!current(e,epoch)){active--;pump();return;}
  let operation;
  try{operation=p.translate(e.r.source,{regionId:e.r.id,sourceLanguage:e.r.sourceLanguage,targetLanguage:e.r.targetLanguage,signal:controller.signal});}catch(cause){operation=Promise.reject(cause);}
  Promise.resolve(operation).then(result=>{
   if(!current(e,epoch))return;
   if(!plain(result,24000))throw error('INVALID_TEXT');
   e.r.translation=result;e.r.status='READY';
  }).catch(cause=>{
   if(!current(e,epoch))return;
   e.r.translation='';e.r.status=cause&&CODES.has(cause.code)?cause.code:'ERROR';
  }).finally(()=>{
   active--;
   if(current(e,epoch)){if(e.timeout!==null)clearTimeout(e.timeout);e.timeout=null;e.controller=null;notify();}
   pump();
  });
 }
 function addRegion({anchorMode,rect,sourceLanguage='en',targetLanguage='zh-Hant',route='USER_PASTED'}={}){
  live();if(regions.size>=maxRegions)throw error('REGION_LIMIT');
  if(!['FOLLOW_DOM','FIX_VIEWPORT'].includes(anchorMode)||!rectangle(rect)||!language(sourceLanguage)||!language(targetLanguage)||!['USER_PASTED','LOCAL'].includes(route))throw error('INVALID_CONFIG');
  const r={id:'region-'+(++nextId),state:'WATCHING',anchorMode,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},sourceLanguage,targetLanguage,route,source:'',translation:'',status:'WAITING_SOURCE',sourceChangeSeq:0,requestEpoch:0};
  regions.set(r.id,{r,provider,ready:false,timer:null,timeout:null,controller:null,cache:null,pending:false,preparing:false});notify();return clone(r);
 }
 function updateRegion(id,patch){
  const e=entry(id);
  const allowed=['anchorMode','rect','sourceLanguage','targetLanguage','route','rebind','provider'];
  if(!patch||typeof patch!=='object'||Array.isArray(patch)||Object.keys(patch).some(k=>!allowed.includes(k))||Object.hasOwn(patch,'rect')&&!rectangle(patch.rect)||Object.hasOwn(patch,'anchorMode')&&!['FOLLOW_DOM','FIX_VIEWPORT'].includes(patch.anchorMode)||Object.hasOwn(patch,'route')&&!['USER_PASTED','LOCAL'].includes(patch.route)||['sourceLanguage','targetLanguage'].some(k=>Object.hasOwn(patch,k)&&!language(patch[k]))||Object.hasOwn(patch,'rebind')&&typeof patch.rebind!=='boolean'||Object.hasOwn(patch,'provider')&&!validProvider(patch.provider))throw error('INVALID_CONFIG');
  const changed=Object.keys(patch).some(k=>k==='rect'?['x','y','width','height'].some(axis=>e.r.rect[axis]!==patch.rect[axis]):k==='provider'?e.provider!==patch.provider:k==='rebind'?patch.rebind:e.r[k]!==patch[k]);
  if(!changed)return clone(e.r);
  invalidate(e,{releaseModel:true});
  for(const k of ['anchorMode','sourceLanguage','targetLanguage','route'])if(Object.hasOwn(patch,k))e.r[k]=patch[k];
  if(patch.rect)e.r.rect={x:patch.rect.x,y:patch.rect.y,width:patch.rect.width,height:patch.rect.height};
  if(Object.hasOwn(patch,'provider'))e.provider=patch.provider;
  if(patch.rebind===true)e.r.state='WATCHING';
  e.r.status=e.r.state==='WATCHING'?'WAITING_SOURCE':e.r.state;notify();return clone(e.r);
 }
 function setSource(id,source){
  const e=entry(id);
  if(!plain(source,12000)){invalidate(e);e.r.status='INVALID_TEXT';notify();throw error('INVALID_TEXT');}
  if(e.r.state!=='WATCHING')return clone(e.r);
  if(e.r.status!=='SOURCE_DIRTY'&&e.r.source===source)return clone(e.r);
  const cache=e.cache;
  const same=cache&&cache.source===source;
  const previous=cache?cache.source:e.r.source;
  invalidate(e);
  if(previous!==source)e.r.sourceChangeSeq++;
  e.r.source=source;
  if(same){e.r.translation=cache.translation;e.r.status='READY';}
  else{e.r.status=waiting(e);schedule(e);}
  notify();return clone(e.r);
 }
 function markDirty(id){
  const e=entry(id);if(e.r.state!=='WATCHING')return clone(e.r);
  if(e.r.status==='SOURCE_DIRTY')return clone(e.r);
  const cache=e.r.status==='READY'&&e.r.source?{source:e.r.source,translation:e.r.translation}:null;
  invalidate(e);e.cache=cache;e.r.status='SOURCE_DIRTY';notify();return clone(e.r);
 }
 function pause(id){const e=entry(id);invalidate(e,{releaseModel:true});if(e.r.state!=='NEEDS_REBIND')e.r.state='PAUSED';e.r.status=e.r.state;notify();return clone(e.r);}
 function resume(id){const e=entry(id);if(e.r.state!=='PAUSED')return clone(e.r);invalidate(e,{releaseModel:true});e.r.state='WATCHING';e.r.status='WAITING_SOURCE';notify();return clone(e.r);}
 function needsRebind(id,reason){const e=entry(id);invalidate(e,{releaseModel:true});e.r.state='NEEDS_REBIND';e.r.status='NEEDS_REBIND';notify();return clone(e.r);}
 function remove(id){live();const e=regions.get(id);if(!e)return false;invalidate(e,{releaseModel:true});regions.delete(id);notify();return true;}
 function pauseAll(){live();for(const e of regions.values()){invalidate(e,{releaseModel:true});if(e.r.state!=='NEEDS_REBIND')e.r.state='PAUSED';e.r.status=e.r.state;}notify();return listRegions();}
 function setManualTranslation(id,translation){
  const e=entry(id);
  if(!plain(translation,24000))throw error('INVALID_TEXT');
  if(e.r.state!=='WATCHING'||e.r.route!=='USER_PASTED'||!e.r.source||e.r.status==='SOURCE_DIRTY')throw error('SOURCE_NOT_READY');
  invalidate(e,{keepSource:true});e.r.translation=translation;e.r.status='READY';notify();return clone(e.r);
 }
 async function prepareLocal(id,{allowDownload=false}={}){
  const e=entry(id);
  if(typeof allowDownload!=='boolean'||e.r.route!=='LOCAL')throw error('INVALID_CONFIG');
  if(e.r.state!=='WATCHING')return clone(e.r);
  if(!e.provider){e.r.status='MODEL_UNAVAILABLE';notify();return clone(e.r);}
  if(active>=2){e.r.status='WAITING';notify();return clone(e.r);}
  invalidate(e,{keepSource:true,releaseModel:true});e.preparing=true;e.r.status='PREPARING';const epoch=e.r.requestEpoch;active++;
  e.timeout=setTimeout(()=>{if(current(e,epoch)){invalidate(e,{releaseModel:true});e.r.status='TIMEOUT';notify();}},timeoutMs);notify();
  try{
   if(!current(e,epoch))return !disposed&&regions.has(id)?clone(e.r):null;
   const result=await e.provider.prepare({regionId:id,sourceLanguage:e.r.sourceLanguage,targetLanguage:e.r.targetLanguage,allowDownload});
   if(current(e,epoch)){
    if(!result||result.status!=='READY')throw error(result&&CODES.has(result.status)?result.status:'MODEL_UNAVAILABLE');
    e.ready=true;e.preparing=false;e.r.status=waiting(e);schedule(e);
   }
  }catch(cause){if(current(e,epoch)){release(e);e.preparing=false;e.r.status=cause&&CODES.has(cause.code)?cause.code:'ERROR';}}
  finally{
   active--;
   if(current(e,epoch)){if(e.timeout!==null)clearTimeout(e.timeout);e.timeout=null;notify();}
   pump();
  }
  return !disposed&&regions.has(id)?clone(e.r):null;
 }
 function getRegion(id){const e=regions.get(id);return e?clone(e.r):null;}
 function listRegions(){return [...regions.values()].map(e=>clone(e.r));}
 function metadata(){return {schema:'tls.mrft.session.v0',origin,consent:!disposed,disposed,regionCount:regions.size,regions:[...regions.values()].map(({r})=>({schema:'tls.mrft.region.v0',id:r.id,state:r.state,status:r.status,anchorMode:r.anchorMode,sourceLanguage:r.sourceLanguage,targetLanguage:r.targetLanguage,route:r.route,sourceChangeSeq:r.sourceChangeSeq,requestEpoch:r.requestEpoch}))};}
 function dispose(){if(disposed)return;disposed=true;const providers=new Set();for(const e of regions.values()){invalidate(e,{releaseModel:true});if(e.provider)providers.add(e.provider);}regions.clear();for(const p of providers){try{const result=p.dispose();if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});}catch(_) {}}notify();}
 return Object.freeze({addRegion,updateRegion,setSource,markDirty,pause,resume,needsRebind,remove,pauseAll,setManualTranslation,prepareLocal,getRegion,listRegions,metadata,dispose});
}
const exported=Object.freeze({createSession});global.TLSMRFTR177=exported;
if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof globalThis!=='undefined'?globalThis:this);
