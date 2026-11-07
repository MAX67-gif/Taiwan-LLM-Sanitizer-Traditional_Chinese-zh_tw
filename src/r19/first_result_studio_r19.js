/* TLS R19 Context Review Studio. Local-only UI over immutable R17.2 wording core.
 * Source and output stay in browser memory. Never send / auto-share originals.
 */
(function(){'use strict';
const API=window.TLSWordingAssistantR172;
if(!API)throw new Error('TLS_R19_MISSING_LOCKED_R172_CORE');
const Helpers=window.TLSReviewHelpersR19;
if(!Helpers)throw new Error('TLS_R19_MISSING_HELPERS');
const $=id=>document.getElementById(id);
const scrollBehavior=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
const create=(name,text,classes)=>{const x=document.createElement(name);if(text!==undefined)x.textContent=text;if(classes)x.className=classes;return x;};
const SOURCE_SAMPLE=window.TLSR18OriginalSample;
if(typeof SOURCE_SAMPLE!=='string'||!SOURCE_SAMPLE.startsWith('# '))throw new Error('TLS_R19_SAMPLE_MISSING');
let session=null,snapshot=null,preview=null,epoch=0,previewGeneration=0,demoSource=false,showFilter='all';
let rawSource=null,sessionSource='';
let feedbackRevision=0;
const preferences=new Map();
const normalizeNewlines=text=>text.replace(/\r\n?/g,'\n');
// textarea.value normalizes CR/CRLF. Retain original bytes as text until the
// user edits; the immutable engine and the download receive this exact source.
function currentSource(){const value=$('source').value;return rawSource!==null&&normalizeNewlines(rawSource)===value?rawSource:value;}
const FOCUS_ACTIONS=new Set(['CONFIRM','KEEP_ORIGINAL','RESET']);
let filename='';
let stagedFile=null,stageSerial=0;
function announce(s,type='info'){$('message').textContent=s;$('message').dataset.kind=type;}
function state(phase){for(const [index,id] of ['step-source','step-review','step-export'].entries()){
 const el=$(id);el.classList.toggle('on',phase===index+1);el.classList.toggle('complete',phase>index+1);
 if(phase===index+1)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
} $('stateText').textContent=phase===1?'準備原稿':phase===2?'確認語境':'驗證成果';
 $('guideTitle').textContent=phase===1?'第 1 步｜先看原創範例':phase===2?'第 2 步｜每一處由你決定':'第 3 步｜核對差異再下載';
 $('guideText').textContent=phase===1?'新手可以按「直接體驗」；它只載入我們的原創稿並找候選，不會替你做選擇。':phase===2?'按候選上的選項或「保留原文」，再按「下一個待決定」。你也可以不選，結果會保留原文。':'看一下本機變更亮點與完整原文，再下載新稿。回饋草稿不會包含你的文章。';}
// UI preferences can invalidate a preview without changing the engine snapshot.
// Give each request an owner so cancelled work cannot revive an older result.
function invalidate(){previewGeneration++;preview=null;$('previewBtn').disabled=false;$('resultSection').hidden=true;$('resultCoverageNotice').hidden=true;$('result').value='';$('originalResult').value='';$('download').disabled=true;$('copy').disabled=true;$('proofDownload').disabled=true;$('proofDetails').replaceChildren();$('decisionDetails').replaceChildren();$('diffHighlights').replaceChildren();$('diffNote').textContent='等待安全預覽。';}
function renderPreferences(){
 const list=$('preferenceList');list.replaceChildren();
 for(const pref of preferences.values())list.appendChild(create('li','「'+pref.original+'」在「'+pref.contextLabel+'」語境：'+pref.replacement));
 $('preferencePanel').hidden=preferences.size===0;
}
function clearPreferences(){preferences.clear();renderPreferences();}
// Feedback refers to the current review task, not just a free-form text box.
// Invalidating its authorization must not delete a user's handwritten note.
function invalidateFeedback(clearText=false){
 feedbackRevision++;$('feedbackCopy').disabled=true;
 if(clearText)$('feedbackDraft').value='';
 $('feedbackStep').value='';$('feedbackOutcome').value='';
}

function reset(clearSource=false){epoch++;$('inspect').disabled=false;if(session)session.revoke();session=null;snapshot=null;sessionSource='';invalidate();$('reviewSection').hidden=true;$('candidateList').replaceChildren();$('stage2Count').textContent='0';$('stage3Count').textContent='0';$('stageSummary').textContent='尚無候選';$('progressBar').value=0;
 $('coverageNotice').hidden=true;$('coverageNotice').textContent='';$('readyLabel').textContent='沒有自動更動';
 for(const id of ['statCandidates','statProtected','statDecided','statBlocked'])$(id).textContent='0';
 invalidateFeedback(clearSource);showFilter='all';for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter==='all'));
 $('progressBar').max=1;filename='';if(clearSource){$('source').value='';rawSource=null;demoSource=false;clearPreferences();$('sourceFormatNotice').hidden=true;}state(1);}
function sourceChanged(){const normalized=rawSource!==null&&rawSource.includes('\r');rawSource=null;clearPreferences();$('guidedReplacePanel').hidden=true;reset(false);demoSource=false;
 if(normalized){$('sourceFormatNotice').textContent='原稿已手動編輯；本次輸出使用編輯框的 LF 換行。磁碟上的原檔不會更動。';$('sourceFormatNotice').hidden=false;}
 announce('原稿已變更；舊候選、選擇、文件偏好與預覽均已失效。');}
function coverageMessage(summary){return '只完成部分候選檢視：偵測到 '+summary.total+' 處，這次列出 '+summary.shown+' 處，另有 '+summary.omitted+' 處未列出且未審核。未列出及未決定的內容保持原文。請分段檢視剩餘內容，再核對全文。';}
function progress(){if(!snapshot)return;
 const coverage=Helpers.coverageSummary(snapshot);
 const all=snapshot.candidates,eligible=all.filter(x=>x.resolution==='CONTEXT_REQUIRED');
 const decided=eligible.filter(x=>x.choice==='CONFIRM'||x.choice==='KEEP_ORIGINAL').length;
 const confirmed=eligible.filter(x=>x.choice==='CONFIRM').length,kept=eligible.filter(x=>x.choice==='KEEP_ORIGINAL').length;
 const blocked=all.length-eligible.length;
 $('stage2Count').textContent=String(decided)+'/'+String(eligible.length);
 $('stageSummary').textContent='已列出的候選中：'+decided+'/'+eligible.length+' 處已決定 · '+confirmed+' 採用 · '+kept+' 保留 · '+blocked+' 處不可套用';
 $('statCandidates').textContent=String(all.length);$('statProtected').textContent=String(snapshot.coverage.protected_segments);
 $('statDecided').textContent=String(decided);$('statBlocked').textContent=String(blocked);
 $('progressBar').max=Math.max(1,eligible.length);$('progressBar').value=decided;
 $('coverageNotice').hidden=!coverage.partial;$('coverageNotice').textContent=coverage.partial?coverageMessage(coverage):'';
 $('readyLabel').textContent=coverage.partial?'僅部分候選已列出；其餘 '+coverage.omitted+' 處仍未檢視':eligible.length&&decided!==eligible.length?'可先預覽；未決定處仍保留原文':'已處理全部已列出的可選項目；仍需檢查原意';
}
function filter(item){return showFilter==='all'||(showFilter==='open'&&item.choice==='UNSELECTED'&&item.resolution==='CONTEXT_REQUIRED')||(showFilter==='handled'&&['CONFIRM','KEEP_ORIGINAL'].includes(item.choice))||(showFilter==='protected'&&item.resolution!=='CONTEXT_REQUIRED');}
function render(){if(!snapshot||snapshot.state!=='READY')return;
 progress();renderPreferences();const list=$('candidateList');list.replaceChildren();
 let shown=0;for(const item of snapshot.candidates){if(!filter(item))continue;shown++;
  const card=create('article',undefined,'choice-card');card.dataset.candidateId=item.id;
  const context=Helpers.contextExcerpt(sessionSource,item.start,item.end);
  const top=create('div',undefined,'choice-head');top.appendChild(create('span','第 '+context.line+' 行 · 第 '+context.column+' 字 · '+item.id,'position'));
  const flag=create('span',item.resolution==='BLOCKED'?'禁止替換':item.resolution==='LIMITED'?'範圍受限':item.choice==='CONFIRM'?'已採用':item.choice==='KEEP_ORIGINAL'?'保留原文':'待確認','choice-state');
  flag.dataset.state=item.resolution==='CONTEXT_REQUIRED'?item.choice:item.resolution;
  top.appendChild(flag);card.appendChild(top);
  const h=create('h3','「'+item.original_text+'」');card.appendChild(h);
  const excerpt=create('p',undefined,'candidate-context');
  excerpt.appendChild(create('span',(context.leading?'…':'')+context.before));
  excerpt.appendChild(create('mark',context.match));
  excerpt.appendChild(create('span',context.after+(context.trailing?'…':'')));card.appendChild(excerpt);
  if(item.resolution!=='CONTEXT_REQUIRED'){
   card.appendChild(create('p','不提供採用：'+item.reason_codes.join('、')+'。此處會維持原文。','detail'));
  }else{
   const hints=item.options.filter(option=>preferences.get(item.original_text+'\u0000'+option.context)?.replacement===option.replacement);
   if(hints.length)card.appendChild(create('p','文件偏好提示：'+hints.map(option=>option.replacement+'（'+option.context_label+'）').join('；')+'。此處是否適用仍由你判斷，不會自動採用。','preference-hint'));
   const rows=create('div',undefined,'choice-actions');
   for(const option of item.options){const b=create('button',option.replacement+' · '+option.context_label+(option.evidence_status==='CANDIDATE_ONLY'?'（候選）':''),'option');
    b.type='button';b.dataset.choiceAction='CONFIRM';b.dataset.optionId=option.id;b.setAttribute('aria-pressed',String(item.choice==='CONFIRM'&&item.selected_option_id===option.id));
    b.addEventListener('click',()=>pick(item.id,'CONFIRM',{option_id:option.id}));rows.appendChild(b);}
   const keep=create('button','保留這一處原文','option keep');keep.type='button';keep.dataset.choiceAction='KEEP_ORIGINAL';keep.setAttribute('aria-pressed',String(item.choice==='KEEP_ORIGINAL'));
   keep.addEventListener('click',()=>pick(item.id,'KEEP_ORIGINAL'));rows.appendChild(keep);
   const undo=create('button','重新選擇','option subtle');undo.type='button';undo.dataset.choiceAction='RESET';undo.addEventListener('click',()=>pick(item.id,'RESET'));rows.appendChild(undo);
   card.appendChild(rows);
   card.appendChild(create('p',item.choice==='UNSELECTED'?'尚未決定 → 預覽時維持原文':item.choice==='CONFIRM'?'已確認這一處的替換；其他位置不受影響':'這一處明確保留原文','detail'));
   if(item.choice==='CONFIRM'){
    const selected=item.options.find(option=>option.id===item.selected_option_id);
    if(selected){const remember=create('button','記住此語境的用詞（只作提示）','option remember-choice');remember.type='button';remember.dataset.rememberChoice=item.id;
     remember.addEventListener('click',()=>{
      preferences.set(item.original_text+'\u0000'+selected.context,{original:item.original_text,contextLabel:selected.context_label,replacement:selected.replacement});
      invalidate();state(2);render();focusChoice(item.id,'CONFIRM',selected.id);announce('已記住這份文件的語境用詞。其他位置仍須逐處確認；請重新產生預覽與摘要。','ok');
     });card.appendChild(remember);}
   }
  }
  list.appendChild(card);
 }
 if(!shown)list.appendChild(create('p','這個篩選條件目前沒有項目。','empty'));
}
// Preserve keyboard focus when a candidate card is rebuilt. Do not replay the
// previous click, auto-apply another candidate, or change the selected filter.
function focusChoice(id,action,optionId){
 const cards=Array.from($('candidateList').querySelectorAll('[data-candidate-id]'));
 const card=cards.find(x=>x.dataset.candidateId===id);
 const options=card?Array.from(card.querySelectorAll('button[data-choice-action]')):[];
 const target=options.find(x=>x.dataset.choiceAction===action && (action!=='CONFIRM'||x.dataset.optionId===optionId));
 const fallback=$('candidateList').querySelector('button[data-choice-action]');
 (target||fallback||$('previewBtn')).focus({preventScroll:true});
}
function pick(id,action,extra={}){if(!session||!snapshot)return;try{
 if(!FOCUS_ACTIONS.has(action))throw new Error('INVALID_ACTION');
 snapshot=session.choose({snapshot_id:snapshot.snapshot_id,candidate_id:id,action,...extra});
 invalidate();state(2);render();focusChoice(id,action,extra.option_id);
 announce('決定已記錄；焦點保留於審核操作。舊預覽已失效，請重新產生結果。','ok');
}catch(e){announce('選擇未生效：'+String(e.message).slice(0,90),'error');}}
function nextOpen(){
 if(!snapshot)return;
 const pending=snapshot.candidates.find(x=>x.resolution==='CONTEXT_REQUIRED'&&x.choice==='UNSELECTED');
 if(!pending){const coverage=Helpers.coverageSummary(snapshot);announce(coverage.partial?'已列出的可選候選均已處理；另外 '+coverage.omitted+' 處尚未列出與檢視。':'目前沒有待決定的已列出候選；可以產生安全預覽。',coverage.partial?'warn':'ok');$('previewBtn').focus();return;}
 showFilter='open';for(const b of document.querySelectorAll('[data-filter]'))b.setAttribute('aria-pressed',String(b.dataset.filter==='open'));
 render();const card=Array.from($('candidateList').querySelectorAll('[data-candidate-id]')).find(x=>x.dataset.candidateId===pending.id);
 (card?.querySelector('button[data-choice-action]')||$('previewBtn')).focus({preventScroll:true});
 card?.scrollIntoView({behavior:scrollBehavior,block:'center'});
 announce('已移至下一個待決定項目；按 Tab 可繼續選擇。','ok');
}
async function inspect({guided=false}={}){reset(false);const request=epoch;const source=currentSource();
 if(!source.trim()){announce('請先載入原創範例或貼入自己的 Markdown。','warn');return;}
 $('inspect').disabled=true;announce('正在本機檢查受保護片段及臺灣用語候選…');
 try{
  const current=API.createWordingSession({source});if(request!==epoch){current.revoke();return;}session=current;
  const result=await current.inspect();if(request!==epoch||current!==session)return;
  if(result.state!=='READY'){announce('文件結構或格式未通過安全檢查，未產生候選。可能包含未閉合的程式碼區塊或不支援的 JSON 結構；請檢查原稿。','error');current.revoke();session=null;return;}
  snapshot=result;sessionSource=source;$('reviewSection').hidden=false;state(2);render();
  const coverage=Helpers.coverageSummary(snapshot);
  announce(coverage.partial?coverageMessage(coverage):'已列出 '+result.candidates.length+' 處候選，包含 '+result.coverage.protected_segments+' 個受保護片段。沒有自動修改原稿。',coverage.partial?'warn':'ok');
  $('reviewSection').scrollIntoView({behavior:scrollBehavior,block:'start'});
  if(guided)$('candidateList').querySelector('button[data-choice-action]')?.focus({preventScroll:true});
 }catch(e){if(request===epoch)announce('本機分析遭拒絕：'+String(e.message).slice(0,100),'error');}
 finally{if(request===epoch)$('inspect').disabled=false;}
}
function buildProof(){const r=session.report();const eligible=snapshot.candidates.filter(x=>x.resolution==='CONTEXT_REQUIRED');
 const decided=eligible.filter(x=>['CONFIRM','KEEP_ORIGINAL'].includes(x.choice));
 const coverage=Helpers.coverageSummary(snapshot);
 return Object.freeze({schema:'tls.r19.first-result-proof.v1',kind:demoSource?'ORIGINAL_DEMO':'LOCAL_USER_FILE',
 engine:'R17.2_UNMODIFIED',tool:'R19_CONTEXT_REVIEW_STUDIO',status:'ENGINEERING_PREVIEW_NOT_HUMAN_CERTIFICATION',
 detected_candidate_count:coverage.total,omitted_candidate_count:coverage.omitted,
 review_coverage:coverage.partial?'PARTIAL':'ALL_DETECTED_CANDIDATES_SHOWN',document_preference_count:preferences.size,
 candidate_count:snapshot.candidates.length,accepted_count:decided.filter(x=>x.choice==='CONFIRM').length,
 explicitly_kept_count:decided.filter(x=>x.choice==='KEEP_ORIGINAL').length,
 unresolved_count:eligible.length-decided.length,blocked_or_limited_count:snapshot.candidates.length-eligible.length,
 protected_span_count:r.protected_span_count,preview_changed_segment_count:preview.change_count,
 approval:'NONE',semantic_equivalence_verified:false,source_overwritten:false,
 network_requested_by_tool:false,contains_source_text:false,contains_output_text:false,
 contains_source_hash:false,contains_file_path:false,contains_account_id:false,
 validity:'This proof is metadata for this local session only, not independent language quality or adoption evidence.'});
}
function renderProof(){const o=buildProof();const d=$('proofDetails');d.replaceChildren();
 const rows=[['偵測候選總數',o.detected_candidate_count],['已列出候選',o.candidate_count],['未列出／未檢視',o.omitted_candidate_count],['確認採用',o.accepted_count],['明確保留',o.explicitly_kept_count],['未決定',o.unresolved_count],['不可套用',o.blocked_or_limited_count],['受保護片段',o.protected_span_count],['實際變更段落',o.preview_changed_segment_count]];
 for(const [name,value] of rows){const span=create('div',undefined,'proof-row');span.appendChild(create('span',name));span.appendChild(create('strong',String(value)));d.appendChild(span);}
 $('stage3Count').textContent=String(o.preview_changed_segment_count);
 const coverage=Helpers.coverageSummary(snapshot);$('resultCoverageNotice').hidden=!coverage.partial;$('resultCoverageNotice').textContent=coverage.partial?coverageMessage(coverage):'';
 const dlist=$('decisionDetails');dlist.replaceChildren();
 const choices=snapshot.candidates.filter(c=>c.resolution==='CONTEXT_REQUIRED'&&c.choice!=='UNSELECTED');
 for(const c of choices){
  const row=create('div',undefined,'decision-card');const summary=create('div',undefined,'decision-status');
  summary.appendChild(create('span',c.choice==='CONFIRM'?'確認採用':'確認保留','decision-pill'));
  const context=Helpers.contextExcerpt(sessionSource,c.start,c.end);
  summary.appendChild(create('strong','第 '+context.line+' 行 · 第 '+context.column+' 字'));
  row.appendChild(summary);
  row.appendChild(create('p','原文：'+c.original_text,'decision-text'));
  const selected=c.choice==='CONFIRM'?c.options.find(opt=>opt.id===c.selected_option_id):null;
  row.appendChild(create('p','處理：'+(selected?selected.replacement:'保留原文'),'decision-text'));
  dlist.appendChild(row);
 }
 if(!choices.length)dlist.appendChild(create('p','目前沒有已確認的選擇；預覽將保留全部原文。','detail'));
 $('decisionNote').textContent='此表只存在本機畫面，不會加入計數 JSON。確認數與實際變更段落數可能不同；請核對新稿內容。';
 $('proofNote').textContent=demoSource?'這是由原創範例產生的可重現工程紀錄，不是外部使用者評分。':'這是本機來源的計數摘要，不含文件原文、譯文、路徑、身分或 SHA；請勿把它當作匿名化個人資料保證。';
}
// Read-only local highlights. Never infer a mapping when line counts differ.
// These excerpts are rendered with textContent and NEVER enter a report/export.
function renderChangedLines(original,reviewed){
 const area=$('diffHighlights');area.replaceChildren();
 const note=$('diffNote');const a=original.split(/\r\n|\r|\n/u),b=reviewed.split(/\r\n|\r|\n/u);
 if(a.length!==b.length){note.textContent='新稿與原稿的換行數不同，無法安全逐行對齊；請直接檢查上方兩份全文。';return;}
 let count=0;
 for(let i=0;i<a.length;i++){
  if(a[i]===b[i])continue;
  count++;
  if(count>12)continue;
  const box=create('article',undefined,'diff-card');
  const excerpt=Helpers.changedLineExcerpt(a[i],b[i]);
  box.appendChild(create('strong','第 '+String(i+1)+' 行 · 第一處差異於第 '+excerpt.column+' 字','diff-line'));
  const before=create('div',undefined,'diff-before');before.appendChild(create('span','原文'));before.appendChild(create('del',(excerpt.leading?'…':'')+excerpt.before+(excerpt.beforeTrailing?'…':'')));
  const after=create('div',undefined,'diff-after');after.appendChild(create('span','新稿'));after.appendChild(create('ins',(excerpt.leading?'…':'')+excerpt.after+(excerpt.afterTrailing?'…':'')));
  box.appendChild(before);box.appendChild(after);area.appendChild(box);
 }
 note.textContent=count===0?'這次預覽沒有文字變動；保留原文也是有效結果。':
  '共 '+String(count)+' 行內容不同；'+(count>12?'僅顯示前 12 行。':'')+'每行只節錄第一處差異附近，省略處以「…」標記；同一行其餘變更請核對上方全文，語意仍須人工確認。';
}
// This intentionally sends NOTHING. The user must decide what to paste into
// GitHub, where their account is visible. No original, output, hash or path.
function makeFeedbackDraft(){
 const step=$('feedbackStep').value, outcome=$('feedbackOutcome').value;
 const allowedSteps=new Set(['DOWNLOAD','OPEN','IMPORT','REVIEW','PREVIEW','EXPORT','OTHER']);
 const allowedOutcomes=new Set(['DONE','PARTIAL','NOT_DONE']);
 if(!allowedSteps.has(step)||!allowedOutcomes.has(outcome)){$('feedbackCopy').disabled=true;announce('請先自行選擇實際完成程度與遇到的步驟。','warn');return;}
 const lines=[
  'TLS 原創範例試用回饋（不包含私人原稿）',
  '進度：'+({DONE:'完成原創範例',PARTIAL:'完成一部分',NOT_DONE:'未完成'}[outcome]),
  '卡住／想改善：'+({DOWNLOAD:'下載',OPEN:'開啟',IMPORT:'檔案匯入',REVIEW:'逐處選詞',PREVIEW:'安全預覽',EXPORT:'下載新稿',OTHER:'其他'}[step]),
  '我的建議：（請自行填入不含個資／原文的描述）',
  '提醒：GitHub Issue 會顯示我的 GitHub 帳號；本草稿不會自動傳送。'
 ];
 feedbackRevision++;$('feedbackDraft').value=lines.join('\n');$('feedbackCopy').disabled=false;
 announce('已建立只含選定欄位的回饋草稿。沒有傳送，也沒有附上文件內容。','ok');
}
function copyFeedback(){
 const content=$('feedbackDraft').value;if(!content)return;
 const token=epoch,revision=feedbackRevision;
 const current=()=>token===epoch&&revision===feedbackRevision&&!$('feedbackCopy').disabled&&$('feedbackDraft').value===content;
 const fallback=()=>{if(!current())return;$('feedbackDraft').focus();$('feedbackDraft').select();announce('請按 Ctrl+C 複製選取的草稿。','warn');};
 if(navigator.clipboard?.writeText){navigator.clipboard.writeText(content).then(()=>{if(current())announce('已複製草稿，請自行確認再貼到 GitHub。','ok');}).catch(()=>fallback());}
 else fallback();
}
async function makePreview(){if(!session||!snapshot)return;
 invalidate();const generation=previewGeneration,token=epoch,id=snapshot.snapshot_id;
 const current=()=>previewGeneration===generation&&epoch===token&&snapshot?.snapshot_id===id;
 announce('正在重新檢查修改範圍及原文結構…');$('previewBtn').disabled=true;
 try{const p=await session.preview({snapshot_id:id});if(!current())return;
  preview=p;$('result').value=p.preview_text;$('originalResult').value=sessionSource;$('resultSection').hidden=false;
  $('download').disabled=false;$('copy').disabled=false;$('proofDownload').disabled=false;
  renderProof();renderChangedLines(sessionSource,p.preview_text);state(3);
  const coverage=Helpers.coverageSummary(snapshot);
  announce(coverage.partial?'部分候選的安全預覽已產生；另有 '+coverage.omitted+' 處未列出且未審核。請核對全文。':'安全預覽已產生。原稿沒有覆寫；仍請人工檢查語意。',coverage.partial?'warn':'ok');
  $('resultSection').scrollIntoView({behavior:scrollBehavior,block:'start'});
 }catch(e){if(current())announce('安全預覽遭拒絕：'+String(e.message).slice(0,100),'error');}
 finally{if(previewGeneration===generation)$('previewBtn').disabled=false;}
}
function download(name,text,type){const blob=new Blob([text],{type});const u=URL.createObjectURL(blob);const a=create('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function copy(){if(!preview)return;
 const selected=preview,text=selected.preview_text,token=epoch,generation=previewGeneration;
 const current=()=>token===epoch&&generation===previewGeneration&&preview===selected;
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>{if(current())announce('已複製本次預覽結果。','ok');}).catch(()=>fallback());else fallback();
 function fallback(){if(!current())return;$('result').focus();$('result').select();announce('目前無法自動複製。已選取新稿，請按 Ctrl+C。','warn');}
}
function useSample(){reset(true);demoSource=true;$('source').value=SOURCE_SAMPLE;announce('已載入專案原創練習稿。下一步請按「分析這份文件」。','ok');$('source').focus();}
// Files are always reviewed before replacement. A failed/rejected import must
// leave the user's source, decisions and preview unchanged. No cloud transport.
function discardStaged(){
 stageSerial++;stagedFile=null;
 $('stagedFilePanel').hidden=true;$('stagedFileSummary').textContent='';$('file').value='';
}
function safeDisplayName(name){
 return String(name||'未命名檔案').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,90);
}
async function stageFile(file){
 const ticket=++stageSerial;
 stagedFile=null;$('stagedFilePanel').hidden=true;$('stagedFileSummary').textContent='';
 if(!file){announce('沒有取得任何本機檔案。','warn');return;}
 if(!/\.(md|markdown|txt)$/iu.test(file.name)||file.size<1||file.size>API.MAX_BYTES){
  announce('僅接受 1～65536 位元組的 .md／.markdown／.txt；未變更目前原稿。','error');return;
 }
 try{
  const bytes=await file.arrayBuffer();
  if(ticket!==stageSerial)return;
  const source=Helpers.decodeMarkdownBytes(bytes,file.size,API.MAX_BYTES);
  stagedFile={source,name:safeDisplayName(file.name),bytes:bytes.byteLength};
  $('stagedFileSummary').textContent='待載入：'+stagedFile.name+'（'+stagedFile.bytes+' 位元組）。目前文字及所有決策尚未被覆蓋。';
  $('stagedFilePanel').hidden=false;
  announce('已在本機檢查檔案。請選擇「使用這份檔案」才會取代目前文字。','ok');
  $('applyFile').focus({preventScroll:true});
 }catch(error){if(ticket===stageSerial)announce(error.message==='TLS_R19_IMPORT_BOM'?'此檔案帶有 UTF-8 BOM，目前不支援。請另存為 UTF-8 無 BOM 後再試；目前原稿、決策與預覽保持不變。':'檔案不是可用的 UTF-8 純文字，或讀取失敗；目前原稿、決策與預覽保持不變。','error');}
}
function applyStaged(){
 if(!stagedFile)return;
 const record=stagedFile;discardStaged();reset(true);
 rawSource=record.source;$('source').value=record.source;demoSource=false;
 $('sourceFormatNotice').textContent=record.source.includes('\r')?'匯入檔的原始換行會保留在下載新稿中。若手動編輯此框，輸出將使用 LF 換行。':'匯入檔的原始換行會保留在下載新稿中。';$('sourceFormatNotice').hidden=false;
 announce('已載入 '+record.name+'（本機）；請按「分析這份文件」。沒有上傳或覆寫檔案。','ok');
 $('inspect').focus({preventScroll:true});
}
function fileDrag(event){return Array.from(event.dataTransfer?.types||[]).includes('Files');}
const dz=$('dropzone');
dz.addEventListener('click',()=>{$('file').click();});
function dragState(event,on){if(!fileDrag(event))return;event.preventDefault();dz.classList.toggle('drag-active',on);}
dz.addEventListener('dragenter',event=>dragState(event,true));
dz.addEventListener('dragover',event=>{dragState(event,true);if(event.dataTransfer)event.dataTransfer.dropEffect='copy';});
dz.addEventListener('dragleave',event=>{if(!dz.contains(event.relatedTarget))dragState(event,false);});
dz.addEventListener('drop',event=>{
 if(!fileDrag(event))return;
 event.preventDefault();event.stopPropagation();dz.classList.remove('drag-active');
 const files=event.dataTransfer?.files;
 if(!files||files.length!==1){discardStaged();announce('請一次拖入單一 Markdown 或純文字檔，不會變更目前原稿。','error');return;}
 stageFile(files[0]);
});
dz.addEventListener('keydown',event=>{
 if(event.key==='Enter'||event.key===' '){event.preventDefault();$('file').click();}
});
// Prevent file drops elsewhere from navigating away and losing the session.
document.addEventListener('dragover',event=>{if(fileDrag(event))event.preventDefault();});
document.addEventListener('drop',event=>{
 if(!fileDrag(event))return;
 event.preventDefault();dz.classList.remove('drag-active');
 announce('檔案沒有載入。請拖曳到指定區域，避免覆蓋正在編輯的內容。','warn');
});
$('applyFile').addEventListener('click',applyStaged);
$('cancelFile').addEventListener('click',()=>{discardStaged();announce('已取消檔案匯入，原稿與決策保持不變。','ok');$('source').focus();});
$('source').addEventListener('input',()=>{discardStaged();sourceChanged();});
$('sample').addEventListener('click',launchOriginalPractice);
$('clearPreferences').addEventListener('click',()=>{clearPreferences();invalidate();state(2);render();$('previewBtn').focus({preventScroll:true});announce('文件偏好已清除，逐處選擇保持不變；請重新產生預覽與摘要。','ok');});
$('clear').addEventListener('click',()=>{discardStaged();reset(true);announce('內容及所有工作階段已清除，原檔沒有變更。');});
$('inspect').addEventListener('click',()=>inspect());
function launchOriginalPractice(){
 if($('source').value.trim()||stagedFile||session||snapshot){
  $('guidedReplacePanel').hidden=false;
  announce('目前已有文字或未確認的匯入；請先確認是否切換為原創範例。','warn');
  $('confirmSample').focus({preventScroll:true});return;
 }
 discardStaged();useSample();inspect({guided:true});
}
$('quickStart').addEventListener('click',launchOriginalPractice);
$('confirmSample').addEventListener('click',()=>{$('guidedReplacePanel').hidden=true;discardStaged();useSample();inspect({guided:true});});
$('cancelSample').addEventListener('click',()=>{$('guidedReplacePanel').hidden=true;announce('已取消範例切換；原稿、決策與預覽維持不變。','ok');$('quickStart').focus({preventScroll:true});});
for(const id of ['feedbackStep','feedbackOutcome'])$(id).addEventListener('change',()=>{
 feedbackRevision++;$('feedbackCopy').disabled=true;
 if($('feedbackDraft').value)announce('回饋選項已改變，先前草稿已過期；請重新建立草稿後再複製。','warn');
});
$('feedbackBuild').addEventListener('click',makeFeedbackDraft);
$('feedbackCopy').addEventListener('click',copyFeedback);
$('nextOpen').addEventListener('click',nextOpen);
$('file').addEventListener('change',event=>{
 const file=event.target.files?.[0];event.target.value='';if(file)stageFile(file);
});
$('previewBtn').addEventListener('click',makePreview);
$('download').addEventListener('click',()=>{if(preview)download('TLS_R19_Reviewed_Preview.md',preview.preview_text,'text/markdown;charset=utf-8');});
$('copy').addEventListener('click',copy);
$('proofDownload').addEventListener('click',()=>{if(preview)download('TLS_R19_Local_Proof_No_Source.json',JSON.stringify(buildProof(),null,2)+'\n','application/json;charset=utf-8');});
$('backToReview').addEventListener('click',()=>{$('reviewSection').scrollIntoView({behavior:scrollBehavior,block:'start'});});
for(const b of document.querySelectorAll('[data-filter]'))b.addEventListener('click',()=>{showFilter=b.dataset.filter;
 for(const q of document.querySelectorAll('[data-filter]'))q.setAttribute('aria-pressed',String(q===b));render();});
window.addEventListener('pagehide',()=>{discardStaged();reset(true);});
$('source').value='';state(1);announce('準備就緒。可先試原創範例，或拖入有權使用的 Markdown；不需要註冊或 API Key。');
})();
