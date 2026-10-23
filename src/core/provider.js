/* Taiwan-LLM-Sanitizer R2 MIT: on-device Provider routing. Never calls cloud. */
(function(global) {
'use strict';
const core=global.TLSCore || (typeof require==='function'?require('./engine.js'):null);
if(!core) throw new Error('TLSCore must load first');
const VERSION='0.3.0', TARGET='zh-Hant', MAX=1800;
const VALID=new Set(['auto','en','ja','ko','zh','fr','de','es','ru','vi','th','pt','it','nl','ar','id','uk','tr']);
const PROTECTED=/(\{\{[^{}]{1,250}\}\}|\$\{[^}]{1,250}\}|<%[\s\S]{0,250}?%>|<\/?[A-Za-z][^>]{0,250}>|https?:\/\/[^\s<>]+|\x60[^\x60\n]{1,250}\x60|%\d*\$?[sdif]|\{[A-Za-z_$][\w.$-]*\})/gu;
const STATES=Object.freeze({TERMS:'LOCALIZED_TERMS',MODEL:'LOCALIZED_MODEL',UNCHANGED:'UNCHANGED',
  DEFERRED:'DEFERRED',UNSUPPORTED:'UNSUPPORTED_PROVIDER',SOURCE_UNKNOWN:'SOURCE_UNKNOWN',
  GUARD_REJECTED:'GUARD_REJECTED',ERROR:'PROVIDER_ERROR',PROTECTED:'PROTECTED'});
function selected(mode,sourceLanguage) {
  return {mode:mode==='local-ai'?'local-ai':'terms',sourceLanguage:VALID.has(sourceLanguage)?sourceLanguage:'auto'};
}
function normalizeLanguage(value) {
  if(typeof value!=='string') return '';
  const raw=value.trim().toLowerCase().replaceAll('_','-');
  if(['zh-tw','zh-hant','zh-hant-tw'].includes(raw)) return 'zh-Hant';
  if(raw.startsWith('zh-'))return raw.includes('hant')?'zh-Hant':'zh';
  const primary=raw.split('-')[0];
  return VALID.has(primary)&&primary!=='auto'?primary:'';
}
function protect(text) {
  if(typeof text!=='string'||!text||text.length>MAX) return {ok:false,reason:'SIZE_OR_TYPE'};
  const spans=[];let tokenized='',cursor=0;
  for(const match of text.matchAll(PROTECTED)) {
    const token='⟪TLS'+spans.length+'LOCK⟫';
    if(text.includes(token))return {ok:false,reason:'TOKEN_COLLISION'};
    tokenized+=text.slice(cursor,match.index)+token;
    spans.push({token,literal:match[0]});
    cursor=match.index+match[0].length;
  }
  tokenized+=text.slice(cursor);
  return {ok:true,text:tokenized,restore(result) {
    if(typeof result!=='string'||!result.trim()||result.length>MAX*5)return {ok:false,reason:'INVALID_RESULT'};
    let last=-1;
    for(const {token} of spans){
      if(result.split(token).length!==2)return {ok:false,reason:'TOKEN_MISSING_OR_DUPLICATED'};
      const position=result.indexOf(token);
      if(position<=last)return {ok:false,reason:'TOKEN_ORDER_CHANGED'};
      last=position;
    }
    let restored=result;
    for(const {token,literal} of spans)restored=restored.replace(token,literal);
    if(/⟪TLS\d+LOCK⟫/u.test(restored))return {ok:false,reason:'UNEXPECTED_TOKEN'};
    return {ok:true,text:restored};
  }};
}
function termResult(text,fallbackState,context={}) {
  const out=core.translateText(text,context);
  return {text:out,state:out===text?(fallbackState||STATES.UNCHANGED):STATES.TERMS,provider:'offline-terms'};
}
class BrowserLocalProvider {
  constructor(opts={}) {
    this.env=opts.environment||global;this.sourceLanguage=selected('local-ai',opts.sourceLanguage).sourceLanguage;
    this.documentLanguage=opts.documentLanguage||'';this.onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
    this.pairs=new Map();this.pending=new Map();this.cache=new Map();this.closed=false;
    this.failures=0;this.lastIssue='';this.downloading=false;
  }
  async detectSource(text) {
    if(this.sourceLanguage!=='auto')return normalizeLanguage(this.sourceLanguage);
    const lang=normalizeLanguage(this.documentLanguage);
    if(lang)return lang;
    if(/[\u3040-\u30ff]/u.test(text))return 'ja';
    if(/[\uac00-\ud7af]/u.test(text))return 'ko';
    if(/[\u0600-\u06ff]/u.test(text))return 'ar';
    const D=this.env.LanguageDetector;
    if(D&&typeof D.create==='function') {
      try {
        const status=typeof D.availability==='function'?await D.availability():'available';
        if(status==='available'){
          const detector=await D.create();
          try {
            const candidates=await detector.detect(text);
            if(Array.isArray(candidates)&&candidates[0]?.confidence>=0.75)
              return normalizeLanguage(candidates[0].detectedLanguage);
          } finally {detector.destroy?.();}
        }
      } catch (_) {/* no unreliable guess */}
    }
    return '';
  }
  async availability(sourceLanguage) {
    const T=this.env.Translator;
    if(this.closed||!T||typeof T.create!=='function')return 'unavailable';
    if(typeof T.availability!=='function')return 'unknown';
    try{return await T.availability({sourceLanguage,targetLanguage:TARGET});}
    catch(e){this.lastIssue=String(e?.message||e);return 'unavailable';}
  }
  async translator(sourceLanguage) {
    if(this.closed)throw new Error('PROVIDER_CLOSED');
    if(this.pairs.has(sourceLanguage))return this.pairs.get(sourceLanguage);
    if(this.pending.has(sourceLanguage))return this.pending.get(sourceLanguage);
    const job=(async()=>{
      const T=this.env.Translator;
      if(!T||typeof T.create!=='function')throw new Error('UNSUPPORTED_TRANSLATOR_API');
      const availability=await this.availability(sourceLanguage);
      if(['unavailable','unknown'].includes(availability))throw new Error('MODEL_UNAVAILABLE');
      const downloadable=availability==='downloadable'||availability==='downloading';
      this.downloading=downloadable;
      this.onProgress({state:downloadable?'MODEL_DOWNLOAD':'MODEL_READY',loaded:downloadable?0:1});
      const instance=await T.create({sourceLanguage,targetLanguage:TARGET,monitor:(m)=>{
        m?.addEventListener?.('downloadprogress',(event)=>{
          this.onProgress({state:'MODEL_DOWNLOAD',loaded:Math.max(0,Math.min(1,Number(event.loaded)||0))});
        });
      }});
      if(this.closed){instance.destroy?.();throw new Error('PROVIDER_CLOSED');}
      this.pairs.set(sourceLanguage,instance);
      this.onProgress({state:'MODEL_READY',loaded:1});
      return instance;
    })();
    this.pending.set(sourceLanguage,job);
    try{return await job;}finally{this.pending.delete(sourceLanguage);this.downloading=false;}
  }
  async translate(text,context={}) {
    // Explicit user preference wins over every model mode and glossary rule.
    if(context?.regionalPreference==='original')
      return {text,state:STATES.UNCHANGED,provider:'user-choice',reason:'PRESERVE_ORIGINAL'};
    const fallback=()=>termResult(text,undefined,context);
    if(this.closed)return {...fallback(),reason:'PROVIDER_CLOSED'};
    if(typeof text!=='string'||text.length>MAX)return {...fallback(),reason:'TEXT_TOO_LONG'};
    if(this.failures>=3)return {...fallback(),reason:'CIRCUIT_OPEN'};
    const source=await this.detectSource(text);
    if(!source)return {...fallback(),reason:STATES.SOURCE_UNKNOWN};
    if(source==='zh-Hant')return fallback();
    const key=source+'\0'+(context.domain||'general')+'\0'+text;
    if(this.cache.has(key))return this.cache.get(key);
    const guard=protect(text);
    if(!guard.ok)return {...fallback(),reason:guard.reason};
    try{
      const instance=await this.translator(source);
      const translated=await instance.translate(guard.text);
      if(this.closed)return {...fallback(),reason:'PROVIDER_CLOSED'};
      const restored=guard.restore(translated);
      if(!restored.ok)return {...fallback(),reason:STATES.GUARD_REJECTED,guardReason:restored.reason};
      const out=core.translateText(restored.text,context);
      const result={text:out,state:out===text?STATES.UNCHANGED:STATES.MODEL,provider:'chrome-built-in',sourceLanguage:source};
      this.cache.set(key,result);
      if(this.cache.size>512)this.cache.delete(this.cache.keys().next().value);
      this.failures=0;
      return result;
    }catch(e){
      this.failures++;this.lastIssue=String(e?.message||e);
      return {...fallback(),reason:this.lastIssue,providerState:STATES.UNSUPPORTED};
    }
  }
  status(){return {state:this.closed?'CLOSED':this.downloading?'MODEL_DOWNLOAD':this.failures>=3?'DEGRADED':'READY',
    pairsReady:this.pairs.size,cacheEntries:this.cache.size,lastIssue:this.lastIssue,failures:this.failures};}
  destroy(){
    this.closed=true;
    for(const t of this.pairs.values())try{t.destroy?.();}catch(_){}
    this.cache.clear();this.pairs.clear();this.pending.clear();
  }
}
function createRouter(opts={}) {
  const cfg=selected(opts.mode,opts.sourceLanguage);
  const browser=cfg.mode==='local-ai'?new BrowserLocalProvider(opts):null;
  return {translate:(text,context={})=>browser?browser.translate(text,context):Promise.resolve(termResult(text,undefined,context)),
    status:()=>browser?browser.status():{state:'TERMS_ONLY',cacheEntries:0},
    destroy:()=>browser?.destroy(),mode:cfg.mode,sourceLanguage:cfg.sourceLanguage};
}
const api=Object.freeze({VERSION,TARGET,STATES,normalizeLanguage,protect,selected,
  BrowserLocalProvider,createRouter,termResult});
global.TLSProviders=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
