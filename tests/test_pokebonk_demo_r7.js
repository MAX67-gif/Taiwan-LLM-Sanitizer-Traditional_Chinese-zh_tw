/* R7 display-only PokéBonk opt-in glossary. Never test or modify game state. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const profile=require('../src/demos/pokebonk/engine.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/demos/pokebonk/profile.json'),'utf8'));
const dict=profile.compile(data.entries);
test('scope is opt-in and strictly one unrelated fan game',()=>{
 assert.equal(data.source_host,'pokebonk.com');
 assert.equal(data.required_user_action,'explicit_opt_in_button_every_session');
 assert.equal(data.verified_current_game,false);
 assert.ok(data.entries.length>=100);
 assert.equal(profile.ALLOWED_HOSTS.has('pokebonk.com'),true);
 assert.equal(profile.ALLOWED_HOSTS.has('www.pokebonk.com'),true);
 assert.equal(profile.ALLOWED_HOSTS.has('pokesurvivor.com'),false);
 assert.equal(profile.ALLOWED_HOSTS.has('pokebonk.solais.cloud'),false);
});
test('original, conservative Taiwanese samples are exact-match only',()=>{
 assert.equal(profile.translateExact('主菜单',dict),'主選單');
 assert.equal(profile.translateExact('  妙蛙种子  ',dict),'  妙蛙種子  ');
 assert.equal(profile.translateExact('十万伏特',dict),'十萬伏特');
 assert.equal(profile.translateExact('技能',dict),'招式');
 assert.equal(profile.translateExact('Pikachu',dict),'皮卡丘');
 assert.equal(profile.translateExact('我很喜欢十万伏特',dict),'我很喜欢十万伏特');
 assert.equal(profile.translateExact('未知招式',dict),'未知招式');
 assert.equal(profile.translateExact('{{skill_name}}',dict),'{{skill_name}}');
 assert.equal(profile.translateExact('玩家_A',dict),'玩家_A');
});
test('no collisions in authored original profile entries',()=>{
 const entries=data.entries;
 assert.equal(new Set(entries.map(x=>x.from)).size,entries.length);
 assert.ok(entries.every(x=>x.confidence==='illustrative_unreviewed'));
 assert.ok(entries.every(x=>['pokemon','move','ui'].includes(x.kind)));
 assert.ok(entries.every(x=>x.from!==x.to));
});
test('old game build changes only warn, not block safe DOM matching',()=>{
 const view=(src)=>({
  location:{hostname:'pokebonk.com'},
  querySelectorAll:()=>src?[{getAttribute:()=>src}]:[]
 });
 assert.equal(profile.compatibility(view('/assets/main-changed-latest.js')).hostAllowed,true);
 assert.match(profile.compatibility(view('/assets/main-changed-latest.js')).advisory,/不同/u);
 assert.equal(profile.compatibility(view('')).hostAllowed,true);
 assert.equal(profile.compatibility({
  location:{hostname:'pokesurvivor.com'},querySelectorAll:()=>[]
 }).hostAllowed,false);
});
test('input labels and user/chat fields are not modified',()=>{
 const parent={nodeType:1,closest:(sel)=>sel.includes('[class*="nickname"]')?{}:null};
 assert.equal(profile.eligibleText({nodeType:3,parentElement:parent}),false);
 assert.equal(profile.eligibleText({nodeType:3,parentElement:{nodeType:1,closest:()=>null}}),true);
 assert.equal(profile.eligibleAttr({nodeType:1,closest:()=>null,matches:()=>false},'title'),true);
 assert.equal(profile.eligibleAttr({nodeType:1,closest:()=>null,matches:()=>false},'href'),false);
});
test('R7.1 shared boundary: protected player, chat, hidden, inert and CSS-hidden attrs',()=>{
 assert.equal(profile.VERSION,'0.1.1');
 for(const marker of ['[class*="player-name"]','[class*="chat"]','[data-user-content]','[hidden]','[aria-hidden="true"]','[inert]']){
  const el={nodeType:1,closest:sel=>sel.includes(marker)?{}:null,matches:()=>false};
  assert.equal(profile.eligibleText({nodeType:3,parentElement:el}),false,marker);
  assert.equal(profile.eligibleAttr(el,'title'),false,marker);
  assert.equal(profile.eligibleAttr(el,'aria-label'),false,marker);
 }
 const hidden={nodeType:1,closest:()=>null,matches:()=>false,style:{display:'none'}};
 assert.equal(profile.eligibleText({nodeType:3,parentElement:hidden}),false);
 assert.equal(profile.eligibleAttr(hidden,'title'),false);
 const visible={nodeType:1,closest:()=>null,matches:()=>false,style:{display:'block'}};
 assert.equal(profile.eligibleAttr(visible,'title'),true);
 assert.equal(profile.eligibleText({nodeType:3,parentElement:visible}),true);
});
test('disallowed activity absent from published sample runtime and builder',()=>{
 const runtime=fs.readFileSync(path.join(__dirname,'../src/demos/pokebonk/runtime.js'),'utf8');
 const builder=fs.readFileSync(path.join(__dirname,'../tools/build_pokebonk_demo_r7.py'),'utf8');
 const unsafe=[/\bfetch\(/u,/XMLHttpRequest\(/u,/new WebSocket\(/u,/GM_xmlhttpRequest\(/u,/document\.cookie/u,/localStorage\./u,/sessionStorage\./u,/\bCanvasRenderingContext2D\.prototype/u];
 for(const expression of unsafe)assert.equal(expression.test(runtime),false,String(expression));
 assert.equal(builder.includes('profile.json'),true);
 assert.equal(data.licensing.includes('No sprites'),true);
});
