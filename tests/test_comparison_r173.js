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

/* R194: 52 original counterexample pairs. Research/Shadow: no lexical promotion. */
const R194=require('../research/comparison/r173/context_contrasts_r194.js');

test('R194 52 contrast pairs are synthetic, rights-scoped, and structurally validated',()=>{
 const data=R194.load(),meta=R194.validate(data);
 assert.equal(data.cases.length,52);
 assert.equal(meta.case_count,52);
 assert.equal(meta.synthetic_positive_examples,52);
 assert.equal(meta.synthetic_negative_examples,52);
 assert.equal(meta.protected_examples,52);
 assert.equal(meta.auto_rewrite,false);
 assert.equal(meta.human_quality_verified,false);
 assert.equal(meta.source_text_in_receipt,false);
 assert.equal(meta.network_requests,0);
 assert(!JSON.stringify(meta).includes('餐館的 menu'));
});

test('R194 nonbinary: each positive, wrong-domain, protected and unknown routes stay manual',()=>{
 const data=R194.load();
 for(const row of data.cases){
  const modes=[
   [row.positive.text,R194.STATES.PREFERRED_SUGGESTION,false],
   [row.counterexample.text,R194.STATES.COUNTEREXAMPLE_BLOCK,false],
   [row.protected_example,R194.STATES.PROTECTED_KEEP,true],
   ['完全無關的未知句子',R194.STATES.UNKNOWN_KEEP,false],
  ];
  for(const [input,state,protectedExample] of modes){
   const result=R194.routeExactSynthetic(row,input,{protectedExample});
   assert.equal(result.id,row.id);
   assert.equal(result.state,state,row.id+' route');
   assert.equal(result.auto_apply,false,row.id+' must never self-approve');
   assert(!JSON.stringify(result).includes(row.positive.text));
  }
 }
});

test('R194 arbitrary new text is UNKNOWN_KEEP even if it contains a known term',()=>{
 const data=R194.load();
 for(const row of data.cases.slice(0,16)){
  const novel='這是剛寫的不同句子，包含 '+row.term+'，但尚未檢視。';
  assert.equal(R194.routeExactSynthetic(row,novel).state,R194.STATES.UNKNOWN_KEEP);
 }
});

test('R194 rejects duplicate IDs, deleted counterexample and false provenance',()=>{
 const baseline=R194.load();
 const mutations=[
  d=>{d.cases[1].id=d.cases[0].id;},
  d=>{d.cases[1].counterexample.text='沒有該術語';},
  d=>{d.cases[1].positive.mode='AUTO_REPLACE';},
  d=>{d.cases[1].provenance='SCRAPED_THIRD_PARTY';},
  d=>{d.cases[1].protected_example='not code';},
  d=>{d.cases[1].status='HUMAN_APPROVED';},
  d=>{d.cases[1].positive.suggested_tw=d.cases[1].counterexample.contextual_term;},
  d=>{d.research_only=false;},
  d=>{d.auto_rewrite=true;},
  d=>{d.human_quality_verified=true;},
  d=>{d.taxonomy=['PREFERRED_SUGGESTION'];},
  d=>{d.cases=d.cases.slice(0,15);},
 ];
 for(let index=0;index<mutations.length;index++){
  const copy=structuredClone(baseline);mutations[index](copy);
  assert.throws(()=>R194.validate(copy),/R194_/,String(index));
 }
});

test('R194 term patterns and domain count are bounded and no secret/user file is in cases',()=>{
 const data=R194.load();
 assert(new Set(data.cases.map(x=>x.domain)).size>=20);
 for(const row of data.cases){
  assert(!row.positive.text.includes('https://'));
  assert(!row.counterexample.text.includes('https://'));
  assert(!row.positive.text.includes('ghp_'));
  assert(!row.counterexample.text.includes('sk-proj-'));
  assert.equal(row.provenance,'ORIGINAL_SYNTHETIC_EXAMPLE');
  assert.equal(row.status,'NEEDS_HUMAN_REVIEW');
 }
});

test('R194 research-only source does not write outputs, call cloud models or translate',()=>{
 const src=require('node:fs').readFileSync(
   require('node:path').join(__dirname,'../research/comparison/r173/context_contrasts_r194.js'),'utf8');
 for(const api of ['fetch(', 'XMLHttpRequest', 'sendBeacon(', 'WebSocket(', 'writeFileSync(', 'chrome.cookies']){
  assert(!src.includes(api),api);
 }
 const data=R194.load();
 assert.equal(data.auto_rewrite,false);
 assert.equal(data.automatic_translation,false);
});


// R196 research-only contradiction-first semantics. Entirely on original
// synthetic R194 examples; no shipped dictionary or automatic replacement.
const R196=require('../research/comparison/r173/context_conflict_router_r196.js');

test('R196 all 52 synthetic contrasts route to five safe states, never auto-apply',()=>{
 const corpus=R194.load(),route=(row,texts)=>R196.routeContrastGroup(
   texts.map(text=>({id:row.id,text})),corpus);
 for(const row of corpus.cases){
  const positive=row.positive.text,negative=row.counterexample.text;
  const protectedText=row.protected_example;
  const unknown='這是新的未審核情境；'+row.term+' 應保持原詞。';
  const expectations=[
   [[positive],R196.STATES.PREFERRED_SUGGESTION],
   [[negative],R196.STATES.COUNTEREXAMPLE_BLOCK],
   [[protectedText],R196.STATES.PROTECTED_KEEP],
   [[unknown],R196.STATES.UNKNOWN_KEEP],
   [[positive,negative],R196.STATES.CONFLICT_KEEP],
   [[negative,positive],R196.STATES.CONFLICT_KEEP],
   [[positive,unknown],R196.STATES.UNKNOWN_KEEP],
   [[negative,unknown],R196.STATES.COUNTEREXAMPLE_BLOCK],
   [[positive,protectedText],R196.STATES.PROTECTED_KEEP],
   [[protectedText,negative],R196.STATES.PROTECTED_KEEP],
  ];
  for(const [samples,expected] of expectations){
   const decision=route(row,samples);
   assert.equal(decision.state,expected,row.id+' '+samples.length);
   assert.equal(decision.auto_apply,false);
   assert.equal(decision.promotion_permission,'NONE');
   assert.equal(decision.human_quality_verified,false);
   assert.equal(decision.network_requested,false);
   assert.equal(decision.source_text_in_result,false);
   assert(!JSON.stringify(decision).includes(positive));
   assert(!JSON.stringify(decision).includes(negative));
   assert(!JSON.stringify(decision).includes(unknown));
  }
 }
});

test('R196 exact-match only: unseen prose that contains a term abstains',()=>{
 const corpus=R194.load();
 for(const row of corpus.cases){
  const input='陌生語境中出現 '+row.term+' 並不等於正確替換。';
  const output=R196.routeContrastGroup([{id:row.id,text:input}],corpus);
  assert.equal(output.state,R196.STATES.UNKNOWN_KEEP,row.id);
  assert.equal(output.counts.unknown,1);
  assert.equal(output.auto_apply,false);
 }
});

test('R196 malformed and cross-term observations fail closed, not blended',()=>{
 const corpus=R194.load(),a=corpus.cases[0],other=corpus.cases[1];
 const cases=[
  null,{},[],[{}],[null],[undefined],
  [{id:'MISSING',text:a.positive.text}],
  [{id:a.id,text:null}],[{id:a.id,text:NaN}],
  [{id:a.id,text:a.positive.text,rule_override:'AUTO_APPROVE'}],
  [{id:a.id,text:a.positive.text},{id:other.id,text:other.positive.text}],
  [{id:a.id,text:a.positive.text},{id:a.id,text:a.positive.text}],
  Array.from({length:13},(_,i)=>({id:a.id,text:'不同原創句'+i+' '+a.term})),
  [{id:a.id,text:'x'.repeat(321)}],
  [{id:a.id,text:'\ud800'}],
  [{id:a.id,text:'\udc00'}],
  [{id:a.id,text:'bad\0file'}],
 ];
 for(let i=0;i<cases.length;i++)assert.throws(
  ()=>R196.routeContrastGroup(cases[i],corpus),/R196_/,
  'expected fail-closed case '+i);
});

test('R196 positive + unknown is abstention, negative + unknown remains blocked',()=>{
 const corpus=R194.load(),row=corpus.cases.find(x=>x.term==='menu');
 assert(row);
 const pack=texts=>R196.routeContrastGroup(texts.map(text=>({id:row.id,text})),corpus);
 const unknown='menu 是否真的代表軟體功能，需要另外判斷。';
 const p=pack([row.positive.text,unknown]);
 const n=pack([row.counterexample.text,unknown]);
 assert.equal(p.state,R196.STATES.UNKNOWN_KEEP);
 assert.equal(n.state,R196.STATES.COUNTEREXAMPLE_BLOCK);
 assert.equal(n.counts.negative,1);
 assert.equal(p.counts.positive,1);
 assert.equal(p.counts.unknown,1);
 assert.equal(Object.isFrozen(n),true);
 assert.equal(Object.isFrozen(n.counts),true);
});

test('R196 prohibits source exposure, network, disk writes and claimed quality',()=>{
 const file=require('node:fs').readFileSync(
   require('node:path').join(__dirname,'../research/comparison/r173/context_conflict_router_r196.js'),'utf8');
 for(const unsafe of ['fetch(', 'XMLHttpRequest', 'WebSocket(', 'sendBeacon(',
                      'writeFileSync(', 'writeFile(', 'gh release', 'AUTO_APPROVE']){
  assert(!file.includes(unsafe),'unsafe R196 source '+unsafe);
 }
 const row=R194.load().cases[0];
 const result=R196.routeContrastGroup([{id:row.id,text:row.positive.text}]);
 assert(!Object.keys(result).includes('text'));
 assert(!Object.keys(result).includes('source'));
 assert(!Object.keys(result).includes('prompt'));
 assert.equal(result.scope,'EXACT_ORIGINAL_SYNTHETIC_FIXTURES_ONLY');
});


// R197: synthetic 260-item human review queue, deliberately not user text.
const R197=require('../research/comparison/r173/context_review_queue_r197.js');
test('R197 emits exactly 52x5 conflict/protected/unknown review reasons without text',()=>{
 const report=R197.createReviewQueue();
 assert.equal(report.summary.case_count,52);
 assert.equal(report.summary.review_item_count,260);
 assert.equal(report.items.length,260);
 assert.deepEqual(Object.values(report.summary.state_count),[52,52,52,52,52]);
 assert.equal(report.summary.human_review_done,0);
 assert.equal(report.summary.automatic_rewrite_enabled,false);
 assert.equal(report.summary.release_permission,'NONE');
 assert.equal(report.summary.source_bytes_in_queue,false);
 assert.equal(report.summary.private_user_text_in_queue,false);
 assert.equal(report.summary.user_adoption_measured,false);
 assert.equal(report.summary.external_requests,0);
 assert(R197.validateQueue(report));
});

test('R197 review IDs, risks and fixture states are stable, source-free and distinct',()=>{
 const corpus=R194.load(),queue=R197.createReviewQueue();
 const ids=new Set(),pairIds=new Set(corpus.cases.map(c=>c.id));
 for(const item of queue.items){
  assert(!ids.has(item.review_id),item.review_id);ids.add(item.review_id);
  assert(pairIds.has(item.case_id));
  assert(/^CTX\d{3}__[a-z_]+$/.test(item.review_id));
  assert.equal(item.safe_to_auto_apply,false);
  assert.equal(item.human_review_status,'NOT_COLLECTED');
  assert.equal(item.suggested_action,'HUMAN_REVIEW_OR_KEEP');
  assert.equal(item.original_text_in_queue,false);
  assert(/^P[012]_REVIEW_[A-Z_]+$/.test(item.risk_priority));
  assert(!Object.hasOwn(item,'text'));
  assert(!Object.hasOwn(item,'source'));
  assert(!Object.hasOwn(item,'prompt'));
 }
 for(const row of corpus.cases){
  const subset=queue.items.filter(x=>x.case_id===row.id);
  assert.equal(subset.length,5);
  for(const text of [row.positive.text,row.counterexample.text,row.protected_example]){
   assert(!JSON.stringify(subset).includes(text),row.id+' leaked');
  }
 }
});

test('R197 prioritizes structure and contradictions before routine suggestions',()=>{
 const a=R197.createReviewQueue();
 assert.equal(a.summary.priority_count.P0_REVIEW_STRUCTURE,52);
 assert.equal(a.summary.priority_count.P0_REVIEW_CONFLICT,52);
 assert.equal(a.summary.priority_count.P1_REVIEW_WRONG_DOMAIN,52);
 assert.equal(a.summary.priority_count.P1_REVIEW_UNSEEN_CONTEXT,52);
 assert.equal(a.summary.priority_count.P2_REVIEW_WORDED_OPTION,52);
 const expected={
  protected_example:['PROTECTED_KEEP','P0_REVIEW_STRUCTURE'],
  positive_negative_conflict:['CONFLICT_KEEP','P0_REVIEW_CONFLICT'],
  negative_counterexample:['COUNTEREXAMPLE_BLOCK','P1_REVIEW_WRONG_DOMAIN'],
  unseen_context:['UNKNOWN_KEEP','P1_REVIEW_UNSEEN_CONTEXT'],
  positive_suggestion_only:['PREFERRED_SUGGESTION','P2_REVIEW_WORDED_OPTION'],
 };
 for(const item of a.items){
  assert.deepEqual([item.route,item.risk_priority],expected[item.fixture_kind],item.review_id);
 }
});

test('R197 rejects forged review approval, changed priority or omitted queue item',()=>{
 const original=R197.createReviewQueue();
 const changes=[
  x=>{x.summary.human_review_done=1;},
  x=>{x.summary.automatic_rewrite_enabled=true;},
  x=>{x.summary.release_permission='YES';},
  x=>{x.summary.full_language_accuracy_verified=true;},
  x=>{x.items[0].risk_priority='P3_AUTO_APPROVE';},
  x=>{x.items[0].safe_to_auto_apply=true;},
  x=>{x.items[0].source='CONFIDENTIAL';},
  x=>{x.items.pop();},
  x=>{x.items[1].review_id=x.items[0].review_id;},
 ];
 for(const mutate of changes){
  const cloned=structuredClone(original);mutate(cloned);
  assert.throws(()=>R197.validateQueue(cloned),/R197_/);
 }
});

test('R197 must reject R194 unapproved dataset changes instead of normalizing',()=>{
 const baseline=R194.load();
 for(const mutate of [
  d=>d.cases.pop(),
  d=>{d.cases[0].status='HUMAN_APPROVED';},
  d=>{d.cases[0].provenance='THIRD_PARTY_SCRAPE';},
  d=>{d.auto_rewrite=true;},
 ]){
  const d=structuredClone(baseline);mutate(d);
  assert.throws(()=>R197.createReviewQueue(d),/R194_|R197_/);
 }
});

test('R197 research-only queue source has no network or disk writer',()=>{
 const content=require('node:fs').readFileSync(
  require('node:path').join(__dirname,'../research/comparison/r173/context_review_queue_r197.js'),'utf8');
 for(const danger of ['fetch(', 'XMLHttpRequest','WebSocket(', 'sendBeacon(',
                      'writeFileSync(', 'writeFile(', 'gh release',
                      'auto_apply:true','license_review: "CERTIFIED"']){
  assert(!content.includes(danger),danger);
 }
 const q1=R197.createReviewQueue(),q2=R197.createReviewQueue();
 assert.equal(JSON.stringify(q1),JSON.stringify(q2));
 assert(Object.isFrozen(q1.summary));
 assert(Object.isFrozen(q1.items));
 assert(Object.isFrozen(q1.items[0]));
});
