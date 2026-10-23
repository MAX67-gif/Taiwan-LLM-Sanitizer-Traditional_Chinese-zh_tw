"""R9 real Chromium UX: manual choose, safe preview, portable profile, no egress."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
file=Path(__file__).resolve().parents[1]/"examples"/"TW_User_Context_Lab_R9_20261024.html"
with sync_playwright() as p:
 kw={"headless":True,"args":["--no-sandbox"]}
 if Path("/usr/bin/chromium").exists():kw["executable_path"]="/usr/bin/chromium"
 browser=p.chromium.launch(**kw)
 page=browser.new_page(accept_downloads=True)
 network=[]
 page.on("request",lambda request:network.append(request.url))
 page.goto(file.as_uri())
 source="menu 主菜单 "+chr(96)+"menu"+chr(96)+" https://example.com/menu 測試私人段落"
 page.locator("#source").fill(source)
 page.locator("#domain").select_option("ui")
 page.locator("#analyze").click()
 expect(page.locator("#status")).to_contain_text("原文保持不變")
 options=page.locator("#results select[data-index]")
 assert options.count()>=2
 options.nth(0).select_option(index=1)
 page.locator("#previewBtn").click()
 expect(page.locator("#previewStatus")).to_contain_text("原文未變")
 assert page.locator("#source").input_value()==source
 assert page.locator("#previewText").input_value().startswith("選單 主菜单")
 assert chr(96)+"menu"+chr(96) in page.locator("#previewText").input_value()
 page.locator("#results tr").first.locator("button").click()
 expect(page.locator("#profileStatus")).to_contain_text("1 筆")
 with page.expect_download() as result:
  page.locator("#export").click()
 download=result.value
 exported=Path(download.path()).read_text(encoding="utf-8")
 profile=json.loads(exported)
 assert profile["schema"]=="tls.personal-glossary.v1"
 assert profile["entries"][0]["source"]=="menu"
 assert source not in exported
 assert "測試私人段落" not in exported
 page.reload()
 expect(page.locator("#profileStatus")).to_contain_text("0 筆")
 page.locator("#importFile").set_input_files({
  "name":"my-terms.json","mimeType":"application/json","buffer":exported.encode("utf-8")})
 page.locator("#importApply").click()
 expect(page.locator("#profileStatus")).to_contain_text("已匯入 1 筆")
 page.locator("#source").fill("menu")
 page.locator("#domain").select_option("ui")
 page.locator("#analyze").click()
 assert page.locator("#results select[data-index]").first.input_value().startswith("alt:")
 page.locator("#previewBtn").click()
 assert page.locator("#previewText").input_value()=="選單"
 assert not [x for x in network if x.startswith(("http:","https:"))],network
 browser.close()
print("R9 CHROMIUM OFFLINE / USER CHOICE / EXPORT / IMPORT / PREVIEW PASS")
