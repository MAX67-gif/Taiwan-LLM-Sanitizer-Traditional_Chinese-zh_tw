/* R208: non-invasive user-directed first-task guide.
 * Observes existing R207 state; never reads source text into evidence,
 * never stores session data, calls a network API or chooses a term.
 */
(function(){'use strict';
const API=window.TLSFirstTaskR208;
if(!API||API.SCHEMA!=='tls.r208.first-task-flow-state.v1')throw Error('TLS_R208_API_NOT_READY');
const $=s=>document.querySelector(s);
const flowState={exportActionTriggered:false};
const labels=Object.freeze([
 '準備自有或原創文件','進行本機安全分析','人工確認至少一筆用語',
 '檢查原文與新稿差異','主動下載新稿'
]);
const stepMessage=Object.freeze({
 NEED_INPUT:'從示範文件開始，或貼入自己有權處理的 Markdown。',
 NEED_ANALYSIS:'已準備來源。下一步在本機執行分析，不會自動改詞。',
 NEED_REVIEW:'已找到可審位置。選擇一處「採用」或「保留原文」。',
 NEED_PREVIEW:'已記錄人工選擇，請產生並檢查安全預覽。',
 NEED_EXPORT:'已有安全預覽，確認差異後由你點選下載新稿。',
 LOCAL_EXPORT_ACTION_TRIGGERED:'已觸發新稿下載。瀏覽器是否儲存成功，請自行確認。',
 NO_REVIEWABLE_CANDIDATES:'沒有可人工選詞的候選，不代表全文已通過品質審查。'
});
let current=API.evaluate({source_loaded:false,analysis_ready:false,
 reviewable_count:0,decision_count:0,omitted_count:0,preview_ready:false,
 export_action_triggered:false});
function metric(selector,re,limit=120){
 const match=$(selector)?.textContent.match(re);
 const number=match?Number(match[1]):0;
 return Number.isSafeInteger(number)&&number>=0&&number<=limit?number:0;
}
function sampleState(){
 const source_loaded=($('#source')?.value.trim().length||0)>0;
 const analysis_ready=source_loaded&&!$('#candidatePanel').hidden;
 const numbers=analysis_ready?($('#reviewProgress').textContent.match(/^(\d+)\s*\/\s*(\d+)\s*已處理/u)||[]):[];
 const decision_count=Number(numbers[1]||0),reviewable_count=Number(numbers[2]||0);
 const omitted_count=analysis_ready?metric('#focusSafety',/(\d+)\s*筆未列出/u,1000000):0;
 const preview_ready=analysis_ready&&!$('#resultPanel').hidden&&!$('#download').disabled&&
  $('#previewState').textContent.includes('SAFE_PREVIEW_NOT_APPLIED');
 return {source_loaded,analysis_ready,reviewable_count,decision_count,
  omitted_count,preview_ready,
  export_action_triggered:flowState.exportActionTriggered&&preview_ready};
}
function markInvalid(){flowState.exportActionTriggered=false;}
function render(){
 try{current=API.evaluate(sampleState());}
 catch(_){current=API.evaluate({source_loaded:false,analysis_ready:false,
  reviewable_count:0,decision_count:0,omitted_count:0,preview_ready:false,
  export_action_triggered:false});}
 const complete=current.completed_steps;
 $('#r208Progress').value=complete;
 $('#r208Stage').textContent='已完成 '+complete+'／5 個本機操作階段｜'+stepMessage[current.stage];
 const list=$('#r208Steps');list.replaceChildren();
 for(let i=0;i<labels.length;i++){
  const li=document.createElement('li');
  li.textContent=(i<complete?'已完成｜':i===complete?'目前｜':'待處理｜')+labels[i];
  li.className=i<complete?'r208-complete':i===complete?'r208-current':'r208-wait';
  list.append(li);
 }
 const warning=$('#r208Coverage');
 warning.textContent=current.partial_coverage?
  '注意：'+current.omitted_count+' 筆候選因上限未列出；進度不代表完整文件審查。':
  '這是操作流程進度，不是語意等價認證，也不能代表真人使用量。';
 const next=$('#r208Next');
 const captions={NEED_INPUT:'載入原創範例並分析',NEED_ANALYSIS:'開始安全分析',
  NEED_REVIEW:'移到一筆待人工確認的詞',NEED_PREVIEW:'產生安全預覽',
  NEED_EXPORT:'由我下載新稿',LOCAL_EXPORT_ACTION_TRIGGERED:'查看自願回饋區',
  NO_REVIEWABLE_CANDIDATES:'無可審候選；請檢查原文'};
 next.textContent=captions[current.stage];
 next.disabled=current.stage==='NO_REVIEWABLE_CANDIDATES';
 const validConsent=$('#r208FeedbackConsent').checked;
 const clarity=$('#r208FeedbackClarity').value,outcome=$('#r208FeedbackOutcome').value;
 $('#r208FeedbackDownload').disabled=!(validConsent&&clarity&&outcome);
}
function start(){
 if(!$('#source').value.trim())$('#demo').click();
 $('#inspect').click();
 render();
}
$('#r208Start').addEventListener('click',start);
$('#r208Next').addEventListener('click',()=>{
 const stage=current.stage;
 if(stage==='NEED_INPUT'||stage==='NEED_ANALYSIS')start();
 else if(stage==='NEED_REVIEW'){
  if($('#focusToggle').getAttribute('aria-pressed')!=='true')$('#focusToggle').click();
  $('#candidatePanel').scrollIntoView({block:'start'});
  $('#r208Stage').textContent='請自行點選候選的「採用」或「保留原文」；未替你做任何決定。';
 }else if(stage==='NEED_PREVIEW')$('#previewBtn').click();
 else if(stage==='NEED_EXPORT')$('#download').click();
 else if(stage==='LOCAL_EXPORT_ACTION_TRIGGERED')$('#r208FeedbackClarity').focus();
 render();
});
function updateConsent(){render();}
for(const id of ['#r208FeedbackConsent','#r208FeedbackClarity','#r208FeedbackOutcome'])
 $(id).addEventListener('change',updateConsent);
$('#r208FeedbackDownload').addEventListener('click',()=>{
 try{
  const content=API.makeFeedback({flow:current,
   consent:$('#r208FeedbackConsent').checked,
   clarity:$('#r208FeedbackClarity').value,
   outcome:$('#r208FeedbackOutcome').value});
  const blob=new Blob([JSON.stringify(content,null,2)+'\n'],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download='TLS_R208_Local_Opt_In_Feedback_No_Source.json';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
  $('#r208FeedbackStatus').textContent='已要求下載本機流程回饋；不會自動傳送給維護者。內容不含原文／文件雜湊。';
 }catch(error){
  $('#r208FeedbackStatus').textContent='沒有產生回饋：'+
   String(error.message||'INVALID').replace(/[^A-Za-z0-9_: -]/g,'').slice(0,100);
 }
});
// Only observe existing R207 panels/statuses, never this guide's own DOM.
const callback=()=>render();
for(const id of ['#candidatePanel','#resultPanel'])
 new MutationObserver(callback).observe($(id),{attributes:true,attributeFilter:['hidden']});
for(const id of ['#reviewProgress','#focusSafety','#previewState'])
 new MutationObserver(callback).observe($(id),{childList:true,characterData:true,subtree:true});
$('#source').addEventListener('input',()=>{markInvalid();render();});
for(const id of ['#file','#importReview'])$(id).addEventListener('change',()=>{markInvalid();render();});
// Listener at bubble phase runs after R207's own handler; a pending async
// preview is rechecked when resultPanel's hidden attribute changes.
document.addEventListener('click',event=>{
 const hit=event.target.closest('button');if(!hit)return;
 if(hit.id==='download'&&!hit.disabled&&!$('#resultPanel').hidden&&
     $('#previewState').textContent.includes('SAFE_PREVIEW_NOT_APPLIED')){
  flowState.exportActionTriggered=true;
 }else if(['clear','demo','inspect','previewBtn','discard','cancelPending',
  'undoReview','redoReview','focusToggle'].includes(hit.id)||
  hit.closest('#candidates')&&hit.type==='button'){
  markInvalid();
 }
 render();
});
render();
})();
