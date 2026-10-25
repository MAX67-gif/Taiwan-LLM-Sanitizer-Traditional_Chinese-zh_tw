'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const TLS=require('../src/core/protected_segments_r15.js');
const cli=require('../tools/r15_structured_localizer_cli.js');
const f=n=>fs.readFileSync(path.join(__dirname,'fixtures/r15',n),'utf8');
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
const editable=a=>a.segments.filter(s=>s.policy==='EDITABLE');
const spans=(a,source)=>a.segments.map(x=>({...x,text:source.slice(x.start,x.end)}));
function covered(a,source){assert.equal(a.segments[0]?.start??0,0);assert.equal(a.segments.at(-1)?.end??0,source.length);
 for(let i=1;i<a.segments.length;i++)assert.equal(a.segments[i-1].end,a.segments[i].start);
 for(const s of a.segments){assert(s.end>s.start);assert(['PROTECT','EDITABLE'].includes(s.policy));}}

test('metadata, sha256, utf16 full partition and no auto-approval',async()=>{
 const source='🇹🇼 Hello 世界\r\n';const a=await TLS.analyze(source,'markdown');
 assert.equal(a.schema,'tls.structured-segments.v1');assert.equal(a.offset_unit,'utf16');assert.equal(a.approval,'NONE');
 assert.equal(a.input_sha256,sha(source));assert.equal(a.input_bytes,Buffer.byteLength(source));covered(a,source);
});
test('markdown protects fences, headings, inline code, URLs, names and placeholders',async()=>{
 const s=f('original_markdown.md'),a=await TLS.analyze(s,'markdown');assert.equal(a.validation.status,'OK');covered(a,s);
 for(const protectedText of ['# 既有標題','{"id":"menu"','GitHub','`--output`','https://example.org/path?q=x','{{userName}}']){
  assert(spans(a,s).some(x=>x.policy==='PROTECT'&&x.text.includes(protectedText)),protectedText);
 }
 assert(editable(a).length>0);
});
test('markdown table pipe and separator protected but body text may be previewed',async()=>{
 const s='| 國文 | English |\n|:---|---:|\n| click menu | words |\n',a=await TLS.analyze(s,'markdown');covered(a,s);
 assert(spans(a,s).filter(x=>x.text.includes('|')).every(x=>x.policy==='PROTECT'));
 assert(spans(a,s).some(x=>x.policy==='EDITABLE'&&x.text.includes('click menu')));
});
test('markdown link target never editable (conservative labels too)',async()=>{
 const s='Please visit [docs](https://docs.example.org?q=1) now.\n',a=await TLS.analyze(s,'markdown');
 assert.equal(a.validation.status,'OK');assert(spans(a,s).some(x=>x.type==='link'&&x.text.includes('https://docs.example.org')));
});
test('markdown frontmatter remains byte-identical',async()=>{
 const s='---\ntitle: 保留\npath: /a\n---\nNext paragraph.\n',a=await TLS.analyze(s,'markdown');
 assert.equal(a.validation.status,'OK');assert(spans(a,s).find(x=>x.text.includes('title:')).policy==='PROTECT');
});
test('markdown/Prompt fenced and inline unclosed => fail closed',async()=>{
 for(const [fmt,s] of [['markdown','text\n```js\nconst x=1;\n'],['markdown','Hello `unclosed\n'],['prompt','```prompt\nsystem: no\n']]){
  const a=await TLS.analyze(s,fmt);assert.equal(a.validation.status,'REJECTED');assert.equal(a.mutable_count,0);assert.equal(a.segments[0].policy,'PROTECT');
 }
});
test('template syntax unclosed rejected',async()=>{const a=await TLS.analyze('Hi {{unclosed','markdown');assert.equal(a.validation.status,'REJECTED');});
test('indented code and reference links not editable',async()=>{
 const s='    const foo = 1\n[link]: https://x.org\nHello.\n',a=await TLS.analyze(s,'markdown');
 assert.equal(a.validation.status,'OK');for(const sub of ['const foo = 1','[link]: https://x.org'])assert(spans(a,s).some(x=>x.policy==='PROTECT'&&x.text.includes(sub)));
});
test('prompt role lines, code and variables protected',async()=>{
 const s=f('original_prompt.txt'),a=await TLS.analyze(s,'prompt');assert.equal(a.validation.status,'OK');covered(a,s);
 assert(spans(a,s).some(x=>x.reason==='PROMPT_ROLE_BOUNDARY'&&x.text.includes('system:')));
 assert(spans(a,s).some(x=>x.reason==='PROMPT_ROLE_BOUNDARY'&&x.text.includes('user:')));
 assert(spans(a,s).some(x=>x.policy==='PROTECT'&&x.text.includes('${API_KEY}')));
 assert(spans(a,s).some(x=>x.policy==='EDITABLE'&&x.text.includes('Describe the main menu')));
});
test('JSON key, machine fields, JSON escapes and nonstring structural bytes protected',async()=>{
 const s=f('original_json.json'),a=await TLS.analyze(s,'json');assert.equal(a.validation.status,'OK');covered(a,s);
 assert.equal(spans(a,s).filter(x=>x.type==='json_key'&&x.policy==='EDITABLE').length,0);
 for(const name of ['click the menu','請保留原詞'])assert(spans(a,s).some(x=>x.policy==='EDITABLE'&&x.text.includes(name)),name);
 assert(!spans(a,s).some(x=>x.policy==='EDITABLE'&&x.text.includes('https://example.org')));
 assert(!spans(a,s).some(x=>x.policy==='EDITABLE'&&x.text.includes('DO NOT CHANGE')));
});
test('JSON arrays, escaped strings, role content fail safe',async()=>{
 const s='{"text":"line\\nnext","items":["plain"],"role":"system","code":{"text":"danger"}}';
 const a=await TLS.analyze(s,'json');assert.equal(a.validation.status,'OK');assert.equal(a.mutable_count,0);
});
test('JSON malformed, duplicate keys and dangerous object properties reject all',async()=>{
 for(const s of ['{"text":"a",}', '{"text":1, "text":2}', '{"__proto__":{"text":"a"}}', '{"key":', '{"text":"\\uZZZZ"}']){
  const a=await TLS.analyze(s,'json');assert.equal(a.validation.status,'REJECTED',s);assert.equal(a.mutable_count,0);
 }
});
test('non-JSON top-level scalars accept valid and protect unknown',async()=>{
 const a=await TLS.analyze('"hi"','json');assert.equal(a.validation.status,'OK');assert.equal(a.mutable_count,0);
});
test('Unicode surrogate index spans always reflect JS UTF-16',async()=>{
 const s='Hello 👩‍💻，請 click menu。\r\n',a=await TLS.analyze(s,'markdown');covered(a,s);
 const seg=editable(a).find(x=>s.slice(x.start,x.end).includes('👩‍💻'));assert(seg);
});
test('BOM and CRLF line endings preserved in preview',async()=>{
 const s='\ufeffHere is English.\r\nSecond line.\r\n',a=await TLS.analyze(s,'markdown');covered(a,s);
 assert(spans(a,s).some(x=>x.type==='bom'&&x.policy==='PROTECT'));
 assert(spans(a,s).every(x=>x.type!=='newline'||x.policy==='PROTECT'));
 const target=editable(a)[0];const p=await TLS.preview(s,a,[{id:target.id,replacement:'繁體中文'}]);
 assert(p.preview_text.startsWith('\ufeff'));assert.equal(p.preview_text.match(/\r\n/g).length,2);assert(p.preview_text.includes('繁體中文'));
});
test('markdown empty text fully protect none',async()=>{const a=await TLS.analyze('','markdown');assert.equal(a.mutable_count,0);assert.equal(a.segments.length,0);});
test('input byte-size and binary prohibited',async()=>{
 await assert.rejects(TLS.analyze('x'.repeat(TLS.MAX_BYTES+1),'markdown'),/INPUT_TOO_LARGE/);
 await assert.rejects(TLS.analyze('a\0b','markdown'),/INPUT_BINARY_REJECTED/);
 await assert.rejects(TLS.analyze('a','html'),/INVALID_FORMAT_OR_TEXT/);
});
test('JSON safe preview changes only allowlisted value; keys/URL/format remain unchanged',async()=>{
 const s=f('original_json.json'),a=await TLS.analyze(s,'json'),e=editable(a).find(x=>s.slice(x.start,x.end)==='click the menu');
 const p=await TLS.preview(s,a,[{id:e.id,replacement:'點選主選單'}]);
 assert.equal(p.approval,'NONE');assert.equal(p.status,'SAFE_PREVIEW_NOT_APPLIED');assert.equal(p.change_count,1);
 assert.equal(JSON.parse(p.preview_text).text,'點選主選單');assert.equal(JSON.parse(p.preview_text).id,'menu');assert(p.preview_text.includes('https://example.org/api'));
 assert.equal(s,f('original_json.json'));
});
test('Markdown preview works and does not alter fences or names',async()=>{
 const s=f('original_markdown.md'),a=await TLS.analyze(s,'markdown'),e=editable(a).find(x=>s.slice(x.start,x.end).includes('這是可修改的'));
 const p=await TLS.preview(s,a,[{id:e.id,replacement:'這是一句更新後的說明'}]);
 assert(p.preview_text.includes('這是一句更新後的說明'));
 assert(p.preview_text.includes('https://example.org/x'));assert(p.preview_text.includes('GitHub'));
 assert.equal(p.change_count,1);
});
test('source SHA mismatch refused before preview',async()=>{
 const s='Please click menu',a=await TLS.analyze(s,'markdown');
 await assert.rejects(TLS.preview(s+'!!',a,[]),/SOURCE_HASH_MISMATCH/);
});
test('tampered analysis cannot bypass protected range',async()=>{
 const s='DO NOT modify `const x=1`',a=await TLS.analyze(s,'markdown');
 a.segments.find(x=>x.policy==='PROTECT'&&x.type==='inline_code').policy='EDITABLE';
 await assert.rejects(TLS.preview(s,a,[{id:a.segments.find(x=>x.type==='inline_code').id,replacement:'code replaced'}]),/ANALYSIS_TAMPERED/);
});
test('forged type/reordered/duplicate targets rejected',async()=>{
 const s='Please keep docs\n',a=await TLS.analyze(s,'markdown'),e=editable(a)[0];
 await assert.rejects(TLS.preview(s,a,[{id:'s99999',replacement:'hello'}]),/INVALID_TARGET/);
 await assert.rejects(TLS.preview(s,a,[{id:e.id,replacement:'你好'},{id:e.id,replacement:'第二次'}]),/INVALID_TARGET/);
});
test('unsafe replacement markers and control characters rejected',async()=>{
 const s='Please keep docs\n',a=await TLS.analyze(s,'markdown'),e=editable(a)[0];
 for(const content of ['','   ','# Heading','{{user}}','${TOKEN}','--force','https://evil.invalid','<script>', '[x]','hello\nnext']){
  await assert.rejects(TLS.preview(s,a,[{id:e.id,replacement:content}]),/UNSAFE_REPLACEMENT/,content);
 }
});
test('JSON plaintext with punctuation correctly encoded and typed parsed',async()=>{
 const s='{"text":"English"}',a=await TLS.analyze(s,'json');
 const p=await TLS.preview(s,a,[{id:editable(a)[0].id,replacement:'臺灣中文，請點選。'}]);
 assert.equal(JSON.parse(p.preview_text).text,'臺灣中文，請點選。');
});
test('unchanged edit is not reported as a change',async()=>{
 const s='Hello text',a=await TLS.analyze(s,'markdown');const p=await TLS.preview(s,a,[{id:editable(a)[0].id,replacement:'Hello text'}]);
 assert.equal(p.change_count,0);assert.equal(p.preview_sha256,sha(s));
});
test('empty plan preserves source and returns zero changes',async()=>{
 const s='No changes',a=await TLS.analyze(s,'markdown'),p=await TLS.preview(s,a,[]);
 assert.equal(p.preview_text,s);assert.equal(p.change_count,0);
});
test('public report redacts literal text, replacements and source paths',async()=>{
 const s='Sensitive words 12345',a=await TLS.analyze(s,'markdown'),r=TLS.publicReport(a);
 assert.equal(r.contains_original_text,false);assert.equal(r.transport,'NONE');
 assert(!JSON.stringify(r).includes('Sensitive words'));
});
test('CLI rejects wrong/missing or repeated params',()=>{
 assert.throws(()=>cli.parse(['--input','s']),/MISSING_REQUIRED_FIELDS/);
 assert.throws(()=>cli.parse(['--input','a','--format','markdown','--output','b']),/BAD_ARGUMENTS/);
 assert.throws(()=>cli.parse(['--input','a','--format','markdown','--edits','b']),/EDITS_REQUIRE_PREVIEW_OUTPUT/);
});
test('CLI local report is textless and never overwrites source or existing output',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r15-sandbox-'));
 try{
  const input=path.join(tmp,'input.md'),report=path.join(tmp,'report.json');fs.writeFileSync(input,'Only local text\n');
  await cli.main(['--input',input,'--format','markdown','--report',report]);
  const r=JSON.parse(fs.readFileSync(report,'utf8'));
  assert.equal(r.input_sha256,sha('Only local text\n'));assert(!fs.readFileSync(report,'utf8').includes('Only local text'));
  assert.equal(fs.readFileSync(input,'utf8'),'Only local text\n');
  await assert.rejects(cli.main(['--input',input,'--format','markdown','--report',report]),/OUTPUT_ALREADY_EXISTS/);
  await assert.rejects(cli.main(['--input',input,'--format','markdown','--report',input]),/WOULD_OVERWRITE_INPUT/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('CLI explicit edits writes independent preview only, leaves original',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r15-plan-'));
 try{
  const s='Read user docs.\n',input=path.join(tmp,'source.md'),plan=path.join(tmp,'plan.json'),output=path.join(tmp,'preview.md');
  fs.writeFileSync(input,s);const a=await TLS.analyze(s,'markdown');
  fs.writeFileSync(plan,JSON.stringify({schema:'tls.structured-edits.v1',input_sha256:a.input_sha256,edits:[{id:editable(a)[0].id,replacement:'閱讀使用者文件。'}]}));
  await cli.main(['--input',input,'--format','markdown','--edits',plan,'--preview-output',output]);
  assert.equal(fs.readFileSync(output,'utf8'),'閱讀使用者文件。\n');assert.equal(fs.readFileSync(input,'utf8'),s);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('browser without crypto.subtle uses identical deterministic offline SHA256',async()=>{
 const vm=require('node:vm'),src=fs.readFileSync(path.join(__dirname,'../src/core/protected_segments_r15.js'),'utf8');
 const ctx={TextEncoder,Uint8Array,Uint32Array,DataView,Set,Map,Object,Array,Number,RegExp};
 vm.createContext(ctx);vm.runInContext(src,ctx,{timeout:3000});
 for(const s of ['', 'This is 👨‍👩‍👧‍👧 and 日本語', 'X'.repeat(100000)]){
  const a=await ctx.TLSProtectedR15.analyze(s,'markdown');assert.equal(a.input_sha256,sha(s));
 }
});
test('R15 generated HTML includes source verbatim: protects dollar apostrophe from String.replace meta',()=>{
 const generated=fs.readFileSync(path.join(__dirname,'../examples/TW_Structured_Integrity_Lab_R15_20261025.html'),'utf8');
 const src=fs.readFileSync(path.join(__dirname,'fixtures/r15/R15_0_1_0_LOCKED_CORE.js'),'utf8');
 const name=fs.readFileSync(path.join(__dirname,'../src/core/entities.js'),'utf8');
 assert(generated.includes(src),'original source not embedded byte-identically');assert(generated.includes(name));
 assert.equal(generated.includes('__TLS_R15_CORE__'),false);
});
test('other packages R5/R11/R13 are not included in R15 core',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../src/core/protected_segments_r15.js'),'utf8');
 for(const pattern of ['fetch(', 'XMLHttpRequest(', 'GM_xmlhttpRequest(', 'WebSocket(', 'localStorage.', 'chrome.tabs.'])assert(!src.includes(pattern));
});


test('R15 rejects markdown punctuation injections and BiDi controls in candidate edits',async()=>{
 const s='Safe English prose\n', a=await TLS.analyze(s,'markdown');
 const id=editable(a)[0].id;
 for(const value of ['---','***','___','**spoof**','_variable_','| table |','\\escaped','alpha\u202Etxt','OK\u2066LRI']){
  await assert.rejects(TLS.preview(s,a,[{id,replacement:value}]),/UNSAFE_REPLACEMENT/,value);
 }
});
test('R15 rejects lone surrogate code units before SHA to prevent Unicode aliasing',async()=>{
 for(const s of ['a\uD800b','a\uDC00b','\uD800'])await assert.rejects(TLS.analyze(s,'markdown'),/UNPAIRED_SURROGATE/);
 const a=await TLS.analyze('Hi 👩‍💻!','markdown');assert.equal(a.validation.status,'OK');
});
test('R15 retains stable analysis partitions and does not edit the source for rejected inputs',async()=>{
 const src='Hello world\n';const a=await TLS.analyze(src,'markdown'),id=editable(a)[0].id;
 for(const bad of ['# heading','[link](site)','<img>','\u0007hello'])await assert.rejects(TLS.preview(src,a,[{id,replacement:bad}]));
 assert.equal(src,'Hello world\n');
});
