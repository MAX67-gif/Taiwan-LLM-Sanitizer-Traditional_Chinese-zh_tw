"""R13 real Chromium: closed-shadow, read-only selected-text, local-only UI."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
CORE=(ROOT/'src/core/bilingual_reader_r13.js').read_text('utf8')
UI=(ROOT/'src/r13/reader_ui_r13.js').read_text('utf8')

def run():
    with sync_playwright() as p:
        # GitHub CI installs Playwright Chromium; the sandbox may use system Chromium.
        chromium=Path(p.chromium.executable_path)
        executable=str(chromium) if chromium.is_file() else '/usr/bin/chromium'
        browser=p.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1000,'height':900})
        requests=[]
        page.on('request',lambda r:requests.append(r.url))
        page.goto('about:blank')
        page.set_content('<p id="read">Click the Settings button. Preserve Codex for Open Source and {{name}}.</p><code id="code">private_key</code><input type="password" value="secret">')
        page.add_script_tag(content=CORE)
        page.add_script_tag(content=UI)
        page.evaluate('window.__r13=TLSR13ReaderUI.createReader(document,{testHooks:true})')
        assert page.evaluate('window.__r13.host.shadowRoot') is None
        start=page.locator('#read').text_content()
        page.evaluate('''() => {let r=document.createRange();r.selectNodeContents(document.querySelector('#read'));let s=getSelection();s.removeAllRanges();s.addRange(r);}''')
        rect=page.evaluate('''() => {let r=window.__r13.testControls.capture.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}''')
        page.mouse.click(rect['x'],rect['y'])
        assert page.evaluate('window.__r13.getState().hasOriginal')
        assert page.locator('#read').text_content()==start
        # Mock the on-device API for UI testing; never claim real model quality.
        page.evaluate('''() => {window.Translator={availability:async()=>"available",create:async()=>({translate:async text=>"請點選設定。保留 Codex for Open Source 與 {{name}}。",destroy:()=>{}})}}''')
        page.evaluate('window.__r13.testControls.translate.click()')
        page.wait_for_function('window.__r13.getState().hasCandidate')
        assert '有限的結構檢查' in page.evaluate('window.__r13.testControls.status.textContent')
        # Late responses after clear must not overwrite the new empty state.
        page.evaluate('''() => {window.__late=null;window.Translator={availability:async()=>"available",create:async()=>({translate:()=>new Promise(resolve=>window.__late=resolve),destroy:()=>{}})}}''')
        page.evaluate('window.__r13.testControls.translate.click()')
        page.wait_for_function('typeof window.__late === "function"')
        page.evaluate('window.__r13.clear();window.__late("延遲後的壞譯文")')
        page.wait_for_timeout(80)
        assert not page.evaluate('window.__r13.getState().hasCandidate')
        # Guard refuses selection of code content; does not change the DOM.
        page.evaluate('''() => {let r=document.createRange();r.selectNodeContents(document.querySelector('#code'));let s=getSelection();s.removeAllRanges();s.addRange(r);}''')
        assert page.evaluate('''() => {try{TLSBilingualR13.safeSelection(window);return "INVALID"}catch(e){return e.message}}''')=='R13_EXCLUDED_SELECTION'
        # Model availability is an explicit user action, not automatic on page load.
        assert requests==[],requests
        page.evaluate('window.__r13.dispose()')
        assert page.evaluate('window.__r13.getState().alive') is False
        browser.close()
    print('R13 REAL CHROMIUM selection / closed shadow / code protection / no network PASS')
if __name__=='__main__':run()
