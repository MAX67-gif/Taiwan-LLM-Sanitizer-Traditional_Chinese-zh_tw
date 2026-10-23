'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const pack=require('../src/core/lexicon_pack.js');
const core=require('../src/core/engine.js');
const candidates=require('../lexicon/candidates_r3.json');
const approved=require('../lexicon/approved_r3.json');
test('large categorized but non-prescriptive public candidate corpus',()=>{
 assert.ok(candidates.entries.length>=800);
 assert.ok(new Set(candidates.entries.map(x=>x.domain)).size>=12);
 for(const r of candidates.entries){
   assert.equal(r.review_status,'candidate');
   assert.equal(r.automation,'suggestion_only');
   assert.equal(r.evidence_status,'requires_independent_review');
   assert.ok(r.from&&r.to&&r.domain);
 }
});
test('browser pack exactly mirrors safe editorial seed',()=>{
 assert.equal(pack.VERSION,'0.4.0');
 assert.equal(pack.ENTRIES.length,approved.entries.length);
 const slim=approved.entries.map(({id,from,to,domain,scope,source_locale})=>({id,from,to,domain,scope,source_locale}));
 assert.deepEqual(pack.ENTRIES,slim);
 assert.ok(pack.stats().defaultEnabled<pack.stats().entries);
});
test('menu is polysemous and never globally censored or rewritten',()=>{
 assert.equal(core.translateText('menu'),'menu');
 assert.equal(core.translateText('菜单'),'菜单');
 assert.equal(core.translateText('菜單'),'菜單');
 assert.equal(core.translateText('Menu',{domain:'ui'}),'選單');
 assert.equal(core.translateText('Main menu',{domain:'ui'}),'主選單');
 assert.equal(core.translateText('菜单',{domain:'ui'}),'選單');
 assert.equal(core.translateText('菜单',{domain:'food'}),'菜單');
 assert.equal(core.translateText('menu',{domain:'food'}),'菜單');
});
test('English boundaries avoid substring replacements and mixed identifiers',()=>{
 assert.equal(pack.normalize('submenu',{domain:'ui'}).text,'submenu');
 assert.equal(pack.normalize('main menu',{domain:'ui'}).text,'主選單');
 assert.equal(pack.normalize('get菜单',{domain:'ui'}).text,'get菜单');
 assert.equal(pack.normalize('menu_value',{domain:'ui'}).text,'menu_value');
});
test('preserves R2 meanings, code snippets, templates and URLs',()=>{
 assert.equal(core.translateText('数据库、软件'),'資料庫、軟體');
 assert.equal(core.translateText('https://x.test/菜单'), 'https://x.test/菜单');
 const tick=String.fromCharCode(96);
 assert.equal(core.translateText(tick+'菜单'+tick,{domain:'ui'}),tick+'菜单'+tick);
 assert.equal(core.translateText('{{菜单}}',{domain:'ui'}),'{{菜单}}');
 const dollar=String.fromCharCode(36);
 assert.equal(core.translateText(dollar+'{菜单}',{domain:'ui'}),dollar+'{菜单}');
});
test('domain conflicts remain user-choice instead of a banned-word list',()=>{
 assert.equal(pack.lookup('菜单').filter(x=>x.applies).length,0);
 assert.equal(pack.lookup('菜单',{domain:'food'}).filter(x=>x.applies)[0].to,'菜單');
 assert.equal(pack.lookup('菜单',{domain:'ui'}).filter(x=>x.applies)[0].to,'選單');
});
