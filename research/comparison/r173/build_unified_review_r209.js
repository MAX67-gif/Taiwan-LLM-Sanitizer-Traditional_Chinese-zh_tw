#!/usr/bin/env node
/* TLS R209: compose the fixed R208 five-step guided first task with the
 * fixed R205 context-risk and R207 focus logic. No original modules change.
 * This is a research-only, local single HTML, never a Suite Publisher.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Base=require('./build_first_task_r208.js');
const HERE=__dirname;
const TARGET=path.join(HERE,'TW_Unified_Review_R209_20261124.html');
const read=f=>fs.readFileSync(path.join(HERE,f),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function one(source,old,newText){
 if(source.split(old).length!==2)throw Error('R209_SOURCE_ANCHOR_DRIFT:'+old.slice(0,65));
 return source.replace(old,()=>newText);
}
function build(){
 let html=Base.build(),ui=read('review_focus_ui_r207.js');
 const originalUI=ui,context=read('context_risk_lens_r205.js'),unified=read('review_unified_r209.js');
 for(const value of [context,unified]){
  if(value.toLowerCase().includes('</script'))throw Error('R209_SCRIPT_BREAKOUT');
 }
 ui=one(ui,
  'const W=window.TLSWordingAssistantR172,P=window.TLSReviewContinuityR203,M=window.TLSReviewWorkbenchR204,F=window.TLSReviewFocusR207;',
  'const W=window.TLSWordingAssistantR172,P=window.TLSReviewContinuityR203,M=window.TLSReviewWorkbenchR204,F=window.TLSReviewFocusR207;\nconst L=window.TLSContextRiskLensR205,U=window.TLSIntegratedReviewR209;');
 ui=one(ui,
  "if(!W||!P||!M||!F)throw Error('TLS_R207_MODULES_MISSING');",
  "if(!W||!P||!M||!F||!L||!U)throw Error('TLS_R209_MODULES_MISSING');");
 ui=one(ui,
  " const visible=M.filterCandidates(all,$('#reviewFilter').value,$('#reviewSearch').value);",
  " const visible=U.route(M.filterCandidates(all,$('#reviewFilter').value,$('#reviewSearch').value),$('#source').value,$('#riskMode').value);\n const facts=U.summary(snapshot,$('#source').value);\n $('#riskSummary').textContent='高風險 '+facts.risk_high+'｜需核對 '+facts.risk_medium+'｜已採用需複核 '+facts.confirmed_risk+'｜尚未決定 '+facts.candidates_pending+'｜未列出 '+facts.candidates_omitted;");
 ui=one(ui,
  " const focused=F.focus(all,{mode:$('#reviewFilter').value,query:$('#reviewSearch').value,cursor:focusId});",
  " const focused=U.focus(visible,focusId);");
 ui=one(ui,
  "if(focusMode)focusId=F.nextPending(next.candidates,id,$('#reviewFilter').value,$('#reviewSearch').value)||id;",
  "if(focusMode)focusId=U.nextPending(U.route(M.filterCandidates(next.candidates,$('#reviewFilter').value,$('#reviewSearch').value),$('#source').value,$('#riskMode').value),id)||id;");
 ui=one(ui,
  " const selected=F.focus(snapshot.candidates,{mode:$('#reviewFilter').value,query:$('#reviewSearch').value,cursor:focusId,step});",
  " const selected=U.focus(U.route(M.filterCandidates(snapshot.candidates,$('#reviewFilter').value,$('#reviewSearch').value),$('#source').value,$('#riskMode').value),focusId,step);");
 ui=one(ui,
  '  }list.append(card);',
  "  }const finding=L.assess(c,$('#source').value);\n  const hint=make('p',L.message(finding),'risk-hint risk-'+finding.tier.toLowerCase());\n  hint.dataset.riskCode=finding.reason_code;hint.setAttribute('role','note');\n  card.append(hint);list.append(card);");
 ui=one(ui,
  "$('#reviewFilter').addEventListener('change',render);",
  "$('#reviewFilter').addEventListener('change',render);\n$('#riskMode').addEventListener('change',()=>{focusId=null;render();});");
 if(ui.toLowerCase().includes('</script'))throw Error('R209_UI_BREAKOUT');
 html=one(html,'<script>'+originalUI+'</script>',
  '<script>'+context+'</script>\n<script>'+unified+'</script>\n<script>'+ui+'</script>');
 html=one(html,
  '<title>Taiwan-LLM-Sanitizer｜首次任務引導 R208 Offline Preview</title>',
  '<title>Taiwan-LLM-Sanitizer｜整合式臺灣用語審稿台 R209 Offline Preview</title>');
 html=one(html,'Taiwan-LLM-Sanitizer · R208 First Task Preview · 非正式發行',
  'Taiwan-LLM-Sanitizer · R209 Unified Review · 非正式發行');
 html=one(html,'第一次就能完成一份臺灣用語審稿',
  '第一次使用，一頁完成臺灣用語安全審稿');
 html=one(html,'<div id="candidates"></div>',[
  '<section id="riskPanel" class="risk-panel" aria-label="語境風險雷達">',
  ' <div><h3>語境風險雷達｜先核對不確定的詞</h3>',
  ' <p class="note">只根據附近字面線索提出規則式提示；不自動決定詞義，人工採用與保留原文始終優先。</p></div>',
  ' <label for="riskMode">審稿順序<select id="riskMode"><option value="risk_first">高風險先看</option>',
  ' <option value="document">原文位置順序</option><option value="high_only">只看高風險</option></select></label>',
  ' <p id="riskSummary" role="status" aria-live="polite">尚未分析來源。</p>',
  '</section>',
  '<div id="candidates"></div>'
 ].join('\n'));
 const css=[
 '.risk-panel{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px;background:#f3f8fc;border:1px solid #bbd0df;border-radius:12px;padding:14px;margin:12px 0}',
 '.risk-panel h3{font-size:17px;margin:0 0 5px}.risk-panel label{display:grid;gap:6px;align-content:center;font-size:14px}',
 '.risk-panel select{width:100%;min-width:0;padding:9px;border:1px solid #a7c0d5;border-radius:8px;background:white;color:#183049;font:inherit}',
 '#riskSummary{grid-column:1/-1;margin:0;font-size:13px;font-weight:700;color:#235077;overflow-wrap:anywhere}',
 '.risk-hint{padding:8px 10px;border-left:4px solid #87a3bd;margin:10px 0 0;font-size:13px;border-radius:6px;overflow-wrap:anywhere}',
 '.risk-high{background:#fff0e9;border-left-color:#b95232;color:#7b351c}',
 '.risk-medium{background:#fff9e7;border-left-color:#a48a31;color:#60521a}',
 '.risk-low{background:#eff5fc;border-left-color:#4b7aab;color:#234d79}',
 '.risk-locked{background:#f0f2f4;border-left-color:#78818d;color:#475363}',
 '@media(max-width:600px){.risk-panel{grid-template-columns:1fr;padding:10px}}'
 ].join('\n');
 html=one(html,'</style>',css+'</style>');
 if(!html.includes("connect-src 'none'")||!html.includes("default-src 'none'")||
    !html.includes('TLSContextRiskLensR205')||
    !html.includes('TLSIntegratedReviewR209')||
    !html.includes('id="firstTaskR208"')||!html.includes('id="riskMode"')||
    html.includes('__TLS_R209_'))throw Error('R209_PRIVACY_OR_ARTIFACT_GUARD');
 return html;
}
function main(args){
 if(args.length!==1||!['--build','--check'].includes(args[0]))throw Error('R209_MODE_REQUIRED');
 const html=build();
 if(args[0]==='--check'){
  if(!fs.existsSync(TARGET)||fs.readFileSync(TARGET,'utf8')!==html)
   throw Error('R209_HTML_PARITY_MISMATCH');
 }else if(fs.existsSync(TARGET)){
  if(fs.readFileSync(TARGET,'utf8')!==html)throw Error('R209_REFUSE_OVERWRITE_DIFFERENT_OUTPUT');
 }else fs.writeFileSync(TARGET,html,{encoding:'utf8',flag:'wx'});
 console.log('R209_OFFLINE_HTML_'+(args[0]==='--check'?'PARITY_PASS':'BUILT'),
  sha(html),Buffer.byteLength(html));
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error('R209_BUILD_BLOCKED',e.message);process.exitCode=2;}}
module.exports=Object.freeze({build,sha,TARGET});
