/* Offline reproducible R12 evidence workbench. R6 frozen V1 is never modified. MIT. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');const text=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const corpusRaw=text('benchmarks/r6/public_frozen_v1.jsonl');
const manifest=JSON.parse(text('benchmarks/r6/frozen_manifest_v1.json'));
const sha=crypto.createHash('sha256').update(Buffer.from(corpusRaw,'utf8')).digest('hex');
if(sha!==manifest.exact_sha256_utf8)throw Error('R6_FROZEN_V1_SHA_MISMATCH');
const rows=corpusRaw.split(/\r?\n/u).filter(x=>x.trim()).map(JSON.parse);
if(rows.length!==100)throw Error('R6_COUNT_MISMATCH');
const frozen=rows.map(x=>({id:x.id,family:x.family,source_locale:x.source_locale,
 source_text:x.source_text,preserve_exact:x.preserve_exact}));
const template=text('tools/templates/quality_audit_r12.html');
const result=template.replace('__TLS_R12_FROZEN__',JSON.stringify(frozen).replace(/</gu,'\\u003c'))
 .replace('__TLS_R12_HASH__',sha)
 .replace('__TLS_R12_CORE__',text('src/core/quality_audit_r12.js'));
if(result.includes('__TLS_R12_'))throw Error('R12_UNREPLACED_TEMPLATE_TOKEN');
const rel='examples/TW_Quality_Audit_Lab_R12_20261025.html',p=path.join(ROOT,rel);
if(process.argv.includes('--check')){
 if(!fs.existsSync(p)||text(rel)!==result)throw Error('R12_PUBLIC_HTML_OUT_OF_SYNC');
 console.log('R12_REPRODUCIBLE_HTML_PASS records='+frozen.length+' r6_sha='+sha);
}else{fs.writeFileSync(p,result,'utf8');console.log('R12_OFFLINE_HTML_BUILT '+p);}
