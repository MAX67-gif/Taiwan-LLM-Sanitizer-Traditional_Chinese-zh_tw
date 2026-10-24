"""R11 MV3 popup: opt-in host permission and manual import/preview/apply/restore UI."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    options={'headless':True,'args':['--no-sandbox']}
    if Path('/usr/bin/chromium').exists():options['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**options)
    page=browser.new_page()
    errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
    source=(ROOT/'src/r11/chrome/popup.html').read_text(encoding='utf8')
    source=source.replace('<script src="user_terms_r9.js"></script><script src="site_glossary_r11.js"></script><script src="popup.js"></script>','')
    page.set_content(source)
    page.evaluate('''() => {
      const state={registry:[],store:{},sent:[],asked:0,injected:0};window.__r11mock=state;
      window.chrome={
       tabs:{query:async()=>[{id:3,url:'https://doc.example.org/guide'}],
        sendMessage:async (id,message)=>{
         state.sent.push(message);
         if(message.kind==='TLS_R11_PREVIEW')return {ok:true,revision:8,truncated:false,
           matches:[{id:'r11_8_0',from:'menu',to:'選單',domain:'ui',context:'Open menu to edit settings.'}]};
         if(message.kind==='TLS_R11_APPLY')return {ok:true,approvedPositions:message.selectedIds.length,nodesChanged:1};
         if(message.kind==='TLS_R11_RESTORE'||message.kind==='TLS_R11_EXIT')return {ok:true,restored:1,skipped:0};
         return {ok:true,status:{running:true,mode:'terms',converted:0,provider:{state:'READY'}}};
        }},
       scripting:{getRegisteredContentScripts:async({ids})=>state.registry.filter(x=>ids.includes(x.id)),
        registerContentScripts:async entries=>state.registry.push(...entries),
        unregisterContentScripts:async({ids})=>{state.registry=state.registry.filter(x=>!ids.includes(x.id))},
        executeScript:async()=>{state.injected++}},
       permissions:{request:async()=>{state.asked++;return true},remove:async()=>true},
       storage:{local:{get:async key=>({[key]:state.store[key]}),set:async values=>Object.assign(state.store,values)}}
      }
    }''')
    for name in ('user_terms_r9.js','site_glossary_r11.js'):
        page.add_script_tag(content=(ROOT/'src/core'/name).read_text(encoding='utf8'))
    page.add_script_tag(content=(ROOT/'src/r11/chrome/popup.js').read_text(encoding='utf8'))
    page.wait_for_function("!document.querySelector('#toggle').disabled")
    assert page.locator('#r11-preview').is_disabled(), 'no site permission yet'
    page.locator('#toggle').click()
    page.wait_for_function('window.__r11mock.registry.length===1')
    assert page.evaluate('window.__r11mock.asked')==1
    scripts=page.evaluate('window.__r11mock.registry[0].js')
    assert scripts[-3:]==['user_terms_r9.js','site_glossary_r11.js','content.js'],scripts
    assert page.locator('#r11-preview').is_enabled()
    profile={'schema':'tls.personal-glossary.v1','locale':'zh-TW','entries':[
      {'source':'menu','domain':'ui','action':'replace','replacement':'選單'}]}
    page.locator('#r11-file').set_input_files({'name':'preferences.json','mimeType':'application/json',
       'buffer':json.dumps(profile,ensure_ascii=False).encode('utf-8')})
    page.wait_for_function("document.querySelector('#r11-state').textContent.includes('保存 1 筆')")
    assert "tls-r11-profile:https://doc.example.org" in page.evaluate("Object.keys(window.__r11mock.store)")
    page.locator('#domain').select_option('ui')
    page.locator('#r11-preview').click()
    page.wait_for_function("document.querySelector('#r11-state').textContent.includes('找到 1 處')")
    assert page.evaluate('window.__r11mock.sent.some(x=>x.kind===\'TLS_R11_PREVIEW\')')
    assert page.evaluate("window.__r11mock.sent.find(x=>x.kind==='TLS_R11_PREVIEW').rows.length")==1
    assert page.locator('#r11-apply').is_enabled()
    page.locator('#r11-matches input[type=checkbox]').check()
    page.locator('#r11-apply').click()
    page.wait_for_function("document.querySelector('#r11-state').textContent.includes('已明確套用 1 處')")
    assert page.evaluate("window.__r11mock.sent.find(x=>x.kind==='TLS_R11_APPLY').selectedIds.length")==1
    page.locator('#r11-restore').click()
    page.wait_for_function("document.querySelector('#r11-state').textContent.includes('已還原 1 處')")
    page.locator('#r11-exit').click()
    page.wait_for_function("document.querySelector('#r11-state').textContent.includes('已退出 R11')")
    page.locator('#toggle').click()
    page.wait_for_function('window.__r11mock.registry.length===0')
    assert page.evaluate("window.__r11mock.sent.some(x=>x.kind==='TLS_STOP')")
    assert not errors,errors
    browser.close()
print('TLS R11 CHROME POPUP PERMISSIONS/IMPORT/PREVIEW/APPROVAL/RESTORE PASS')
