"""R12 offline Chromium UX: file import, optional B comparison, reviews, data isolation."""
from pathlib import Path
import json, os
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
PAGE=ROOT/'examples/TW_Quality_Audit_Lab_R12_20261025.html'
FROZEN=[json.loads(x) for x in (ROOT/'benchmarks/r6/public_frozen_v1.jsonl').read_text('utf-8').splitlines() if x.strip()]

def payload(rows):
    return ('\n'.join(json.dumps(x,ensure_ascii=False) for x in rows)+'\n').encode('utf-8')

def exercise():
    with sync_playwright() as play:
        path=os.getenv('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or '/usr/bin/chromium'
        args={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
        if Path(path).is_file():args['executable_path']=path
        browser=play.chromium.launch(**args)
        context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
        tab=context.new_page()
        outgoing=[]
        tab.on('request', lambda req: outgoing.append(req.url) if req.url.startswith(('http:','https:')) else None)
        tab.set_content(PAGE.read_text(encoding='utf-8'),wait_until='load')
        assert tab.get_by_role('heading',name='翻譯品質證據工作台').count()==1
        assert 'b8929e' in tab.locator('#cohort-hash').inner_text()
        first,second=FROZEN[0],FROZEN[1]
        secret='R12_REAL_PAGE_PRIVATE_TOKEN_DO_NOT_PUBLISH'
        tab.locator('#file-a').set_input_files({'name':'candidate_a.jsonl','mimeType':'application/x-ndjson',
          'buffer':payload([{'id':first['id'],'translation':secret},{'id':second['id'],'translation':second['source_text']}])})
        tab.locator('#file-b').set_input_files({'name':'candidate_b.jsonl','mimeType':'application/x-ndjson',
          'buffer':payload([{'id':first['id'],'translation':'測試翻譯'}])})
        tab.locator('#file-reviews').set_input_files({'name':'reviews.jsonl','mimeType':'application/x-ndjson',
          'buffer':payload([{'id':first['id'],'reviewer_id':n,'meaning':4,'naturalness':3,'taiwan_locale':4,'register':4}
                            for n in ('researcherA','researcherB')])})
        tab.locator('#analyze').click()
        tab.locator('#results').wait_for(state='visible',timeout=10000)
        assert tab.locator('#count-submitted').inner_text()=='2/100'
        assert tab.locator('#count-missing').inner_text()=='98'
        assert tab.locator('#count-two').inner_text()=='1'
        assert tab.locator('#verdict').inner_text()=='NO_PROMOTION_NO_CLAIM'
        assert tab.locator('#results').is_visible()
        assert '共同提交 1 題' in tab.locator('#compare-note').inner_text()
        with tab.expect_download() as receipt:
            tab.locator('#export').click()
        dl=receipt.value
        output=json.loads(Path(dl.path()).read_text('utf-8'))
        assert output['candidateA']['submitted']==2
        assert output['comparison']['both']==1
        assert output['humanReviewIndependent'] is False
        assert secret not in json.dumps(output,ensure_ascii=False)
        assert 'source_text' not in json.dumps(output)
        # Fail closed on mismatched cohorts and unknown rows.
        tab.locator('#file-a').set_input_files({'name':'bad.jsonl','mimeType':'application/x-ndjson',
            'buffer':payload([{'id':'UNKNOWN_COHORT','translation':'中文'}])})
        tab.locator('#analyze').click()
        expect(tab.locator('#status')).to_contain_text('TRANSLATION_SCHEMA_OR_ID',timeout=10000)
        assert tab.locator('#results').is_hidden()
        assert tab.locator('#export').is_disabled()
        tab.locator('#clear').click()
        assert tab.locator('#file-a').input_value()==''
        assert tab.locator('#results').is_hidden()
        tab.set_content(PAGE.read_text(encoding='utf-8'),wait_until='load')
        assert tab.locator('#file-a').input_value()==''
        assert not outgoing, outgoing
        context.close();browser.close()
    print('R12_BROWSER_OFFLINE_EVIDENCE_PASS')

if __name__=='__main__':exercise()
