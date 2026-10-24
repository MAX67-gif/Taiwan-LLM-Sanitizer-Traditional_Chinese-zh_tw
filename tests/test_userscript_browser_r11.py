"""R11 Tampermonkey single-file boot, opt-in, pause/rollback, and R11 menu availability."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    options={'headless':True,'args':['--no-sandbox']}
    if Path('/usr/bin/chromium').exists():options['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**options)
    page=browser.new_page()
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'tests/fixtures/demo.html').read_text(encoding='utf8'))
    page.evaluate('''() => {
     window.__st={};window.__menus=[];
     window.GM_getValue=(key,d)=>Object.hasOwn(window.__st,key)?window.__st[key]:d;
     window.GM_setValue=(key,v)=>window.__st[key]=v;
     window.GM_registerMenuCommand=(label,fn)=>window.__menus.push({label,fn});
    }''')
    page.add_script_tag(content=(ROOT/'dist/r11/userscript/TaiwanLLMSanitizerR11.user.js').read_text(encoding='utf8'))
    menus=page.evaluate('window.__menus.map(x=>x.label)')
    assert len(menus)==4,menus
    assert any('R11' in x for x in menus)
    assert page.locator('#title').inner_text()=='Search'
    # First menu is optional R11 panel; enabling site is explicit via second legacy menu.
    page.evaluate('window.__menus[0].fn()')
    assert page.evaluate("document.querySelector('[data-tls-ui][aria-label=\"臺灣繁體中文翻譯設定\"]')?.hidden") is not False
    page.evaluate('window.__menus[1].fn()')
    page.wait_for_function("document.querySelector('#title').textContent==='搜尋'",timeout=10000)
    page.evaluate('window.__menus[0].fn()')
    assert page.evaluate("document.querySelector('[data-tls-ui][aria-label=\"臺灣繁體中文翻譯設定\"]')?.hidden") is False
    assert page.evaluate("Object.keys(window.__st).some(k=>k.includes('tls-enabled:'))")
    page.evaluate('window.__menus[1].fn()')
    assert page.locator('#title').inner_text()=='Search'
    assert not errors,errors
    browser.close()
print('TLS R11 USERSCRIPT SINGLE FILE/GM/EXPLICIT SITE-OPT-IN PASS')
