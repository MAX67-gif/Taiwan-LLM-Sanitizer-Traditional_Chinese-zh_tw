/* TLS R205: explainable read-only context hints for an existing human review.
 * No AI classifier, no translation, no auto-apply, no network or storage.
 * Heuristics deliberately stop at local punctuation; uncertain means REVIEW.
 */
(function(root){'use strict';
const SCHEMA='tls.r205.context-risk-summary.v1';
const TIERS=Object.freeze({HIGH:0,MEDIUM:1,LOW:2,LOCKED:3});
const LABELS=Object.freeze({
  CONFLICTING_CONTEXT_CUES:'附近同時有介面與餐飲線索；不可僅靠詞彙決定，請人工核對。',
  CHOICE_CONTEXT_CONFLICT:'已選詞的領域與附近線索不一致；保留你的選擇，請再確認。',
  AMBIGUOUS_CONTEXT_NO_CUES:'menu 缺乏可判定的領域線索；請人工確認是選單還是菜單。',
  DOMAIN_CUE_PRESENT:'附近有單一領域線索，但只是字面提示，不代表語義已驗證。',
  MULTIPLE_POSSIBLE_TERMS:'此處有多種候選替換詞；請依全文語境自行選擇。',
  CANDIDATE_NOT_HUMAN_VERIFIED:'含未經獨立真人語言品質驗證的候選；請人工核對。',
  SINGLE_CONTEXT:'此處仍須人工決定；沒有自動替換權限。',
  NATIVE_PROTECTION:'原引擎已標為受保護或受限；此雷達不解除限制。'
});
const UI=Object.freeze(['主選單','功能','設定','介面','開啟','點選','操作','畫面','導覽','按鈕','選項','偏好','settings','interface','navigation','button']);
const FOOD=Object.freeze(['餐廳','午餐','晚餐','早餐','點餐','餐點','菜單','料理','飲料','食物','restaurant','lunch','dinner','breakfast','food']);
const BOUNDARY=/[，,、。；;：:！!？?\r\n]/u;
const fail=code=>{throw Error('TLS_R205_'+code);};
const cleanText=(text)=>{
 if(typeof text!=='string'||text.includes('\0')||text.length>65536)fail('SOURCE_INVALID');
 return text;
};
const safeCandidate=(candidate,source)=>{
 if(!candidate||typeof candidate!=='object'||!Number.isSafeInteger(candidate.start)||
    !Number.isSafeInteger(candidate.end)||candidate.start<0||
    candidate.start>=candidate.end||candidate.end>source.length||
    typeof candidate.original_text!=='string'||
    source.slice(candidate.start,candidate.end)!==candidate.original_text)fail('STALE_ANCHOR');
 if(typeof candidate.id!=='string'||!Array.isArray(candidate.options)||
    !['CONTEXT_REQUIRED','BLOCKED','LIMITED'].includes(candidate.resolution))
   fail('INVALID_CANDIDATE');
 return candidate;
};
function neighborhood(source,start,end){
 let a=start,b=end;
 while(a>0&&start-a<42&&!BOUNDARY.test(source[a-1]))a--;
 while(b<source.length&&b-end<42&&!BOUNDARY.test(source[b]))b++;
 return (source.slice(a,start)+' '+source.slice(end,b)).toLowerCase();
}
function assess(candidate,input){
 const source=cleanText(input),c=safeCandidate(candidate,source);
 let tier='LOW',reason='SINGLE_CONTEXT',suggested_context=null,domains=[];
 if(c.resolution!=='CONTEXT_REQUIRED'){
   tier='LOCKED';reason='NATIVE_PROTECTION';
 }else if(c.original_text.toLowerCase()==='menu'&&
     c.options.some(x=>x.context==='ui_menu')&&
     c.options.some(x=>x.context==='food_menu')){
   const around=neighborhood(source,c.start,c.end);
   const hasUI=UI.some(x=>around.includes(x)),hasFood=FOOD.some(x=>around.includes(x));
   domains=[...(hasUI?['UI']:[]),...(hasFood?['FOOD']:[])];
   if(hasUI&&hasFood){tier='HIGH';reason='CONFLICTING_CONTEXT_CUES';}
   else if(!hasUI&&!hasFood){tier='HIGH';reason='AMBIGUOUS_CONTEXT_NO_CUES';}
   else{
     suggested_context=hasUI?'ui_menu':'food_menu';
     const selected=c.choice==='CONFIRM'?
       c.options.find(x=>x.id===c.selected_option_id):null;
     if(c.choice==='CONFIRM'&&!selected)fail('STALE_OPTION');
     if(selected&&selected.context!==suggested_context){
       tier='HIGH';reason='CHOICE_CONTEXT_CONFLICT';
     }else{tier='MEDIUM';reason='DOMAIN_CUE_PRESENT';}
   }
 }else if(new Set(c.options.map(x=>x.replacement)).size>1){
   tier='HIGH';reason='MULTIPLE_POSSIBLE_TERMS';
 }else if(c.options.some(x=>x.evidence_status==='CANDIDATE_ONLY')){
   tier='MEDIUM';reason='CANDIDATE_NOT_HUMAN_VERIFIED';
 }
 return Object.freeze({
  candidate_id:c.id,tier,reason_code:reason,
  cue_domains:Object.freeze(domains),suggested_context,
  human_review_required:true,auto_apply:false,approval:'NONE',
  semantic_equivalence_verified:false,network_requested:false
 });
}
function route(candidates,source,mode='risk_first'){
 cleanText(source);
 if(!Array.isArray(candidates)||!['risk_first','document','high_only'].includes(mode))
   fail('INVALID_MODE');
 const pairs=candidates.map((c,i)=>({c,i,info:assess(c,source)}));
 if(mode==='high_only')return Object.freeze(pairs.filter(x=>x.info.tier==='HIGH').map(x=>x.c));
 if(mode==='risk_first')pairs.sort((a,b)=>TIERS[a.info.tier]-TIERS[b.info.tier]||a.i-b.i);
 return Object.freeze(pairs.map(x=>x.c));
}
function summarize(candidates,source){
 cleanText(source);
 if(!Array.isArray(candidates)||candidates.length>120)fail('INVALID_CANDIDATES');
 const counts={HIGH:0,MEDIUM:0,LOW:0,LOCKED:0};let confirmedRisk=0;
 for(const candidate of candidates){
  const finding=assess(candidate,source);counts[finding.tier]++;
  if(candidate.choice==='CONFIRM'&&finding.tier==='HIGH')confirmedRisk++;
 }
 return Object.freeze({
  schema:SCHEMA,high:counts.HIGH,medium:counts.MEDIUM,
  low:counts.LOW,locked:counts.LOCKED,confirmed_risk:confirmedRisk,
  candidate_count:candidates.length,approval:'NONE',auto_apply:false,
  contains_source_text:false,network_requested:false,
  semantic_equivalence_verified:false
 });
}
function message(finding){
 if(!finding||!Object.prototype.hasOwnProperty.call(LABELS,finding.reason_code))fail('UNKNOWN_REASON');
 return (finding.tier==='HIGH'?'高風險｜':
         finding.tier==='MEDIUM'?'需核對｜':
         finding.tier==='LOCKED'?'原生保護｜':'一般核對｜')+LABELS[finding.reason_code];
}
const API=Object.freeze({SCHEMA,assess,route,summarize,message});
root.TLSContextRiskLensR205=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof globalThis!=='undefined'?globalThis:this);
