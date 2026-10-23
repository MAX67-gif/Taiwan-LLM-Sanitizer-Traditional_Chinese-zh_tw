"""Chromium end-to-end R10 consent, notes, schema rejection and offline CSP."""
from pathlib import Path
import json
import tempfile
import shutil
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'examples/TW_Context_Governance_Lab_R10_20261024.html'

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'],
            **({'executable_path':shutil.which('chromium')} if shutil.which('chromium') else {}))
        page=browser.new_page(accept_downloads=True,viewport={'width':1280,'height':900})
        errors=[];network=[]
        page.on('pageerror', lambda x: errors.append(str(x)))
        page.on('request',lambda req: network.append(req.url) if req.url.startswith(('http:','https:','ws:','wss:')) else None)
        page.set_content(HTML.read_text(encoding='utf-8'),wait_until='domcontentloaded')
        assert page.title().startswith('R10 臺灣用語')
        assert page.locator('.case').count()==40
        assert page.locator('#review-count').inner_text().strip()=='0 / 40'
        page.locator('#search').fill('menu')
        assert page.locator('.case').count()==2
        page.locator('#search').fill('')
        page.locator('#domain').select_option('software')
        assert page.locator('.case').count()>=3
        page.locator('#domain').select_option('all')
        first=page.locator('[data-case-id="r10-001"]')
        first.locator('textarea').fill('這是我自己的小筆記')
        first.locator('[data-decision="KEEP_ORIGINAL"]').click()
        assert page.locator('#review-count').inner_text().strip()=='1 / 40'
        assert '保留原詞' in first.inner_text()
        with page.expect_download() as item:
            page.locator('#export').click()
        download=item.value
        assert download.suggested_filename.endswith('.json')
        with tempfile.TemporaryDirectory() as tmp:
            saved=Path(tmp)/download.suggested_filename
            download.save_as(saved)
            saved_json=json.loads(saved.read_text(encoding='utf-8'))
            assert saved_json['schema']=='tls.term-review-ledger.v1'
            assert len(saved_json['decisions'])==1
            assert saved_json['decisions'][0]=={
              'case_id':'r10-001','outcome':'KEEP_ORIGINAL','note':'這是我自己的小筆記'}
            assert 'positive_example' not in saved_json
            assert 'source_text' not in saved_json
            page.set_content(HTML.read_text(encoding='utf-8'),wait_until='domcontentloaded')
            assert page.locator('#review-count').inner_text().strip()=='0 / 40'
            page.locator('#import-file').set_input_files(str(saved))
            expect(page.locator('#review-count')).to_have_text('1 / 40')
            assert '已匯入' in page.locator('#live-status').inner_text()
            page.locator('#review-filter').select_option('decided')
            assert page.locator('.case').count()==1
            page.locator('#review-filter').select_option('all')
            bad=dict(saved_json);bad['evidence_sha256']='0'*64
            invalid=Path(tmp)/'invalid.json'
            invalid.write_text(json.dumps(bad,ensure_ascii=False),encoding='utf-8')
            page.locator('#import-file').set_input_files(str(invalid))
            expect(page.locator('#live-status')).to_contain_text('EVIDENCE_VERSION_MISMATCH')
            assert page.locator('#review-count').inner_text().strip()=='1 / 40'
            page.locator('#clear').click()
            assert page.locator('#review-count').inner_text().strip()=='0 / 40'
        assert not network,network
        assert not errors,errors
        page.set_viewport_size({'width':390,'height':844})
        assert page.locator('.case').count()==40
        assert page.locator('h1').is_visible()
        browser.close()
    print('R10 CHROMIUM OFFLINE REVIEW / EXPORT / IMPORT / CSP / MOBILE PASS')

if __name__=='__main__':run()
