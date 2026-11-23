#!/usr/bin/env node
/* TLS R210: standalone feedback evidence checker; local consent gate only.
 * Does not change R208/R209, canonical registry, suite or releases.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const HERE=__dirname,TARGET=path.join(HERE,'TW_Feedback_Audit_R210_20261124.html');
const read=x=>fs.readFileSync(path.join(HERE,x),'utf8');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
function build(){
 const original=read('first_task_r208.js'),checker=read('feedback_audit_r210.js');
 const ui=String.raw`(function(){'use strict';
const E=window.TLSFeedbackEvidenceR210;
if(!E||E.SCHEMA!=='tls.r210.local-feedback-evidence.v1')throw Error('TLS_R210_MISSING_CORE');
const $=s=>document.querySelector(s),nodes={};let epoch=0,summary=null,busy=false;
const el=(name,content,cls)=>{const n=document.createElement(name);if(content!==undefined)n.textContent=content;if(cls)n.className=cls;return n;};
const note=msg=>{$('#status').textContent=msg;};
function invalidate(message){++epoch;summary=null;$('#results').hidden=true;$('#downloadSummary').disabled=true;
 $('#resultsList').replaceChildren();if(message)note(message);update();}
function update(){const n=$('#feedbackFiles').files.length;$('#selectedCount').textContent='已選擇 '+n+' 個本機檔案（上限 40）；檔名不會進入報告。';
 $('#analyzeFeedback').disabled=busy||!$('#authorized').checked||n===0||n>E.MAX_FILES;
 $('#downloadSummary').disabled=!summary||!$('#authorized').checked||busy;}
$('#feedbackFiles').addEventListener('change',()=>invalidate('檔案清單已變更；先前分析已失效。'));
$('#authorized').addEventListener('change',()=>invalidate($('#authorized').checked?
 '你已確認有權本機檢查選取的檔案；尚未讀取檔案。':'分析權限已撤銷；已清除先前結果。'));
$('#clearAll').addEventListener('click',()=>{busy=false;$('#feedbackFiles').value='';$('#authorized').checked=false;
 invalidate('已清除選取與統計。沒有上傳、儲存或背景追蹤。');});
function stat(label,value){const box=el('div',undefined,'metric');box.append(el('span',label,'metric-label'),el('strong',String(value),'metric-value'));return box;}
function setBar(root,label,value,total){const item=el('div',undefined,'bar-row');const text=el('div',label+' · '+value,'bar-label');
 const track=el('div',undefined,'bar-track');const fill=el('div',undefined,'bar-fill');
 fill.style.width=(total===0?0:Math.round(100*value/total))+'%';track.append(fill);item.append(text,track);root.append(item);}
function render(r){$('#results').hidden=false;const cards=$('#metrics');cards.replaceChildren(
 stat('選取檔案',r.input_files),stat('有效不同內容',r.accepted_distinct_payloads),
 stat('重複內容',r.duplicate_payloads),stat('拒絕檔案',r.rejected_files));
 const overview=$('#resultsList');overview.replaceChildren();const kinds=el('section',undefined,'summary-section');
 kinds.append(el('h3','自我回報的完成狀態（不是使用者人數）'));
 for(const [label,key] of [['自述完成','FINISHED'],['自述未完成','NOT_FINISHED'],['不確定','NOT_SURE']])
  setBar(kinds,label,r.outcomes[key],r.accepted_distinct_payloads);
 overview.append(kinds);
 const clarity=el('section',undefined,'summary-section');clarity.append(el('h3','操作理解程度（自選）'));
 for(const [label,key] of [['容易','EASY'],['有點困難','SOME_DIFFICULTY'],['不清楚','NOT_CLEAR'],['未評估','NOT_EVALUATED']])
  setBar(clarity,label,r.clarity[key],r.accepted_distinct_payloads);
 overview.append(clarity);
 const rejected=el('section',undefined,'summary-section');rejected.append(el('h3','被拒絕資料的原因統計'));
 const reasons=Object.entries(r.rejection_reason_counts);
 if(!reasons.length)rejected.append(el('p','本批次未出現被拒絕的檔案。','note'));
 else for(const [code,n] of reasons)rejected.append(el('p',code+'：'+n,'reason'));
 overview.append(rejected);
 $('#safety').textContent='這是不同回饋 JSON 內容數，不是獨立參與者、實際採用率或語言品質。'+
  '即使檔案有效，也可能由同一人複製或自行修改；請勿對外宣稱已驗證使用者人數。';
}
$('#analyzeFeedback').addEventListener('click',async()=>{
 if(busy||!$('#authorized').checked)return;const selected=Array.from($('#feedbackFiles').files);
 if(selected.length<1||selected.length>E.MAX_FILES){note('請選取 1–40 個自願回饋 JSON。');return;}
 const ticket=++epoch;busy=true;update();note('只在此瀏覽器內檢查選取檔案；不會上傳。');
 try{
  const contents=[];
  for(const file of selected){
   if(!/\.json$/iu.test(file.name)||file.size===0||file.size>E.MAX_FILE_BYTES)
    throw Error('TLS_R210_SELECTED_FILE_REJECTED');
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(ticket!==epoch||!$('#authorized').checked)return;
   contents.push(bytes);
  }
  const result=E.summarizeBatch(contents);if(ticket!==epoch||!$('#authorized').checked)return;
  summary=result;render(result);note('本機統計完成。必須另按「下載摘要」才會建立新檔案；不會上傳。');
 }catch(err){if(ticket===epoch){summary=null;$('#results').hidden=true;
  note('本機檢查已拒絕此批次。請確認檔案為 R208/R209 自願回饋 JSON，單檔不超過 8 KiB。');}}
 finally{if(ticket===epoch){busy=false;update();}}
});
$('#downloadSummary').addEventListener('click',()=>{
 if(!summary||!$('#authorized').checked)return;
 const json=JSON.stringify(summary,null,2)+'\n';const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
 const a=el('a');a.href=url;a.download='TLS_R210_Local_Feedback_Aggregate_UNVERIFIED.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1200);note('已要求本機下載摘要；不會傳至 GitHub、開發者或雲端。');
});
update();
})();`;
 for(const code of [original,checker,ui])if(code.toLowerCase().includes('</script'))throw Error('R210_SCRIPT_BREAKOUT');
 const style=String.raw`:root{color-scheme:light;--ink:#182e47;--muted:#526b82;--line:#d5e0ec;--accent:#1776b5;--bg:#f4f8fd;--paper:#fff}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 system-ui,-apple-system,'Noto Sans TC','Microsoft JhengHei',sans-serif}
main{max-width:1120px;margin:auto;padding:28px 20px 56px}.hero{padding:30px 35px;border-radius:19px;background:linear-gradient(120deg,#102f4e,#176f82);color:#fff}.eyebrow{font-weight:800;font-size:12px;letter-spacing:.12em;color:#b9ecff}.hero h1{font-size:clamp(25px,4vw,40px);margin:4px 0}.hero p{max-width:780px;margin:0;color:#e1f1fb}
.panel{background:var(--paper);padding:22px 24px;border:1px solid var(--line);border-radius:14px;margin-top:16px;box-shadow:0 3px 16px #1d47640a}h2{font-size:20px;margin:0 0 9px}h3{font-size:16px;margin:0 0 8px}p{margin:7px 0}.note{font-size:13px;color:var(--muted)}.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:17px}.step{border:1px solid #b8d4e4;border-radius:11px;background:#eaf6fc;padding:10px 12px;font-size:13px}.step b{display:block;font-size:19px;color:#176987}
input[type=file]{display:block;width:100%;padding:15px;border:2px dashed #a8c5db;border-radius:12px;background:#f7fbfe;margin:12px 0}label.agree{display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:10px;background:#f2f7fb;margin:14px 0;font-weight:600}input[type=checkbox]{margin-top:8px;width:18px;height:18px;flex:none}button{padding:9px 15px;font:inherit;font-weight:700;background:white;color:var(--ink);border:1px solid #bccfe1;border-radius:9px;cursor:pointer;max-width:100%}button.primary{background:#146ca5;color:white;border-color:#146ca5}button:disabled{cursor:not-allowed;opacity:.45}button:focus-visible,input:focus-visible{outline:3px solid #e89c39;outline-offset:2px}.actions{display:flex;gap:8px;flex-wrap:wrap}#status{display:block;background:#e9f2fa;border-radius:9px;color:#154d77;padding:11px 13px;margin-top:15px;min-height:47px}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:13px 0}.metric{background:#f0f6fb;padding:14px;border-radius:10px;border:1px solid #d7e6f0;display:flex;flex-direction:column}.metric-label{font-size:13px;color:#4e6680}.metric-value{font-size:28px;line-height:1.2;color:#154d78}.results-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px}.summary-section{background:#fbfdff;border:1px solid #dae4ed;padding:15px;border-radius:12px}.bar-row{margin:10px 0}.bar-label{font-size:13px;font-weight:700}.bar-track{height:10px;background:#e5edf5;border-radius:8px;overflow:hidden;margin-top:4px}.bar-fill{height:100%;background:#247caa;border-radius:8px}.reason{font-size:13px;padding:4px 0;overflow-wrap:anywhere}#safety{background:#fff9e9;border-left:4px solid #bb8b26;border-radius:7px;padding:12px;font-weight:650;margin:15px 0}footer{font-size:12px;color:var(--muted);padding:14px 3px}
@media(max-width:700px){main{padding:12px 10px}.hero{padding:22px 19px}.panel{padding:17px 15px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.results-grid{grid-template-columns:1fr}.steps{grid-template-columns:1fr}}@media print{.actions,input[type=file],.agree{display:none!important}.hero{background:white;color:#000;border:1px solid #bbb}.hero p{color:#444}}
`;
 return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; frame-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Taiwan-LLM-Sanitizer｜R210 本機自願回饋證據檢核器</title><style>${style}</style></head><body><main>
<header class="hero"><span class="eyebrow">TAIWAN-LLM-SANITIZER · R210 · LOCAL EVIDENCE REVIEW</span><h1>自願回饋，在本機安全核對</h1><p>匯入對方主動交付的 R208／R209 回饋 JSON，檢查欄位、剔除重複內容、整理拒絕原因。沒有 API、帳號、雲端或追蹤；資料不等於真人採用證據。</p></header>
<div class="steps" aria-label="三個操作階段"><div class="step"><b>01</b>選取有權處理的回饋 JSON</div><div class="step"><b>02</b>明確確認本機分析權限</div><div class="step"><b>03</b>檢查結果並主動下載摘要</div></div>
<section class="panel" aria-labelledby="inTitle"><h2 id="inTitle">01｜離線匯入</h2><p class="note">最多 40 份、每份 8 KiB，只接受 R208 原版自願回饋契約。選擇檔案不會開始分析，更不會上傳。</p><label for="feedbackFiles">R208／R209 自願回饋 JSON</label><input id="feedbackFiles" type="file" multiple accept=".json,application/json"><p id="selectedCount" class="note">尚未選擇檔案。</p>
<label for="authorized" class="agree"><input id="authorized" type="checkbox"><span>我確認有權在此裝置本機檢查選取的自願回饋資料；我理解這項勾選不能證明回饋者真實身分或授權來源。</span></label>
<div class="actions"><button id="analyzeFeedback" class="primary" type="button" disabled>在本機檢查與統計</button><button id="clearAll" type="button">清除選取與結果</button></div><output id="status" role="status" aria-live="polite">未開始；沒有讀取或傳送檔案。</output></section>
<section id="results" class="panel" hidden aria-labelledby="resultTitle"><h2 id="resultTitle">02｜可核對的本機結果</h2><p class="note">不同內容數不等於獨立參與者；拒絕的檔案不會列出檔名或原始資料。</p><div id="metrics" class="metrics"></div><div id="resultsList" class="results-grid"></div><p id="safety" role="note"></p><div class="actions"><button id="downloadSummary" type="button" class="primary" disabled>下載不含原稿的未驗證統計 JSON</button></div></section>
<section class="panel"><h2>資料與可信度界線</h2><p>本頁只處理使用者自行選取的本機回饋檔，沒有遙測、網路、localStorage，也不儲存來源文件。JSON 只含操作自評，不代表真人身分或語言品質獲認證。輸出不含原文、來源 SHA、候選 ID、檔名或可連結身分的欄位。請勿公開上傳未取得授權的工作文件。</p></section>
<footer>R210 研究預覽 · 不屬於正式 Suite 17.4.0／17.5 發行版 · 程式碼與資料皆在此瀏覽器本機處理。手動下載只是觸發瀏覽器保存，不保證磁碟寫入。</footer>
<script>${original}</script><script>${checker}</script><script>${ui}</script></main></body></html>`;
}
function main(argv){
 if(argv.length!==1||!['--build','--check'].includes(argv[0]))throw Error('R210_MODE_REQUIRED');
 const html=build();
 if(argv[0]==='--check'){
  if(!fs.existsSync(TARGET)||fs.readFileSync(TARGET,'utf8')!==html)throw Error('R210_HTML_OUT_OF_SYNC');
 }else if(fs.existsSync(TARGET)){
  if(fs.readFileSync(TARGET,'utf8')!==html)throw Error('R210_REFUSE_OVERWRITE_DIFFERENT_OUTPUT');
 }else fs.writeFileSync(TARGET,html,{encoding:'utf8',flag:'wx'});
 console.log('R210_OFFLINE_HTML_'+(argv[0]==='--check'?'PARITY_PASS':'BUILT'),sha(html),Buffer.byteLength(html));
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('R210_BUILD_BLOCKED',e.message);process.exitCode=2;}}
module.exports=Object.freeze({build,TARGET,sha});
