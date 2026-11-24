'use strict';
/* R211 RED->GREEN: opt-in local Markdown PR review, never translate/overwrite. */
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const child=require('node:child_process');
const Gate=require('./pr_wording_gate_r211.js');
const HERE=__dirname,CLI=path.join(HERE,'pr_wording_gate_r211.js');
const doc='# 檢查文件\n介面 menu，餐廳 menu。\n餐廳設定 menu，未知 menu。\n程式 `menu` 和 {{MY_VAR}} 應維持原樣。\n';
const tmp=async fn=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r211-'));try{return await fn(d);}finally{fs.rmSync(d,{recursive:true,force:true});}};

test('R211 source-bound four menu candidates, high-risk first; protected code not exposed',async()=>{
 const report=await Gate.auditMarkdown(doc);
 assert.equal(report.schema,'tls.r211.pr-wording-audit.v1');
 assert.equal(report.format,'markdown');
 assert.equal(report.review_required,true);
 assert.equal(report.candidates_reviewable>=4,true);
 assert.equal(report.findings.filter(f=>f.reason_code==='CONFLICTING_CONTEXT_CUES').length,1);
 assert.equal(report.findings.filter(f=>f.reason_code==='AMBIGUOUS_CONTEXT_NO_CUES').length,1);
 assert.equal(report.findings[0].tier,'HIGH');
 assert.equal(report.findings[1].tier,'HIGH');
 assert.equal(report.findings[0].line,3);
 assert.equal(report.findings[0].column_utf16>0,true);
 assert.equal(report.automatically_modified,false);
 assert.equal(report.auto_apply,false);assert.equal(report.approval,'NONE');
 assert.equal(report.network_requested,false);
 assert(Object.isFrozen(report)&&Object.isFrozen(report.findings));
 const raw=JSON.stringify(report);
 for(const item of ['介面','餐廳','menu','MY_VAR','source_sha256','文件','/tmp/','original_text','"replacement":'])
  assert.equal(raw.includes(item),false,'metadata leak:'+item);
});

test('R211 benign zero-candidate documents are not translated, and never certified',async()=>{
 const src='# Original note\nKeep these words untouched.\n';
 const r=await Gate.auditMarkdown(src);
 assert.equal(r.review_required,false);
 assert.equal(r.candidates_total,0);
 assert.equal(r.full_document_certified,false);
 assert.equal(r.linguistic_quality_verified,false);
 assert.equal(r.status,'NO_CANDIDATES_NOT_CERTIFIED');
 assert.deepEqual(r.findings,[]);
});

test('R211 protected-only candidates are not mistaken for editable review items',async()=>{
 const r=await Gate.auditMarkdown('點擊率只是統計。');
 assert(r.candidates_total>=1);
 assert.equal(r.candidates_reviewable,0);
 assert.equal(r.native_locked,r.candidates_total);
 assert.equal(r.review_required,false);
 assert.equal(r.status,'LOCKED_ONLY_NOT_CERTIFIED');
 assert.equal(r.full_document_certified,false);
});

test('R211 partial 120-candidate coverage is explicitly flagged, not approved',async()=>{
 const src='# Menu\n'+Array.from({length:125},()=> 'menu').join(' ')+'\n';
 const r=await Gate.auditMarkdown(src);
 assert.equal(r.candidates_total,120);
 assert(r.omitted_candidates>=5);
 assert.equal(r.partial_coverage,true);
 assert.equal(r.review_required,true);
 assert.equal(r.full_document_certified,false);
 assert(r.findings.length<=120);
});

test('R211 CLI parameters require fresh report, no unknown flags or duplicates',()=>{
 assert.deepEqual(Gate.parse(['--input','input.md','--report','output.json','--strict']),
 {input:'input.md',report:'output.json',strict:true});
 for(const bad of [[],['--input','a.md'],['--report','x.json'],
  ['--input','a.md','--report','x','--input','b.md'],
  ['--input','a.md','--report','x','--apply'],
  ['--input','a.md','--report','x','--strict','--strict'],
  ['--input','a.md','--report','x','--output','rewrite.md']])
   assert.throws(()=>Gate.parse(bad),/TLS_R211_/);
});

test('R211 CLI default emits only JSON metadata without modifying input',async()=>{
 await tmp(async dir=>{
  const file=path.join(dir,'sample.md'),output=path.join(dir,'report.json');
  fs.writeFileSync(file,doc);
  const before=fs.readFileSync(file);
  const result=await Gate.main(['--input',file,'--report',output]);
  assert.equal(result.exit_code,0);
  assert.equal(result.review_required,true);
  assert.deepEqual(fs.readFileSync(file),before);
  const payload=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(payload.schema,'tls.r211.pr-wording-audit.v1');
  assert.equal(payload.auto_apply,false);
  assert.equal(payload.contains_source_text,false);
  assert(!JSON.stringify(payload).includes('介面'));
 });
});

test('R211 opt-in --strict writes audit and exits 2 only for review needed',async()=>{
 await tmp(async dir=>{
  const md=path.join(dir,'unsafe.md'),out=path.join(dir,'audit.json');
  fs.writeFileSync(md,doc);
  const seen=child.spawnSync(process.execPath,[CLI,'--input',md,'--report',out,'--strict'],{encoding:'utf8'});
  assert.equal(seen.status,2,seen.stderr);
  assert.equal(JSON.parse(fs.readFileSync(out,'utf8')).review_required,true);
  const clean=path.join(dir,'clean.md'),cleanOut=path.join(dir,'clean.json');
  fs.writeFileSync(clean,'# Original hello\nKeep this as-is.\n');
  const ok=child.spawnSync(process.execPath,[CLI,'--input',clean,'--report',cleanOut,'--strict'],{encoding:'utf8'});
  assert.equal(ok.status,0,ok.stderr);
  assert.equal(JSON.parse(fs.readFileSync(cleanOut,'utf8')).review_required,false);
 });
});

test('R211 rejects preexisting output, symlink input, invalid UTF8 and unsupported file types',async()=>{
 await tmp(async dir=>{
  const docfile=path.join(dir,'sample.md'),report=path.join(dir,'report.json');
  fs.writeFileSync(docfile,doc);fs.writeFileSync(report,'EXISTING');
  await assert.rejects(Gate.main(['--input',docfile,'--report',report]),/TLS_R211_|R16_/);
  assert.equal(fs.readFileSync(report,'utf8'),'EXISTING');
  await assert.rejects(Gate.main(['--input',docfile,'--report',docfile]),/TLS_R211_|R16_/);
  const link=path.join(dir,'link.md');fs.symlinkSync(docfile,link);
  await assert.rejects(Gate.main(['--input',link,'--report',path.join(dir,'link-report.json')]),/TLS_R211_|R16_/);
  const bad=path.join(dir,'bad.md');fs.writeFileSync(bad,Buffer.from([0xff,0xfe,0x61]));
  await assert.rejects(Gate.main(['--input',bad,'--report',path.join(dir,'bad-report.json')]),/TLS_R211_|R16_|UTF/i);
  const json=path.join(dir,'data.json');fs.writeFileSync(json,'{"id":1}');
  await assert.rejects(Gate.main(['--input',json,'--report',path.join(dir,'data-report.json')]),/TLS_R211_/);
  const huge=path.join(dir,'big.md');fs.writeFileSync(huge,'a'.repeat(65537));
  await assert.rejects(Gate.main(['--input',huge,'--report',path.join(dir,'big-report.json')]),/TLS_R211_|R16_/);
 });
});

test('R211 protected JSON, unknown source and invalid Unicode fail closed without report',async()=>{
 await assert.rejects(Gate.auditMarkdown('{"title":"menu"}'),/TLS_R211_|TLS_R172_/);
 await assert.rejects(Gate.auditMarkdown(''),/TLS_R211_/);
 await assert.rejects(Gate.auditMarkdown('\uD800 menu'),/TLS_R211_|R172_/);
});

test('R211 source does not use network, shell commands or automatic writes to input',()=>{
 const source=fs.readFileSync(CLI,'utf8');
 for(const forbidden of ['fetch(', 'XMLHttpRequest','sendBeacon(', 'WebSocket(',
   'localStorage.', 'sessionStorage.', 'execSync(', 'eval(',
   'original_text:', 'replacement:'])
  assert(!source.includes(forbidden),'unsafe '+forbidden);
});
