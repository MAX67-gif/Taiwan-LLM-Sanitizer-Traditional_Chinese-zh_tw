'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const Core=require('../src/core/local_workbench_r16.js');
const CLI=require('../tools/r16_local_workbench_cli.js');
const input=`# Usage guide\nPlease click the menu.\n<!--\nkeep_private\n-->\nRead [docs](https://example.test/a_(b)/c).\n`;
const open=async(source=input,format='markdown')=>{const s=Core.openSession({source,format});const r=await s.inspect();return {s,r};};
const choose=(s,r,replacement='請點選選單')=>({schema:'tls.structured-edits.v1',input_sha256:r.source_sha256,edits:[{id:r.safe_edit_ids[0],replacement}]});
test('R16 stable schema, metadata-only, no network or consent upgrade',async()=>{
 const {s,r}=await open();assert.equal(r.schema,'tls.local-workbench.v1');assert.equal(r.approval,'NONE');assert.equal(r.transport,'NONE');assert.equal(r.network_requested,false);
 assert.equal(r.contains_original_text,false);assert.equal(r.contains_replacement_text,false);assert(!JSON.stringify(r).includes('keep_private'));assert(!JSON.stringify(r).includes('Please click'));
 assert.equal(r.validation_status,'OK');assert(r.protected_spans.length>0);assert(r.safe_edit_ids.length>0);assert.equal(r.offset_unit,'utf16');s.revoke();
});
test('R16 inherited protected HTML and balanced URL are not editable',async()=>{
 const {s,r}=await open();const editable=s.changesAllowed();for(const [start,end] of [['keep_private',0],['https://example.test/a_(b)/c',0]]){
 const idx=input.indexOf(start);assert(idx>=0);assert(editable.every(x=>x.end<=idx||x.start>=idx+start.length),start);
 }s.revoke();
});
test('R16 manual preview only and no source mutation',async()=>{
 const {s,r}=await open();const plan=choose(s,r);const result=await s.prepare(plan);assert.equal(result.status,'SAFE_PREVIEW_NOT_APPLIED');assert.equal(result.report.schema,'tls.local-workbench.v1');assert.equal(result.report.preview_change_count,1);
 assert.equal(result.report.approval,'NONE');assert.equal(result.report.network_requested,false);
 assert(result.preview_text.includes('keep_private'));assert(result.preview_text.includes('https://example.test/a_(b)/c'));assert(!JSON.stringify(result.report).includes('請點選選單'));
 s.revoke();
});
test('R16 cancellation invalidates outstanding and next preview',async()=>{
 const s=Core.openSession({source:input,format:'markdown'});const pending=s.inspect();s.revoke();await assert.rejects(pending,/SESSION_CANCELLED/);await assert.rejects(s.inspect(),/SESSION_CANCELLED/);
});
test('R16 revocation drops source and denies preview',async()=>{
 const {s,r}=await open();const id=r.safe_edit_ids[0];assert(s.excerpt(id));const v=s.revoke();assert.equal(v.status,'REVOKED');assert.equal(s.excerpt(id),null);
 assert.deepEqual(s.changesAllowed(),[]);await assert.rejects(s.prepare(choose(s,r)),/SESSION_CANCELLED/);
});
test('R16 unknown format is rejected, never auto-fallback to other parser',async()=>{for(const format of ['html','yaml','',null,'Markdown']){const {s,r}=await open(input,format);assert.equal(r.validation_status,'REJECTED');assert(r.reject_reasons.includes('INVALID_FORMAT'));s.revoke();}});
test('R16 empty and whitespace documents fail closed',async()=>{for(const value of ['','  \n']){const {s,r}=await open(value);assert.equal(r.validation_status,'REJECTED');assert(r.reject_reasons.includes('EMPTY_SOURCE'));s.revoke();}});
test('R16 oversized and unpaired-surrogate input does not succeed',async()=>{for(const value of ['a'.repeat(1_048_577),'\uD800a']){const {s,r}=await open(value);assert.equal(r.validation_status,'REJECTED');assert.equal(r.safe_edit_ids.length,0);s.revoke();}});
test('R16 invalid JSON and dangerous keys rejected',async()=>{for(const value of ['{"text":"hi"','{"__proto__":1}','{"text":"hi","text":"hi"}']){const {s,r}=await open(value,'json');assert.equal(r.validation_status,'REJECTED');s.revoke();}});
test('R16 JSON value-only editing keeps JSON keys, URL, number and type',async()=>{
 const src='{"id":"z","text":"Please click the menu","url":"https://example.test/x_(y)","count":3}';const {s,r}=await open(src,'json');assert.equal(r.validation_status,'OK');const diff=await s.prepare(choose(s,r,'請點選選單'));const a=JSON.parse(src),b=JSON.parse(diff.preview_text);
 assert.deepEqual(Object.keys(b),Object.keys(a));assert.equal(b.url,a.url);assert.equal(b.id,a.id);assert.equal(b.count,3);assert.equal(b.text,'請點選選單');s.revoke();
});
test('R16 protects Prompt role markers',async()=>{const {s,r}=await open('system: Keep role.\nPlease click the menu.\n','prompt');assert.equal(r.validation_status,'OK');assert(!s.changesAllowed().some(x=>x.start<7));s.revoke();});
test('R16 source hash mismatch rejected',async()=>{const {s,r}=await open();const plan=choose(s,r);plan.input_sha256='0'.repeat(64);await assert.rejects(s.prepare(plan),/INVALID_EDIT_PLAN/);s.revoke();});
test('R16 missing inspection rejects edit',async()=>{const s=Core.openSession({source:input,format:'markdown'});await assert.rejects(s.prepare({schema:'tls.structured-edits.v1',input_sha256:'x',edits:[]}),/INSPECTION_REQUIRED/);s.revoke();});
test('R16 required edit schema and allowed keys strict',async()=>{const {s,r}=await open();for(const extra of [{unexpected:true},{schema:'bad'}, {edits:null}]){const p={...choose(s,r),...extra};await assert.rejects(s.prepare(p),/INVALID_EDIT_PLAN/);}s.revoke();});
test('R16 protected ID, duplicate ID and unknown segment denied',async()=>{const {s,r}=await open();const id=r.safe_edit_ids[0];for(const edits of [[{id:r.protected_spans[0].id,replacement:'oops'}],[{id:'bad',replacement:'oops'}],[{id,replacement:'safe'},{id,replacement:'more'}]]){await assert.rejects(s.prepare({schema:'tls.structured-edits.v1',input_sha256:r.source_sha256,edits}),/R15_/);}s.revoke();});
test('R16 structural replacement, HTML and templates forbidden',async()=>{const {s,r}=await open();for(const x of ['<script>alert(1)</script>','{{USER}}','--config','\u202eabc']){await assert.rejects(s.prepare(choose(s,r,x)),/R15_/);}s.revoke();});
test('R16 report includes no raw source or candidate text after preview',async()=>{const {s,r}=await open('SECRET_SOURCE_WORDS\nPlease select menu.');const p=await s.prepare(choose(s,r,'中文候選文字'));assert(!JSON.stringify(p.report).includes('SECRET_SOURCE_WORDS'));assert(!JSON.stringify(p.report).includes('中文候選文字'));s.revoke();});
test('R16 CLI requires explicit output and selection contract',()=>{for(const args of [[],['--input','a'],['--input','a','--format','json','--report','x','--unknown','z'],['--input','a','--format','json','--report','x','--edits','p'],['--input','a','--format','json','--report','x','--report','y']])assert.throws(()=>CLI.parse(args));});
test('R16 CLI output must not overwrite existing files or input',()=>{const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r16-tests-'));try{const p=path.join(temp,'file.txt');fs.writeFileSync(p,'sample');assert.throws(()=>CLI.ensureNewPath(p,[]),/WOULD_OVERWRITE/);assert.throws(()=>CLI.ensureNewPath(path.join(temp,'new.txt'),[path.join(temp,'new.txt')]),/WOULD_OVERWRITE/);}finally{fs.rmSync(temp,{recursive:true,force:true});}});
test('R16 CLI never modifies original and metadata report is protected',async()=>{const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r16-cli-'));try{const src=path.join(temp,'in.md'),report=path.join(temp,'report.json');fs.writeFileSync(src,input);const outcome=await CLI.main(['--input',src,'--format','markdown','--report',report]);assert.equal(outcome.status,'PASS');assert.equal(fs.readFileSync(src,'utf8'),input);
 const data=JSON.parse(fs.readFileSync(report,'utf8'));assert(!JSON.stringify(data).includes('keep_private'));assert.equal(data.approval,'NONE');assert.equal(data.network_requested,false);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}});
test('R16 CLI strict JSON invalid UTF8 rejected',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r16-invalid-'));try{const p=path.join(dir,'data.txt');fs.writeFileSync(p,Buffer.from([0xff]));assert.throws(()=>CLI.readStrict(p),/encoded data|not valid|utf-8|encoding/i);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('R16 CLI rejects symlink input',()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r16-link-'));try{const actual=path.join(dir,'actual.txt'),link=path.join(dir,'alias.txt');fs.writeFileSync(actual,'hello');fs.symlinkSync(actual,link);assert.throws(()=>CLI.readStrict(link),/INVALID_FILE/);}finally{fs.rmSync(dir,{recursive:true,force:true});}});
test('R16 versioned source has no network APIs',()=>{const raw=fs.readFileSync(path.join(__dirname,'../src/core/local_workbench_r16.js'),'utf8');for(const token of ['XMLHttpRequest(','WebSocket(','navigator.sendBeacon(','document.cookie','chrome.cookies.'])assert(!raw.includes(token));});
test('R16 source remains under R15 upper length bounds',async()=>{const {s,r}=await open('a'.repeat(12000));assert.equal(r.validation_status,'OK');s.revoke();});
