"""Replay the original showcase through shipped R17.2 UI, never a mock page.

Synthetic engineering checks only; no human quality or adoption measurement.
No screenshots, source text logging, server, or network transport is required.
"""
from pathlib import Path
import hashlib
import json
import os
import tempfile
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
SHOWCASE = ROOT / 'docs/showcase'
HTML = ROOT / 'examples/TW_Wording_Assistant_R172_20261027.html'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    source_bytes = (SHOWCASE / 'source.md').read_bytes()
    preview_bytes = (SHOWCASE / 'preview.md').read_bytes()
    source, preview = source_bytes.decode('utf-8'), preview_bytes.decode('utf-8')
    decisions = json.loads((SHOWCASE / 'decisions.json').read_text(encoding='utf-8'))
    verification = json.loads((SHOWCASE / 'verification.json').read_text(encoding='utf-8'))
    for name, data in [('docs/showcase/source.md', source_bytes),
                       ('docs/showcase/preview.md', preview_bytes),
                       ('docs/showcase/decisions.json', (SHOWCASE / 'decisions.json').read_bytes()),
                       ('examples/TW_Wording_Assistant_R172_20261027.html', HTML.read_bytes())]:
        assert digest(data) == verification['artifacts'][name]['sha256'], name
    assert decisions['source_sha256'] == digest(source_bytes)
    requests, errors = [], []
    confirmed = kept = unselected = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get('TLS_CHROMIUM_PATH') or None,
            headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(accept_downloads=True, service_workers='block',
                                      viewport={'width': 1280, 'height': 900})
        context.on('request', lambda request: requests.append(request.url)
                   if request.url.startswith(('http://', 'https://')) else None)
        # Fail closed if a future UI attempts egress; any attempt still fails below.
        context.route('http://**/*', lambda route: route.abort())
        context.route('https://**/*', lambda route: route.abort())
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(HTML.as_uri())
        assert page.url == HTML.as_uri()
        page.locator('#file').set_input_files(SHOWCASE / 'source.md')
        expect(page.locator('#source')).to_have_value(source)
        page.locator('#inspect').click()
        expect(page.locator('#candidatePanel')).to_be_visible()
        expect(page.locator('.candidate')).to_have_count(verification['counts']['candidates'])
        # No choices means an actual UI preview preserves the entire original.
        page.locator('#previewBtn').click()
        expect(page.locator('#resultPanel')).to_be_visible()
        expect(page.locator('#result')).to_have_value(source)
        for decision, ledger in zip(decisions['choices'], verification['choices'], strict=True):
            card = page.locator('[data-candidate-id="' + decision['candidate_id'] + '"]')
            expect(card.locator('h3')).to_have_text(
                '「' + decision['original_text'] + '」 · 位置 ' + str(decision['start'] + 1))
            if decision['action'] == 'CONFIRM':
                button = card.get_by_role('button', name='採用「' + ledger['replacement'] + '」', exact=False)
                button.click()
                expect(button).to_have_attribute('aria-pressed', 'true')
                confirmed += 1
            elif decision['action'] == 'KEEP_ORIGINAL':
                card.get_by_role('button', name='保留這一處原文', exact=True).click()
                expect(card.locator('.sel')).to_have_text('本處明確保留原文')
                kept += 1
            else:
                if decision['resolution'] == 'BLOCKED':
                    expect(card.get_by_role('button')).to_have_count(0)
                    expect(card.locator('.why')).to_contain_text('KNOWN_NON_UI_CONTEXT')
                else:
                    expect(card.locator('.sel')).to_have_text('尚未選擇，保留原文')
                unselected += 1
                continue
            # Every clicked choice invalidates the earlier preview and export.
            expect(page.locator('#resultPanel')).to_be_hidden()
            expect(page.locator('#result')).to_have_value('')
            expect(page.locator('#download')).to_be_hidden()
            expect(page.locator('#source')).to_have_value(source)
        assert (confirmed, kept, unselected) == (4, 2, 2)
        page.locator('#previewBtn').click()
        expect(page.locator('#resultPanel')).to_be_visible()
        expect(page.locator('#result')).to_have_value(preview)
        expect(page.locator('#previewState')).to_contain_text('SAFE_PREVIEW_NOT_APPLIED')
        expect(page.locator('#source')).to_have_value(source)
        with page.expect_download() as info:
            page.locator('#download').click()
        download = info.value
        assert download.suggested_filename == 'TLS_Wording_Reviewed_Preview.md'
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'reviewed.md'
            download.save_as(target)
            assert target.read_bytes() == preview_bytes, 'download must equal committed preview bytes'
            downloaded_sha = digest(target.read_bytes())
        # An actual later choice revokes a completed preview and its export.
        third_menu = page.locator('[data-candidate-id="c00006"]')
        third_menu.get_by_role('button', name='取消這一處選擇', exact=True).click()
        expect(page.locator('#resultPanel')).to_be_hidden()
        expect(page.locator('#result')).to_have_value('')
        expect(page.locator('#download')).to_be_hidden()
        page.locator('#previewBtn').click()
        expect(page.locator('#resultPanel')).to_be_visible()
        page.locator('#source').fill(source + '\n來源已更新。')
        expect(page.locator('#candidatePanel')).to_be_hidden()
        expect(page.locator('#resultPanel')).to_be_hidden()
        expect(page.locator('#result')).to_have_value('')
        expect(page.locator('#download')).to_be_hidden()
        # Reloading the same file restores source, never old choices or preview.
        page.locator('#file').set_input_files(SHOWCASE / 'source.md')
        expect(page.locator('#source')).to_have_value(source)
        page.locator('#inspect').click()
        expect(page.locator('#candidatePanel')).to_be_visible()
        expect(page.locator('[aria-pressed="true"]')).to_have_count(0)
        page.locator('#previewBtn').click()
        expect(page.locator('#result')).to_have_value(source)
        assert not requests and not errors, {'network_requests': len(requests), 'page_errors': len(errors)}
        context.close()
        browser.close()
    assert (SHOWCASE / 'source.md').read_bytes() == source_bytes, 'source file must be unchanged'
    assert (SHOWCASE / 'preview.md').read_bytes() == preview_bytes
    print(json.dumps({'result': 'PASS', 'method': 'SHIPPED_HTML_FILE_UI',
                      'html_sha256': digest(HTML.read_bytes()),
                      'source_sha256': digest(source_bytes), 'preview_sha256': downloaded_sha,
                      'confirmed_choices_clicked': confirmed, 'keep_choices_clicked': kept,
                      'unselected_candidates': unselected,
                      'download_bytes_equal': True, 'source_unchanged': True,
                      'choice_and_source_invalidation': True, 'network_requests': len(requests),
                      'page_errors': len(errors), 'human_quality': 'NOT_TESTED',
                      'adoption': 'NOT_COLLECTED'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
