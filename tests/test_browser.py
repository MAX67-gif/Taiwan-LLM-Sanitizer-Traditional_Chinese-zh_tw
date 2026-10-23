"""Optional Chromium DOM test: install playwright and Chromium separately."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    page=browser.new_page()
    page.set_content((ROOT/"tests/fixtures/demo.html").read_text(encoding="utf-8"))
    page.add_script_tag(content=(ROOT/"src/core/engine.js").read_text(encoding="utf-8"))
    page.evaluate("window.__ctrl=TLSCore.createLocalizer(document);window.__ctrl.start()")
    page.wait_for_function("document.querySelector('#title').textContent==='搜尋'")
    assert page.locator("#save").inner_text()=="儲存"
    assert page.locator("#zh").inner_text()=="軟體 伺服器 資料庫"
    assert page.locator("#code").inner_text()=="软件 服务器 数据库"
    assert page.locator("#input").input_value()=="软件"
    assert page.locator("#aria").get_attribute("aria-label")=="設定"
    page.evaluate("document.querySelector('#dynamic').textContent='Download'")
    page.wait_for_function("document.querySelector('#dynamic').textContent==='下載'")
    page.evaluate("window.__ctrl.stop()")
    assert page.locator("#title").inner_text()=="Search"
    assert page.locator("#dynamic").inner_text()=="Download"
    assert page.locator("#aria").get_attribute("aria-label")=="Settings"
    page.evaluate("window.__ctrl.start()")
    page.wait_for_function("document.querySelector('#dynamic').textContent==='下載'")
    browser.close()
print("CHROMIUM DOM PASS")
