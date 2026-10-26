"""R17 stand-alone HTML: synthetic files only; no network/no copyrighted content."""
from pathlib import Path
import json
import shutil
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT/'examples/TW_Document_Trust_Graph_R17_20261026.html'

def mount(page, content1='[guide](docs/guide.md#install)',content2='# Install\n'):
    page.evaluate("""([c1,c2])=>{
      const input=document.querySelector('#pick');
      const make=(name,body,rel)=>{const f=new File([body],name,{type:'text/markdown'});Object.defineProperty(f,'webkitRelativePath',{value:'example-repo/'+rel});return f};
      const files=[make('index.md',c1,'index.md'),make('guide.md',c2,'docs/guide.md'),make('.env','SAFE_FAKE_TOKEN','.env')];
      Object.defineProperty(input,'files',{value:files,configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}));
    }""",[content1,content2])

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
    context=browser.new_context(accept_downloads=True,viewport={'width':1280,'height':840})
    requests=[]
    context.route('**/*',lambda route:(requests.append(route.request.url),route.abort()))
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.set_content(HTML.read_text(encoding='utf-8'),wait_until='domcontentloaded')
    assert 'R17' in page.title()
    mount(page)
    assert page.locator('#file-list input[type=checkbox]').count()==2
    assert '.env' not in page.locator('#file-list').inner_text()
    page.click('#chooseall')
    page.click('#audit')
    expect(page.locator('#download')).to_be_enabled()
    assert 'PASS' in page.locator('#status').inner_text()
    assert page.locator('.kpi').count()==6
    assert page.locator('#metrics').inner_text().count('1')>=1
    with page.expect_download() as info:
        page.click('#download')
    download=info.value
    assert download.suggested_filename.endswith('.json')
    result=json.loads(Path(download.path()).read_text(encoding='utf-8'))
    assert result['schema']=='tls.repo-integrity-report.v1'
    assert result['decision']=='PASS'
    assert result['summary']['pass_count']==1
    assert 'SAFE_FAKE_TOKEN' not in json.dumps(result)
    assert 'docs/guide.md' not in json.dumps(result)
    assert result['network_requested'] is False
    # Browser may not read unselected data; files contain it but audit remains metadata-only.
    page.click('#clear')
    assert page.locator('#file-list input').count()==0
    assert page.locator('#download').is_disabled()
    mount(page,'[web](https://example.invalid/docs)','# Install\n')
    page.click('#chooseall')
    page.click('#audit')
    expect(page.locator('#download')).to_be_enabled()
    assert 'UNKNOWN' in page.locator('#status').inner_text()
    assert len(requests)==0, requests
    # By default, include no usernames or absolute machine paths.
    page.set_viewport_size({'width':390,'height':844})
    assert page.locator('#audit').is_visible()
    page.click('#clear')
    page.evaluate("""()=>{const f=new File([new Uint8Array([0xc3,0x28])],'bad.md');Object.defineProperty(f,'webkitRelativePath',{value:'demo/bad.md'});let input=document.querySelector('#pick');Object.defineProperty(input,'files',{value:[f],configurable:true});input.dispatchEvent(new Event('change'))}""")
    page.click('#chooseall')
    page.click('#audit')
    expect(page.locator('#status')).to_contain_text('INVALID_FILES_OR_ENCODING')
    assert page.locator('#download').is_disabled()
    assert errors==[],errors
    browser.close()
print('R17_BROWSER_OFFLINE_SELECT_SCOPE_METADATA_DOWNLOAD_UNICODE_FAIL_CLOSED_PASS')
