"""Real file:// Chromium checks for the new R19 file I/O guard ONLY.

This is an evaluation fixture, NOT the original R19 ten-scenario acceptance.
All fixtures are synthetic. No user files, external fetches or network calls.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "tests" / "fixtures" / "r19_file_io_boundary.html"


def source_blob(name, data):
    return {"name": name, "mimeType": "text/markdown", "buffer": data}


def run():
    raw = "# 自製測試\r\n\r\n請使用軟件 🐾。\r\n".encode("utf-8")
    checks = {}
    external_calls = []
    browser_errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=os.environ.get("TLS_CHROMIUM_PATH") or None,
            headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        context = browser.new_context(
            accept_downloads=True,
            service_workers="block",
            viewport={"width": 1280, "height": 900},
        )
        context.on("request", lambda req: external_calls.append(1)
                   if req.url.startswith(("https://", "http://")) else None)
        context.route("http://**/*", lambda route: route.abort())
        context.route("https://**/*", lambda route: route.abort())
        page = context.new_page()
        page.on("pageerror", lambda _err: browser_errors.append(1))
        page.goto(HTML.as_uri())
        assert page.url == HTML.as_uri(), "NOT_REAL_FILE_URL"
        expect(page.get_by_role("heading", name="R19 File I/O Boundary (Evaluation Only)")).to_be_visible()

        page.locator("#file").set_input_files(source_blob("valid.md", raw))
        expect(page.locator("#status")).to_have_text("IMPORTED")
        page.locator("#mark").click()
        expect(page.locator("#decision")).to_have_text("SELECTED")
        source_before = page.locator("#source").input_value()
        checks["original_valid_utf8_imported"] = True

        bad_inputs = [
            ("invalid_utf8", "bad.md", bytes([255, 254, 250]), "INVALID_UTF8"),
            ("utf8_bom", "bom.md", bytes([239, 187, 191, 65]), "UTF8_BOM"),
            ("nul", "nul.md", b"a\x00b", "NUL_BYTE"),
            ("oversize", "large.md", b"A" * 65537, "INPUT_LIMIT"),
            ("extension", "wrong.json", b"{}", "UNSUPPORTED_EXTENSION"),
        ]
        for key, name, payload, expected in bad_inputs:
            page.locator("#file").set_input_files(source_blob(name, payload))
            expect(page.locator("#status")).to_have_text(expected)
            assert page.locator("#source").input_value() == source_before, "REJECT_CHANGED_SOURCE"
            expect(page.locator("#decision")).to_have_text("SELECTED")
            checks[key + "_preserved_source_and_decision"] = True

        # A synthetic/file-like reader can disagree with browser File.size.
        # Only a fully validated size match may trigger the UI commit callback.
        page.evaluate("""() => {
          const old = File.prototype.arrayBuffer;
          window.__tlsRestoreSizeProbe = () => { File.prototype.arrayBuffer = old; };
          File.prototype.arrayBuffer = async function () {
            const original = await old.call(this);
            const inflated = new Uint8Array(original.byteLength + 1);
            inflated.set(new Uint8Array(original));
            inflated[inflated.length - 1] = 65;
            return inflated.buffer;
          };
        }""")
        page.locator("#file").set_input_files(source_blob("mismatch.md", b"abc"))
        expect(page.locator("#status")).to_have_text("FILE_SIZE_MISMATCH")
        assert page.locator("#source").input_value() == source_before
        expect(page.locator("#decision")).to_have_text("SELECTED")
        checks["metadata_mismatch_preserves_source_and_decision"] = True
        page.evaluate("() => window.__tlsRestoreSizeProbe()")

        # Simulate the empty-change event that cancel/no-selection produces.
        # This is NOT an operating-system chooser cancellation test.
        page.locator("#file").evaluate(
            "(node) => node.dispatchEvent(new Event('change', {bubbles: true}))"
        )
        assert page.locator("#source").input_value() == source_before
        expect(page.locator("#decision")).to_have_text("SELECTED")
        checks["empty_file_change_preserves_work"] = True

        with page.expect_download() as event:
            page.locator("#download").click()
        downloaded = Path(event.value.path()).read_bytes()
        assert downloaded == raw, "CRLF_NO_EDIT_BYTES_CHANGED"
        checks["crlf_zero_edit_native_download_exact"] = True
        checks["original_bytes"] = len(raw)
        checks["download_bytes"] = len(downloaded)
        checks["original_cr_count"] = raw.count(b"\r")
        checks["download_cr_count"] = downloaded.count(b"\r")

        page.locator("#replace").click()
        with page.expect_download() as event:
            page.locator("#download").click()
        changed = Path(event.value.path()).read_bytes()
        expected = raw.replace("軟件".encode("utf-8"), "軟體".encode("utf-8"))
        assert changed == expected, "CRLF_EDITED_BYTES_MISMATCH"
        checks["crlf_one_edit_native_download_exact"] = True

        # Delay real File.arrayBuffer, Clear, then resolve the old read.
        # This does not exercise a native operating-system file chooser.
        page.evaluate("""() => {
          const original = File.prototype.arrayBuffer;
          window.__restoreR19Guard = () => { File.prototype.arrayBuffer = original; };
          File.prototype.arrayBuffer = function () {
            return new Promise(resolve => {
              window.__resolveR19LateFile = () => resolve(
                new TextEncoder().encode('stale synthetic document').buffer
              );
            });
          };
        }""")
        page.locator("#file").set_input_files(
            source_blob("delayed.md", b"stale synthetic document")
        )
        page.wait_for_function("() => typeof window.__resolveR19LateFile === 'function'")
        page.locator("#clear").click()
        expect(page.locator("#status")).to_have_text("CLEARED")
        expect(page.locator("#source")).to_have_value("")
        page.evaluate("() => window.__resolveR19LateFile()")
        page.wait_for_timeout(100)
        expect(page.locator("#source")).to_have_value("")
        expect(page.locator("#status")).to_have_text("CLEARED")
        checks["stale_read_after_clear_did_not_resurrect"] = True
        page.evaluate("() => window.__restoreR19Guard()")

        # Stale asynchronous rejection must not write an error after Clear.
        page.evaluate("""() => {
          const original = File.prototype.arrayBuffer;
          window.__restoreR19Guard = () => { File.prototype.arrayBuffer = original; };
          File.prototype.arrayBuffer = function () {
            return new Promise((_resolve, reject) => {
              window.__rejectR19LateFile = () => reject(
                new Error('synthetic local path must not leak')
              );
            });
          };
        }""")
        page.locator("#file").set_input_files(source_blob("rejected.md", b"later"))
        page.wait_for_function("() => typeof window.__rejectR19LateFile === 'function'")
        page.locator("#clear").click()
        page.evaluate("() => window.__rejectR19LateFile()")
        page.wait_for_timeout(100)
        expect(page.locator("#source")).to_have_value("")
        expect(page.locator("#status")).to_have_text("CLEARED")
        checks["stale_rejection_after_clear_ignored"] = True
        page.evaluate("() => window.__restoreR19Guard()")

        browser_version = browser.version
        context.close()
        browser.close()
    assert not external_calls, "EGRESS_DETECTED"
    assert not browser_errors, "PAGE_ERROR_DETECTED"
    report = {
        "schema": "tls.r19.file-io-boundary.native-research.v1",
        "status": "PASS",
        "evaluation_only": True,
        "r19_full_studio_native_acceptance": "NOT_RUN",
        "suite_baseline": "17.3.2",
        "navigation": "ACTUAL_FILE_URL",
        "fixture": "SYNTHETIC_ONLY",
        "fixture_sha256": hashlib.sha256(HTML.read_bytes()).hexdigest(),
        "browser_version": browser_version,
        "check_results": checks,
        "egress_request_count": len(external_calls),
        "page_error_count": len(browser_errors),
        "os_file_chooser_tested": False,
        "human_translation_quality": "NOT_MEASURED",
        "real_user_adoption": "NOT_MEASURED",
        "no_source_text_or_filepath_in_report": True,
    }
    target = os.environ.get("TLS_R19_FILEIO_REPORT")
    if target:
        destination = Path(target)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    run()
