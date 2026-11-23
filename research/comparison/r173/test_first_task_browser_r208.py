#!/usr/bin/env python3
"""R208 native file URL first-task Chromium acceptance, no outgoing requests.
Sandbox policy may require explicit TLS_BROWSER_MODE=content; that is NOT
reported as native file URL evidence. Original source and user text stay local.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
HTML = HERE / 'TW_First_Task_Guided_R208_20261124.html'
MODE = os.environ.get('TLS_BROWSER_MODE', 'file')
TICK = chr(96)


def main():
    assert MODE in {'file', 'content'}
    assert HTML.exists(), 'R208_HTML_NOT_BUILT'
    checks, requests, errors = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.environ.get('TLS_CHROMIUM_PATH') or None,
            headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(accept_downloads=True,
                                      viewport={'width': 1365, 'height': 930})
        page = context.new_page()
        page.set_default_timeout(8000)
        page.on('pageerror', lambda x: errors.append(str(x)))
        page.on('request', lambda q: requests.append(q.url)
                if q.url.startswith(('http://', 'https://', 'ws://', 'wss://')) else None)
        if MODE == 'file':
            page.goto(HTML.as_uri())
            assert page.url.startswith('file://')
        else:
            page.goto('about:blank')
            page.set_content(HTML.read_text('utf-8'))
        assert 'R208' in page.title()
        assert page.locator('#firstTaskR208').is_visible()
        assert page.locator('#r208Progress').get_attribute('value') == '0'
        assert page.locator('#r208FeedbackDownload').is_disabled()
        checks.append('initial_no_auto_action_or_remote_feedback')

        page.locator('#r208Start').click()
        page.locator('#candidatePanel:not([hidden])').wait_for()
        page.wait_for_function("document.querySelector('#r208Progress').value===2")
        source = page.locator('#source').input_value()
        assert source.startswith('# 原創操作範例')
        assert '2／5' in page.locator('#r208Stage').inner_text()
        assert page.locator('#resultPanel').is_hidden()
        assert page.locator('.sel').filter(has_text='已採用').count() == 0
        checks.append('first_click_loads_original_demo_and_inspects_no_rewrite')

        page.locator('#r208Next').click()
        assert page.locator('#focusToggle').get_attribute('aria-pressed') == 'true'
        assert page.locator('.candidate').count() == 1
        assert page.locator('#r208Progress').get_attribute('value') == '2'
        checks.append('guide_focuses_first_unresolved_without_decision')

        page.locator('.candidate button').filter(has_text='採用「').first.click()
        page.wait_for_function("document.querySelector('#r208Progress').value===3")
        assert page.locator('#r208Next').inner_text() == '產生安全預覽'
        assert page.locator('#resultPanel').is_hidden()
        checks.append('explicit_human_term_choice_required')

        page.locator('#r208Next').click()
        page.locator('#resultPanel:not([hidden])').wait_for()
        page.wait_for_function("document.querySelector('#r208Progress').value===4")
        assert page.locator('#r208Next').inner_text() == '由我下載新稿'
        assert page.locator('#source').input_value() == source
        assert '{{USER_PATH}}' in page.locator('#result').input_value()
        assert TICK + 'const menu = "click"' + TICK in page.locator('#result').input_value()
        checks.append('safe_preview_preserves_code_and_source')

        with page.expect_download() as downloaded:
            page.locator('#r208Next').click()
        assert downloaded.value.suggested_filename.endswith('.md')
        page.wait_for_function("document.querySelector('#r208Progress').value===5")
        assert '瀏覽器是否儲存成功' in page.locator('#r208Stage').inner_text()
        checks.append('manual_download_action_not_claimed_to_be_disk_save')

        page.locator('.r208-feedback summary').click()
        assert page.locator('#r208FeedbackDownload').is_disabled()
        page.locator('#r208FeedbackClarity').select_option('EASY')
        page.locator('#r208FeedbackOutcome').select_option('FINISHED')
        assert page.locator('#r208FeedbackDownload').is_disabled()
        page.locator('#r208FeedbackConsent').check()
        assert page.locator('#r208FeedbackDownload').is_enabled()
        with page.expect_download() as feedback:
            page.locator('#r208FeedbackDownload').click()
        data = json.loads(feedback.value.path().read_text('utf-8'))
        assert data['schema'] == 'tls.r208.local-voluntary-feedback.v1'
        assert data['status'] == 'LOCAL_USER_SELECTED_FEEDBACK_NOT_VERIFIED'
        assert data['stage'] == 'LOCAL_EXPORT_ACTION_TRIGGERED'
        assert data['sharing_authorized'] is False
        assert data['contains_source_text'] is False
        assert data['contains_source_digest'] is False
        assert data['network_requested'] is False
        assert '主選單' not in json.dumps(data, ensure_ascii=False)
        assert 'menu' not in json.dumps(data, ensure_ascii=False)
        checks.append('explicit_consent_only_metadata_json_and_no_auto_share')

        page.locator('#source').fill('一份重新編輯的文件。')
        page.wait_for_function("document.querySelector('#r208Progress').value===1")
        page.locator('#r208FeedbackDownload').click()
        assert 'FINISH_NOT_OBSERVED' in page.locator('#r208FeedbackStatus').inner_text()
        assert page.locator('#resultPanel').is_hidden()
        checks.append('source_change_revokes_finished_result_and_feedback')

        page.locator('#inspect').click()
        page.locator('#candidatePanel:not([hidden])').wait_for()
        page.wait_for_function("document.querySelector('#r208Next').disabled===true")
        assert '沒有可人工選詞的候選' in page.locator('#r208Stage').inner_text()
        checks.append('no_reviewable_candidates_never_claim_completion')

        for width in (320, 390, 768, 1365):
            page.set_viewport_size({'width': width, 'height': 950})
            assert page.locator('html').evaluate('el=>el.scrollWidth') <= width, width
            assert page.locator('#firstTaskR208').is_visible()
        checks.append('320_390_768_1365_no_horizontal_overflow')
        assert not errors and not requests, {'errors': errors, 'requests': requests}
        checks.append('zero_outgoing_requests_or_page_errors')
        context.close()
        browser.close()
    print(json.dumps({'schema': 'tls.r208.first-task-browser.v1',
                      'status': 'PASS', 'navigation_mode': MODE,
                      'checks': len(checks), 'scenarios': checks,
                      'http_requests': 0, 'page_errors': 0,
                      'real_human_review_verified': False,
                      'translation_accuracy_verified': False,
                      'real_os_file_chooser_cancel_verified': False,
                      'new_release_published': False}, ensure_ascii=False))


if __name__ == '__main__':
    main()
