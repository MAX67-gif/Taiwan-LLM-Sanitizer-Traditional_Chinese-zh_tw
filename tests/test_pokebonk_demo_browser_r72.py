"""R7.2 offline synthetic real Chromium DOM regression; never visits live PokéBonk."""
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
JS=(ROOT/'dist/pokebonk/r72/chrome/content.js').read_text(encoding='utf-8')
HTML='''<!doctype html><html lang="zh-TW"><meta charset="utf-8"><body>
<script type="application/x-disabled" src="/assets/main-unknown-future.js"></script>
<h1 id="menu">主菜单</h1><h2 id="coop">Co-op Room</h2>
<p id="join" aria-label="Join Room">Create Room</p><p id="wardrobe">Wardrobe</p>
<div class="coop-chat-stream" id="chat" title="Quick Chat">Quick Chat <span>点击</span></div>
<div role="log" id="message-log" aria-label="Join Room">Join Room</div>
<div class="player-name" id="player" title="Settings">Player Foo</div>
<div id="member" data-testid="chatMessage" aria-label="League">Quick Chat</div>
<div style="display:none" id="hidden" title="Wardrobe">Wardrobe</div>
<div aria-hidden="true" id="aria">League</div>
<div contenteditable id="editable">Create Room</div>
<form><input id="secret" value="Access Token" placeholder="Join Room"><button>Share Room Link</button></form>
<pre id="code">Join Room</pre>
<p id="noise">This line mentions Co-op Room, but is not exact UI text.</p>
</body></html>'''
with sync_playwright() as pw:
    launch=dict(headless=True,args=['--no-sandbox'])
    if Path('/usr/bin/chromium').exists():launch['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**launch)
    page=browser.new_page(viewport={'width':390,'height':812})
    hits=[];errors=[]
    page.on('request',lambda request:hits.append(request.url))
    page.on('pageerror',lambda error:errors.append(str(error)))
    # Container browser policy blocks navigating to public hosts, even when routes
    # would be fulfilled locally. Verify original host gate rejects about:blank,
    # then relax this single gate *in the synthetic test script only*; the actual
    # built Chrome/TM bundles stay unchanged, and Node tests cover host allowlist.
    page.set_content(HTML)
    page.add_script_tag(content=JS)
    assert page.locator('#tls-pokebonk-r72-display-demo').count()==0
    gate='if(!api||!pack||!api.compatibility(document).hostAllowed)return;'
    assert JS.count(gate)==1
    page.add_script_tag(content=JS.replace(gate,'if(!api||!pack)return;'))
    dock=page.locator('#tls-pokebonk-r72-display-demo')
    expect(dock).to_have_count(1)
    expect(page.locator('#menu')).to_have_text('主菜单')
    dock.locator('button.pill').click()
    expect(dock.locator('div.panel')).to_be_visible()
    expect(dock.locator('p.note').first).to_contain_text('偵測到網站主程式')
    dock.locator('button.yes').click()
    expect(page.locator('#menu')).to_have_text('主選單')
    expect(page.locator('#coop')).to_have_text('合作房間')
    expect(page.locator('#join')).to_have_text('建立房間')
    expect(page.locator('#join')).to_have_attribute('aria-label','加入房間')
    expect(page.locator('#wardrobe')).to_have_text('衣櫥')
    for el,value in [('#chat','Quick Chat 点击'),('#message-log','Join Room'),('#player','Player Foo'),
                     ('#member','Quick Chat'),('#hidden','Wardrobe'),('#aria','League'),
                     ('#editable','Create Room'),('#code','Join Room')]:
        expect(page.locator(el)).to_have_text(value)
    expect(page.locator('#secret')).to_have_attribute('placeholder','Join Room')
    expect(page.locator('#player')).to_have_attribute('title','Settings')
    expect(page.locator('#chat')).to_have_attribute('title','Quick Chat')
    page.evaluate('''() => {
      const p=document.createElement('p');p.id='dynamic';p.textContent='Season 2';document.body.appendChild(p);
      const c=document.createElement('p');c.id='new-chat';c.className='co-op-chat-bubble';c.textContent='Join Room';document.body.appendChild(c);
    }''')
    expect(page.locator('#dynamic')).to_have_text('第 2 賽季')
    expect(page.locator('#new-chat')).to_have_text('Join Room')
    page.evaluate('''() => {document.querySelector('#coop').textContent='Actual game changed title';}''')
    dock.locator('button.no').click()
    expect(page.locator('#menu')).to_have_text('主菜单')
    expect(page.locator('#wardrobe')).to_have_text('Wardrobe')
    expect(page.locator('#dynamic')).to_have_text('Season 2')
    expect(page.locator('#coop')).to_have_text('Actual game changed title')
    assert not hits,hits
    assert not errors,errors
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
    browser.close()
print('POKEBONK_R72_SYNTHETIC_CHROMIUM_DISPLAY_ONLY_PASS / LIVE_GAME_NOT_VERIFIED')
