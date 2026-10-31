/* R17.7 browser-local Translator adapter. MIT. No text storage or remote transport.
 * Native API doubles belong exclusively in tests. api must be supplied by the caller
 * from its own isolated world. R14 makes decisions; this module observes readiness.
 */
(function(global){
'use strict';
const R14=typeof module!=='undefined'&&module.exports?require('./provider_capability_r14.js'):global.TLSProviderCapabilityR14;
const LANG=/^[a-z]{2,3}(?:-[A-Za-z]{2,8}){0,3}$/u;
const CODE=new Set(['CANCELLED','MODEL_UNAVAILABLE','DOWNLOAD_REQUIRED','UNSUPPORTED_PAIR','WAITING','ERROR','INVALID_CONFIG','INVALID_TEXT','USER_ACTIVATION_REQUIRED','NOT_PREPARED','PROVIDER_DISPOSED','REGION_LIMIT']);
function error(code){const e=new Error(code);e.code=code;return e;}
function language(value){
 if(typeof value!=='string'||value.length>36||!LANG.test(value))return false;
 try{return Intl.getCanonicalLocales(value).length===1;}catch(_){return false;}
}
function text(value,max){return typeof value==='string'&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);}
function safeError(e){if(e&&CODE.has(e.code))return error(e.code);if(e&&e.name==='NotSupportedError')return error('UNSUPPORTED_PAIR');if(e&&e.name==='AbortError')return error('CANCELLED');return error('ERROR');}
function createProvider({api,origin,onProgress,userActivation}={}){
 if(!R14||!R14.isOrigin(origin))throw error('INVALID_CONFIG');
 const entries=new Map(),destroyed=new WeakSet();let disposed=false;
 function active(){try{return typeof userActivation==='function'&&userActivation()===true;}catch(_){return false;}}
 function validPair(p){return p&&typeof p.regionId==='string'&&/^[a-zA-Z0-9_-]{1,64}$/u.test(p.regionId)&&language(p.sourceLanguage)&&language(p.targetLanguage);}
 function destroy(instance){
  if(!instance||(typeof instance!=='object'&&typeof instance!=='function')||destroyed.has(instance))return;
  destroyed.add(instance);
  try{if(typeof instance.destroy==='function'){const result=instance.destroy();if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});}}catch(_){}
 }
 function release(regionId){const entry=entries.get(regionId);if(!entry)return;entries.delete(regionId);entry.valid=false;destroy(entry.instance);entry.instance=null;}
 function current(entry){return !disposed&&entry.valid&&entries.get(entry.regionId)===entry;}
 function assertCurrent(entry){if(!current(entry))throw error('CANCELLED');}
 function progress(entry,loaded,total){
  if(!current(entry)||typeof onProgress!=='function')return;
  if(!Number.isFinite(loaded)||!Number.isFinite(total)||total<=0)return;
  try{const result=onProgress({regionId:entry.regionId,status:'WAITING',progress:Math.min(1,Math.max(0,loaded/total))});if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});}catch(_){}
 }
 async function prepare(options={}){
  if(disposed)throw error('PROVIDER_DISPOSED');
  if(!validPair(options)||typeof options.allowDownload!=='boolean')throw error('INVALID_CONFIG');
  if(!active())throw error('USER_ACTIVATION_REQUIRED');
  const {regionId,sourceLanguage,targetLanguage,allowDownload}=options;
  release(regionId);
  if(entries.size>=8)throw error('REGION_LIMIT');
  const entry={regionId,sourceLanguage,targetLanguage,valid:true,instance:null};entries.set(regionId,entry);
  let created=null;
  try{
   if(!api||typeof api.availability!=='function'||typeof api.create!=='function')throw error('MODEL_UNAVAILABLE');
   const observed=await api.availability({sourceLanguage,targetLanguage});
   assertCurrent(entry);
   const supported=observed!=='unsupported';
   const availability=['available','downloadable','downloading','unavailable'].includes(observed)?observed:'unknown';
   const decision=R14.evaluateProviderCapability({
    provider:{id:'browser_translator',version:'0.1.0',mode:'on_device',languagePairs:supported?[[sourceLanguage,targetLanguage]]:[],availability,requiresNetwork:false,requiresDownload:availability==='downloadable'||availability==='downloading',pricing:'UNKNOWN',retention:'UNKNOWN',privacyUrl:'UNKNOWN'},
    request:{sourceLanguage,targetLanguage,sequence:1,nonce:'mrft_local_request',cancelled:false},site:{origin},now:Date.now(),
   });
   if(decision.decision==='UNSUPPORTED_PAIR')throw error('UNSUPPORTED_PAIR');
   if(decision.decision==='WAIT_MODEL_DOWNLOAD')throw error('WAITING');
   if(decision.decision==='REQUIRES_USER_DOWNLOAD_ACTION'&&!allowDownload)throw error('DOWNLOAD_REQUIRED');
   if(!decision.allowedForLocalOperation&&!(decision.decision==='REQUIRES_USER_DOWNLOAD_ACTION'&&allowDownload))throw error('MODEL_UNAVAILABLE');
   // Availability may await native work. Recheck both activation and ownership
   // before any operation that could download a model or allocate a translator.
   assertCurrent(entry);
   if(!active())throw error('USER_ACTIVATION_REQUIRED');
   created=await api.create({sourceLanguage,targetLanguage,monitor(monitor){
    if(!current(entry)||!monitor||typeof monitor.addEventListener!=='function')return;
    monitor.addEventListener('downloadprogress',event=>progress(entry,event.loaded,event.total===undefined?1:event.total));
   }});
   assertCurrent(entry);
   if(!created||typeof created.translate!=='function'||typeof created.destroy!=='function')throw error('MODEL_UNAVAILABLE');
   entry.instance=created;
   return Object.freeze({status:'READY',availability:'available',observedAvailability:availability,downloadConsented:allowDownload,decision:decision.decision});
  }catch(e){
   destroy(created);
   if(entries.get(regionId)===entry)entries.delete(regionId);
   entry.valid=false;entry.instance=null;
   throw safeError(e);
  }
 }
 async function translate(source,options={}){
  if(disposed)throw error('PROVIDER_DISPOSED');
  if(!validPair(options))throw error('INVALID_CONFIG');
  if(!text(source,12000))throw error('INVALID_TEXT');
  const entry=entries.get(options.regionId),signal=options.signal;
  if(!entry||!entry.instance||entry.sourceLanguage!==options.sourceLanguage||entry.targetLanguage!==options.targetLanguage)throw error('NOT_PREPARED');
  if(signal&&signal.aborted)throw error('CANCELLED');
  try{
   const result=await entry.instance.translate(source,signal?{signal}:{});
   assertCurrent(entry);
   if(signal&&signal.aborted)throw error('CANCELLED');
   if(!text(result,24000))throw error('INVALID_TEXT');
   return result;
  }catch(e){throw safeError(e);}
 }
 function dispose(){if(disposed)return;disposed=true;for(const id of [...entries.keys()])release(id);}
 return Object.freeze({prepare,translate,release,dispose});
}
const exported=Object.freeze({createProvider});global.TLSMRFTLocalProviderR177=exported;
if(typeof module!=='undefined'&&module.exports)module.exports=exported;
})(typeof globalThis!=='undefined'?globalThis:this);
