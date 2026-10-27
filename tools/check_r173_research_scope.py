"""Fail-closed GitHub main-commit gate for research-only R17.3 updates.

This NEVER authorizes skipping a release for changes to runtime, registry,
installer, user-facing HTML, general tooling, or a deleted/renamed asset.
Full-suite remains the only allowed producer for product changes.
"""
from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PINNED_PRODUCT_SHA = 'a1265254f6a8e7d98a9c91d83d74dbf12bf3c4b4'
PINNED_SUITE_TAG = 'all-tools-suite-v17.2.0'
PINNED_ASSET_COUNT = 27
EXACT = {'.github/workflows/ci.yml',
         'tools/publication_guard.py', 'tools/check_all_tools_release.py', 'tools/check_r173_research_scope.py',
         'tests/test_comparison_r173.py', 'tests/test_comparison_r173.js',
         'CHANGELOG.md', 'README.md', 'README.en.md', 'README.es.md',
         'README.ja.md', 'README.ko.md', 'README.zh-CN.md'}
PREFIX = ('docs/', 'research/comparison/r173/')

def allowed_path(p):
    return p in EXACT or p.startswith(PREFIX) and '..' not in p.split('/')

def classify(changes):
    """Input (status,path) from trusted git diff. Unrecognized changes are product-critical."""
    if not changes:
        return False, 'EMPTY_DIFF_NOT_RESEARCH'
    paths = []
    for state, p in changes:
        if state not in ('A','M') or not allowed_path(p):
            return False, 'PRODUCT_OR_UNRECOGNIZED_CHANGE'
        paths.append(p)
    if not any(x.startswith('research/comparison/r173/') for x in paths):
        return False, 'NOT_EXPLICIT_R173_RESEARCH'
    return True, 'R173_RESEARCH_ONLY'

def changed_files(base, head):
    if not re.fullmatch(r'[0-9a-f]{40}', base) or not re.fullmatch(r'[0-9a-f]{40}', head):
        raise ValueError('BAD_GIT_REVISION')
    raw = subprocess.check_output(['git','diff','--name-status','-z','--no-renames',base,head],cwd=ROOT)
    entries=raw.decode('utf-8','strict').split('\0');items=[]
    for i in range(0,len(entries)-1,2):
        st,p=entries[i:i+2]
        if not st or not p:raise ValueError('UNPARSABLE_DIFF')
        items.append((st,p))
    return items

def validate_existing_release(obj):
    if not isinstance(obj,dict) or obj.get('tagName')!=PINNED_SUITE_TAG or obj.get('isDraft') is not False or obj.get('targetCommitish')!=PINNED_PRODUCT_SHA:
        raise ValueError('PINNED_RELEASE_IDENTITY_MISMATCH')
    assets=obj.get('assets')
    if not isinstance(assets,list) or len(assets)!=PINNED_ASSET_COUNT:
        raise ValueError('PINNED_ASSETS_MISSING')
    names=[a.get('name') for a in assets if isinstance(a,dict)]
    if len(set(names))!=len(names) or 'TLS_ALL_TOOLS_SUITE_17_2_0.zip' not in names or 'TW_Wording_Assistant_R172_20261027.html' not in names or 'VALIDATION.json' not in names:
        raise ValueError('PINNED_ASSET_INVENTORY_INVALID')
    return True

def main(argv=None):
    parser=argparse.ArgumentParser()
    parser.add_argument('--base')
    parser.add_argument('--head')
    parser.add_argument('--existing-release-json')
    parser.add_argument('--receipt')
    args=parser.parse_args(argv)
    if args.existing_release_json:
        if not args.receipt:parser.error('--receipt required')
        obj=json.loads(Path(args.existing_release_json).read_text('utf-8'))
        validate_existing_release(obj)
        outcome={'schema':'tls.r173.release-routing.v1','status':'RESEARCH_ONLY_NO_NEW_RELEASE',
                 'previous_release_tag':PINNED_SUITE_TAG,'previous_release_target_commit':PINNED_PRODUCT_SHA,
                 'previous_release_assets_verified_by_listing':PINNED_ASSET_COUNT,
                 'fresh_download_byte_verification_this_run':'NOT_PERFORMED',
                 'new_release_created':False,'requested_product_change':False}
        Path(args.receipt).write_text(json.dumps(outcome,indent=2)+'\n',encoding='utf-8')
        print('R173_PINNED_RESEARCH_RECEIPT_PASS');return 0
    if not args.base or not args.head:parser.error('--base and --head required')
    is_research,reason=classify(changed_files(args.base,args.head))
    ghout=os.environ.get('GITHUB_OUTPUT')
    if ghout:
        with open(ghout,'a',encoding='utf-8') as o:
            o.write('product_changed='+('false' if is_research else 'true')+'\n')
            o.write('research_only='+('true' if is_research else 'false')+'\n')
    print(json.dumps({'schema':'tls.r173.release-scope.v1','status':reason,
        'research_only':is_research,'product_changed':not is_research}))
    return 0

if __name__=='__main__':
    try:raise SystemExit(main())
    except (ValueError,OSError,subprocess.CalledProcessError,json.JSONDecodeError) as exc:
        print('R173_SCOPE_UNVERIFIED_FAIL_CLOSED:',str(exc)[:150])
        raise SystemExit(2)
