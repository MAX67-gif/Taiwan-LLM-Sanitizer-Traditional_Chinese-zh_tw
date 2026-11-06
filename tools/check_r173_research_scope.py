"""Fail-closed main commit gate for validated research and exact R17.4 docs changes.

This does not authorize skipping full-Suite publication on runtime, registry,
installer, HTML app, generalized tooling, unknown, deleted, or renamed files.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PINNED_PRODUCT_SHA='a1265254f6a8e7d98a9c91d83d74dbf12bf3c4b4'
PINNED_SUITE_TAG='all-tools-suite-v17.2.0'
PINNED_ASSET_COUNT=25
EXACT={'.github/workflows/ci.yml',
       'tools/publication_guard.py', 'tools/check_all_tools_release.py','tools/check_r173_research_scope.py',
       'tests/test_comparison_r173.py','tests/test_comparison_r173.js','tests/test_r173_research_scope.py',
       'CHANGELOG.md','README.md','README.en.md','README.es.md','README.ja.md','README.ko.md','README.zh-CN.md'}
PREFIX=('docs/','research/comparison/r173/')
HOTFIX_ONLY={'tools/check_r173_research_scope.py','tests/test_r173_research_scope.py'}
# The *one* explicitly audited R17.4 first-use documentation delta. Changing
# even one other path requires the fail-closed complete-suite publication route.
R174_FIRST_USE_EXACT={
    'README.md','README.en.md','README.es.md','README.ja.md','README.ko.md','README.zh-CN.md',
    'docs/QUICK_START_R174.md','docs/QUICK_START_R174.en.md','docs/R174_ORIGINAL_FIRST_TASK.md',
    'tools/check_r173_research_scope.py','tools/publication_guard.py','tests/test_r173_research_scope.py','tests/test_r174_first_run_links.py'
}

# Exact R17.5 native provenance sidecar. No runtime or product release changes.
R175_NATIVE_EXACT={
    '.github/workflows/ci.yml', 'tools/check_all_tools_release.py',
    'research/comparison/r175/native_probe.py',
    'research/comparison/r175/fixture_native_original.md',
    'research/comparison/r175/PROTOCOL.md',
    'tests/test_r175_native_probe.py', 'tests/test_r173_research_scope.py',
    'tools/check_r173_research_scope.py', 'tools/publication_guard.py',
    'docs/R175_NATIVE_OPENCC_PROTOCOL.md',
}

# One reviewed R17.6 documentation/showcase transaction. Expected A/M states
# are part of the contract; these paths do not broaden the legacy R17.3 route.
R176_SHOWCASE_STATES={
    **{p:'M' for p in (
        'README.md','README.en.md','README.zh-CN.md','README.ja.md','README.ko.md','README.es.md',
        'CHANGELOG.md','.github/workflows/ci.yml','tools/check_r173_research_scope.py',
        'tools/check_all_tools_release.py','tools/publication_guard.py','tests/test_r173_research_scope.py',
    )},
    **{p:'A' for p in (
        'docs/showcase/source.md','docs/showcase/preview.md','docs/showcase/decisions.json',
        'docs/showcase/verification.json','docs/showcase/README.md','docs/showcase/README.en.md',
        'docs/showcase/trial_observation.md','tools/check_showcase_r176.js',
        'tests/test_showcase_r176.js','tests/test_showcase_browser_r176.py','tests/test_r176_showcase_contract.py',
    )},
}

# Exact audited R17.8 B0: public entry-point correction + forward-only archive
# safety.  No runtime, registry, or generated installer is changed. Add/remove
# any path, even a documentation file, and this special route fails closed.
R178_B0_STATES = {
    **{p: 'M' for p in (
        '.github/workflows/ci.yml', 'CHANGELOG.md',
        'README.md', 'README.en.md', 'README.zh-CN.md',
        'README.ja.md', 'README.ko.md', 'README.es.md',
        'docs/QUICK_START_R174.md', 'docs/QUICK_START_R174.en.md',
        'docs/showcase/README.md', 'docs/showcase/README.en.md',
        'docs/R173_COMPARISON_AND_ADOPTION.md', 'docs/R173_COMPARISON_AND_ADOPTION.en.md',
        'docs/ALL_TOOLS_RELEASE.md',
        'tools/build_all_tools_release.py', 'tools/publication_guard.py',
        'tools/check_r173_research_scope.py', 'tools/check_all_tools_release.py',
        'tests/test_r173_research_scope.py', 'tests/test_r174_first_run_links.py',
        'tests/test_r176_showcase_contract.py',
    )},
    'tools/check_r178_b0_release.py': 'A',
    'tests/test_r178_b0_release.py': 'A',
}


# One-time approved correction of six misleading first-use download links.
# No product/runtime/registry paths, and no general docs-only exemption.
R190_PINNED_BASE = 'd49eb0d62e60316a502a793e0d61779e77de2b2c'
R190_READMES = ('README.md','README.en.md','README.zh-CN.md',
                'README.ja.md','README.ko.md','README.es.md')
R190_STATES = {**{p:'M' for p in R190_READMES},
               'tools/check_r173_research_scope.py':'M',
               'tests/test_r173_research_scope.py':'M'}
R190_OLD_LINK = 'https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.3.0'
R190_NEW_LINK = 'https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/latest'
R190_OLD_MASTER_SHA = '256908192f52399e43b06394db894f6d53fd8ca6f4348c9c1d9c98003c12c393'
R190_NEW_MASTER_SHA = 'dcb476d616a61e08fdb088d9a853ed157df20b2e97a513a821350c08b259e583'
R190_CURRENT = {
 'README.md': (
  ('完整下載請選 Suite 17.3.0。','完整下載請以 GitHub 最新正式 Release 為準。'),
  ('現行下載應使用 Suite 17.3.0。','現行下載應以 GitHub 最新正式 Release 為準。'),
  ('現行完整下載請用 Suite 17.3.0。','現行完整下載請以 GitHub 最新正式 Release 為準。')),
 'README.en.md': (('so use Suite 17.3.0 for the current complete download.','so use the latest official GitHub Release for the current complete download.'),),
 'README.zh-CN.md': (('当前完整下载请使用 Suite 17.3.0。','当前完整下载请以 GitHub 最新正式 Release 为准。'),),
 'README.ja.md': (('現在の完全版は Suite 17.3.0 を利用してください。','現在の完全版は GitHub の最新正式リリースから入手してください。'),),
 'README.ko.md': (('최신 전체 다운로드는 Suite 17.3.0을 사용하세요.','전체 패키지는 GitHub 최신 공식 릴리스에서 다운로드하세요.'),),
 'README.es.md': (('Utiliza Suite 17.3.0 para la descarga completa actual.','Utiliza la última versión oficial de GitHub para obtener el paquete completo.'),),
}

def r190_apply_exact(source, path):
    if path not in R190_CURRENT or source.count(R190_OLD_LINK) != 2:
        raise ValueError('R190_OLD_LINK_CONTRACT')
    result = source.replace(R190_OLD_LINK,R190_NEW_LINK,1)
    for old,new in R190_CURRENT[path]:
        if result.count(old) != 1:
            raise ValueError('R190_CURRENT_CLAIM_MISMATCH')
        result = result.replace(old,new,1)
    if result.count(R190_OLD_LINK) != 1:
        raise ValueError('R190_HISTORICAL_LINK_MISSING')
    if path != 'README.md':
        old_marker = '<!-- SOURCE_README_SHA256:' + R190_OLD_MASTER_SHA + ' -->'
        new_marker = '<!-- SOURCE_README_SHA256:' + R190_NEW_MASTER_SHA + ' -->'
        if result.count(old_marker) != 1:
            raise ValueError('R190_TRANSLATION_MASTER_SHA_MISMATCH')
        result = result.replace(old_marker, new_marker, 1)
    return result

def r190_verify_exact(base,head):
    if base != R190_PINNED_BASE:
        raise ValueError('R190_WRONG_BASE')
    if not re.fullmatch(r'[0-9a-f]{40}',head):
        raise ValueError('R190_BAD_HEAD')
    for path in R190_READMES:
        before=subprocess.check_output(['git','show',f'{base}:{path}'],cwd=ROOT).decode('utf-8')
        after=subprocess.check_output(['git','show',f'{head}:{path}'],cwd=ROOT).decode('utf-8')
        if r190_apply_exact(before,path) != after:
            raise ValueError('R190_UNEXPECTED_DOCUMENT_CONTENT:'+path)
        if path == 'README.md' and hashlib.sha256(after.encode('utf-8')).hexdigest() != R190_NEW_MASTER_SHA:
            raise ValueError('R190_NEW_MASTER_SHA_MISMATCH')
    return True


def allowed_path(p):
    return p in EXACT or p.startswith(PREFIX) and '..' not in p.split('/')

def classify(changes):
    """Input (status, path) from trusted git diff; unknown is product-critical."""
    if not changes:
        return False,'EMPTY_DIFF_NOT_RESEARCH'
    paths=[]
    for state,p in changes:
        if state not in ('A','M'):
            return False,'PRODUCT_OR_UNRECOGNIZED_CHANGE'
        paths.append(p)
    if len(set(paths)) != len(paths):
        return False,'DUPLICATE_CHANGED_PATH'
    if set(paths) == set(R190_STATES):
        if not all(R190_STATES[p]==state for state,p in changes):
            return False,'R190_STATUS_MISMATCH'
        return True,'R190_PINNED_LINKS_DOCS_ONLY'
    if set(paths)==set(R178_B0_STATES):
        if all(R178_B0_STATES[p] == state for state,p in changes):
            return True,'R178_B0_PUBLIC_ONBOARDING_SECURITY_ONLY'
        return False,'R178_B0_UNEXPECTED_STATUS'
    if set(paths)==set(R176_SHOWCASE_STATES):
        if all(R176_SHOWCASE_STATES[p]==state for state,p in changes):
            return True,'R176_PROOF_FIRST_SHOWCASE_DOCS_ONLY'
        return False,'R176_UNEXPECTED_PATH_STATUS'
    # Research execution contract is the exact approved 10-path set;
    # no arbitrary docs/workflows, no deletion, no unsafe product-side effect.
    if set(paths)==R175_NATIVE_EXACT and len(paths)==len(R175_NATIVE_EXACT):
        return True,'R175_NATIVE_EVIDENCE_EXACT_ONLY'
    # Match exactly the full 13-path R17.4 first-use gateway transaction.
    # This is *not* a permissive general docs-only bypass.
    if set(paths)==R174_FIRST_USE_EXACT and len(paths)==len(R174_FIRST_USE_EXACT):
        return True,'R174_FIRST_RESULT_DOCS_ONLY'
    for p in paths:
        if not allowed_path(p):
            return False,'PRODUCT_OR_UNRECOGNIZED_CHANGE'
    if not any(x.startswith('research/comparison/r173/') for x in paths):
        if set(paths)==HOTFIX_ONLY and len(paths)==len(HOTFIX_ONLY):
            return True,'R173_SCOPE_HOTFIX_EXACT_PAIR_ONLY'
        return False,'NOT_EXPLICIT_R173_RESEARCH'
    return True,'R173_RESEARCH_ONLY'

def changed_files(base,head):
    if not re.fullmatch(r'[0-9a-f]{40}',base) or not re.fullmatch(r'[0-9a-f]{40}',head):
        raise ValueError('BAD_GIT_REVISION')
    raw=subprocess.check_output(['git','diff','--name-status','-z','--no-renames',base,head],cwd=ROOT)
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
    if (len(set(names))!=len(names) or 'TLS_ALL_TOOLS_SUITE_17_2_0.zip' in names
            or 'TLS_DEVELOPER_CLI_SKILL_17_2_0.zip' in names
            or 'TW_Wording_Assistant_R172_20261027.html' not in names
            or 'ALL_TOOLS_MANIFEST.json' not in names or 'VALIDATION.json' not in names):
        raise ValueError('PINNED_ASSET_INVENTORY_INVALID')
    return True

def main(argv=None):
    parser=argparse.ArgumentParser()
    parser.add_argument('--base'); parser.add_argument('--head')
    parser.add_argument('--existing-release-json'); parser.add_argument('--receipt')
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
    allowed_no_release,reason=classify(changed_files(args.base,args.head))
    if reason=='R190_PINNED_LINKS_DOCS_ONLY':
        r190_verify_exact(args.base,args.head)
    docs_only=(reason in ('R178_B0_PUBLIC_ONBOARDING_SECURITY_ONLY',
                         'R190_PINNED_LINKS_DOCS_ONLY'))
    is_research=allowed_no_release and not docs_only
    ghout=os.environ.get('GITHUB_OUTPUT')
    if ghout:
        with open(ghout,'a',encoding='utf-8') as o:
            o.write('product_changed='+('false' if allowed_no_release else 'true')+'\n')
            o.write('research_only='+('true' if is_research else 'false')+'\n')
            o.write('docs_only='+('true' if docs_only else 'false')+'\n')
    print(json.dumps({'schema':'tls.r173.release-scope.v1','status':reason,
        'research_only':is_research,'docs_only':docs_only,'product_changed':not allowed_no_release}))
    return 0

if __name__=='__main__':
    try:raise SystemExit(main())
    except (ValueError,OSError,subprocess.CalledProcessError,json.JSONDecodeError) as exc:
        print('R173_SCOPE_UNVERIFIED_FAIL_CLOSED:',str(exc)[:150]);raise SystemExit(2)
