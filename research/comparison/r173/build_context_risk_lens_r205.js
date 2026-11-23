#!/usr/bin/env node
/* TLS R205 additive single-file HTML builder. Preserve R203/R204 byte sources,
 * only compose their checked engines into a new research-sidecar Preview.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Base=require('./build_review_workbench_r204.js');
const HERE=__dirname;
const TARGET=path.join(HERE,'TW_Context_Risk_Lens_R205_20261124.html');
const read=p=>fs.readFileSync(path.join(HERE,p),'utf8');
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
function replaceOnce(s,before,after){
 if(s.split(before).length!==2)throw Error('R205_SOURCE_ANCHOR_DRIFT');
 return s.replace(before,()=>after);
}
function build(){
 let html=Base.build();
 const oldUI=read('review_workbench_ui_r204.js');
 const lens=read('context_risk_lens_r205.js');
 if(lens.toLowerCase().includes('</script'))throw Error('R205_UNSAFE_EMBEDDED_JS');
 let ui=oldUI;
 ui=replaceOnce(ui,
  'const W=window.TLSWordingAssistantR172,P=window.TLSReviewContinuityR203,M=window.TLSReviewWorkbenchR204;',
  'const W=window.TLSWordingAssistantR172,P=window.TLSReviewContinuityR203,M=window.TLSReviewWorkbenchR204;\nconst L=window.TLSContextRiskLensR205;if(!L)throw Error("TLS_R205_CONTEXT_LENS_MISSING");');
 ui=replaceOnce(ui,
  "const rows=M.filterCandidates(all,$('#reviewFilter').value,$('#reviewSearch').value);",
  "const risk=L.summarize(all,$('#source').value);\n $('#lensSummary').textContent='高風險 '+risk.high+'｜需核對 '+risk.medium+'｜原生保護 '+risk.locked+'｜已採用但需複核 '+risk.confirmed_risk;\n const rows=L.route(M.filterCandidates(all,$('#reviewFilter').value,$('#reviewSearch').value),$('#source').value,$('#lensMode').value);");
 ui=replaceOnce(ui,"  }list.append(card);",
  "  }\n  const finding=L.assess(c,$('#source').value);\n  const hint=make('p',L.message(finding),'lens-advice lens-'+finding.tier.toLowerCase());\n  hint.dataset.riskCode=finding.reason_code;hint.setAttribute('role','note');card.append(hint);list.append(card);");
 ui=replaceOnce(ui,"$('#reviewFilter').addEventListener('change',render);",
  "$('#reviewFilter').addEventListener('change',render);\n$('#lensMode').addEventListener('change',render);");
 if(ui.toLowerCase().includes('</script'))throw Error('R205_UNSAFE_UI_SCRIPT');
 html=replaceOnce(html,'<script>'+oldUI+'</script>',
  '<script>'+lens+'</script>\n<script>'+ui+'</script>');
 html=replaceOnce(html,
  '<title>Taiwan-LLM-Sanitizer｜臺灣用語審稿工作台 R204 Offline Preview</title>',
  '<title>Taiwan-LLM-Sanitizer｜語境風險雷達 R205 離線審稿工作台</title>');
 html=replaceOnce(html,'Taiwan-LLM-Sanitizer · R204 Offline Preview',
  'Taiwan-LLM-Sanitizer · R205 Context Lens Preview');
 html=replaceOnce(html,'審稿可復原，差異看得清楚','高風險語境先看，人工決定不被取代');
 html=replaceOnce(html,'<div id="candidates"></div>',
  '<div class="lens-toolbar" role="group" aria-label="語境風險雷達">'+
  '<div><h3>語境風險雷達｜優先核對模糊用語</h3>'+
  '<p class="note">偵測附近 UI／餐飲詞彙線索、語境衝突及缺少線索的位置。僅為規則式提示，不是語意驗證；不會自動選詞或修改原文。</p></div>'+
  '<label for="lensMode">檢視順序'+
  '<select id="lensMode"><option value="risk_first">高風險優先</option>'+
  '<option value="document">原文位置順序</option>'+
  '<option value="high_only">只看高風險</option></select></label>'+
  '<p id="lensSummary" role="status" aria-live="polite"></p></div>'+
  '<div id="candidates"></div>');
 const css='\n.lens-toolbar{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:12px;background:#f1f7fe;border:1px solid #bdd3ed;border-radius:12px;padding:15px;margin:15px 0}.lens-toolbar h3{margin:0 0 4px;font-size:18px}.lens-toolbar label{display:grid;gap:5px;align-content:center}.lens-toolbar select{min-width:0;width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:white;color:var(--ink);font:inherit}#lensSummary{grid-column:1/-1;margin:0;font-weight:700;overflow-wrap:anywhere}.lens-advice{margin:10px 0 0;padding:9px 11px;border-left:4px solid #96a5b8;border-radius:5px;font-size:13px;overflow-wrap:anywhere}.lens-high{background:#fff0e6;border-left-color:#c45a20;color:#813d16}.lens-medium{background:#fff8df;border-left-color:#b38a26;color:#63500e}.lens-low{background:#f2f7fd;border-left-color:#4a7bb6}.lens-locked{background:#f2f3f5;border-left-color:#777}@media(max-width:600px){.lens-toolbar{grid-template-columns:1fr;padding:11px}}\n';
 html=replaceOnce(html,'</style>',css+'</style>');
 if(!html.includes("connect-src 'none'")||
    !html.includes("default-src 'none'")||
    !html.includes('TLSContextRiskLensR205')||
    html.includes('__TLS_R205_'))throw Error('R205_PRIVACY_OR_ARTIFACT_BUILD');
 return html;
}
function main(argv){
 if(argv.length!==1||!['--build','--check'].includes(argv[0]))throw Error('R205_MODE_REQUIRED');
 const html=build();
 if(argv[0]==='--check'){
  if(!fs.existsSync(TARGET)||fs.readFileSync(TARGET,'utf8')!==html)
   throw Error('R205_HTML_PARITY_MISMATCH');
 }else if(fs.existsSync(TARGET)){
  if(fs.readFileSync(TARGET,'utf8')!==html)throw Error('R205_REFUSE_OVERWRITE_DIFFERENT_OUTPUT');
 }else fs.writeFileSync(TARGET,html,{encoding:'utf8',flag:'wx'});
 console.log('R205_OFFLINE_HTML_'+(argv[0]==='--check'?'PARITY_PASS':'BUILT'),
             digest(html),Buffer.byteLength(html));
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){console.error('R205_BUILD_BLOCKED',e.message);process.exitCode=2;}
}
module.exports=Object.freeze({build,digest,TARGET});
