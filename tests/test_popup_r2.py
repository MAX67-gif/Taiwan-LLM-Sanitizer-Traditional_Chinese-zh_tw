"""R2 MV3 popup click/permission/user-config regression under Chromium API mocks."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    opts={"headless":True,"args":["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():opts["executable_path"]="/usr/bin/chromium"
    browser=pw.chromium.launch(**opts)
    page=browser.new_page()
    html=(ROOT/"src/chrome/popup.html").read_text(encoding="utf-8")
    page.set_content(html.replace('<script src="popup.js"></script>',''))
    page.evaluate("""() => {
      const state={registry:[],storage:{},sent:[],permissions:0,removed:0,injections:0};
      window.__mock=state;
      window.chrome={
        tabs:{
          query:async()=>[{id:7,url:'https://example.org/page'}],
          sendMessage:async(id,payload)=>{
            state.sent.push(payload);
            if(payload.kind==='TLS_STOP')return {ok:true};
            return {ok:true,status:{running:true,mode:state.storage['tls-site-config-v2:https://example.org']?.mode||'terms',
              converted:2,lastReason:'',provider:{state:'READY'}}};
          }
        },
        scripting:{
          getRegisteredContentScripts:async({ids})=>state.registry.filter(x=>ids.includes(x.id)),
          registerContentScripts:async(entries)=>state.registry.push(...entries),
          unregisterContentScripts:async({ids})=>{
            state.registry=state.registry.filter(x=>!ids.includes(x.id));
          },
          executeScript:async()=>{state.injections++;}
        },
        storage:{local:{
          get:async key=>({[key]:state.storage[key]}),
          set:async values=>Object.assign(state.storage,values)
        }},
        permissions:{
          request:async()=>{state.permissions++;return true;},
          remove:async()=>{state.removed++;return true;}
        }
      };
    }""")
    page.add_script_tag(content=(ROOT/"src/chrome/popup.js").read_text(encoding="utf-8"))
    page.wait_for_function("document.querySelector('#toggle').disabled===false")
    assert page.locator("#host").inner_text()=="example.org"
    page.locator("#toggle").click()
    page.wait_for_function("window.__mock.registry.length===1")
    assert page.evaluate("window.__mock.permissions")==1
    assert page.evaluate("window.__mock.injections")==1
    assert page.evaluate("window.__mock.registry[0].js")==[
        "lexicon_pack.js","engine.js","provider.js","web_adapter.js","content.js"]
    assert "停用" in page.locator("#toggle").inner_text()
    page.locator("#mode").select_option("local-ai")
    page.locator("#source").select_option("ja")
    page.locator("#domain").select_option("food")
    page.locator("#apply").click()
    page.wait_for_function("window.__mock.sent.some(x=>x.kind==='TLS_CONFIG')")
    config=page.evaluate("window.__mock.storage['tls-site-config-v2:https://example.org']")
    assert config=={"mode":"local-ai","sourceLanguage":"ja","domain":"food"}
    page.locator("#toggle").click()
    page.wait_for_function("window.__mock.registry.length===0")
    assert page.evaluate("window.__mock.removed")==1
    assert page.evaluate("window.__mock.sent.some(x=>x.kind==='TLS_STOP')")
    assert "啟用" in page.locator("#toggle").inner_text()
    browser.close()
print("R2 CHROME POPUP PERMISSION/CONFIG/STOP PASS")
