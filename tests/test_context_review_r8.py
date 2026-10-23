"""R8 browser smoke on original synthetic text; no external website."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
html=Path(__file__).resolve().parents[1]/"examples"/"TW_Context_Review_Lab_R8_20261024.html"
with sync_playwright() as pw:
 opts={"headless":True,"args":["--no-sandbox"]}
 if Path("/usr/bin/chromium").exists():opts["executable_path"]="/usr/bin/chromium"
 browser=pw.chromium.launch(**opts)
 page=browser.new_page()
 requests=[]
 page.on("request",lambda request:requests.append(request.url))
 page.goto(html.as_uri())
 tick=chr(96);dollar=chr(36)
 sample="menu 主菜单 "+dollar+"{menu} "+tick+"menu"+tick+" https://example.com/menu"
 page.locator("#source").fill(sample)
 page.locator("#analyze").click()
 expect(page.locator("#status")).to_contain_text("原文沒有修改")
 expect(page.locator("#results")).to_contain_text("需要確認語境")
 assert page.locator("#source").input_value()==sample
 page.locator("#domain").select_option("food")
 page.locator("#analyze").click()
 expect(page.locator("#results")).to_contain_text("菜單")
 page.locator("#clear").click()
 expect(page.locator("#source")).to_have_value("")
 assert not any(u.startswith(("https:","http:")) for u in requests),requests
 browser.close()
print("R8 CHROMIUM OFFLINE / CONTEXT / PRIVACY PASS")
