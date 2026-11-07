#!/usr/bin/env python3
"""R19 native report identity and completeness checker. Does not run Chromium.

Accepts only the untouched R19 original ten-scenario runner's full PASS report,
real download-derived reports and saved desktop/mobile screenshots.
Self-tests check *schema rejection*, not browser acceptance.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ORIGINAL_RUNNER_SHA = 'f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8'
EXPECTED_HTML_SHA = '33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a'
EXPECTED_SCENARIOS = (
    'guided_first_result_and_keyboard',
    'menu_context_preferences_and_separate_manual_decisions',
    'cancel_and_bad_bytes_preserve_the_existing_result',
    'CRLF_file_import_and_exact_native_download_bytes',
    '130_detected_120_shown_stays_partial_after_all_visible_decisions',
    'late_long_line_difference_is_visible_and_Unicode_safe',
    'context_markup_is_inert_and_protected_content_is_preserved',
    'pending_preview_generation_blocks_stale_results_errors_and_unlocks',
    '390px_native_layout_and_keyboard_focus',
    'no_page_errors_or_external_requests',
)
SOURCE_FILES={
    'examples/TW_First_Result_Studio_R19_20261101.html': EXPECTED_HTML_SHA,
    'tests/browser_first_result_studio_r19.cjs': ORIGINAL_RUNNER_SHA,
}

class Rejected(Exception):
    pass

def assert_ok(cond: bool, reason: str):
    if not cond: raise Rejected(reason)

def digest(data: bytes) -> str: return hashlib.sha256(data).hexdigest()

def png_info(path: Path):
    data=path.read_bytes()
    assert_ok(len(data)>1024 and data.startswith(b'\x89PNG\r\n\x1a\n'),'PNG_MISSING_OR_INVALID')
    assert_ok(data[12:16]==b'IHDR','PNG_IHDR')
    width=int.from_bytes(data[16:20],'big');height=int.from_bytes(data[20:24],'big')
    assert_ok(250<=width<=16000 and 350<=height<=60000,'PNG_DIMENSIONS')
    return {'bytes':len(data),'sha256':digest(data),'width':width,'height':height}

def validate_report_shape(report):
    assert_ok(type(report) is dict,'REPORT_TYPE')
    assert_ok(report.get('schema')=='tls.r19.native-browser-acceptance.v1','REPORT_SCHEMA')
    assert_ok(report.get('status')=='PASS' and 'failure' not in report,'FULL_ACCEPTANCE_NOT_PASS')
    assert_ok(report.get('mode')=='NATIVE_FILE_URL','NOT_NATIVE_FILE_URL')
    assert_ok(report.get('html_file')=='TW_First_Result_Studio_R19_20261101.html','WRONG_HTML_FILE')
    assert_ok(report.get('html_sha256')==EXPECTED_HTML_SHA,'REPORT_SOURCE_MISMATCH')
    assert_ok(isinstance(report.get('node_version'),str) and re.fullmatch(r'v\d+\.\d+\.\d+',report['node_version']) and int(report['node_version'].split('.')[0][1:])>=20,'NODE_VERSION')
    assert_ok(isinstance(report.get('browser_version'),str) and re.fullmatch(r'\d+\.\d+\.\d+\.\d+',report['browser_version']),'BROWSER_VERSION')
    names=report.get('scenarios')
    assert_ok(type(names) is list and len(names)==10,'TEN_SCENARIOS_REQUIRED')
    assert_ok([p.get('name') for p in names if type(p) is dict]==list(EXPECTED_SCENARIOS),'SCENARIO_ORDER_OR_ID')
    assert_ok(all(type(p) is dict and p.get('status')=='PASS' and set(p)=={'name','status'} for p in names),'SCENARIO_FAILURE')
    assert_ok(type(report.get('external_request_count')) is int and report['external_request_count']==0,'EXTERNAL_REQUESTS_NOT_ZERO')
    assert_ok(report.get('external_requests')==[] and report.get('page_errors')==[],'EXTERNAL_OR_PAGE_ERROR_NOT_EMPTY')
    assert_ok(report.get('human_quality_verified') is False and report.get('native_os_file_chooser_verified') is False,'UNVERIFIED_SCOPE_OVERCLAIM')
    return True

def validate(source_root: Path, output: Path, driver_path: Path) -> dict:
    for name, expected in SOURCE_FILES.items():
        p=source_root/name
        assert_ok(p.is_file() and not p.is_symlink() and digest(p.read_bytes())==expected, 'FROZEN_SOURCE_SHA:'+name)
    assert_ok(driver_path.is_file(),'NODE_DRIVER_MISSING')
    driver=json.loads(driver_path.read_text('utf-8'))
    assert_ok(driver.get('version')=='1.55.0','WRONG_NODE_PLAYWRIGHT_VERSION')
    report_path=output/'R19_NATIVE_BROWSER_REPORT.json'
    assert_ok(report_path.is_file() and not report_path.is_symlink(),'MISSING_REAL_RUNNER_REPORT')
    report=json.loads(report_path.read_text('utf-8'))
    validate_report_shape(report)
    desktop=png_info(output/'R19_DESKTOP_NATIVE.png')
    mobile=png_info(output/'R19_MOBILE_NATIVE.png')
    assert_ok(desktop['width']>=900,'DESKTOP_SCREENSHOT_WIDTH')
    assert_ok(mobile['width']==390,'MOBILE_SCREENSHOT_WIDTH_NOT_390')
    return {'schema':'tls.r19.ab.r2.native-validation.v1', 'status':'NATIVE_10_SCENARIOS_VERIFIED_WITH_SCOPE',
            'scenario_count':10,'verified_html_sha256':EXPECTED_HTML_SHA,
            'verified_original_runner_sha256':ORIGINAL_RUNNER_SHA,'node_playwright_version':'1.55.0',
            'browser_version':report['browser_version'],'native_file_url':'ASSERTED_BY_ORIGINAL_RUNNER',
            'external_request_count':0,'page_errors':0,'real_download_checks':'RUNNER_SCENARIOS_PASS',
            'desktop':desktop,'mobile':mobile,'original_report_sha256':digest(report_path.read_bytes()),
            'native_os_file_chooser_verified':False,'human_language_quality':'NOT_MEASURED',
            'user_adoption':'NOT_MEASURED','release_permission':'NONE'}

def self_test() -> dict:
    import copy
    valid={
        'schema':'tls.r19.native-browser-acceptance.v1', 'status':'PASS',
        'mode':'NATIVE_FILE_URL', 'html_file':'TW_First_Result_Studio_R19_20261101.html',
        'node_version':'v22.16.0', 'browser_version':'140.0.7339.16',
        'html_sha256':EXPECTED_HTML_SHA,
        'scenarios':[{'name':n,'status':'PASS'} for n in EXPECTED_SCENARIOS],
        'external_request_count':0,'external_requests':[],'page_errors':[],
        'human_quality_verified':False,'native_os_file_chooser_verified':False,
    }
    assert validate_report_shape(valid)
    variants=[]
    for field,value in [
        ('schema','other'),('status','FAIL'),('mode','HTTP'),
        ('html_file','other.html'),('node_version','v18.0.0'),
        ('browser_version','unknown'),('html_sha256','0'*64),
        ('external_request_count',1),('external_requests',['https://example.invalid']),
        ('page_errors',['error']),('human_quality_verified',True),
        ('native_os_file_chooser_verified',True),
    ]:
        x=copy.deepcopy(valid);x[field]=value;variants.append(x)
    x=copy.deepcopy(valid);x['scenarios'][0]['status']='FAIL';variants.append(x)
    x=copy.deepcopy(valid);x['scenarios'].pop();variants.append(x)
    x=copy.deepcopy(valid);x['scenarios'][0]['name']='wrong';variants.append(x)
    x=copy.deepcopy(valid);x['failure']='assertion error';variants.append(x)
    for record in variants:
        try:validate_report_shape(record)
        except Rejected:continue
        raise RuntimeError('FORGED_REPORT_ACCEPTED')
    return {'schema':'tls.r19.ab.r2.validator-selftest.v1','status':'SCHEMA_REJECTION_TESTS_PASS',
            'synthetic_positive':1,'rejected_adversarial':len(variants),'full_native':'NOT_RUN'}

def main():
    parser=argparse.ArgumentParser(description='Validate actual R19 native ten-scenario evidence; fail closed')
    parser.add_argument('--root',type=Path)
    parser.add_argument('--output',type=Path)
    parser.add_argument('--node-playwright-package',type=Path)
    parser.add_argument('--receipt',type=Path)
    parser.add_argument('--self-test',action='store_true')
    args=parser.parse_args()
    if args.self_test:
        print(json.dumps(self_test()));return 0
    if not all((args.root,args.output,args.node_playwright_package,args.receipt)):
        parser.error('all of --root --output --node-playwright-package --receipt required')
    try:
        evidence=validate(args.root,args.output,args.node_playwright_package)
        assert_ok(not args.receipt.exists() and args.receipt.parent.is_dir(),'REFUSE_OVERWRITE')
        args.receipt.write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(json.dumps({'status':'PASS','schema':evidence['schema'],'source_sha256':EXPECTED_HTML_SHA,'scenarios':10}))
        return 0
    except (Rejected,OSError,ValueError,TypeError) as exc:
        print('R19_NATIVE_RECEIPT_REJECTED:'+(str(exc) if isinstance(exc,Rejected) else 'INVALID_EVIDENCE'),file=sys.stderr)
        return 2
if __name__=='__main__':raise SystemExit(main())
