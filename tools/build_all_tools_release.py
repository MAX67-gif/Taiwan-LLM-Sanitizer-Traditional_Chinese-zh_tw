"""Build a complete, offline, source-locked TLS All-Tools distribution.

Production refuses any missing/bad historical release assets, including the R5 ZIP
whose legacy timestamps make re-zipping byte-incompatible with the GitHub Release.
No telemetry, no remote provider and no substitutions. --fetch-official is explicit.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import zlib
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'release/all_tools_registry.json'
DEVELOPER_BUNDLE = 'TLS_DEVELOPER_CLI_SKILL_17_1_0.zip'
SUITE_FILENAME = 'TLS_ALL_TOOLS_SUITE_17_1_0.zip'
HEADER_FILES = ('ALL_TOOLS_MANIFEST.json', 'BUILD_PROVENANCE.json')
HEX64 = re.compile(r'^[0-9a-f]{64}$')
RETIRE_WORDS = tuple(''.join(x) for x in [('poke', 'bonk'), ('poke', 'mon'), ('pok', 'émon')])
MAX_ASSET_BYTES = 20 * 1024 * 1024
FIXED_ZIP_TIME = (2026, 10, 26, 0, 0, 0)

class ReleaseBlock(RuntimeError):
    pass

def fail(code: str):
    raise ReleaseBlock('BLOCK_' + code)

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def json_bytes(obj: object) -> bytes:
    return (json.dumps(obj, sort_keys=True, ensure_ascii=False, indent=2) + '\n').encode('utf-8')

def safe_filename(name: str) -> bool:
    if not isinstance(name, str) or len(name) > 190 or not name or name in ('.', '..'):
        return False
    if '/' in name or '\\' in name or name.startswith('.') or '\0' in name:
        return False
    if any(s in name.casefold() for s in RETIRE_WORDS):
        return False
    return True

def safe_archive_path(name: str) -> bool:
    if not isinstance(name, str) or '\\' in name or name.startswith(('/', './')) or '\0' in name:
        return False
    parts = name.split('/')
    return all(x and x not in ('.','..') for x in parts) and not any(s in name.casefold() for s in RETIRE_WORDS)

def safe_file(path: Path, root: Path) -> bytes:
    if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root.resolve()):
        fail('SYMLINK_OR_UNAUTHORIZED_PATH:' + path.name)
    if path.stat().st_size < 1 or path.stat().st_size > MAX_ASSET_BYTES:
        fail('EMPTY_OR_OVERSIZE:' + path.name)
    return path.read_bytes()

def validate_zip_bytes(data: bytes, label: str) -> None:
    import io
    try:
        with ZipFile(io.BytesIO(data)) as z:
            names = z.namelist()
            if not names or len(names) != len(set(names)) or not all(safe_archive_path(n) for n in names):
                fail('ZIP_PATHS_OR_DUPLICATES:' + label)
            if z.testzip() is not None:
                fail('ZIP_CRC:' + label)
            for f in z.infolist():
                # Unix mode type 0120000 means a symlink, never included.
                if (f.external_attr >> 16) & 0o170000 == 0o120000:
                    fail('ZIP_SYMLINK:' + label)
    except (ValueError, OSError, EOFError, zlib.error, __import__('zipfile').BadZipFile) as exc:
        fail('INVALID_ZIP:' + label + ':' + str(exc))

def deterministic_zip(contents: dict[str, bytes]) -> bytes:
    import io
    out = io.BytesIO()
    with ZipFile(out, mode='w', compression=ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(contents.items()):
            if not safe_archive_path(name) or not data:
                fail('UNSAFE_ZIP_MEMBER:' + name)
            info = ZipInfo(name, FIXED_ZIP_TIME)
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, data, compress_type=ZIP_DEFLATED, compresslevel=9)
    value = out.getvalue()
    validate_zip_bytes(value, 'GENERATED_ARCHIVE')
    return value

def tracked_files() -> list[str]:
    proc = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, check=True, capture_output=True)
    result = [p.decode('utf-8', errors='strict') for p in proc.stdout.split(b'\0') if p]
    if not result:
        fail('NO_TRACKED_FILES')
    return result

def validate_registry(reg: dict, fixture: bool) -> list[dict]:
    if reg.get('schema') != 'tls.all-tools-registry.v1' or reg.get('suite_version') != '17.1.0' or reg.get('release_tag') != 'all-tools-suite-v17.1.0':
        fail('REGISTRY_SCHEMA_VERSION')
    tools = reg.get('tools')
    if not isinstance(tools, list) or len(tools) != 26:
        fail('REGISTRY_COUNT')
    ids = [x.get('tool_id') for x in tools]
    if ids != reg.get('monotonic_baseline_tool_ids') or len(ids) != len(set(ids)):
        fail('REGISTRY_ID_MONOTONIC_BASELINE')
    if len([x for x in tools if x.get('family') == 'browser']) != 6 or len([x for x in tools if x.get('family') == 'offline_html']) != 13 or len([x for x in tools if x.get('family') == 'quality']) != 1 or len([x for x in tools if x.get('family') in ('developer_cli','developer_skill')]) != 6:
        fail('REGISTRY_FAMILY_COMPLETENESS')
    for x in tools:
        if not isinstance(x.get('tool_id'), str) or not x['tool_id'].startswith('tls.'):
            fail('REGISTRY_BAD_ID')
        if x.get('status') not in ('SUPPORTED','PREVIEW','LEGACY_SUPPORTED','RESEARCH_ONLY_APPROVED'):
            fail('REGISTRY_UNAPPROVED_STATUS:' + x['tool_id'])
        if not HEX64.fullmatch(x.get('expected_sha256', '')):
            fail('REGISTRY_MISSING_SHA:' + x['tool_id'])
        if x.get('rights_review') != 'PUBLIC_ORIGINAL_CHECKED_NO_GAME_SPECIFIC' or x.get('license_review') not in ('MIT_ORIGINAL_PUBLIC','OFFICIAL_PUBLIC_RELEASE_REUSE'):
            fail('LICENSE_OR_RIGHTS_UNKNOWN:' + x['tool_id'])
        if not safe_filename(x.get('artifact_filename')) or any(s in x.get('source_path','').casefold() for s in RETIRE_WORDS):
            fail('RETIRED_ASSET:' + x['tool_id'])
        if x.get('source_kind') not in ('official_release_asset','git_source','developer_bundle'):
            fail('BAD_SOURCE_KIND:' + x['tool_id'])
        if x['source_kind'] == 'official_release_asset' and (not x.get('original_tag') or x.get('standalone_required') is not True):
            fail('UNVERIFIED_SOURCE:' + x['tool_id'])
    return tools

def fetch_official_assets(tools: list[dict], cache: Path, fixture: bool) -> None:
    if fixture:fail('FIXTURE_CANNOT_FETCH_RELEASE')
    cache.mkdir(parents=True,exist_ok=True)
    for t in tools:
        if t['source_kind'] != 'official_release_asset':continue
        target = cache / t['artifact_filename']
        if target.is_file() and digest(safe_file(target, cache)) == t['expected_sha256']:
            continue
        if target.exists(): fail('SOURCE_CONFLICT:' + target.name)
        command = ['gh','release','download',t['original_tag'],'--repo',
                   'MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw',
                   '--pattern',t['artifact_filename'],'--dir',str(cache)]
        p = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
        if p.returncode != 0 or not target.is_file():
            fail('ORIGINAL_RELEASE_DOWNLOAD:' + target.name + ':' + p.stderr[:180])
        if digest(safe_file(target,cache)) != t['expected_sha256']:
            fail('ORIGINAL_RELEASE_SHA:' + target.name)

def make_developer_bundle(all_tracked: list[str]) -> bytes:
    # Include exact, locally runnable CLI and all their dependencies + six-language docs.
    prefixes = ('src/','tools/','skills/','.agents/skills/','.claude/skills/','benchmarks/r6/','docs/','lexicon/','tests/','examples/r16/','examples/r17/')
    names = sorted(p for p in all_tracked if p.startswith(prefixes) or p in
                   ('README.md','README.zh-CN.md','README.en.md','README.ja.md','README.ko.md','README.es.md','LICENSE','AGENTS.md','CLAUDE.md','PRIVACY.md','SECURITY.md'))
    contents = {}
    for p in names:
        if not safe_archive_path(p):fail('DEVELOPER_BUNDLE_UNSAFE_PATH:'+p)
        contents[p] = safe_file(ROOT/p, ROOT)
    for needed in ('tools/localize_cli.js','tools/r14_capability_cli.js','tools/r15_structured_localizer_cli.js','tools/r16_local_workbench_cli.js','tools/r17_document_trust_cli.js','skills/taiwan-zh-tw-localization/SKILL.md'):
        if needed not in contents:fail('DEVELOPER_CLI_MISSING:'+needed)
    contents['START_HERE_ALL_TOOLS.txt'] = ('Taiwan-LLM-Sanitizer developer CLI + Skill source bundle\n'
        'Extract this ZIP before running Node. Node.js 22+ required. CLI usage is documented under docs/.\n'
        'All source is the existing R17 baseline plus Release packaging; no cloud API, game asset or private records.\n'
        'The included files are not an independently reviewed language-accuracy certification.\n').encode('utf-8')
    return deterministic_zip(contents)

def build(registry_path: Path, stage: Path, cache: Path, *, fixture: bool=False, fetch: bool=False, source_sha: str|None=None) -> dict:
    if not fixture and registry_path.resolve() != REGISTRY.resolve():fail('PRODUCTION_REGISTRY_OVERRIDE')
    reg = json.loads(registry_path.read_text(encoding='utf-8'))
    tools = validate_registry(reg, fixture)
    if not fixture and reg['base_commit_sha'] != '8c8194105ba02f4f8e1e1c337fde943d9e32fcee':
        fail('SOURCE_BASE_LOCK_MOVED')
    if fetch:fetch_official_assets(tools, cache, fixture)
    if stage.exists() and any(stage.iterdir()):fail('STAGE_MUST_START_EMPTY')
    stage.mkdir(parents=True, exist_ok=True)
    all_tracked=tracked_files()
    # The suite is based on a real source revision; new tooling/docs may be added, but old source checksums remain pinned.
    artifacts: dict[str, bytes] = {}
    members: dict[str, bytes] = {}
    manifest_tools=[]
    for tool in tools:
        kind=tool['source_kind']; original=tool['artifact_filename'];
        if kind=='developer_bundle':
            data=safe_file(ROOT/tool['source_path'],ROOT)
            if digest(data)!=tool['expected_sha256']:fail('SOURCE_SHA:'+tool['tool_id'])
            destination='TOOLS/developer/'+DEVELOPER_BUNDLE+'!/'+tool['source_path']
            manifest_tools.append({**tool,'source_sha256':digest(data),'location_in_suite':destination,'artifact_bytes':len(data),'artifact_sha256':digest(data),
                'suite_version':reg['suite_version'],'unchanged_from_last_suite':None,'unchanged_from_original_source':True,'verification_status':'SOURCE_SHA_PASS'})
            continue
        if kind=='official_release_asset':
            data=safe_file(cache/original,cache)
        else:
            data=safe_file(ROOT/tool['source_path'],ROOT)
        if digest(data)!=tool['expected_sha256']:
            fail('SOURCE_SHA_MISMATCH:'+tool['tool_id'])
        if original.lower().endswith('.zip'):validate_zip_bytes(data, original)
        if original in artifacts:fail('DUPLICATE_ASSET_NAME:'+original)
        artifacts[original]=data
        member='TOOLS/'+tool['package_subdir']+'/'+original
        members[member]=data
        manifest_tools.append({**tool,'source_sha256':digest(data),'location_in_suite':member,'artifact_bytes':len(data),'artifact_sha256':digest(data),
            'suite_version':reg['suite_version'],'unchanged_from_last_suite':None,'unchanged_from_original_source':True,'verification_status':'SHA256_PASS'})
    developer_data=make_developer_bundle(all_tracked)
    artifacts[DEVELOPER_BUNDLE]=developer_data
    members['TOOLS/developer/'+DEVELOPER_BUNDLE]=developer_data
    if len(artifacts)!=21:fail('ASSET_COUNT_EXPECTED_21')
    manifest={
      'schema':'tls.all-tools-release-manifest.v1','suite_version':reg['suite_version'],'release_tag':reg['release_tag'],
      'source_main_baseline_sha':reg['base_commit_sha'],'source_git_sha':source_sha or 'LOCAL_PREVIEW_UNPUBLISHED',
      'is_fixture':fixture,'approval':'NONE','rights_disclaimer':'SHA verifies bytes, not legal rights or translation quality.',
      'tool_count':len(manifest_tools),'tools':manifest_tools,'full_suite_asset':SUITE_FILENAME,
      'asset_count_standalone':len(artifacts),'artifacts':[{'name':k,'size':len(v),'sha256':digest(v)} for k,v in sorted(artifacts.items())],
      'excluded_rights_withdrawn':reg['excluded_rights_withdrawn'],
      'locales':reg['locales'], 'external_transport':'NONE'}
    provenance={'schema':'tls.all-tools-provenance.v1','suite_version':reg['suite_version'],'release_tag':reg['release_tag'],
       'baseline_git_sha':reg['base_commit_sha'],'current_git_sha':source_sha or 'LOCAL_PREVIEW_UNPUBLISHED',
       'fixture':fixture,'build_environment':{'python_major':sys.version_info.major,'zip_deterministic':True},
       'assets_reused_from_pinned_release': [t['tool_id'] for t in tools if t['source_kind']=='official_release_asset'],
       'publisher_requires_main':True,'publisher_requires_verify_and_browser':True,
       'never_rewrite_old_releases':True,'no_game_specific_assets':True}
    metadata={'ALL_TOOLS_MANIFEST.json':json_bytes(manifest),'BUILD_PROVENANCE.json':json_bytes(provenance)}
    bundle_checksum=''.join(digest(v)+'  '+k+'\n' for k,v in sorted({**artifacts,**metadata}.items())).encode('utf-8')
    members.update(metadata)
    members['BUNDLE_SHA256SUMS.txt']=bundle_checksum
    members['README_6_LANGUAGES.txt']= ('TLS Full Suite v17.1.0 / 全工具套件\n'
       'zh-TW / zh-CN / English / 日本語 / 한국어 / Español usage guides are inside developer source bundle.\n'
       'All tool versions are unchanged, pinned to their original release/source digests.\n'
       'Manual opt-in only; never install conflicting R5/R11/R13 versions on one site.\n'
       'Retired third-party game-specific packages are excluded. No automatic translation or model certification.\n').encode('utf-8')
    suite=deterministic_zip(members)
    validation={
       'schema':'tls.all-tools-validation.v1','release_tag':reg['release_tag'],'suite_version':reg['suite_version'],
       'status':'FIXTURE_TEST_ONLY' if fixture else 'PACKAGE_READY_NOT_PUBLISHED',
       'fixture':fixture,'tool_count_expected':26,'tool_count_present':26,'tool_count_updated':0,
       'tool_count_reused_from_origins':26,'tool_count_unchanged_from_previous_suite':'FIRST_SUITE_NO_PREDECESSOR',
       'tool_count_legacy':2,'standalone_asset_count':21,
       'suite_file':SUITE_FILENAME,'suite_bytes':len(suite),'suite_sha256':digest(suite),
       'sha256_verified':True,'crc_valid':True,'privacy_guard':'PUBLIC_SOURCE_ONLY',
       'license_review':'PUBLIC_MIT_AND_PINNED_OFFICIAL_RELEASES',
       'source_main_baseline_sha':reg['base_commit_sha'],'main_run_id':'PENDING_GITHUB_CI',
       'post_publish_all_assets':'NOT_RUN', 'manual_human_translation_review':'NOT_RUN',
       'missing_tool_ids':[],'excluded_rights_withdrawn':len(reg['excluded_rights_withdrawn'])}
    staging={**artifacts,**metadata,SUITE_FILENAME:suite,'VALIDATION.json':json_bytes(validation)}
    staging['SHA256SUMS.txt']=''.join(digest(v)+'  '+k+'\n' for k,v in sorted(staging.items())).encode('utf8')
    if len(staging)!=26:fail('TOTAL_RELEASE_ASSET_COUNT')
    for name,content in staging.items():
        (stage/name).write_bytes(content)
    return manifest

def main():
    cli=argparse.ArgumentParser()
    cli.add_argument('--stage',required=True,type=Path)
    cli.add_argument('--cache',required=True,type=Path)
    cli.add_argument('--registry',default=REGISTRY,type=Path)
    cli.add_argument('--source-sha',default=None)
    cli.add_argument('--fetch-official',action='store_true')
    cli.add_argument('--fixture',action='store_true',help='Tests only. Explicitly unpublishable.')
    args=cli.parse_args()
    try:
        m=build(args.registry,args.stage,args.cache,fixture=args.fixture,fetch=args.fetch_official,source_sha=args.source_sha)
        print('ALL_TOOLS_STAGE_BUILT',len(m['tools']),'tools',len(m['artifacts']),'standalone assets',args.stage)
    except (ReleaseBlock,ValueError,FileNotFoundError,OSError,subprocess.CalledProcessError) as e:
        print('ALL_TOOLS_BUILD_BLOCKED',str(e),file=sys.stderr);raise SystemExit(1)
if __name__=='__main__':main()
