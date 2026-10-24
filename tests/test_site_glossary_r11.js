'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const source=require('../src/core/site_glossary_r11.js');
const r9=require('../src/core/user_terms_r9.js');
const rows=[
 {source:'menu',replacement:'選單',domain:'ui',action:'replace'},
 {source:'menu',replacement:'菜單',domain:'food',action:'replace'},
 {source:'設置',replacement:'設定',domain:'general',action:'replace'},
 {source:'menu',domain:'general',action:'keep'}
];
test('R11 enforces R9 schema and respects context, KEEP, and no auto guessing',()=>{
 assert.deepEqual(source.selectableRows(rows,'auto').map(x=>x.source),['設置']);
 const ui=source.selectableRows(rows,'ui');
 assert.equal(ui.find(x=>x.source==='menu').replacement,'選單');
 assert.equal(source.selectableRows(rows,'food').find(x=>x.source==='menu').replacement,'菜單');
 assert.throws(()=>source.selectableRows(rows,'unknown'),/INVALID_DOMAIN/);
 const overridden=[{source:'menu',replacement:'選單',domain:'general',action:'replace'},
  {source:'menu',domain:'food',action:'keep'}];
 assert.equal(source.selectableRows(overridden,'food').length,0);
 assert.equal(source.selectableRows(overridden,'ui').length,1);
});
test('only full Latin word matches, protected URL/JSON/code and placeholders excluded',()=>{
 const ui=source.selectableRows(rows,'ui');
 assert.equal(source.collectTextHits('menu documentmenu menu23',ui).length,1);
 for(const unsafe of ['https://example.org/menu','`menu`','{"menu": "foo"}',
  'Hello {{menu}}','Use ${menu} here','Use <script>menu</script>'])
  assert.deepEqual(source.collectTextHits(unsafe,ui),[]);
 assert.equal(source.collectTextHits('設置屬性',ui).length,1);
});
test('R11 never executes R3 candidates or enables automatic translation',()=>{
 assert.equal(typeof source.createSession,'function');
 assert.equal('autoApply' in source,false);
 const entries=r9.importProfile(r9.exportProfile(rows));
 assert.equal(entries.length,rows.length);
 assert.throws(()=>r9.importProfile(JSON.stringify({schema:r9.SCHEMA,locale:'zh-TW',entries:[{source:'{{x}}',replacement:'x',domain:'ui',action:'replace'}]})),/STRUCTURAL_HAZARD/);
});
