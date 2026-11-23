#!/usr/bin/env python3
"""R209 genuine Chromium first task + Context Lens + focused UI together.
GitHub CI runs native file://; managed sandbox may explicitly use content mode.
Neither mode is human language QA, OS native chooser cancellation or adoption.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
HTML=HERE/'TW_Unified_Review_R209_20261124.html'
MODE=os.environ.get('TLS_BROWSER_MODE','file')
SOURCE='介面 menu，餐廳 menu。餐廳設定 menu，未知 menu。'+chr(96)+'menu'+chr(96)+' 與 {{KEY}} 保留。'

def main():
    assert MODE in {'file','content'} and HTML.is_file()
    checks,errors,traffic=[],[],[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True, executable_path=os.environ.get('TLS_CHROMIUM_PATH') or None,
                                  args=['--no-sandbox','--disable-dev-shm-usage'])
        ctx=browser.new_context(accept_downloads=True,viewport={'width':1365,'height':940})
        page=ctx.new_page();page.set_default_timeout(8000)
        page.on('pageerror', lambda e:errors.append(str(e)))
        page.on('request', lambda q:traffic.append(q.url) if q.url.startswith(('http://','https://','ws://','wss://')) else None)
        if MODE=='file':
            page.goto(HTML.resolve().as_uri());assert page.url.startswith('file://')
        else:
            page.goto('about:blank');page.set_content(HTML.read_text('utf-8'))
        assert 'R209' in page.title()
        assert page.locator('#firstTaskR208').count()==1
        assert page.locator('#riskMode').count()==1
        assert page.locator('#focusToggle').count()==1
        assert page.locator('#r208FeedbackDownload').is_disabled()
        checks.append('single_file_contains_r208_r207_r205_no_auto_action')
        page.locator('#source').fill(SOURCE)
        page.locator('#inspect').click();page.locator('#candidatePanel:not([hidden])').wait_for()
        page.wait_for_function("document.querySelector('#r208Progress').value===2")
        assert '高風險 2' in page.locator('#riskSummary').inner_text()
        cards=page.locator('.candidate')
        assert cards.count()>=4
        assert cards.first.locator('.risk-hint').get_attribute('data-risk-code')=='CONFLICTING_CONTEXT_CUES'
        assert cards.nth(1).locator('.risk-hint').get_attribute('data-risk-code')=='AMBIGUOUS_CONTEXT_NO_CUES'
        checks.append('risk_first_shows_conflicts_and_unknown_before_safe_cues')
        page.locator('#focusToggle').click()
        assert page.locator('.candidate').count()==1
        first=page.locator('.candidate').get_attribute('data-candidate-id')
        assert page.locator('.risk-hint').get_attribute('data-risk-code')=='CONFLICTING_CONTEXT_CUES'
        page.locator('#focusNext').click()
        assert page.locator('.risk-hint').get_attribute('data-risk-code')=='AMBIGUOUS_CONTEXT_NO_CUES'
        page.locator('#focusPrev').click()
        assert page.locator('.candidate').get_attribute('data-candidate-id')==first
        assert page.locator('#source').input_value()==SOURCE
        checks.append('focus_previous_next_follow_current_risk_order')
        page.locator('.candidate').get_by_role('button',name='保留這一處原文').click()
        assert page.locator('.candidate').count()==1
        assert page.locator('.candidate').get_attribute('data-candidate-id')!=first
        assert page.locator('.risk-hint').get_attribute('data-risk-code')=='AMBIGUOUS_CONTEXT_NO_CUES'
        page.wait_for_function("document.querySelector('#r208Progress').value===3")
        assert page.locator('#download').is_disabled()
        checks.append('manual_keep_advances_view_only_and_guided_stage')
        page.locator('#riskMode').select_option('high_only')
        assert page.locator('.candidate').count()==1
        assert '高風險 2' in page.locator('#riskSummary').inner_text()
        page.locator('#riskMode').select_option('document')
        assert page.locator('.candidate').count()==1
        assert page.locator('.candidate').get_attribute('data-candidate-id')!=first
        checks.append('mode_switch_does_not_apply_or_delete_review_choices')
        page.locator('#focusToggle').click()
        assert page.locator('.candidate').count()>=4
        rows=page.locator('.candidate').filter(has=page.locator('h3',has_text='「menu」'))
        rows.first.get_by_role('button',name='採用「菜單」',exact=False).click()
        assert page.locator('.risk-hint[data-risk-code="CHOICE_CONTEXT_CONFLICT"]').count()==1
        assert '已採用需複核 1' in page.locator('#riskSummary').inner_text()
        assert page.locator('#resultPanel').is_hidden()
        checks.append('human_choice_context_warning_is_read_only')
        page.locator('#undoReview').click();page.get_by_text('已復原上一個決定',exact=False).wait_for()
        assert page.locator('.risk-hint[data-risk-code="CHOICE_CONTEXT_CONFLICT"]').count()==0
        page.locator('#redoReview').click();page.get_by_text('已重做決定',exact=False).wait_for()
        assert page.locator('.risk-hint[data-risk-code="CHOICE_CONTEXT_CONFLICT"]').count()==1
        checks.append('r204_undo_redo_still_work_with_risk_lens')
        page.locator('#r208Next').click()
        page.locator('#resultPanel:not([hidden])').wait_for()
        page.wait_for_function("document.querySelector('#r208Progress').value===4")
        new=page.locator('#result').input_value()
        assert '介面 菜單' in new
        assert chr(96)+'menu'+chr(96)+' 與 {{KEY}} 保留' in new
        assert page.locator('#source').input_value()==SOURCE
        checks.append('r208_guided_manual_preview_preserves_original_and_code')
        with page.expect_download() as result:
            page.locator('#r208Next').click()
        assert result.value.suggested_filename.endswith('.md')
        page.wait_for_function("document.querySelector('#r208Progress').value===5")
        checks.append('r208_download_explicit_and_stage_five_not_disk_certification')
        page.locator('.r208-feedback summary').click()
        page.locator('#r208FeedbackClarity').select_option('EASY')
        page.locator('#r208FeedbackOutcome').select_option('FINISHED')
        assert page.locator('#r208FeedbackDownload').is_disabled()
        page.locator('#r208FeedbackConsent').check()
        with page.expect_download() as feedback:
            page.locator('#r208FeedbackDownload').click()
        data=json.loads(feedback.value.path().read_text(encoding='utf-8'))
        assert data['schema']=='tls.r208.local-voluntary-feedback.v1'
        assert data['sharing_authorized'] is False
        assert data['contains_source_digest'] is False
        assert data['network_requested'] is False
        assert 'menu' not in json.dumps(data,ensure_ascii=False)
        checks.append('feedback_opt_in_no_source_no_network')
        page.locator('#source').fill('重新寫入的來源，不得沿用舊審稿。')
        assert page.locator('#candidatePanel').is_hidden()
        assert page.locator('#resultPanel').is_hidden()
        assert page.locator('#download').is_disabled()
        page.wait_for_function("document.querySelector('#r208Progress').value===1")
        checks.append('new_source_revokes_review_risk_and_finished_state')
        for width in (320,390,768,1365):
            page.set_viewport_size({'width':width,'height':900})
            assert page.locator('html').evaluate('el=>el.scrollWidth')<=width,width
        checks.append('320_390_768_1365_responsive_no_overflow')
        assert not traffic and not errors,{'traffic':traffic,'pageerrors':errors}
        checks.append('zero_http_and_browser_errors')
        ctx.close();browser.close()
    print(json.dumps({'schema':'tls.r209.unified-review-native-evidence.v1','status':'PASS',
     'mode':MODE,'checks':len(checks),'scenarios':checks,'http_requests':0,'page_errors':0,
     'auto_apply':False,'human_quality_verified':False,'adoption_verified':False,'new_release_published':False},ensure_ascii=False))

if __name__=='__main__':main()
