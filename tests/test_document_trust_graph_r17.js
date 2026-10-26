'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const R=require('../src/core/document_trust_graph_r17.js');
const CLI=path.join(__dirname,'../tools/r17_document_trust_cli.js');
const doc=(p,t)=>({path:p,text:t});
function request(files,allow=files.map(x=>x.path),extras={}){return {schema:R.REQUEST,file_allowlist:allow,files,check_external:false,network_requested:false,...extras}}
function run(files,allow,extras){return R.audit(request(files,allow,extras))}
function reasons(a){return a.edges.map(e=>e.reason_code)}
function withTemp(fn){const d=fs.mkdtempSync(path.join(os.tmpdir(),'tls-r17-original-'));try{return fn(d)}finally{fs.rmSync(d,{recursive:true,force:true})}}
async function one(source,other='# Install\n',url='docs/guide.md'){return run([doc('README.md',source),doc(url,other)])}

test('metadata-only report schema, counters, SHA and no document paths by default',async()=>{
 const a=await one('My confidential demo.\n[Guide](docs/guide.md#install)');
 assert.equal(a.schema,R.REPORT);assert.equal(a.approval,'NONE');assert.equal(a.network_requested,false);assert.equal(a.transport,'NONE');assert.equal(a.contains_original_text,false);
 assert.equal(a.decision,'PASS');assert.equal(a.summary.files_checked,2);assert.equal(a.summary.edges_checked,1);
 const s=JSON.stringify(a);assert(!s.includes('README.md'));assert(!s.includes('docs/guide.md'));assert(!s.includes('confidential demo'));assert(!s.includes('/Users/'));assert.equal(a.path_disclosure,'HASHED');
 assert.match(a.source_files[0].source_sha256,/^[a-f0-9]{64}$/u);assert.equal(a.edges[0].reason_code,'LOCAL_ANCHOR_VERIFIED');
});
test('developer path disclosure requires explicit option',async()=>{
 const a=await R.audit(request([doc('README.md','content')]),{include_paths:true});assert.equal(a.path_disclosure,'EXPLICIT_DEVELOPER_OPT_IN');assert.equal(a.source_files[0].relative_path_or_hash,'README.md');
});
test('stable report across order of file allowlist and inputs',async()=>{
 const files=[doc('a.md','[x](b.md)'),doc('b.md','# Good')];
 const a=await run(files),b=await run([...files].reverse(),['b.md','a.md']);assert.deepEqual(a,b);
});
test('missing allowlisted file must be explicit BLOCK (never PASS)',async()=>{
 const a=await run([doc('index.md','[miss](gone.md)'),{path:'gone.md',missing:true}]);
 assert.equal(a.decision,'BLOCK');assert.equal(a.summary.block_count,2);assert(reasons(a).includes('MISSING_ALLOWLISTED_FILE'));
});
test('target not allowlisted is UNKNOWN, not assumed absent or checked',async()=>{
 const a=await run([doc('index.md','[other](unknown.md)')]);assert.equal(a.decision,'UNKNOWN');assert.equal(a.edges[0].reason_code,'TARGET_NOT_IN_ALLOWLIST');
});
test('external http and https do not trigger network, not PASS',async()=>{
 const a=await run([doc('index.md','[x](https://example.invalid/foo)\n[y](http://example.invalid)')]);
 assert.equal(a.summary.unknown_count,2);assert(reasons(a).every(x=>x==='EXTERNAL_UNCHECKED'));
});
test('mail addresses are UNKNOWN; javascript, file and data schemes are BLOCK',async()=>{
 const a=await run([doc('index.md','[a](mailto:user@example.invalid)\n[b](javascript:alert(1))\n[c](file:///etc/passwd)\n[d](data:text/plain,abc)')]);
 assert.equal(a.summary.unknown_count,1);assert.equal(a.summary.block_count,3);
});
test('escape root ../ is BLOCK, safe parent path within root is PASS',async()=>{
 const a=await run([doc('folder/index.md','[safe](../root.md)\n[bad](../../etc.md)'),doc('root.md','# T')]);
 assert.deepEqual(a.edges.map(x=>x.decision),['PASS','BLOCK']);
});
test('encoded traversal and encoded separators BLOCK',async()=>{
 const a=await run([doc('index.md','[x](%2e%2e/secret.md)\n[x](docs%2fsecret.md)\n[x](docs%5cfoo.md)')]);
 assert.equal(a.summary.block_count,3);assert(reasons(a).includes('OUTSIDE_ROOT'));assert(reasons(a).includes('ENCODED_SEPARATOR'));
});
test('a second percent decoding layer is not silently trusted',async()=>{
 const a=await run([doc('index.md','[x](%252e%252e/secrets.md)')]);assert.equal(a.decision,'UNKNOWN');assert.equal(a.edges[0].reason_code,'MULTIPLE_PERCENT_DECODING');
});
test('literal DOS/UNC/absolute paths BLOCK',async()=>{
 const a=await run([doc('index.md','[root](/etc/passwd)\n[drive](C:/users/bad.md)\n[unc](\\\\network\\share.md)')]);assert.equal(a.summary.block_count,3);
});
test('source allowlist rejects .env, ../, hidden, Windows path and non-Markdown before reading',async()=>{
 for(const p of ['.env','../secret.md','.github/file.md','a//b.md','C:/disk.md','docs\\a.md','x.pdf']){
  await assert.rejects(()=>run([{path:p,text:'x'}]),/TLS_R17_/u,p)
 }
});
test('single missing file with no links still BLOCK',async()=>{
 const a=await run([{path:'missing.md',missing:true}]);assert.equal(a.summary.block_count,1);assert.equal(a.decision,'BLOCK');
});
test('UTF-8 Unicode paths, percent-20 and balanced parens (A G07)',async()=>{
 const a=await run([doc('目錄/index.md','[x](./my%20file.md)\n[x](../user_(v2).md)'),doc('目錄/my file.md','OK'),doc('user_(v2).md','Yes')]);assert.equal(a.summary.pass_count,2);
});
test('unknown fragment is BLOCK only with unambiguous well-known heading, else UNKNOWN',async()=>{
 const a=await run([doc('intro.md','# Install\n[ok](#install)\n[bad](#missing)')]);assert.deepEqual(a.edges.map(x=>x.decision),['PASS','BLOCK']);
 const b=await run([doc('intro.md','# **Custom**\n[unknown](#custom)')]);assert.equal(b.edges[0].decision,'UNKNOWN');
});
test('duplicate headings generate stable suffix anchor, mismatch BLOCK',async()=>{
 const a=await run([doc('index.md','# Install\n# Install\n[ok](#install-1)\n[bad](#install-2)')]);assert.deepEqual(a.edges.map(x=>x.decision),['PASS','BLOCK']);
});
test('links in fenced and indented code are not treated as live references',async()=>{
 const a=await run([doc('index.md','```md\n[bogus](ghost.md)\n```\n    [code](ghost.md)\n[real](guide.md)'),doc('guide.md','### Guide')]);assert.equal(a.summary.edges_checked,1);assert.equal(a.decision,'PASS');
});
test('html comment/block links are not treated as links',async()=>{
 const a=await run([doc('index.md','<!--\n[secret](ghost.md)\n-->\n<div>\n[unseen](ghost.md)\n</div>\n[real](guide.md)'),doc('guide.md','# Valid')]);assert.equal(a.summary.edges_checked,1);assert.equal(a.decision,'PASS');
});
test('unclosed fenced and HTML blocks with fragments are UNKNOWN',async()=>{
 const a=await run([doc('index.md','[x](target.md#title)'),doc('target.md','# Title\n<div>\ntext')]);assert.equal(a.edges[0].decision,'UNKNOWN');assert.equal(a.edges[0].reason_code,'ANCHOR_PARSER_UNCERTAIN');
});
test('escaped inline code with a link inside is ignored',async()=>{
 const a=await run([doc('index.md','Use `[unsafe](foo.md)` then [safe](safe.md)'),doc('safe.md','# Safe')]);assert.equal(a.summary.edges_checked,1);
});
test('broken/unrecognized reference links UNKNOWN rather than PASS',async()=>{
 const a=await run([doc('index.md','[name][missing]\n[ref]: ./where.md')]);assert.equal(a.summary.unknown_count,2);
});
test('case-sensitive mismatch WARN; colliding case UNKNOWN',async()=>{
 const a=await run([doc('index.md','[x](docs/Guide.md)'),doc('docs/guide.md','# T')]);assert.equal(a.decision,'WARN');assert.equal(a.edges[0].reason_code,'CASE_MISMATCH_OR_COLLISION');
 const b=await run([doc('index.md','[x](docs/guide.md)'),doc('docs/guide.md','# T'),doc('docs/Guide.md','# T')]);assert.equal(b.edges[0].decision,'UNKNOWN');
});
test('stale baselines BLOCK_STALE after file changes or scope changes',async()=>{
 const a=await run([doc('index.md','A')]),b=await run([doc('index.md','B')]);assert.equal(R.compareSnapshots(a,b).decision,'BLOCK_STALE');
 assert.equal(R.compareSnapshots(a,a).decision,'PASS');
 const c=await run([doc('index.md','A'),doc('b.md','B')]);assert.equal(R.compareSnapshots(a,c).decision,'BLOCK_STALE');
});
test('requested limits and no external verification flag are fail closed',async()=>{
 const d=doc('a.md','text');await assert.rejects(()=>run([d],undefined,{network_requested:true}),/UNAUTHORIZED_OPTION/u);
 await assert.rejects(()=>run([d],undefined,{check_external:true}),/UNAUTHORIZED_OPTION/u);
 await assert.rejects(()=>run([d],undefined,{locale:'unknown'}),/UNAUTHORIZED_OPTION/u);
 await assert.rejects(()=>run([doc('a.md','a'.repeat(R.MAX_FILE_BYTES+1))]),/SIZE_BUDGET/u);
 await assert.rejects(()=>run([d,d]),/DUPLICATE_ALLOWLIST/u);
});
test('A preregistered known cases G01-G10 partial scoped evidence only (not 80/80)',async()=>{
 const cases=[
  ['G01',await run([doc('docs/index.md','[x](./guide.md)'),doc('docs/guide.md','# Guide')]),'PASS'],
  ['G02',await run([doc('docs/index.md','[x](./gone.md)'),{path:'docs/gone.md',missing:true}]),'BLOCK'],
  ['G03',await run([doc('docs/index.md','# Install\n[x](#install)')]),'PASS'],
  ['G04',await run([doc('docs/index.md','# Install\n[x](#invisible)')]),'BLOCK'],
  ['G05',await run([doc('index.md','[x](Docs/Guide.md)'),doc('docs/guide.md','# Guide')]),'WARN'],
  ['G06',await run([doc('README.zh-CN.md','[x](./docs.zh-CN.md#install)'),doc('docs.zh-CN.md','# **安装指南**')]),'UNKNOWN'],
  ['G07',await run([doc('index.md','[x](./user_(v2)/index.md)'),doc('user_(v2)/index.md','OK')]),'PASS'],
  ['G09',await run([doc('index.md','[x](https://example.invalid/docs)')]),'UNKNOWN'],
  ['G10',await run([doc('index.md','# Setup\n# Setup\n[x](#setup-1)')]),'PASS']
 ];for(const [id,o,want]of cases)assert.equal(o.decision,want,id);
});
test('CLI dry run: explicit local root, standalone allowlist, no source writes, root-safe output, stale gate',()=>withTemp(dir=>{
 const root=path.join(dir,'project'),outside=path.join(dir,'outside');fs.mkdirSync(root);fs.mkdirSync(outside);fs.mkdirSync(path.join(root,'docs'));
 const index=path.join(root,'index.md'),guide=path.join(root,'docs/guide.md');fs.writeFileSync(index,'[docs](docs/guide.md#overview)');fs.writeFileSync(guide,'# Overview\n');const before=fs.readFileSync(index);
 const allow=path.join(outside,'allow.json'),report=path.join(outside,'receipt.json'),later=path.join(outside,'after.json');
 fs.writeFileSync(allow,JSON.stringify({file_allowlist:['index.md','docs/guide.md'],locale:'zh-TW'}));
 let x=cp.spawnSync(process.execPath,[CLI,'--root',root,'--allowlist',allow,'--report',report],{encoding:'utf8'});assert.equal(x.status,0,x.stderr);assert(fs.existsSync(report));assert.deepEqual(fs.readFileSync(index),before);
 const data=JSON.parse(fs.readFileSync(report));assert.equal(data.decision,'PASS');assert(!JSON.stringify(data).includes(root));
 fs.writeFileSync(guide,'# Other\n');x=cp.spawnSync(process.execPath,[CLI,'--root',root,'--allowlist',allow,'--report',later,'--baseline',report],{encoding:'utf8'});
 assert.equal(x.status,2);assert.equal(JSON.parse(fs.readFileSync(later)).decision,'BLOCK_STALE');
}));
test('CLI refuses root-symlinks, file-symlinks and hidden allowlisted reads',()=>withTemp(dir=>{
 const root=path.join(dir,'project'),out=path.join(dir,'outside');fs.mkdirSync(root);fs.mkdirSync(out);fs.writeFileSync(path.join(root,'good.md'),'ok');
 const allow=path.join(out,'allow.json');const receipt=path.join(out,'receipt.json');
 fs.writeFileSync(allow,JSON.stringify({file_allowlist:['good.md']}));
 fs.symlinkSync(root,path.join(dir,'root_link'),'dir');
 let x=cp.spawnSync(process.execPath,[CLI,'--root',path.join(dir,'root_link'),'--allowlist',allow,'--report',receipt],{encoding:'utf8'});
 assert.equal(x.status,2);assert.equal(fs.existsSync(receipt),false);
 fs.writeFileSync(allow,JSON.stringify({file_allowlist:['linked.md']}));fs.symlinkSync(path.join(root,'good.md'),path.join(root,'linked.md'));
 x=cp.spawnSync(process.execPath,[CLI,'--root',root,'--allowlist',allow,'--report',receipt],{encoding:'utf8'});assert.equal(x.status,2);
 fs.writeFileSync(allow,JSON.stringify({file_allowlist:['.env']}));
 x=cp.spawnSync(process.execPath,[CLI,'--root',root,'--allowlist',allow,'--report',receipt],{encoding:'utf8'});assert.equal(x.status,2);
}));

test('unclosed fences produce parser uncertainty, not a false PASS on zero links',async()=>{
 const a=await run([doc('index.md','```js\n[not-link](unknown.md)')]);assert.equal(a.decision,'UNKNOWN');assert.equal(a.summary.unknown_count,1);assert.equal(a.source_files[0].validation_status,'PARSER_UNCERTAIN');
});
test('plain reference brackets and external HTML autolinks cannot yield PASS',async()=>{
 const a=await run([doc('index.md','[short-ref]\n<https://example.invalid/guide>\n<a href="/docs">open</a>')]);assert.equal(a.decision,'UNKNOWN');assert.equal(a.summary.unknown_count,3);assert(reasons(a).includes('REFERENCE_OR_BRACKET_UNSUPPORTED'));
});
test('nested HTML blocks do not leak links into live Markdown graph',async()=>{
 const a=await run([doc('index.md','<div>\n<div>\n</div>\n[x](no.md)\n</div>\n[ok](yes.md)'),doc('yes.md','# Yes')]);assert.equal(a.decision,'PASS');assert.equal(a.summary.edges_checked,1);
});
test('unterminated line-comment after prose is conservative uncertainty, not a fake PASS',async()=>{
 const a=await run([doc('index.md','Hello <!-- secret\n[x](absent.md)')]);assert.equal(a.decision,'UNKNOWN');assert.equal(a.summary.edges_checked,0);
});
test('empty fragment is UNKNOWN, never PASS',async()=>{
 const a=await run([doc('index.md','[x](#)')]);assert.equal(a.decision,'UNKNOWN');assert.equal(a.edges[0].reason_code,'EMPTY_FRAGMENT');
});
