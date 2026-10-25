"""R14 Chromium opt-in capability lab: real UI, no egress, no retained content."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = (ROOT / "examples" / "TW_Provider_Capability_Lab_R14_20261025.html").as_uri()


def test_browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path=shutil.which("chromium") or None,
            args=["--no-sandbox", "--disable-dev-shm-usage"],
        )
        page = browser.new_page(viewport={"width": 1180, "height": 780})
        network = []
        errors = []
        page.on("request", lambda request: network.append(request.url) if request.url.startswith(("http://", "https://")) else None)
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.set_content((ROOT / "examples" / "TW_Provider_Capability_Lab_R14_20261025.html").read_text(encoding="utf-8"), wait_until="domcontentloaded")
        assert "R14" in page.title()
        assert page.locator("#result").is_hidden()
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "ON_DEVICE_READY"
        page.locator("details summary").click()
        assert '"networkRequested": false' in page.locator("#json").inner_text()
        page.locator("#provider").select_option("on_downloadable")
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "REQUIRES_USER_DOWNLOAD_ACTION"
        page.locator("#target").select_option("zh")
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "UNSUPPORTED_PAIR"
        page.locator("#target").select_option("zh-Hant")
        page.locator("#provider").select_option("remote")
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "CONSENT_REQUIRED"
        page.locator("#consent").select_option("explicit_granted")
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "REMOTE_DISABLED_IN_MVP"
        page.locator("#consent").select_option("revoked")
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "CONSENT_REVOKED"
        page.locator("#provider").select_option("on_ready")
        page.locator("#cancelled").select_option("yes")
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "CANCELLED"
        page.locator("#cancelled").select_option("no")
        page.locator("#origin").fill("file:///sensitive")
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "INVALID_INPUT"
        page.locator("#clear").click()
        assert page.locator("#result").is_hidden()
        page.set_viewport_size({"width": 390, "height": 844})
        page.locator("#origin").fill("https://example.org")
        page.locator("#check").click()
        assert page.locator("#decision").inner_text() == "ON_DEVICE_READY"
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "mobile horizontal overflow"
        assert not network, network
        assert not errors, errors
        print("R14 CHROMIUM OFFLINE WORKBENCH PASS: 10 user interactions; zero egress; mobile responsive; no page errors")
        browser.close()


if __name__ == "__main__":
    test_browser()
