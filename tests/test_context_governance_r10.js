/* R10 reproducibility, provenance, voluntary decisions & rejection cases. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('lexicon/context_provenance_r10.json'));
const original=JSON.parse(read('lexicon/context_examples_r9.json')).entries;
const manifest=JSON.parse(read('lexicon/context_provenance_r10_manifest.json'));
const api=require('../src/core/context_governance_r10.js');
const hash=crypto.createHash('sha256').update(read('lexicon/context_provenance_r10.json'),'utf8').digest('hex');
function clone(x){return JSON.parse(JSON.stringify(x));}
test('R10 evidence is original/editorial with 28 exact R9 references and 12 newly authored cases',()=>{
 const stat=api.validatePack(data);
 assert.deepEqual({cases:stat.cases,r9:stat.referencedR9,r10:stat.originalR10,distinct:stat.distinctSourceTerms},
 {cases:40,r9:28,r10:12,distinct:36});
 assert.equal(stat.independentVerification,false);
 assert.equal(stat.runtimePermission,'NONE');
 assert.equal(manifest.source_sha256,hash);
 assert.equal(manifest.never_promote_candidates,true);
 for(let i=0;i<28;i++){
  const src=original[i],x=data.entries[i];
  assert.equal(x.source_case_id,src.id);
  assert.equal(x.source_term,src.from);
  assert.equal(x.suggested_term,src.preferred);
  assert.equal(x.domain,src.domain);
  assert.equal(x.positive_example,src.positive_example);
  assert.equal(x.counter_example,src.counter_example);
  assert.equal(x.meaning_note,src.reason);
 }
 assert.equal(data.entries.every(x=>x.permission==='SUGGEST_ONLY'&&x.auto_apply===false),true);
});
test('pack rejects deceptive expert evidence or accidental auto-application',()=>{
 for(const mutation of [
  p=>p.runtime_permission='AUTOMATIC',p=>p.entries[0].permission='AUTO_APPLY',
  p=>p.entries[1].auto_apply=true,p=>p.entries[3].evidence_status='independently_verified',
  p=>p.entries[4].source_path='private/secret.txt',
  p=>p.entries[0].source_license='unverified_external_copy',
  p=>p.entries[0].source_term='',
  p=>p.entries[2].domain='all',
  p=>p.entries[0].id=p.entries[1].id,
 ]){const x=clone(data);mutation(x);assert.throws(()=>api.validatePack(x));}
});
test('review decisions are per-context, not a ban list, and never modify source',()=>{
 const raw=JSON.stringify(data);
 let rows=[];
 rows=api.decide(rows,'r10-001','SUGGEST_ONLY','在軟體導覽使用',data);
 rows=api.decide(rows,'r10-002','KEEP_ORIGINAL','餐廳偏好英文',data);
 rows=api.decide(rows,'r10-003','CONTEXT_REQUIRED','需要確認頁面位置',data);
 assert.equal(rows.length,3);
 assert.equal(data.entries[0].source_term,'menu');assert.equal(data.entries[1].source_term,'menu');
 assert.equal(JSON.stringify(data),raw);
 assert.equal(rows[0].outcome,'SUGGEST_ONLY');assert.equal(rows[1].outcome,'KEEP_ORIGINAL');
 assert.equal(api.explain(data.entries[0]).includes('不'),true);
});
test('ledger export is bounded, deterministic and contains only explicit case decisions/notes',()=>{
 const rows=[{case_id:'r10-003',outcome:'KEEP_ORIGINAL',note:'我的詞語選擇'},
  {case_id:'r10-001',outcome:'SUGGEST_ONLY',note:'測試模式'}];
 const text=api.exportLedger(rows,data,hash);
 const d=JSON.parse(text);
 assert.deepEqual(Object.keys(d),['schema','locale','evidence_sha256','decisions']);
 assert.equal(d.schema,'tls.term-review-ledger.v1');
 assert.deepEqual(d.decisions.map(x=>x.case_id),['r10-001','r10-003']);
 assert.deepEqual(api.importLedger(text,data,hash),d.decisions);
 assert.equal(text.includes('positive_example'),false);
 assert.equal(text.includes('source_text'),false);
 assert.equal(text.includes('網頁閱讀全文'),false);
 assert.equal(api.exportLedger(rows,data,hash),text);
});
test('ledger fail-closes mismatched pack, unknown fields, duplicate rows, injected markup or bad status',()=>{
 const make=(rows,extra={})=>JSON.stringify({schema:api.REVIEW_SCHEMA,locale:'zh-TW',
  evidence_sha256:hash,decisions:rows,...extra});
 const valid={case_id:'r10-001',outcome:'KEEP_ORIGINAL',note:''};
 for(const x of [
  make([valid],{source_text:'this must not be present'}),
  make([valid],{evidence_sha256:'0'.repeat(64)}),
  make([valid,valid]),
  make([{...valid,case_id:'r9-001'}]),
  make([{...valid,outcome:'AUTO_APPROVE'}]),
  make([{...valid,note:'<img src=x onerror=alert(1)>'}]),
  make([{...valid,hidden:'x'}]),
  'a'.repeat(api.MAX_IMPORT_BYTES+1),
  '{bad json',
 ])assert.throws(()=>api.importLedger(x,data,hash));
 assert.throws(()=>api.decide([], 'r10-999','SUGGEST_ONLY','',data));
});
test('R10 local-only page does not include remote deps, old files remain, template and manifest match',()=>{
 const html=read('examples/TW_Context_Governance_Lab_R10_20261024.html');
 const names=['dist/userscript/TaiwanLLMSanitizer.user.js','dist/chrome/manifest.json',
 'benchmarks/r6/public_frozen_v1.jsonl','examples/TW_User_Context_Lab_R9_20261024.html'];
 for(const p of names)assert.equal(fs.existsSync(path.join(root,p)),true,p);
 assert.equal(html.includes('Content-Security-Policy'),true);
 assert.equal(html.includes("connect-src 'none'"),true);
 assert.equal(html.includes('localStorage'),false);
 assert.equal(html.includes('sessionStorage'),false);
 assert.equal(html.includes('fetch('),false);
 assert.equal(html.includes('XMLHttpRequest('),false);
 assert.equal(html.includes('__TLS_R10_'),false);
});
