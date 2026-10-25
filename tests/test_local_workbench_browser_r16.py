"""Real Chromium R16 offline privacy and preview regression, synthetic fixtures only."""
from pathlib import Path
import shutil,json,re
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'examples/TW_Localization_Safety_Studio_R16_20261026.html'

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1240,'height':820},accept_downloads=True)
        egress,errors=[],[]
        page.on('request',lambda r: egress.append(r.url) if r.url.startswith(('https://','http://')) else None)
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.set_content(HTML.read_text(encoding='utf-8'),wait_until='domcontentloaded')
        assert 'R16' in page.title()
        assert page.locator('#report').is_hidden()
        initial=page.locator('#source').input_value()
        page.locator('#inspect').click()
        assert page.locator('#state').inner_text()=='OK'
        assert page.locator('#manual').is_visible()
        assert page.locator('.choice').count()>=1
        page.locator('.choice').first.check()
        page.locator('.candidate').first.fill('請點選選單')
        page.locator('#make-preview').click()
        assert page.locator('#preview-panel').is_visible()
        assert 'SAFE_PREVIEW_NOT_APPLIED' in page.locator('#preview-state').inner_text()
        result=page.locator('#result').inner_text()
        assert '請點選選單' in result
        assert 'https://example.org/item_(v2)/intro' in result
        assert '下面保留原文' in result
        assert page.locator('#source').input_value()==initial
        with page.expect_download() as d:
            page.locator('#export-report').click()
        contents=d.value.path().read_text(encoding='utf-8')
        report=json.loads(contents)
        assert report['schema']=='tls.local-workbench.v1'
        assert report['network_requested'] is False
        assert report['approval']=='NONE'
        assert '請 click 選單' not in contents
        assert '請點選選單' not in contents
        with page.expect_download() as d:
            page.locator('#download-preview').click()
        downloaded=d.value.path().read_text(encoding='utf-8')
        assert downloaded==result
        assert d.value.suggested_filename!='source.md'
        page.locator('#discard-preview').click()
        assert page.locator('#preview-panel').is_hidden()
        # Explicit file selection reads only locally and rejects undecodable UTF-8.
        page.locator('#file').set_input_files({'name':'unsafe.txt','mimeType':'text/plain','buffer':bytes([0xff,0xfe,0xfa])})
        expect(page.locator('#errors')).to_contain_text('UTF-8')
        assert page.locator('#manual').is_hidden()
        page.locator('#file').set_input_files({'name':'safe.md','mimeType':'text/plain','buffer':b'# Original\nValid text for manual review.\n'})
        expect(page.locator('#source')).to_have_value(re.compile(r'^# Original'))
        page.locator('#inspect').click()
        assert page.locator('#state').inner_text()=='OK'
        page.locator('#format').select_option('json')
        page.locator('#sample').click()
        page.locator('#inspect').click()
        assert page.locator('#state').inner_text()=='OK'
        page.locator('.choice').first.check()
        page.locator('.candidate').first.fill('請點選主選單')
        page.locator('#make-preview').click()
        parsed=json.loads(page.locator('#result').inner_text())
        assert parsed['text']=='請點選主選單'
        assert parsed['id']=='menu' and parsed['url']=='https://example.test/docs'
        page.locator('#format').select_option('prompt')
        page.locator('#sample').click()
        page.locator('#inspect').click()
        assert page.locator('#state').inner_text()=='OK'
        # The tool must fail closed on ambiguous Markdown and not upload text.
        page.locator('#format').select_option('markdown')
        page.locator('#source').fill('Unclosed [link](https://example.test/a_(b)\n')
        page.locator('#inspect').click()
        assert page.locator('#state').inner_text()=='REJECTED'
        assert page.locator('#manual').is_hidden()
        page.locator('#clear').click()
        assert page.locator('#report').is_hidden()
        assert page.locator('#source').input_value()==''
        page.set_viewport_size({'width':375,'height':760})
        page.locator('#sample').click()
        page.locator('#inspect').click()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'mobile horizontal scrolling'
        assert page.locator('#state').inner_text()=='OK'
        assert not egress,'Unexpected network requests: '+str(egress)
        assert not errors,'Page errors: '+str(errors)
        browser.close()
        print('R16 STUDIO CHROMIUM PASS: manual source; typed protected spans; preview; metadata-only report; JSON/Prompt; reject; cancel; mobile; zero egress')
if __name__=='__main__':main()
