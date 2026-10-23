/* R2 provider safety and privacy regression. MIT. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/core/engine.js');
const {createRouter,BrowserLocalProvider,protect,normalizeLanguage}=require('../src/core/provider.js');
test('language tags and routing are explicit',()=>{
  assert.equal(normalizeLanguage('zh-TW'),'zh-Hant');
  assert.equal(normalizeLanguage('zh-CN'),'zh');
  assert.equal(normalizeLanguage('ja-JP'),'ja');
  assert.equal(normalizeLanguage('nonsense'),'');
  assert.equal(createRouter({mode:'invalid'}).mode,'terms');
});
test('offline terms stay fully local and retain R1 behavior',async()=>{
  const x=createRouter({mode:'terms'});
  assert.equal((await x.translate('软件 数据库')).text,'軟體 資料庫');
  assert.equal(x.status().state,'TERMS_ONLY');x.destroy();
});
test('round trip preserves placeholders, URLs, inline code, percent codes',()=>{
  const s=['Click ','{{user}}',' at ','https://a.test/软件',' with ',
    String.fromCharCode(36)+'{token}',' and %s',' or ',
    String.fromCharCode(96)+'code()',String.fromCharCode(96)].join('');
  const p=protect(s);
  assert.equal(p.ok,true);assert.ok(!p.text.includes('https://'));
  assert.deepEqual(p.restore(p.text),{ok:true,text:s});
  const first=p.text.match(/⟪TLS\d+LOCK⟫/u)[0];
  assert.equal(p.restore(p.text.replace(first,'oops')).ok,false);
  assert.equal(p.restore(p.text+first).ok,false);
});
test('mock Chrome Translator creates model, caches identical phrase and destroys',async()=>{
  const calls=[],progress=[];
  const fake={Translator:{
    availability:async ({sourceLanguage,targetLanguage})=>{
      calls.push(['availability',sourceLanguage,targetLanguage]);return 'downloadable';
    },
    create:async config=>{
      config.monitor({addEventListener:(name,cb)=>cb({loaded:1})});
      calls.push(['create',config.sourceLanguage,config.targetLanguage]);
      return {translate:async phrase=>{calls.push(['translate',phrase]);return '這是軟件檔案';},
        destroy:()=>calls.push(['destroy'])};
    }
  }};
  const p=new BrowserLocalProvider({environment:fake,sourceLanguage:'en',onProgress:e=>progress.push(e.state)});
  const one=await p.translate('Open the software.'),two=await p.translate('Open the software.');
  assert.equal(one.state,'LOCALIZED_MODEL');assert.equal(one.text,'這是軟體檔案');
  assert.deepEqual(two,one);
  assert.equal(calls.filter(c=>c[0]==='translate').length,1);
  assert.ok(progress.includes('MODEL_DOWNLOAD'));assert.ok(progress.includes('MODEL_READY'));
  assert.equal(p.status().cacheEntries,1);p.destroy();
  assert.ok(calls.some(c=>c[0]==='destroy'));
});
test('model corruption of protected tokens fails closed',async()=>{
  const fake={Translator:{availability:async()=> 'available',
    create:async()=>({translate:async()=> 'Translation with missing slot.'})}};
  const p=new BrowserLocalProvider({environment:fake,sourceLanguage:'en'});
  const input='Save '+String.fromCharCode(36)+'{SECRET} software';
  const r=await p.translate(input);
  assert.equal(r.reason,'GUARD_REJECTED');
  assert.equal(r.text,'儲存 '+String.fromCharCode(36)+'{SECRET} software');
  p.destroy();
});
test('unsupported browser never triggers a network request',async()=>{
  let calls=0;const env={fetch:()=>{calls++;throw Error('network forbidden');}};
  const p=new BrowserLocalProvider({environment:env,sourceLanguage:'en'});
  for(let i=0;i<4;i++)assert.equal((await p.translate('Server / 软件')).text,'Server / 軟體');
  assert.equal(calls,0);assert.equal(p.status().state,'DEGRADED');p.destroy();
});
test('auto source detection does not guess ambiguous unmarked English prose',async()=>{
  const p=new BrowserLocalProvider({environment:{},sourceLanguage:'auto'});
  const r=await p.translate('A general phrase of unknown source.');
  assert.equal(r.reason,'SOURCE_UNKNOWN');assert.equal(r.state,'UNCHANGED');p.destroy();
});
test('declared zh-Hant avoids neural translation',async()=>{
  let calls=0;const p=new BrowserLocalProvider({environment:{Translator:{create:async()=>{calls++;}}},
    documentLanguage:'zh-TW',sourceLanguage:'auto'});
  assert.equal((await p.translate('軟件')).text,'軟體');
  assert.equal(calls,0);p.destroy();
});
test('unavailable model circuit breaker protects resources',async()=>{
  let calls=0;const p=new BrowserLocalProvider({environment:{Translator:{
    availability:async()=> 'unavailable',create:async()=>{calls++;}
  }},sourceLanguage:'ja'});
  for(let i=0;i<4;i++)assert.equal((await p.translate('こんにちは')).text,'こんにちは');
  assert.equal(calls,0);assert.equal(p.status().failures,3);p.destroy();
});

test('protected placeholders must retain their relative order',()=>{
  const p=protect('Choose {{first}} then {{second}}');
  assert.equal(p.ok,true);
  const reversed=p.text.replace('⟪TLS0LOCK⟫','TEMP_SLOT')
    .replace('⟪TLS1LOCK⟫','⟪TLS0LOCK⟫').replace('TEMP_SLOT','⟪TLS1LOCK⟫');
  assert.deepEqual(p.restore(reversed),{ok:false,reason:'TOKEN_ORDER_CHANGED'});
});

test('preserve-original user choice disables model and dictionary changes',async()=>{
  let modelCalls=0;
  const env={Translator:{availability:async()=> 'available',create:async()=>{modelCalls++;return {translate:async()=> '翻譯'}}}};
  const provider=new BrowserLocalProvider({environment:env,sourceLanguage:'en'});
  const input='Search 软件 {{user}}';
  const result=await provider.translate(input,{regionalPreference:'original',domain:'ui'});
  assert.equal(result.text,input);
  assert.equal(result.state,'UNCHANGED');
  assert.equal(result.reason,'PRESERVE_ORIGINAL');
  assert.equal(modelCalls,0);
  provider.destroy();
});
