"""R6 offline UI acceptance: bilingual review and local Chrome Translator runner (mock only)."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BENCH=ROOT/"benchmarks/r6/public_frozen_v1.jsonl"
REVIEW=ROOT/"examples/TW_R6_Bilingual_Quality_Review_20261024.html"
RUNNER=ROOT/"examples/TW_R6_Local_Chrome_Model_Run_20261024.html"

def browser_launch(p):
    options={"headless":True,"args":["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():options["executable_path"]="/usr/bin/chromium"
    return p.chromium.launch(**options)

with sync_playwright() as pw:
    browser=browser_launch(pw)
    page=browser.new_page(accept_downloads=True,viewport={"width":390,"height":740})
    requests=[]
    page.on("request",lambda req:requests.append(req.url))
    page.set_content(REVIEW.read_text(encoding="utf-8"))
    page.wait_for_function("document.querySelector('#item').options.length === 15")
    assert "Codex" not in page.locator("#source").inner_text()
    page.locator("#family").select_option("named")
    page.wait_for_function("document.querySelector('#item').options.length === 3")
    assert "Codex for Open Source" in page.locator("#source").inner_text()
    assert page.locator("#save").is_disabled()
    assert page.locator("#referenceBox").get_attribute("open") is None
    page.get_by_role("button",name="上下排列").click()
    assert "stacked" in page.locator("#compare").get_attribute("class")
    page.get_by_role("button",name="只看譯文").click()
    assert "translation-only" in page.locator("#compare").get_attribute("class")
    mockline=json.dumps({"id":"R6-NAMED-001",
                         "translation":"Codex for Open Source 支援符合資格的開源維護者。"},ensure_ascii=False)
    page.locator("#candidates").set_input_files({"name":"candidates.jsonl",
         "mimeType":"text/plain","buffer":(mockline+"\n").encode("utf-8")})
    page.wait_for_function("document.querySelector('#save').disabled === false")
    page.locator("#reviewer").fill("reviewer_local")
    for name in ("meaning","naturalness","taiwan_locale","register"):
        page.locator("#"+name).select_option("4")
    page.get_by_role("button",name="儲存本題評分").click()
    assert not page.locator("#export").is_disabled()
    with page.expect_download() as download_result:
        page.get_by_role("button",name="下載我的 JSONL 評分檔").click()
    download=download_result.value
    result_data=json.loads(Path(download.path()).read_text(encoding="utf-8").strip())
    assert result_data["id"]=="R6-NAMED-001"
    assert result_data["reviewer_id"]=="reviewer_local"
    assert "translation" not in result_data and "source" not in result_data
    assert not requests,requests
    page.close()

    runner=browser.new_page(accept_downloads=True,viewport={"width":390,"height":720})
    runner_requests=[]
    runner.on("request",lambda req:runner_requests.append(req.url))
    runner.set_content(RUNNER.read_text(encoding="utf-8"))
    runner.wait_for_function("document.querySelector('#dataset')!==null")
    runner.evaluate("delete window.Translator")
    runner.get_by_role("button",name="檢查 Chrome Translator API").click()
    assert "沒有提供" in runner.locator("#capability").inner_text()
    assert runner.locator("#start").is_disabled()
    # Fully simulated API: this test verifies user gestures/state flow ONLY,
    # not translation quality or real Chrome model availability.
    runner.evaluate("""() => {
      window.Translator={
        availability:async()=> 'available',
        create:async config=>({
          translate:async text=> '模擬譯文：'+text,
          destroy:()=>{}
        })
      };
    }""")
    runner.get_by_role("button",name="檢查 Chrome Translator API").click()
    runner.wait_for_function("document.querySelector('#start').disabled === false")
    runner.get_by_role("button",name="開始翻譯（可能下載模型）").click()
    runner.wait_for_function("document.querySelector('#download').disabled === false",timeout=10000)
    runner.wait_for_function("document.querySelector('#start').disabled === false")
    assert "5" in runner.locator("#results").inner_text()
    with runner.expect_download() as download_result:
        runner.get_by_role("button",name="下載候選譯文 JSONL").click()
    results=Path(download_result.value.path()).read_text(encoding="utf-8").splitlines()
    assert len(results)==5
    records=[json.loads(x) for x in results]
    assert records[0]["translation"].startswith("模擬譯文：")
    assert all("id" in r and "translation" in r for r in records)
    assert not runner_requests,runner_requests
    runner.close()
    browser.close()

print("R6 BILINGUAL UI + LOCAL MODEL RUNNER MOCK INTEGRATION PASS; REAL CHROME MODEL QUALITY NOT TESTED")
