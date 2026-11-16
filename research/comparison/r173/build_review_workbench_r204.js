#!/usr/bin/env node
/* TLS R204 deterministic derivative: all R203/R172 files stay byte-for-byte unchanged. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Base=require('./build_review_continuity_r203.js');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const TARGET=path.join(__dirname,'TW_Review_Workbench_R204_20261116.html');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function replaceOne(text,old,value){if(text.split(old).length!==2)throw Error('R204_SOURCE_ANCHOR_DRIFT');return text.replace(old,()=>value);}
function build(){
 let html=Base.build();const oldUI=read('review_continuity_ui_r203.js');
 const support=read('review_workbench_r204.js'),ui=read('review_workbench_ui_r204.js');
 for(const s of [support,ui])if(s.toLowerCase().includes('</script'))throw Error('R204_UNSAFE_SCRIPT');
 html=replaceOne(html,'<script>'+oldUI+'</script>','<script>'+support+'</script>\n<script>'+ui+'</script>');
 html=replaceOne(html,'<title>Taiwan-LLM-Sanitizer｜臺灣用語審稿接續 R203 Offline Preview</title>','<title>Taiwan-LLM-Sanitizer｜臺灣用語審稿工作台 R204 Offline Preview</title>');
 html=html.replace('Taiwan-LLM-Sanitizer · R203 Offline Preview','Taiwan-LLM-Sanitizer · R204 Offline Preview');
 html=html.replace('臺灣用語審稿，離線接續不中斷','審稿可復原，差異看得清楚');
 html=html.replace('R203 離線審閱接續','R204 離線審閱接續');
 html=replaceOne(html,'<div id="candidates"></div>',[
  '<div class="review-toolbar" role="group" aria-label="審稿控制">',
  '<div class="actions"><button id="undoReview" type="button" disabled>復原決定</button><button id="redoReview" type="button" disabled>重做決定</button><button id="cancelPending" type="button">取消待處理操作</button></div>',
  '<div class="review-filter"><label for="reviewSearch">搜尋原詞／候選詞<input id="reviewSearch" type="search" maxlength="200" placeholder="例如 menu、軟體"></label>',
  '<label for="reviewFilter">顯示狀態<select id="reviewFilter"><option value="all">全部</option><option value="unselected">尚未選擇</option><option value="confirmed">已採用</option><option value="kept">保留原文</option><option value="blocked">受限／禁止</option></select></label></div>',
  '<p id="reviewProgress" role="status" aria-live="polite"></p><p id="visibleCount" class="note"></p>',
  '<p class="note">最多保留 50 個審稿狀態。來源改動即清除歷史；Alt+Z 復原、Alt+Shift+Z 重做（文字輸入時不攔截）。</p></div>',
  '<div id="candidates"></div>'
 ].join('\n'));
 html=replaceOne(html,'<label for="result">新稿（可以自行選取複製）</label>','<h3>逐項差異（只有已採用位置）</h3><div id="diffList" aria-live="polite"></div><label for="result">新稿（可以自行選取複製）</label>');
 html=html.replace('不含原文或替換文字</strong>。原始文件','不含原文或替換文字</strong>，但雜湊與選項 ID 仍可能透露文件特徵，請勿公開分享。原始文件');
 const css=`\n#status,#previewState,.meta,.why{overflow-wrap:anywhere}\n.review-toolbar{background:#f5f8fb;border:1px solid var(--line);border-radius:12px;padding:14px;margin:12px 0}.review-filter{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px;margin-top:10px}.review-filter label{display:grid;gap:5px;min-width:0;font-size:14px}.review-filter input,.review-filter select{min-width:0;width:100%;padding:9px;border:1px solid var(--line);border-radius:7px;font:inherit;background:white;color:var(--ink)}#reviewProgress{font-weight:700}.diff-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:10px;border-bottom:1px solid var(--line)}.diff-row del{background:#fff0ed;color:#973c31}.diff-row ins{background:#e8f6ed;color:#1b6840;text-decoration:none;font-weight:700}.diff-row del,.diff-row ins{padding:2px 7px;overflow-wrap:anywhere}#diffList{margin:10px 0 22px}input[type=file]{width:100%;min-width:0}button{overflow-wrap:anywhere}@media(max-width:600px){.review-filter{grid-template-columns:1fr}.review-toolbar{padding:10px}.diff-row{gap:7px}}\n`;
 html=replaceOne(html,'</style>',css+'</style>');
 if(!html.includes("connect-src 'none'")||!html.includes("default-src 'none'")||html.includes('__TLS_R204_'))throw Error('R204_CSP_OR_BUILD');
 return html;
}
function main(argv){if(argv.length!==1||!['--build','--check'].includes(argv[0]))throw Error('R204_MODE_REQUIRED');const html=build();
 if(argv[0]==='--check'){if(!fs.existsSync(TARGET)||fs.readFileSync(TARGET,'utf8')!==html)throw Error('R204_HTML_OUT_OF_SYNC');}
 else if(fs.existsSync(TARGET)){if(fs.readFileSync(TARGET,'utf8')!==html)throw Error('R204_REFUSE_OVERWRITE_DIFFERENT_OUTPUT');}
 else fs.writeFileSync(TARGET,html,{encoding:'utf8',flag:'wx'});
 console.log('R204_OFFLINE_HTML_'+(argv[0]==='--check'?'PARITY_PASS':'BUILT'),hash(html),Buffer.byteLength(html));
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('R204_BUILD_BLOCKED',e.message);process.exitCode=2;}}
module.exports=Object.freeze({build,hash,TARGET});
