"""Real unpacked MV3 popup/action and ISOLATED injection; no mocked chrome or model API.
Run under xvfb-run -a on Linux. Native xdotool shortcut invokes Chrome's actual action,
which grants activeTab for the original localhost fixture; no host permission is added.
"""
import hashlib, importlib.util, json, os, shutil, subprocess, tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
fixture=module('mrft_fixture_browser',ROOT/'tests/mrft_r177.browser.py')
def run():
    assert os.environ.get('DISPLAY') and shutil.which('xdotool'), 'Use xvfb-run -a; real native action requires DISPLAY and xdotool'
    builder=module('mrft_build',ROOT/'tools/build_mrft_r177.py');builder.build()
    extension=str(builder.UNPACKED.resolve())
    eid=''.join(chr(ord('a')+int(c,16)) for c in hashlib.sha256(extension.encode()).hexdigest()[:32])
    server,url=fixture.serve()
    try:
        with tempfile.TemporaryDirectory(prefix='mrft-r177-chrome-') as profile, sync_playwright() as p:
            context=p.chromium.launch_persistent_context(profile,executable_path=os.environ.get('TLS_CHROMIUM_PATH'),headless=False,viewport={'width':1300,'height':950},args=['--no-sandbox','--disable-extensions-except='+extension,'--load-extension='+extension])
            page=context.pages[0];page.goto(url+'/docs/mrft/MRFT_ORIGINAL_FIXTURE.html');page.bring_to_front()
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            assert page.locator('[data-mrft-root]').count()==0
            # Invoke an actual browser action, granting activeTab by an explicit native key action.
            subprocess.run(['xdotool','key','--clearmodifiers','alt+shift+m'],check=True)
            page.wait_for_timeout(500)
            subprocess.run(['xdotool','key','Escape'],check=True)
            # The same packaged popup UI can be inspected in a background tab. The public fixture
            # remains the active tab when its initialization queries currentWindow.
            popup=context.new_page();page.bring_to_front();popup.goto('chrome-extension://'+eid+'/popup.html')
            popup.wait_for_function("document.querySelector('#origin').textContent.startsWith('http://127.0.0.1:')")
            assert not popup.locator('#consent').is_checked()
            assert popup.locator('#enable').is_disabled()
            assert page.locator('[data-mrft-root]').count()==0
            popup.locator('#consent').check();popup.locator('#enable').click()
            page.wait_for_selector('[data-mrft-root]',timeout=10000)
            assert not popup.locator('#consent').is_checked()
            assert page.evaluate('typeof TLSMRFTActiveR177')=='undefined', 'Runtime must be isolated from page world'
            fixture.draw(page,'#public-1')
            card=page.locator('[data-mrft-card]').first
            assert 'harbor' in card.locator('[data-mrft-source]').inner_text()
            card.get_by_role('button',name='準備本機模型',exact=True).click();page.wait_for_timeout(400)
            native_status=card.locator('[data-mrft-status]').inner_text()
            assert any(code in native_status for code in ['MODEL_UNAVAILABLE','DOWNLOAD_REQUIRED','UNSUPPORTED_PAIR','WAITING','READY','USER_ACTIVATION_REQUIRED']),native_status
            capability=popup.evaluate("""async () => {const [tab]=await chrome.tabs.query({active:true,currentWindow:true});return (await chrome.scripting.executeScript({target:{tabId:tab.id},world:'ISOLATED',func:()=>({translator:typeof globalThis.Translator,diagnostics:TLSMRFTActiveR177.controller.diagnostics()})}))[0].result;}""")
            assert capability['diagnostics']['regionCount']==1
            # Reopening popup resets consent; repeated explicit activation replaces the controller.
            popup.reload();popup.wait_for_function("document.querySelector('#origin').textContent.startsWith('http://127.0.0.1:')")
            assert not popup.locator('#consent').is_checked()
            popup.locator('#consent').check();popup.locator('#enable').click();page.wait_for_timeout(250)
            assert page.locator('[data-mrft-root]').count()==1 and page.locator('[data-mrft-card]').count()==0
            popup.locator('#stop').click();page.wait_for_timeout(150);assert page.locator('[data-mrft-root]').count()==0
            stopped=popup.evaluate("""async()=>{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});return (await chrome.scripting.executeScript({target:{tabId:tab.id},world:'ISOLATED',func:()=>typeof globalThis.TLSMRFTActiveR177}))[0].result}""")
            assert stopped=='undefined'
            popup.locator('#consent').check();popup.locator('#enable').click();page.wait_for_timeout(200);assert page.locator('[data-mrft-root]').count()==1
            page.reload();assert page.locator('[data-mrft-root]').count()==0
            popup.reload();assert not popup.locator('#consent').is_checked()
            assert not errors,errors
            print(json.dumps({'browser':context.browser.version,'extensionId':eid,'activation':'real native Chrome action','world':'ISOLATED','capability':capability['translator'],'nativePreparationStatus':native_status,'result':'PASS','fakeProvider':False}))
            context.close()
    finally:server.shutdown()
if __name__=='__main__':run()
