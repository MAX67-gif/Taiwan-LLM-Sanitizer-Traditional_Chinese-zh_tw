"""R5 headless Chromium: visual progress is evident and fixed-position dock never jumps."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    options={"headless":True,"args":["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():
        options["executable_path"]="/usr/bin/chromium"
    browser=pw.chromium.launch(**options)
    page=browser.new_page(viewport={"width":390,"height":640})
    page.set_content("""<!doctype html><html><body>
      <h1>Test website</h1><nav><span id="first">menu</span></nav>
      <div style="height:2500px">Document content</div>
    </body></html>""")
    page.add_script_tag(content=(ROOT/"src/core/progress_ui.js").read_text(encoding="utf-8"))
    page.evaluate("""() => {
      window.__indicator=TLSProgress.createIndicator(document);
      window.__indicator.update({running:true,queued:8,busy:true,scanned:0,converted:0});
    }""")
    first=page.locator("[data-tls-indicator]")
    first.wait_for()
    assert first.evaluate("(el)=>el.style.position")=="fixed"
    assert first.evaluate("(el)=>el.style.pointerEvents")=="none"
    before=first.bounding_box()
    assert before["width"]==52 and before["height"]==52
    assert page.evaluate("window.__indicator.state")=="running"
    page.evaluate("document.scrollingElement.scrollTop=1800")
    page.wait_for_timeout(90)
    scrolled=first.bounding_box()
    assert abs(before["x"]-scrolled["x"])<1
    assert abs(before["y"]-scrolled["y"])<1
    page.evaluate("""() => {
      window.__indicator.update({running:true,queued:0,busy:false,scanned:10,converted:6});
    }""")
    assert page.evaluate("window.__indicator.state")=="done"
    done=first.bounding_box()
    assert abs(before["x"]-done["x"])<1 and abs(before["y"]-done["y"])<1
    page.evaluate("""() => window.__indicator.update({
      running:true,queued:0,busy:false,errors:1,converted:6
    })""")
    assert page.evaluate("window.__indicator.state")=="warning"
    page.evaluate("""() => window.__indicator.update({
      running:true,queued:0,busy:true,provider:{state:'MODEL_DOWNLOAD'},modelProgress:.43
    })""")
    assert page.evaluate("window.__indicator.state")=="download"
    page.evaluate("window.__indicator.destroy()")
    assert first.count()==0

    # The actual Tampermonkey userscript reuses this indicator and should
    # offer a separate fixed-position settings panel without moving the dock.
    page.evaluate("""() => {
      window.__store={};
      window.__menus=[];
      window.GM_getValue=(key,d)=>Object.hasOwn(__store,key)?__store[key]:d;
      window.GM_setValue=(key,v)=>{__store[key]=v;};
      window.GM_registerMenuCommand=(label,fn)=>__menus.push({label,fn});
    }""")
    page.add_script_tag(content=(ROOT/"dist/userscript/TaiwanLLMSanitizer.user.js").read_text(encoding="utf-8"))
    page.evaluate("window.__menus[0].fn()")
    dock=page.locator("[data-tls-indicator]")
    dock.wait_for()
    initial=dock.bounding_box()
    page.mouse.click(initial["x"]+26,initial["y"]+26)
    assert page.locator("section[data-tls-ui]").is_visible()
    after_open=dock.bounding_box()
    assert abs(initial["x"]-after_open["x"])<1 and abs(initial["y"]-after_open["y"])<1
    page.mouse.click(initial["x"]+26,initial["y"]+26)
    assert not page.locator("section[data-tls-ui]").is_visible()
    page.wait_for_function("document.querySelector('#first').textContent==='選單'")
    page.evaluate("document.querySelector('#first').textContent='菜单'")
    page.wait_for_function("document.querySelector('#first').textContent==='選單'")
    later=dock.bounding_box()
    assert abs(initial["x"]-later["x"])<1 and abs(initial["y"]-later["y"])<1
    assert page.locator("section[data-tls-ui]").count()==1
    page.evaluate("window.__menus[0].fn()")
    assert dock.count()==0
    browser.close()
print("R5 FIXED VISUAL PROGRESS + USERSCRIPT DOCK PASS")
