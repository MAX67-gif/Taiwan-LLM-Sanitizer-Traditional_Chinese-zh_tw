"""Build a complete, offline, source-locked TLS All-Tools distribution.

Production refuses any missing/bad historical release assets, including the R5 ZIP
whose legacy timestamps make re-zipping byte-incompatible with the GitHub Release.
No telemetry, no remote provider and no substitutions. --fetch-official is explicit.
"""
from __future__ import annotations
import argparse
from datetime import datetime
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
import publication_guard as P

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'release/all_tools_registry.json'
DEVELOPER_BUNDLE = 'TLS_DEVELOPER_CLI_SKILL_17_3_0.zip'
SUITE_FILENAME = 'TLS_ALL_TOOLS_SUITE_17_3_0.zip'
HEADER_FILES = ('ALL_TOOLS_MANIFEST.json', 'BUILD_PROVENANCE.json')
HEX64 = re.compile(r'^[0-9a-f]{64}$')
GIT_SHA = re.compile(r'^[0-9a-f]{40}$')
# First supported inventory, independently anchored in code rather than a mutable
# registry field. New suite versions must explicitly preserve these tool IDs.
BASELINE_IDS_SHA256 = '75bb89093ed2868f36e0a327d9d0fccb1d1ce60c97c2fd572fb1a69055b82492'
PREVIOUS_IDS_SHA256 = 'f1c06a60d53960a91e68f3b6184e801bffc6c5442774097a1e167a38f97aa769'
CURRENT_IDS_SHA256 = '22cb8ad7ccdc6b9d468e2652407ee15e6288ce2c4a5e4f61fdf88b2cef9a0a57'
# All previous row metadata, with only the reviewed R172 origin migration.
PREVIOUS_TOOLS_SHA256 = 'c501f3768d0c5bfc558235e4bd04e9f19e33ec76fa14cd921868b33b4346b85b'
FIXTURE_HASH_ORIGINS = {'tls.r5.chrome': '0efbc73b661cf28fd04a3cd1a9cdb6ab4ce26110875138c2483f3507119e40f5', 'tls.r6.quality-kit': '2d216971eb01b9f982fd7ccb38c0b2070cf1e3da44e4e4bdfcdbc55577b6f92b'}
R172_TOOL_ID = 'tls.html.tw-wording-assistant-r172-20261027'
MRFT_FILENAME = 'TLS_Chrome_MV3_MRFT_R177_20261031.zip'
MRFT_SOURCE_PATH = 'dist/' + MRFT_FILENAME
MRFT_SHA256 = '5cf0023f26a990bc0c8d0eef499f9bad843d4257e76a1615a033a7bacab973c7'
NEW_TOOL_ID = 'tls.r177.chrome.mrft'
LOCALES = ('zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'es')
TEXT_SUFFIXES = ('.md', '.txt', '.js', '.json', '.jsonl', '.html', '.css', '.yml', '.yaml', '.py', '.svg', '.sha256')
WINDOWS_RESERVED = re.compile(r'^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)', re.I)
SECRET_PART = re.compile(r'(?i)(?:^|[_.-])(?:private|quarantine|secrets?|credentials?)(?:[_.-]|$)')
RETIRE_WORDS = tuple(''.join(x) for x in [('poke', 'bonk'), ('poke', 'mon'), ('pok', 'émon')])
# Prevent the two withdrawn strategy documents and the private project tree from
# entering *any* generated archive, including archives nested inside ZIPs.
WITHDRAWN_PRIVATE_BASENAMES = frozenset({'product_positioning_r8.md', 'r9_product_strategy.md'})
PRIVATE_TREE_NAME = 'taiwan-llm-sanitizer-project-brain'
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

def text_bytes(data: bytes, label: str) -> str:
    try:
        value = data.decode('utf-8', errors='strict')
    except UnicodeError:
        fail('NON_UTF8:' + label)
    if value.startswith('\ufeff') or '\0' in value:
        fail('BOM_OR_NUL:' + label)
    if P.scan_secret(label, value):
        fail('SECRET_CONTENT:' + label)
    return value

def strict_json(data: bytes, label: str):
    def pairs(items):
        value = {}
        for key, item in items:
            if key in value:
                fail('DUPLICATE_JSON_KEY:' + label)
            value[key] = item
        return value
    try:
        return json.loads(text_bytes(data, label), object_pairs_hook=pairs,
                          parse_constant=lambda _: fail('NONFINITE_JSON:' + label))
    except (ValueError, UnicodeError) as exc:
        fail('INVALID_JSON:' + label + ':' + str(exc))

def safe_filename(name: str) -> bool:
    if not isinstance(name, str) or len(name) > 190 or not name or name in ('.', '..'):
        return False
    if not name.isascii() or '/' in name or '\\' in name or name.startswith('.') or not safe_archive_path(name):
        return False
    if any(s in name.casefold() for s in RETIRE_WORDS):
        return False
    return True

def safe_archive_path(name: str) -> bool:
    if not isinstance(name, str) or len(name) > 240 or '\\' in name or name.startswith(('/', './')):
        return False
    parts = name.split('/')
    if any(c in name for c in '<>:"|?*') or any(ord(c) < 32 or ord(c) == 127 for c in name):
        return False
    if any(part.casefold() in WITHDRAWN_PRIVATE_BASENAMES or part.casefold() == PRIVATE_TREE_NAME for part in parts):
        return False
    for part in parts:
        if not part or part in ('.', '..') or part.rstrip(' .') != part or WINDOWS_RESERVED.match(part):
            return False
        if (part.startswith('.') and part not in ('.agents', '.claude', '.github', '.gitignore')) or SECRET_PART.search(part):
            return False
    return not any(s in name.casefold() for s in RETIRE_WORDS)

def safe_file(path: Path, root: Path) -> bytes:
    if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root.resolve()):
        fail('SYMLINK_OR_UNAUTHORIZED_PATH:' + path.name)
    if path.stat().st_size < 1 or path.stat().st_size > MAX_ASSET_BYTES:
        fail('EMPTY_OR_OVERSIZE:' + path.name)
    data = path.read_bytes()
    if path.name.endswith(TEXT_SUFFIXES) or path.name == '.gitignore':
        text_bytes(data, path.name)
    return data

def validate_zip_bytes(data: bytes, label: str, depth: int = 0) -> None:
    import io
    try:
        if depth > 4 or len(data) > MAX_ASSET_BYTES:
            fail('ZIP_LIMIT:' + label)
        with ZipFile(io.BytesIO(data)) as z:
            names = z.namelist()
            if not names or len(names) > 5000 or len(names) != len({n.casefold() for n in names}) or not all(safe_archive_path(n) for n in names):
                fail('ZIP_PATHS_OR_DUPLICATES:' + label)
            if sum(f.file_size for f in z.infolist()) > 100 * 1024 * 1024 or any(f.file_size > MAX_ASSET_BYTES for f in z.infolist()):
                fail('ZIP_EXPANSION_LIMIT:' + label)
            if z.testzip() is not None:
                fail('ZIP_CRC:' + label)
            for f in z.infolist():
                # Unix mode type 0120000 means a symlink, never included.
                if (f.external_attr >> 16) & 0o170000 == 0o120000:
                    fail('ZIP_SYMLINK:' + label)
                if f.flag_bits & 1:
                    fail('ZIP_ENCRYPTED:' + label)
                content = z.read(f)
                if f.filename.endswith(TEXT_SUFFIXES) or f.filename.endswith('/.gitignore'):
                    text_bytes(content, f.filename)
                elif f.filename.endswith('.zip'):
                    validate_zip_bytes(content, f.filename, depth + 1)
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
    if reg.get('schema') != 'tls.all-tools-registry.v1' or reg.get('suite_version') != '17.3.0' or reg.get('release_tag') != 'all-tools-suite-v17.3.0':
        fail('REGISTRY_SCHEMA_VERSION')
    if reg.get('project') != 'MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw' or reg.get('locales') != list(LOCALES):
        fail('REGISTRY_PROJECT_OR_LOCALES')
    if reg.get('excluded_rights_withdrawn') != ['game_specific_userscripts', 'game_specific_chrome_extensions', 'game_specific_glossaries']:
        fail('RIGHTS_EXCLUSION_CHANGED')
    tools = reg.get('tools')
    if not isinstance(tools, list) or len(tools) != 28:
        fail('REGISTRY_COUNT')
    ids = [x.get('tool_id') for x in tools]
    if ids[:26] != reg.get('monotonic_baseline_tool_ids') or ids[26:] != [R172_TOOL_ID, NEW_TOOL_ID] or len(ids) != len(set(ids)):
        fail('REGISTRY_ID_MONOTONIC_BASELINE')
    if not all(isinstance(x, str) for x in ids) or (digest('\n'.join(ids[:26]).encode('utf-8')) != BASELINE_IDS_SHA256 or digest('\n'.join(ids[:27]).encode('utf-8')) != PREVIOUS_IDS_SHA256 or digest('\n'.join(ids).encode('utf-8')) != CURRENT_IDS_SHA256):
        fail('REGISTRY_INDEPENDENT_BASELINE')
    if len([x for x in tools if x.get('family') == 'browser']) != 7 or len([x for x in tools if x.get('family') == 'offline_html']) != 14 or len([x for x in tools if x.get('family') == 'quality']) != 1 or len([x for x in tools if x.get('family') in ('developer_cli','developer_skill')]) != 6:
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
        if x.get('source_kind') not in ('official_release_asset','git_source','developer_bundle','generated_local_artifact'):
            fail('BAD_SOURCE_KIND:' + x['tool_id'])
        if not safe_archive_path(x.get('source_path', '')) or not safe_filename(x.get('package_subdir', '')):
            fail('REGISTRY_UNSAFE_PATH:' + x['tool_id'])
        if x['tool_id'] == NEW_TOOL_ID:
            if x.get('source_commit_mode') != 'CURRENT_SOURCE_COMMIT' or x.get('source_kind') != 'generated_local_artifact' or x.get('original_commit_sha') is not None:
                fail('NEW_TOOL_SOURCE_COMMIT_AUTHORITY')
            if x.get('source_path') != MRFT_SOURCE_PATH:
                fail('NEW_TOOL_PATH')
            if (x.get('artifact_filename') != MRFT_FILENAME or x.get('expected_sha256') != MRFT_SHA256
                    or x.get('tool_version') != '0.1.0' or x.get('family') != 'browser'
                    or x.get('standalone_required') is not True or x.get('status') != 'PREVIEW'
                    or x.get('package_subdir') != 'browser' or x.get('original_tag') is not None):
                fail('NEW_TOOL_GENERATED_CONTRACT')
        elif x.get('source_kind') == 'generated_local_artifact' or 'source_commit_mode' in x:
            fail('GENERATED_SOURCE_NOT_AUTHORIZED:' + x['tool_id'])
        elif not GIT_SHA.fullmatch(x.get('original_commit_sha', '')):
            fail('REGISTRY_SOURCE_COMMIT:' + x['tool_id'])
        if not isinstance(x.get('tool_version'), str) or not x['tool_version'].strip():
            fail('REGISTRY_TOOL_VERSION:' + x['tool_id'])
        try:
            date = x['last_verified_at_utc']
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z', date):
                raise ValueError('expected UTC ISO date')
            datetime.fromisoformat(date)
        except (KeyError, TypeError, ValueError):
            fail('REGISTRY_VERIFIED_DATE:' + x['tool_id'])
        if x['source_kind'] == 'official_release_asset' and (not x.get('original_tag') or x.get('standalone_required') is not True):
            fail('UNVERIFIED_SOURCE:' + x['tool_id'])
    # Test-only substitutions never become valid production registry metadata.
    from copy import deepcopy
    previous = deepcopy(tools[:27])
    if fixture:
        for row in previous:
            if row['tool_id'] in FIXTURE_HASH_ORIGINS:
                row['expected_sha256'] = FIXTURE_HASH_ORIGINS[row['tool_id']]
    if digest(json_bytes(previous)) != PREVIOUS_TOOLS_SHA256:
        fail('PREVIOUS_TOOL_METADATA_CHANGED')
    return tools

def validate_generated_installer(data: bytes, tool: dict) -> None:
    """Only the reviewed MRFT builder may define a generated installer source.

    Never execute registry commands or download a registry-provided origin.
    Compare deterministic bytes from the tracked fixed source map as well as
    the independently pinned release hash; malformed archives fail closed.
    """
    if tool['tool_id'] != NEW_TOOL_ID or tool['source_path'] != MRFT_SOURCE_PATH:
        fail('GENERATED_SOURCE_NOT_AUTHORIZED')
    validate_zip_bytes(data, MRFT_FILENAME)
    if digest(data) != MRFT_SHA256:
        fail('MRFT_INSTALLER_SHA')
    import build_mrft_r177 as M
    if data != M.archive_bytes():
        fail('MRFT_INSTALLER_SOURCE_PARITY')
    import io
    with ZipFile(io.BytesIO(data)) as archive:
        manifest = strict_json(archive.read('manifest.json'), 'MRFT_MANIFEST')
        if (manifest.get('manifest_version') != 3 or manifest.get('version') != '0.1.0'
                or manifest.get('permissions') != ['activeTab', 'scripting']
                or any(key in manifest for key in ('background', 'content_scripts', 'host_permissions',
                                                   'optional_host_permissions', 'optional_permissions'))):
            fail('MRFT_MANIFEST_PERMISSION_OR_VERSION')

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

def validate_catalog_docs(contents: dict[str, bytes], registry: dict) -> None:
    """Mechanical source/catalog parity only; no human language-quality claim."""
    marker = '<!-- ALL_TOOLS_CATALOG: suite=' + registry['suite_version'] + '; tools=28; standalone=23; tool_ids_sha256=' + CURRENT_IDS_SHA256 + ' -->'
    for prefix, source_prefix in (('README', 'SOURCE_README_SHA256'), ('docs/USAGE_EXAMPLES', 'SOURCE_EXAMPLES_SHA256')):
        master = prefix + '.md'
        if master not in contents:
            fail('SIX_LANGUAGE_DOC_MISSING:' + master)
        master_sha = digest(contents[master])
        for suffix in ('', '.zh-CN', '.en', '.ja', '.ko', '.es'):
            name = prefix + suffix + '.md'
            if name not in contents:
                fail('SIX_LANGUAGE_DOC_MISSING:' + name)
            value = text_bytes(contents[name], name)
            if value.count(marker) != 1 or 'ALL_TOOLS_RELEASE.md' not in value:
                fail('SIX_LANGUAGE_CATALOG:' + name)
            pending = '<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->'
            if suffix and (value.count('<!-- ' + source_prefix + ':' + master_sha + ' -->') != 1
                           or value.count(pending) != 1 or 'HUMAN_APPROVED' in value):
                fail('SIX_LANGUAGE_SOURCE_OR_REVIEW:' + name)

def developer_contents(all_tracked: list[str]) -> dict[str, bytes]:
    # Include exact, locally runnable CLI and all their dependencies + six-language docs.
    prefixes = ('src/','tools/','skills/','.agents/skills/','.claude/skills/','benchmarks/r6/','docs/','lexicon/','tests/','examples/',)
    names = sorted(p for p in all_tracked if p.startswith(prefixes) or p in
                   ('README.md','README.zh-CN.md','README.en.md','README.ja.md','README.ko.md','README.es.md','LICENSE','AGENTS.md','CLAUDE.md','PRIVACY.md','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md','START_HERE.html','release/all_tools_registry.json'))
    contents = {}
    for p in names:
        if not safe_archive_path(p):fail('DEVELOPER_BUNDLE_UNSAFE_PATH:'+p)
        contents[p] = safe_file(ROOT/p, ROOT)
    for needed in ('tools/localize_cli.js','tools/r14_capability_cli.js','tools/r15_structured_localizer_cli.js','tools/r16_local_workbench_cli.js','tools/r17_document_trust_cli.js','skills/taiwan-zh-tw-localization/SKILL.md'):
        if needed not in contents:fail('DEVELOPER_CLI_MISSING:'+needed)
    validate_catalog_docs(contents, strict_json(REGISTRY.read_bytes(), 'registry'))
    contents['START_HERE_ALL_TOOLS.txt'] = ('Taiwan-LLM-Sanitizer developer CLI + Skill source bundle\n'
        'Extract this ZIP before running Node. Node.js 22+ required. CLI usage is documented under docs/.\n'
        'Public source includes R17.7 MRFT DOM Preview, the R17.2 offline wording assistant and Codex/Claude/Grok guides; no remote model API, game assets or private records.\n'
        'The included files are not an independently reviewed language-accuracy certification.\n').encode('utf-8')
    return contents

def make_developer_bundle(all_tracked: list[str]) -> bytes:
    return deterministic_zip(developer_contents(all_tracked))

def build(registry_path: Path, stage: Path, cache: Path, *, fixture: bool=False, fetch: bool=False, source_sha: str|None=None) -> dict:
    if not fixture and registry_path.resolve() != REGISTRY.resolve():fail('PRODUCTION_REGISTRY_OVERRIDE')
    reg = strict_json(registry_path.read_bytes(), 'registry')
    tools = validate_registry(reg, fixture)
    if not fixture and reg['base_commit_sha'] != '8c8194105ba02f4f8e1e1c337fde943d9e32fcee':
        fail('SOURCE_BASE_LOCK_MOVED')
    if (source_sha is not None and not GIT_SHA.fullmatch(source_sha)) or (not fixture and source_sha is None):
        fail('SOURCE_GIT_SHA')
    if not fixture:
        actual = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
        if actual != source_sha:
            fail('SOURCE_GIT_SHA_DOES_NOT_MATCH_CHECKOUT')
        if subprocess.run(['git', 'diff', '--quiet', 'HEAD', '--'], cwd=ROOT).returncode != 0:
            fail('SOURCE_CHECKOUT_DIRTY')
    if fetch:fetch_official_assets(tools, cache, fixture)
    if stage.is_symlink():fail('STAGE_SYMLINK')
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
        if kind=='generated_local_artifact':validate_generated_installer(data,tool)
        if digest(data)!=tool['expected_sha256']:
            fail('SOURCE_SHA_MISMATCH:'+tool['tool_id'])
        if original.lower().endswith('.zip'):validate_zip_bytes(data, original)
        if original in artifacts:fail('DUPLICATE_ASSET_NAME:'+original)
        artifacts[original]=data
        member='TOOLS/'+tool['package_subdir']+'/'+original
        members[member]=data
        manifest_tools.append({**tool, **({'original_commit_sha':source_sha or 'FIXTURE_LOCAL_PREVIEW'} if tool['tool_id']==NEW_TOOL_ID else {}),'source_sha256':digest(data),'location_in_suite':member,'artifact_bytes':len(data),'artifact_sha256':digest(data),
            'suite_version':reg['suite_version'],'unchanged_from_last_suite':None,'unchanged_from_original_source':True,'verification_status':'SHA256_PASS'})
    developer_data=make_developer_bundle(all_tracked)
    artifacts[DEVELOPER_BUNDLE]=developer_data
    members['TOOLS/developer/'+DEVELOPER_BUNDLE]=developer_data
    if len(artifacts)!=23:fail('ASSET_COUNT_EXPECTED_23')
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
    inner_validation = {'schema': 'tls.all-tools-bundle-validation.v1',
        'status': 'FIXTURE_TEST_ONLY' if fixture else 'PACKAGE_READY_NOT_PUBLISHED',
        'source_git_sha': source_sha or 'LOCAL_PREVIEW_UNPUBLISHED',
        'tool_count_expected': len(tools), 'tool_count_present': len(manifest_tools),
        'missing_tool_ids': [], 'registry_sha256': digest(registry_path.read_bytes()),
        'post_publish_all_assets': 'NOT_RUN',
        'archive_digest_location': 'external VALIDATION.json avoids recursive self-hash'}
    members['START_HERE.html']=safe_file(ROOT/'tools/templates/start_here_suite_r172.html',ROOT)
    members.update(metadata)
    members['VALIDATION.json'] = json_bytes(inner_validation)
    members['ALL_TOOLS_REGISTRY.json'] = registry_path.read_bytes()
    members['README_6_LANGUAGES.txt']= ('TLS Full Suite v17.3.0 / 全工具套件\n'
       'zh-TW / zh-CN / English / 日本語 / 한국어 / Español usage guides are inside developer source bundle.\n'
       'All 27 previous tools retain their original versions and bytes; one new R17.7 MRFT Chrome Preview is added.\n'
       'Manual opt-in only; never install conflicting R5/R11/R13 versions on one site.\n'
       'Retired third-party game-specific packages are excluded. No remote translation or model-quality certification.\n').encode('utf-8')
    bundle_checksum = ''.join(digest(v) + '  ' + k + '\n' for k, v in sorted(members.items())).encode('utf-8')
    members['BUNDLE_SHA256SUMS.txt'] = bundle_checksum
    members['SHA256SUMS.txt'] = bundle_checksum
    suite=deterministic_zip(members)
    validation={
       'schema':'tls.all-tools-validation.v1','release_tag':reg['release_tag'],'suite_version':reg['suite_version'],
       'status':'FIXTURE_TEST_ONLY' if fixture else 'PACKAGE_READY_NOT_PUBLISHED',
       'fixture':fixture,'tool_count_expected':28,'tool_count_present':28,'tool_count_updated':1,
       'source_git_sha': source_sha or 'LOCAL_PREVIEW_UNPUBLISHED',
       'tool_count_reused_from_origins':27,'tool_count_unchanged_from_previous_suite':27,
       'tool_count_legacy':2,'standalone_asset_count':23,
       'suite_file':SUITE_FILENAME,'suite_bytes':len(suite),'suite_sha256':digest(suite),
       'sha256_verified':True,'crc_valid':True,'privacy_guard':'PUBLIC_SOURCE_ONLY',
       'license_review':'PUBLIC_MIT_AND_PINNED_OFFICIAL_RELEASES',
       'source_main_baseline_sha':reg['base_commit_sha'],'main_run_id':'PENDING_GITHUB_CI',
       'post_publish_all_assets':'NOT_RUN', 'manual_human_translation_review':'NOT_RUN',
       'missing_tool_ids':[],'excluded_rights_withdrawn':len(reg['excluded_rights_withdrawn'])}
    staging={**artifacts,**metadata,SUITE_FILENAME:suite,'VALIDATION.json':json_bytes(validation)}
    staging['SHA256SUMS.txt']=''.join(digest(v)+'  '+k+'\n' for k,v in sorted(staging.items())).encode('utf8')
    if len(staging)!=28:fail('TOTAL_RELEASE_ASSET_COUNT')
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
