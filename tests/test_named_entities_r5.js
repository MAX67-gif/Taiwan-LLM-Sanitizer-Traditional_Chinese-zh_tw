'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const entities=require('../src/core/entities.js');
const core=require('../src/core/engine.js');
const {protect,BrowserLocalProvider}=require('../src/core/provider.js');
const QA=require('../tools/translation_qa.js');
test('Codex for Open Source is a program name, not 開源法典',()=>{
 const input='Learn about Codex for Open Source and OpenAI Codex.';
 assert.equal(core.translateText(input),input);
 const spans=entities.find(input);
 assert.equal(spans[0].literal,'Codex for Open Source');
 assert.equal(spans.length,2);
 const report=entities.audit('Codex for Open Source','開源法典');
 assert.equal(report.ok,false);
 assert.ok(report.issues.some(x=>x.code==='KNOWN_MISTRANSLATION'));
 assert.ok(report.issues.some(x=>x.code==='PROTECTED_NAME_CHANGED'));
});
test('Brand and official product names are preserved without losing Taiwan terms',()=>{
 assert.equal(core.translateText('使用 OpenAI Codex 管理数据库'),'使用 OpenAI Codex 管理資料庫');
 assert.equal(core.translateText('Claude Code + GitHub + Tampermonkey'),'Claude Code + GitHub + Tampermonkey');
 assert.deepEqual(entities.find('myCodexExtension'),[]);
});
test('Name guard keeps order and original casing',()=>{
 const source='Codex for Open Source is supported by OpenAI.';
 const masked=entities.mask(source);
 assert.equal(masked.ok,true);
 assert.equal(masked.spans.length,2);
 assert.deepEqual(masked.restore(masked.text),{ok:true,text:source});
 assert.equal(masked.restore('translated without any protected token').ok,false);
 const guarded=protect(source);
 assert.equal(guarded.ok,true);
 assert.equal(guarded.restore(guarded.text).text,source);
});
test('Provider rejects a corrupted named program from model',async()=>{
 const model={Translator:{availability:async()=> 'available',
  create:async()=>({translate:async()=> '開源法典'})}};
 const provider=new BrowserLocalProvider({environment:model,sourceLanguage:'en'});
 const source='Codex for Open Source';
 const result=await provider.translate(source);
 assert.equal(result.text,source);
 assert.equal(result.reason,'GUARD_REJECTED');
 provider.destroy();
});
test('Debug checker catches lost product names and template variables',()=>{
 const source='Codex for Open Source uses {{user_id}} and https://example.com/path';
 const damaged='開源法典會使用使用者代號';
 const result=QA.inspect(source,damaged);
 assert.equal(result.ok,false);
 assert.equal(result.piiUploaded,false);
 assert.ok(result.issues.some(x=>x.code==='PROTECTED_NAME_CHANGED'));
 assert.ok(result.issues.some(x=>x.code==='PROTECTED_STRUCTURE_MISSING'));
 const valid=QA.inspect(source,source);
 assert.equal(valid.ok,true);
 assert.equal(valid.semanticEquivalenceVerified,false);
});
