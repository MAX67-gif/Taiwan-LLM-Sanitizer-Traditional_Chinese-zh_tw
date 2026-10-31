"""Strict offline/CI All-Tools release validator. No data upload, no silent asset omission."""
from __future__ import annotations
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

import build_all_tools_release as B

ROOT = Path(__file__).resolve().parents[1]
REQ_NAMES={'ALL_TOOLS_MANIFEST.json','BUILD_PROVENANCE.json','VALIDATION.json','SHA256SUMS.txt', B.SUITE_FILENAME}
GITHUB_REPOSITORY='MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw'

class GuardError(B.ReleaseBlock):pass

def expect(ok,reason):
    if not ok:raise GuardError(reason)

def readjson(b,where):
    return B.strict_json(b, where)

def asset_download_url_matches(asset, release_tag, *, draft=False):
    """Bind GitHub's temporary draft URLs to their authenticated asset identity.

    GitHub may assign an untagged-* browser URL before publication. The final
    published URL must use the exact release tag. Temporary URLs are accepted
    only for a draft, in this repository, with the exact asset API ID and name;
    the caller still verifies freshly downloaded bytes against the pinned SHA.
    """
    name = asset.get('name')
    if not isinstance(name, str) or not B.safe_filename(name):
        return False
    prefix = 'https://github.com/' + GITHUB_REPOSITORY + '/releases/download/'
    actual = asset.get('browser_download_url')
    if actual == prefix + release_tag + '/' + name:
        return True
    if draft is not True or not isinstance(actual, str) or not actual.startswith(prefix):
        return False
    slug, separator, filename = actual[len(prefix):].partition('/')
    asset_id = asset.get('id')
    return (separator == '/' and filename == name
            and re.fullmatch(r'untagged-[A-Za-z0-9][A-Za-z0-9_-]{0,127}', slug) is not None
            and type(asset_id) is int and asset_id > 0
            and asset.get('url') == 'https://api.github.com/repos/' + GITHUB_REPOSITORY
                + '/releases/assets/' + str(asset_id))

def checksums(b,where,allow_paths=False):
    out={}
    try:
        for line in b.decode('utf-8').splitlines():
            h,n=line.split('  ',1)
            expect(B.HEX64.fullmatch(h)!=None and (B.safe_archive_path(n) if allow_paths else B.safe_filename(n)),'CHECKSUM_FORMAT:'+where)
            expect(n not in out,'DUPLICATE_CHECKSUM:'+where)
            out[n]=h
        return out
    except (UnicodeError,ValueError) as e:
        raise GuardError('INVALID_CHECKSUMS:'+where) from e

def verify_stage(stage: Path, registry:Path=B.REGISTRY, fixture_ok=False, expected_sha=None, previous_manifest=None,release_data=None,download_dir=None, require_published=None):
    expect(stage.is_dir() and not stage.is_symlink(),'STAGE_NOT_DIR')
    # Fixture registries intentionally substitute historical R5/R6 bytes.
    # Reject declared fixtures before applying production metadata pins.
    if not fixture_ok and (stage/'ALL_TOOLS_MANIFEST.json').is_file():
        declared = readjson(B.safe_file(stage/'ALL_TOOLS_MANIFEST.json', stage), 'manifest')
        expect(declared.get('is_fixture') is not True, 'FIXTURE_NOT_PUBLISHABLE')
    expected_registry=readjson(registry.read_bytes(),'registry')
    tools=B.validate_registry(expected_registry,fixture=fixture_ok)
    expected_names={t['artifact_filename'] for t in tools if t['standalone_required']}
    expected_names.add(B.DEVELOPER_BUNDLE)
    expect(len(expected_names)==23,'EXPECTED_STANDALONE_COUNT')
    expected_names |= REQ_NAMES
    actual_names={p.name for p in stage.iterdir()}
    expect(actual_names==expected_names,'INCOMPLETE_OR_EXTRA_ASSETS missing='+str(sorted(expected_names-actual_names))+' extra='+str(sorted(actual_names-expected_names)))
    assets={name:B.safe_file(stage/name,stage) for name in actual_names}
    expect(all(B.safe_filename(x) for x in actual_names), 'UNSAFE_ASSET_FILENAME')
    m=readjson(assets['ALL_TOOLS_MANIFEST.json'],'manifest')
    prov=readjson(assets['BUILD_PROVENANCE.json'],'provenance')
    valid=readjson(assets['VALIDATION.json'],'validation')
    expect(m.get('schema')=='tls.all-tools-release-manifest.v1','MANIFEST_SCHEMA')
    expect(m.get('tool_count') == 28 and m.get('asset_count_standalone') == 23, 'CURRENT_INVENTORY_COUNTS')
    expect(all(valid.get(k) == v for k,v in {'tool_count_expected':28, 'tool_count_present':28, 'tool_count_updated':1, 'tool_count_reused_from_origins':27, 'tool_count_unchanged_from_previous_suite':27, 'standalone_asset_count':23}.items()), 'CURRENT_VALIDATION_COUNTS')
    expect(prov.get('schema') == 'tls.all-tools-provenance.v1' and valid.get('schema') == 'tls.all-tools-validation.v1', 'PROVENANCE_VALIDATION_SCHEMA')
    expect(m.get('release_tag')==expected_registry['release_tag'] and valid.get('release_tag')==m.get('release_tag'),'RELEASE_TAG_MISMATCH')
    expect(m.get('suite_version')==expected_registry['suite_version'] and prov.get('suite_version')==m.get('suite_version'),'SUITE_VERSION_MISMATCH')
    expect(m.get('tool_count')==len(tools)==valid.get('tool_count_expected')==valid.get('tool_count_present'),'MANIFEST_TOOL_COUNT')
    expect(valid.get('missing_tool_ids')==[] and m.get('external_transport')=='NONE','UNSAFE_TOOL_PERMISSION')
    expect(m.get('approval') == 'NONE' and valid.get('manual_human_translation_review') == 'NOT_RUN', 'FALSE_HUMAN_APPROVAL')
    expect(m.get('locales') == expected_registry['locales'] and m.get('excluded_rights_withdrawn') == expected_registry['excluded_rights_withdrawn'], 'LOCALE_OR_RIGHTS_PARITY')
    expect(m.get('source_main_baseline_sha') == prov.get('baseline_git_sha') == valid.get('source_main_baseline_sha') == expected_registry['base_commit_sha'], 'SOURCE_BASELINE_PARITY')
    expect(m.get('source_git_sha') == prov.get('current_git_sha') == valid.get('source_git_sha'), 'SOURCE_GIT_SHA_PROVENANCE')
    expect(prov.get('release_tag') == m.get('release_tag'), 'PROVENANCE_RELEASE_TAG')
    expect(isinstance(m.get('tools'),list) and [x['tool_id'] for x in m['tools']]==[x['tool_id'] for x in tools],'TOOL_ID_PARITY')
    for got,locked in zip(m['tools'],tools):
        for k in locked:
            if locked['tool_id'] == B.NEW_TOOL_ID and k == 'original_commit_sha':
                continue
            expect(got.get(k)==locked[k],'TOOL_METADATA_OR_VERSION:'+locked['tool_id']+':'+k)
        if locked['tool_id'] == B.NEW_TOOL_ID:
            expect(got.get('original_commit_sha') == m.get('source_git_sha'), 'NEW_TOOL_SOURCE_COMMIT_AUTHORITY')
        expect(got.get('source_sha256')==locked['expected_sha256'],'TOOL_SHA_OR_PROVENANCE:'+locked['tool_id'])
        expect(got.get('artifact_bytes',0)>0 and got.get('artifact_sha256')==locked['expected_sha256'],'TOOL_BYTES_AND_SHA:'+locked['tool_id'])
        expect(got.get('verification_status') in ('SOURCE_SHA_PASS','SHA256_PASS'),'TOOL_UNVERIFIED:'+locked['tool_id'])
    expect(m.get('is_fixture')==prov.get('fixture')==valid.get('fixture'),'FIXTURE_STATUS_MISMATCH')
    if not fixture_ok:
        expect(m['is_fixture'] is False and valid.get('status')=='PACKAGE_READY_NOT_PUBLISHED','FIXTURE_NOT_PUBLISHABLE')
        expect(registry.resolve() == B.REGISTRY.resolve(), 'PRODUCTION_REGISTRY_OVERRIDE')
        expect(B.GIT_SHA.fullmatch(m.get('source_git_sha', '')) is not None, 'SOURCE_GIT_SHA')
    if expected_sha is not None:
        expect(B.GIT_SHA.fullmatch(expected_sha)!=None and m.get('source_git_sha')==expected_sha,'SOURCE_GIT_SHA')
    for locked in tools:
        if locked['standalone_required']:
            expect(B.digest(assets[locked['artifact_filename']]) == locked['expected_sha256'], 'LOCKED_ARTIFACT_SHA:' + locked['tool_id'])
            got = next(row for row in m['tools'] if row['tool_id'] == locked['tool_id'])
            if locked['source_kind'] == 'generated_local_artifact':
                B.validate_generated_installer(assets[locked['artifact_filename']], locked)
            expect(got['artifact_bytes'] == len(assets[locked['artifact_filename']]), 'TOOL_SIZE:' + locked['tool_id'])
            expect(got.get('location_in_suite') == 'TOOLS/' + locked['package_subdir'] + '/' + locked['artifact_filename'], 'TOOL_LOCATION:' + locked['tool_id'])
    if previous_manifest:
        old=readjson(Path(previous_manifest).read_bytes(),'previous_manifest')
        current={x['tool_id'] for x in m['tools']}
        prior={x['tool_id'] for x in old['tools'] if x.get('status') not in ('EXCLUDED_RIGHTS_WITHDRAWN','PRIVATE_ONLY','BLOCKED_SECURITY')}
        expect(not prior-current,'TOOL_ID_REMOVAL_NOT_AUTHORIZED:'+','.join(sorted(prior-current)))
    expect(len(m.get('artifacts',[]))==23,'ARTIFACT_MANIFEST_COUNT')
    artifacts={x['name']:x for x in m['artifacts']}
    expect(set(artifacts)==expected_names-REQ_NAMES,'ARTIFACT_NAME_LIST')
    for name,entry in artifacts.items():
        expect(entry.get('name')==name and entry.get('size')==len(assets[name]) and entry.get('sha256')==B.digest(assets[name]),'ARTIFACT_BYTES_SHA:'+name)
        if name.lower().endswith('.zip'):B.validate_zip_bytes(assets[name],name)
    B.validate_zip_bytes(assets[B.SUITE_FILENAME],B.SUITE_FILENAME)
    with ZipFile(io.BytesIO(assets[B.SUITE_FILENAME])) as z:
        members={x.filename:x for x in z.infolist()}
        expected_member_names={'ALL_TOOLS_MANIFEST.json','BUILD_PROVENANCE.json','BUNDLE_SHA256SUMS.txt','SHA256SUMS.txt','README_6_LANGUAGES.txt','VALIDATION.json','ALL_TOOLS_REGISTRY.json','START_HERE.html'}
        expected_member_names|={'TOOLS/'+next(t['package_subdir'] for t in tools if t['artifact_filename']==name and t['standalone_required'])+'/'+name for name in artifacts if name!=B.DEVELOPER_BUNDLE}
        expected_member_names.add('TOOLS/developer/'+B.DEVELOPER_BUNDLE)
        expect(set(members)==expected_member_names,'SUITE_MISSING_EXTRA_FILES')
        expect(z.read('ALL_TOOLS_MANIFEST.json')==assets['ALL_TOOLS_MANIFEST.json'],'MANIFEST_IN_SUITE_CHANGED')
        expect(z.read('BUILD_PROVENANCE.json')==assets['BUILD_PROVENANCE.json'],'PROVENANCE_IN_SUITE_CHANGED')
        expect(z.read('ALL_TOOLS_REGISTRY.json') == registry.read_bytes(), 'REGISTRY_IN_SUITE_CHANGED')
        expect(z.read('START_HERE.html') == B.safe_file(B.ROOT/'tools/templates/start_here_suite_r172.html', B.ROOT), 'SUITE_START_HERE_CHANGED')
        from build_start_here_r172 import verify as verify_start
        expect(verify_start(z.read('START_HERE.html').decode('utf8'),set(members)) >= 3, 'SUITE_START_HERE_LINKS')
        inner_validation = readjson(z.read('VALIDATION.json'), 'inner_validation')
        expect(inner_validation.get('schema') == 'tls.all-tools-bundle-validation.v1' and inner_validation.get('source_git_sha') == m['source_git_sha'], 'INNER_VALIDATION_SOURCE')
        expect(inner_validation.get('registry_sha256') == B.digest(registry.read_bytes()) and inner_validation.get('tool_count_present') == len(tools) and inner_validation.get('missing_tool_ids') == [], 'INNER_VALIDATION_PARITY')
        expect(inner_validation.get('status') == valid['status'] and inner_validation.get('post_publish_all_assets') == 'NOT_RUN', 'INNER_VALIDATION_STATUS')
        for name in artifacts:
            dirname=next((t['package_subdir'] for t in tools if t['artifact_filename']==name and t['standalone_required']),'developer')
            expect(z.read('TOOLS/'+dirname+'/'+name)==assets[name],'BUNDLE_ASSET_SHA:'+name)
        expect(z.read('BUNDLE_SHA256SUMS.txt') == z.read('SHA256SUMS.txt'), 'INTERNAL_CHECKSUM_ALIAS')
        internal=checksums(z.read('BUNDLE_SHA256SUMS.txt'),'inner',allow_paths=True)
        expect(set(internal)==set(members)-{'BUNDLE_SHA256SUMS.txt','SHA256SUMS.txt'},'INTERNAL_CHECKSUM_COMPLETE')
        for name in internal:expect(internal[name]==B.digest(z.read(name)),'INTERNAL_SHA_MISMATCH:'+name)
    expect(valid.get('suite_sha256')==B.digest(assets[B.SUITE_FILENAME]) and valid.get('suite_bytes')==len(assets[B.SUITE_FILENAME]),'SUITE_SHA_OR_SIZE')
    sidecar=checksums(assets['SHA256SUMS.txt'],'outer')
    expect(set(sidecar)==actual_names-{'SHA256SUMS.txt'},'OUTER_CHECKSUM_COMPLETE')
    for name,h in sidecar.items():expect(h==B.digest(assets[name]),'SHA256_MISMATCH:'+name)
    # Inspect developer bundle for source bytes and exact six-language usage docs.
    with ZipFile(io.BytesIO(assets[B.DEVELOPER_BUNDLE])) as dev:
        paths=set(dev.namelist())
        expected_sources = B.developer_contents(B.tracked_files())
        expect(paths == set(expected_sources), 'DEVELOPER_SOURCE_FILE_SET')
        for name, source in expected_sources.items():
            expect(dev.read(name) == source, 'DEVELOPER_SOURCE_SHA:' + name)
        for f in ['README.md','README.zh-CN.md','README.en.md','README.ja.md','README.ko.md','README.es.md',
                  'docs/INSTALL_CHROME.md','docs/INSTALL_TAMPERMONKEY.md','LICENSE', 'release/all_tools_registry.json',
                  'docs/USAGE_EXAMPLES.md','docs/USAGE_EXAMPLES.zh-CN.md','docs/USAGE_EXAMPLES.en.md',
                  'docs/USAGE_EXAMPLES.ja.md','docs/USAGE_EXAMPLES.ko.md','docs/USAGE_EXAMPLES.es.md',
                  'docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.md','docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md','START_HERE.html']:
            expect(f in paths,'DEVELOPER_SOURCE_MISSING:'+f)
        for t in tools:
            if t['source_kind']=='developer_bundle':
                expect(t['source_path'] in paths,'DEVELOPER_TOOL_MISSING:'+t['tool_id'])
                expect(B.digest(dev.read(t['source_path']))==t['expected_sha256'],'DEVELOPER_TOOL_SHA:'+t['tool_id'])
    # A prior R17 only-HTML release is deliberately insufficient for this new contract.
    if release_data is not None:
        check_release(release_data,stage,require_published=bool(require_published),download_dir=download_dir)
    return {'status':'PASS','tools':len(tools),'standalone_assets':len(artifacts),'github_assets_expected':len(actual_names),'sha_valid':True,'crc_valid':True,'fixture':m['is_fixture']}

def check_release(obj,stage:Path,require_published=False,download_dir=None):
    expected={p.name:p for p in stage.iterdir()}
    asset_rows = obj.get('assets', [])
    expect(isinstance(asset_rows, list) and all(isinstance(x, dict) for x in asset_rows), 'GITHUB_ASSET_SCHEMA')
    real={x.get('name'):x for x in asset_rows}
    expect(len(real) == len(asset_rows), 'GITHUB_DUPLICATE_ASSETS')
    expect(set(real)==set(expected),'GITHUB_RELEASE_INCOMPLETE expected='+str(len(expected))+' actual='+str(sorted(real)))
    manifest = readjson((stage / 'ALL_TOOLS_MANIFEST.json').read_bytes(), 'release_manifest')
    expect(obj.get('tag_name') == manifest['release_tag'], 'GITHUB_RELEASE_TAG')
    expect(obj.get('target_commitish') == manifest['source_git_sha'], 'GITHUB_RELEASE_SOURCE')
    if 'resolved_tag_commit' in obj:
        expect(obj['resolved_tag_commit'] == manifest['source_git_sha'], 'GITHUB_TAG_SOURCE')
    if require_published:expect(obj.get('draft') is False and obj.get('prerelease') is False,'GITHUB_RELEASE_NOT_PUBLISHED')
    if download_dir is not None:
        dl_root = Path(download_dir)
        expect(dl_root.is_dir() and not dl_root.is_symlink(), 'GITHUB_DOWNLOADED_SHA:directory')
        expect({p.name for p in dl_root.iterdir()} == set(expected), 'GITHUB_DOWNLOAD_INCOMPLETE')
    for name,path in expected.items():
        asset=real[name]
        expect(asset.get('size')==path.stat().st_size,'GITHUB_ASSET_LENGTH:'+name)
        expect(asset.get('state') == 'uploaded', 'GITHUB_ASSET_STATE:' + name)
        expect(asset_download_url_matches(asset, manifest['release_tag'], draft=obj.get('draft') is True),
               'GITHUB_ASSET_DOWNLOAD_URL:' + name)
        want=B.digest(path.read_bytes())
        remote=asset.get('digest')
        if remote:
            expect(remote=='sha256:'+want,'GITHUB_ASSET_SHA:'+name)
        expect(remote or download_dir is not None,'GITHUB_MISSING_DIGEST_REQUIRES_DOWNLOAD:'+name)
        if download_dir is not None:
            dl=Path(download_dir)/name
            expect(dl.is_file() and not dl.is_symlink() and B.digest(B.safe_file(dl, Path(download_dir)))==want,'GITHUB_DOWNLOADED_SHA:'+name)
    return True

def require_unconditional_single_command(job, command):
    """Require one actual command step without skip or soft-fail modifiers.

    This intentionally accepts only the small reviewed step shape. An echo,
    comment, shell suffix or disabled step cannot serve as execution evidence.
    """
    steps=re.split(r'(?=^      - )',job,flags=re.M)[1:]
    found=[]
    for step in steps:
        lines=[line for line in step.splitlines() if line.strip()]
        if '        run: '+command in lines:
            found.append(lines)
    expect(len(found)==1, 'R176_EXECUTABLE_GATE_MISSING:'+command)
    lines=found[0]
    expect(len(lines)==2 and lines[0].startswith('      - name: ')
           and lines[1]=='        run: '+command, 'R176_GATE_MUST_BE_UNCONDITIONAL:'+command)


def verify_workflow(workflow_text=None):
    """Validate this repository's deliberately restricted workflow layout.

    This is a closed schema, not a general YAML parser. New workflow files and
    unsupported job/header shapes require an explicit reviewed schema update.
    Comments never satisfy a required executable or dependency declaration.
    """
    if workflow_text is None:
        files = {p.name for p in (ROOT / '.github/workflows').iterdir() if p.is_file()}
        expect(files == {'ci.yml'}, 'UNAUTHORIZED_PUBLISHER_WORKFLOW')
        workflow_text = (ROOT / '.github/workflows/ci.yml').read_text(encoding='utf-8')
    w = '\n'.join(line for line in workflow_text.splitlines() if not line.lstrip().startswith('#')) + '\n'
    expect(w.count('\njobs:\n') == 1, 'WORKFLOW_JOB_SCHEMA')
    content = w.split('\njobs:\n', 1)[1]
    matches = list(re.finditer(r'^  ([A-Za-z][A-Za-z0-9_-]*):\s*$', content, re.M))
    jobs = {}
    for i, match in enumerate(matches):
        key = match.group(1)
        expect(key not in jobs, 'DUPLICATE_WORKFLOW_JOB')
        jobs[key] = content[match.end():matches[i + 1].start() if i + 1 < len(matches) else len(content)]
    central = 'all-tools-full-suite-release'
    legacy = {'release', 'r6-quality-release', 'r8-context-review-release', 'r9-user-terms-release',
              'r10-context-governance-release', 'r11-personal-glossary-release', 'r12-quality-evidence-release',
              'r13-bilingual-release', 'r14-capability-release', 'r151-structured-release',
              'r16-studio-release', 'r15-structured-release', 'r17-trust-graph-release'}
    expect(central in jobs, 'CENTRAL_RELEASE_JOB_MISSING')
    expect(set(jobs) == legacy | {'verify', 'browser-integration', 'r175-native-evidence', central}, 'UNAUTHORIZED_PUBLISHER_OR_JOB')
    research_native = jobs['r175-native-evidence']
    research_header = research_native.split('\n    steps:', 1)[0]
    expect(re.search(r'^    needs: verify$', research_header, re.M), 'R175_MUST_DEPEND_ON_VERIFY')
    expect(re.search(r'^    permissions:\n      contents: read$', research_header, re.M), 'R175_NOT_READ_ONLY')
    for part in ('actions/checkout@v4', 'persist-credentials: false', 'ver.1.4.2',
                 'native_probe.py', 'OFFICIAL_EXECUTION_AND_METADATA_PASS', 'actions/upload-artifact@v4'):
        expect(part in research_native, 'R175_NATIVE_PROVENANCE_GATE_MISSING:' + part)
    for forbidden in ('GH_TOKEN', 'GITHUB_TOKEN', 'secrets.', 'contents: write',
                      'gh release', 'publish_all_tools_release', 'permissions: write-all'):
        expect(forbidden not in research_native, 'R175_READONLY_NO_PUBLISHER:' + forbidden)
    for job in legacy:
        header = jobs[job].split('\n    steps:', 1)[0]
        expect(re.search(r"^    if: github.event_name == 'push' && github.ref == 'refs/heads/main' && false$", header, re.M),
               'LEGACY_PARTIAL_PUBLISHER_NOT_DISABLED:' + job)
    block = jobs[central]
    header = block.split('\n    steps:', 1)[0]
    expect(re.search(r"^    if: github.event_name == 'push' && github.ref == 'refs/heads/main'$", header, re.M), 'CENTRAL_RELEASE_EVENT')
    expect(re.search(r'^    needs: \[verify, browser-integration\]$', header, re.M), 'CENTRAL_RELEASE_DEPENDENCIES')
    expect(re.search(r'^      contents: write$', header, re.M), 'CENTRAL_RELEASE_PERMISSION')
    expect(not re.search(r'^    continue-on-error:', header, re.M), 'MRFT_PUBLISHER_MUST_NOT_SOFT_FAIL')
    expect(re.search(r'^    concurrency:\n      group: tls-all-tools-release-\$\{\{ github.repository \}\}\n      cancel-in-progress: false$', header, re.M),
           'CENTRAL_RELEASE_CONCURRENCY')
    # Research-only source changes must never attempt to republish an immutable
    # 17.2 tag. A closed git-diff allowlist chooses a read-only prior-release
    # inspection; any runtime, registry or unrecognized path still invokes the
    # full suite stage + publisher. This must be tested by the central checker.
    for fragment in (
        'tools/check_r173_research_scope.py --base',
        'id: r173_scope',
        "if: steps.r173_scope.outputs.product_changed == 'true'",
        "if: steps.r173_scope.outputs.research_only == 'true'",
        'gh release view "all-tools-suite-v17.2.0"',
        'tools/check_r173_research_scope.py',
        '--existing-release-json',
        'fetch-depth: 2',
    ):
        expect(fragment in block, 'RESEARCH_RELEASE_SCOPE_GATE_MISSING:' + fragment)
    expect(block.count("if: steps.r173_scope.outputs.product_changed == 'true'") == 2,
           'RESEARCH_SCOPE_MUST_GUARD_BOTH_BUILD_AND_PUBLISH')
    for fragment in ('tools/build_all_tools_release.py', 'tools/check_all_tools_release.py',
                     'tools/publish_all_tools_release.py', '--expected-sha', '--source-sha', '--fetch-official'):
        expect(fragment in block, 'CENTRAL_RELEASE_GATE_MISSING:' + fragment)
    for job in ('verify', 'browser-integration'):
        gate_header = jobs[job].split('\n    steps:', 1)[0]
        expect(not re.search(r'^    (?:if|continue-on-error):', gate_header, re.M), 'MRFT_REQUIRED_JOB_MUST_EXECUTE:' + job)
    verify = jobs['verify']
    for command in ('python tools/build_mrft_r177.py', 'python tools/build_mrft_r177.py --check',
                    'python tests/test_mrft_build_r177.py',
                    'python -m unittest tests/test_all_tools_mrft_r177.py -v'):
        require_unconditional_single_command(verify, command)
    expect(verify.index('run: python tools/build_mrft_r177.py\n') < verify.index("python -m unittest discover -s tests -p 'test_all_tools*.py'"), 'MRFT_BUILD_BEFORE_RELEASE_TESTS')
    require_unconditional_single_command(jobs['browser-integration'], 'sudo apt-get update && sudo apt-get install --yes --no-install-recommends xvfb xauth xdotool')
    require_unconditional_single_command(jobs['browser-integration'], 'python tools/build_mrft_r177.py')
    require_unconditional_single_command(jobs['browser-integration'], 'python tests/mrft_r177.browser.py')
    require_unconditional_single_command(jobs['browser-integration'], 'xvfb-run -a python tests/mrft_extension_r177.browser.py')
    for browser_command in ('python tests/mrft_r177.browser.py', 'xvfb-run -a python tests/mrft_extension_r177.browser.py'):
        expect(jobs['browser-integration'].index('run: python tools/build_mrft_r177.py\n') < jobs['browser-integration'].index('run: ' + browser_command), 'MRFT_BUILD_BEFORE_BROWSER_TESTS')
    require_unconditional_single_command(block, 'python tools/build_mrft_r177.py')
    require_unconditional_single_command(block, 'python tools/build_mrft_r177.py --check')
    expect(block.index('run: python tools/build_mrft_r177.py\n') < block.index('python tools/build_all_tools_release.py'), 'MRFT_BUILD_BEFORE_PUBLISHER_STAGE')
    require_unconditional_single_command(verify,'node tools/check_showcase_r176.js --check')
    require_unconditional_single_command(verify,'python -m unittest tests/test_r176_showcase_contract.py -v')
    require_unconditional_single_command(jobs['browser-integration'],'python tests/test_showcase_browser_r176.py')
    expect('tools/build_all_tools_release.py' in verify and '--fetch-official' in verify and '--source-sha' in verify
           and 'tools/check_all_tools_release.py' in verify and '--expected-sha' in verify, 'PRODUCTION_PREFLIGHT_MISSING')
    for job in ('verify', 'browser-integration'):
        block = jobs[job]
        expect(not re.search(r'contents:\s*write|write-all|gh\s+release\s+(?:create|edit|upload)|publish_all_tools_release|action-gh-release', block),
               'UNAUTHORIZED_PUBLISHER:' + job)
    return True

def main():
    cli=argparse.ArgumentParser()
    cli.add_argument('--stage',type=Path)
    cli.add_argument('--registry',type=Path,default=B.REGISTRY)
    cli.add_argument('--fixture',action='store_true')
    cli.add_argument('--expected-sha')
    cli.add_argument('--previous-manifest')
    cli.add_argument('--release-json',type=Path)
    cli.add_argument('--download-dir',type=Path)
    cli.add_argument('--require-published',action='store_true')
    cli.add_argument('--check-workflow',action='store_true')
    args=cli.parse_args()
    try:
        if args.check_workflow:verify_workflow()
        if args.stage:
            outcome=verify_stage(args.stage,args.registry,fixture_ok=args.fixture,expected_sha=args.expected_sha,
               previous_manifest=args.previous_manifest,release_data=readjson(args.release_json.read_bytes(),'github') if args.release_json else None,
               download_dir=args.download_dir,require_published=args.require_published)
            print('ALL_TOOLS_RELEASE_VALIDATION_PASS',json.dumps(outcome,sort_keys=True))
        elif not args.check_workflow:cli.error('Provide --stage or --check-workflow')
    except (GuardError,B.ReleaseBlock,ValueError,KeyError,FileNotFoundError,OSError) as e:
        print('ALL_TOOLS_RELEASE_VALIDATION_BLOCKED',str(e),file=sys.stderr);raise SystemExit(1)
if __name__=='__main__':main()
