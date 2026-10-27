"""Publisher lifecycle tests with real package checks and an offline GitHub transport.

The release fixtures are explicitly unpublishable. Only the test boundary permits
their registry; the production publisher has no fixture or validation-bypass flag.
"""
from __future__ import annotations

from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
sys.path.insert(0, str(ROOT / 'tests'))
import build_all_tools_release as B
import check_all_tools_release as C
import test_all_tools_release as F

REPOSITORY = 'MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw'
BASE = 'repos/' + REPOSITORY
TAG = 'all-tools-suite-v17.1.0'
DRAFT_SLUG = 'untagged-0123456789abcdef0123'
SHA = '8c8194105ba02f4f8e1e1c337fde943d9e32fcee'
REAL_VERIFY = C.verify_stage


class FakeGitHub:
    """Model only GitHub subprocess effects, including downloaded physical bytes."""

    def __init__(self, stage):
        self.files = {p.name: p.read_bytes() for p in stage.iterdir()}
        self.release = None
        self.other_releases = []
        self.failures = {}
        self.calls = []
        self.events = []
        self.download_dirs = []
        self.mutations = []
        self.corrupt_download = None
        self.create_failure = None
        self.tag_commit = None
        self.repo = {'full_name': REPOSITORY, 'private': False,
                     'permissions': {'pull': True, 'push': True}}

    def record(self, draft):
        return {'id': 171, 'tag_name': TAG, 'target_commitish': SHA,
                'draft': draft, 'prerelease': False,
                'html_url': 'https://github.com/' + REPOSITORY + '/releases/tag/' + TAG,
                'url': 'https://api.github.com/' + BASE + '/releases/171',
                'assets': [
                    {'id': 1000 + i, 'name': name, 'size': len(raw),
                     'state': 'uploaded', 'digest': 'sha256:' + B.digest(raw),
                     'url': 'https://api.github.com/' + BASE + '/releases/assets/' + str(1000 + i),
                     'browser_download_url': 'https://github.com/' + REPOSITORY
                     + '/releases/download/' + (DRAFT_SLUG if draft else TAG) + '/' + name}
                    for i, (name, raw) in enumerate(sorted(self.files.items()))]}

    @staticmethod
    def response(args, status, value):
        body = 'HTTP/2.0 ' + str(status) + ' Test\nContent-Type: application/json\n\n'
        body += json.dumps(value)
        return subprocess.CompletedProcess(args, 0 if status < 400 else 1, body, '')

    def run(self, args, **kwargs):
        self.calls.append(list(args))
        if args[1] == 'api':
            endpoint = next(a for a in args if a.startswith('repos/'))
            method = args[args.index('--method') + 1]
            self.events.append(method + ' ' + endpoint)
            failure_key = method + ' ' + endpoint if method + ' ' + endpoint in self.failures else endpoint
            if failure_key in self.failures:
                failure = self.failures[failure_key]
                if failure == 'NETWORK':
                    return subprocess.CompletedProcess(args, 1, '', 'connection reset')
                return self.response(args, failure, {'message': 'request failed'})
            if endpoint == BASE and method == 'GET':
                return self.response(args, 200, self.repo)
            if endpoint == BASE + '/releases/tags/' + TAG:
                # The tag endpoint does not prove an unpublished draft is absent.
                if self.release is None or self.release['draft']:
                    return self.response(args, 404, {'message': 'Not Found'})
                return self.response(args, 200, deepcopy(self.release))
            if endpoint.startswith(BASE + '/releases?per_page=100&page='):
                page = int(endpoint.rsplit('=', 1)[1])
                releases = deepcopy(self.other_releases)
                if self.release is not None:
                    releases.append(deepcopy(self.release))
                return self.response(args, 200, releases[(page - 1) * 100:page * 100])
            if endpoint == BASE + '/releases/171':
                if self.release is None:
                    return self.response(args, 404, {'message': 'Not Found'})
                if method == 'PATCH':
                    body = json.loads(kwargs['input'])
                    assert body['draft'] is False
                    assert self.release['draft'] is True, 'published releases may not be edited'
                    self.mutations.append('publish')
                    self.events.append('publish')
                    self.release['draft'] = False
                    for asset in self.release['assets']:
                        asset['browser_download_url'] = ('https://github.com/' + REPOSITORY
                                                        + '/releases/download/' + TAG + '/' + asset['name'])
                    self.tag_commit = SHA
                return self.response(args, 200, deepcopy(self.release))
            if endpoint == BASE + '/git/ref/tags/' + TAG:
                if self.tag_commit is None:
                    return self.response(args, 404, {'message': 'Not Found'})
                return self.response(args, 200, {
                    'ref': 'refs/tags/' + TAG,
                    'object': {'type': 'commit', 'sha': self.tag_commit}})
            raise AssertionError('Unexpected API request: ' + repr(args))
        if args[1:3] == ['release', 'create']:
            assert args[3] == TAG and '--draft' in args
            assert args[args.index('--target') + 1] == SHA
            assert args[args.index('--repo') + 1] == REPOSITORY
            assert self.release is None, 'existing release must never be recreated'
            passed = {Path(x).name: Path(x).read_bytes() for x in args[4:] if Path(x).is_file()}
            assert passed == self.files, 'create must upload every exact staged file'
            if self.create_failure == 403:
                self.events.append('create:denied')
                return subprocess.CompletedProcess(args, 1, '', 'HTTP 403: Resource not accessible by integration')
            self.release = self.record(True)
            self.mutations.append('create')
            self.events.append('create')
            if self.create_failure == 'PARTIAL_UPLOAD':
                self.release['assets'] = self.release['assets'][:1]
                return subprocess.CompletedProcess(args, 1, '', 'failed to upload asset: HTTP 502')
            return subprocess.CompletedProcess(args, 0, 'https://github.com/release/draft', '')
        if args[1:3] == ['release', 'download']:
            assert args[3] == TAG
            assert args[args.index('--repo') + 1] == REPOSITORY
            assert not any(x in args for x in ('--clobber', '--skip-existing'))
            directory = Path(args[args.index('--dir') + 1])
            assert directory.is_dir() and not list(directory.iterdir()), 'download directory must be new'
            phase = 'draft' if self.release['draft'] else 'published'
            self.download_dirs.append(str(directory))
            self.events.append('download:' + phase)
            for name, raw in self.files.items():
                (directory / name).write_bytes(raw)
            if phase == self.corrupt_download:
                (directory / 'TW_Document_Trust_Graph_R17_20261026.html').write_bytes(b'corrupted response')
            return subprocess.CompletedProcess(args, 0, '', '')
        raise AssertionError('Unexpected gh command: ' + repr(args))


class AllToolsPublisher(unittest.TestCase):
    setUpClass = classmethod(F.FullSuiteSafetyContract.setUpClass.__func__)
    tearDownClass = classmethod(F.FullSuiteSafetyContract.tearDownClass.__func__)

    def publisher(self):
        spec = importlib.util.find_spec('publish_all_tools_release')
        self.assertIsNotNone(spec, 'A fail-closed, independently testable publisher is required')
        import publish_all_tools_release as publisher
        return publisher

    def run_publisher(self, fake, receipt, stage=None, *, permit_test_fixture=True):
        publisher = self.publisher()

        def verify_fixture(folder, **kwargs):
            self.assertNotIn('fixture_ok', kwargs, 'production publisher must not allow fixtures')
            result = REAL_VERIFY(folder, self.fixture_registry, fixture_ok=True, **kwargs)
            fake.events.append('verify:' + ('local' if kwargs.get('release_data') is None else
                                           ('published' if kwargs.get('require_published') else 'draft')))
            return result

        transport = publisher.GitHubCLI(runner=fake.run)
        if permit_test_fixture:
            with patch.object(publisher.C, 'verify_stage', side_effect=verify_fixture):
                return publisher.publish_release(stage or self.stage, SHA, receipt, transport=transport)
        return publisher.publish_release(stage or self.stage, SHA, receipt, transport=transport)

    def receipt_path(self):
        return self.root / ('publisher-receipt-' + str(len(list(self.root.glob('publisher-receipt-*')))) + '.json')

    def test_new_release_is_validated_before_publish_and_downloaded_again(self):
        fake = FakeGitHub(self.stage)
        receipt = self.receipt_path()
        outcome = self.run_publisher(fake, receipt)
        self.assertEqual(outcome['status'], 'PUBLISHED')
        self.assertEqual(fake.mutations, ['create', 'publish'])
        lifecycle = [x for x in fake.events if x.startswith(('verify:', 'download:')) or x in ('create', 'publish')]
        self.assertEqual(lifecycle, ['verify:local', 'create', 'download:draft', 'verify:draft',
                                     'publish', 'download:published', 'verify:published'])
        self.assertEqual(len(set(fake.download_dirs)), 2)
        self.assertEqual(json.loads(receipt.read_bytes())['resolved_tag_commit'], SHA)

    def test_existing_published_match_performs_no_mutation(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(False); fake.tag_commit = SHA
        outcome = self.run_publisher(fake, self.receipt_path())
        self.assertEqual(outcome['status'], 'ALREADY_PUBLISHED_MATCH')
        self.assertEqual(fake.mutations, [])
        self.assertEqual([x for x in fake.events if x.startswith('download:')], ['download:published'])

    def test_temporary_draft_urls_transition_to_verified_published_urls(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(True)
        self.assertTrue(all('/' + DRAFT_SLUG + '/' in a['browser_download_url']
                            for a in fake.release['assets']))
        outcome = self.run_publisher(fake, self.receipt_path())
        self.assertEqual(outcome['status'], 'PUBLISHED')
        self.assertEqual(fake.mutations, ['publish'])
        self.assertEqual([x for x in fake.events if x.startswith('download:')],
                         ['download:draft', 'download:published'])
        self.assertTrue(all('/' + TAG + '/' in a['browser_download_url']
                            for a in fake.release['assets']))

    def test_published_temporary_draft_url_is_rejected_without_mutation(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(False); fake.tag_commit = SHA
        fake.release['assets'][0]['browser_download_url'] = fake.record(True)['assets'][0]['browser_download_url']
        receipt = self.receipt_path()
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, receipt)
        self.assertEqual(fake.mutations, [])
        self.assertEqual(fake.download_dirs, [])
        self.assertEqual(json.loads(receipt.read_bytes())['status'], 'EXISTING_RELEASE_MISMATCH_BLOCKED')

    def test_existing_published_mismatch_never_overwrites(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(False); fake.tag_commit = SHA
        fake.release['assets'][0]['size'] += 1
        receipt = self.receipt_path()
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, receipt)
        self.assertEqual(fake.mutations, [])
        self.assertEqual(json.loads(receipt.read_bytes())['status'], 'EXISTING_RELEASE_MISMATCH_BLOCKED')

    def test_draft_found_after_tag_404_is_reused_without_create_or_upload(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(True)
        self.assertEqual(self.run_publisher(fake, self.receipt_path())['status'], 'PUBLISHED')
        self.assertEqual(fake.mutations, ['publish'])

    def test_incomplete_existing_draft_is_left_unmodified(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(True)
        fake.release['assets'].pop()
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, self.receipt_path())
        self.assertTrue(fake.release['draft'])
        self.assertEqual(fake.mutations, [])

    def test_api_auth_server_and_network_failures_are_not_absence(self):
        for failure in (401, 403, 429, 500, 'NETWORK'):
            with self.subTest(failure=failure):
                fake = FakeGitHub(self.stage)
                fake.failures[BASE + '/releases/tags/' + TAG] = failure
                with self.assertRaises(B.ReleaseBlock):
                    self.run_publisher(fake, self.receipt_path())
                self.assertEqual(fake.mutations, [])

    def test_release_listing_failure_does_not_create_after_tag_404(self):
        fake = FakeGitHub(self.stage)
        fake.failures[BASE + '/releases?per_page=100&page=1'] = 403
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, self.receipt_path())
        self.assertEqual(fake.mutations, [])

    def test_private_or_wrong_repository_blocks(self):
        for change in ({'private': True}, {'full_name': 'another/project'}):
            with self.subTest(change=change):
                fake = FakeGitHub(self.stage); fake.repo.update(change)
                with self.assertRaises(B.ReleaseBlock):
                    self.run_publisher(fake, self.receipt_path())
                self.assertEqual(fake.mutations, [])

    def test_user_permissions_metadata_is_not_installation_authorization(self):
        for permissions in ({'push': False}, {}, None):
            with self.subTest(permissions=permissions):
                fake = FakeGitHub(self.stage); fake.repo['permissions'] = permissions
                result = self.run_publisher(fake, self.receipt_path())
                self.assertEqual(result['status'], 'PUBLISHED')
                self.assertEqual(fake.mutations, ['create', 'publish'])

    def test_user_permissions_metadata_never_overrides_create_api_denial(self):
        for permissions in ({'push': True}, {'push': False}, None):
            with self.subTest(permissions=permissions):
                fake = FakeGitHub(self.stage); fake.repo['permissions'] = permissions
                fake.create_failure = 403
                receipt = self.receipt_path()
                with self.assertRaisesRegex(B.ReleaseBlock, 'GITHUB_DRAFT_CREATE_OR_UPLOAD_FAILED'):
                    self.run_publisher(fake, receipt)
                self.assertIn('create:denied', fake.events)
                self.assertEqual(fake.mutations, [])
                self.assertIsNone(fake.release)
                self.assertFalse(json.loads(receipt.read_bytes())['published_this_run'])

    def test_publish_api_denial_keeps_verified_draft_unpublished(self):
        fake = FakeGitHub(self.stage)
        fake.failures['PATCH ' + BASE + '/releases/171'] = 403
        receipt = self.receipt_path()
        with self.assertRaisesRegex(B.ReleaseBlock, 'GITHUB_HTTP_403'):
            self.run_publisher(fake, receipt)
        self.assertEqual(fake.mutations, ['create'])
        self.assertTrue(fake.release['draft'])
        self.assertFalse(json.loads(receipt.read_bytes())['published_this_run'])

    def test_installation_token_without_user_permissions_can_publish(self):
        fake = FakeGitHub(self.stage); del fake.repo['permissions']
        outcome = self.run_publisher(fake, self.receipt_path())
        self.assertEqual(outcome['status'], 'PUBLISHED')
        self.assertEqual(fake.mutations, ['create', 'publish'])

    def test_missing_permissions_does_not_bypass_api_write_denial(self):
        fake = FakeGitHub(self.stage); del fake.repo['permissions']; fake.create_failure = 403
        receipt = self.receipt_path()
        with self.assertRaisesRegex(B.ReleaseBlock, 'GITHUB_DRAFT_CREATE_OR_UPLOAD_FAILED'):
            self.run_publisher(fake, receipt)
        self.assertIn('create:denied', fake.events)
        self.assertEqual(fake.mutations, [])
        self.assertIsNone(fake.release)
        self.assertFalse(json.loads(receipt.read_bytes())['published_this_run'])

    def test_partial_upload_failure_leaves_draft_without_publishing(self):
        fake = FakeGitHub(self.stage); fake.create_failure = 'PARTIAL_UPLOAD'
        receipt = self.receipt_path()
        with self.assertRaisesRegex(B.ReleaseBlock, 'GITHUB_DRAFT_CREATE_OR_UPLOAD_FAILED'):
            self.run_publisher(fake, receipt)
        self.assertEqual(fake.mutations, ['create'])
        self.assertTrue(fake.release['draft'])
        self.assertEqual(len(fake.release['assets']), 1)
        self.assertEqual(fake.download_dirs, [])
        self.assertFalse(json.loads(receipt.read_bytes())['published_this_run'])

    def test_duplicate_exact_drafts_block_ambiguous_release(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(True)
        duplicate = fake.record(True); duplicate['id'] = 172
        fake.other_releases = [duplicate]
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, self.receipt_path())
        self.assertEqual(fake.mutations, [])

    def test_paginated_draft_is_found_before_any_creation(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(True)
        fake.other_releases = [{'id': n + 500, 'tag_name': 'unrelated-' + str(n), 'draft': False}
                               for n in range(100)]
        self.assertEqual(self.run_publisher(fake, self.receipt_path())['status'], 'PUBLISHED')
        self.assertEqual(fake.mutations, ['publish'])

    def test_preflight_failure_makes_no_remote_calls(self):
        fake = FakeGitHub(self.stage)
        with tempfile.TemporaryDirectory(dir=self.root) as empty:
            with self.assertRaises(B.ReleaseBlock):
                self.run_publisher(fake, self.receipt_path(), stage=Path(empty))
        self.assertEqual(fake.calls, [])

    def test_symlink_stage_is_not_resolved_around_validator(self):
        fake = FakeGitHub(self.stage)
        linked = self.root / 'publisher-linked-stage'
        linked.symlink_to(self.stage, target_is_directory=True)
        with self.assertRaisesRegex(B.ReleaseBlock, 'STAGE_NOT_DIR'):
            self.run_publisher(fake, self.receipt_path(), stage=linked)
        self.assertEqual(fake.calls, [])

    def test_production_fixture_is_rejected_before_remote_access(self):
        fake = FakeGitHub(self.stage)
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, self.receipt_path(), permit_test_fixture=False)
        self.assertEqual(fake.calls, [])

    def test_corrupt_draft_download_cannot_be_published_even_with_matching_digest(self):
        fake = FakeGitHub(self.stage); fake.corrupt_download = 'draft'
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, self.receipt_path())
        self.assertEqual(fake.mutations, ['create'])
        self.assertTrue(fake.release['draft'])

    def test_corrupt_postpublish_download_cannot_return_success(self):
        fake = FakeGitHub(self.stage); fake.corrupt_download = 'published'
        receipt = self.receipt_path()
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, receipt)
        self.assertEqual(fake.mutations, ['create', 'publish'])
        self.assertEqual(json.loads(receipt.read_bytes())['status'], 'PUBLISHED_VALIDATION_FAILED')

    def test_existing_tag_at_wrong_commit_blocks_creation(self):
        fake = FakeGitHub(self.stage); fake.tag_commit = 'a' * 40
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, self.receipt_path())
        self.assertEqual(fake.mutations, [])

    def test_published_tag_must_resolve_to_manifest_commit(self):
        fake = FakeGitHub(self.stage); fake.release = fake.record(False); fake.tag_commit = 'a' * 40
        with self.assertRaises(B.ReleaseBlock):
            self.run_publisher(fake, self.receipt_path())
        self.assertEqual(fake.mutations, [])

    def test_rerun_after_success_is_read_only_and_still_downloads(self):
        fake = FakeGitHub(self.stage)
        self.run_publisher(fake, self.receipt_path())
        mutations = list(fake.mutations)
        outcome = self.run_publisher(fake, self.receipt_path())
        self.assertEqual(outcome['status'], 'ALREADY_PUBLISHED_MATCH')
        self.assertEqual(fake.mutations, mutations)
        self.assertEqual(len(fake.download_dirs), 3)


if __name__ == '__main__':
    unittest.main()
