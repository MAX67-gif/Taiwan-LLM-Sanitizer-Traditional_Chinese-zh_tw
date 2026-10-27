"""Release-boundary regressions: real Git identifiers and self-consistent tampering."""
from copy import deepcopy
import hashlib
import io
import json
from pathlib import Path
import sys
import unittest
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
sys.path.insert(0, str(ROOT / 'tests'))
import build_all_tools_release as B
import check_all_tools_release as C
import test_all_tools_release as F


def pack_unchecked(contents):
    result = io.BytesIO()
    with ZipFile(result, 'w') as z:
        for name, value in sorted(contents.items()):
            z.writestr(name, value)
    return result.getvalue()


class ReleaseRecovery(unittest.TestCase):
    setUpClass = classmethod(F.FullSuiteSafetyContract.setUpClass.__func__)
    tearDownClass = classmethod(F.FullSuiteSafetyContract.tearDownClass.__func__)
    verify = F.FullSuiteSafetyContract.verify
    altered = F.FullSuiteSafetyContract.altered

    def reseal(self, stage):
        """An attacker can recompute unsigned manifests; the pinned bytes must still win."""
        manifest = json.loads((stage / 'ALL_TOOLS_MANIFEST.json').read_bytes())
        for asset in manifest['artifacts']:
            raw = (stage / asset['name']).read_bytes()
            asset.update(size=len(raw), sha256=hashlib.sha256(raw).hexdigest())
        (stage / 'ALL_TOOLS_MANIFEST.json').write_bytes(B.json_bytes(manifest))
        with ZipFile(io.BytesIO((stage / B.SUITE_FILENAME).read_bytes())) as z:
            members = {n: z.read(n) for n in z.namelist()}
        for member in members:
            if member.startswith('TOOLS/'):
                members[member] = (stage / member.split('/')[-1]).read_bytes()
            elif member in ('ALL_TOOLS_MANIFEST.json', 'BUILD_PROVENANCE.json'):
                members[member] = (stage / member).read_bytes()
        checksum_names = set(members) - {'BUNDLE_SHA256SUMS.txt', 'SHA256SUMS.txt'}
        sums = ''.join(hashlib.sha256(members[n]).hexdigest() + '  ' + n + '\n' for n in sorted(checksum_names)).encode()
        members['BUNDLE_SHA256SUMS.txt'] = sums
        members['SHA256SUMS.txt'] = sums
        suite = pack_unchecked(members)
        (stage / B.SUITE_FILENAME).write_bytes(suite)
        validation = json.loads((stage / 'VALIDATION.json').read_bytes())
        validation.update(suite_bytes=len(suite), suite_sha256=hashlib.sha256(suite).hexdigest())
        (stage / 'VALIDATION.json').write_bytes(B.json_bytes(validation))
        (stage / 'SHA256SUMS.txt').write_bytes(''.join(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.name + '\n' for p in sorted(stage.iterdir()) if p.name != 'SHA256SUMS.txt').encode())

    def remote(self, **overrides):
        manifest = json.loads((self.stage / 'ALL_TOOLS_MANIFEST.json').read_bytes())
        tag = manifest['release_tag']
        repository = 'MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw'
        obj = {'tag_name': tag, 'target_commitish': manifest['source_git_sha'],
               'draft': False, 'prerelease': False, 'assets': [
                   {'name': p.name, 'size': p.stat().st_size, 'state': 'uploaded',
                    'digest': 'sha256:' + hashlib.sha256(p.read_bytes()).hexdigest(),
                    'browser_download_url': 'https://github.com/' + repository + '/releases/download/' + tag + '/' + p.name}
                   for p in self.stage.iterdir()]}
        obj.update(overrides)
        return obj

    def test_valid_real_40_digit_git_sha_passes(self):
        self.assertEqual(self.verify(expected_sha='8c8194105ba02f4f8e1e1c337fde943d9e32fcee')['status'], 'PASS')

    def test_source_provenance_sha_cannot_disagree(self):
        def edit(stage):
            p = stage / 'BUILD_PROVENANCE.json'
            data = json.loads(p.read_bytes()); data['current_git_sha'] = 'a' * 40
            p.write_bytes(B.json_bytes(data)); self.reseal(stage)
        with self.assertRaisesRegex(B.ReleaseBlock, 'SOURCE_GIT_SHA|PROVENANCE'):
            self.verify(self.altered(edit))

    def test_self_consistent_html_replacement_is_not_registry_authority(self):
        def edit(stage):
            p = stage / 'TW_Document_Trust_Graph_R17_20261026.html'
            p.write_bytes(b'<!doctype html><title>Wrong tool</title>'); self.reseal(stage)
        with self.assertRaisesRegex(B.ReleaseBlock, 'LOCKED_ARTIFACT_SHA|SOURCE_SHA'):
            self.verify(self.altered(edit))

    def test_downloaded_bytes_are_checked_even_with_server_digest(self):
        downloaded = self.altered(lambda d: (d / 'TW_Document_Trust_Graph_R17_20261026.html').write_bytes(b'wrong download'))
        with self.assertRaisesRegex(B.ReleaseBlock, 'DOWNLOADED_SHA'):
            self.verify(release_data=self.remote(), download_dir=downloaded)

    def test_duplicate_remote_asset_cannot_be_hidden_by_dictionary(self):
        data = self.remote(); data['assets'].append(deepcopy(data['assets'][0]))
        with self.assertRaisesRegex(B.ReleaseBlock, 'DUPLICATE'):
            self.verify(release_data=data)

    def test_wrong_release_tag_cannot_pass_exact_asset_list(self):
        with self.assertRaisesRegex(B.ReleaseBlock, 'TAG'):
            self.verify(release_data=self.remote(tag_name='unrelated-tag'))

    def test_wrong_release_source_cannot_pass_exact_asset_list(self):
        with self.assertRaisesRegex(B.ReleaseBlock, 'SOURCE'):
            self.verify(release_data=self.remote(target_commitish='a' * 40))

    def test_wrong_download_origin_cannot_pass_exact_asset_list(self):
        data = self.remote(); data['assets'][0]['browser_download_url'] = 'https://example.org/wrong'
        with self.assertRaisesRegex(B.ReleaseBlock, 'DOWNLOAD_URL'):
            self.verify(release_data=data)

    def draft_remote(self):
        data = self.remote(draft=True)
        repository = 'MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw'
        for index, asset in enumerate(data['assets'], 1):
            asset['id'] = index
            asset['url'] = 'https://api.github.com/repos/' + repository + '/releases/assets/' + str(index)
            asset['browser_download_url'] = ('https://github.com/' + repository
                + '/releases/download/untagged-0123456789abcdef0123/' + asset['name'])
        return data

    def test_real_draft_temporary_urls_are_bound_to_authenticated_asset_identity(self):
        self.assertEqual(self.verify(release_data=self.draft_remote(), download_dir=self.stage)['status'], 'PASS')

    def test_draft_temporary_url_requires_exact_api_asset_identity(self):
        for field, value in (('url', 'https://api.github.com/repos/unrelated/repo/releases/assets/1'),
                             ('id', True), ('id', -1)):
            data = self.draft_remote(); data['assets'][0][field] = value
            with self.subTest(field=field, value=value), self.assertRaisesRegex(B.ReleaseBlock, 'DOWNLOAD_URL'):
                self.verify(release_data=data, download_dir=self.stage)

    def test_published_assets_must_have_final_tag_urls(self):
        data = self.draft_remote(); data['draft'] = False
        with self.assertRaisesRegex(B.ReleaseBlock, 'DOWNLOAD_URL'):
            self.verify(release_data=data, require_published=True, download_dir=self.stage)

    def test_draft_temporary_slug_cannot_be_path_or_query_injection(self):
        for slug in ('untagged-../wrong', 'untagged-%2Fsecret', 'untagged-a?redirect=x', 'another-tag'):
            data = self.draft_remote()
            data['assets'][0]['browser_download_url'] = data['assets'][0]['browser_download_url'].replace('untagged-0123456789abcdef0123', slug)
            with self.subTest(slug=slug), self.assertRaisesRegex(B.ReleaseBlock, 'DOWNLOAD_URL'):
                self.verify(release_data=data, download_dir=self.stage)

    def test_json_bom_and_duplicate_keys_are_rejected(self):
        for value in (b'\xef\xbb\xbf{}', b'{"source_git_sha":"one","source_git_sha":"two"}'):
            with self.subTest(value=value), self.assertRaises(B.ReleaseBlock):
                C.readjson(value, 'untrusted-metadata')

    def test_zip_windows_escape_and_secret_paths_rejected(self):
        for name in ('C:/escape.txt', 'file:stream', 'a/.env', 'a/credentials.json', 'private/notes.md', 'CON.txt', 'name. '):
            with self.subTest(name=name), self.assertRaises(B.ReleaseBlock):
                B.validate_zip_bytes(pack_unchecked({name: b'unsafe'}), 'unsafe.zip')

    def test_zip_non_utf8_or_bom_source_rejected(self):
        for content in (b'\xff', b'\xef\xbb\xbftext'):
            with self.subTest(content=content), self.assertRaises(B.ReleaseBlock):
                B.validate_zip_bytes(pack_unchecked({'README.md': content}), 'unsafe.zip')

    def test_suite_includes_validation_and_registry(self):
        with ZipFile(io.BytesIO((self.stage / B.SUITE_FILENAME).read_bytes())) as z:
            self.assertIn('VALIDATION.json', z.namelist())
            self.assertIn('ALL_TOOLS_REGISTRY.json', z.namelist())

    def test_developer_package_contains_actual_release_dependencies(self):
        with ZipFile(io.BytesIO((self.stage / B.DEVELOPER_BUNDLE).read_bytes())) as z:
            self.assertIn('release/all_tools_registry.json', z.namelist())
            self.assertIn('docs/USAGE_EXAMPLES.zh-CN.md', z.namelist())

    def test_missing_real_cli_dependency_is_blocked_after_full_reseal(self):
        def edit(stage):
            with ZipFile(io.BytesIO((stage / B.DEVELOPER_BUNDLE).read_bytes())) as z:
                files = {n: z.read(n) for n in z.namelist() if n != 'src/core/document_trust_graph_r17.js'}
            (stage / B.DEVELOPER_BUNDLE).write_bytes(pack_unchecked(files))
            self.reseal(stage)
        with self.assertRaisesRegex(B.ReleaseBlock, 'DEVELOPER_SOURCE_FILE_SET'):
            self.verify(self.altered(edit))

    def test_synthetic_assets_cannot_promote_themselves_to_production(self):
        def edit(stage):
            for filename, key in (('ALL_TOOLS_MANIFEST.json', 'is_fixture'), ('BUILD_PROVENANCE.json', 'fixture'), ('VALIDATION.json', 'fixture')):
                p = stage / filename; data = json.loads(p.read_bytes()); data[key] = False
                if filename == 'ALL_TOOLS_MANIFEST.json':
                    for got, original in zip(data['tools'], self.raw_reg['tools']):
                        got.update(original)
                        got.update(source_sha256=original['expected_sha256'], artifact_sha256=original['expected_sha256'])
                if filename == 'VALIDATION.json': data['status'] = 'PACKAGE_READY_NOT_PUBLISHED'
                p.write_bytes(B.json_bytes(data))
            self.reseal(stage)
        with self.assertRaisesRegex(B.ReleaseBlock, 'LOCKED_ARTIFACT_SHA'):
            C.verify_stage(self.altered(edit), B.REGISTRY, fixture_ok=False)

    def test_secret_value_rejected_in_nested_text(self):
        content = ('api_key=ghp_' + 'X' * 36).encode()
        with self.assertRaisesRegex(B.ReleaseBlock, 'SECRET_CONTENT'):
            B.validate_zip_bytes(pack_unchecked({'config.txt': content}), 'secret.zip')

    def test_registry_cannot_replace_a_tool_and_its_own_baseline(self):
        reg = deepcopy(self.fixture_reg)
        reg['tools'][0]['tool_id'] = 'tls.replacement.wrong'
        reg['monotonic_baseline_tool_ids'][0] = 'tls.replacement.wrong'
        with self.assertRaisesRegex(B.ReleaseBlock, 'BASELINE'):
            B.validate_registry(reg, fixture=True)

    def test_registry_requires_original_verification_date(self):
        for value in ('', 'UNKNOWN', '2026-19-40T99:99:99Z'):
            reg = deepcopy(self.fixture_reg); reg['tools'][0]['last_verified_at_utc'] = value
            with self.subTest(value=value), self.assertRaisesRegex(B.ReleaseBlock, 'VERIFIED_DATE'):
                B.validate_registry(reg, fixture=True)

    def test_new_parallel_release_writer_is_rejected(self):
        workflow = (ROOT / '.github/workflows/ci.yml').read_text()
        workflow += '\n  unexpected-publisher:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n    steps:\n      - run: gh release create partial-version one.html\n'
        with self.assertRaisesRegex(B.ReleaseBlock, 'UNAUTHORIZED_PUBLISHER'):
            C.verify_workflow(workflow_text=workflow)

    def test_release_dependency_cannot_be_hidden_in_a_comment(self):
        workflow = (ROOT / '.github/workflows/ci.yml').read_text()
        head, central = workflow.split('  all-tools-full-suite-release:\n', 1)
        central = central.replace('    needs: [verify, browser-integration]', '    needs: [verify]\n    # needs: [verify, browser-integration]', 1)
        with self.assertRaisesRegex(B.ReleaseBlock, 'DEPENDENCIES'):
            C.verify_workflow(workflow_text=head + '  all-tools-full-suite-release:\n' + central)

    def test_release_concurrency_cannot_be_disabled_or_split_by_commit(self):
        workflow = (ROOT / '.github/workflows/ci.yml').read_text()
        for old, new in (('cancel-in-progress: false', 'cancel-in-progress: true'),
                         ('tls-all-tools-release-${{ github.repository }}', 'tls-all-tools-release-${{ github.sha }}')):
            changed = workflow.replace(old, new)
            self.assertNotEqual(changed, workflow)
            with self.subTest(new=new), self.assertRaisesRegex(B.ReleaseBlock, 'CONCURRENCY'):
                C.verify_workflow(workflow_text=changed)

    def test_each_missing_language_document_is_blocked(self):
        contents = B.developer_contents(B.tracked_files())
        for name in ('README.md', 'README.zh-CN.md', 'README.en.md', 'README.ja.md', 'README.ko.md', 'README.es.md'):
            altered = dict(contents); del altered[name]
            with self.subTest(name=name), self.assertRaisesRegex(B.ReleaseBlock, 'SIX_LANGUAGE'):
                B.validate_catalog_docs(altered, self.fixture_reg)

    def test_stale_six_language_suite_catalog_is_blocked(self):
        contents = B.developer_contents(B.tracked_files())
        contents['README.en.md'] = contents['README.en.md'].replace(b'suite=17.1.0;', b'suite=17.0.0;')
        with self.assertRaisesRegex(B.ReleaseBlock, 'SIX_LANGUAGE_CATALOG'):
            B.validate_catalog_docs(contents, self.fixture_reg)

    def test_translation_status_cannot_claim_human_approval_without_review(self):
        contents = B.developer_contents(B.tracked_files())
        for prefix in ('README', 'docs/USAGE_EXAMPLES'):
            for locale in ('zh-CN', 'en', 'ja', 'ko', 'es'):
                name = prefix + '.' + locale + '.md'
                changed = dict(contents)
                changed[name] = changed[name].replace(b'HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review',
                                                     b'HUMAN_TRANSLATION_REVIEW: HUMAN_APPROVED')
                self.assertNotEqual(changed[name], contents[name])
                with self.subTest(name=name), self.assertRaisesRegex(B.ReleaseBlock, 'REVIEW'):
                    B.validate_catalog_docs(changed, self.fixture_reg)

    def test_builder_blocks_symlink_stage_before_writing(self):
        target = self.root / 'empty-destination'; target.mkdir()
        link = self.root / 'linked-stage'; link.symlink_to(target, target_is_directory=True)
        with self.assertRaisesRegex(B.ReleaseBlock, 'STAGE_SYMLINK'):
            B.build(self.fixture_registry, link, self.cache, fixture=True, source_sha=self.fixture_reg['base_commit_sha'])
        self.assertEqual(list(target.iterdir()), [])


if __name__ == '__main__':
    unittest.main()
