"""R3 Chromium proof: contextual menu, opt-in domain, code protection and rollback."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    opts={"headless":True,"args":["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():opts["executable_path"]="/usr/bin/chromium"
    browser=pw.chromium.launch(**opts)
    page=browser.new_page()
    page.set_content("""<!doctype html><html lang="zh-Hant-TW"><body>
      <nav><span id="ui">菜单</span><span id="ui_en">menu</span></nav>
      <section><h2 id="food">菜单</h2><p id="tech">数据库、软件</p></section>
      <pre id="code">菜单</pre><input id="input" value="菜单">
      <div id="updates"></div>
      </body></html>""")
    for name in ("lexicon_pack.js","preferences.js","engine.js","provider.js","web_adapter.js"):
        page.add_script_tag(content=(ROOT/"src/core"/name).read_text(encoding="utf-8"))
    page.evaluate("""() => {
      window.__r3=TLSWeb.createWebLocalizer(document,{mode:'terms'});
      window.__r3.start();
    }""")
    page.wait_for_function("document.querySelector('#ui').textContent==='選單'")
    page.wait_for_function("document.querySelector('#ui_en').textContent==='選單'")
    page.wait_for_function("document.querySelector('#tech').textContent==='資料庫、軟體'")
    assert page.locator("#food").inner_text()=="菜单"
    assert page.locator("#code").inner_text()=="菜单"
    assert page.locator("#input").input_value()=="菜单"
    page.evaluate("document.querySelector('#updates').innerHTML='<nav><span id=added>主菜单</span></nav>'")
    page.wait_for_function("document.querySelector('#added').textContent==='主選單'")
    page.evaluate("window.__r3.configure({domain:'food'})")
    page.wait_for_function("document.querySelector('#food').textContent==='菜單'")
    assert page.locator("#ui").inner_text()=="菜單"
    page.evaluate("window.__r3.stop()")
    assert page.locator("#ui").inner_text()=="菜单"
    assert page.locator("#ui_en").inner_text()=="menu"
    assert page.locator("#added").inner_text()=="主菜单"
    assert page.locator("#tech").inner_text()=="数据库、软件"
    browser.close()
print("R3 CONTEXTUAL BROWSER PASS")
