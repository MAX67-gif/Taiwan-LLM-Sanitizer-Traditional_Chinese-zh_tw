'use strict';
// Behavioral VM integration, not a native-browser certification.
// Executes the real frozen engine and UI with a small DOM adapter; a separate
// Playwright test covers layout, genuine file input and native downloads.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const isBaseline=process.env.TLS_R19_BASELINE==='1';
const uiPath=isBaseline?'src/r183/first_result_studio_r183.js':'src/r19/first_result_studio_r19.js';
const templatePath=isBaseline?'tools/templates/first_result_studio_r183.html':'tools/templates/first_result_studio_r19.html';

class Element {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.parentNode=null;this.dataset={};this.attributes={};this.handlers={};this.hidden=false;this.disabled=false;this._value='';this._text='';this.className='';this.classList={toggle:(c,on)=>{const a=new Set(this.className.split(' ').filter(Boolean));if(on===undefined)on=!a.has(c);on?a.add(c):a.delete(c);this.className=[...a].join(' ');},remove:c=>this.classList.toggle(c,false)};}
 set value(v){this._value=this.tagName==='TEXTAREA'?String(v).replace(/\r\n?/g,'\n'):String(v);}
 get value(){return this._value;}
 set textContent(v){this._text=String(v);this.children=[];}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 appendChild(x){x.parentNode=this;this.children.push(x);return x;}
 replaceChildren(...xs){for(const c of this.children)c.parentNode=null;this.children=[];this._text='';for(const x of xs)this.appendChild(x);}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,fn){(this.handlers[k]??=[]).push(fn);}
 async dispatch(k,event={}){for(const f of this.handlers[k]||[])await f({target:this,preventDefault(){},stopPropagation(){},...event});}
 click(){if(this.tagName==='A'&&this.download){this.ownerDocument.downloads.push({name:this.download,blob:this.ownerDocument.blobs.get(this.href)});return;}if(this.disabled)return;return this.dispatch('click');}
 focus(){this.ownerDocument.activeElement=this;}
 select(){this.focus();}
 scrollIntoView(){}
 contains(el){return this===el||this.children.some(c=>c.contains(el));}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);}
 matches(s){
  if(s.startsWith('#'))return this.id===s.slice(1);
  if(s.startsWith('.'))return this.className.split(' ').includes(s.slice(1));
  const m=s.match(/^(\w+)?(?:\[([^=\]]+)(?:="([^"]*)")?\])?$/);
  if(!m)return false;
  if(m[1]&&this.tagName!==m[1].toUpperCase())return false;
  if(m[2]){let v;if(m[2].startsWith('data-'))v=this.dataset[m[2].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())];else v=this.attributes[m[2]];if(v===undefined)return false;if(m[3]!==undefined&&v!==m[3])return false;}
  return true;
 }
 querySelectorAll(s){const out=[];for(const c of this.children){if(c.matches(s))out.push(c);out.push(...c.querySelectorAll(s));}return out;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 closest(s){return this.matches(s)?this:this.parentNode?.closest(s)||null;}
}
function boot(){
 const doc={ids:new Map(),blobs:new Map(),downloads:[],handlers:{},activeElement:null};
 doc.createElement=tag=>new Element(tag,doc);doc.body=doc.createElement('body');
 doc.getElementById=id=>doc.ids.get(id)||null;
 doc.querySelectorAll=s=>doc.body.querySelectorAll(s);
 doc.addEventListener=(k,f)=>(doc.handlers[k]??=[]).push(f);
 const template=read(templatePath);
 for(const m of template.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)){
  const el=doc.createElement(m[1]);el.id=m[3];el.hidden=/\bhidden\b/.test(m[2]);el.disabled=/\bdisabled\b/.test(m[2]);el.className=m[2].match(/class="([^"]*)"/)?.[1]||'';
  doc.ids.set(el.id,el);doc.body.appendChild(el);
 }
 for(const filter of ['all','open','handled','protected']){const b=doc.createElement('button');b.dataset.filter=filter;doc.body.appendChild(b);}
 const catalog=JSON.parse(read('lexicon/approved_r3.json')),overlay=JSON.parse(read('lexicon/wording_overlay_r172.json'));
 // Hashing still uses real WebCrypto. Tests can hold one completion to observe
 // actual engine/UI interleavings without replacing a session or its result.
 let nextDigestGate=null;
 const holdNextDigest=()=>{
  assert.equal(nextDigestGate,null,'the previous digest gate must be consumed');
  let release,entered;
  const released=new Promise(resolve=>{release=resolve;});
  const started=new Promise(resolve=>{entered=resolve;});
  nextDigestGate={released,entered};return {release,started};
 };
 const controlledCrypto={subtle:{digest(...args){
  const actual=crypto.webcrypto.subtle.digest(...args),gate=nextDigestGate;
  if(!gate)return actual;
  nextDigestGate=null;gate.entered();
  return Promise.all([actual,gate.released]).then(([result])=>result);
 }}};
 const ctx=vm.createContext({document:doc,navigator:{},TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,Buffer,Blob,crypto:controlledCrypto,console,setTimeout:f=>{f();return 1;},URL:{createObjectURL:b=>{const k='blob:test-'+doc.blobs.size;doc.blobs.set(k,b);return k;},revokeObjectURL(){}}});
 ctx.window=ctx;ctx.matchMedia=()=>({matches:true});ctx.addEventListener=()=>{};
 vm.runInContext('window.TLSWordingCatalogR172='+JSON.stringify(catalog)+';window.TLSWordingOverlayR172='+JSON.stringify(overlay)+';window.TLSWordingDigestsR172='+JSON.stringify({catalog_sha256:crypto.createHash('sha256').update(JSON.stringify(catalog)).digest('hex'),overlay_sha256:crypto.createHash('sha256').update(JSON.stringify(overlay)).digest('hex')})+';window.TLSR18OriginalSample='+JSON.stringify(read('docs/showcase/source.md'))+';',ctx);
 for(const p of ['src/core/entities.js','src/core/protected_segments_r15.js','src/core/local_workbench_r16.js','src/core/wording_assistant_r172.js'])vm.runInContext(read(p),ctx,{filename:p});
 if(!isBaseline)vm.runInContext(read('src/r19/review_helpers_r19.js'),ctx,{filename:'review_helpers_r19.js'});
 vm.runInContext(read(uiPath),ctx,{filename:uiPath});
 const $=id=>{const el=doc.getElementById(id);assert.ok(el,'expected UI element: '+id);return el;};
 const settle=async()=>{await new Promise(resolve=>setImmediate(resolve));for(let i=0;i<100;i++){if(!$('inspect').disabled&&!$('previewBtn').disabled)return;await new Promise(resolve=>setTimeout(resolve,2));}throw Error('UI_ASYNC_DID_NOT_SETTLE');};
 const input=async text=>{$('source').value=text;await $('source').dispatch('input');};
 const inspect=async()=>{await $('inspect').click();await settle();};
 const cards=()=>$('candidateList').querySelectorAll('[data-candidate-id]');
 const pick=async(num,action,word)=>{const card=cards().find(c=>c.dataset.candidateId==='c'+String(num).padStart(5,'0'));assert.ok(card);const b=card.querySelectorAll('button[data-choice-action]').find(b=>b.dataset.choiceAction===action&&(!word||b.textContent.startsWith(word)));assert.ok(b,'candidate button '+word);await b.click();};
 const preview=async()=>{await $('previewBtn').click();await settle();assert.equal($('resultSection').hidden,false,$('message').textContent);};
 const upload=async(name,bytes)=>{const data=Uint8Array.from(bytes);const file={name,size:data.length,arrayBuffer:async()=>data.buffer};await $('file').dispatch('change',{target:{files:[file],value:''}});await new Promise(resolve=>setImmediate(resolve));};
 const download=async id=>{await $(id).click();const x=doc.downloads.at(-1);assert.ok(x&&x.blob);return x.blob.text();};
 return {doc,$,input,inspect,cards,pick,preview,upload,download,settle,holdNextDigest,navigator:ctx.navigator};
}

async function startHeldPreview(a){
 assert.equal(a.$('previewBtn').disabled,false,'a new preview must be available');
 const gate=a.holdNextDigest(),completion=a.$('previewBtn').click();
 await gate.started;
 assert.equal(a.$('previewBtn').disabled,true,'the pending preview owns the button lock');
 return {release:gate.release,completion};
}

test('candidate cards show each real context; repeated menu decisions remain independent',async()=>{
 const a=boot();await a.input('介面的 menu 用來設定。\n午餐的 menu 有甜點。');await a.inspect();
 assert.equal(a.cards().length,2);const contexts=a.cards().map(c=>c.querySelector('.candidate-context')?.textContent||'');
 assert.match(contexts[0],/介面的 menu 用來設定/);assert.match(contexts[1],/午餐的 menu 有甜點/);
 await a.pick(1,'CONFIRM','選單');await a.pick(2,'CONFIRM','菜單');await a.preview();
 assert.equal(await a.download('download'),'介面的 選單 用來設定。\n午餐的 菜單 有甜點。');
});

test('BOM bytes, invalid UTF8 and NUL do not stage or destroy an existing preview',async()=>{
 const a=boot();await a.input('這是軟件。');await a.inspect();await a.pick(1,'CONFIRM','軟體');await a.preview();
 for(const bytes of [[0xef,0xbb,0xbf,0x6d,0x65,0x6e,0x75],[0xc3,0x28],[0x61,0,0x62]]){
  await a.upload('private.md',bytes);assert.equal(a.$('stagedFilePanel').hidden,true,'bad file staged');
  assert.equal(a.$('source').value,'這是軟件。');assert.equal(a.$('result').value,'這是軟體。');assert.equal(a.$('download').disabled,false);
 }
});

test('imported CRLF survives textarea normalization and reviewed file download',async()=>{
 const a=boot();await a.upload('original.md',Buffer.from('# 示範\r\n請用軟件。\r\n'));
 assert.equal(a.$('stagedFilePanel').hidden,false);await a.$('applyFile').click();await a.inspect();await a.pick(1,'CONFIRM','軟體');await a.preview();
 assert.equal(await a.download('download'),'# 示範\r\n請用軟體。\r\n');
});

test('a change past column 300 is present in the local difference excerpt',async()=>{
 const a=boot();await a.input('甲'.repeat(300)+' 軟件。');await a.inspect();await a.pick(1,'CONFIRM','軟體');await a.preview();
 const cards=a.$('diffHighlights').querySelectorAll('.diff-card');assert.equal(cards.length,1);
 assert.match(cards[0].querySelector('del').textContent,/軟件/);assert.match(cards[0].querySelector('ins').textContent,/軟體/);
 assert.notEqual(cards[0].querySelector('del').textContent,cards[0].querySelector('ins').textContent);
});

test('130 detected candidates expose 10 omitted and never claim a complete document review',async()=>{
 const a=boot();await a.input('軟件 '.repeat(130));await a.inspect();assert.equal(a.cards().length,120);
 for(let i=1;i<=120;i++)await a.pick(i,'KEEP_ORIGINAL');
 assert.match(a.$('coverageNotice').textContent,/130/);assert.match(a.$('coverageNotice').textContent,/10/);
 assert.match(a.$('readyLabel').textContent,/部分/);await a.preview();
 const proof=JSON.parse(await a.download('proofDownload'));assert.equal(proof.omitted_candidate_count,10);assert.equal(proof.review_coverage,'PARTIAL');assert.equal(proof.detected_candidate_count,130);
 assert.equal(await a.download('download'),'軟件 '.repeat(130));
 await a.input('軟件');await a.inspect();assert.equal(a.$('coverageNotice').hidden,true);
});

test('document preferences never auto-select and are cleared on a new source',async()=>{
 const a=boot();await a.input('軟體 menu。\n餐廳 menu。');await a.inspect();await a.pick(1,'CONFIRM','選單');
 const remember=a.cards()[0].querySelector('button[data-remember-choice]');assert.ok(remember);await remember.click();
 assert.equal(a.$('stage2Count').textContent,'1/2');assert.match(a.$('preferenceList').textContent,/選單/);
 assert.match(a.cards()[1].textContent,/文件偏好提示/);await a.preview();assert.equal(await a.download('download'),'軟體 選單。\n餐廳 menu。');
 const proof=await a.download('proofDownload');for(const text of ['軟體 menu','餐廳','選單','private.md'])assert.ok(!proof.includes(text));
 await a.pick(2,'CONFIRM','菜單');const other=a.cards()[1].querySelector('button[data-remember-choice]');await other.click();
 assert.match(a.$('preferenceList').textContent,/選單/);assert.match(a.$('preferenceList').textContent,/菜單/);
 await a.input('下一份 menu。');await a.inspect();assert.equal(a.$('preferenceList').children.length,0);assert.equal(a.$('stage2Count').textContent,'0/1');
});

test('context text is inert and protected code URL placeholder and statistics remain unchanged',async()=>{
 const a=boot();const source='請用軟件，點擊率保留。\nmenu <img src=x onerror="alert(1)">\n`menu` https://example.com/menu {{menu}}';
 await a.input(source);await a.inspect();assert.equal(a.doc.body.querySelectorAll('img').length,0);
 await a.pick(1,'CONFIRM','軟體');await a.preview();const output=await a.download('download');
 assert.match(output,/`menu` https:\/\/example.com\/menu \{\{menu\}\}/);assert.match(output,/點擊率/);assert.ok(!output.includes('點選率'));
});

test('failed structure analysis is explained without falsely assigning every failure to JSON',async()=>{
 const a=boot();await a.input('請用軟件\n```js\nmenu');await a.inspect();
 assert.equal(a.$('reviewSection').hidden,true);assert.match(a.$('message').textContent,/結構|格式/);
});

test('remembering or clearing a preference invalidates the prior preview without changing a decision',async()=>{
 const a=boot();await a.input('menu');await a.inspect();await a.pick(1,'CONFIRM','選單');await a.preview();
 await a.cards()[0].querySelector('button[data-remember-choice]').click();
 assert.equal(a.$('download').disabled,true);assert.equal(a.$('proofDownload').disabled,true);assert.equal(a.$('resultSection').hidden,true);
 assert.equal(a.$('stage2Count').textContent,'1/1');await a.preview();
 assert.equal(JSON.parse(await a.download('proofDownload')).document_preference_count,1);
 await a.$('clearPreferences').click();assert.equal(a.$('download').disabled,true);assert.equal(a.$('stage2Count').textContent,'1/1');
 await a.preview();assert.equal(JSON.parse(await a.download('proofDownload')).document_preference_count,0);
 assert.equal(await a.download('download'),'選單');
});

test('remembering a preference cancels a pending preview result',{timeout:5000},async()=>{
 const a=boot();await a.input('menu');await a.inspect();await a.pick(1,'CONFIRM','選單');
 const held=await startHeldPreview(a);
 try{
  await a.cards()[0].querySelector('button[data-remember-choice]').click();
  const message=a.$('message').textContent;
  held.release();await held.completion;
  assert.equal(a.$('resultSection').hidden,true,'the old completion must not display its result');
  assert.equal(a.$('download').disabled,true);assert.equal(a.$('proofDownload').disabled,true);
  assert.equal(a.$('message').textContent,message,'the old completion must not replace the newer message');
  assert.equal(a.$('stage2Count').textContent,'1/1');
 }finally{held.release();await held.completion;}
});

test('clearing preferences cancels a pending preview result',{timeout:5000},async()=>{
 const a=boot();await a.input('menu');await a.inspect();await a.pick(1,'CONFIRM','選單');
 await a.cards()[0].querySelector('button[data-remember-choice]').click();
 const held=await startHeldPreview(a);
 try{
  await a.$('clearPreferences').click();
  const message=a.$('message').textContent;
  held.release();await held.completion;
  assert.equal(a.$('resultSection').hidden,true,'a cleared preference must not revive an older preview');
  assert.equal(a.$('download').disabled,true);assert.equal(a.$('message').textContent,message);
  assert.equal(a.$('preferenceList').children.length,0);
 }finally{held.release();await held.completion;}
});

test('a decision change keeps its own message when an older preview rejects',{timeout:5000},async()=>{
 const a=boot();await a.input('menu');await a.inspect();await a.pick(1,'CONFIRM','選單');
 const held=await startHeldPreview(a);
 try{
  await a.pick(1,'KEEP_ORIGINAL');const message=a.$('message').textContent;
  held.release();await held.completion;
  assert.equal(a.$('resultSection').hidden,true);assert.equal(a.$('download').disabled,true);
  assert.equal(a.$('message').textContent,message,'a stale rejection must not overwrite the newer decision');
  await a.preview();assert.equal(await a.download('download'),'menu');
 }finally{held.release();await held.completion;}
});

test('invalidating a pending preview releases its button immediately',{timeout:5000},async()=>{
 const a=boot();await a.input('menu');await a.inspect();await a.pick(1,'CONFIRM','選單');
 const held=await startHeldPreview(a);
 try{
  await a.cards()[0].querySelector('button[data-remember-choice]').click();
  assert.equal(a.$('previewBtn').disabled,false,'a cancelled digest must not prevent starting a newer preview');
 }finally{held.release();await held.completion;}
});

for(const change of ['preference','decision'])test('an older '+change+' preview cannot unlock a newer pending preview',{timeout:5000},async()=>{
 const a=boot();await a.input('menu');await a.inspect();await a.pick(1,'CONFIRM','選單');
 const older=await startHeldPreview(a);let newer;
 try{
  if(change==='preference')await a.cards()[0].querySelector('button[data-remember-choice]').click();
  else await a.pick(1,'KEEP_ORIGINAL');
  newer=await startHeldPreview(a);const pendingMessage=a.$('message').textContent;
  older.release();await older.completion;
  assert.equal(a.$('previewBtn').disabled,true,'only the newest request may release its button lock');
  assert.equal(a.$('resultSection').hidden,true);assert.equal(a.$('download').disabled,true);
  assert.equal(a.$('message').textContent,pendingMessage,'old success or rejection must not disturb the pending request');
  newer.release();await newer.completion;
  assert.equal(a.$('previewBtn').disabled,false);assert.equal(a.$('resultSection').hidden,false);
  assert.equal(await a.download('download'),change==='preference'?'選單':'menu');
  assert.equal(JSON.parse(await a.download('proofDownload')).document_preference_count,change==='preference'?1:0);
 }finally{
  older.release();if(newer)newer.release();
  await Promise.all([older.completion,newer?.completion]);
 }
});


test('stale inspection must never unlock newer inspection or freeze after source edit',{timeout:8000},async()=>{
 const a=boot();await a.input('原稿 menu');
 const firstGate=a.holdNextDigest(),first=a.$('inspect').click();
 await firstGate.started;
 let secondGate,second;
 try{
  assert.equal(a.$('inspect').disabled,true,'first inspection owns button');
  await a.input('新稿 menu');
  assert.equal(a.$('inspect').disabled,false,'source change must cancel old inspector lock promptly');
  secondGate=a.holdNextDigest();second=a.$('inspect').click();
  await secondGate.started;
  assert.equal(a.$('inspect').disabled,true,'new inspection owns button');
  firstGate.release();await first;
  assert.equal(a.$('inspect').disabled,true,'old finally must not release new inspector lock');
  secondGate.release();await second;
  assert.equal(a.$('inspect').disabled,false);
  assert.equal(a.$('reviewSection').hidden,false);
  assert.equal(a.cards().length,1);
  assert.match(a.$('message').textContent,/已列出/);
 }finally{
  firstGate.release();if(secondGate)secondGate.release();
  await Promise.allSettled([first,second]);
 }
});


test('stale clipboard success after Clear must not replace newer status',{timeout:5000},async()=>{
 const a=boot();await a.input('這是軟件');await a.inspect();await a.pick(1,'CONFIRM','軟體');await a.preview();
 let release;const pending=new Promise(resolve=>{release=resolve;});
 a.navigator.clipboard={writeText:()=>pending};
 await a.$('copy').click();await a.$('clear').click();
 const message=a.$('message').textContent;
 release();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(a.$('message').textContent,message,'stale clipboard success overwrote Clear message');
 assert.equal(a.$('resultSection').hidden,true);
});

test('stale clipboard rejection after Clear must not steal focus or change status',{timeout:5000},async()=>{
 const a=boot();await a.input('這是軟件');await a.inspect();await a.pick(1,'CONFIRM','軟體');await a.preview();
 let reject;const pending=new Promise((resolve,fail)=>{reject=fail;});
 a.navigator.clipboard={writeText:()=>pending};
 await a.$('copy').click();await a.$('clear').click();
 const message=a.$('message').textContent;const focusBefore=a.doc.activeElement;
 reject(new Error('synthetic denied'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(a.$('message').textContent,message,'stale clipboard failure overwrote Clear message');
 assert.equal(a.doc.activeElement,focusBefore,'stale clipboard fallback moved focus');
});


test('Clear all must erase optional feedback text and disable feedback copy',{timeout:5000},async()=>{
 const a=boot();a.$('feedbackDraft').value='內含未送出的私人備註';a.$('feedbackCopy').disabled=false;
 await a.$('clear').click();
 assert.equal(a.$('feedbackDraft').value,'','Clear must erase private feedback draft');
 assert.equal(a.$('feedbackCopy').disabled,true,'Cleared feedback must not remain copyable');
});

test('stale feedback clipboard result after Clear must not announce or focus',{timeout:5000},async()=>{
 const a=boot();a.$('feedbackDraft').value='原創測試回饋';a.$('feedbackCopy').disabled=false;
 let resolve;const pending=new Promise(done=>resolve=done);a.navigator.clipboard={writeText:()=>pending};
 await a.$('feedbackCopy').click();await a.$('clear').click();
 const message=a.$('message').textContent;resolve();await new Promise(ok=>setImmediate(ok));
 assert.equal(a.$('message').textContent,message);
});


test('Clear all resets prior feedback outcome and step selections',{timeout:5000},async()=>{
 const a=boot();a.$('feedbackOutcome').value='DONE';a.$('feedbackStep').value='EXPORT';
 await a.$('clear').click();
 assert.equal(a.$('feedbackOutcome').value,'','new document must not inherit claimed completion');
 assert.equal(a.$('feedbackStep').value,'','new document must not inherit prior task step');
});

// A/B R2 pre-registered source-bound feedback lifetime checks.
async function prepareABR2Feedback(a){
 a.$('feedbackOutcome').value='DONE';a.$('feedbackStep').value='EXPORT';
 await a.$('feedbackBuild').click();
 assert.equal(a.$('feedbackCopy').disabled,false);
 assert.match(a.$('feedbackDraft').value,/完成原創範例/);
}

test('ABR2: editing source invalidates old feedback copy and enums without deleting handwritten draft',{timeout:5000},async()=>{
 const a=boot();await a.input('第一份文件 軟件');await prepareABR2Feedback(a);
 const typed=a.$('feedbackDraft').value+'\n自己的原創備註';a.$('feedbackDraft').value=typed;
 await a.input('第二份文件 軟件');
 assert.equal(a.$('feedbackDraft').value,typed,'do not silently discard handwritten feedback');
 assert.equal(a.$('feedbackCopy').disabled,true,'old document feedback must not remain copyable');
 assert.equal(a.$('feedbackOutcome').value,'','new document cannot inherit DONE');
 assert.equal(a.$('feedbackStep').value,'','new document cannot inherit EXPORT');
});

test('ABR2: changing feedback outcome invalidates generated copy but preserves typed draft',{timeout:5000},async()=>{
 const a=boot();await a.input('這是一份原創稿');await prepareABR2Feedback(a);
 const before=a.$('feedbackDraft').value+'\n我補充的建議';a.$('feedbackDraft').value=before;
 a.$('feedbackOutcome').value='PARTIAL';await a.$('feedbackOutcome').dispatch('change');
 assert.equal(a.$('feedbackDraft').value,before);
 assert.equal(a.$('feedbackCopy').disabled,true,'stale DONE draft must not copy after changing outcome');
 assert.match(a.$('message').textContent,/重新|過期|作廢/);
});

test('ABR2: changing feedback step invalidates generated copy until rebuilt',{timeout:5000},async()=>{
 const a=boot();await a.input('這是一份原創稿');await prepareABR2Feedback(a);
 a.$('feedbackStep').value='IMPORT';await a.$('feedbackStep').dispatch('change');
 assert.equal(a.$('feedbackCopy').disabled,true,'stale EXPORT step must not be copied after step change');
});

test('ABR2: old feedback clipboard success cannot announce after outcome changes',{timeout:5000},async()=>{
 const a=boot();await a.input('原創文件');await prepareABR2Feedback(a);
 let finish;const pending=new Promise(resolve=>finish=resolve);
 a.navigator.clipboard={writeText:()=>pending};await a.$('feedbackCopy').click();
 a.$('feedbackOutcome').value='PARTIAL';await a.$('feedbackOutcome').dispatch('change');
 const message=a.$('message').textContent;
 finish();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(a.$('message').textContent,message,'stale copy completion overwrote newer warning');
 assert.equal(a.$('feedbackCopy').disabled,true);
});

test('ABR2: old feedback clipboard failure cannot move focus after step changes',{timeout:5000},async()=>{
 const a=boot();await a.input('原創文件');await prepareABR2Feedback(a);
 let reject;const pending=new Promise((_resolve,fail)=>reject=fail);
 a.navigator.clipboard={writeText:()=>pending};await a.$('feedbackCopy').click();
 a.$('feedbackStep').value='IMPORT';await a.$('feedbackStep').dispatch('change');
 const message=a.$('message').textContent,focus=a.doc.activeElement;
 reject(new Error('synthetic clipboard rejection'));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(a.$('message').textContent,message,'stale error overwrote new step warning');
 assert.equal(a.doc.activeElement,focus,'stale error stole focus');
});

test('ABR2 positive: rebuilding after changed enums yields the new selected outcome and restores copy',{timeout:5000},async()=>{
 const a=boot();await a.input('原創文件');await prepareABR2Feedback(a);
 a.$('feedbackOutcome').value='PARTIAL';await a.$('feedbackOutcome').dispatch('change');
 a.$('feedbackStep').value='IMPORT';await a.$('feedbackStep').dispatch('change');
 await a.$('feedbackBuild').click();
 assert.equal(a.$('feedbackCopy').disabled,false);
 assert.match(a.$('feedbackDraft').value,/完成一部分/);
 assert.match(a.$('feedbackDraft').value,/檔案匯入/);
});
