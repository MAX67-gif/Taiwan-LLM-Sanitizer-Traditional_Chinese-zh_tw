"""Cloud-only R17.2 native gap replay; NOT R19 native acceptance.

Only original synthetic fixtures. This is an observation tool, NOT a
test of a changed or released R19 product. Never print source text/paths.
The frozen R17.2 original is not modified or re-generated.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "examples" / "TW_Wording_Assistant_R172_20261027.html"
EXPECTED_SHA = "4ce1cfae97832937907ec6aa3c56c11b552d2cbd04c7b27c676379637be6b873"
INPUT = "# Synthetic test\n\n請使用軟件。\n"
MAX_BYTES = 65536


def run():
    original = HTML.read_bytes()
    sha = hashlib.sha256(original).hexdigest()
    if sha != EXPECTED_SHA:
        raise RuntimeError("R172_FROZEN_HTML_SHA_MISMATCH")

    observations = {}
    attempted_egress = []
    errors = []
    with sync_playwright() as engine:
        browser = engine.chromium.launch(
            executable_path=os.environ.get("TLS_CHROMIUM_PATH") or None,
            headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        context = browser.new_context(
            accept_downloads=True, service_workers="block",
            viewport={"width": 1280, "height": 900},
        )
        context.on("request", lambda req: attempted_egress.append(1)
                   if req.url.startswith(("http://", "https://")) else None)
        context.route("http://**/*", lambda route: route.abort())
        context.route("https://**/*", lambda route: route.abort())
        page = context.new_page()
        page.on("pageerror", lambda err: errors.append(1))
        page.goto(HTML.as_uri())
        if page.url != HTML.as_uri():
            raise RuntimeError("NOT_ACTUAL_FILE_URL")

        def prime():
            page.locator("#source").fill(INPUT)
            page.locator("#inspect").click()
            expect(page.locator("#candidatePanel")).to_be_visible()
            card = page.locator(".candidate").filter(has_text="軟件").first
            card.get_by_role("button", name="採用「軟體」", exact=False).first.click()
            expect(page.locator('[aria-pressed="true"]')).to_have_count(1)
            return page.locator("#source").input_value()

        before = prime()
        page.locator("#file").set_input_files({
            "name": "invalid.md", "mimeType": "text/markdown",
            "buffer": bytes([255, 254, 250]),
        })
        expect(page.locator("#status")).to_contain_text("已於本機載入文字")
        after = page.locator("#source").input_value()
        observations["invalid_utf8"] = {
            "source_preserved": after == before,
            "replacement_chars_observed": "\ufffd" in after,
            "selection_preserved": page.locator('[aria-pressed="true"]').count() > 0,
            "rejection_observed": "READ_FILE_FAILED" in page.locator("#status").inner_text(),
        }

        before = prime()
        page.locator("#file").set_input_files({
            "name": "oversize.md", "mimeType": "text/markdown",
            "buffer": b"A" * (MAX_BYTES + 1),
        })
        expect(page.locator("#status")).to_contain_text("INPUT_LIMIT")
        observations["oversize"] = {
            "source_preserved": page.locator("#source").input_value() == before,
            "selection_preserved": page.locator('[aria-pressed="true"]').count() > 0,
            "rejected_with_limit": True,
        }

        raw = "# Synthetic CRLF\r\n\r\n請使用軟件。\r\n".encode("utf-8")
        page.locator("#file").set_input_files({
            "name": "crlf.md", "mimeType": "text/markdown", "buffer": raw,
        })
        expect(page.locator("#status")).to_contain_text("已於本機載入文字")
        page.locator("#inspect").click()
        expect(page.locator("#candidatePanel")).to_be_visible()
        page.locator("#previewBtn").click()
        expect(page.locator("#resultPanel")).to_be_visible()
        with page.expect_download() as event:
            page.locator("#download").click()
        downloaded = Path(event.value.path()).read_bytes()
        observations["crlf_roundtrip"] = {
            "no_choice_download_equals_original": downloaded == raw,
            "download_len": len(downloaded),
            "input_len": len(raw),
        }

        browser_version = browser.version
        context.close()
        browser.close()

    report = {
        "schema": "tls.r19-shadow.r172-native-baseline.v1",
        "status": "OBSERVATION_COMPLETE",
        "suite_baseline": "17.3.2",
        "target_product": "FROZEN_R17.2_NOT_R19",
        "html_sha256": sha,
        "navigation": "ACTUAL_FILE_URL",
        "browser_version": browser_version,
        "fixture": "SYNTHETIC_ONLY",
        "observations": observations,
        "os_file_dialog_cancel": "NOT_TESTED",
        "r19_native_10_scenarios": "NOT_RUN",
        "network_requests": len(attempted_egress),
        "page_errors": len(errors),
        "human_language_quality": "NOT_MEASURED",
        "user_adoption": "NOT_MEASURED",
        "no_original_or_replacement_text_in_report": True,
    }
    if attempted_egress or errors:
        raise RuntimeError("NATIVE_BASELINE_NETWORK_OR_PAGE_ERROR")
    path = os.environ.get("TLS_R19_BASELINE_REPORT")
    if path:
        dest = Path(path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    run()
