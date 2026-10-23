"""Open the user-facing, privacy-safe lexicon explorer in real headless Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    opts={"headless":True,"args":["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():opts["executable_path"]="/usr/bin/chromium"
    browser=pw.chromium.launch(**opts)
    page=browser.new_page()
    outgoing=[]
    page.on("request",lambda req:outgoing.append(req.url))
    page.set_content((ROOT/"examples/TW_Lexicon_Explorer_R3_20261024.html").read_text(encoding="utf-8"))
    page.wait_for_function("document.querySelector('#stats').textContent.includes('883')")
    assert page.locator("#results tr").count()==50
    page.locator("#q").fill("菜单")
    page.wait_for_function("document.querySelector('#stats').textContent.includes('符合條件')")
    assert page.locator("#results tr").count()>0
    page.locator("#status").select_option("approved")
    page.wait_for_function("document.querySelector('#stats').textContent.includes('67')")
    page.locator("#domain").select_option("food")
    text=page.locator("#results").inner_text()
    assert "菜单" in text and "菜單" in text
    assert outgoing==[],outgoing
    browser.close()
print("R3 OFFLINE LEXICON EXPLORER CHROMIUM PASS")
