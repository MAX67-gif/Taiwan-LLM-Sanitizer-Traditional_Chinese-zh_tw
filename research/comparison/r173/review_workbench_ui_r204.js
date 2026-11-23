/* TLS R204 UI: all asynchronously completed work commits only at its captured revision. */
(function(){'use strict';
const W=window.TLSWordingAssistantR172,P=window.TLSReviewContinuityR203,M=window.TLSReviewWorkbenchR204;
if(!W||!P||!M)throw Error('TLS_R204_MODULES_MISSING');
const $=s=>document.querySelector(s),make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const clock=M.createClock(),history=M.createHistory();let active=null,snapshot=null,preview=null;
const report=text=>{$('#status').textContent=text;};
const reason=e=>String(e.message||'INVALID_OPERATION').replace(/[^A-Za-z0-9_: -]/g,'').slice(0,120);
function invalidatePreview(){preview=null;$('#result').value='';$('#resultPanel').hidden=true;$('#previewState').textContent='';$('#diffList').replaceChildren();$('#download').disabled=true;$('#copy').disabled=true;}
function clearReview(){active?.revoke();active=null;snapshot=null;history.clear();invalidatePreview();$('#candidatePanel').hidden=true;$('#candidates').replaceChildren();$('#stats').replaceChildren();updateButtons();}
function updateButtons(){const ready=!!active&&snapshot?.state==='READY',h=history.info();$('#undoReview').disabled=!ready||!h.undo;$('#redoReview').disabled=!ready||!h.redo;
 for(const id of ['previewBtn','exportReview','reportBtn'])$('#'+id).disabled=!ready;}
function download(name,text,mime){const url=URL.createObjectURL(new Blob([text],{type:mime||'text/plain;charset=utf-8'}));const a=make('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function render(){if(!snapshot||snapshot.state!=='READY')return;
 const prior=document.activeElement?.dataset?.focusKey;
 const list=$('#candidates');list.replaceChildren();const all=snapshot.candidates;
 const selected=all.filter(c=>c.choice==='CONFIRM').length,kept=all.filter(c=>c.choice==='KEEP_ORIGINAL').length;
 const blocked=all.filter(c=>['BLOCKED','LIMITED'].includes(c.resolution)).length,reviewable=all.length-blocked;
 $('#reviewProgress').textContent=(selected+kept)+' / '+reviewable+' 已處理｜採用 '+selected+'｜保留 '+kept+'｜受限 '+blocked;
 $('#stats').replaceChildren(...[snapshot.coverage.protected_segments+' 個保護片段',snapshot.coverage.omitted_candidate_count+' 個超出掃描上限'].map(v=>make('span',v,'stat')));
 const rows=M.filterCandidates(all,$('#reviewFilter').value,$('#reviewSearch').value);
 $('#visibleCount').textContent='顯示 '+rows.length+' / '+all.length+' 個位置；篩選不會改變決定。';
 if(!rows.length)list.append(make('p',all.length?'目前篩選沒有項目。':'目前沒有建議；這不表示全文已通過語意審查。','note'));
 for(const c of rows){const card=make('article',undefined,'candidate');card.dataset.candidateId=c.id;
  const line=$('#source').value.slice(0,c.start).split(/\r\n|\r|\n/).length;
  card.append(make('h3','「'+c.original_text+'」 · 第 '+line+' 行'),make('p','位置 '+(c.start+1)+'–'+c.end+'｜'+c.resolution,'meta'));
  const locked=['BLOCKED','LIMITED'].includes(c.resolution);
  if(locked)card.append(make('p','受保護／受限位置不提供採用：'+c.reason_codes.join('、'),'why'));
  else{
   const actions=make('div',undefined,'actions');
   const button=(label,action,extra,key)=>{const b=make('button',label);b.type='button';b.dataset.focusKey=c.id+':'+key;
    if(action==='CONFIRM')b.setAttribute('aria-pressed',String(c.choice==='CONFIRM'&&c.selected_option_id===extra.option_id));
    b.addEventListener('click',()=>choose(c.id,action,extra));actions.append(b);};
   for(const o of c.options)button('採用「'+o.replacement+'」（'+o.context_label+'）','CONFIRM',{option_id:o.id},o.id);
   button('保留這一處原文','KEEP_ORIGINAL',{},'keep');button('取消這一處選擇','RESET',{},'reset');card.append(actions);
   const option=c.options.find(o=>o.id===c.selected_option_id);
   card.append(make('p',c.choice==='CONFIRM'?'已採用：'+(option?.replacement||''):c.choice==='KEEP_ORIGINAL'?'保留原文':'尚未選擇','sel'));
  }list.append(card);
 }
 updateButtons();if(prior){const b=Array.from(list.querySelectorAll('[data-focus-key]')).find(x=>x.dataset.focusKey===prior);b?.focus({preventScroll:true});}
}
function choose(id,action,extra={}){if(!active||!snapshot)return;clock.bump();try{
 const next=active.choose({snapshot_id:snapshot.snapshot_id,candidate_id:id,action,...extra});history.record(P.capture(next));snapshot=next;invalidatePreview();render();report('已記錄此處決定；可復原／重做。需重新產生預覽才可匯出新稿。');
}catch(e){report('選擇遭拒絕：'+reason(e));}}
async function swapPlan(plan,ticket){let fresh=null;try{
 fresh=W.createWordingSession({source:$('#source').value});const result=await M.restore(fresh,plan);
 if(!clock.valid(ticket))return null;
 const old=active;active=fresh;fresh=null;old?.revoke();snapshot=result.snapshot;invalidatePreview();return result;
}finally{fresh?.revoke();}}
async function travel(direction){if(!active||!snapshot)return;const ticket=clock.bump();invalidatePreview();try{
 const plan=history.peek(direction),result=await swapPlan(plan,ticket);if(!result)return;
 history.move(direction);render();report(direction<0?'已復原上一個決定；請重新預覽。':'已重做決定；請重新預覽。');
}catch(e){if(clock.valid(ticket))report('歷史操作遭拒絕：'+reason(e));}}
$('#undoReview').addEventListener('click',()=>travel(-1));$('#redoReview').addEventListener('click',()=>travel(1));
$('#reviewFilter').addEventListener('change',render);$('#reviewSearch').addEventListener('input',render);
$('#source').addEventListener('input',()=>{clock.bump();clearReview();report('原文已改動；舊審稿、歷史與預覽全部失效。');});
$('#file').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;
 const ticket=clock.bump();invalidatePreview();if(!/\.(md|markdown|txt)$/iu.test(file.name)||file.size>W.MAX_BYTES){report('檔案類型不支援或超過 64 KiB；既有原文不變。');return;}
 try{const text=M.decodeUTF8(await file.arrayBuffer(),W.MAX_BYTES);if(!clock.valid(ticket))return;clearReview();$('#source').value=text;report('已以嚴格 UTF-8 載入本機文字，尚未分析。');}
 catch(e){if(clock.valid(ticket))report('讀檔遭拒絕，既有原文不變：'+reason(e));}});
$('#inspect').addEventListener('click',async()=>{const ticket=clock.bump();clearReview();let fresh=null;
 try{fresh=W.createWordingSession({source:$('#source').value});const next=await fresh.inspect();if(!clock.valid(ticket))return;
  if(next.state!=='READY'){report('來源不支援安全 Markdown 審稿；JSON／Prompt 請使用 R16。');return;}
  active=fresh;fresh=null;snapshot=next;history.record(P.capture(next));$('#candidatePanel').hidden=false;render();report('分析完成，所有位置預設不變；請逐項選詞。');
 }catch(e){if(clock.valid(ticket))report('分析遭拒絕：'+reason(e));}finally{fresh?.revoke();}});
$('#clear').addEventListener('click',()=>{clock.bump();clearReview();$('#source').value='';$('#file').value='';$('#importReview').value='';$('#reviewSearch').value='';$('#reviewFilter').value='all';report('已清除來源、審稿與記憶體歷史，待處理結果已取消。');});
$('#demo').addEventListener('click',()=>{clock.bump();clearReview();$('#source').value='# 原創操作範例\n\n介面 menu 請選擇適合的詞；午餐 menu 可能是菜單。\n請把軟件與數據庫用語逐處確認；點擊率和點擊聲不要當作 UI 操作。\n\n程式 `const menu = "click"` 與 {{USER_PATH}} 保持原樣。\n';report('已載入原創範例；點選分析後可使用復原、搜尋與差異檢視。');});
$('#importReview').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;
 if(!active||!snapshot){report('請先分析同一份原文。');return;}const ticket=clock.bump();invalidatePreview();
 if(!/\.json$/iu.test(file.name)||file.size===0||file.size>M.MAX_REVIEW_BYTES){report('審稿紀錄必須是 64 KiB 以內的 JSON。');return;}
 try{const bytes=await file.arrayBuffer();if(!clock.valid(ticket))return;const plan=M.parseReview(bytes);
  const result=await swapPlan(plan,ticket);if(!result)return;history.record(P.capture(snapshot));render();
  report('已載入 '+result.restored_count+' 筆人工決定；可復原，未自動產生或套用預覽。');
 }catch(e){if(clock.valid(ticket))report('匯入遭拒絕，既有決定維持：'+reason(e));}});
$('#exportReview').addEventListener('click',()=>{if(!active||!snapshot)return;try{
 const plan=M.freezePlan(P.capture(snapshot));download('TLS_R204_Review_Choices_No_Text.json',JSON.stringify(plan,null,2)+'\n','application/json');report('已匯出同源審稿紀錄。不含原文，但文件雜湊與選項 ID 仍須妥善保管。');
}catch(e){report('匯出遭拒絕：'+reason(e));}});
$('#previewBtn').addEventListener('click',async()=>{if(!active||!snapshot)return;const ticket=clock.bump(),at=snapshot.snapshot_id,session=active;invalidatePreview();report('正在驗證已選項目與受保護片段…');
 try{const rows=M.diffRows($('#source').value,snapshot);const output=await session.preview({snapshot_id:at});if(!clock.valid(ticket)||active!==session||snapshot?.snapshot_id!==at)return;
  let reconstructed='',cursor=0;for(const r of rows){reconstructed+=$('#source').value.slice(cursor,r.start)+r.after;cursor=r.end;}reconstructed+=$('#source').value.slice(cursor);
  if(output.preview_text!==reconstructed)throw Error('TLS_R204_DIFF_CORE_MISMATCH');
  preview=output;$('#result').value=output.preview_text;$('#resultPanel').hidden=false;$('#download').disabled=false;$('#copy').disabled=false;
  $('#previewState').textContent=rows.length+' 個人工採用位置｜SAFE_PREVIEW_NOT_APPLIED｜原文不變';
  const list=$('#diffList');list.replaceChildren();if(!rows.length)list.append(make('p','未採用替換，預覽與原文相同。','note'));
  for(const r of rows){const item=make('div',undefined,'diff-row');item.append(make('span','第 '+r.line+' 行','meta'),make('del',r.before),make('span',' → '),make('ins',r.after),make('span',r.context,'meta'));list.append(item);}
  report('安全預覽完成；請檢查逐項差異後自行複製或下載。');
 }catch(e){if(clock.valid(ticket)){invalidatePreview();report('預覽遭拒絕：'+reason(e));}}});
function cancel(){clock.bump();invalidatePreview();report('已取消待處理操作與預覽；現有人工決定保留。');}
$('#cancelPending').addEventListener('click',cancel);$('#discard').addEventListener('click',cancel);
$('#download').addEventListener('click',()=>{if(preview)download('TLS_R204_Reviewed_Preview.md',preview.preview_text);});
$('#copy').addEventListener('click',async()=>{if(!preview)return;try{if(!navigator.clipboard?.writeText)throw Error('NO_CLIPBOARD');await navigator.clipboard.writeText(preview.preview_text);report('已複製當次預覽。');}catch(_){$('#result').focus();$('#result').select();report('已選取預覽，請使用 Ctrl+C。');}});
$('#reportBtn').addEventListener('click',()=>{if(active)download('TLS_R204_Metadata_Report.json',JSON.stringify(active.report(),null,2)+'\n','application/json');});
document.addEventListener('keydown',e=>{if(!e.altKey||e.ctrlKey||e.metaKey||e.key.toLowerCase()!=='z'||['TEXTAREA','INPUT','SELECT'].includes(document.activeElement?.tagName))return;
 const button=$(e.shiftKey?'#redoReview':'#undoReview');if(!button.disabled){e.preventDefault();button.click();}});
invalidatePreview();updateButtons();
})();
