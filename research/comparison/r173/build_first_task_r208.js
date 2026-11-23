#!/usr/bin/env node
/* TLS R208: additive, deterministic single HTML over R207; previous source
 * files and official 17.4 release bytes must remain unchanged.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Base=require('./build_review_focus_r207.js');
const HERE=__dirname;
const TARGET=path.join(HERE,'TW_First_Task_Guided_R208_20261124.html');
const read=name=>fs.readFileSync(path.join(HERE,name),'utf8');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function one(html,needle,replacement){
 if(html.split(needle).length!==2)throw Error('R208_SOURCE_ANCHOR_CHANGED:'+needle.slice(0,36));
 return html.replace(needle,()=>replacement);
}
function build(){
 let html=Base.build();
 const core=read('first_task_r208.js'),ui=read('first_task_ui_r208.js');
 for(const value of [core,ui])if(value.toLowerCase().includes('</script'))
   throw Error('R208_UNSAFE_EMBEDDED_SCRIPT');
 const oldUI=read('review_focus_ui_r207.js');
 html=one(html,'<script>'+oldUI+'</script>',
  '<script>'+oldUI+'</script>\n<script>'+core+'</script>\n<script>'+ui+'</script>');
 html=one(html,'<title>Taiwan-LLM-Sanitizer｜專注逐筆審稿 R207 Offline Preview</title>',
  '<title>Taiwan-LLM-Sanitizer｜首次任務引導 R208 Offline Preview</title>');
 html=one(html,'Taiwan-LLM-Sanitizer · R207 Focus Preview · 非正式發行',
  'Taiwan-LLM-Sanitizer · R208 First Task Preview · 非正式發行');
 html=one(html,'專注下一筆，保留每一處決定','第一次就能完成一份臺灣用語審稿');
 const block=[
 '<section id="firstTaskR208" class="r208-guide" aria-label="第一次完成審稿">',
 ' <div class="r208-head"><div><span class="r208-kicker">離線首次任務 · 無帳號、無遙測</span><h2>五個操作，完成第一份審稿</h2>',
 ' <p class="note">可使用原創示範文件或自己的 Markdown。只會引導與分析，不自動替你選詞。進度只代表本次畫面操作。</p></div>',
 ' <div class="actions"><button id="r208Start" class="primary" type="button">載入示範並開始</button><button id="r208Next" type="button">下一步</button></div></div>',
 ' <progress id="r208Progress" max="5" value="0" aria-label="本機流程進度"></progress>',
 ' <p id="r208Stage" role="status" aria-live="polite">尚未開始；未連線或傳送任何原文。</p>',
 ' <ol id="r208Steps" class="r208-steps"></ol>',
 ' <p id="r208Coverage" class="note">已列項目不代表完整語意品質認證。</p>',
 ' <details class="r208-feedback"><summary>自願回饋：只下載本機操作摘要，不會上傳</summary>',
 ' <p class="note">只有你主動選取並同意後才會下載 JSON。沒有原文、文件雜湊、檔名、身分或選詞 ID；可能包含你選的體驗評語。這不是已核實的真人採用證據。</p>',
 ' <div class="r208-choices"><label for="r208FeedbackClarity">操作理解程度<select id="r208FeedbackClarity"><option value="">請自行選擇</option><option value="EASY">容易理解</option><option value="SOME_DIFFICULTY">有些不清楚</option><option value="NOT_CLEAR">不容易理解</option><option value="NOT_EVALUATED">未評價</option></select></label>',
 ' <label for="r208FeedbackOutcome">自評完成情況<select id="r208FeedbackOutcome"><option value="">請自行選擇</option><option value="FINISHED">已自行檢查並觸發下載</option><option value="NOT_FINISHED">未完成</option><option value="NOT_SURE">不確定</option></select></label></div>',
 ' <label class="r208-consent"><input id="r208FeedbackConsent" type="checkbox"> 我同意由自己在本機下載此份流程回饋；此操作不授權分享或上傳。</label>',
 ' <div class="actions"><button type="button" id="r208FeedbackDownload" disabled>下載不含原文的本機回饋 JSON</button></div>',
 ' <p id="r208FeedbackStatus" role="status" aria-live="polite"></p></details>',
 '</section>'
 ].join('\n');
 html=one(html,'</header>','</header>\n'+block);
 const css=[
 '.r208-guide{border:1px solid #b7cde0;background:#fff;border-radius:16px;padding:18px;margin:18px 0}',
 '.r208-guide h2{font-size:21px;margin:4px 0}.r208-head{display:flex;align-items:start;justify-content:space-between;gap:14px;flex-wrap:wrap}',
 '.r208-kicker{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#286591;font-weight:750}',
 '#r208Progress{display:block;max-width:100%;width:100%;height:16px;margin:12px 0}',
 '#r208Stage{margin:10px 0;color:#254f71;font-weight:700;overflow-wrap:anywhere}',
 '.r208-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;padding:0;list-style:none}',
 '.r208-steps li{padding:9px;border-radius:9px;border:1px solid #d2deeb;font-size:12px;overflow-wrap:anywhere}',
 '.r208-steps .r208-complete{background:#e9f7ec;border-color:#9bbfa7}',
 '.r208-steps .r208-current{background:#e6effc;border-color:#699ad2;font-weight:750}',
 '.r208-feedback{padding:13px;margin-top:12px;border-top:1px solid #d2deeb}',
 '.r208-feedback summary{font-weight:700;cursor:pointer}.r208-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}',
 '.r208-choices label{display:grid;gap:6px}.r208-choices select{min-width:0;width:100%;padding:9px;border:1px solid #b4c6da;border-radius:8px;background:white;color:#192b40}',
 '.r208-consent{display:flex;gap:9px;align-items:baseline}#r208FeedbackStatus{margin-top:8px;font-size:13px;color:#32546d}',
 '@media(max-width:760px){.r208-steps{grid-template-columns:repeat(2,minmax(0,1fr))}.r208-choices{grid-template-columns:1fr}}',
 '@media(max-width:380px){.r208-steps{grid-template-columns:1fr}.r208-guide{padding:12px}}'
 ].join('\n');
 html=one(html,'</style>',css+'</style>');
 if(!html.includes('TLSFirstTaskR208')||!html.includes('id="firstTaskR208"')||
    html.includes('__TLS_R208_')||
    !html.includes("connect-src 'none'")||!html.includes("default-src 'none'"))
   throw Error('R208_CSP_OR_BUILD_GUARD');
 return html;
}
function main(args){
 if(args.length!==1||!['--build','--check'].includes(args[0]))throw Error('R208_MODE_REQUIRED');
 const html=build();
 if(args[0]==='--check'){
  if(!fs.existsSync(TARGET)||fs.readFileSync(TARGET,'utf8')!==html)
   throw Error('R208_HTML_PARITY_MISMATCH');
 }else if(fs.existsSync(TARGET)){
  if(fs.readFileSync(TARGET,'utf8')!==html)throw Error('R208_REFUSE_OVERWRITE_DIFFERENT_OUTPUT');
 }else fs.writeFileSync(TARGET,html,{encoding:'utf8',flag:'wx'});
 console.log('R208_HTML_'+(args[0]==='--check'?'PARITY_PASS':'BUILT'),sha(html),Buffer.byteLength(html));
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('R208_BUILD_BLOCKED',e.message);process.exitCode=2;}}
module.exports=Object.freeze({build,sha,TARGET});
