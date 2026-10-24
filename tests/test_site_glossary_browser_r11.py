"""R11 real Chromium DOM: optional preview, per-position approval, R5 separation, stale and rollback."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
PAGE='''<!doctype html><html lang="en"><body>
<nav><div id="ui">Use menu to configure options. Open menu.</div></nav>
<section id="food"><p>The menu is on the table.</p></section>
<div id="sensitive" hidden>menu should stay hidden.</div>
<input id="user" value="menu" placeholder="menu">
<textarea>menu</textarea><code id="code">menu</code><pre>menu</pre>
<div id="json">{"menu":"menu"}</div>
<div id="template">Variable {{menu}} remains.</div>
<div id="links">https://example.org/menu</div>
<div id="editable" contenteditable="true">menu</div>
<div id="changed">Here is a menu.</div>
<div id="external">menu external</div>
</body></html>'''
ROW=[{'source':'menu','replacement':'選單','domain':'ui','action':'replace'},
     {'source':'menu','replacement':'菜單','domain':'food','action':'replace'}]
with sync_playwright() as pw:
    options={'headless':True,'args':['--no-sandbox']}
    if Path('/usr/bin/chromium').exists():options['executable_path']='/usr/bin/chromium'
    browser=pw.chromium.launch(**options)
    page=browser.new_page()
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(PAGE)  # offline; location.origin remains "null" in this test
    for name in ('lexicon_pack.js','preferences.js','entities.js','engine.js','provider.js',
                 'web_adapter.js','progress_ui.js','user_terms_r9.js','site_glossary_r11.js'):
        page.add_script_tag(content=(ROOT/'src/core'/name).read_text(encoding='utf-8'))
    page.evaluate('''() => {
      window.__messages=[];
      const config={};
      window.chrome={runtime:{onMessage:{addListener:fn=>{window.__msgHandler=fn},removeListener:()=>{}}},
        storage:{local:{get:async key=>({[key]:config[key]}),set:async values=>Object.assign(config,values)}}};
      window.__request=(body)=>new Promise(resolve=>window.__msgHandler(body,null,resolve));
    }''')
    page.add_script_tag(content=(ROOT/'src/r11/chrome/content.js').read_text(encoding='utf-8'))
    page.wait_for_function('window.__TLSPageController&&window.__TLSPageController.getStatus().running',timeout=12000)
    previous=page.evaluate('window.__TLSPageController.getStatus().version')
    assert previous=='0.4.0',previous
    preview=page.evaluate('(rows)=>window.__request({kind:"TLS_R11_PREVIEW",origin:location.origin,domain:"ui",rows})',ROW)
    assert preview['ok'] and preview['matches'],preview
    assert page.evaluate('window.__TLSPageController.getStatus().running') is False
    assert page.locator('#ui').inner_text()=='Use menu to configure options. Open menu.'
    assert 'menu' in page.locator('#food').inner_text()
    assert all(h['from']=='menu' for h in preview['matches'])
    ids=[h['id'] for h in preview['matches'] if 'Use menu' in h['context'] or 'Open menu' in h['context']]
    assert ids,preview['matches']
    apply=page.evaluate('args=>window.__request({kind:"TLS_R11_APPLY",origin:location.origin,revision:args.rev,selectedIds:args.ids})',{'ids':ids,'rev':preview['revision']})
    assert apply['ok'] and apply['approvedPositions']>=1,apply
    assert '選單' in page.locator('#ui').inner_text()
    assert page.locator('#food').inner_text()=='The menu is on the table.'
    for selector in ('#sensitive','#code','#json','#template','#links','#editable'):
        assert '選單' not in page.locator(selector).inner_text(),selector
    assert page.locator('#user').input_value()=='menu'
    # A source page update must survive "restore".
    page.evaluate("document.querySelector('#ui').textContent='Site changed its own text.'")
    result=page.evaluate('window.__request({kind:"TLS_R11_RESTORE",origin:location.origin})')
    assert result['ok'] and result['skipped']>=1,result
    assert page.locator('#ui').inner_text()=='Site changed its own text.'
    # Original contents in a new frame can be previewed and restored properly.
    p2=page.evaluate('(rows)=>window.__request({kind:"TLS_R11_PREVIEW",origin:location.origin,domain:"food",rows})',ROW)
    food=[x['id'] for x in p2['matches'] if 'The menu' in x['context']]
    assert food,p2['matches']
    applied=page.evaluate('data=>window.__request({kind:"TLS_R11_APPLY",origin:location.origin,revision:data.rev,selectedIds:data.ids})',{'rev':p2['revision'],'ids':food})
    assert applied['ok'],applied
    assert '菜單' in page.locator('#food').inner_text()
    exit_result=page.evaluate('window.__request({kind:"TLS_R11_EXIT",origin:location.origin})')
    assert exit_result['ok'] and exit_result['restored']>0
    assert page.locator('#food').inner_text()=='The menu is on the table.'
    page.wait_for_function('window.__TLSPageController.getStatus().running',timeout=12000)
    # Previously captured approval cannot be replayed.
    failed=page.evaluate('args=>window.__request({kind:"TLS_R11_APPLY",origin:location.origin,revision:args.rev,selectedIds:args.ids})',{'rev':p2['revision'],'ids':food})
    assert not failed['ok']
    # Cross-origin spoofing cannot activate preview.
    wrong=page.evaluate('(rows)=>window.__request({kind:"TLS_R11_PREVIEW",origin:"https://other.org",domain:"ui",rows})',ROW)
    assert not wrong['ok'] and wrong['reason']=='SITE_NOT_AUTHORIZED'
    assert not errors,errors
    browser.close()
print('TLS R11 CHROMIUM SITE-GLOSSARY PREVIEW/APPLY/ROLLBACK PASS')
