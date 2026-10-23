/* R8 glossary review tests; never automatically replace text. */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {review,MAX_CHARS}=require('../src/core/term_review.js');
const src=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'../lexicon',p),'utf8')).entries;
const approved=src('approved_r3.json'),candidate=src('candidates_r3.json'),rows=[...approved,...candidate];
test('reuses fixed R3 counts without promoting 883 unverified words',()=>{
 assert.equal(approved.length,67);assert.equal(candidate.length,883);
 const r=review('安全护栏',rows,{stage:'candidate'});
 assert.equal(r.mode,'suggestion_only');assert.equal(r.originalUnchanged,true);
 assert.equal(r.suggestions[0].decision,'UNREVIEWED_CANDIDATE');
});
test('menu is ambiguous in auto domain; food and UI differ',()=>{
 const r=review('menu',rows);assert.equal(r.suggestions.length,1);
 assert.equal(r.suggestions[0].decision,'CONTEXT_REQUIRED');
 assert.equal(r.suggestions[0].selected,null);
 assert.equal(review('menu',rows,{domain:'food'}).suggestions[0].selected,'菜單');
 assert.equal(review('menu',rows,{domain:'ui'}).suggestions[0].selected,'選單');
 assert.equal(review('menu',rows,{domain:'ui'}).suggestions[0].autoApplied,false);
});
test('longest term wins; sensitive syntax is ignored',()=>{
 const tick=String.fromCharCode(96),dollar=String.fromCharCode(36);
 const s='主菜单 '+tick+'menu'+tick+' https://example.test/menu '+dollar+'{menu} {{menu}} menu';
 const x=review(s,rows,{domain:'ui'}).suggestions;
 assert.ok(x.some(a=>a.found==='主菜单'));
 assert.equal(x.filter(a=>a.found==='菜单').length,0);
 assert.equal(x.filter(a=>a.found==='menu').length,1);
});
test('fenced code is excluded and HTML tags remain structurally untouched',()=>{
 const fence=String.fromCharCode(96).repeat(3);
 const input=fence+'js\nmenu\n'+fence+'\nmenu <button title="menu">菜单</button>';
 const x=review(input,rows,{domain:'ui'}).suggestions;
 assert.equal(x.filter(a=>a.found==='menu').length,1);
 assert.ok(x.some(a=>a.found==='菜单'));
});
test('no substring match of Latin identifiers; bounds are enforced',()=>{
 assert.equal(review('submenubar',rows).suggestions.length,0);
 assert.throws(()=>review('x'.repeat(MAX_CHARS+1),rows),/INPUT_TOO_LONG/);
});
