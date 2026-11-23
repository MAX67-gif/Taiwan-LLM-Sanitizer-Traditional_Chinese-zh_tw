#!/usr/bin/env python3
"""R207 genuine offline file:// Chromium acceptance; never substitutes set_content.
No human quality certification, no actual OS file chooser cancellation proof.
"""
from __future__ import annotations
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/"TW_Review_Focus_R207_20261124.html"
SCENARIOS=[]
SOURCE="# 原創情境\n設定 menu，午餐 menu。軟件。程式 "+chr(96)+"menu"+chr(96)+" 保持原樣。"

def note(name):
    SCENARIOS.append(name)
    print("R207_NATIVE_PASS",name,flush=True)

def main():
    assert HTML.is_file(),"R207_HTML_NOT_BUILT"
    traffic=[];errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        ctx=browser.new_context(accept_downloads=True,viewport={"width":1365,"height":930},
                                reduced_motion="reduce")
        def handle(route):
            if route.request.url.startswith(("http://","https://","ws://","wss://")):
                traffic.append("EXTERNAL_BLOCKED");route.abort("blockedbyclient")
            else:route.continue_()
        ctx.route("**/*",handle)
        page=ctx.new_page()
        page.on("pageerror",lambda err:errors.append(type(err).__name__))
        page.goto(HTML.resolve().as_uri(),wait_until="load")
        assert page.url.startswith("file://") and "R207" in page.title()
        note("real_file_url_candidate_not_content_mode")
        page.locator("#source").fill(SOURCE)
        page.locator("#inspect").click()
        page.locator("#candidatePanel:not([hidden])").wait_for()
        assert page.locator(".candidate").count()>=3
        assert "不會" in page.locator("#focusSafety").inner_text() or "待決定" in page.locator("#focusSafety").inner_text()
        note("default_full_list_no_auto_replace")
        page.locator("#focusToggle").click()
        assert page.locator("#focusToggle").get_attribute("aria-pressed")=="true"
        assert page.locator(".candidate").count()==1
        first=page.locator(".candidate").get_attribute("data-candidate-id")
        assert first
        note("focus_one_unresolved_visible")
        page.locator("#focusNext").click()
        assert page.locator(".candidate").count()==1
        next_id=page.locator(".candidate").get_attribute("data-candidate-id")
        assert first!=next_id
        page.locator("#focusPrev").click()
        assert page.locator(".candidate").get_attribute("data-candidate-id")==first
        note("explicit_navigation_is_view_only")
        page.locator(".candidate").get_by_role("button",name="保留這一處原文").click()
        assert page.locator(".candidate").count()==1
        assert page.locator(".candidate").get_attribute("data-candidate-id")!=first
        assert page.locator("#download").is_disabled()
        assert page.locator("#source").input_value()==SOURCE
        note("manual_keep_auto_advances_view_not_decision")
        page.locator("#undoReview").click()
        page.get_by_text("已復原上一個決定",exact=False).wait_for()
        page.locator("#redoReview").click()
        page.get_by_text("已重做決定",exact=False).wait_for()
        assert page.locator("#focusToggle").get_attribute("aria-pressed")=="true"
        note("undo_redo_preserve_focused_workflow")
        page.locator("#focusToggle").click()
        assert page.locator("#focusToggle").get_attribute("aria-pressed")=="false"
        assert page.locator(".candidate").count()>=3
        note("return_full_list_without_mutation")
        page.locator("#reviewFilter").select_option("unselected")
        page.locator("#focusToggle").click()
        assert page.locator(".candidate").count()==1
        assert "專注" in page.locator("#focusPosition").inner_text()
        page.locator("#reviewSearch").fill("不存在的範例")
        assert page.locator(".candidate").count()==0
        page.locator("#reviewSearch").fill("")
        assert page.locator(".candidate").count()==1
        note("filtered_focus_zero_cases_is_not_claimed_complete")
        for width in (390,768,1365):
            page.set_viewport_size({"width":width,"height":850})
            assert page.locator("html").evaluate("(x)=>x.scrollWidth")<=width
            assert page.locator("#focusToggle").is_visible()
        note("390_768_1365_responsive_focus")
        page.locator("#source").fill("新的一份資料")
        assert page.locator("#candidatePanel").is_hidden()
        assert page.locator("#download").is_disabled()
        assert page.locator("#focusNext").is_disabled() and page.locator("#focusPrev").is_disabled()
        assert "尚未分析原文" in page.locator("#focusSafety").inner_text()
        note("source_change_revokes_old_choices")
        assert traffic==[] and errors==[],{"traffic":traffic,"errors":errors}
        note("zero_external_requests_zero_page_errors")
        ctx.close();browser.close()
    assert len(SCENARIOS)==11
    print(json.dumps({
      "schema":"tls.r207.offline-focus-native-browser.v1","status":"PASS",
      "mode":"REAL_FILE_URL","scenarios":SCENARIOS,"checks":len(SCENARIOS),
      "network_requests":0,"page_errors":0,"human_translation_quality":"NOT_MEASURED",
      "real_os_file_chooser_cancel_verified":False,
      "official_suite_release_permission":"NONE",
    },ensure_ascii=False))

if __name__=="__main__":
    main()
