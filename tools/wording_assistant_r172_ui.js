(function(){'use strict';
const $=s=>document.querySelector(s),make=(t,txt,cls)=>{const el=document.createElement(t);if(txt!==undefined)el.textContent=txt;if(cls)el.className=cls;return el;};
const API=window.TLSWordingAssistantR172;
let active=null,snapshot=null,preview=null,epoch=0,canExport=false;
const report=status=>$('#status').textContent=status;
function reset(){++epoch;active?.revoke();active=null;snapshot=null;preview=null;canExport=false;$('#candidatePanel').hidden=true;$('#resultPanel').hidden=true;$('#candidates').replaceChildren();$('#stats').replaceChildren();$('#result').value='';}
function invalidatePreview(){preview=null;canExport=false;$('#resultPanel').hidden=true;$('#result').value='';$('#previewState').textContent='';}
function save(name,text,type){const object=URL.createObjectURL(new Blob([text],{type:type||'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=object;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(object),800);}
function render(){if(!snapshot||snapshot.state!=='READY')return;
 const list=$('#candidates');list.replaceChildren();const stats=$('#stats');stats.replaceChildren();
 for(const text of [snapshot.candidates.length+' 個可檢視項目',snapshot.coverage.protected_segments+' 個受保護片段',snapshot.coverage.omitted_candidate_count+' 個超出上限',snapshot.coverage.limited_segments+' 個受限段落'])stats.appendChild(make('span',text,'stat'));
 if(!snapshot.candidates.length)list.appendChild(make('p','目前沒有可建議的詞。這不表示全文已正確或已完成語意審核。','note'));
 for(const item of snapshot.candidates){const card=make('article',undefined,'candidate');card.dataset.candidateId=item.id;
   const heading=make('h3','「'+item.original_text+'」 · 位置 '+(item.start+1));card.appendChild(heading);
   card.appendChild(make('div','來源：'+item.source_entry_ids.join('、')+'｜'+item.resolution,'meta'));
   const actions=make('div',undefined,'actions');
   if(item.resolution==='BLOCKED'||item.resolution==='LIMITED')card.appendChild(make('p','此處不提供採用操作：'+item.reason_codes.join('、'),'why'));
   else{
     for(const opt of item.options){const button=make('button','採用「'+opt.replacement+'」（'+opt.context_label+'）'+(opt.evidence_status==='CANDIDATE_ONLY'?' · 待審':''));
       button.type='button';button.setAttribute('aria-pressed',String(item.selected_option_id===opt.id&&item.choice==='CONFIRM'));
       button.addEventListener('click',()=>select(item.id,'CONFIRM',{option_id:opt.id}));actions.appendChild(button);
     }
     const keep=make('button','保留這一處原文');keep.type='button';keep.addEventListener('click',()=>select(item.id,'KEEP_ORIGINAL'));actions.appendChild(keep);
     const undo=make('button','取消這一處選擇');undo.type='button';undo.addEventListener('click',()=>select(item.id,'RESET'));actions.appendChild(undo);
     card.appendChild(actions);
     card.appendChild(make('div',item.choice==='CONFIRM'?'本處已確認替換':item.choice==='KEEP_ORIGINAL'?'本處明確保留原文':'尚未選擇，保留原文','sel'));
   }
   list.appendChild(card);
 }
}
function select(id,action,more={}){try{snapshot=active.choose({snapshot_id:snapshot.snapshot_id,candidate_id:id,action,...more});invalidatePreview();render();report('已記錄單一位置的選擇。其他位置與原始內容不變；請產生新預覽才可匯出。');}catch(e){report('選擇無效：'+String(e.message).slice(0,85));}}
$('#source').addEventListener('input',()=>{reset();report('原文已更新；舊建議與預覽已全部取消。');});
$('#file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;reset();if(!/\.(md|markdown|txt)$/iu.test(file.name)){report('UNSUPPORTED_CONTENT：此版本只接受 .md／.markdown／.txt 檔。JSON 請改用 R16。');return;}
 if(file.size>API.MAX_BYTES){report('INPUT_LIMIT：來源檔超過 64 KiB，未載入或截斷。');return;}
 try{const text=await file.text();$('#source').value=text;report('已於本機載入文字；尚未分析。');}catch(_){report('READ_FILE_FAILED：檔案無法讀取。');}finally{e.target.value='';}});
$('#demo').addEventListener('click',()=>{reset();$('#source').value='# 原創安全範例\n\n請 click 主選單，修改軟件中的數據庫設定。\n餐廳的 menu 請看情境；點擊率與點擊聲不等於滑鼠點選。\n\n<!-- click 和數據庫在註解中：保護原樣 -->\n\n程式：`const click = "menu"`；網址 https://example.test/menu\n請保留 {{USER_PATH}}。\n\n```js\nconst menu = "点击";\n```\n';report('已載入原創示例。請點選「尋找臺灣用語建議」。');});
$('#clear').addEventListener('click',()=>{reset();$('#source').value='';$('#file').value='';report('全部來源、選擇與預覽已清除，記憶體 session 已撤銷。');});
$('#inspect').addEventListener('click',async()=>{reset();const token=epoch;try{active=API.createWordingSession({source:$('#source').value});const next=await active.inspect();if(token!==epoch||!active)return;
 snapshot=next;if(snapshot.state!=='READY'){report('UNSUPPORTED_CONTENT：此段可能包含 JSON 鍵值或不安全語法，請使用 R16 專門工具／以 code fence 保護。');return;}
 $('#candidatePanel').hidden=false;render();report('分析完成：共 '+snapshot.candidates.length+' 個位置。沒有自動修改；受保護片段保持原文。');
 }catch(e){if(token!==epoch)return;report('分析遭拒絕：'+String(e.message).slice(0,100));}});
$('#previewBtn').addEventListener('click',async()=>{if(!active||!snapshot)return;const token=epoch,at=snapshot.snapshot_id;invalidatePreview();$('#previewState').textContent='正在依來源雜湊重新驗證…';try{const outcome=await active.preview({snapshot_id:at});if(token!==epoch||!snapshot||snapshot.snapshot_id!==at)return;
 preview=outcome;canExport=true;$('#resultPanel').hidden=false;$('#result').value=outcome.preview_text;
 $('#previewState').textContent='SAFE_PREVIEW_NOT_APPLIED | '+outcome.change_count+' 個段落有更動 | 原始內容未被覆寫';
 }catch(e){if(token!==epoch)return;invalidatePreview();report('預覽遭拒絕：'+String(e.message).slice(0,100));}});
$('#reportBtn').addEventListener('click',()=>{if(!active)return;save('TLS_Wording_Metadata_R172.json',JSON.stringify(active.report(),null,2)+'\n','application/json');});
$('#copy').addEventListener('click',async()=>{if(!canExport||!preview)return;try{if(!navigator.clipboard?.writeText)throw Error('CLIPBOARD_NOT_AVAILABLE');await navigator.clipboard.writeText(preview.preview_text);$('#previewState').textContent='已複製最新版預覽到剪貼簿（此操作由使用者觸發）。';}
 catch(_){$('#result').focus();$('#result').select();$('#previewState').textContent='瀏覽器不允許直接複製；已選取預覽全文，請使用 Ctrl+C。';}});
$('#download').addEventListener('click',()=>{if(!canExport||!preview)return;save('TLS_Wording_Reviewed_Preview.md',preview.preview_text);});
$('#discard').addEventListener('click',()=>{invalidatePreview();report('預覽已取消；原始內容與已選決定未變。');});
})();
