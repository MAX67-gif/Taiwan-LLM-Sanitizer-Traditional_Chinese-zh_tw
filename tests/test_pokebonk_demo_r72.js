'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const api=require('../src/demos/pokebonk_r72/engine.js');
const pack=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/demos/pokebonk_r72/profile.json'),'utf8'));
const glossary=api.compile(pack.entries);
function element(markers=[],visibility='visible'){
  return {nodeType:1,style:{display:visibility==='hidden'?'none':'block'},
    matches:()=>false,isContentEditable:false,
    closest:(selector)=>markers.some(token=>selector.includes(token))?{}:null,parentElement:null};
}
test('R7.2 is separate from frozen R7.1 and only targets the actual original game host',()=>{
 assert.equal(api.VERSION,'0.1.2');
 assert.equal(pack.schema,'tls.site_profile.pokebonk.v2');
 assert.equal(pack.source_host,'pokebonk.com');
 assert.equal(pack.required_user_action,'explicit_opt_in_button_every_session');
 assert.equal(pack.verified_current_game,false);
 assert.equal(pack.observed_dom_strings_verified,false);
 assert.equal(pack.reference_snapshot.source_type,'independent_public_patch_notes_not_direct_game_snapshot');
 assert.equal(api.ALLOWED_HOSTS.has('pokebonk.com'),true);
 for(const host of ['foo.pokebonk.com','pokebonk.games','pokesurvivor.com','maliciouspokebonk.com'])
  assert.equal(api.ALLOWED_HOSTS.has(host),false,host);
});
test('R7.2 compiled glossary preserves all original R7.1 mappings exactly',()=>{
 const old=JSON.parse(fs.readFileSync(path.join(__dirname,'../src/demos/pokebonk/profile.json'),'utf8'));
 for(const row of old.entries)assert.equal(glossary.get(row.from),row.to,row.from);
 assert.equal(old.version,'0.1.1');
 assert.equal(pack.entries.length,171);
 assert.equal(new Set(pack.entries.map(x=>x.from)).size,pack.entries.length);
});
test('new generic co-op and seasonal sample UI labels are exact-match only',()=>{
 for(const [a,b] of [['Co-op Room','合作房間'],['Create Room','建立房間'],['Join Room','加入房間'],
  ['Quick Chat','快捷聊天'],['Wardrobe','衣櫥'],['Mastery Looks','精通造型'],
  ['Season 2','第 2 賽季'],['FPS Limit','幀率上限'],['点击','點選'],['Click','點選']]){
  assert.equal(api.translateExact('  '+a+'  ',glossary),'  '+b+'  ',a);
  assert.equal(api.translateExact('Message from player: '+a,glossary),'Message from player: '+a);
 }
 assert.equal(api.translateExact('{{room_link}}',glossary),'{{room_link}}');
 assert.equal(api.translateExact('private://user',glossary),'private://user');
});
test('new entries remain editorial/unreviewed and no source-only element is copied',()=>{
 assert.ok(pack.entries.every(e=>e.confidence==='illustrative_unreviewed'));
 assert.ok(pack.entries.every(e=>['pokemon','move','ui'].includes(e.kind)));
 assert.ok(pack.reference_snapshot.reported_game_version==='0.8.31');
 assert.equal(pack.reference_snapshot.live_game_verified,false);
});
test('game module fingerprint is diagnostics, never gates safe DOM exact matching',()=>{
 const mock=(host,src)=>({location:{hostname:host},querySelectorAll:()=>src?[{getAttribute:()=>src}]:[]});
 assert.equal(api.compatibility(mock('pokebonk.com','/assets/main-new-patch.js')).hostAllowed,true);
 assert.equal(api.compatibility(mock('pokebonk.com','/assets/main-new-patch.js')).versionExactKnown,false);
 assert.equal(api.compatibility(mock('pokebonk.com','/assets/main-new-patch.js')).evidenceStatus,'LIVE_BUILD_NOT_VERIFIED');
 assert.equal(api.compatibility(mock('pokesurvivor.com','')).hostAllowed,false);
});
test('co-op chat and sensitive containers fail closed for visible text and title attributes',()=>{
 for(const marker of ['[class*="chat" i]','[id*="chat" i]','[data-testid*="chat" i]',
  '[class*="player" i]','[class*="username" i]','[class*="message" i]',
  '[role="log"]','[role="textbox"]','[data-user-content]',
  '[hidden]','[aria-hidden="true"]','[inert]','[contenteditable]','input','form']){
  let el=element([marker]);
  assert.equal(api.eligibleText({nodeType:3,parentElement:el}),false,marker);
  assert.equal(api.eligibleAttr(el,'title'),false,marker);
 }
});
test('CSS-hidden, unrelated attrs and unknown elements are not modified',()=>{
 assert.equal(api.eligibleText({nodeType:3,parentElement:element([],'hidden')}),false);
 assert.equal(api.eligibleAttr(element([],'hidden'),'aria-label'),false);
 assert.equal(api.eligibleText({nodeType:3,parentElement:element()}),true);
 assert.equal(api.eligibleAttr(element(),'aria-label'),true);
 assert.equal(api.eligibleAttr(element(),'href'),false);
});
test('R7.2 display-only release excludes network, game state, persistent storage and external userscript dependency',()=>{
 const r=fs.readFileSync(path.join(__dirname,'../src/demos/pokebonk_r72/runtime.js'),'utf8');
 const e=fs.readFileSync(path.join(__dirname,'../src/demos/pokebonk_r72/engine.js'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../dist/pokebonk/r72/TLS_Pokebonk_TW_Demo_R7_2_Tampermonkey_20261025.user.js'),'utf8');
 for(const expr of [/\bfetch\(/u,/XMLHttpRequest\(/u,/new WebSocket\(/u,/GM_xmlhttpRequest\(/u,/localStorage\./u,/sessionStorage\./u,/document\.cookie/u,/CanvasRenderingContext2D\.prototype/u,/WebGLRenderingContext\.prototype/u])
  assert.equal(expr.test(r+e),false,String(expr));
 assert.equal(js.includes('// @require'),false);
 assert.equal(js.includes('// @connect'),false);
 assert.equal(js.includes('// @grant        none'),true);
 assert.equal(r.includes('tls-pokebonk-r7-display-demo'),true,'exclude legacy R7.1 dual install');
 assert.equal(r.includes('MutationObserver'),true);
 assert.equal(r.includes('node.nodeValue===value.after'),true);
 assert.equal(r.includes('el.getAttribute(key)===v.after'),true);
});
