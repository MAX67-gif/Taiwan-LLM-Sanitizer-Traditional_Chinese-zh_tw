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

class GuardError(B.ReleaseBlock):pass

def expect(ok,reason):
    if not ok:raise GuardError(reason)

def readjson(b,where):
    try:return json.loads(b)
    except (ValueError,UnicodeDecodeError) as e:raise GuardError('INVALID_JSON:'+where) from e

def checksums(b,where):
    out={}
    try:
        for line in b.decode('utf-8').splitlines():
            h,n=line.split('  ',1)
            expect(B.HEX64.fullmatch(h)!=None and B.safe_filename(n),'CHECKSUM_FORMAT:'+where)
            expect(n not in out,'DUPLICATE_CHECKSUM:'+where)
            out[n]=h
        return out
    except (UnicodeError,ValueError) as e:
        raise GuardError('INVALID_CHECKSUMS:'+where) from e

def verify_stage(stage: Path, registry:Path=B.REGISTRY, fixture_ok=False, expected_sha=None, previous_manifest=None,release_data=None,download_dir=None, require_published=None):
    expect(stage.is_dir() and not stage.is_symlink(),'STAGE_NOT_DIR')
    expected_registry=readjson(registry.read_bytes(),'registry')
    tools=B.validate_registry(expected_registry,fixture=fixture_ok)
    expected_names={t['artifact_filename'] for t in tools if t['standalone_required']}
    expected_names.add(B.DEVELOPER_BUNDLE)
    expect(len(expected_names)==21,'EXPECTED_STANDALONE_COUNT')
    expected_names |= REQ_NAMES
    actual_names={p.name for p in stage.iterdir()}
    expect(actual_names==expected_names,'INCOMPLETE_OR_EXTRA_ASSETS missing='+str(sorted(expected_names-actual_names))+' extra='+str(sorted(actual_names-expected_names)))
    assets={name:B.safe_file(stage/name,stage) for name in actual_names}
    assert all(B.safe_filename(x) for x in actual_names)
    m=readjson(assets['ALL_TOOLS_MANIFEST.json'],'manifest')
    prov=readjson(assets['BUILD_PROVENANCE.json'],'provenance')
    valid=readjson(assets['VALIDATION.json'],'validation')
    expect(m.get('schema')=='tls.all-tools-release-manifest.v1','MANIFEST_SCHEMA')
    expect(m.get('release_tag')==expected_registry['release_tag'] and valid.get('release_tag')==m.get('release_tag'),'RELEASE_TAG_MISMATCH')
    expect(m.get('suite_version')==expected_registry['suite_version'] and prov.get('suite_version')==m.get('suite_version'),'SUITE_VERSION_MISMATCH')
    expect(m.get('tool_count')==len(tools)==valid.get('tool_count_expected')==valid.get('tool_count_present'),'MANIFEST_TOOL_COUNT')
    expect(valid.get('missing_tool_ids')==[] and m.get('external_transport')=='NONE','UNSAFE_TOOL_PERMISSION')
    expect(isinstance(m.get('tools'),list) and [x['tool_id'] for x in m['tools']]==[x['tool_id'] for x in tools],'TOOL_ID_PARITY')
    for got,locked in zip(m['tools'],tools):
        for k in locked:
            expect(got.get(k)==locked[k],'TOOL_METADATA_OR_VERSION:'+locked['tool_id']+':'+k)
        expect(got.get('source_sha256')==locked['expected_sha256'],'TOOL_SHA_OR_PROVENANCE:'+locked['tool_id'])
        expect(got.get('artifact_bytes',0)>0 and got.get('artifact_sha256')==locked['expected_sha256'],'TOOL_BYTES_AND_SHA:'+locked['tool_id'])
        expect(got.get('verification_status') in ('SOURCE_SHA_PASS','SHA256_PASS'),'TOOL_UNVERIFIED:'+locked['tool_id'])
    expect(m.get('is_fixture')==prov.get('fixture')==valid.get('fixture'),'FIXTURE_STATUS_MISMATCH')
    if not fixture_ok:expect(m['is_fixture'] is False and valid.get('status')=='PACKAGE_READY_NOT_PUBLISHED','FIXTURE_NOT_PUBLISHABLE')
    if expected_sha is not None:
        expect(B.HEX64.fullmatch(expected_sha)!=None and m.get('source_git_sha')==expected_sha,'SOURCE_GIT_SHA')
    if previous_manifest:
        old=readjson(Path(previous_manifest).read_bytes(),'previous_manifest')
        current={x['tool_id'] for x in m['tools']}
        prior={x['tool_id'] for x in old['tools'] if x.get('status') not in ('EXCLUDED_RIGHTS_WITHDRAWN','PRIVATE_ONLY','BLOCKED_SECURITY')}
        expect(not prior-current,'TOOL_ID_REMOVAL_NOT_AUTHORIZED:'+','.join(sorted(prior-current)))
    expect(len(m.get('artifacts',[]))==21,'ARTIFACT_MANIFEST_COUNT')
    artifacts={x['name']:x for x in m['artifacts']}
    expect(set(artifacts)==expected_names-REQ_NAMES,'ARTIFACT_NAME_LIST')
    for name,entry in artifacts.items():
        expect(entry.get('name')==name and entry.get('size')==len(assets[name]) and entry.get('sha256')==B.digest(assets[name]),'ARTIFACT_BYTES_SHA:'+name)
        if name.lower().endswith('.zip'):B.validate_zip_bytes(assets[name],name)
    B.validate_zip_bytes(assets[B.SUITE_FILENAME],B.SUITE_FILENAME)
    with ZipFile(io.BytesIO(assets[B.SUITE_FILENAME])) as z:
        members={x.filename:x for x in z.infolist()}
        expected_member_names={'ALL_TOOLS_MANIFEST.json','BUILD_PROVENANCE.json','BUNDLE_SHA256SUMS.txt','README_6_LANGUAGES.txt'}
        expected_member_names|={'TOOLS/'+next(t['package_subdir'] for t in tools if t['artifact_filename']==name and t['standalone_required'])+'/'+name for name in artifacts if name!=B.DEVELOPER_BUNDLE}
        expected_member_names.add('TOOLS/developer/'+B.DEVELOPER_BUNDLE)
        expect(set(members)==expected_member_names,'SUITE_MISSING_EXTRA_FILES')
        expect(z.read('ALL_TOOLS_MANIFEST.json')==assets['ALL_TOOLS_MANIFEST.json'],'MANIFEST_IN_SUITE_CHANGED')
        expect(z.read('BUILD_PROVENANCE.json')==assets['BUILD_PROVENANCE.json'],'PROVENANCE_IN_SUITE_CHANGED')
        for name in artifacts:
            dirname=next((t['package_subdir'] for t in tools if t['artifact_filename']==name and t['standalone_required']),'developer')
            expect(z.read('TOOLS/'+dirname+'/'+name)==assets[name],'BUNDLE_ASSET_SHA:'+name)
        internal=checksums(z.read('BUNDLE_SHA256SUMS.txt'),'inner')
        expect(set(internal)==set(artifacts)|{'ALL_TOOLS_MANIFEST.json','BUILD_PROVENANCE.json'},'INTERNAL_CHECKSUM_COMPLETE')
        for name in internal:expect(internal[name]==B.digest(assets[name]),'INTERNAL_SHA_MISMATCH:'+name)
    expect(valid.get('suite_sha256')==B.digest(assets[B.SUITE_FILENAME]) and valid.get('suite_bytes')==len(assets[B.SUITE_FILENAME]),'SUITE_SHA_OR_SIZE')
    sidecar=checksums(assets['SHA256SUMS.txt'],'outer')
    expect(set(sidecar)==actual_names-{'SHA256SUMS.txt'},'OUTER_CHECKSUM_COMPLETE')
    for name,h in sidecar.items():expect(h==B.digest(assets[name]),'SHA256_MISMATCH:'+name)
    # Inspect developer bundle for source bytes and exact six-language usage docs.
    with ZipFile(io.BytesIO(assets[B.DEVELOPER_BUNDLE])) as dev:
        paths=set(dev.namelist())
        for f in ['README.md','README.zh-CN.md','README.en.md','README.ja.md','README.ko.md','README.es.md',
                  'docs/INSTALL_CHROME.md','docs/INSTALL_TAMPERMONKEY.md','LICENSE']:
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
    real={x.get('name'):x for x in obj.get('assets',[])}
    expect(set(real)==set(expected),'GITHUB_RELEASE_INCOMPLETE expected='+str(len(expected))+' actual='+str(sorted(real)))
    if require_published:expect(obj.get('draft') is False and obj.get('prerelease') is False,'GITHUB_RELEASE_NOT_PUBLISHED')
    for name,path in expected.items():
        asset=real[name]
        expect(asset.get('size')==path.stat().st_size,'GITHUB_ASSET_LENGTH:'+name)
        want=B.digest(path.read_bytes())
        remote=asset.get('digest')
        if remote:
            expect(remote=='sha256:'+want,'GITHUB_ASSET_SHA:'+name)
        else:
            expect(download_dir is not None,'GITHUB_MISSING_DIGEST_REQUIRES_DOWNLOAD:'+name)
            dl=Path(download_dir)/name
            expect(dl.is_file() and B.digest(dl.read_bytes())==want,'GITHUB_DOWNLOADED_SHA:'+name)
    return True

def verify_workflow():
    w=(ROOT/'.github/workflows/ci.yml').read_text(encoding='utf-8')
    name='  all-tools-full-suite-release:\n'
    expect(w.count(name)==1,'CENTRAL_RELEASE_JOB_MISSING')
    block=w.split(name,1)[1]
    for fragment in ("github.event_name == 'push' && github.ref == 'refs/heads/main'",
                     'needs: [verify, browser-integration]','contents: write',
                     'tools/build_all_tools_release.py','tools/check_all_tools_release.py',
                     'gh release create','--draft','gh release download','gh release edit',
                     '--release-json','--require-published','SHA256SUMS.txt'):
        expect(fragment in block,'CENTRAL_RELEASE_GATE_MISSING:'+fragment)
    # Freeze historical single-tool publishers: no future partial Release can be created.
    legacy = ['release','r6-quality-release','r8-context-review-release','r9-user-terms-release',
              'r10-context-governance-release','r11-personal-glossary-release','r12-quality-evidence-release',
              'r13-bilingual-release','r14-capability-release','r151-structured-release',
              'r16-studio-release','r15-structured-release','r17-trust-graph-release']
    for job in legacy:
        marker='  '+job+':\n'
        expect(w.count(marker)==1,'LEGACY_JOB_NOT_FOUND:'+job)
        block=w.split(marker,1)[1].split('\n    steps:',1)[0]
        expect("if: github.event_name == 'push' && github.ref == 'refs/heads/main' && false" in block,
               'LEGACY_PARTIAL_PUBLISHER_NOT_DISABLED:'+job)
    # Prevent newly introduced ad hoc release tags from silently omitting the suite.
    expect(w.count('  all-tools-full-suite-release:\n')==1,'MULTIPLE_CENTRAL_RELEASE_JOBS')
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
