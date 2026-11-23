"""R204 actual Chromium regression. Default=file://; local policy may require content mode.
No policy overrides. Report navigation mode explicitly; never call content injection file QA.
"""
import json
import os
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright

HTML = Path(os.environ.get('TLS_R204_HTML', str(Path(__file__).with_name('TW_Review_Workbench_R204_20261116.html'))))
MODE = os.environ.get('TLS_BROWSER_MODE', 'file')
SOURCE = '# 文件\r\n\r\n設定 menu，午餐 menu。軟件。\r\n`menu` {{KEEP}} 不變；點擊率是統計。'


def main():
    assert MODE in ('file', 'content')
    checks, errors, traffic = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('TLS_CHROMIUM_PATH') or None,
                                   headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(accept_downloads=True, viewport={'width': 1440, 'height': 1000})
        def fresh():
            pg = context.new_page(); pg.set_default_timeout(7000)
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('request', lambda r: traffic.append(r.url) if r.url.startswith(('http://', 'https://')) else None)
            if MODE == 'content':
                pg.goto('about:blank'); pg.set_content(HTML.read_text(encoding='utf-8'))
            else:
                pg.goto(HTML.resolve().as_uri())
            return pg
        def inspect(pg, text=SOURCE):
            pg.locator('#source').fill(text); pg.locator('#inspect').click()
            pg.locator('#candidatePanel:not([hidden])').wait_for()
        def choose_menu(pg, i=0, word='選單'):
            cards = pg.locator('.candidate').filter(has=pg.locator('h3', has_text='「menu」'))
            cards.nth(i).get_by_role('button', name='採用「'+word+'」', exact=False).click()
        def raw_empty(pg):
            # textarea normalizes CRLF to LF; export the exact UI source, not a Python guess.
            return pg.evaluate('''async()=>{const s=TLSWordingAssistantR172.createWordingSession({source:document.querySelector('#source').value});const a=await s.inspect();const r=JSON.stringify(TLSReviewContinuityR203.capture(a));s.revoke();return r;}''')
        def hold(pg):
            pg.evaluate('''()=>{const base=File.prototype.arrayBuffer;File.prototype.arrayBuffer=async function(){const v=await base.call(this);if(this.name.startsWith('slow'))return await new Promise(resolve=>window.releaseRead=()=>resolve(v));return v;};}''')
        def upload(pg, selector, name, raw):
            if name.startswith('slow'):
                pg.evaluate('window.releaseRead=null')
            pg.locator(selector).set_input_files({'name':name,'mimeType':'application/json' if name.endswith('.json') else 'text/plain','buffer':raw})
        def release(pg):
            pg.evaluate('()=>{window.releaseRead();}'); pg.wait_for_timeout(120)

        pg = fresh()
        assert pg.locator('#undoReview').count() == 1, 'R204_UNDO_MISSING'
        assert pg.locator('#download').is_disabled()
        inspect(pg)
        exact_source = pg.locator('#source').input_value()
        choose_menu(pg, 0, '選單'); choose_menu(pg, 1, '菜單')
        pg.locator('.candidate').filter(has=pg.locator('h3', has_text='「軟件」')).get_by_role('button', name='保留這一處原文').click()
        assert pg.locator('.sel').filter(has_text='保留原文').count() == 1
        pg.locator('#undoReview').click(); pg.get_by_text('已復原上一個決定', exact=False).wait_for()
        assert pg.locator('.sel').filter(has_text='保留原文').count() == 0
        pg.locator('#redoReview').click(); pg.get_by_text('已重做決定', exact=False).wait_for()
        assert pg.locator('.sel').filter(has_text='保留原文').count() == 1
        checks.append('undo_redo_preserve_exact_decisions')
        pg.locator('#reviewFilter').select_option('confirmed'); assert pg.locator('.candidate').count() == 2
        pg.locator('#reviewFilter').select_option('kept'); assert pg.locator('.candidate').count() == 1
        pg.locator('#reviewFilter').select_option('all'); pg.locator('#reviewSearch').fill('菜單'); assert pg.locator('.candidate').count() == 2
        pg.locator('#reviewSearch').fill('不存在'); assert pg.locator('.candidate').count() == 0
        pg.locator('#reviewSearch').fill(''); checks.append('search_filters_do_not_rewrite')
        pg.locator('#previewBtn').click(); pg.locator('#resultPanel:not([hidden])').wait_for()
        assert pg.locator('.diff-row').count() == 2
        assert '設定 選單，午餐 菜單。軟件。' in pg.locator('#result').input_value()
        assert '`menu` {{KEEP}}' in pg.locator('#result').input_value()
        assert pg.locator('#source').input_value() == exact_source
        checks.append('explicit_diff_matches_core_preview_and_protected_text')
        with pg.expect_download() as saved:
            pg.locator('#exportReview').click()
        with tempfile.TemporaryDirectory() as d:
            target = Path(d)/'review.json'; saved.value.save_as(target); raw=target.read_bytes()
        data=json.loads(raw)
        assert data['schema']=='tls.r203.review-continuity.v1' and len(data['choices'])==3
        assert '午餐' not in raw.decode() and data['auto_apply'] is False
        pg.locator('#clear').click(); inspect(pg)
        upload(pg,'#importReview','review.json',raw);pg.get_by_text('已載入 3 筆人工決定',exact=False).wait_for()
        assert pg.locator('#resultPanel').is_hidden() and pg.locator('#download').is_disabled()
        checks.append('R203_JSON_compatible_import_never_auto_previews')
        bad=raw.decode().replace('"approval": "NONE"','"approval": "WRONG", "approval": "NONE"').encode()
        upload(pg,'#importReview','duplicate.json',bad);pg.get_by_text('DUPLICATE_JSON_KEY',exact=False).wait_for()
        assert pg.locator('.sel').filter(has_text='已採用').count()==2
        checks.append('duplicate_keys_rejected_without_partial_changes')
        inspect(pg, exact_source+'!'); upload(pg,'#importReview','changed.json',raw)
        pg.get_by_text('SOURCE_OR_DICTIONARY_CHANGED',exact=False).wait_for()
        assert pg.locator('#resultPanel').is_hidden();checks.append('changed_source_rejected')
        for width in (390,768,1440):
            pg.set_viewport_size({'width':width,'height':1000})
            assert pg.locator('html').evaluate('el=>el.scrollWidth')<=width
        checks.append('390_768_1440_no_horizontal_overflow');pg.close()

        pg=fresh();inspect(pg);choose_menu(pg);pg.locator('#undoReview').click();pg.get_by_text('已復原上一個決定',exact=False).wait_for()
        choose_menu(pg,0,'菜單');assert pg.locator('#redoReview').is_disabled()
        pg.locator('#source').fill('新的一篇軟件文件');assert pg.locator('#candidatePanel').is_hidden() and pg.locator('#download').is_disabled()
        checks.append('new_choice_discards_redo_source_edit_revokes_history');pg.close()

        pg=fresh();hold(pg);pg.locator('#source').fill('最初文字')
        upload(pg,'#file','slow.md',b'OLD SOURCE');pg.wait_for_function('typeof window.releaseRead==="function"')
        pg.locator('#source').fill('稍後輸入');release(pg);assert pg.locator('#source').input_value()=='稍後輸入'
        checks.append('stale_source_read_cannot_overwrite_typing')
        upload(pg,'#file','slow.md',b'OLD SOURCE');pg.wait_for_function('typeof window.releaseRead==="function"')
        pg.locator('#clear').click();release(pg);assert pg.locator('#source').input_value()==''
        checks.append('clear_cancels_pending_source_read');pg.close()

        pg=fresh();inspect(pg);hold(pg);empty=raw_empty(pg)
        upload(pg,'#importReview','slow.json',empty.encode());pg.wait_for_function('typeof window.releaseRead==="function"')
        choose_menu(pg);release(pg)
        assert pg.locator('.sel').filter(has_text='已採用').count()==1
        checks.append('late_import_cannot_overwrite_newer_manual_choice');pg.close()

        pg=fresh();inspect(pg);hold(pg);empty=raw_empty(pg)
        upload(pg,'#importReview','slow.json',empty.encode());pg.wait_for_function('typeof window.releaseRead==="function"')
        upload(pg,'#importReview','latest.json',raw);pg.get_by_text('已載入 3 筆人工決定',exact=False).wait_for();release(pg)
        assert pg.locator('.sel').filter(has_text='已採用').count()==2
        checks.append('latest_import_wins_not_last_promise_to_finish');pg.close()

        pg=fresh();inspect(pg);choose_menu(pg);hold(pg);empty=raw_empty(pg)
        upload(pg,'#importReview','slow.json',empty.encode());pg.wait_for_function('typeof window.releaseRead==="function"')
        pg.locator('#cancelPending').click();release(pg);assert pg.locator('.sel').filter(has_text='已採用').count()==1
        checks.append('explicit_cancel_preserves_existing_review')
        old=pg.locator('#source').input_value();upload(pg,'#file','invalid.txt',b'\xc3(')
        pg.get_by_text('INVALID_UTF8',exact=False).wait_for();assert pg.locator('#source').input_value()==old
        checks.append('invalid_UTF8_never_silently_changes_original');pg.close()
        assert not errors and not traffic, {'page_errors':errors,'http_requests':traffic}
        checks.append('zero_http_zero_page_errors')
        browser.close()
    print(json.dumps({'schema':'tls.r204.chromium-tests.v1','status':'PASS','navigation_mode':MODE,'checks':checks,
                      'check_count':len(checks),'http_requests':len(traffic),'page_errors':len(errors),
                      'human_quality_verified':False,'os_native_chooser_cancel_verified':False},ensure_ascii=False))

if __name__=='__main__':
    main()
