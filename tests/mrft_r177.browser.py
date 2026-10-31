"""Real Chromium UI acceptance. No translator stub and no model download."""
import functools, http.server, json, os, threading, re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    return server, 'http://127.0.0.1:%s' % server.server_port
def draw(page, selector, mode='FOLLOW_DOM', inset=0):
    page.locator('[data-mrft-action="mode"]').select_option(mode)
    page.get_by_role('button',name='畫出區域',exact=True).click()
    box = page.locator(selector).bounding_box()
    page.mouse.move(box['x']+inset, box['y']+inset)
    page.mouse.down(); page.mouse.move(box['x']+box['width']-inset,box['y']+box['height']-inset,steps=5);page.mouse.up()
    page.wait_for_timeout(300)
def enable(page):
    page.locator('#fixture-consent').check();page.locator('#fixture-enable').click()
def close(page):
    page.get_by_role('button',name='全部關閉',exact=True).click()
def source(page):
    return page.locator('[data-mrft-card]').first.locator('[data-mrft-source]').inner_text()
def rawdraw(page,box,mode='FIX_VIEWPORT'):
    page.locator('[data-mrft-action="mode"]').select_option(mode)
    page.get_by_role('button',name='畫出區域',exact=True).click()
    page.mouse.move(box['x'],box['y']);page.mouse.down();page.mouse.move(box['x']+box['width'],box['y']+box['height'],steps=4);page.mouse.up();page.wait_for_timeout(250)
def test_document_root_exclusions(page):
    """Root ancestry changes clear source/manual output; removal restores only source."""
    enable(page);draw(page,'#public-1','FIX_VIEWPORT')
    card=page.locator('[data-mrft-card]').first
    baseline=source(page)
    assert 'harbor' in baseline
    observations=[]
    for name,apply,restore in [
        ('html[data-private]', "document.documentElement.setAttribute('data-private','true')", "document.documentElement.removeAttribute('data-private')"),
        ('html opacity zero', "document.documentElement.style.opacity='0'", "document.documentElement.style.removeProperty('opacity')"),
    ]:
        card.locator('textarea').fill('Manual translation before root exclusion')
        card.get_by_role('button',name='使用貼上的譯文',exact=True).click()
        assert card.locator('[data-mrft-result]').inner_text()=='Manual translation before root exclusion'
        scans=page.evaluate('TLSMRFTActiveR177.controller.diagnostics().scanCount')
        page.evaluate(apply);page.wait_for_timeout(300)
        observation={'case':name,
            'sourceCleared':source(page)=='尚無已確認的可見原文',
            'translationCleared':card.locator('[data-mrft-result]').inner_text()=='尚無有效譯文',
            'rescanObserved':page.evaluate('TLSMRFTActiveR177.controller.diagnostics().scanCount')>scans}
        page.evaluate(restore);page.wait_for_timeout(300)
        observation.update(sourceRestored=source(page)==baseline,
            translationRemainsCleared=card.locator('[data-mrft-result]').inner_text()=='尚無有效譯文')
        observations.append(observation)
    close(page)
    assert all(all(value for key,value in item.items() if key!='case') for item in observations), observations
    print('R177 document-root exclusions PASS: both roots clear source/manual result; source alone restores')

def run():
    (ROOT.parent/'next_b_audit').mkdir(parents=True,exist_ok=True)
    server,url=serve()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=os.environ.get('TLS_CHROMIUM_PATH'),headless=True,args=['--no-sandbox'])
            page=browser.new_page(viewport={'width':1300,'height':950},device_scale_factor=1.5)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            requests=[];page.on('request',lambda r:requests.append(r.url))
            page.goto(url+'/docs/mrft/MRFT_ORIGINAL_FIXTURE.html')
            assert page.locator('#fixture-consent').count(), 'Original explicit-consent fixture must exist'
            test_document_root_exclusions(page)
            page.locator('#fixture-consent').check();page.locator('#fixture-enable').click()
            for i in range(1,4):draw(page,'#public-%s'%i)
            assert page.locator('[data-mrft-card]').count()==3
            first=page.locator('[data-mrft-card]').first
            assert 'harbor' in first.locator('[data-mrft-source]').inner_text().lower()
            first.locator('textarea').fill('Manual current translation');first.get_by_role('button',name='使用貼上的譯文').click()
            assert 'Manual current translation' in first.locator('[data-mrft-result]').inner_text()
            page.locator('#update-public').click();page.wait_for_timeout(350)
            assert 'Manual current translation' not in first.locator('[data-mrft-result]').inner_text()
            page.locator('#page-counter').click();assert page.locator('#counter-value').inner_text()=='1'
            for i in range(5):draw(page,'#public-2','FIX_VIEWPORT')
            assert page.locator('[data-mrft-card]').count()==8
            assert page.get_by_role('button',name='畫出區域',exact=True).is_disabled()
            page.locator('#replace-public').click();page.wait_for_timeout(350)
            assert 'NEEDS_REBIND' in first.inner_text()
            page.get_by_role('button',name='全部暫停',exact=True).click()
            scans=page.evaluate('TLSMRFTActiveR177.controller.diagnostics().scanCount')
            page.locator('#update-public').click();page.wait_for_timeout(350)
            assert page.evaluate('TLSMRFTActiveR177.controller.diagnostics().scanCount')==scans
            page.get_by_role('button',name='全部關閉',exact=True).click()
            assert page.locator('[data-mrft-root]').count()==0
            # Character geometry: a small prefix must not leak the remainder of a paragraph.
            enable(page)
            b=page.locator('#public-2').bounding_box()
            rawdraw(page,{'x':b['x']+14,'y':b['y']+16,'width':75,'height':28})
            cropped=source(page)
            assert 'garden' in cropped and 'flowers' not in cropped, cropped
            card=page.locator('[data-mrft-card]').first
            move=page.get_by_role('button',name='移動 r1',exact=True)
            # 區域 ids are monotonic per session, starting r1.
            if not move.count(): move=page.get_by_role('button',name=re.compile(r'^移動 ')).first
            before=move.bounding_box();move.focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(250)
            assert move.bounding_box()['x']==before['x']+1, (before,move.bounding_box(),card.inner_text())
            resize=page.get_by_role('button',name=re.compile(r'^調整大小 ')).first
            before=resize.locator('..').bounding_box();resize.focus();page.keyboard.press('Shift+ArrowRight');page.wait_for_timeout(250)
            assert abs(resize.locator('..').bounding_box()['width']-before['width']-10)<0.1
            before=move.bounding_box();page.mouse.move(before['x']+8,before['y']+8);page.mouse.down();page.mouse.move(before['x']+28,before['y']+18,steps=3);page.mouse.up();page.wait_for_timeout(250)
            assert abs(move.bounding_box()['x']-before['x']-20)<1, (before,move.bounding_box(),resize.bounding_box())
            card.get_by_role('button',name='暫停',exact=True).click();card.get_by_role('button',name='繼續',exact=True).click();page.wait_for_timeout(250)
            card.get_by_role('button',name='重新綁定',exact=True).click();page.keyboard.press('Escape')
            page.locator('#page-counter').click();assert page.locator('#counter-value').inner_text()=='2'
            close(page)
            # Exclusions happen before source reads; synthetic markers stay absent.
            page.locator('#traps').scroll_into_view_if_needed();enable(page);draw(page,'#traps','FIX_VIEWPORT')
            assert 'Public boundary' in source(page) and 'TRAP' not in source(page),source(page)
            close(page)
            # Tiny rectangles fail closed, never infer nearby words.
            page.evaluate('scrollTo(0,0)');enable(page);b=page.locator('#public-1').bounding_box()
            rawdraw(page,{'x':b['x']+20,'y':b['y']+20,'width':1,'height':1})
            assert source(page)=='尚無已確認的可見原文'
            close(page)
            # Follow updates screen position; fixed viewport keeps its box and changes source.
            enable(page);draw(page,'#public-2');draw(page,'#public-2','FIX_VIEWPORT')
            moves=page.get_by_role('button',name=re.compile(r'^移動 '))
            a=moves.nth(0).bounding_box()['y'];b=moves.nth(1).bounding_box()['y']
            page.evaluate('scrollBy(0,100)');page.wait_for_timeout(300)
            assert abs(moves.nth(0).bounding_box()['y']-(a-100))<2
            assert moves.nth(1).bounding_box()['y']==b
            page.evaluate("document.querySelector('#public-2').dataset.identity='new-entity'")
            page.wait_for_timeout(300);assert 'NEEDS_REBIND' in page.locator('[data-mrft-card]').first.inner_text()
            rebound=page.locator('[data-mrft-card]').first;rebound.get_by_role('button',name='重新綁定',exact=True).click()
            box=page.locator('#public-3').bounding_box();page.mouse.move(box['x'],box['y']);page.mouse.down();page.mouse.move(box['x']+box['width'],box['y']+box['height'],steps=3);page.mouse.up();page.wait_for_timeout(250)
            assert 'library' in rebound.locator('[data-mrft-source]').inner_text() and 'NEEDS_REBIND' not in rebound.inner_text()
            rebound.get_by_role('button',name='移除',exact=True).click();assert page.locator('[data-mrft-card]').count()==1
            # Bounded rapid mutation schedules one pending scan, and dirties before debounce.
            diagnostic=page.evaluate('TLSMRFTActiveR177.controller.diagnostics()')
            page.evaluate("for(let i=0;i<100;i++)document.querySelector('#public-3').textContent='Public rapid revision '+i")
            pending=page.evaluate('TLSMRFTActiveR177.controller.diagnostics()')
            assert pending['pendingTimers']<=1 and pending['scheduledCount']<=diagnostic['scheduledCount']+1
            page.wait_for_timeout(300);assert page.evaluate('TLSMRFTActiveR177.controller.diagnostics().scanCount')<=diagnostic['scanCount']+1
            close(page)
            # No automatic model download; genuine button activation checks native availability.
            page.evaluate('scrollTo(0,0)');enable(page);draw(page,'#public-1')
            card=page.locator('[data-mrft-card]').first
            # A page script cannot turn an unrelated trusted click into model preparation.
            page.evaluate("""() => {document.querySelector('#page-counter').addEventListener('click',()=>{const root=document.querySelector('[data-mrft-host]').shadowRoot;root.querySelector('[data-mrft-card] input[type=checkbox]').checked=true;root.querySelector('[data-mrft-card] input[type=checkbox]').dispatchEvent(new Event('change',{bubbles:true}));[...root.querySelectorAll('button')].find(b=>b.textContent==='準備本機模型').click();},{once:true})}""")
            page.locator('#page-counter').click();page.wait_for_timeout(300)
            assert card.locator('select[aria-label^="翻譯方式"]').input_value()=='USER_PASTED', 'Synthetic prepare must not borrow user activation'
            card.get_by_role('button',name='準備本機模型',exact=True).click();page.wait_for_timeout(500)
            local_status=card.locator('[data-mrft-status]').inner_text()
            assert any(x in local_status for x in ['MODEL_UNAVAILABLE','DOWNLOAD_REQUIRED','UNSUPPORTED_PAIR','WAITING','READY','TRANSLATING','USER_ACTIVATION_REQUIRED']),local_status
            assert source(page)!='尚無已確認的可見原文', 'Preparing local must retain or rescan current source'
            # Repeated activation has a single root and releases the previous controller.
            page.evaluate('globalThis.previousController=TLSMRFTActiveR177.controller');enable(page)
            assert page.locator('[data-mrft-root]').count()==1
            assert page.evaluate('previousController.diagnostics().closed')
            close(page)
            assert page.evaluate('previousController.diagnostics().listenerCount')==0
            # Presence-only private markers, technical fragments, occlusion, and budgets fail closed.
            page.evaluate("document.querySelector('#public-1').setAttribute('data-private','true')")
            enable(page);draw(page,'#public-1','FIX_VIEWPORT');assert source(page)=='尚無已確認的可見原文';close(page)
            page.evaluate("document.querySelector('#public-1').removeAttribute('data-private');document.querySelector('#public-1').textContent='Public prose https://example.invalid/private-template'")
            enable(page);draw(page,'#public-1','FIX_VIEWPORT');assert 'TECHNICAL_SOURCE_EXCLUDED' in page.locator('[data-mrft-card]').first.inner_text();close(page)
            page.locator('#update-public').click();enable(page);draw(page,'#public-1','FIX_VIEWPORT')
            page.evaluate("""() => {const b=document.querySelector('#public-1').getBoundingClientRect(), cover=document.createElement('div');cover.id='opaque-cover';cover.style.cssText=`position:fixed;left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px;background:white;z-index:100`;document.body.append(cover)}""")
            page.wait_for_timeout(300);assert source(page)=='尚無已確認的可見原文';close(page)
            page.evaluate("document.querySelector('#opaque-cover').remove();const d=document.createElement('div');d.id='budget-nodes';for(let i=0;i<4100;i++)d.append(document.createElement('span'));document.body.append(d)")
            enable(page);draw(page,'#public-1','FIX_VIEWPORT');assert 'NODE_BUDGET' in page.locator('[data-mrft-card]').first.inner_text();assert source(page)=='尚無已確認的可見原文';close(page)
            page.evaluate("document.querySelector('#budget-nodes').remove()")
            # Overflow clipping excludes scrolled-out glyphs and notices newly visible text.
            page.locator('#scroll-area').scroll_into_view_if_needed();enable(page);draw(page,'#scroll-area','FIX_VIEWPORT')
            assert 'upper text' in source(page) and 'Newly entering' not in source(page)
            page.evaluate("document.querySelector('#scroll-area').scrollTop=1000");page.wait_for_timeout(300)
            assert 'Newly entering' in source(page) and 'upper text' not in source(page),source(page)
            close(page)
            # Paused/disposed sessions have no observers, timers, retained controls or background reads.
            page.evaluate('scrollTo(0,0)');enable(page);draw(page,'#public-1')
            snapshot=page.locator('main').inner_text()
            draw(page,'#public-2');draw(page,'#public-3')
            for index,text in enumerate(['手動貼上示範：港邊的燈引導小船靠岸。','手動貼上示範：花園小徑通往安靜的石椅。','手動貼上示範：圖書館開放閱覽室舉辦工作坊。']):
                item=page.locator('[data-mrft-card]').nth(index);item.locator('textarea').fill(text);item.get_by_role('button',name='使用貼上的譯文',exact=True).click()
            page.locator('[data-mrft-card]').first.scroll_into_view_if_needed();page.wait_for_timeout(600)
            idle=page.evaluate('TLSMRFTActiveR177.controller.diagnostics().scanCount');page.wait_for_timeout(600)
            assert page.evaluate('TLSMRFTActiveR177.controller.diagnostics().scanCount')==idle, 'Own panel scroll must not create a scan feedback loop'
            assert 'READY' in page.locator('[data-mrft-card]').first.locator('[data-mrft-status]').inner_text()
            page.screenshot(path=str(ROOT.parent/'next_b_audit/mrft-r177-desktop.png'),caret='initial')
            assert snapshot==page.locator('main').inner_text()
            page.evaluate('globalThis.finalController=TLSMRFTActiveR177.controller');close(page)
            final=page.evaluate('finalController.diagnostics()');assert final['closed'] and final['listenerCount']==0 and final['pendingTimers']==0 and final['regionCount']==0
            page.locator('#update-public').click();page.wait_for_timeout(300);assert page.evaluate('finalController.diagnostics().scanCount')==final['scanCount']
            assert not errors,errors
            assert all(u.startswith(url+'/') for u in requests), 'Unexpected browser page egress'
            # Original fixture touch pointers at mobile size / high DPI, no mobile-extension claim.
            mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
            mp=mobile.new_page();mp.goto(url+'/docs/mrft/MRFT_ORIGINAL_FIXTURE.html');enable(mp)
            mp.locator('[data-mrft-action="mode"]').select_option('FIX_VIEWPORT');mp.get_by_role('button',name='畫出區域',exact=True).click()
            box=mp.locator('#public-1').bounding_box();y=min(box['y']+18,760)
            cdp=mobile.new_cdp_session(mp)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+15,'y':y}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':box['x']+240,'y':y+30}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});mp.wait_for_timeout(300)
            assert mp.locator('[data-mrft-card]').count()==1
            assert source(mp)!='尚無已確認的可見原文',source(mp)
            mp.screenshot(path=str(ROOT.parent/'next_b_audit/mrft-r177-mobile.png'),caret='initial');close(mp);mobile.close()
            print(json.dumps({'browser':browser.version,'Translator':page.evaluate('typeof Translator'),'result':'PASS','regions':8,'fakeProvider':False,'nativePreparationStatus':local_status,'touchHighDPI':True}))
            browser.close()
    finally:server.shutdown()
if __name__=='__main__':run()
