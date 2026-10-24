'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),core=require('../src/core/bilingual_reader_r13.js');
const lexicon=JSON.parse(fs.readFileSync(path.join(root,'lexicon/ui_actions_r13.json'),'utf8'));
test('R13 action preference: UI mouse click = 點選, not generic click sound',()=>{
 assert.equal(lexicon.schema,'tls.ui-action-preferences.v1');
 assert.equal(lexicon.auto_apply,false);assert.equal(lexicon.examples.length,3);
 for(const entry of lexicon.examples){assert.equal(entry.recommended,'點選');assert.equal(entry.domain,'ui');assert.equal(entry.status,'user_confirmed_preference');}
 assert.deepEqual(core.uiActionHints('Click the settings button.','ui').map(x=>x.recommendation),['點選']);
 assert.deepEqual(core.uiActionHints('clickable','ui'),[]);
 assert.deepEqual(core.uiActionHints('click the settings button','general'),[]);
});
test('R13 read-only candidate guard protects names and technical markers',()=>{
 const source='Use Codex for Open Source in `foo()` and {{name}}, then run --dry-run. https://example.com';
 const pass=core.checkCandidate(source,'請在 Codex for Open Source 執行 `foo()`，帶入 {{name}}，使用 --dry-run。 https://example.com');
 assert.equal(pass.ok,true);assert.equal(pass.semanticQualityVerified,false);
 const bad=core.checkCandidate(source,'請在開源法典執行 foo()；帶入 name，使用 dry-run。');
 assert.equal(bad.ok,false);assert.ok(bad.failures.some(x=>x.term==='Codex for Open Source'));
 assert.ok(bad.failures.some(x=>x.term.includes('{{name}}')));
});
test('R13 repeated protected marker counts may not disappear',()=>{
 const result=core.checkCandidate('OpenAI Codex and OpenAI Codex','OpenAI Codex');assert.equal(result.ok,false);
 assert.equal(result.failures[0].expected,2);
});
test('R13 rejects private binary controls and oversized selections',()=>{
 assert.throws(()=>core.validText(' '.repeat(12)),/R13_INVALID_TEXT/);
 assert.throws(()=>core.validText('a'.repeat(6001)),/R13_INVALID_TEXT/);
 assert.throws(()=>core.validText('x\u0002'),/R13_INVALID_TEXT/);
 assert.throws(()=>core.checkCandidate('hello',' '),/R13_INVALID_TEXT/);
});
test('R13 same R9 profile can import mouse UI preference when user opts in',()=>{
 const glossary=require('../src/core/user_terms_r9.js');
 const input=JSON.parse(fs.readFileSync(path.join(root,'examples/TLS_R13_UI_Click_Glossary_20261025.json'),'utf8'));
 const rows=glossary.importProfile(JSON.stringify(input));assert.equal(rows.length,3);
 assert.equal(glossary.find(rows,'click','ui').replacement,'點選');
 assert.equal(glossary.find(rows,'点击','ui').replacement,'點選');
});
test('R13 dedicated preview code never mutates R5 or R11 implementation',()=>{
 const source=fs.readFileSync(path.join(root,'src/r13/reader_ui_r13.js'),'utf8');
 assert.ok(!source.includes('XMLHttpRequest('));assert.ok(!source.includes('fetch('));
 assert.ok(!source.includes('localStorage.'));assert.ok(!source.includes('document.cookie'));
 assert.ok(!source.includes('innerHTML='));assert.ok(!source.includes('textContent=translated'));
 assert.match(source,/checkCandidate/);assert.match(source,/user|點選|反白/u);
});
