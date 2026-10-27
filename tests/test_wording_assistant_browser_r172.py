"""R17.2 actual Chromium scripted checks; synthetic fixtures, not human QA."""
from pathlib import Path
import os
import hashlib
import json
import tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
FILE=ROOT/'examples/TW_Wording_Assistant_R172_20261027.html'

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=(os.environ.get('TLS_CHROMIUM_PATH') or None),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        ctx=browser.new_context(accept_downloads=True,viewport={'width':1280,'height':900})
        page=ctx.new_page(); requests=[]; errors=[]
        page.on('request',lambda q: requests.append(q.url) if q.url.startswith(('http://','https://')) else None)
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.goto('about:blank');page.set_content(FILE.read_text(encoding='utf-8'));page.get_by_role('button',name='載入原創範例').click()
        source=page.locator('#source').input_value();assert '<!-- click' in source
        page.get_by_role('button',name='尋找臺灣用語建議').click();page.locator('#candidatePanel:not([hidden])').wait_for()
        assert '軟件' in page.locator('#candidates').inner_text()
        for part,button in [('軟件','軟體'),('數據庫','資料庫')]:
            card=page.locator('.candidate').filter(has=page.locator('h3',has_text='「'+part+'」')).first
            card.get_by_role('button',name='採用「'+button+'」',exact=False).click()
        page.get_by_role('button',name='產生安全差異預覽').click();page.locator('#resultPanel:not([hidden])').wait_for()
        result=page.locator('#result').input_value()
        assert '軟體中的資料庫' in result
        assert '<!-- click 和數據庫在註解中：保護原樣 -->' in result
        assert '{{USER_PATH}}' in result and 'const menu = "点击";' in result
        assert page.locator('#source').input_value()==source
        with page.expect_download() as dl:page.get_by_role('button',name='下載新稿 .md').click()
        with tempfile.TemporaryDirectory() as folder:
            dst=Path(folder)/'reviewed.md';dl.value.save_as(dst)
            assert dst.read_text(encoding='utf-8')==result
            digest=hashlib.sha256(dst.read_bytes()).hexdigest()
        page.get_by_role('button',name='清除所有內容').click()
        assert not page.locator('#result').input_value()
        assert page.locator('#candidatePanel').is_hidden()
        # The same artifact in a mobile viewport should not hide horizontal controls.
        page.set_viewport_size({'width':390,'height':844})
        page.get_by_role('button',name='載入原創範例').click();page.get_by_role('button',name='尋找臺灣用語建議').click()
        assert page.locator('html').evaluate('el=>el.scrollWidth') <= 390
        # JSON payloads refuse rewrites.
        page.locator('#source').fill('{"title":"軟件"}')
        page.get_by_role('button',name='尋找臺灣用語建議').click()
        assert 'UNSUPPORTED_CONTENT' in page.locator('#status').inner_text()
        assert not requests and not errors, {'requests':requests,'errors':errors}
        browser.close()
    print(json.dumps({'result':'PASS','ui_preview_sha256':digest,'net_requests':0,'page_errors':0,'mobile_width':390,'human_quality':'NOT_TESTED'},ensure_ascii=False))
if __name__=='__main__':main()
