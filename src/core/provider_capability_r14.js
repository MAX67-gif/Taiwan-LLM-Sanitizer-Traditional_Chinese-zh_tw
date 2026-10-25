/* Taiwan-LLM-Sanitizer R14: data-free capability and consent decisions. MIT.
 * Shadow module: does not invoke models, mutate DOM, persist contents or send network requests.
 */
(function(global){
'use strict';
const SCHEMA='tls.provider-capability-decision.v1';
const MODES=new Set(['offline_rules','on_device','remote_opt_in']);
const AVAILABILITY=new Set(['available','downloadable','downloading','unavailable','unknown']);
const STATUSES=new Set(['explicit_granted','denied','revoked','expired','unknown']);
const LANG=/^[a-z]{2,3}(?:-[A-Za-z]{2,8}){0,3}$/u;
const IDENT=/^[a-z][a-z0-9_-]{1,63}$/u;
const VER=/^[0-9A-Za-z][0-9A-Za-z._+-]{0,39}$/u;
const NONCE=/^[A-Za-z0-9_-]{12,96}$/u;
const RESULT={
  ALLOW_LOCAL_RULES:'離線字詞規則可用，資料不會送出',
  ON_DEVICE_READY:'此項本機能力已宣告可用；實際模型需在裝置再次確認',
  REQUIRES_USER_DOWNLOAD_ACTION:'需要使用者明確同意模型下載；尚不可翻譯',
  WAIT_MODEL_DOWNLOAD:'模型仍在準備，請等待並重新檢查',
  UNSUPPORTED_PAIR:'來源與目標語言組合未宣告支援',
  UNAVAILABLE_MODEL:'模型或處理能力不可用',
  CONSENT_REQUIRED:'遠端 Provider 尚未取得符合本網站與版本的明確授權',
  CONSENT_REVOKED:'遠端 Provider 授權已拒絕、撤銷或逾期',
  REMOTE_DISABLED_IN_MVP:'R14 不含遠端傳輸；即使已同意仍拒絕上傳',
  INVALID_INPUT:'資料格式或網站來源不符合安全契約',
  UNKNOWN_CAPABILITY:'能力尚未確認，不能假設可用',
  CANCELLED:'使用者已取消或本次請求已過期',
  STALE_REQUEST:'本次請求或授權版本過期，請重新確認',
  PROVIDER_POLICY_MISMATCH:'Provider 宣告不符合本地／遠端路由安全契約',
};
function isRecord(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)&&
  (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);}
function hasExact(obj,keys,required=keys){return isRecord(obj)&&
  Object.keys(obj).every(k=>keys.includes(k))&&required.every(k=>Object.hasOwn(obj,k));}
function str(v,max){return typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f\u007f<>]/u.test(v);}
function optionalString(v,max){return v==='UNKNOWN'||str(v,max);}
function isOrigin(s){
 if(typeof s!=='string'||s.length>240)return false;
 try{
  const u=new URL(s);
  return (u.protocol==='https:'||u.protocol==='http:')&&u.username===''&&u.password===''&&
     u.href===u.origin+'/'&&u.origin===s&&u.hostname.length>0&&
     !u.hostname.endsWith('.')&&!u.hostname.includes('%');
 }catch(_){return false;}
}
function validLang(s){return typeof s==='string'&&s.length<=36&&LANG.test(s)&&s.toLowerCase()===s.toLowerCase().normalize('NFC');}
function validProvider(p){
 const keys=['id','version','mode','languagePairs','availability','requiresNetwork','requiresDownload','pricing','retention','privacyUrl'];
 if(!hasExact(p,keys)||!IDENT.test(p.id)||!VER.test(p.version)||!MODES.has(p.mode)||
 !AVAILABILITY.has(p.availability)||typeof p.requiresNetwork!=='boolean'||
 typeof p.requiresDownload!=='boolean'||!optionalString(p.pricing,120)||!optionalString(p.retention,120)||
 !(p.privacyUrl==='UNKNOWN'||(typeof p.privacyUrl==='string'&&p.privacyUrl.length<=250&&
 /^https:\/\/[^\s<>'"\\]+$/u.test(p.privacyUrl))))return false;
 if(!Array.isArray(p.languagePairs)||p.languagePairs.length>100)return false;
 const seen=new Set();
 for(const pair of p.languagePairs){
  if(!Array.isArray(pair)||pair.length!==2||!validLang(pair[0])||!validLang(pair[1]))return false;
  const key=pair[0]+'\u0000'+pair[1];if(seen.has(key))return false;seen.add(key);
 }
 if(p.mode==='offline_rules'&&(p.requiresNetwork||p.requiresDownload))return false;
 if(p.mode==='on_device'&&p.requiresNetwork&&p.availability==='available')return false;
 if(p.mode==='remote_opt_in'&&!p.requiresNetwork)return false;
 return true;
}
function validRequest(r){return hasExact(r,['sourceLanguage','targetLanguage','sequence','nonce','cancelled'])&&
 validLang(r.sourceLanguage)&&validLang(r.targetLanguage)&&Number.isSafeInteger(r.sequence)&&r.sequence>0&&
 typeof r.nonce==='string'&&NONCE.test(r.nonce)&&typeof r.cancelled==='boolean';}
function validConsent(c){
 if(c===null)return true;
 return hasExact(c,['origin','providerId','status','expiresAt','sequence','nonce'])&&
 isOrigin(c.origin)&&IDENT.test(c.providerId)&&STATUSES.has(c.status)&&
 (c.expiresAt===null||(Number.isSafeInteger(c.expiresAt)&&c.expiresAt>0))&&
 Number.isSafeInteger(c.sequence)&&c.sequence>0&&typeof c.nonce==='string'&&NONCE.test(c.nonce);
}
function output(decision,p,site,pair){
 const local=Boolean(p&&p.mode!=='remote_opt_in');
 const ready=decision==='ALLOW_LOCAL_RULES'||decision==='ON_DEVICE_READY';
 return Object.freeze({schema:SCHEMA,decision,reason:RESULT[decision],supportedPair:Boolean(pair),
  networkRequested:false,contentTransmissionPermitted:false,
  allowedForLocalOperation:ready,studyOnly:true,rawTextIncluded:false,
  requiresDownload:Boolean(p&&p.requiresDownload&&p.availability!=='available'),
  providerId:p&&str(p.id,64)?p.id:'UNKNOWN',
  scopeOrigin:isOrigin(site)?site:'UNKNOWN',
  disclosures:Object.freeze({dataRoute:local?'LOCAL_NO_TEXT_EGRESS':'REMOTE_BLOCKED',
   pricing:p&&optionalString(p.pricing,120)?p.pricing:'UNKNOWN',
   retention:p&&optionalString(p.retention,120)?p.retention:'UNKNOWN',
   privacyUrl:p&&optionalString(p.privacyUrl,250)?p.privacyUrl:'UNKNOWN',
   languagePairSupported:Boolean(pair),modelAvailability:p&&AVAILABILITY.has(p.availability)?p.availability:'unknown',
   downloadMayUseNetwork:Boolean(p&&p.mode==='on_device'&&p.requiresDownload)}),
 });
}
function evaluateProviderCapability(input){
 let p=null,site=null,pair=false;
 try{
  if(!hasExact(input,['provider','request','site','consent','now'],['provider','request','site','now']))return output('INVALID_INPUT');
  p=input.provider;
  site=isRecord(input.site)?input.site.origin:null;
  if(!validProvider(p)||!validRequest(input.request)||!hasExact(input.site,['origin'])||
   !isOrigin(site)||!validConsent(input.consent===undefined?null:input.consent)||
   !Number.isSafeInteger(input.now)||input.now<0)return output('INVALID_INPUT',p,site);
  const r=input.request,c=input.consent||null;
  pair=p.languagePairs.some(x=>x[0]===r.sourceLanguage&&x[1]===r.targetLanguage);
  if(r.cancelled)return output('CANCELLED',p,site,pair);
  if(!pair)return output('UNSUPPORTED_PAIR',p,site,false);
  if(p.mode==='remote_opt_in'){
   if(c===null||c.status==='unknown')return output('CONSENT_REQUIRED',p,site,true);
   if(c.status!=='explicit_granted'||c.expiresAt!==null&&c.expiresAt<=input.now)
      return output('CONSENT_REVOKED',p,site,true);
   if(c.origin!==site||c.providerId!==p.id||c.sequence!==r.sequence||c.nonce!==r.nonce)
      return output('STALE_REQUEST',p,site,true);
   return output('REMOTE_DISABLED_IN_MVP',p,site,true);
  }
  if(c!==null&&c.status==='explicit_granted'&&(c.origin!==site||c.providerId!==p.id||
      c.sequence!==r.sequence||c.nonce!==r.nonce||c.expiresAt!==null&&c.expiresAt<=input.now))
      return output('STALE_REQUEST',p,site,true);
  if(p.mode==='offline_rules')return output(p.availability==='available'?'ALLOW_LOCAL_RULES':'UNKNOWN_CAPABILITY',p,site,true);
  if(p.availability==='available')return output('ON_DEVICE_READY',p,site,true);
  if(p.availability==='downloadable')return output('REQUIRES_USER_DOWNLOAD_ACTION',p,site,true);
  if(p.availability==='downloading')return output('WAIT_MODEL_DOWNLOAD',p,site,true);
  if(p.availability==='unavailable')return output('UNAVAILABLE_MODEL',p,site,true);
  return output('UNKNOWN_CAPABILITY',p,site,true);
 }catch(_){return output('INVALID_INPUT',p,site,pair);}
}
const api=Object.freeze({SCHEMA,DECISIONS:Object.freeze(Object.keys(RESULT)),
 evaluateProviderCapability,isOrigin,validProvider,validRequest,validConsent});
global.TLSProviderCapabilityR14=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
