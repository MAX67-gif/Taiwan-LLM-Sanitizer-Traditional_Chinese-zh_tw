/* R3 user wording preferences: do not censor, preserve original, never fake tone support. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const preferences=require('../src/core/preferences.js');
const core=require('../src/core/engine.js');
const {createRouter}=require('../src/core/provider.js');
test('Four wording choices are explicit, neutral and validated',()=>{
 assert.deepEqual(preferences.LEVELS,['original','light','balanced','taiwan']);
 assert.equal(preferences.normalize({regionalPreference:'unexpected'}).regionalPreference,'balanced');
 assert.equal(preferences.normalize({regionalPreference:'original'}).regionalPreference,'original');
 assert.equal(preferences.normalize({tone:'arbitrary'}).tone,'faithful');
 assert.equal(preferences.normalize({tone:'natural'}).tone,'natural');
 assert.equal(preferences.explainPolicy({tone:'natural'}).toneAppliedByChromeTranslator,false);
 assert.equal(preferences.explainPolicy().candidateCorpusAutoApplied,false);
});
test('Original choice preserves region terms, English and templates',()=>{
 for(const word of ['软件','数据库','Search','menu','菜单','AI Agent','青少年用語']){
   assert.equal(core.translateText(word,{regionalPreference:'original',domain:'ui'}),word);
 }
 const template='{{菜单}}  + '+String.fromCharCode(36)+'{USER}';
 assert.equal(core.translateText(template,{regionalPreference:'original',domain:'ui'}),template);
});
test('Light avoids ambiguous menus; balanced domain choice follows sense',()=>{
 assert.equal(core.translateText('菜单',{regionalPreference:'light',domain:'ui'}),'菜单');
 assert.equal(core.translateText('菜单',{regionalPreference:'balanced',domain:'ui'}),'選單');
 assert.equal(core.translateText('菜单',{regionalPreference:'balanced',domain:'food'}),'菜單');
 assert.equal(core.translateText('menu',{regionalPreference:'taiwan',domain:'food'}),'菜單');
 assert.equal(core.translateText('menu',{regionalPreference:'balanced',domain:'general'}),'menu');
});
test('Lower levels do not disable known safe technical localization unnecessarily',()=>{
 assert.equal(core.translateText('数据库、软件',{regionalPreference:'light'}),'資料庫、軟體');
 assert.equal(core.translateText('数据库、软件',{regionalPreference:'balanced'}),'資料庫、軟體');
});
test('Browser Router forwards per-node preference without any network calls',async()=>{
 const router=createRouter({mode:'terms'});
 assert.equal((await router.translate('菜单',{regionalPreference:'original',domain:'ui'})).text,'菜单');
 assert.equal((await router.translate('菜单',{regionalPreference:'balanced',domain:'ui'})).text,'選單');
 assert.equal((await router.translate('菜单',{regionalPreference:'taiwan',domain:'food'})).text,'菜單');
 router.destroy();
});
