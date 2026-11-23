"""R210 real Chromium offline evidence intake: no upload, no identity claims.
Default native file://; managed sandboxes may use explicit content-only mode.
Never report set_content as file URL acceptance.
"""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = Path(__file__).with_name("TW_Feedback_Audit_R210_20261124.html")
MODE = os.environ.get("TLS_BROWSER_MODE", "file")


def record(**kw):
    base = {
        "schema": "tls.r208.local-voluntary-feedback.v1",
        "status": "LOCAL_USER_SELECTED_FEEDBACK_NOT_VERIFIED",
        "stage": "LOCAL_EXPORT_ACTION_TRIGGERED",
        "completed_steps": 5, "total_steps": 5,
        "reviewable_count": 3, "decision_count": 2, "omitted_count": 0,
        "partial_coverage": False, "export_action_triggered": True,
        "clarity": "EASY", "outcome": "FINISHED",
        "local_download_consent": True, "sharing_authorized": False,
        "contains_source_text": False, "contains_source_digest": False,
        "contains_replacement_text": False, "contains_candidate_ids": False,
        "contains_file_names": False, "contains_user_identity": False,
        "network_requested": False, "auto_apply": False, "approval": "NONE",
        "real_human_identity_verified": False, "translation_quality_verified": False,
        "external_adoption_verified": False,
    }
    base.update(kw)
    return base


def encoded(v, spaces=None):
    return json.dumps(v, ensure_ascii=False, separators=(",", ":") if spaces is None else None).encode("utf-8")


def main():
    assert MODE in ("file", "content")
    assert HTML.is_file(), "R210_MISSING_OFFLINE_HTML"
    traffic, errors, checks = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get("TLS_CHROMIUM_PATH") or None,
            headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        ctx = browser.new_context(accept_downloads=True, viewport={"width": 1280, "height": 880})
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: traffic.append("EXTERNAL")
                if r.url.startswith(("http://", "https://", "ws://", "wss://")) else None)
        if MODE == "file":
            page.goto(HTML.resolve().as_uri())
            assert page.url.startswith("file://")
        else:
            page.goto("about:blank")
            page.set_content(HTML.read_text("utf-8"))
        assert "R210" in page.title()
        assert page.locator("#analyzeFeedback").is_disabled()
        assert page.locator("#results").is_hidden()
        checks.append("no_analysis_or_upload_without_explicit_consent")

        a = record()
        a_reordered = dict(reversed(list(a.items())))
        b = record(stage="NEED_REVIEW", completed_steps=2,
                   reviewable_count=4, decision_count=0,
                   export_action_triggered=False,
                   clarity="SOME_DIFFICULTY", outcome="NOT_FINISHED")
        poisoned = dict(a)
        poisoned["original_text"] = "PRIVATE_SENTENCE_DO_NOT_LEAK"
        files = [
            {"name": "reportA.json", "mimeType": "application/json", "buffer": encoded(a)},
            {"name": "duplicate.json", "mimeType": "application/json", "buffer": encoded(a_reordered, spaces=2)},
            {"name": "reportB.json", "mimeType": "application/json", "buffer": encoded(b)},
            {"name": "sensitive-user-file-name.json", "mimeType": "application/json", "buffer": encoded(poisoned)},
        ]
        page.locator("#feedbackFiles").set_input_files(files)
        assert page.locator("#analyzeFeedback").is_disabled()
        page.locator("#authorized").check()
        assert page.locator("#analyzeFeedback").is_enabled()
        checks.append("file_picker_needs_separate_check_box_authorization")
        page.locator("#analyzeFeedback").click()
        page.locator("#results:not([hidden])").wait_for()
        metrics = page.locator("#metrics").inner_text()
        for expected in ["選取檔案\n4", "有效不同內容\n2", "重複內容\n1", "拒絕檔案\n1"]:
            assert expected in metrics, (expected, metrics)
        assert "不是獨立參與者" in page.locator("#safety").inner_text()
        assert "PRIVATE_SENTENCE" not in page.locator("body").inner_text()
        assert "sensitive-user-file-name" not in page.locator("body").inner_text()
        checks.append("duplicate_payload_not_distinct_people_and_sensitive_field_rejected")
        with page.expect_download() as d:
            page.locator("#downloadSummary").click()
        with tempfile.TemporaryDirectory() as dirname:
            target = Path(dirname) / "summary.json"
            d.value.save_as(target)
            raw = target.read_text("utf-8")
        data = json.loads(raw)
        assert data["input_files"] == 4
        assert data["accepted_distinct_payloads"] == 2
        assert data["duplicate_payloads"] == 1
        assert data["rejected_files"] == 1
        assert data["real_user_count_verified"] is False
        assert data["adoption_verified"] is False
        assert data["translation_quality_verified"] is False
        assert data["contains_original_text"] is False
        assert data["network_requested"] is False
        for forbidden in ["PRIVATE_SENTENCE", "sensitive-user-file-name", "source_sha256", "\"candidate_id\":" ]:
            assert forbidden not in raw, forbidden
        checks.append("explicit_local_export_no_personal_or_source_fields")
        page.locator("#authorized").uncheck()
        assert page.locator("#results").is_hidden()
        assert page.locator("#downloadSummary").is_disabled()
        checks.append("revoke_local_authorization_invalidates_old_summary")
        page.locator("#clearAll").click()
        assert page.locator("#feedbackFiles").input_value() == ""
        assert page.locator("#authorized").is_checked() is False
        assert page.locator("#results").is_hidden()
        checks.append("explicit_clear_revokes_all_local_state")
        # Stale async read must not strand the consent-gated button.
        page.evaluate("""() => {const base=File.prototype.arrayBuffer;
          File.prototype.arrayBuffer=async function(){const raw=await base.call(this);
          if(this.name==='slow.json')return await new Promise(resolve=>{window.releaseRead=()=>resolve(raw);});
          return raw;};}""")
        page.locator("#feedbackFiles").set_input_files([
            {"name":"slow.json", "mimeType":"application/json", "buffer":encoded(a)}])
        page.locator("#authorized").check()
        page.locator("#analyzeFeedback").click()
        for _ in range(50):
            if page.evaluate("() => typeof window.releaseRead === 'function'"):
                break
            page.wait_for_timeout(40)
        else:
            raise AssertionError("ASYNC_READ_WAS_NOT_HELD")
        page.locator("#authorized").uncheck()
        assert page.locator("#analyzeFeedback").is_disabled()
        page.locator("#authorized").check()
        assert page.locator("#analyzeFeedback").is_enabled(), "STALE_BUSY_LOCK_AFTER_CONSENT_RESTORED"
        page.evaluate("window.releaseRead()")
        page.wait_for_timeout(100)
        assert page.locator("#results").is_hidden()
        page.locator("#feedbackFiles").set_input_files([
            {"name":"fast.json", "mimeType":"application/json", "buffer":encoded(a)}])
        page.locator("#analyzeFeedback").click()
        page.locator("#results:not([hidden])").wait_for()
        assert page.locator("#metrics").inner_text().count("有效不同內容") == 1
        checks.append("stale_async_read_cancel_then_reauthorize_never_locks_ui")
        page.locator("#clearAll").click()
        page.set_viewport_size({"width": 390, "height": 820})
        assert page.locator("html").evaluate("x=>x.scrollWidth") <= 390
        checks.append("mobile_390px_no_horizontal_overflow")
        assert not traffic and not errors, {"network":traffic,"errors":errors}
        checks.append("zero_external_requests_zero_page_errors")
        browser.close()
    print(json.dumps({
        "schema":"tls.r210.local-evidence-chromium-receipt.v1", "status":"PASS",
        "navigation_mode":MODE, "checks":checks,"check_count":len(checks),
        "external_network_requests":0, "page_errors":0,
        "actual_people_verified":False,"human_language_quality_verified":False,
        "release_published":False,
    },ensure_ascii=False))

if __name__ == "__main__":
    main()
