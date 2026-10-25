"""R15 real Chromium: shadow-only Markdown/JSON/Prompt UI, no egress, keyboard/mobile."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / 'examples' / 'TW_Structured_Integrity_Lab_R15_20261025.html'


def test_browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,
                                    executable_path=shutil.which('chromium') or None,
                                    args=['--no-sandbox', '--disable-dev-shm-usage'])
        page = browser.new_page(viewport={'width': 1150, 'height': 800}, accept_downloads=True)
        egress, errors = [], []
        page.on('request', lambda req: egress.append(req.url) if req.url.startswith(('https://', 'http://')) else None)
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.set_content(DOC.read_text(encoding='utf-8'), wait_until='domcontentloaded')
        assert 'R15' in page.title()
        assert page.locator('#report').is_hidden()
        page.locator('#analyze').click()
        assert page.locator('#state').inner_text() == 'OK'
        assert page.locator('#edit').is_visible()
        assert page.locator('.use-segment').count() > 0
        assert page.locator('#compare').is_hidden()
        text = page.locator('#source').input_value()
        page.locator('.use-segment').first.check()
        page.locator('.replacement').first.fill('請點選主選單')
        page.locator('#preview').click()
        assert page.locator('#compare').is_visible()
        assert 'SAFE_PREVIEW_NOT_APPLIED' in page.locator('#preview-state').inner_text()
        assert '請點選主選單' in page.locator('#result').inner_text()
        assert 'GitHub' in page.locator('#result').inner_text()
        assert page.locator('#source').input_value() == text, 'source must remain unchanged'
        page.locator('#reset-preview').click()
        assert page.locator('#compare').is_hidden()
        with page.expect_download() as download:
            page.locator('#save').click()
        blob = download.value.path().read_text(encoding='utf-8')
        assert 'input_sha256' in blob and 'contains_original_text' in blob
        assert '請 click 主選單' not in blob
        assert 'https://' not in blob
        page.locator('#format').select_option('json')
        page.locator('#sample').click()
        page.locator('#analyze').click()
        assert page.locator('#state').inner_text() == 'OK'
        assert page.locator('.use-segment').count() >= 1
        json_input = page.locator('#source').input_value()
        page.locator('.use-segment').first.check()
        page.locator('.replacement').first.fill('點選選單')
        page.locator('#preview').click()
        assert '點選選單' in page.locator('#result').inner_text()
        assert 'https://example.org' in page.locator('#result').inner_text()
        assert page.locator('#source').input_value() == json_input
        page.locator('#format').select_option('prompt')
        page.locator('#sample').click()
        page.locator('#analyze').click()
        assert page.locator('#state').inner_text() == 'OK'
        assert page.locator('#counts').inner_text().startswith('可預覽')
        page.locator('#format').select_option('markdown')
        page.locator('#source').fill('A message with `an unclosed inline code\n')
        page.locator('#analyze').click()
        assert page.locator('#state').inner_text() == 'REJECTED'
        assert page.locator('#edit').is_hidden()
        page.locator('#clear').click()
        assert page.locator('#report').is_hidden()
        assert page.locator('#source').input_value() == ''
        page.set_viewport_size({'width': 380, 'height': 790})
        page.locator('#sample').click()
        page.locator('#analyze').click()
        assert page.locator('#state').inner_text() == 'OK'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'no horizontal overflow on mobile'
        assert not egress, 'network egress detected: '+str(egress)
        assert not errors, 'JavaScript exception: '+str(errors)
        browser.close()
        print('R15 CHROMIUM PASS: Markdown/JSON/Prompt; safe preview; export; clear; reject; mobile; zero egress')


if __name__ == '__main__':
    test_browser()
