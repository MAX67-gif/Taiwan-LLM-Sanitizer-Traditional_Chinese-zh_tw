#!/usr/bin/env node
'use strict';
/* Native R19 acceptance, using only project-owned synthetic text.
 * Delivery status is NOT_RUN until this file succeeds in an environment
 * authorized for native file:// navigation and Chromium downloads.
 * Syntax checking is not browser evidence. No HTTP/setContent fallback exists.
 *
 * Dependencies: Node 20+, Playwright 1.55.0 and its matching installed Chromium.
 * Run in an approved environment:
 *   NODE_PATH=/temporary/node_modules TLS_R19_BROWSER_OUTPUT=/private/output \
 *     node tests/browser_first_result_studio_r19.cjs --run
 * --output /private/output overrides TLS_R19_BROWSER_OUTPUT. By default a new
 * directory is created under os.tmpdir(). Output inside this repo is refused.
 * The final JSON records HTML SHA, browser version and individual scenarios.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');

const root=path.resolve(__dirname,'..');
const html=path.join(root,'examples/TW_First_Result_Studio_R19_20261101.html');
const target=pathToFileURL(html).href;
const allowedProtocols=new Set(['file:','blob:','data:','about:']);
const args=process.argv.slice(2);
function parseOutput(){
 let output=process.env.TLS_R19_BROWSER_OUTPUT;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--run')continue;
  if(args[i]==='--output'&&args[i+1]&&!args[i+1].startsWith('--')){output=args[++i];continue;}
  throw new Error('Unknown or incomplete argument: '+args[i]);
 }
 const destination=output?path.resolve(output):fs.mkdtempSync(path.join(os.tmpdir(),'tls-r19-native-'));
 const within=(base,item)=>{const rel=path.relative(base,item);return rel===''||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));};
 assert.equal(within(root,destination),false,'Evidence output must be outside the source repository');
 fs.mkdirSync(destination,{recursive:true});
 assert.equal(within(fs.realpathSync(root),fs.realpathSync(destination)),false,'Evidence output must not resolve into the source repository');
 return destination;
}
const nativeStatus='NOT_RUN';
if(!args.includes('--run')){
 console.error('R19_NATIVE_BROWSER_'+nativeStatus+': use --run only in an approved native-browser environment; syntax checks do not run acceptance.');
 process.exitCode=2;
}else{
 main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
}

async function main(){
 const output=parseOutput();
 const report={schema:'tls.r19.native-browser-acceptance.v1',status:nativeStatus,
  mode:'NATIVE_FILE_URL',html_file:path.basename(html),node_version:process.version,
  browser_version:null,html_sha256:null,scenarios:[],external_request_count:0,
  human_quality_verified:false,native_os_file_chooser_verified:false};
 const network=new Set(),pageErrors=[];
 let browser,loaded=false;
 const scenario=async(name,work)=>{
  try{await work();report.scenarios.push({name,status:'PASS'});console.log('R19_NATIVE_SCENARIO_PASS '+name);}
  catch(error){report.scenarios.push({name,status:'FAIL'});throw error;}
 };
 try{
  assert.ok(fs.existsSync(html)&&fs.statSync(html).isFile(),'Build the R19 standalone HTML first');
  report.html_sha256=crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');
  const {chromium}=require('playwright');
  browser=await chromium.launch({headless:true});
  report.browser_version=browser.version();
  const context=await browser.newContext({viewport:{width:1365,height:945},acceptDownloads:true,reducedMotion:'reduce'});
  const observe=url=>{if(!allowedProtocols.has(new URL(url).protocol))network.add(url);};
  context.on('request',request=>observe(request.url()));
  // Aborting an unexpected request never turns it into a passing observation.
  await context.route('**/*',async route=>{
   const url=route.request().url();
   if(allowedProtocols.has(new URL(url).protocol))await route.continue();
   else{network.add(url);await route.abort('blockedbyclient');}
  });
  context.on('page',page=>{
   page.on('pageerror',error=>pageErrors.push(String(error)));
   page.on('websocket',socket=>network.add(socket.url()));
   page.on('dialog',async dialog=>{pageErrors.push('Unexpected dialog: '+dialog.type());await dialog.dismiss();});
  });
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(target,{waitUntil:'load'});
  assert.equal(page.url(),target,'Acceptance must use the actual local file URL');
  loaded=true;report.status='RUNNING';
  assert.match(await page.title(),/R19/);

  const card=n=>page.locator('[data-candidate-id="c'+String(n).padStart(5,'0')+'"]');
  const ready=async()=>{
   await page.locator('#reviewSection').waitFor({state:'visible'});
   await page.waitForFunction(()=>!document.getElementById('inspect').disabled);
   await page.locator('[data-filter="all"]').click();
  };
  const inspect=async source=>{await page.locator('#source').fill(source);await page.locator('#inspect').click();await ready();};
  const choose=async(n,replacement)=>{
   const escaped=replacement.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
   await card(n).getByRole('button',{name:new RegExp('^'+escaped+'(?:\\s|·|$)')}).first().click();
  };
  const preview=async()=>{await page.locator('#previewBtn').click();await page.locator('#resultSection').waitFor({state:'visible'});await page.locator('#download:enabled').waitFor();};
  const download=async id=>{
   const pending=page.waitForEvent('download');
   await page.locator('#'+id).click();
   const item=await pending;
   assert.equal(await item.failure(),null,'Native download failed');
   const downloaded=await item.path();assert.ok(downloaded,'Native download has no local file');
   return fs.readFileSync(downloaded);
  };
  const proof=async()=>{
   const data=JSON.parse((await download('proofDownload')).toString('utf8'));
   assert.equal(data.schema,'tls.r19.first-result-proof.v1');
   assert.equal(data.approval,'NONE');assert.equal(data.semantic_equivalence_verified,false);
   for(const field of ['contains_source_text','contains_output_text','contains_source_hash','contains_file_path','contains_account_id'])assert.equal(data[field],false,field);
   const serialized=JSON.stringify(data);
   assert.equal(/\b[0-9a-f]{64}\b/iu.test(serialized),false,'Proof must not contain a document hash');
   for(const forbidden of ['午餐的','有甜點','input-fixture.md','source_sha256','preview_text'])assert.equal(serialized.includes(forbidden),false,'Source detail leaked into proof');
   return data;
  };
  const upload=async(buffer,name='input-fixture.md')=>page.locator('#file').setInputFiles({name,mimeType:'text/markdown',buffer});

  await scenario('guided_first_result_and_keyboard',async()=>{
   await page.locator('#quickStart').click();await ready();
   assert.equal(await page.locator('[data-candidate-id]').count(),8);
   assert.equal(await page.locator('#stage2Count').innerText(),'0/7');
   // Re-enter the guided focus path after the filter control used by ready().
   await card(1).locator('button[data-choice-action="CONFIRM"]').first().focus();
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('#stage2Count').innerText(),'1/7');
   await page.locator('#nextOpen').click();
   assert.equal(await page.evaluate(()=>document.activeElement.closest('[data-candidate-id]')?.dataset.candidateId),'c00002');
   await preview();assert.ok((await download('download')).length>0);
   const oldSource=await page.locator('#source').inputValue();
   for(const entry of ['quickStart','sample']){
    await page.locator('#'+entry).click();await page.locator('#guidedReplacePanel').waitFor({state:'visible'});
    await page.locator('#cancelSample').click();
    assert.equal(await page.locator('#source').inputValue(),oldSource);
    assert.equal(await page.locator('#stage2Count').innerText(),'1/7');
    assert.equal(await page.locator('#download').isEnabled(),true);
   }
  });

  await scenario('menu_context_preferences_and_separate_manual_decisions',async()=>{
   await inspect('介面的 menu 用來設定。\n午餐的 menu 有甜點。');
   assert.equal(await page.locator('[data-candidate-id]').count(),2);
   assert.match(await card(1).locator('.candidate-context').innerText(),/介面的 menu 用來設定/);
   assert.match(await card(2).locator('.candidate-context').innerText(),/午餐的 menu 有甜點/);
   await choose(1,'選單');await preview();
   await card(1).locator('button[data-remember-choice]').click();
   assert.equal(await page.locator('#resultSection').isHidden(),true,'Preference changes must invalidate an earlier preview');
   assert.equal(await page.locator('#download').isDisabled(),true);
   assert.equal(await page.locator('#stage2Count').innerText(),'1/2');
   assert.match(await page.locator('#preferenceList').innerText(),/選單/);
   assert.match(await card(2).innerText(),/文件偏好提示/);
   assert.equal(await card(2).locator('button[data-choice-action="CONFIRM"][aria-pressed="true"]').count(),0);
   await preview();assert.equal((await download('download')).toString('utf8'),'介面的 選單 用來設定。\n午餐的 menu 有甜點。');
   await proof();
   await choose(2,'菜單');await card(2).locator('button[data-remember-choice]').click();
   assert.match(await page.locator('#preferenceList').innerText(),/選單/);assert.match(await page.locator('#preferenceList').innerText(),/菜單/);
   await preview();assert.equal((await download('download')).toString('utf8'),'介面的 選單 用來設定。\n午餐的 菜單 有甜點。');
   await page.screenshot({path:path.join(output,'R19_DESKTOP_NATIVE.png'),fullPage:true});
   await page.locator('#clearPreferences').click();
   assert.equal(await page.locator('#resultSection').isHidden(),true,'Clearing preferences must invalidate an earlier preview');
   assert.equal(await page.locator('#stage2Count').innerText(),'2/2');
   await card(1).locator('button[data-remember-choice]').click();
   await inspect('下一份 menu。');
   assert.equal(await page.locator('#preferenceList').locator('li').count(),0);
   assert.equal(await page.locator('#stage2Count').innerText(),'0/1');
  });

  await scenario('cancel_and_bad_bytes_preserve_the_existing_result',async()=>{
   await inspect('這是軟件。');await choose(1,'軟體');await preview();
   await upload(Buffer.from('# 待確認\nmenu'));await page.locator('#stagedFilePanel').waitFor({state:'visible'});
   await page.locator('#cancelFile').click();
   assert.equal((await download('download')).toString('utf8'),'這是軟體。');
   for(const bytes of [Buffer.from([0xef,0xbb,0xbf,109,101,110,117]),Buffer.from([0xc3,0x28]),Buffer.from([97,0,98]),Buffer.alloc(65537,120)]){
    await preview(); // Establish a non-error message before awaiting rejection.
    await upload(bytes);await page.locator('#message[data-kind="error"]').waitFor();
    assert.equal(await page.locator('#stagedFilePanel').isHidden(),true);
    assert.equal(await page.locator('#source').inputValue(),'這是軟件。');
    assert.equal(await page.locator('#stage2Count').innerText(),'1/1');
    assert.equal(await page.locator('#result').inputValue(),'這是軟體。');
    assert.equal((await download('download')).toString('utf8'),'這是軟體。');
   }
  });

  await scenario('CRLF_file_import_and_exact_native_download_bytes',async()=>{
   const original='# 示範\r\n請用軟件。\r\n\r\n```js\r\nconst menu = "menu";\r\n```\r\n';
   const expected='# 示範\r\n請用軟體。\r\n\r\n```js\r\nconst menu = "menu";\r\n```\r\n';
   await upload(Buffer.from(original,'utf8'));await page.locator('#stagedFilePanel').waitFor({state:'visible'});
   await page.locator('#applyFile').click();
   assert.equal((await page.locator('#source').inputValue()).includes('\r'),false,'A real textarea normalizes CRLF');
   await page.locator('#inspect').click();await ready();await choose(1,'軟體');await preview();
   assert.deepEqual(await download('download'),Buffer.from(expected,'utf8'),'Download must retain imported CRLF, including protected code');
  });

  await scenario('130_detected_120_shown_stays_partial_after_all_visible_decisions',async()=>{
   const source='軟件 '.repeat(130);await inspect(source);
   assert.equal(await page.locator('[data-candidate-id]').count(),120);
   for(let i=1;i<=120;i++)await card(i).locator('button[data-choice-action="KEEP_ORIGINAL"]').click();
   assert.match(await page.locator('#coverageNotice').innerText(),/130/);assert.match(await page.locator('#coverageNotice').innerText(),/10/);
   assert.match(await page.locator('#readyLabel').innerText(),/部分/);
   await preview();assert.equal(await page.locator('#resultCoverageNotice').isVisible(),true);
   const data=await proof();
   assert.equal(data.detected_candidate_count,130);assert.equal(data.candidate_count,120);
   assert.equal(data.omitted_candidate_count,10);assert.equal(data.review_coverage,'PARTIAL');
   assert.equal(data.explicitly_kept_count,120);assert.equal(data.unresolved_count,0);
   assert.equal((await download('download')).toString('utf8'),source);
   await inspect('軟件');assert.equal(await page.locator('#coverageNotice').isHidden(),true);
  });

  await scenario('late_long_line_difference_is_visible_and_Unicode_safe',async()=>{
   await inspect('甲'.repeat(300)+'😀 軟件。');await choose(1,'軟體');await preview();
   const before=await page.locator('.diff-card del').innerText(),after=await page.locator('.diff-card ins').innerText();
   assert.match(before,/軟件/);assert.match(after,/軟體/);assert.notEqual(before,after);
   assert.match(before,/😀/);assert.match(after,/😀/);
   for(const text of [before,after])assert.equal(Array.from(text).some(char=>{const n=char.codePointAt(0);return n>=0xd800&&n<=0xdfff;}),false,'Excerpt must not contain a broken surrogate pair');
  });

  await scenario('context_markup_is_inert_and_protected_content_is_preserved',async()=>{
   const source='請用軟件，點擊率保留。\nmenu <img src="https://tls-invalid.example/never" onerror="window.__tlsInjected=1">\n`menu` https://example.com/menu {{menu}}\n\n```js\nconst menu = "menu";\n```\n';
   await inspect(source);await choose(1,'軟體');await preview();
   assert.equal(await page.locator('.candidate-context img').count(),0);
   assert.equal(await page.evaluate(()=>window.__tlsInjected),undefined);
   assert.equal((await download('download')).toString('utf8'),source.replace('軟件','軟體'));
   await page.locator('#feedbackOutcome').selectOption('PARTIAL');await page.locator('#feedbackStep').selectOption('IMPORT');
   await page.locator('#feedbackBuild').click();
   const draft=await page.locator('#feedbackDraft').inputValue();assert.match(draft,/完成一部分/);
   for(const text of ['__tlsInjected','{{menu}}','input-fixture.md','source_sha256'])assert.equal(draft.includes(text),false);
  });

  await scenario('pending_preview_generation_blocks_stale_results_errors_and_unlocks',async()=>{
   const gateKey='__tlsR19NativeDigestControl';
   await page.evaluate(key=>{
    if(window[key])throw new Error('Digest controller already exists');
    const subtle=window.crypto?.subtle;
    if(!subtle||typeof subtle.digest!=='function')throw new Error('Native SubtleCrypto is required for this scenario');
    const original=subtle.digest,descriptor=Object.getOwnPropertyDescriptor(subtle,'digest');
    const gates=new Map(),active=new Map();let next=null,gateSerial=0,callSerial=0,revision=0;
    const wrapped=function(...args){
     // The browser computes every real digest. Only delivery of one selected
     // result is held; neither session.preview nor its result is replaced.
     const actual=Reflect.apply(original,subtle,args),gate=next;
     next=null;const call=++callSerial;active.set(call,gate);revision++;
     if(gate)gate.started=true;
     return Promise.all([actual,gate?.releasedPromise]).then(([result])=>{
      active.delete(call);revision++;return result;
     },error=>{active.delete(call);revision++;throw error;});
    };
    Object.defineProperty(subtle,'digest',{configurable:true,writable:true,value:wrapped});
    if(subtle.digest!==wrapped)throw new Error('Could not install the native digest completion gate');
    window[key]={
     arm(){
      if(next)throw new Error('Previous digest gate has not started');
      let release;
      const releasedPromise=new Promise(resolve=>{release=resolve;});
      const gate={id:++gateSerial,started:false,released:false,releasedPromise,release};
      gates.set(gate.id,gate);next=gate;return gate.id;
     },
     started(id){return gates.get(id)?.started===true;},
     release(id){
      const gate=gates.get(id);if(!gate)throw new Error('Unknown digest gate');
      gate.released=true;gate.release();revision++;
     },
     releaseAll(){for(const gate of gates.values()){gate.released=true;gate.release();}next=null;revision++;},
     settleReleased(){
      // A later deliberately held request may remain pending. Wait for all
      // released/native work and its UI promise continuations to become quiet
      // across two animation frames; never assert immediately after release.
      return new Promise((resolve,reject)=>{
       let stable=0,lastRevision=revision,finished=false;
       const timeout=setTimeout(()=>{finished=true;reject(new Error('Released native digests did not settle'));},5000);
       const poll=()=>{
        if(finished)return;
        const quiet=[...active.values()].every(gate=>gate&&!gate.released);
        stable=quiet&&lastRevision===revision?stable+1:0;lastRevision=revision;
        if(stable>=2){finished=true;clearTimeout(timeout);resolve();}
        else requestAnimationFrame(poll);
       };
       requestAnimationFrame(poll);
      });
     },
     restore(){if(descriptor)Object.defineProperty(subtle,'digest',descriptor);else delete subtle.digest;delete window[key];}
    };
   },gateKey);
   const holdPreview=async()=>{
    assert.equal(await page.locator('#previewBtn').isEnabled(),true,'A cancelled request must allow a new preview');
    const id=await page.evaluate(key=>window[key].arm(),gateKey);
    await page.locator('#previewBtn').click();
    await page.waitForFunction(({key,id})=>window[key].started(id),{key:gateKey,id});
    assert.equal(await page.locator('#previewBtn').isDisabled(),true);
    return id;
   };
   const release=async id=>{
    await page.evaluate(({key,id})=>window[key].release(id),{key:gateKey,id});
    await page.evaluate(key=>window[key].settleReleased(),gateKey);
   };
   const change=async kind=>{
    if(kind==='decision')await card(1).locator('button[data-choice-action="KEEP_ORIGINAL"]').click();
    else if(kind==='clear')await page.locator('#clearPreferences').click();
    else await card(1).locator('button[data-remember-choice]').click();
   };
   const prepare=async kind=>{
    await inspect('menu');await choose(1,'選單');
    if(kind==='clear')await change('remember');
   };
   try{
    // Preference edits leave the engine snapshot unchanged, so the old engine
    // call can succeed. A decision edit instead produces a real stale-snapshot
    // rejection. Neither outcome may revive the UI or overwrite its message.
    for(const kind of ['remember','clear','decision']){
     await prepare(kind);const older=await holdPreview();await change(kind);
     const message=await page.locator('#message').innerText();
     assert.equal(await page.locator('#previewBtn').isEnabled(),true,kind+' must release the cancelled lock immediately');
     await release(older);
     assert.equal(await page.locator('#resultSection').isHidden(),true,kind+': an old completion revived the result');
     assert.equal(await page.locator('#download').isDisabled(),true);
     assert.equal(await page.locator('#proofDownload').isDisabled(),true);
     assert.equal(await page.locator('#message').innerText(),message,kind+': an old completion replaced the newer message');
    }
    // Keep the newer request held while the older success/rejection completes.
    // Its old finally block must not release the newer request's button lock.
    for(const kind of ['remember','decision']){
     await prepare(kind);const older=await holdPreview();await change(kind);
     const newer=await holdPreview(),message=await page.locator('#message').innerText();
     await release(older);
     assert.equal(await page.locator('#previewBtn').isDisabled(),true,kind+': old finally unlocked the newer request');
     assert.equal(await page.locator('#resultSection').isHidden(),true);
     assert.equal(await page.locator('#download').isDisabled(),true);
     assert.equal(await page.locator('#message').innerText(),message,kind+': stale work disturbed the newer pending request');
     await release(newer);await page.locator('#resultSection').waitFor({state:'visible'});
     assert.equal(await page.locator('#previewBtn').isEnabled(),true);
     assert.equal((await download('download')).toString('utf8'),kind==='remember'?'選單':'menu');
     const data=await proof();assert.equal(data.document_preference_count,kind==='remember'?1:0);
    }
   }finally{
    await page.evaluate(async key=>{
     const control=window[key];if(!control)return;
     control.releaseAll();
     try{await control.settleReleased();}finally{control.restore();}
    },gateKey);
   }
  });

  await scenario('390px_native_layout_and_keyboard_focus',async()=>{
   const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});
   await mobile.goto(target,{waitUntil:'load'});await mobile.locator('#quickStart').click();
   await mobile.locator('[data-candidate-id]').first().waitFor();
   assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true,'Narrow viewport overflows');
   assert.equal(await mobile.evaluate(()=>document.activeElement.closest('[data-candidate-id]')?.dataset.candidateId),'c00001');
   await mobile.keyboard.press('Enter');assert.equal(await mobile.locator('#stage2Count').innerText(),'1/7');
   await mobile.screenshot({path:path.join(output,'R19_MOBILE_NATIVE.png'),fullPage:true});
   await mobile.close();
  });
  await scenario('no_page_errors_or_external_requests',async()=>{
   await page.close();
   assert.deepEqual(pageErrors,[]);assert.deepEqual([...network],[],'Every attempted external request fails acceptance, including aborted requests');
  });
  report.status='PASS';
 }catch(error){
  report.status=loaded?'FAIL':'NOT_RUN';report.failure=String(error.stack||error.message).slice(0,4000);
  throw error;
 }finally{
  report.external_request_count=network.size;
  report.external_requests=[...network];report.page_errors=pageErrors;
  fs.writeFileSync(path.join(output,'R19_NATIVE_BROWSER_REPORT.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
  console.log('R19_NATIVE_BROWSER_'+report.status+' '+path.join(output,'R19_NATIVE_BROWSER_REPORT.json'));
 }
}
