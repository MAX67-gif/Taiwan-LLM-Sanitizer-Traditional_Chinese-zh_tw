"""TLS R205: actual native file:// Chromium Context Risk Lens integration.

Existing R204 source and manual choices remain unchanged. Risk warnings are
heuristic hints only; browser must make zero HTTP requests.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = Path(__file__).with_name("TW_Context_Risk_Lens_R205_20261124.html")
TICK = chr(96)
SOURCE = "介面 menu，餐廳 menu。餐廳設定 menu，未知 menu。" + TICK + "menu" + TICK + " 與 {{KEEP}} 保留。"


def run():
    assert HTML.is_file(), "R205_HTML_NOT_BUILT"
    errors, traffic, checks = [], [], []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get("TLS_CHROMIUM_PATH") or None,
            headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(
            accept_downloads=True, viewport={"width": 1280, "height": 940})
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: traffic.append(r.url)
                if r.url.startswith(("http://", "https://")) else None)
        page.goto(HTML.resolve().as_uri())
        assert page.locator("#lensMode").count() == 1
        page.locator("#source").fill(SOURCE)
        page.locator("#inspect").click()
        page.locator("#candidatePanel:not([hidden])").wait_for()
        assert page.locator(".candidate").count() >= 4
        summary = page.locator("#lensSummary").inner_text()
        assert "高風險 2" in summary, summary
        assert page.locator(".lens-advice[data-risk-code='CONFLICTING_CONTEXT_CUES']").count() == 1
        assert page.locator(".lens-advice[data-risk-code='AMBIGUOUS_CONTEXT_NO_CUES']").count() == 1
        checks.append("context_conflict_and_unknown_prioritized")

        page.locator("#lensMode").select_option("high_only")
        assert page.locator(".candidate").count() == 2
        assert page.locator("#source").input_value() == SOURCE
        assert page.locator("#resultPanel").is_hidden()
        checks.append("high_risk_filter_never_applies_text")

        page.locator("#lensMode").select_option("document")
        cards = page.locator(".candidate")
        assert cards.count() >= 4
        assert cards.first.locator(".lens-advice").get_attribute("data-risk-code") == "DOMAIN_CUE_PRESENT"
        cards.first.get_by_role("button", name="採用「菜單」", exact=False).click()
        assert page.locator(".lens-advice[data-risk-code='CHOICE_CONTEXT_CONFLICT']").count() == 1
        assert "已採用但需複核 1" in page.locator("#lensSummary").inner_text()
        assert page.locator("#source").input_value() == SOURCE
        checks.append("human_choice_conflict_warned_but_preserved")

        page.locator("#reviewFilter").select_option("confirmed")
        assert page.locator(".candidate").count() == 1
        page.locator("#reviewFilter").select_option("all")
        page.locator("#previewBtn").click()
        page.locator("#resultPanel:not([hidden])").wait_for()
        result = page.locator("#result").input_value()
        assert "介面 菜單" in result
        assert TICK + "menu" + TICK + " 與 {{KEEP}} 保留" in result
        assert page.locator("#source").input_value() == SOURCE
        checks.append("explicit_preview_and_r204_controls_preserved")

        page.set_viewport_size({"width": 390, "height": 820})
        assert page.locator("html").evaluate("el=>el.scrollWidth") <= 390
        checks.append("mobile_390px_no_horizontal_overflow")
        assert not errors and not traffic, {"errors": errors, "traffic": traffic}
        checks.append("zero_page_errors_zero_http")
        browser.close()
    print(json.dumps({
        "schema": "tls.r205.context-risk-chromium-evidence.v1",
        "status": "PASS", "navigation_mode": "file",
        "checked": checks, "checks": len(checks), "http_requests": 0,
        "page_errors": 0, "auto_apply": False,
        "human_language_quality_verified": False,
        "release_17_5_published": False,
    }, ensure_ascii=False))


if __name__ == "__main__":
    run()
