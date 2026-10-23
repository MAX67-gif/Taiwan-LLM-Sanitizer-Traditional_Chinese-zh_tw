"""R7 offline Chromium DOM smoke. No real game requests, account or input access."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"dist/pokebonk/chrome/content.js"
MARKER="#tls-pokebonk-r7-display-demo"
HTML="""<!doctype html><html><body>
<script type="application/x-disabled-module" src="/assets/main-future-build.js"></script>
<h1 id="heading">主菜单</h1><div id="creature">妙蛙种子</div>
<div id="attack" aria-label="十万伏特">喷射火焰</div>
<div class="player-name" id="player">小火龙</div>
<input type="text" id="nick" value="小火龙" placeholder="账号名">
<input type="password" id="password" value="test">
<p id="unknown">这个句子包含技能，但不是独立词条。</p>
</body></html>"""
with sync_playwright() as pw:
    opts={"headless":True,"args":["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():opts["executable_path"]="/usr/bin/chromium"
    browser=pw.chromium.launch(**opts)
    page=browser.new_page(viewport={"width":390,"height":800},accept_downloads=True)
    network=[]
    page.on("request",lambda req:network.append(req.url))
    page.route("https://pokebonk.com/*",lambda route:route.fulfill(status=200,content_type="text/html",body=HTML))
    page.goto("https://pokebonk.com/")
    content=SRC.read_text(encoding="utf-8")
    page.add_script_tag(content=content)
    expect(page.locator(MARKER)).to_have_count(1)
    expect(page.locator("#heading")).to_have_text("主菜单")
    expect(page.locator("#creature")).to_have_text("妙蛙种子")
    dock=page.locator(MARKER)
    assert dock.evaluate("(e)=>getComputedStyle(e).position")=="fixed"
    toggle=dock.locator("button.pill")
    initial=dock.bounding_box()
    toggle.click()
    expect(dock.locator("div.panel")).to_be_visible()
    expect(dock.locator(".note").first).to_contain_text("不同")
    expect(dock.locator("button.yes")).to_have_text("啟用臺灣用語")
    expect(page.locator("#heading")).to_have_text("主菜单")
    dock.locator("button.yes").click()
    expect(page.locator("#heading")).to_have_text("主選單")
    expect(page.locator("#creature")).to_have_text("妙蛙種子")
    expect(page.locator("#attack")).to_have_text("噴射火焰")
    expect(page.locator("#attack")).to_have_attribute("aria-label","十萬伏特")
    expect(page.locator("#player")).to_have_text("小火龙")
    expect(page.locator("#nick")).to_have_value("小火龙")
    expect(page.locator("#password")).to_have_value("test")
    expect(page.locator("#unknown")).to_have_text("这个句子包含技能，但不是独立词条。")
    page.evaluate("""() => {const p=document.createElement('p');p.id='after';p.textContent='喷火龙';document.body.append(p)}""")
    expect(page.locator("#after")).to_have_text("噴火龍")
    later=dock.bounding_box()
    assert abs(initial["x"]-later["x"])<1 and abs(initial["y"]-later["y"])<1
    dock.locator("button.no").click()
    expect(page.locator("#heading")).to_have_text("主菜单")
    expect(page.locator("#creature")).to_have_text("妙蛙种子")
    expect(page.locator("#after")).to_have_text("喷火龙")
    expect(page.locator("#attack")).to_have_attribute("aria-label","十万伏特")
    assert all(url.startswith("https://pokebonk.com/") for url in network),network
    browser.close()
print("R7 POKEBONK DOM OPT-IN/ROLLBACK/FIXED UI PASS. LIVE GAME / WEBGL NOT VERIFIED.")
