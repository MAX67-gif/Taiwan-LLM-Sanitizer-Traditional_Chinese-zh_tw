/* TLS R9 manual glossary and reversible preview tests. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const path=require('node:path'),gloss=require('../src/core/user_terms_r9.js');
const review=require('../src/core/term_review.js').review;
const roots=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'../lexicon',p),'utf8')).entries;
const catalog=[...roots('approved_r3.json'),...roots('candidates_r3.json')];
test('choice-based language profile with no banned wording',()=>{
 let rows=gloss.upsert([],{source:'菜单',replacement:'選單',domain:'ui',action:'replace'});
 rows=gloss.upsert(rows,{source:'menu',replacement:'菜單',domain:'food',action:'replace'});
 rows=gloss.upsert(rows,{source:'菜单',domain:'food',action:'keep'});
 assert.equal(rows.length,3);assert.equal(gloss.find(rows,'菜单','ui').replacement,'選單');
 assert.equal(gloss.find(rows,'菜单','food').action,'keep');
 assert.equal(gloss.find(rows,'menu','general'),null);
 assert.throws(()=>gloss.upsert(rows,{source:'<script>',replacement:'選單',domain:'ui',action:'replace'}),/STRUCTURAL_HAZARD/);
 assert.throws(()=>gloss.upsert(rows,{source:'$'+'{API_KEY}',replacement:'Foo',domain:'ui',action:'replace'}),/STRUCTURAL_HAZARD/);
 assert.throws(()=>gloss.upsert(rows,{source:'menu',replacement:'Foo',domain:'auto',action:'replace'}),/UNKNOWN_DOMAIN/);
 assert.throws(()=>gloss.upsert(rows,{source:'menu',replacement:'Foo',domain:'ui',action:'replace',secret:'x'}),/UNKNOWN_ENTRY_FIELD/);
});
test('strict portable profile has no page text and requires explicit import',()=>{
 const rows=gloss.upsert([],{source:'menu',replacement:'主選單',domain:'ui',action:'replace',note:'我的專案習慣'});
 const file=gloss.exportProfile(rows);
 assert.deepEqual(gloss.importProfile(file),rows);
 assert.equal(file.includes('網頁測試隱私內容'),false);
 assert.equal(file.includes('source_text'),false);
 assert.throws(()=>gloss.importProfile('{"schema":"tls.personal-glossary.v1","locale":"zh-TW","entries":[],"source_text":"private"}'),/UNKNOWN_PROFILE_FIELD/);
 assert.throws(()=>gloss.importProfile(JSON.stringify({schema:gloss.SCHEMA,locale:'zh-TW',entries:[rows[0],rows[0]]})),/DUPLICATE_ENTRY/);
 assert.throws(()=>gloss.importProfile(JSON.stringify({schema:'foreign',locale:'zh-TW',entries:[]})),/INCOMPATIBLE_PROFILE/);
 assert.throws(()=>gloss.importProfile('x'.repeat(gloss.MAX_JSON_BYTES+1)),/INVALID_PROFILE_SIZE/);
});
test('menu is ambiguous and preview needs an explicit per-position choice',()=>{
 const source='menu、主菜单。餐廳 menu。';
 const hits=review(source,catalog);
 assert.equal(hits.suggestions[0].decision,'CONTEXT_REQUIRED');
 assert.equal(gloss.preview(source,hits.suggestions).text,source);
 const main=hits.suggestions.findIndex(x=>x.found==='主菜单');
 const menu=hits.suggestions.findIndex(x=>x.found==='menu');
 const output=gloss.preview(source,hits.suggestions,[
  {index:menu,to:'選單',domain:'ui'},{index:main,to:'主選單',domain:'ui'}
 ]);
 assert.equal(output.text,'選單、主選單。餐廳 menu。');
 assert.equal(output.changed,2);
 assert.equal(source,'menu、主菜单。餐廳 menu。');
 assert.throws(()=>gloss.preview(source,hits.suggestions,[{index:menu,to:'別的字',domain:'ui'}]),/CHOICE_NOT_IN_REVIEW/);
});
test('custom term remains review-only and code spans cannot be touched',()=>{
 const rows=gloss.reviewRows(gloss.upsert([],{source:'我的術語',replacement:'我偏好的說法',domain:'ui',action:'replace'}));
 const tick=String.fromCharCode(96),source='我的術語 + '+tick+'我的術語'+tick;
 const r=review(source,[...catalog,...rows],{domain:'ui'});
 assert.equal(r.suggestions.length,1);
 assert.equal(r.suggestions[0].selected,'我偏好的說法');
 assert.equal(r.suggestions[0].autoApplied,false);
 assert.equal(gloss.preview(source,r.suggestions,[{index:0,to:'我偏好的說法',domain:'ui'}]).changed,1);
});
