'use strict';
const assert=require('node:assert/strict');const {test}=require('node:test');
const {createWordingSession:create}=require('../src/core/wording_assistant_r172.js');
const lock=(s)=>Object.isFrozen(s)&&Object.isFrozen(s.candidates)&&s.candidates.every(x=>Object.isFrozen(x)&&Object.isFrozen(x.options));
async function chooseText(s,text,word,context){let snapshot=await s.inspect();for(const c of snapshot.candidates){if(c.original_text!==text)continue;const option=c.options.find(x=>x.replacement===word&&(!context||x.context===context));if(!option)continue;snapshot=s.choose({snapshot_id:snapshot.snapshot_id,candidate_id:c.id,action:'CONFIRM',option_id:option.id});}return await s.preview({snapshot_id:snapshot.snapshot_id});}
test('original excerpt only: protected html comment/code/template/url remain unchanged',async()=>{
 const source='# Heading\n\n請在軟件中點擊 menu，請勿修改 `点击 menu` 與 {{USER_PATH}}。\n\n<!-- 點擊 menu 軟件 -->\n\n```js\nlet menu="点击";\n```\n';
 const s=create({source});const o=await s.inspect();assert(lock(o));assert.equal(o.state,'READY');
 assert(o.candidates.some(x=>x.original_text==='軟件'));
 assert(!o.candidates.some(x=>x.start>=source.indexOf('<!--')&&x.start<source.indexOf('-->')));
 const p=await chooseText(s,'軟件','軟體');assert(p.preview_text.includes('軟體中'));assert(p.preview_text.includes('<!-- 點擊 menu 軟件 -->'));
 assert(p.preview_text.includes('let menu="点击";'));assert(p.preview_text.includes('{{USER_PATH}}'));
 assert.equal(p.approval,'NONE');assert.equal(p.semantic_equivalence_verified,false);
});
test('two menus can use distinct contexts; another occurrence remains original',async()=>{
 const s=create({source:'在 menu 中設定；午餐 menu 上桌；第三個 menu 不要變。'});let o=await s.inspect();const cs=o.candidates.filter(x=>x.original_text==='menu');assert.equal(cs.length,3);
 for(const [idx,replacement] of [[0,'選單'],[1,'菜單']]){
  const opt=cs[idx].options.find(x=>x.replacement===replacement);
  o=s.choose({snapshot_id:o.snapshot_id,candidate_id:cs[idx].id,action:'CONFIRM',option_id:opt.id});
 }
 const result=await s.preview({snapshot_id:o.snapshot_id});assert(result.preview_text.includes('在 選單 中'));assert(result.preview_text.includes('午餐 菜單 上桌'));assert(result.preview_text.includes('第三個 menu 不要變'));
});
test('same segment mixed keep and confirm, decision invalidates old preview',async()=>{
 const s=create({source:'軟件、軟件、數據庫都是技術用語。'});let o=await s.inspect();const cs=o.candidates.filter(x=>x.original_text==='軟件');assert.equal(cs.length,2);
 o=s.choose({snapshot_id:o.snapshot_id,candidate_id:cs[0].id,action:'KEEP_ORIGINAL'});
 let c=o.candidates.find(x=>x.id===cs[1].id);o=s.choose({snapshot_id:o.snapshot_id,candidate_id:c.id,action:'CONFIRM',option_id:c.options[0].id});
 const p=await s.preview({snapshot_id:o.snapshot_id});assert(p.preview_text.includes('軟件、軟體、數據庫'));
 const d=o.candidates.find(x=>x.id===cs[1].id);o=s.choose({snapshot_id:o.snapshot_id,candidate_id:d.id,action:'SET_CONTEXT',context:'software'});
 assert.equal(o.candidates.find(x=>x.id===cs[0].id).choice,'KEEP_ORIGINAL');assert.equal(o.candidates.find(x=>x.id===cs[1].id).choice,'UNSELECTED');
 assert.throws(()=>s.choose({snapshot_id:p.snapshot_id+'-old',candidate_id:d.id,action:'RESET'}),/STALE_SNAPSHOT/);
 const safe=await s.preview({snapshot_id:o.snapshot_id});assert.equal(safe.preview_text,'軟件、軟件、數據庫都是技術用語。');
});
test('click statistics and sound false friends are not actionable',async()=>{
 const s=create({source:'請点击 按鈕。點擊率和點擊聲屬於統計與聲響。click聲與 click 鈕不同。'});const o=await s.inspect();
 assert(o.candidates.some(x=>x.original_text==='点击'&&x.options.some(a=>a.replacement==='點選')));
 const stats=o.candidates.filter(x=>['點擊','click'].includes(x.original_text)&&x.resolution==='BLOCKED');assert(stats.length>=2);
 const p=await s.preview({snapshot_id:o.snapshot_id});assert.equal(p.change_count,0);
});
test('json objects and key-looking prose fail closed',async()=>{
 for(const src of ['{"title":"軟件"}','["軟件"]','"title": "軟件"\n其他說明']){
  if(src.startsWith('{')||src.startsWith('[')){assert.throws(()=>create({source:src}),/UNSUPPORTED_CONTENT/);}
  else {const s=create({source:src});assert.equal((await s.inspect()).state,'REJECTED');}
 }
 const markdown=create({source:'[說明](guide.md)\n\n請使用軟件。'});assert.equal((await markdown.inspect()).state,'READY');
});
test('64kiB and surrogate limits',()=>{
 assert.throws(()=>create({source:'軟'.repeat(25000)}),/INPUT_LIMIT/);
 assert.throws(()=>create({source:'bad\ud800'}),/UNSUPPORTED_CONTENT/);
});
test('no silent overrun 120 max; cover count reported',async()=>{
 const source='請使用 '+('軟件 '.repeat(130));const s=create({source});const o=await s.inspect();assert.equal(o.candidates.length,120);assert.equal(o.coverage.omitted_candidate_count,10);
 assert(s.report().limited_count>=10);assert.equal(s.report().contains_original_text,false);
});
test('revoke blocks all later operations and strips report text',async()=>{
 const s=create({source:'這是一個軟件。'});let o=await s.inspect();o=s.choose({snapshot_id:o.snapshot_id,candidate_id:o.candidates[0].id,action:'KEEP_ORIGINAL'});
 assert.equal(s.report().keep_count,1);assert.equal(s.report().network_requested,false);
 s.revoke();s.revoke();assert.equal(s.report().source_sha256,null);
 assert.throws(()=>s.choose({snapshot_id:o.snapshot_id,candidate_id:'c00001',action:'RESET'}),/SESSION_REVOKED/);
 await assert.rejects(async()=>s.preview({snapshot_id:o.snapshot_id}),/SESSION_REVOKED/);
});
test('approved base catalog makes only suggestions and preserves unknown Japanese form',async()=>{
 const source='数据库、クリック 與 menu';const s=create({source});let o=await s.inspect();assert(o.candidates.find(x=>x.original_text==='数据库'));assert(!o.candidates.some(x=>x.original_text==='クリック'));const out=await s.preview({snapshot_id:o.snapshot_id});assert.equal(out.preview_text,source);
});
