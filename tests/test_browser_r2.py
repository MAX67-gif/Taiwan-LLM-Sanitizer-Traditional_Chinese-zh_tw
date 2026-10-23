"""R2 Chromium DOM integration: local mock provider, dynamic nodes, rollback and races."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    args={"headless":True,"args":["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():
        args["executable_path"]="/usr/bin/chromium"
    browser=pw.chromium.launch(**args)
    page=browser.new_page()
    page.on("pageerror",lambda exc:print("PAGE_ERROR",str(exc)))
    page.set_content((ROOT/"tests/fixtures/demo.html").read_text(encoding="utf-8"))
    page.evaluate("""() => {
      window.Translator={
        availability:async()=> 'available',
        create:async()=>({translate:async text=>{
          if(text.includes('Search'))return '搜尋';
          if(text.includes('Save'))return '儲存';
          if(text.includes('Settings'))return '設定';
          if(text.includes('Download'))return '下載';
          if(text.includes('Delayed')) {await new Promise(resolve=>setTimeout(resolve,260));return '晚到的翻譯';}
          return text;
        }})
      };
    }""")
    for rel in ["src/core/lexicon_pack.js","src/core/engine.js","src/core/provider.js","src/core/web_adapter.js"]:
        page.add_script_tag(content=(ROOT/rel).read_text(encoding="utf-8"))
    page.evaluate("""() => {
      window.__r2=TLSWeb.createWebLocalizer(document,{mode:'local-ai',sourceLanguage:'en'});
      window.__r2.start();
    }""")
    page.wait_for_timeout(900)
    print("R3 PROBE",page.evaluate("""() => ({
       title:document.querySelector('#title').textContent,
       test:TLSCore.translateText('Search'),
       domain:TLSLexicon.lookup('menu',{domain:'ui'}),
       status:window.__r2.getStatus(),
       translator:typeof window.Translator
    })"""))
    page.wait_for_function("document.querySelector('#title').textContent==='搜尋'",timeout=12000)
    assert page.locator("#save").inner_text()=="儲存"
    assert page.locator("#zh").inner_text()=="軟體 伺服器 資料庫"
    assert page.locator("#code").inner_text()=="软件 服务器 数据库"
    assert page.locator("#input").input_value()=="软件"
    page.wait_for_function("document.querySelector('#aria').getAttribute('aria-label')==='設定'")
    page.evaluate("document.querySelector('#dynamic').textContent='Download'")
    page.wait_for_function("document.querySelector('#dynamic').textContent==='下載'")
    page.evaluate("window.__r2.stop()")
    assert page.locator("#title").inner_text()=="Search"
    assert page.locator("#dynamic").inner_text()=="Download"
    assert page.locator("#aria").get_attribute("aria-label")=="Settings"
    page.evaluate("window.__r2.start()")
    page.wait_for_function("document.querySelector('#title').textContent==='搜尋'")
    page.evaluate("document.querySelector('#dynamic').textContent='Delayed result'")
    page.wait_for_timeout(70)
    page.evaluate("window.__r2.stop()")
    page.wait_for_timeout(350)
    assert page.locator("#dynamic").inner_text()=="Delayed result", "stale async result was applied after stop"
    assert page.evaluate("window.__r2.getStatus().running") is False
    browser.close()
print("R2 ASYNC DOM INTEGRATION PASS")
