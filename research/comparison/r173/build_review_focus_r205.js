#!/usr/bin/env node
/* R205 separate deterministic research-only HTML over byte-unchanged R204.
 * No SDK, CDN, egress, localStorage or service worker. Not a Suite release.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const R204=require('./build_review_workbench_r204.js');
const read=s=>fs.readFileSync(path.join(__dirname,s),'utf8');
const TARGET=path.join(__dirname,'TW_Review_Focus_R205_20261124.html');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
function one(input,old,replace){
 if(input.split(old).length!==2)throw Error('R205_SOURCE_ANCHOR_DRIFT');
 return input.replace(old,()=>replace);
}
function build(){
 let html=R204.build();
 const oldUI=read('review_workbench_ui_r204.js');
 const helper=read('review_focus_r205.js'),ui=read('review_focus_ui_r205.js');
 for(const source of [helper,ui])if(source.toLowerCase().includes('</script'))
   throw Error('R205_SCRIPT_BREAKOUT');
 html=one(html,'<script>'+oldUI+'</script>','<script>'+helper+'</script>\n<script>'+ui+'</script>');
 html=one(html,'<title>Taiwan-LLM-Sanitizer｜臺灣用語審稿工作台 R204 Offline Preview</title>',
   '<title>Taiwan-LLM-Sanitizer｜專注逐筆審稿 R205 Offline Preview</title>');
 html=one(html,'Taiwan-LLM-Sanitizer · R204 Offline Preview',
   'Taiwan-LLM-Sanitizer · R205 Focus Preview · 非正式發行');
 html=one(html,'審稿可復原，差異看得清楚','專注下一筆，保留每一處決定');
 html=one(html,'<div id="candidates"></div>',[
   '<section id="focusPanel" class="focus-panel" aria-label="專注審稿模式">',
   '<div class="focus-actions"><button id="focusToggle" type="button" aria-pressed="false">切換單筆專注模式</button>',
   '<button id="focusPrev" type="button" disabled>上一筆</button>',
   '<button id="focusNext" type="button" disabled>下一筆</button>',
   '<span id="focusPosition" role="status" aria-live="polite">一般清單模式</span></div>',
   '<p id="focusSafety" class="note" aria-live="polite">尚未分析原文，不會自動改稿。</p>',
   '<p class="note">Alt+J 下一筆、Alt+K 上一筆（輸入欄位內不攔截）。專注模式只縮減畫面顯示；保留原本的復原、差異、匯入和安全預覽。</p>',
   '</section><div id="candidates"></div>'
 ].join('\n'));
 const css=[
 '.focus-panel{border:1px solid var(--line);background:#f4f8fc;border-radius:12px;padding:12px 15px;margin:12px 0}',
 '.focus-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
 '#focusToggle[aria-pressed="true"]{background:#163b55;color:white;border-color:#163b55}',
 '#focusPosition{font-size:14px;font-weight:700}#focusSafety{padding:6px 0;font-weight:650}',
 '#focusPanel button:focus-visible{outline:3px solid #b36b10;outline-offset:2px}',
 '@media(max-width:600px){.focus-panel{padding:10px}.focus-actions button{flex:1 1 105px}}'
 ].join('\n');
 html=one(html,'</style>',css+'</style>');
 if(!html.includes("connect-src 'none'")||!html.includes("default-src 'none'")||
    html.includes('__TLS_R205_')||!html.includes('id="focusPanel"'))
   throw Error('R205_CSP_OR_LAYOUT_GUARD');
 return html;
}
function main(argv){
 if(argv.length!==1||!['--build','--check'].includes(argv[0]))throw Error('R205_MODE_REQUIRED');
 const html=build();
 if(argv[0]==='--check'){
  if(!fs.existsSync(TARGET)||fs.readFileSync(TARGET,'utf8')!==html)
    throw Error('R205_HTML_OUT_OF_SYNC');
 }else if(fs.existsSync(TARGET)){
  if(fs.readFileSync(TARGET,'utf8')!==html)throw Error('R205_REFUSE_OVERWRITE_DIFFERENT_OUTPUT');
 }else fs.writeFileSync(TARGET,html,{encoding:'utf8',flag:'wx'});
 console.log('R205_OFFLINE_HTML_'+(argv[0]==='--check'?'PARITY_PASS':'BUILT'),
  sha(html),Buffer.byteLength(html));
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(err){
  console.error('R205_BUILD_BLOCKED',err.message);process.exitCode=2;
 }
}
module.exports=Object.freeze({build,sha,TARGET});
