"""Optional userscript integration test with GM API stubs, not actual Tampermonkey."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page=browser.new_page()
    page.set_content((ROOT/"tests/fixtures/demo.html").read_text(encoding="utf-8"))
    page.evaluate("""() => {
      window.__store={};window.__menus=[];
      window.GM_getValue=(k,d)=>Object.prototype.hasOwnProperty.call(window.__store,k)?window.__store[k]:d;
      window.GM_setValue=(k,v)=>window.__store[k]=v;
      window.GM_registerMenuCommand=(label,fn)=>window.__menus.push({label,fn});
    }""")
    page.add_script_tag(content=(ROOT/"dist/userscript/TaiwanLLMSanitizer.user.js").read_text(encoding="utf-8"))
    assert page.locator("#title").inner_text()=="Search"
    assert page.evaluate("window.__menus.length")==2
    page.evaluate("window.__menus[0].fn()")
    page.wait_for_function("document.querySelector('#title').textContent==='搜尋'")
    page.evaluate("window.__menus[1].fn()")
    assert page.locator("#title").inner_text()=="Search"
    page.evaluate("window.__menus[1].fn()")
    page.wait_for_function("document.querySelector('#title').textContent==='搜尋'")
    page.evaluate("window.__menus[0].fn()")
    assert page.locator("#title").inner_text()=="Search"
    browser.close()
print("USERSCRIPT DOM PASS")
