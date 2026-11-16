"""TLS R203 real local Chromium: save/restore choices, negative cases, zero egress."""
import hashlib
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = Path(__file__).with_name("TW_Review_Continuity_R203_20261116.html")
SOURCE = '設定 menu，餐廳 menu。軟件與點擊率不一樣。\x60menu\x60 及 {{KEEP}} 不動。'


def inspect(page, text=SOURCE):
    page.locator("#source").fill(text)
    page.get_by_role("button", name="尋找臺灣用語建議").click()
    page.locator("#candidatePanel:not([hidden])").wait_for()
    return page.locator(".candidate")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=(os.environ.get("TLS_CHROMIUM_PATH") or None),
            headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(accept_downloads=True, viewport={"width": 1280, "height": 900})
        page = context.new_page()
        requests, errors = [], []
        page.on("request", lambda req: requests.append(req.url)
                if req.url.startswith(("http://", "https://")) else None)
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.goto("about:blank")
        page.set_content(HTML.read_text(encoding="utf-8"))
        cards = inspect(page)
        menus = cards.filter(has=page.locator("h3", has_text="「menu」"))
        assert menus.count() == 2
        menus.nth(0).get_by_role("button", name="採用「選單」", exact=False).click()
        menus.nth(1).get_by_role("button", name="採用「菜單」", exact=False).click()
        cards.filter(has=page.locator("h3", has_text="「軟件」")).first.get_by_role(
            "button", name="保留這一處原文").click()
        with page.expect_download() as download:
            page.get_by_role("button", name="下載審閱決定 JSON").click()
        with tempfile.TemporaryDirectory() as folder:
            review = Path(folder) / "review.json"
            download.value.save_as(review)
            raw = review.read_text(encoding="utf-8")
            data = json.loads(raw)
            assert data["schema"] == "tls.r203.review-continuity.v1"
            assert len(data["choices"]) == 3
            assert data["contains_original_text"] is False
            assert data["contains_replacement_text"] is False
            for secret in ("餐廳", "軟件", "選單", "菜單", "{{KEEP}}"):
                assert secret not in raw
            page.get_by_role("button", name="清除所有內容").click()
            assert page.locator("#candidatePanel").is_hidden()
            inspect(page)
            page.locator("#importReview").set_input_files(str(review))
            page.get_by_text("已重新載入 3 筆人工決定", exact=False).wait_for()
            assert page.locator(".sel").filter(has_text="本處已確認替換").count() == 2
            assert page.locator(".sel").filter(has_text="本處明確保留原文").count() == 1
            assert page.locator("#resultPanel").is_hidden()
            page.get_by_role("button", name="產生安全差異預覽").click()
            page.locator("#resultPanel:not([hidden])").wait_for()
            preview = page.locator("#result").input_value()
            assert "設定 選單，餐廳 菜單。軟件" in preview
            assert "\x60menu\x60 及 {{KEEP}} 不動" in preview
            assert page.locator("#source").input_value() == SOURCE
            inspect(page, SOURCE.replace("設定 ", "設定好 "))
            page.locator("#importReview").set_input_files(str(review))
            page.get_by_text("SOURCE_OR_DICTIONARY_CHANGED", exact=False).wait_for()
            assert page.locator("#resultPanel").is_hidden()
            assert page.locator(".sel").filter(has_text="尚未選擇").count() > 0
            modified = json.loads(raw)
            modified["auto_apply"] = True
            corrupt = Path(folder) / "tampered.json"
            corrupt.write_text(json.dumps(modified), encoding="utf-8")
            page.locator("#importReview").set_input_files(str(corrupt))
            page.get_by_text("SCHEMA_OR_PERMISSION", exact=False).wait_for()
            assert page.locator("#resultPanel").is_hidden()
            sha = hashlib.sha256(raw.encode()).hexdigest()
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.locator("html").evaluate("el=>el.scrollWidth") <= 390
        page.get_by_role("button", name="清除所有內容").click()
        assert page.locator("#candidatePanel").is_hidden()
        assert not requests and not errors, {"requests":requests, "errors":errors}
        browser.close()
    print(json.dumps({
        "schema":"tls.r203.chromium-evidence.v1", "status":"PASS",
        "tested":["manual_choice_save","exact_hash_resume","changed_input_rejected",
                  "auto_apply_rejected","original_unchanged","zero_http_egress","mobile_390"],
        "saved_choice_count":3,"review_receipt_sha256":sha,
        "http_requests":0,"page_errors":0,"human_quality":"NOT_TESTED",
        "new_release_published":False
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
