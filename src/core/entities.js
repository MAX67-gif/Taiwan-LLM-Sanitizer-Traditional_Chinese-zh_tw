/* Taiwan-LLM-Sanitizer R5 - MIT. Protected-name router; no network calls.
 * EDIT lexicon/protected_names_r5.json, then run tools/generate_names_r5.py. */
(function(global){
'use strict';
const VERSION='0.4.0';
const REGISTRY=/* TLS_NAMES_BEGIN */[{"id":"openai-codex-for-open-source","name":"Codex for Open Source","aliases":["OpenAI Codex for Open Source","Codex for Open Source","Codex for OSS"],"bad":["開源法典","开源法典"],"note_zh_tw":"OpenAI 的 Codex 開源專案支持計畫（說明性譯法，非官方正式譯名）"},{"id":"openai-codex","name":"OpenAI Codex","aliases":["OpenAI Codex","Codex"],"bad":["開放人工智慧法典"],"note_zh_tw":"OpenAI 的程式協作產品名稱"},{"id":"anthropic-claude-code","name":"Claude Code","aliases":["Anthropic Claude Code","Claude Code"],"bad":[],"note_zh_tw":"Anthropic 的程式協作產品名稱"},{"id":"anthropic-claude","name":"Claude","aliases":["Anthropic Claude","Claude"],"bad":[],"note_zh_tw":"AI 產品名稱或專有姓名，保持原文"},{"id":"openai-chatgpt","name":"ChatGPT","aliases":["ChatGPT"],"bad":[],"note_zh_tw":"產品品牌"},{"id":"openai-organization","name":"OpenAI","aliases":["OpenAI"],"bad":[],"note_zh_tw":"品牌"},{"id":"anthropic-organization","name":"Anthropic","aliases":["Anthropic"],"bad":[],"note_zh_tw":"品牌"},{"id":"github-brand","name":"GitHub","aliases":["GitHub"],"bad":[],"note_zh_tw":"軟體服務商標"},{"id":"tampermonkey-brand","name":"Tampermonkey","aliases":["Tampermonkey"],"bad":[],"note_zh_tw":"使用者腳本管理工具"},{"id":"read-frog-brand","name":"Read Frog","aliases":["Read Frog"],"bad":[],"note_zh_tw":"產品專有名稱"},{"id":"pytorch-brand","name":"PyTorch","aliases":["PyTorch"],"bad":[],"note_zh_tw":"開源框架名稱"},{"id":"huggingface-brand","name":"Hugging Face","aliases":["Hugging Face"],"bad":[],"note_zh_tw":"AI 開源平台名稱"},{"id":"model-context-protocol","name":"Model Context Protocol","aliases":["Model Context Protocol"],"bad":[],"note_zh_tw":"通訊協定正式名稱"},{"id":"agent-skill","name":"Agent Skills","aliases":["Agent Skills"],"bad":[],"note_zh_tw":"AI Agent 標準用語，先保留正式英文名稱"},{"id":"manifest-v3","name":"Manifest V3","aliases":["Manifest V3"],"bad":[],"note_zh_tw":"Chrome 擴充功能規範名稱"},{"id":"nodejs-name","name":"Node.js","aliases":["Node.js"],"bad":[],"note_zh_tw":"執行環境名稱"}]/* TLS_NAMES_END */;
const SORTED=REGISTRY.flatMap(r=>r.aliases.map(alias=>({alias,id:r.id,note:r.note_zh_tw,bad:r.bad||[]})))
 .sort((a,b)=>b.alias.length-a.alias.length||a.alias.localeCompare(b.alias,'en'));
function boundary(before,after){
  return !/[A-Za-z0-9_]/u.test(before||'')&&!/[A-Za-z0-9_]/u.test(after||'');
}
function find(text) {
  if(typeof text!=='string'||text.length>20000)return [];
  const found=[];
  for(let i=0;i<text.length;){
    let hit=null;
    for(const entry of SORTED) {
      if(!text.startsWith(entry.alias,i))continue;
      if(!boundary(text[i-1],text[i+entry.alias.length]))continue;
      hit=entry;break;
    }
    if(!hit){i++;continue;}
    found.push(Object.freeze({start:i,end:i+hit.alias.length,literal:hit.alias,id:hit.id}));
    i+=hit.alias.length;
  }
  return found;
}
function mask(text){
  if(typeof text!=='string')return {ok:false,reason:'TYPE'};
  const spans=find(text);
  let output='',cursor=0;
  const replacements=[];
  for(const span of spans){
    const token='⟪TLSNAME'+replacements.length+'⟫';
    if(text.includes(token))return {ok:false,reason:'COLLISION'};
    output+=text.slice(cursor,span.start)+token;
    replacements.push({...span,token});
    cursor=span.end;
  }
  output+=text.slice(cursor);
  return {ok:true,text:output,spans:replacements,restore(translated){
    if(typeof translated!=='string')return {ok:false,reason:'BAD_RESULT'};
    let last=-1;
    for(const r of replacements){
      if(translated.split(r.token).length!==2)return {ok:false,reason:'NAME_LOST_OR_DUPLICATED',id:r.id};
      const index=translated.indexOf(r.token);
      if(index<=last)return {ok:false,reason:'NAME_REORDERED',id:r.id};
      last=index;
    }
    let value=translated;
    for(const r of replacements)value=value.replace(r.token,r.literal);
    if(/⟪TLSNAME\d+⟫/u.test(value))return {ok:false,reason:'UNEXPECTED_NAME_TOKEN'};
    return {ok:true,text:value};
  }};
}
function audit(source,target) {
  const warnings=[];
  if(typeof source!=='string'||typeof target!=='string')
    return {ok:false,issues:[{code:'NON_STRING'}],protectedCount:0};
  const matches=find(source);
  for(const span of matches){
    const row=REGISTRY.find(r=>r.id===span.id);
    if(!target.includes(span.literal)){
      warnings.push({code:'PROTECTED_NAME_CHANGED',id:span.id,name:span.literal});
    }
    if(row)for(const mistranslation of (row.bad||[])){
      if(target.includes(mistranslation))
        warnings.push({code:'KNOWN_MISTRANSLATION',id:span.id,badForm:mistranslation});
    }
  }
  return {ok:warnings.length===0,issues:warnings,protectedCount:matches.length};
}
const api=Object.freeze({VERSION,ENTRIES:Object.freeze(REGISTRY),find,mask,audit});
global.TLSNames=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
