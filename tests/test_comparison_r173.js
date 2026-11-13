'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const B=require('../research/comparison/r173/naive_baseline.js');
const P=require('../research/comparison/r173/prepare_spans.js');

test('frozen six-alias comparator only, not R17.2 approval status',()=>{const rows=B.frozenRules();assert.equal(rows.length,6);assert.deepEqual(rows.find(x=>x.from==='數據庫'),{from:'數據庫',to:'資料庫'});});
test('literal baseline is deterministic and leftmost',()=>{
 const x=B.replaceLiteral('數據庫數據庫',[{from:'數據庫',to:'資料庫'}]);assert.equal(x.text,'資料庫資料庫');assert.equal(x.changed_occurrences,2);
});
test('equal protection and raw are different lanes (HTML/comment/fence)',async()=>{
 const sample='請修改數據庫。\n\n<!-- 數據庫 -->\n\n```text\n數據庫\n```\n';
 const spans=(await B.inspectSource(sample)).spans,rule=[{from:'數據庫',to:'資料庫'}];
 const raw=B.replaceLiteral(sample,rule),eq=B.replaceEditable(sample,spans,rule);
 assert.equal(raw.changed_occurrences,3);assert.equal(eq.changed_occurrences,1);
 assert.match(eq.text,/<!-- 數據庫 -->/u);assert.match(eq.text,/```text\n數據庫\n```/u);
 assert.equal(B.protectedRawChanges(sample,spans,rule),2);
});
test('same text in protected template, URL, inline code is untouched in L1',async()=>{
 const source='文件夾位置：{{數組}}；`數據庫`；https://example.org/服務器。\n';
 const spans=(await B.inspectSource(source)).spans, output=B.replaceEditable(source,spans,B.frozenRules()).text;
 assert(output.includes('{{數組}}'));assert.match(output,/`數據庫`/u);assert.match(output,/https:\/\/example.org\/服務器/u);
});
test('source hash and offsets are R16, code units not code points',async()=>{
 const s='😀 請修改數據庫。\n';const m=await P.prepare(s);assert.equal(m.offset_unit,'utf16');assert.equal(m.source_length_utf16,s.length);assert.equal(m.source_sha256,B.digest(s));
});
test('range gaps/overlap/out of bounds rejected',()=>{
 const s='數據庫';const bad=[[{id:'a',start:0,end:2},{id:'b',start:1,end:3}],[{id:'b',start:0,end:12}],[{id:'b',start:0,end:0}]];
 for(const spans of bad)assert.throws(()=>B.replaceEditable(s,spans,B.frozenRules()),/R173_INVALID_SPANS/u);
});
test('unpaired surrogate and excessive source rejected',()=>{
 assert.throws(()=>B.assertSource('\ud800abc'),/R173_UNPAIRED_SURROGATE/u);assert.throws(()=>B.assertSource('中'.repeat(30000)),/R173_SOURCE_REJECTED/u);
});
test('unknown or duplicate replacement rules not silently accepted',()=>{
 assert.throws(()=>B.replaceLiteral('hi',[{from:'x',to:'y'},{from:'x',to:'z'}]),/R173_RULES_REJECTED/u);
 assert.throws(()=>B.replaceLiteral('hi',[{from:'',to:'z'}]),/R173_RULES_REJECTED/u);
});
test('reported safe demo counts are metadata only with no source digest/text',async()=>{
 const original='數據庫在此。\n\n```\n數據庫\n```\n';const m=await B.compareLocal(original), serialized=JSON.stringify(m);
 assert.equal(m.evidence_class,'DEV_ONLY');assert.equal(m.human_quality_status,'NOT_MEASURED');assert.equal(m.opencc_status,'BASELINE_NOT_RUN');
 assert.equal(m.tls_automatic_changes,0);assert.equal(m.equal_span_protected_violations,0);assert.equal(m.network_requested,false);
 assert(!serialized.includes('數據庫'));assert(!serialized.includes(B.digest(original)));
});
test('no candidates does not become 100 percent success',async()=>{
 const report=await B.compareLocal('目前原始內容可以閱讀。\n');assert.equal(report.status,'STRUCTURAL_OBSERVATION_ONLY');
 assert.equal(report.tls_candidate_count,0);assert.equal(report.human_quality_status,'NOT_MEASURED');
});
test('strict Markdown rejection cannot be treated as successful equal protection',async()=>{
 const m=await B.compareLocal('{"message":"數據庫"}');assert.equal(m.status,'LIMITED');assert.equal(m.semantic_equivalence_verified,false);
});

// R192 research-only Unicode display threat-model checks. Do not claim the
// released R19 HTML uses the shadow formatter or that native chooser was tested.
const fsR192=require("node:fs"),pathR192=require("node:path"),vmR192=require("node:vm");
const {formatUntrustedFilenameLabel:label}=require("../research/comparison/r173/r19_filename_display_shadow.js");
const original=fsR192.readFileSync(pathR192.join(__dirname,"../src/r19/first_result_studio_r19.js"),"utf8");
test('frozen R19 R2 baseline retains direction overrides in its old display helper', () => {
  const match = original.match(/function safeDisplayName\(name\)\{[\s\S]*?\n\}/u);
  assert.ok(match, 'original R19 display helper must exist');
  const oldHelper = vmR192.runInNewContext('(' + match[0] + ')');
  const synthetic = 'readme\u202e.gpj.md';
  assert.equal(oldHelper(synthetic).includes('\u202e'), true,
    'previous source does not strip Unicode bidi control; this is a SHADOW observation');
  assert.equal(label(synthetic).label.includes('\u202e'), false);
});

test('bidi embeddings / isolates / Arabic direction mark are removed only from display', () => {
  const raw = '安全\u202e.txt\u202c\u2067.md\u2069\u061c';
  const result = label(raw);
  assert.equal(result.label, '安全.txt.md');
  assert.equal(result.removed_controls, 5);
  assert.equal(result.removed_bidi_controls, 5);
  assert.equal(result.changed, true);
  assert.equal(raw.includes('\u202e'), true, 'input remains unmodified');
});

test('invisible and C0/C1 controls cannot hide a misleading filename', () => {
  const raw = 'file\u0000\u001f\u007f\u0085\u200b\u2060\ufeff\u2028\u2029.txt';
  const result = label(raw);
  assert.equal(result.label, 'file.txt');
  assert.equal(result.removed_controls, 9);
  assert.equal(result.removed_bidi_controls, 0);
});

test('ordinary Taiwan Chinese, combining characters and emoji ZWJ remain untouched', () => {
  const examples = ['臺灣用語－資料庫.md', '文件e\u0301.markdown', '修稿🧑‍💻.txt', 'الملف.md'];
  for (const item of examples) {
    const result = label(item);
    assert.equal(result.label, item);
    assert.equal(result.changed, false);
  }
});

test('truncation is explicit and does not split a UTF-16 surrogate pair', () => {
  const source = '😀'.repeat(100) + '.md';
  const result = label(source);
  assert.equal(result.truncated, true);
  assert.equal(Array.from(result.label).length, 90);
  assert.equal(result.label.endsWith('…'), true);
  assert.equal(result.label.includes('\ufffd'), false);
  assert.equal(source.endsWith('.md'), true, 'original extension unchanged');
});

test('empty metadata and invalid limits fail predictably, never disclose source bytes', () => {
  const result = label(null);
  assert.equal(result.label, '未命名檔案');
  assert.equal(result.changed, true);
  for (const n of [0, 2, 257, NaN, 8.5]) {
    assert.throws(() => label('readme.md', n), /INVALID_DISPLAY_FILENAME_LIMIT/);
  }
  const synthetic = Object.freeze({ name: 'menu\u202e.md', source: 'TEST-SOURCE-PRIVATE' });
  const out = label(synthetic.name);
  assert.equal(synthetic.name, 'menu\u202e.md');
  assert.equal(JSON.stringify(out).includes(synthetic.source), false);
  assert.equal(Object.keys(out).includes('source'), false);
});
