#!/usr/bin/env node
/* TLS R203 standalone offline-only review resume studio builder. The 17.2
 * checked-in source files and official 17.4 Release are never modified.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../..');
const HERE=__dirname;
const TARGET=path.join(HERE,'TW_Review_Continuity_R203_20261116.html');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const catalog=JSON.parse(read('lexicon/approved_r3.json'));
const overlay=JSON.parse(read('lexicon/wording_overlay_r172.json'));
const requireOne=(s,needle,label)=>{
 if(s.split(needle).length!==2)throw Error('R203_NONUNIQUE_'+label);
};
if(catalog.entries.length!==67||overlay.forms.length!==9||
   overlay.forms.filter(x=>x.kind==='R172_CANDIDATE_ALIAS').length!==6)
 throw Error('R203_LOCKED_WORDING_CATALOG_CHANGED');
const inject=(html,slot,content)=>{
 requireOne(html,slot,slot);
 if(content.toLowerCase().includes('</script'))throw Error('R203_EMBEDDED_SCRIPT_CLOSURE');
 return html.replace(slot,()=>content);
};
let html=read('tools/templates/wording_assistant_r172.html');
const title='<title>Taiwan-LLM-Sanitizer｜臺灣用語審稿接續 R203 Offline Preview</title>';
const old='<title>Taiwan-LLM-Sanitizer｜臺灣用語修稿助手 R17.2 Preview</title>';
requireOne(html,old,'BASE_TITLE');html=html.replace(old,title);
html=html.replace('Taiwan-LLM-Sanitizer · R17.2 Preview','Taiwan-LLM-Sanitizer · R203 Offline Preview');
html=html.replace('讓中文更貼近臺灣習慣','臺灣用語審稿，離線接續不中斷');
html=html.replace('全部在此瀏覽器本機運行，不會自動傳送內容。',
 '每一處人工決定可匯出不含文字的 JSON；重新載入時會驗證全文與詞庫 SHA，來源不同立即拒絕。全程離線。');
const css='\n#reviewTools{margin:12px 0 18px;padding:16px;border:1px solid #bfd6eb;background:#f0f7fc;border-radius:13px}\n#reviewTools h3{margin:0 0 4px;font-size:17px}#reviewTools .file{background:white}#reviewTools .actions{margin:8px 0 3px}\n';
requireOne(html,'</style>','STYLE_CLOSE');html=html.replace('</style>',css+'</style>');
const markup=[
 '<div id="reviewTools" role="group" aria-label="R203 離線審閱接續">',
 '  <h3>保存／接續人工選詞決定</h3>',
 '  <p class="note">只記錄文件雜湊、詞庫版本、候選位置及選項 ID；<strong>不含原文或替換文字</strong>。原始文件若有一字改動即拒絕匯入。不會自動產生或套用新稿。</p>',
 '  <div class="actions"><button type="button" id="exportReview">下載審閱決定 JSON</button>',
 '  <label class="file" for="importReview">選取先前的審閱決定 JSON</label>',
 '  <input id="importReview" type="file" accept=".json,application/json" aria-label="選取審閱決定 JSON"></div>',
 '</div>'
].join('\n');
requireOne(html,'<div id="candidates"></div>','CANDIDATE_ANCHOR');
html=html.replace('<div id="candidates"></div>',markup+'<div id="candidates"></div>');
requireOne(html,'<script>__TLS_R172_UI__</script>','UI_SCRIPT');
html=html.replace('<script>__TLS_R172_UI__</script>',
 '<script>__TLS_R203_CONTINUITY__</script>\n<script>__TLS_R172_UI__</script>');
const files=[
 ['__TLS_R172_ENTITIES__','src/core/entities.js'],
 ['__TLS_R172_CORE_R151__','src/core/protected_segments_r15.js'],
 ['__TLS_R172_R16__','src/core/local_workbench_r16.js'],
 ['__TLS_R172_ASSISTANT__','src/core/wording_assistant_r172.js'],
 ['__TLS_R203_CONTINUITY__','research/comparison/r173/review_continuity_r203.js'],
 ['__TLS_R172_UI__','research/comparison/r173/review_continuity_ui_r203.js'],
];
for(const [slot,file] of files)html=inject(html,slot,read(file));
function set(slot,key,value){
 const serialized='window.'+key+'=Object.freeze('+JSON.stringify(value).replace(/</g,'\\u003c')+');';
 html=inject(html,slot,serialized);
}
set('__TLS_R172_CATALOG__','TLSWordingCatalogR172',catalog);
set('__TLS_R172_OVERLAY__','TLSWordingOverlayR172',overlay);
set('__TLS_R172_DIGESTS__','TLSWordingDigestsR172',{
 catalog_sha256:hash(JSON.stringify(catalog)),overlay_sha256:hash(JSON.stringify(overlay))});
if(html.includes('__TLS_R17')||html.includes('__TLS_R203_'))throw Error('R203_UNREPLACED_SLOT');
if(!html.includes("connect-src 'none'")||!html.includes("default-src 'none'"))
 throw Error('R203_PRIVACY_CSP_CHANGED');
function main(args){
 if(args.length!==1||!['--check','--build'].includes(args[0]))throw Error('R203_MODE_REQUIRED');
 if(args[0]==='--check'){
  if(!fs.existsSync(TARGET)||fs.readFileSync(TARGET,'utf8')!==html)
   throw Error('R203_HTML_OUT_OF_SYNC');
  console.log('R203_OFFLINE_HTML_PARITY_PASS',hash(html));
 }else{
  if(fs.existsSync(TARGET)&&fs.readFileSync(TARGET,'utf8')!==html)
   throw Error('R203_REFUSE_OVERWRITE_DIFFERENT_OUTPUT');
  fs.writeFileSync(TARGET,html,{encoding:'utf8',flag:fs.existsSync(TARGET)?'r+':'wx'});
  console.log('R203_OFFLINE_HTML_BUILT',hash(html),Buffer.byteLength(html));
 }
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('R203_BUILD_BLOCKED',e.message);process.exitCode=2;}}
module.exports={build:()=>html,hash,TARGET};
